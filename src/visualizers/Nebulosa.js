import { AdvancedBloomFilter } from 'pixi-filters';
import { PALETTES, colorAt } from '../color/palettes.js';

// Nebulosa: visualizador con feedback/trail loop tipo Milkdrop.
// En vez de limpiar el canvas, cada frame se compone el frame anterior
// (levemente escalado, rotado y con alpha reducido) y encima se dibujan los
// elementos nuevos. El resultado se acumula en RenderTextures (ping-pong),
// generando estelas orgánicas.
//
// PASO 1: feedback loop + elementos reactivos básicos (orbes que orbitan y
// laten con el audio). El análisis fino, filtros y ruido vienen en pasos siguientes.
export function createNebulosa() {
  const ORB_COUNT = 5;

  let app = null;
  let rtCurrent = null; // textura que se está mostrando (frame anterior)
  let rtTarget = null;  // textura donde se compone el frame nuevo
  let feedbackSprite = null; // muestra el frame anterior para componerlo
  let outSprite = null;      // lo que se ve en pantalla
  let composite = null;      // [feedbackSprite, scene] -> se renderiza a RT
  let scene = null;          // elementos nuevos del frame
  let orbs = null;           // PIXI.Graphics donde se dibujan los orbes
  let bloom = null;          // glow/bloom sobre los elementos nuevos
  let t = 0;

  function makeTextures(w, h) {
    const res = app.renderer.resolution;
    rtCurrent = PIXI.RenderTexture.create({ width: w, height: h, resolution: res });
    rtTarget = PIXI.RenderTexture.create({ width: w, height: h, resolution: res });
  }

  function positionFeedback(w, h) {
    feedbackSprite.anchor.set(0.5);
    feedbackSprite.position.set(w / 2, h / 2);
  }

  return {
    init(pixiApp) {
      app = pixiApp;
      const w = app.screen.width;
      const h = app.screen.height;

      makeTextures(w, h);

      feedbackSprite = new PIXI.Sprite(rtCurrent);
      positionFeedback(w, h);

      orbs = new PIXI.Graphics();
      scene = new PIXI.Container();
      scene.addChild(orbs);

      // Glow/bloom sobre los elementos nuevos: su brillo se integra al trail.
      bloom = new AdvancedBloomFilter({
        threshold: 0.3,
        bloomScale: 1.2,
        brightness: 1.0,
        blur: 6,
        quality: 4,
      });
      scene.filters = [bloom];

      composite = new PIXI.Container();
      composite.addChild(feedbackSprite);
      composite.addChild(scene);

      outSprite = new PIXI.Sprite(rtTarget);
      app.stage.addChild(outSprite);
    },

    update(frame, state) {
      const w = app.screen.width;
      const h = app.screen.height;
      const palette = PALETTES[state.paletteIndex];
      t += 0.016;

      // 1. Configurar la capa de feedback con el frame anterior.
      feedbackSprite.texture = rtCurrent;
      feedbackSprite.scale.set(state.trailScale);
      feedbackSprite.alpha = state.trailAlpha;
      feedbackSprite.rotation += state.trailRotate;

      // 2. Dibujar los elementos nuevos (orbes reactivos).
      orbs.clear();
      const cx = w / 2;
      const cy = h / 2;
      const audio = (frame.bass + frame.energy) * 0.5 * state.sensitivity;
      // El glow late con el slider y con la energía del audio.
      bloom.bloomScale = 0.6 + state.glow * 1.4 + frame.energy * 0.6;
      const baseR = Math.min(w, h) * 0.18;
      for (let i = 0; i < ORB_COUNT; i++) {
        const ang = t * 0.6 + (i / ORB_COUNT) * Math.PI * 2;
        const orbit = baseR * (1 + audio * 1.2);
        const x = cx + Math.cos(ang) * orbit;
        const y = cy + Math.sin(ang) * orbit;
        const r = 10 + audio * 60 + frame.bass * 30 * state.sensitivity;
        const color = colorAt(palette, i / ORB_COUNT);
        orbs.circle(x, y, r);
        orbs.fill({ color, alpha: 0.85 });
      }

      // 3. Componer feedback + escena nueva en la textura destino.
      app.renderer.render({ container: composite, target: rtTarget, clear: true });

      // 4. Mostrar el resultado.
      outSprite.texture = rtTarget;

      // 5. Ping-pong: el destino pasa a ser el frame anterior del próximo ciclo.
      const tmp = rtCurrent;
      rtCurrent = rtTarget;
      rtTarget = tmp;
    },

    resize(w, h) {
      if (!app) return;
      if (rtCurrent) rtCurrent.destroy(true);
      if (rtTarget) rtTarget.destroy(true);
      makeTextures(w, h);
      positionFeedback(w, h);
      feedbackSprite.texture = rtCurrent;
      outSprite.texture = rtTarget;
    },

    destroy() {
      if (outSprite && outSprite.parent) outSprite.parent.removeChild(outSprite);
      if (rtCurrent) rtCurrent.destroy(true);
      if (rtTarget) rtTarget.destroy(true);
      if (composite) composite.destroy({ children: true });
      app = null;
      rtCurrent = null;
      rtTarget = null;
      feedbackSprite = null;
      outSprite = null;
      composite = null;
      scene = null;
      orbs = null;
    },
  };
}
