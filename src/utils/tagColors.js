/**
 * Deterministic tag color assignment.
 * Same tag name → same color index every time.
 * 9 visually distinct hues that work on both dark and light backgrounds.
 */

// Each entry: [background, text] — both suitable for a small pill
export const TAG_PALETTE = [
  { bg: '#3B82F6', text: '#fff' },  // 0 blue
  { bg: '#A855F7', text: '#fff' },  // 1 purple
  { bg: '#EC4899', text: '#fff' },  // 2 pink
  { bg: '#F97316', text: '#fff' },  // 3 orange
  { bg: '#EAB308', text: '#000' },  // 4 yellow
  { bg: '#22C55E', text: '#000' },  // 5 green
  { bg: '#06B6D4', text: '#000' },  // 6 cyan
  { bg: '#EF4444', text: '#fff' },  // 7 red
  { bg: '#64748B', text: '#fff' },  // 8 slate
]

/**
 * Returns a simple numeric hash of a string in [0, n).
 * Uses djb2 which is fast and produces good spread on short strings.
 */
function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0  // keep 32-bit unsigned
  }
  return hash
}

/**
 * Given a tag name, return a { bg, text } color object from the palette.
 * The result is deterministic — same name always returns same color.
 */
export function getTagColor(name) {
  if (!name) return TAG_PALETTE[0]
  const idx = hashString(name.toLowerCase()) % TAG_PALETTE.length
  return TAG_PALETTE[idx]
}
