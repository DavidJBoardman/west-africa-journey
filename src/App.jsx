import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import JourneyMap from './components/JourneyMap';
import InfoPanel from './components/InfoPanel';
import TimelineBar from './components/TimelineBar';
import { archives } from './data/archives';
import { NAV_MS, DWELL_MS } from './lib/timing';
import { prefetchThumbs } from './lib/photos';
import './App.css';

// Split out of the main bundle: the lightbox is only needed once someone
// actually opens a photograph.
const Lightbox = lazy(() => import('./components/Lightbox'));

export default function App() {
  const [archiveIndex, setArchiveIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const archive = archives[archiveIndex];
  const { stops } = archive;
  const lastIndex = stops.length - 1;

  const switchArchive = useCallback((idx) => {
    setArchiveIndex(idx);
    setCurrentIndex(0);
    setIsPlaying(false);
    setLightboxPhoto(null);
  }, []);

  const goTo = useCallback((index) => setCurrentIndex(index), []);
  const goToNext = useCallback(() => setCurrentIndex(i => Math.min(i + 1, lastIndex)), [lastIndex]);
  const goToPrev = useCallback(() => setCurrentIndex(i => Math.max(i - 1, 0)), []);

  // Warm the thumbnails either side of here, so stepping through the journey
  // does not wait on a network round trip for each stop's photographs.
  useEffect(() => {
    const neighbours = [stops[currentIndex + 1], stops[currentIndex - 1]];
    const id = setTimeout(() => {
      neighbours.forEach(stop => stop && prefetchThumbs(stop.photos));
    }, NAV_MS);
    return () => clearTimeout(id);
  }, [stops, currentIndex]);

  // Advance (or stop, at the end of the journey) from inside the timer rather
  // than from the effect body, so autoplay never triggers a cascading render.
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      if (currentIndex >= lastIndex) setIsPlaying(false);
      else setCurrentIndex(currentIndex + 1);
    }, DWELL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, lastIndex]);

  // Pressing play on the last stop replays the journey rather than sitting on a
  // dead timer.
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (currentIndex >= lastIndex) setCurrentIndex(0);
    setIsPlaying(true);
  }, [isPlaying, currentIndex, lastIndex]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setLightboxPhoto(null);
        return;
      }
      // While a photograph is open, the arrows and space belong to it, not to
      // the journey behind it.
      if (lightboxPhoto) return;

      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToNext, goToPrev, togglePlay, lightboxPhoto]);

  return (
    <div className="app" data-theme={theme} style={{ '--nav-duration': `${NAV_MS}ms` }}>
      <header className="app-header">
        <div className="header-title-group">
          <span className="header-eyebrow">Unilever Archives Collection</span>
          <h1 className="header-title">{archive.title}</h1>
        </div>

        <nav className="archive-switcher">
          {archives.map((a, i) => (
            <button
              key={a.id}
              className={`archive-tab${archiveIndex === i ? ' active' : ''}`}
              onClick={() => switchArchive(i)}
            >
              {a.label}
            </button>
          ))}
        </nav>

        <div className="header-meta">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '◑' : '◐'}
          </button>
          <span className="header-subtitle">{archive.subtitle}</span>
          <span className="header-ref">{archive.archive}</span>
        </div>
      </header>

      <main className="app-main">
        <InfoPanel
          stop={stops[currentIndex]}
          stopIndex={currentIndex}
          totalStops={stops.length}
          isPlaying={isPlaying}
          onPhotoClick={setLightboxPhoto}
          onNext={goToNext}
          onPrev={goToPrev}
          onTogglePlay={togglePlay}
        />
        <div className="map-wrapper">
          {/*
            Keyed on the archive only, so switching collection resets all map
            state. Theme is deliberately not part of the key: the tile layer
            swaps its own URL in place, where remounting threw away every
            loaded tile and re-fetched the lot on each toggle.
          */}
          <JourneyMap
            key={archiveIndex}
            archive={archive}
            stops={stops}
            currentIndex={currentIndex}
            onStopSelect={goTo}
            theme={theme}
          />
        </div>
      </main>

      <TimelineBar
        stops={stops}
        currentIndex={currentIndex}
        onSelect={goTo}
      />

      {lightboxPhoto && (
        <Suspense fallback={null}>
          <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
        </Suspense>
      )}
    </div>
  );
}
