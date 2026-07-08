export default function TimelineBar({ stops, currentIndex, onSelect }) {
  const progressPct = currentIndex === 0
    ? 0
    : (currentIndex / (stops.length - 1)) * 100;

  return (
    <nav className="timeline-bar">
      <div className="timeline-track">
        <div className="timeline-line-base" />
        <div
          className="timeline-line-progress"
          style={{ width: `${progressPct}%` }}
        />
        <div className="timeline-stops">
          {stops.map((stop, index) => {
            const isActive = index === currentIndex;
            const isVisited = index < currentIndex;
            const state = isActive ? 'active' : isVisited ? 'visited' : 'future';
            return (
              <button
                key={stop.id}
                className="timeline-stop"
                onClick={() => onSelect(index)}
                title={`${stop.location} · ${stop.dateRange}`}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className="timeline-dot-wrapper">
                  <div className={`timeline-dot ${state}`} />
                </div>
                <span className={`timeline-stop-label ${state}`}>
                  {stop.location.split(' & ')[0]}
                </span>
                <span className="timeline-date-label">
                  {stop.dateRange.split(' ')[stop.dateRange.split(' ').length - 1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
