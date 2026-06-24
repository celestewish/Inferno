export default function InfernoLogo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Inferno logo"
    >
      <defs>
        <linearGradient id="infernoFlame" x1="12" y1="8" x2="50" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent-secondary)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#FF8A5B" />
        </linearGradient>
      </defs>

      <path
        d="M34.5 6C36 14 30 18 30 24c0 3.2 2.2 5.6 5.3 6.4-1.2-4.1 1.3-7.1 4.7-9.8C44.8 17 48 22.7 48 29.5 48 42 40.2 52 28.5 52 18.2 52 10 43.8 10 33.5c0-8.2 4.9-14.1 10.8-19.3 1.6 5.9 5.2 8.7 8.6 10.2-.9-6.9 1.3-12.3 5.1-18.4Z"
        fill="url(#infernoFlame)"
      />

      <path
        d="M31 28c5.8 3.2 9 8.1 9 13.6C40 47.9 35 52 28.9 52 23.4 52 19 47.9 19 42.8c0-5.2 3.4-9.6 7.9-12.8-.2 4.8 1.7 8.2 5.8 10.5-1.4-3.2-.7-7.6-1.7-12.5Z"
        fill="rgba(255,255,255,0.18)"
      />
    </svg>
  )
}