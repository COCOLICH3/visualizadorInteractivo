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
};
