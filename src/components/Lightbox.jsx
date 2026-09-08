import { useState } from 'react';
import { displayUrl, thumbUrl } from '../lib/photos';

export default function Lightbox({ photo, onClose }) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
        <div className="lightbox-img-wrapper">
          {errored ? (
            <div className="lightbox-missing">Image not found: {photo.id}</div>
          ) : (
            <>
              {/*
                The thumbnail is already in cache from the grid, so it paints
                immediately and gives the large version something to resolve
                out of instead of an empty black box.
              */}
              <img
                className="lightbox-placeholder"
                src={thumbUrl(photo.id)}
                alt=""
                aria-hidden="true"
                data-hidden={loaded ? 'true' : 'false'}
              />
              <img
                className="lightbox-full"
                src={displayUrl(photo.id)}
                alt={photo.title}
                decoding="async"
                data-loaded={loaded ? 'true' : 'false'}
                onLoad={() => setLoaded(true)}
                onError={() => setErrored(true)}
              />
            </>
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
