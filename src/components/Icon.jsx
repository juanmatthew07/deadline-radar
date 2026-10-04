// Thin wrapper around one allowed icon, so size, stroke, and accessibility stay
// the same everywhere. Icons are decorative: the label beside them carries the
// meaning.
const DEFAULT_SIZE = 18
const STROKE_WIDTH = 1.75

export function Icon({ as: Glyph, size = DEFAULT_SIZE, className }) {
  return (
    <Glyph
      className={className}
      size={size}
      strokeWidth={STROKE_WIDTH}
      aria-hidden="true"
      focusable="false"
    />
  )
}

export default Icon
