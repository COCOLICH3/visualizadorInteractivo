import { PALETTES, colorAt } from '../color/palettes.js';

// Partículas reactivas: en cada beat se inyecta energía y explotan desde el centro.
export function createParticles() {
  let app = null;
  let container = null;
  let particles = [];

  function spawn(count, w, h) {
    particles = [];
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      g.circle(0, 0, 2 + Math.random() * 3);
      g.fill({ color: 0xffffff });
      container.addChild(g);
      particles.push({
        g,
        x: w / 2,
        y: h / 2,
        vx: 0,
        vy: 0,
        life: 0,
      });
    }
  }

  function reset(p, w, h) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    p.x = w / 2;
    p.y = h / 2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 1;
  }

  return {
    init(pixiApp) {
      app = pixiApp;
      container = new PIXI.Container();
      app.stage.addChild(container);
      spawn(600, app.renderer.width, app.renderer.height);
    },

    update(frame, state) {
      const w = app.renderer.width;
      const h = app.renderer.height;
      const palette = PALETTES[state.paletteIndex];
      const push = (frame.bass * state.sensitivity);

      // Ajustar cantidad si cambió el parámetro.
      if (particles.length !== state.particleCount) {
        container.removeChildren();
        spawn(state.particleCount, w, h);
      }

      for (const p of particles) {
        if (p.life <= 0 || (frame.beat && Math.random() < 0.3)) {
          reset(p, w, h);
        }
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx * (1 + push * 4);
        p.y += p.vy * (1 + push * 4);
        p.life -= 0.012;

        p.g.x = p.x;
        p.g.y = p.y;
        p.g.alpha = Math.max(0, p.life);
        p.g.tint = colorAt(palette, p.life);
      }
    },

    resize() {},

    destroy() {
      if (container) {
        container.destroy({ children: true });
        container = null;
        particles = [];
      }
    },
  };
}
