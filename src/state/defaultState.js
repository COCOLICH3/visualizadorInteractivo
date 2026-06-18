// Estado inicial de la app. Todo lo que se cambia en vivo vive acá.
export const defaultState = {
  pattern: 'bars',        // 'bars' | 'particles'
  paletteIndex: 0,        // índice en PALETTES
  sensitivity: 1.0,       // multiplicador de reacción al audio
  smoothing: 0.8,         // suavizado del AnalyserNode
  particleCount: 600,     // cantidad de partículas
  glow: 0.5,              // intensidad de efecto (0..1)
  autoPalette: false,     // rotación automática de paleta
  autoPaletteMode: 'time',// 'time' | 'beat'
  flash: 0,               // pulso de flash 0..1 (decae solo)
  // Feedback / trail loop (patrón Nebulosa)
  trailScale: 1.02,       // zoom del frame anterior (>1 expande hacia afuera)
  trailAlpha: 0.95,       // cuánto persiste el frame anterior (0..1)
  trailRotate: 0.0,       // rotación sutil del trail por frame (rad)
};
