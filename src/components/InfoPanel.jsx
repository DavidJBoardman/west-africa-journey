import { useState } from 'react';
import { THUMB_H, THUMB_W, prefetchDisplay, thumbUrl } from '../lib/photos';

function PhotoCard({ photo, onPhotoClick }) {
  const [errored, setErrored] = useState(false);

  return (
    <div
      className="photo-card"
      onClick={() => !errored && onPhotoClick(photo)}
      // Start fetching the large version on hover, so the lightbox is already
      // holding the image by the time it is clicked.
      onPointerEnter={() => prefetchDisplay(photo)}
      onFocus={() => prefetchDisplay(photo)}
    >
      {errored ? (
        <div className="photo-missing">No image</div>
      ) : (
        <>
          <img
            src={thumbUrl(photo.id)}
            alt={photo.title}
            width={THUMB_W}
            height={THUMB_H}
            loading="lazy"
            decoding="async"
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
      <div className="panel-top">
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

        {/*
          Keyed on the stop, not on an ever-incrementing counter, and applied to
          the changing blocks rather than the whole panel. The panel's chrome —
          controls, footer, and the scroll position of the photo grid — is kept
          across a navigation; only the content that actually changed replays
          its entrance.
        */}
        <div className="panel-location panel-animate" key={`loc-${stop.id}`}>
          <h2 className="location-name">{stop.location}</h2>
          <div className="location-meta">
            <span className="location-country">{stop.country}</span>
            <span className="location-separator" />
            <span className="location-date">{stop.dateRange}</span>
          </div>
        </div>
      </div>

      <div className="panel-description panel-animate" key={`desc-${stop.id}`}>
        <p className="description-text">{stop.description}</p>
      </div>

      <div className="panel-photos">
        <p className="photos-label">Photographs — {stop.photos.length} cards</p>
        <div className="photos-grid panel-animate" key={`photos-${stop.id}`}>
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
