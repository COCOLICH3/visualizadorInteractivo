import { PALETTES } from '../color/palettes.js';

// Panel de control local: sliders, botones y atajos de teclado.
// Todo muta el Store. El panel se puede ocultar con la tecla H.
export function createControlPanel(store, presetManager) {
  const el = document.createElement('div');
  el.id = 'panel';
  el.innerHTML = `
    <h3>🎛 Controles</h3>
    <label>Patrón
      <select data-key="pattern">
        <option value="bars">Barras</option>
        <option value="particles">Partículas</option>
      </select>
    </label>
    <label>Paleta
      <select data-key="paletteIndex">
        ${PALETTES.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}
      </select>
    </label>
    <label>Sensibilidad <input type="range" data-key="sensitivity" min="0.2" max="3" step="0.1"></label>
    <label>Suavizado <input type="range" data-key="smoothing" min="0" max="0.95" step="0.05"></label>
    <label>Partículas <input type="range" data-key="particleCount" min="100" max="2000" step="50"></label>
    <label><input type="checkbox" data-key="autoPalette"> Auto-paleta</label>
    <p class="hint">Atajos: [P] patrón · [C] paleta · [Espacio] flash · [F] fullscreen · [H] ocultar</p>
  `;
  document.body.appendChild(el);

  // Inicializar controles desde el estado.
  const state = store.getState();
  el.querySelectorAll('[data-key]').forEach((input) => {
    const key = input.dataset.key;
    if (input.type === 'checkbox') input.checked = state[key];
    else input.value = state[key];

    input.addEventListener('input', () => {
      let value;
      if (input.type === 'checkbox') value = input.checked;
      else if (input.type === 'range' || input.tagName === 'SELECT') value = Number(input.value);
      else value = input.value;
      // pattern es string, no número:
      if (key === 'pattern') value = input.value;
      store.setState({ [key]: value });
    });
  });

  // Atajos de teclado.
  function cyclePattern() {
    const order = ['bars', 'particles'];
    const cur = store.getState().pattern;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    store.setState({ pattern: next });
    el.querySelector('[data-key="pattern"]').value = next;
  }
  function cyclePalette() {
    const cur = store.getState().paletteIndex;
    const next = (cur + 1) % PALETTES.length;
    store.setState({ paletteIndex: next });
    el.querySelector('[data-key="paletteIndex"]').value = next;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') cyclePattern();
    else if (e.key === 'c' || e.key === 'C') cyclePalette();
    else if (e.key === ' ') store.setState({ flash: 1 });
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } else if (e.key === 'h' || e.key === 'H') {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  });

  return { el, cyclePalette };
}
