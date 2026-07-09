let gallopUid = 0

// Dante charging the viewer: a front-facing gallop used as the closing brand
// motif on the landing page. Ember mane, violet coat, fierce glowing eyes.
export default function GallopingHorse({ size = 260 }) {
  const gid = `gallop-${(gallopUid += 1)}`

  return (
    <svg
      className="galloping-horse"
      width={size}
      height={size * 0.85}
      viewBox="0 0 220 187"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${gid}-glow`} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="55%" stopColor="var(--accent-secondary)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-mane`} x1="40" y1="0" x2="180" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent-secondary)" />
          <stop offset="45%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--ember)" />
        </linearGradient>
        <linearGradient id={`${gid}-coat`} x1="70" y1="55" x2="150" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2a2350" />
          <stop offset="100%" stopColor="#12102a" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="86" rx="104" ry="80" fill={`url(#${gid}-glow)`} />

      {/* ember mane streaming back from the crest */}
      <g fill={`url(#${gid}-mane)`}>
        <path d="M110 8c14 12 20 6 28-2-2 16-10 22-4 30 10-6 16-4 24-12-4 18-16 24-10 34 8-3 14-2 22-8-8 18-24 22-30 30-8-10-18-14-30-14s-22 4-30 14c-6-8-22-12-30-30 8 6 14 5 22 8-6-10-6-16-10-34 8 8 14 6 24 12 6-8-2-14-4-30 8 8 14 14 28 2Z" />
      </g>

      {/* charging forelegs kicking toward the viewer */}
      <g fill={`url(#${gid}-coat)`} stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round">
        <path d="M92 120c-4 14-12 26-24 34-4 3-3 9 2 9 10 0 18-6 22-16 3-8 5-18 4-27Z" />
        <path d="M128 120c4 14 12 26 24 34 4 3 3 9-2 9-10 0-18-6-22-16-3-8-5-18-4-27Z" />
      </g>
      <path d="M64 165c2-3 6-4 10-3" stroke="var(--ember)" strokeWidth="3" strokeLinecap="round" />
      <path d="M156 165c-2-3-6-4-10-3" stroke="var(--ember)" strokeWidth="3" strokeLinecap="round" />

      {/* chest and lowered head charging forward */}
      <path
        d="M110 58c22 0 40 12 40 34 0 20-10 34-14 48-3 10-12 16-26 16s-23-6-26-16c-4-14-14-28-14-48 0-22 18-34 40-34Z"
        fill={`url(#${gid}-coat)`}
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* ears */}
      <path d="M86 60c-5-6-6-14-4-20 7 3 12 9 14 17Z" fill={`url(#${gid}-mane)`} />
      <path d="M134 60c5-6 6-14 4-20-7 3-12 9-14 17Z" fill={`url(#${gid}-mane)`} />

      {/* fierce eyes */}
      <path d="M92 92c6-4 12-4 17 0-4 5-13 5-17 0Z" fill="#fef6ff" />
      <path d="M128 92c-6-4-12-4-17 0 4 5 13 5 17 0Z" fill="#fef6ff" />
      <circle cx="100" cy="93" r="2.6" fill="#171233" />
      <circle cx="120" cy="93" r="2.6" fill="#171233" />

      {/* muzzle and flaring nostrils breathing embers */}
      <path d="M100 130c3-4 17-4 20 0 2 6-3 12-10 12s-12-6-10-12Z" fill="#171233" stroke="var(--ember)" strokeWidth="1.6" />
      <circle cx="104" cy="134" r="2" fill="var(--ember)" />
      <circle cx="116" cy="134" r="2" fill="var(--ember)" />

      {/* ground shadow */}
      <ellipse cx="110" cy="178" rx="60" ry="7" fill="#000" opacity="0.28" />
    </svg>
  )
}
