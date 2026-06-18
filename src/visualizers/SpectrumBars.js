import { PALETTES, colorAt } from '../color/palettes.js';

// Barras de espectro: agrupa el spectrum en N barras y las dibuja.
export function createSpectrumBars() {
  const BARS = 64;
  let container = null;
  let bars = [];
  let app = null;

  return {
    init(pixiApp) {
      app = pixiApp;
      container = new PIXI.Container();
      app.stage.addChild(container);
      bars = [];
      for (let i = 0; i < BARS; i++) {
        const g = new PIXI.Graphics();
        container.addChild(g);
        bars.push(g);
      }
    },

    update(frame, state) {
      const palette = PALETTES[state.paletteIndex];
      const w = app.renderer.width;
      const h = app.renderer.height;
      const barW = w / BARS;
      const step = Math.floor(frame.spectrum.length / BARS);

      for (let i = 0; i < BARS; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += frame.spectrum[i * step + j];
        const v = Math.min(1, (sum / step / 255) * state.sensitivity);
        const barH = v * h;
        const color = colorAt(palette, i / BARS);

        const g = bars[i];
        g.clear();
        g.rect(i * barW + 1, h - barH, barW - 2, barH);
        g.fill({ color, alpha: 0.9 });
      }
    },

    resize() {},

    destroy() {
      if (container) {
        container.destroy({ children: true });
        container = null;
      }
    },
  };
}
