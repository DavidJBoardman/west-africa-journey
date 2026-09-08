import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NAV_MS, prefersReducedMotion } from '../lib/timing';

// ── Basemaps ─────────────────────────────────────────────────────────────────
// CARTO raster basemaps. These now need an API key — the keyless endpoints
// return tiles stamped "API KEY REQUIRED" across the whole image.
//
// Supplied at build time, never committed: `.env.local` for local development,
// the CARTO_KEY repository secret in CI (see .github/workflows/deploy.yml).
//
// The key is baked into the built bundle and sent with every tile request, so a
// static site cannot keep it secret. Keeping it out of this repo only stops it
// being scraped from public source — the control that actually protects it is
// restricting it to the site's domain in the CARTO dashboard.
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY;

if (!CARTO_KEY) {
  console.warn(
    '[JourneyMap] VITE_CARTO_KEY is not set, so CARTO will serve basemap tiles ' +
    'stamped "API KEY REQUIRED". Set it in .env.local for local development; ' +
    'CI reads it from the CARTO_KEY repository secret.',
  );
}

// {r} resolves to "@2x" on high-DPI displays, giving native 512px tiles. That
// is what keeps the place labels crisp and correctly sized — without it the
// browser upscales 256px tiles and the type goes soft and oversized.
const withKey = (url) => (CARTO_KEY ? `${url}?key=${CARTO_KEY}` : url);

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

const BASEMAPS = {
  dark: {
    url: withKey('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
    attribution: CARTO_ATTRIBUTION,
  },
  light: {
    url: withKey('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
    attribution: CARTO_ATTRIBUTION,
  },
};

const PALETTE = {
  dark: {
    routeDim: '#2A2A2A',
    routeGold: '#C9963A',
    routeFuture: '#3D3020',
    markerActive: '#C9963A', markerActiveBorder: '#E8B857',
    markerVisited: '#8B6E2A', markerVisitedBorder: '#C9963A',
    markerFuture: '#2E2E2E', markerFutureBorder: '#3A3A3A',
  },
  light: {
    routeDim: '#C8BEA8',
    routeGold: '#8C5E10',
    routeFuture: '#DDD8C8',
    markerActive: '#8C5E10', markerActiveBorder: '#B87D2A',
    markerVisited: '#B87D2A', markerVisitedBorder: '#8C5E10',
    markerFuture: '#C8BEA8', markerFutureBorder: '#B0A890',
  },
};

// ── FlyToStop ────────────────────────────────────────────────────────────────
// Flies the map to coordinates over NAV_MS. Deliberately fires no completion
// event: 'moveend' is not a reliable signal (a user pan, or an interrupted
// flight from a rapid second click, fires it too) and anything waiting on it
// necessarily starts a whole flight-length behind the click.
function FlyToStop({ coordinates, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (prefersReducedMotion()) {
      map.setView(coordinates, zoom, { animate: false });
      return;
    }
    map.flyTo(coordinates, zoom, { duration: NAV_MS / 1000, easeLinearity: 0.25 });
  }, [map, coordinates, zoom]);

  return null;
}

// ── DrawingRoute ─────────────────────────────────────────────────────────────
// Draws `positions` progressively over NAV_MS, in step with the map flight.
//
// The dash length is re-measured every frame rather than set once up front:
// the map is panning and zooming underneath, so Leaflet reprojects the path and
// its total length changes continuously. Measuring once (and handing the rest
// to a CSS transition) leaves the dash pattern anchored to a stale length —
// which is what makes the line appear to slide, stutter and lag behind the map.
function DrawingRoute({ positions, color, onComplete }) {
  const layerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // Hide the path before first paint so it never flashes in fully drawn.
  useLayoutEffect(() => {
    const path = layerRef.current?._path;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
  }, []);

  useEffect(() => {
    let raf;
    let start;

    const duration = prefersReducedMotion() ? 0 : NAV_MS;

    const step = (now) => {
      if (start === undefined) start = now;
      const path = layerRef.current?._path;

      if (path) {
        const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic, matches flyTo's feel
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len * (1 - eased)}`;

        if (t >= 1) {
          // Clear the dash so the finished line is a plain stroke, then hand
          // over to the committed polyline underneath.
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
          onCompleteRef.current();
          return;
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Polyline
      ref={layerRef}
      positions={positions}
      pathOptions={{ color, weight: 2, opacity: 0.9 }}
    />
  );
}

// ── Marker icons ─────────────────────────────────────────────────────────────
// divIcon instances are stateless templates — Leaflet builds a fresh element
// per marker from them — so three per theme is enough. Rebuilding icons on
// every render (as before) made react-leaflet call setIcon and replace every
// marker's DOM node mid-flight, on each of the several renders a navigation causes.
function buildIcons(p) {
  const dot = (bg, border, size, borderWidth, glow) => divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border-radius:50%;
      border:${borderWidth}px solid ${border};
      ${glow ? `box-shadow:0 0 8px 2px ${bg}70;` : ''}
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  return {
    active: dot(p.markerActive, p.markerActiveBorder, 12, 2, true),
    visited: dot(p.markerVisited, p.markerVisitedBorder, 8, 1.5, false),
    future: dot(p.markerFuture, p.markerFutureBorder, 6, 1.5, false),
  };
}

// ── JourneyMap ───────────────────────────────────────────────────────────────
export default function JourneyMap({ archive, stops, currentIndex, onStopSelect, theme = 'dark' }) {
  const p = PALETTE[theme];
  const basemap = BASEMAPS[theme];

  // committedIndex: how far the plain gold route currently reaches.
  // draw: the stretch being drawn right now ({ from, to }), or null when idle.
  const [committedIndex, setCommittedIndex] = useState(currentIndex);
  const [draw, setDraw] = useState(null);

  // Memoised so react-leaflet does not call setLatLngs on every polyline on
  // every render — that rewrites each path's `d`, including the one mid-draw.
  const allCoords = useMemo(() => stops.map(s => s.coordinates), [stops]);
  const icons = useMemo(() => buildIcons(p), [p]);

  // Read committedIndex through a ref so the effect below can branch on it
  // without depending on it — it must run on a change of stop, and only then.
  const committedRef = useRef(committedIndex);
  useEffect(() => { committedRef.current = committedIndex; }, [committedIndex]);

  // Drive the route straight off currentIndex, so drawing begins on the same
  // frame as the click rather than a flight-length later.
  useEffect(() => {
    const committed = committedRef.current;
    if (currentIndex > committed) {
      // Forward: draw the real path vertices from the committed end to the new
      // stop. Using the actual vertices (not a straight from→to chord) means
      // the finished line is geometrically identical to the committed one, so
      // there is no snap when the two swap over.
      setDraw({ from: committed, to: currentIndex });
    } else {
      // Backwards, or a jump behind us: nothing to draw, settle immediately.
      setDraw(null);
      setCommittedIndex(currentIndex);
    }
  }, [currentIndex]);

  // Called from the draw's final frame. A superseded draw unmounts (its key
  // changes) and cancels its own frame, so this only ever fires for the
  // stretch that actually finished.
  const commitDraw = () => {
    if (draw) setCommittedIndex(draw.to);
    setDraw(null);
  };

  const committedCoords = useMemo(
    () => allCoords.slice(0, committedIndex + 1),
    [allCoords, committedIndex],
  );
  const drawCoords = useMemo(
    () => (draw ? allCoords.slice(draw.from, draw.to + 1) : null),
    [allCoords, draw],
  );
  const futureCoords = useMemo(
    () => allCoords.slice(currentIndex),
    [allCoords, currentIndex],
  );

  const current = stops[currentIndex];
  const zoom = currentIndex === 0 ? archive.mapZoom : archive.stopZoom;

  return (
    <MapContainer
      center={archive.mapCenter}
      zoom={archive.mapZoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={true}
    >
      {/*
        keepBuffer pre-loads a ring of tiles around the viewport so flyTo pans
        into ground that is already drawn. It is a ring per side, so the tile
        count grows quadratically: at keepBuffer={8} a typical viewport asks for
        several hundred tiles per zoom level and saturates the connection, which
        starves the flight and the photo thumbnails alike. Two rings hides the
        seams without the stall.
        updateWhenZooming={false} avoids mid-zoom fetches that flash half-loaded tiles.
      */}
      {/*
        One host, no {s} subdomain rotation: sharding across a-d predates HTTP/2
        and now just costs three extra TLS handshakes for tiles that multiplex
        fine over a single connection.
      */}
      <TileLayer
        url={basemap.url}
        attribution={basemap.attribution}
        maxZoom={20}
        keepBuffer={2}
        updateWhenZooming={false}
      />

      <FlyToStop coordinates={current.coordinates} zoom={zoom} />

      {/* Dim dashed background showing the full route */}
      <Polyline
        positions={allCoords}
        pathOptions={{ color: p.routeDim, weight: 1.5, dashArray: '5 7', opacity: 0.7 }}
      />

      {/* Committed gold route — extends once each stretch finishes drawing */}
      {committedCoords.length > 1 && (
        <Polyline
          positions={committedCoords}
          pathOptions={{ color: p.routeGold, weight: 2, opacity: 0.9 }}
        />
      )}

      {/* The stretch drawing right now; keyed so a new navigation restarts it */}
      {drawCoords && drawCoords.length > 1 && (
        <DrawingRoute
          key={`${draw.from}-${draw.to}`}
          positions={drawCoords}
          color={p.routeGold}
          onComplete={commitDraw}
        />
      )}

      {/* Remaining route ahead */}
      {futureCoords.length > 1 && (
        <Polyline
          positions={futureCoords}
          pathOptions={{ color: p.routeFuture, weight: 1.5, dashArray: '5 7', opacity: 0.8 }}
        />
      )}

      {/* Markers always reflect currentIndex immediately */}
      {stops.map((stop, index) => {
        const isActive = index === currentIndex;
        return (
          <Marker
            key={stop.id}
            position={stop.coordinates}
            icon={isActive ? icons.active : index < currentIndex ? icons.visited : icons.future}
            eventHandlers={{ click: () => onStopSelect(index) }}
            zIndexOffset={isActive ? 1000 : 0}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              {stop.location}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
