import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export default function TimelineBar({ stops, currentIndex, onSelect }) {
  const stopsRef = useRef(null);
  // Centre offset (px, from the track's left edge) of each stop's dot.
  const [dotCentres, setDotCentres] = useState(null);

  // The stops are laid out with space-between and each button is as wide as its
  // own label, so the dots are not evenly spaced and the first and last do not
  // sit at 0% and 100%. A flat currentIndex/total percentage therefore drew the
  // progress line past the active dot — one of the things that made a
  // navigation look out of step. Measure the dots instead.
  const measure = useCallback(() => {
    const el = stopsRef.current;
    if (!el) return;
    const wrappers = el.querySelectorAll('.timeline-dot-wrapper');
    if (wrappers.length < 2) return;
    const origin = el.getBoundingClientRect().left;
    setDotCentres(Array.from(wrappers, (w) => {
      const r = w.getBoundingClientRect();
      return r.left - origin + r.width / 2;
    }));
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = stopsRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, stops]);

  const first = dotCentres?.[0] ?? 0;
  const last = dotCentres?.[dotCentres.length - 1] ?? 0;
  const span = last - first;
  const progress = span > 0
    ? ((dotCentres[currentIndex] ?? first) - first) / span
    : 0;

  return (
    <nav className="timeline-bar" aria-label="Journey timeline">
      <div className="timeline-track">
        <div
          className="timeline-line-base"
          style={dotCentres ? { left: first, width: span } : undefined}
        />
        {/*
          Animated with scaleX rather than width: a transform is composited, so
          the progress line no longer forces layout and paint of the whole bar
          on every frame. Its duration is --nav-duration, the same clock the map
          flight and the route drawing run on, so the three land together.
        */}
        <div
          className="timeline-line-progress"
          style={dotCentres
            ? { left: first, width: span, transform: `scaleX(${progress})` }
            : { transform: 'scaleX(0)' }}
        />
        <div className="timeline-stops" ref={stopsRef}>
          {stops.map((stop, index) => {
            const state = index === currentIndex
              ? 'active'
              : index < currentIndex ? 'visited' : 'future';
            const dateParts = stop.dateRange.split(' ');
            return (
              <button
                key={stop.id}
                className="timeline-stop"
                onClick={() => onSelect(index)}
                title={`${stop.location} · ${stop.dateRange}`}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <div className="timeline-dot-wrapper">
                  <div className={`timeline-dot ${state}`} />
                </div>
                <span className={`timeline-stop-label ${state}`}>
                  {stop.location.split(' & ')[0]}
                </span>
                <span className="timeline-date-label">
                  {dateParts[dateParts.length - 1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
