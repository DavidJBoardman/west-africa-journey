import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SEGMENT_ANIM_MS = 700;

const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
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
// Flies the map to coordinates and fires onArrived(targetIndex) on moveend.
// Uses map.on (not .once) so the cleanup ref can remove the exact handler.
// onArrivedRef ensures the callback is always the latest render's version.
function FlyToStop({ targetIndex, coordinates, zoom, onArrived }) {
  const map = useMap();
  const onArrivedRef = useRef(onArrived);
  useEffect(() => { onArrivedRef.current = onArrived; });

  useEffect(() => {
    map.flyTo(coordinates, zoom, { duration: 1.2, easeLinearity: 0.25 });

    const handler = () => {
      onArrivedRef.current(targetIndex);
      map.off('moveend', handler);
    };
    map.on('moveend', handler);
    return () => map.off('moveend', handler);
  }, [targetIndex, coordinates, zoom, map]);

  return null;
}

// ── AnimatedSegment ──────────────────────────────────────────────────────────
// Renders a single line segment and animates it drawing via SVG stroke-dashoffset.
// Mounts fresh each time (key prop from parent ensures remount per new segment).
function AnimatedSegment({ from, to, color, onComplete }) {
  const layerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    // One RAF so Leaflet has placed the SVG path in the DOM before we measure it.
    const raf = requestAnimationFrame(() => {
      const path = layerRef.current?._path;
      if (!path) return;

      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = 'none';

      // Force reflow so the "invisible" state registers before the transition.
      path.getBoundingClientRect();

      path.style.transition = `stroke-dashoffset ${SEGMENT_ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      path.style.strokeDashoffset = 0;
    });

    const timer = setTimeout(() => onCompleteRef.current(), SEGMENT_ANIM_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  return (
    <Polyline
      ref={layerRef}
      positions={[from, to]}
      pathOptions={{ color, weight: 2, opacity: 0.9 }}
    />
  );
}

// ── Marker icons ─────────────────────────────────────────────────────────────
function createStopIcon(isActive, isVisited, p) {
  if (isActive) {
    return divIcon({
      html: `<div style="
        width:12px;height:12px;
        background:${p.markerActive};
        border-radius:50%;
        border:2px solid ${p.markerActiveBorder};
        box-shadow:0 0 8px 2px ${p.markerActive}70;
      "></div>`,
      className: '',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }
  const bg = isVisited ? p.markerVisited : p.markerFuture;
  const border = isVisited ? p.markerVisitedBorder : p.markerFutureBorder;
  const size = isVisited ? 8 : 6;
  return divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border-radius:50%;
      border:1.5px solid ${border};
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── JourneyMap ───────────────────────────────────────────────────────────────
export default function JourneyMap({ archive, stops, currentIndex, onStopSelect, theme = 'dark' }) {
  const p = PALETTE[theme];
  const allCoords = stops.map(s => s.coordinates);

  // stableEndIndex: how far the static gold polyline currently extends.
  // routeIndex: the destination the map last arrived at.
  // animSeg: the segment being drawn with animation right now (null = idle).
  const [routeIndex, setRouteIndex] = useState(currentIndex);
  const [stableEndIndex, setStableEndIndex] = useState(currentIndex);
  const [animSeg, setAnimSeg] = useState(null);

  // Keep refs so callbacks always read fresh state without stale closures.
  const routeIndexRef = useRef(routeIndex);
  const stableEndIndexRef = useRef(stableEndIndex);
  useEffect(() => { routeIndexRef.current = routeIndex; }, [routeIndex]);
  useEffect(() => { stableEndIndexRef.current = stableEndIndex; }, [stableEndIndex]);

  // Backwards / timeline jump: update immediately, no animation.
  useEffect(() => {
    if (currentIndex <= routeIndexRef.current) {
      setRouteIndex(currentIndex);
      setStableEndIndex(currentIndex);
      setAnimSeg(null);
    }
  }, [currentIndex]);

  const handleArrived = (arrivedIndex) => {
    setRouteIndex(arrivedIndex);
    const prev = stableEndIndexRef.current;
    if (arrivedIndex > prev) {
      // Start a new animated segment from where the stable line ends to the new stop.
      setAnimSeg({ from: allCoords[prev], to: allCoords[arrivedIndex], key: arrivedIndex });
    } else {
      setStableEndIndex(arrivedIndex);
    }
  };

  const handleSegmentComplete = () => {
    // Extend the stable line to wherever routeIndex ended up (latest ref value).
    setStableEndIndex(routeIndexRef.current);
    setAnimSeg(null);
  };

  const stableVisited = allCoords.slice(0, stableEndIndex + 1);
  const futureCoords = allCoords.slice(routeIndex);
  const current = stops[currentIndex];
  const zoom = currentIndex === 0 ? archive.mapZoom : archive.stopZoom;

  return (
    <MapContainer
      center={archive.mapCenter}
      zoom={archive.mapZoom}
      style={{ height: 'calc(100vh - var(--header-height) - var(--timeline-height))', width: '100%' }}
      zoomControl={false}
      attributionControl={true}
    >
      {/*
        keepBuffer pre-loads extra tiles around the viewport so they are already
        present when flyTo pans into new territory, hiding the tile grid seams.
        updateWhenZooming={false} prevents mid-zoom tile fetches that create
        half-loaded tile flashes during the animation.
      */}
      <TileLayer
        url={TILE_URLS[theme]}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
        keepBuffer={8}
        updateWhenZooming={false}
      />

      <FlyToStop
        targetIndex={currentIndex}
        coordinates={current.coordinates}
        zoom={zoom}
        onArrived={handleArrived}
      />

      {/* Dim dashed background showing the full route */}
      <Polyline
        positions={allCoords}
        pathOptions={{ color: p.routeDim, weight: 1.5, dashArray: '5 7', opacity: 0.7 }}
      />

      {/* Stable gold polyline: extends only after each segment finishes animating */}
      {stableVisited.length > 1 && (
        <Polyline
          positions={stableVisited}
          pathOptions={{ color: p.routeGold, weight: 2, opacity: 0.9 }}
        />
      )}

      {/* Animated new segment — remounts per arrival via key prop */}
      {animSeg && (
        <AnimatedSegment
          key={animSeg.key}
          from={animSeg.from}
          to={animSeg.to}
          color={p.routeGold}
          onComplete={handleSegmentComplete}
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
        const isVisited = index < currentIndex;
        return (
          <Marker
            key={stop.id}
            position={stop.coordinates}
            icon={createStopIcon(isActive, isVisited, p)}
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
