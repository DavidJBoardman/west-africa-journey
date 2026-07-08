import { useState } from 'react';

function PhotoCard({ photo, onPhotoClick }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="photo-card" onClick={() => !errored && onPhotoClick(photo)}>
      {errored ? (
        <div className="photo-missing">No image</div>
      ) : (
        <>
          <img
            src={`${import.meta.env.BASE_URL}images/${photo.id}.JPG`}
            alt={photo.title}
            onError={() => setErrored(true)}
          />
          <div className="photo-overlay">
            <span className="photo-overlay-title">{photo.title}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function InfoPanel({
  stop,
  stopIndex,
  totalStops,
  isPlaying,
  onPhotoClick,
  onNext,
  onPrev,
  onTogglePlay,
}) {
  return (
    <aside className="info-panel">
      <div className="panel-top panel-animate">
        <div className="panel-stop-nav">
          <span className="stop-counter">
            Stop {stopIndex + 1} of {totalStops}
          </span>
          <div className="nav-controls">
            <button
              className="nav-btn"
              onClick={onPrev}
              disabled={stopIndex === 0}
              title="Previous stop (←)"
            >
              ←
            </button>
            <button
              className={`nav-btn play-btn ${isPlaying ? 'active' : ''}`}
              onClick={onTogglePlay}
              title="Play / pause (Space)"
            >
              {isPlaying ? '⏸' : '⏵'}
            </button>
            <button
              className="nav-btn"
              onClick={onNext}
              disabled={stopIndex === totalStops - 1}
              title="Next stop (→)"
            >
              →
            </button>
          </div>
        </div>

        <div className="panel-location">
          <h2 className="location-name">{stop.location}</h2>
          <div className="location-meta">
            <span className="location-country">{stop.country}</span>
            <span className="location-separator" />
            <span className="location-date">{stop.dateRange}</span>
          </div>
        </div>
      </div>

      <div className="panel-description panel-animate">
        <p className="description-text">{stop.description}</p>
      </div>

      <div className="panel-photos panel-animate">
        <p className="photos-label">Photographs — {stop.photos.length} cards</p>
        <div className="photos-grid">
          {stop.photos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} onPhotoClick={onPhotoClick} />
          ))}
        </div>
      </div>

      <div className="panel-footer">
        <p className="keyboard-hint">
          <kbd>←</kbd><kbd>→</kbd> navigate &nbsp;·&nbsp; <kbd>Space</kbd> play &nbsp;·&nbsp; click map markers to jump
        </p>
      </div>
    </aside>
  );
}
