// Patrón Milkdrop: integra Butterchurn (Milkdrop2 reimplementado en WebGL) como
// visualizador. Usa su propio canvas y su propio análisis de audio: le pasamos
// el AudioContext y el nodo fuente del AudioEngine (colgado en app.audioEngine).
//
// Controles propios (mientras está activo):
//   →  siguiente preset      ←  preset anterior      R  preset al azar
// Y desde el selector de patrones se eligen los presets destacados (en vivo).

// Presets curados a mano: los más espectaculares y reactivos del pack
// (Butterchurn trae 100, muchos flojos/oscuros). Se filtra por fragmentos
// distintivos del nombre. Si no matchea suficientes, cae a todos.
const CURATED = [
  'Hurricane Nightmare', 'Neverending Explosion', 'cubetrace', 'skylight',
  'witchcraft 2.0', 'neon mindblob', 'pogo cubes', 'astral projection',
  'cascading decay', 'jelly showoff parade', 'alien fish pond',
  'infused with the spiral', 'mindblob [shiny', 'predator-prey-spirals',
  'smashing fractals', 'what is the matrix', 'tokamak witchery',
  'sherwin maxawow', 'Star Nova', 'disconnected', 'Reaction Diffusion',
  'Spiral Artifact', 'Thumbdrum Tokamak', 'The Wild Vort', 'liquid arrows',
  'mandelbox explorer', 'Surface Turbulence', 'witchcraft reloaded',
  'FractalDrop', 'Leonardo Da Vinci', 'Magellan', 'Wormhole Pillars',
  'Paint Spill', 'True Visionary',
];

// Presets destacados que aparecen como opciones en el selector de patrones.
// `match` es un fragmento distintivo para encontrar el preset real por nombre.
export const MILKDROP_FEATURED = [
  { label: 'Reaction Diffusion', match: 'Reaction Diffusion' },
  { label: 'Jelly Showoff', match: 'jelly showoff parade' },
  { label: 'Witchcraft', match: 'witchcraft reloaded' },
  { label: 'Wormhole', match: 'Wormhole Pillars' },
  { label: 'Mindblob', match: 'mindblob [shiny' },
  { label: 'Fractal Drop', match: 'FractalDrop' },
];

export function createMilkdrop() {
  let app = null;
  let canvas = null;
  let visualizer = null;
  let presets = null;
  let presetKeys = [];
  let presetIndex = 0;
  let lastFeatured = -1; // último preset destacado aplicado desde el estado
  let onResize = null;
  let onKey = null;

  function loadPresetByKey(key, blend = 2.7) {
    if (!visualizer || !key) return;
    visualizer.loadPreset(presets[key], blend);
    const i = presetKeys.indexOf(key);
    if (i >= 0) presetIndex = i;
  }

  function loadPresetIndex(i, blend = 2.7) {
    if (presetKeys.length === 0) return;
    const idx = ((i % presetKeys.length) + presetKeys.length) % presetKeys.length;
    loadPresetByKey(presetKeys[idx], blend);
  }

  // Carga un preset destacado (por su fragmento de nombre).
  function applyFeatured(idx, blend = 2.7) {
    const feat = MILKDROP_FEATURED[idx] || MILKDROP_FEATURED[0];
    const key = presetKeys.find((k) => k.includes(feat.match));
    if (key) loadPresetByKey(key, blend);
  }

  return {
    init(pixiApp, store) {
      app = pixiApp;
      const w = app.screen.width;
      const h = app.screen.height;
      const engine = app.audioEngine;

      const BC = window.butterchurn?.default || window.butterchurn;
      const BP = window.butterchurnPresets?.default || window.butterchurnPresets;
      if (!BC || !BP) {
        console.error('Butterchurn no está cargado (revisá los <script> en index.html).');
        return;
      }
      if (!engine || !engine.getAudioContext()) {
        console.error('Milkdrop necesita el AudioEngine iniciado.');
        return;
      }

      canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '1';
      document.body.appendChild(canvas);
      app.canvas.style.visibility = 'hidden';

      visualizer = BC.createVisualizer(engine.getAudioContext(), canvas, {
        width: w,
        height: h,
        pixelRatio: 1,
        textureRatio: 1,
      });
      visualizer.connectAudio(engine.getMilkdropNode());

      presets = BP.getPresets();
      const allKeys = Object.keys(presets);
      const curated = allKeys.filter((k) => CURATED.some((s) => k.includes(s)));
      presetKeys = curated.length >= 8 ? curated : allKeys;

      lastFeatured = (store && store.getState().milkdropPreset) || 0;
      applyFeatured(lastFeatured, 0);
      visualizer.setRendererSize(w, h);

      onResize = () => {
        if (visualizer) visualizer.setRendererSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      onKey = (e) => {
        if (e.key === 'ArrowRight') loadPresetIndex(presetIndex + 1);
        else if (e.key === 'ArrowLeft') loadPresetIndex(presetIndex - 1);
        else if (e.key === 'r' || e.key === 'R') {
          loadPresetIndex(Math.floor(Math.random() * presetKeys.length));
        }
      };
      window.addEventListener('keydown', onKey);
    },

    update(frame, state) {
      if (!visualizer) return;
      // Cambiar de preset destacado en vivo cuando lo elegís en el selector.
      if (state && state.milkdropPreset !== lastFeatured) {
        lastFeatured = state.milkdropPreset;
        applyFeatured(lastFeatured);
      }
      // Ganancia del audio que recibe Milkdrop (slider de sensibilidad).
      if (state && app.audioEngine) app.audioEngine.setMilkdropGain(state.milkdropGain);
      visualizer.render();
    },

    resize(w, h) {
      if (visualizer) visualizer.setRendererSize(w, h);
    },

    destroy() {
      if (onResize) window.removeEventListener('resize', onResize);
      if (onKey) window.removeEventListener('keydown', onKey);
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      if (app) app.canvas.style.visibility = 'visible';
      visualizer = null;
      canvas = null;
      presets = null;
      presetKeys = [];
      app = null;
    },
  };
}
