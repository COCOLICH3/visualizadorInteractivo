import * as PIXI from 'pixi.js';
// PixiJS v8 es ESM: lo importamos como módulo y lo exponemos como global
// para que los visualizadores puedan usar `PIXI.Container`, `PIXI.Graphics`, etc.
window.PIXI = PIXI;

import { createStore } from './state/Store.js';
import { defaultState } from './state/defaultState.js';
import { createAudioEngine } from './audio/AudioEngine.js';
import { createRenderer } from './render/Renderer.js';
import { createSpectrumBars } from './visualizers/SpectrumBars.js';
import { createParticles } from './visualizers/Particles.js';
import { createTunnel3D } from './visualizers/Tunnel3D.js';
import { createNebulosa } from './visualizers/Nebulosa.js';
import { createMilkdrop } from './visualizers/Milkdrop.js';
import { createControlPanel } from './ui/ControlPanel.js';
import { createPresetManager } from './presets/PresetManager.js';
import { PALETTES } from './color/palettes.js';

const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', async () => {
  const store = createStore(defaultState);
  const engine = createAudioEngine();

  try {
    await engine.start(store.getState().smoothing);
  } catch (e) {
    document.getElementById('start').innerHTML =
      `<p style="color:#ff6b6b">No se pudo capturar el audio: ${e.message}</p>`;
    return;
  }

  document.getElementById('start').style.display = 'none';

  // PixiJS v8: init asíncrono.
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, background: 0x000000, antialias: true });
  document.body.appendChild(app.canvas);

  // Disponible para visualizadores que hacen su propio análisis (Milkdrop).
  app.audioEngine = engine;

  const renderer = createRenderer(app, store);
  renderer.register('bars', createSpectrumBars());
  renderer.register('particles', createParticles());
  renderer.register('tunnel', createTunnel3D());
  renderer.register('nebulosa', createNebulosa());
  renderer.register('milkdrop', createMilkdrop());
  renderer.setActive(store.getState().pattern);
  renderer.start();

  engine.onFrame((frame) => renderer.onFrame(frame));

  // Cambiar de patrón / suavizado / auto-paleta según el estado.
  let autoTimer = 0;
  store.subscribe((state, changed) => {
    if (changed.includes('pattern')) renderer.setActive(state.pattern);
    if (changed.includes('smoothing')) engine.setSmoothing(state.smoothing);
  });

  const panel = createControlPanel(store, createPresetManager(window.localStorage));

  // Loop propio para el AudioEngine + auto-paleta (independiente del ticker de Pixi).
  function loop() {
    engine.tick();
    const state = store.getState();
    if (state.flash > 0) {
      store.setState({ flash: Math.max(0, state.flash - 0.05) });
    }
    if (state.autoPalette && state.autoPaletteMode === 'time') {
      autoTimer++;
      if (autoTimer > 300) { // ~5s a 60fps
        autoTimer = 0;
        store.setState({ paletteIndex: (state.paletteIndex + 1) % PALETTES.length });
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
});
