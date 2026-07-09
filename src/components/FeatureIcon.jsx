const PATHS = {
  boards: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16M15 4v16" />
    </>
  ),
  projects: (
    <>
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="M4 12l8 4.5 8-4.5" />
      <path d="M4 16.5 12 21l8-4.5" />
    </>
  ),
  kanban: (
    <>
      <path d="M5 20V9" />
      <path d="M12 20V4" />
      <path d="M19 20v-8" />
      <path d="M3 20h18" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 20v-6M12.5 20V9M17 20v-9" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3 3 0 0 1 0 6" />
      <path d="M15.5 14.2c2.6.4 4.5 2.4 4.5 4.8" />
    </>
  ),
  customization: (
    <>
      <path d="M12 3c4.5 0 8 3 8 7 0 3-2.5 4-4.5 4H14c-1 0-1.7.8-1.4 1.8.3 1-.4 2.2-1.6 2.2C6.5 21 4 16.9 4 12.5 4 7.3 7.8 3 12 3Z" />
      <circle cx="8.5" cy="10" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="15.5" cy="10" r="1" />
    </>
  ),
}

export default function FeatureIcon({ name, size = 26 }) {
  const paths = PATHS[name]
  if (!paths) return null

  const gradientId = `feat-grad-${name}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent-secondary)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#FF8A5B" />
        </linearGradient>
      </defs>
      {paths}
    </svg>
  )
}
