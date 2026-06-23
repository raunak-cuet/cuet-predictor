// DreamSeat wordmark — pure CSS/SVG, matches Instrument Serif headlines.
// "Dream" + "S" + ✦moon✦ ornament + "at"
// Used in the navbar.

export default function Logo({ className = '' }) {
  return (
    <div className={`logo-wordmark ${className}`}>
      <span className="logo-dream">Dream</span>
      <span className="logo-s">S</span>
      <span className="logo-orn" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Crescent moon (filled, white inside) */}
          <path
            d="M19.5 8.5a8 8 0 1 0 4.6 14.5 6.5 6.5 0 0 1-4.6-14.5z"
            fill="currentColor"
          />
          {/* Tiny stars around the moon */}
          <path d="M7 10l0.7 1.4 1.5 0.2-1.1 1 0.3 1.5-1.3-0.7-1.3 0.7 0.3-1.5-1.1-1 1.5-0.2z" fill="currentColor" opacity="0.9" />
          <path d="M26 6l0.55 1.1 1.2 0.18-0.87 0.84 0.21 1.18-1.08-0.57-1.08 0.57 0.21-1.18-0.87-0.84 1.2-0.18z" fill="currentColor" opacity="0.85" />
          <path d="M27.5 21l0.6 1.2 1.3 0.2-0.95 0.92 0.22 1.3-1.17-0.62-1.17 0.62 0.22-1.3-0.95-0.92 1.3-0.2z" fill="currentColor" opacity="0.85" />
        </svg>
      </span>
      <span className="logo-at">at</span>
    </div>
  );
}
