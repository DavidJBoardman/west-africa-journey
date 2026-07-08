import { useState, useEffect, useCallback } from 'react';
import JourneyMap from './components/JourneyMap';
import InfoPanel from './components/InfoPanel';
import TimelineBar from './components/TimelineBar';
import Lightbox from './components/Lightbox';
import { archives } from './data/archives';
import './App.css';

export default function App() {
  const [archiveIndex, setArchiveIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [panelKey, setPanelKey] = useState(0);
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const archive = archives[archiveIndex];
  const { stops } = archive;

  const switchArchive = useCallback((idx) => {
    setArchiveIndex(idx);
    setCurrentIndex(0);
    setIsPlaying(false);
    setLightboxPhoto(null);
    setPanelKey(k => k + 1);
  }, []);

  const goTo = useCallback((index) => {
    setCurrentIndex(index);
    setPanelKey(k => k + 1);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(i => {
      if (i < stops.length - 1) {
        setPanelKey(k => k + 1);
        return i + 1;
      }
      setIsPlaying(false);
      return i;
    });
  }, [stops.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(i => {
      if (i > 0) {
        setPanelKey(k => k + 1);
        return i - 1;
      }
      return i;
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(goToNext, 5000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, goToNext]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === 'Escape') setLightboxPhoto(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToNext, goToPrev]);

  return (
    <div className="app" data-theme={theme}>
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
          key={panelKey}
          stop={stops[currentIndex]}
          stopIndex={currentIndex}
          totalStops={stops.length}
          isPlaying={isPlaying}
          onPhotoClick={setLightboxPhoto}
          onNext={goToNext}
          onPrev={goToPrev}
          onTogglePlay={() => setIsPlaying(p => !p)}
        />
        <div className="map-wrapper">
          {/* key forces full remount on archive switch, resetting all map state */}
          <JourneyMap
            key={`${archiveIndex}-${theme}`}
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
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}
    </div>
  );
}
