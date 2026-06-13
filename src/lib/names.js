// Extracts the display-ready first name from a full participant name.
// "Yves-Marie Rems" → "Yves-Marie"
// "Ernst Legros (TNes)" → "Ernst"
export function firstName(fullName) {
  return fullName.replace(/\s*\(.*?\)\s*/g, '').trim().split(/\s+/)[0]
}
