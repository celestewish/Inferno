// Lightweight inline SVG icon set. No icon-library dependency: each icon is a
// small stroke-based glyph drawn with currentColor so it inherits text color and
// stays crisp at any size. Icons are decorative (aria-hidden) and always paired
// with a visible text label or an aria-label on the control that renders them.

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function BoardIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </Svg>
  )
}

export function TasksIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 6h11" />
      <path d="M4 12h11" />
      <path d="M4 18h11" />
      <path d="M18.5 5.5 20 7l-2.5 2.5" />
    </Svg>
  )
}

export function ProjectsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  )
}

// Flame / campfire glyph, used for the Campfire nav item and room markers.
export function FlameIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3c1.2 3 3.5 4.2 3.5 7.2A3.5 3.5 0 0 1 12 14a3.5 3.5 0 0 1-3.5-3.8C8.5 8 9.8 7 10 5.5 10.8 6.5 11.5 4.7 12 3Z" />
      <path d="M7 14.5a5 5 0 1 0 10 0c0-1.3-.5-2.4-1.2-3.3A4 4 0 0 1 12 15a4 4 0 0 1-3.8-3.8C7.5 12.1 7 13.2 7 14.5Z" />
    </Svg>
  )
}

export function TeamIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14a5.5 5.5 0 0 1 3 5" />
    </Svg>
  )
}

export function CalendarIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
    </Svg>
  )
}

export function ReportsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7" y="11" width="3" height="6" />
      <rect x="12.5" y="7" width="3" height="10" />
      <rect x="18" y="13" width="3" height="4" />
    </Svg>
  )
}

export function SettingsIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </Svg>
  )
}

export function PlusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  )
}

export function CloseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  )
}
