// Inferno brand mark. Renders the Logo-1 artwork from the social media kit
// (served from public/brand). Height drives the size; width scales to keep the
// native 3:2 aspect ratio.
export default function InfernoLogo({ size = 28 }) {
  return (
    <img
      className="inferno-logo"
      src="/brand/logo-1.png"
      alt="Inferno logo"
      height={size}
      style={{ height: size, width: 'auto' }}
      draggable="false"
    />
  )
}
