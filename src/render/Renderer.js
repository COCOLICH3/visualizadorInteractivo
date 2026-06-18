// Maneja la PIXI.Application, el loop, y delega al visualizador activo.
// Los visualizadores cumplen: init(app, store), update(frame, state), resize(w,h), destroy().
export function createRenderer(app, store) {
  const visualizers = new Map();
  let active = null;
  let lastFrame = null;

  function register(name, visualizer) {
    visualizers.set(name, visualizer);
  }

  function setActive(name) {
    if (active) active.destroy();
    active = visualizers.get(name);
    active.init(app, store);
    active.resize(app.renderer.width, app.renderer.height);
  }

  function onFrame(frame) {
    lastFrame = frame;
  }

  function start() {
    app.ticker.add(() => {
      if (active && lastFrame) {
        active.update(lastFrame, store.getState());
      }
    });
  }

  function resize(w, h) {
    if (active) active.resize(w, h);
  }

  return { register, setActive, onFrame, start, resize };
}
