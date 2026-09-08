// Single source of truth for navigation timing.
//
// Everything that moves when you change stop — the map flight, the route line
// drawing itself, the timeline progress bar, the info panel fade — runs on this
// one clock, so they start and finish together. CSS reads it via the
// --nav-duration custom property, set on the app root in App.jsx.
export const NAV_MS = 900;

// How long autoplay dwells on a stop before advancing (includes NAV_MS).
export const DWELL_MS = 5000;

// Someone who has asked their system for reduced motion should not be flown
// across a continent. Read live rather than cached, so a mid-session change
// to the OS setting is respected.
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
