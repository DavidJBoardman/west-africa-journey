const BASE = import.meta.env.BASE_URL;

// Two derivatives per card, generated from the 6240x4160 originals:
//   thumb   400px wide  (~6 KB)  — the 176px panel grid, at 2x DPR
//   display 1800px wide (~78 KB) — the lightbox, capped at 80vw / 72vh
// Originals live outside public/ so they are never shipped to the browser.
export const thumbUrl = (id) => `${BASE}photos/thumb/${id}.webp`;
export const displayUrl = (id) => `${BASE}photos/display/${id}.webp`;

export const THUMB_W = 400;
export const THUMB_H = 266;

const warmed = new Set();

// Ask the browser to fetch an image now so it is in cache by the time it is
// rendered. Cheap for thumbs; used to make forward navigation feel instant.
function warm(url) {
  if (warmed.has(url)) return;
  warmed.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

export const prefetchThumbs = (photos = []) => photos.forEach(p => warm(thumbUrl(p.id)));
export const prefetchDisplay = (photo) => photo && warm(displayUrl(photo.id));
