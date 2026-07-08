import { useState } from 'react';

export default function Lightbox({ photo, onClose }) {
  const [errored, setErrored] = useState(false);

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
        <div className="lightbox-img-wrapper">
          {errored ? (
            <div style={{ padding: '40px 60px', color: 'var(--text-muted)', fontFamily: 'Courier Prime, monospace', fontSize: 12 }}>
              Image not found: {photo.id}.JPG
            </div>
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}images/${photo.id}.JPG`}
              alt={photo.title}
              onError={() => setErrored(true)}
            />
          )}
        </div>
        <div className="lightbox-caption">
          <h3>{photo.title}</h3>
          <p>{photo.description}</p>
        </div>
      </div>
      <button className="lightbox-close" onClick={onClose} title="Close (Esc)">×</button>
    </div>
  );
}
