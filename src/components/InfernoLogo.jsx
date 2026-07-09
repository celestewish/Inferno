let logoUid = 0

// Inferno brand mark: Dante the flame horse in profile. Shares the mascot
// silhouette used across the site so the horse is the single brand motif.
export default function InfernoLogo({ size = 28 }) {
  const gid = `inferno-logo-${(logoUid += 1)}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Inferno logo"
    >
      <defs>
        <linearGradient id={`${gid}-mane`} x1="16" y1="6" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent-secondary)" />
          <stop offset="45%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--ember)" />
        </linearGradient>
        <linearGradient id={`${gid}-face`} x1="30" y1="20" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2a2350" />
          <stop offset="100%" stopColor="#171233" />
        </linearGradient>
      </defs>

      <g fill={`url(#${gid}-mane)`}>
        <path d="M20 40c-7-3-11-11-8-19 2 5 6 6 8 4-3-8 1-15 8-19-2 7 1 10 4 11-1-6 2-11 7-14-3 9 2 13 6 16 2 8-2 17-10 21-8 3-16 3-23 0Z" />
      </g>

      <path
        d="M33 20c9 0 16 6 16 15 0 6-3 10-3 14 0 2-2 3-4 3h-3c-2 0-3-1-3-3l-1-4c-5-1-9-5-9-12 0-8 5-13 10-13Z"
        fill={`url(#${gid}-face)`}
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M31 21c-2-2-2-5-1-7 3 1 5 3 6 6Z" fill={`url(#${gid}-mane)`} />
      <path d="M44 40c3 0 5 2 5 4s-2 3-4 3" stroke="var(--ember)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="46" cy="45" r="1.4" fill="var(--ember)" />
      <circle cx="39" cy="33" r="2.3" fill="#fef6ff" />
      <circle cx="39.6" cy="33.4" r="1.1" fill="#171233" />
      <path d="M52 24l1.4 3.4L57 29l-3.6 1.6L52 34l-1.4-3.4L47 29l3.6-1.6Z" fill="var(--accent-secondary)" />
    </svg>
  )
}
