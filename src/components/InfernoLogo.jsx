// Inferno brand mark. Renders the orange horse artwork (served from
// public/brand). Height drives the size; width scales to keep the native aspect
// ratio.
export default function InfernoLogo({ size = 28 }) {
  return (
    <img
      className="inferno-logo"
      src="/brand/orange-horse-logo.png"
      alt="Inferno logo"
      height={size}
      style={{ height: size, width: 'auto' }}
      draggable="false"
    />
  )
}
