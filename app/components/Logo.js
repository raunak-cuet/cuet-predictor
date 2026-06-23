// DreamSeat wordmark — pure CSS/SVG, matches Instrument Serif headlines.
// "Dream" (pink) + "Seat" (brown) with a sparkle ornament floating above

export default function Logo({ className = '' }) {
  return (
    <div className={`logo-wordmark ${className}`}>
      <span className="logo-dream">Dream</span>
      <span className="logo-seat-wrap">
        <span className="logo-seat">Seat</span>
        <span className="logo-sparkle" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 1.5 L13.4 9.2 C13.55 10.05 14.05 10.55 14.9 10.7 L22.5 12 L14.9 13.3 C14.05 13.45 13.55 13.95 13.4 14.8 L12 22.5 L10.6 14.8 C10.45 13.95 9.95 13.45 9.1 13.3 L1.5 12 L9.1 10.7 C9.95 10.55 10.45 10.05 10.6 9.2 Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </span>
    </div>
  );
}
