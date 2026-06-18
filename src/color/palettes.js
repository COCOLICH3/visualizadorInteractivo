// Paletas predefinidas + interpolación lineal entre stops.
// Los colores son números 0xRRGGBB (formato que usa PixiJS).
export const PALETTES = [
  { name: 'Neón',   colors: [0x00f0ff, 0xff00e6, 0xfffb00] },
  { name: 'Fuego',  colors: [0xfff200, 0xff7b00, 0xd00000] },
  { name: 'Océano', colors: [0x012a4a, 0x2a9d8f, 0x90e0ef] },
  { name: 'Retro',  colors: [0xf72585, 0x7209b7, 0x4cc9f0] },
  { name: 'Mono',   colors: [0x222222, 0xffffff] },
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// t en 0..1 a lo largo de toda la paleta.
export function colorAt(palette, t) {
  const colors = palette.colors;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0) return colors[0];
  if (clamped >= 1) return colors[colors.length - 1];

  const scaled = clamped * (colors.length - 1);
  const i = Math.floor(scaled);
  const frac = scaled - i;
  const c0 = colors[i];
  const c1 = colors[i + 1];

  const r = lerp((c0 >> 16) & 0xff, (c1 >> 16) & 0xff, frac);
  const g = lerp((c0 >> 8) & 0xff, (c1 >> 8) & 0xff, frac);
  const b = lerp(c0 & 0xff, c1 & 0xff, frac);
  return (r << 16) | (g << 8) | b;
}
