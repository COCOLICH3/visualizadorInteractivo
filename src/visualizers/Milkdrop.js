// Patrón Milkdrop: integra Butterchurn (Milkdrop2 reimplementado en WebGL) como
// visualizador. Usa su propio canvas y su propio análisis de audio: le pasamos
// el AudioContext y el nodo fuente del AudioEngine (colgado en app.audioEngine).
// Trae cientos de presets profesionales que reaccionan a la música.
//
// Controles propios (mientras está activo):
//   →  siguiente preset      ←  preset anterior      R  preset al azar
export function createMilkdrop() {
  const AUTO_CYCLE_FRAMES = 60 * 30; // cambia de preset solo cada ~30s

  let app = null;
  let canvas = null;
  let visualizer = null;
  let presets = null;
  let presetKeys = [];
  let presetIndex = 0;
  let frames = 0;
  let onResize = null;
  let onKey = null;

  function loadPreset(i, blend = 2.7) {
    if (!visualizer || presetKeys.length === 0) return;
    presetIndex = ((i % presetKeys.length) + presetKeys.length) % presetKeys.length;
    visualizer.loadPreset(presets[presetKeys[presetIndex]], blend);
    frames = 0;
  }

  return {
    init(pixiApp) {
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
      visualizer.connectAudio(engine.getSource());

      presets = BP.getPresets();
      presetKeys = Object.keys(presets);
      loadPreset(Math.floor(Math.random() * presetKeys.length), 0);
      visualizer.setRendererSize(w, h);

      onResize = () => {
        if (visualizer) visualizer.setRendererSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      onKey = (e) => {
        if (e.key === 'ArrowRight') loadPreset(presetIndex + 1);
        else if (e.key === 'ArrowLeft') loadPreset(presetIndex - 1);
        else if (e.key === 'r' || e.key === 'R') {
          loadPreset(Math.floor(Math.random() * presetKeys.length));
        }
      };
      window.addEventListener('keydown', onKey);
    },

    update() {
      if (!visualizer) return;
      visualizer.render();
      // Auto-cambio de preset para modo fiesta.
      frames++;
      if (frames >= AUTO_CYCLE_FRAMES) {
        loadPreset(Math.floor(Math.random() * presetKeys.length));
      }
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
