# Visualizador de Música — Fase 1 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el visualizador local: captura el audio del sistema, lo analiza, y lo dibuja con 2 patrones 2D (barras + partículas) en PixiJS, con interactividad total en vivo (paletas, sliders, atajos, presets).

**Architecture:** Estado central (`Store`) con bus de eventos en el medio. El `AudioEngine` emite un `AudioFrame` por cuadro; el `Renderer` (loop de PixiJS) se lo pasa al visualizador activo, que lee el `Store` para dibujar. El `ControlPanel` y (en Fase 2) el celular mutan el mismo `Store`. La lógica pura (estado, análisis, beat, paletas, presets) va en ES modules testeables con Vitest; el runtime del renderer usa ES modules nativos + PixiJS global.

**Tech Stack:** Electron, Web Audio API, PixiJS (WebGL), Vitest. Sin bundler en runtime (el renderer carga PixiJS por `<script>` y los módulos propios con `type="module"`).

---

## Estructura de archivos

```
visualizadorMusica/
├─ main.js                      # proceso principal Electron (ya existe del spike, se reusa)
├─ index.html                   # shell del renderer (se reescribe)
├─ src/
│  ├─ app.js                    # punto de entrada del renderer: arma todo
│  ├─ state/Store.js            # estado central + bus de eventos
│  ├─ state/defaultState.js     # estado inicial
│  ├─ audio/AudioEngine.js      # captura + emite AudioFrame
│  ├─ audio/analyze.js          # análisis puro: bandas (bass/mid/treble/energy)
│  ├─ audio/BeatDetector.js     # detección de beat
│  ├─ render/Renderer.js        # loop de PixiJS, delega al visualizador activo
│  ├─ visualizers/SpectrumBars.js
│  ├─ visualizers/Particles.js
│  ├─ color/palettes.js         # paletas + interpolación de color
│  ├─ ui/ControlPanel.js        # panel local: sliders, botones, atajos
│  └─ presets/PresetManager.js  # guardar/cargar escenas
└─ test/
   ├─ Store.test.js
   ├─ analyze.test.js
   ├─ BeatDetector.test.js
   ├─ palettes.test.js
   └─ PresetManager.test.js
```

**Contratos clave (usados por varias tareas):**

```js
// AudioFrame — lo que emite el AudioEngine en cada cuadro
// {
//   spectrum: Uint8Array,  // frecuencias crudas 0..255
//   bass: number,          // 0..1
//   mid: number,           // 0..1
//   treble: number,        // 0..1
//   energy: number,        // 0..1 (promedio general)
//   beat: boolean          // true en un golpe
// }

// Visualizer — interfaz que cumple cada patrón
// {
//   init(app, store),        // app = PIXI.Application
//   update(frame, state),    // frame = AudioFrame, state = store.getState()
//   resize(width, height),
//   destroy()
// }
```

---

## Task 1: Tooling y estructura

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `test/smoke.test.js`
- Create: `src/.gitkeep`

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install --save-dev vitest
npm install pixi.js@^8.6.0
```
Expected: se agregan a `package.json` sin errores. (Si el postinstall queda bloqueado por la política de scripts, no afecta a estas: no tienen binarios nativos.)

- [ ] **Step 2: Agregar script de test en `package.json`**

En la sección `"scripts"`, dejar:
```json
"scripts": {
  "start": "electron .",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Crear `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
```

- [ ] **Step 4: Crear `test/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('tooling', () => {
  it('corre Vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Correr los tests**

Run: `npm test`
Expected: PASS — 1 test pasa.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js test/smoke.test.js
git commit -m "chore: setup vitest y pixi.js"
```

---

## Task 2: Store (estado central + bus de eventos)

**Files:**
- Create: `src/state/Store.js`
- Test: `test/Store.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/state/Store.js';

describe('Store', () => {
  it('devuelve el estado inicial', () => {
    const store = createStore({ a: 1, b: 2 });
    expect(store.getState()).toEqual({ a: 1, b: 2 });
  });

  it('setState mergea y devuelve el nuevo estado', () => {
    const store = createStore({ a: 1, b: 2 });
    store.setState({ b: 9 });
    expect(store.getState()).toEqual({ a: 1, b: 9 });
  });

  it('notifica a los suscriptores con las claves cambiadas', () => {
    const store = createStore({ a: 1 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ a: 5 });
    expect(fn).toHaveBeenCalledWith({ a: 5 }, ['a']);
  });

  it('no notifica si el valor no cambió', () => {
    const store = createStore({ a: 1 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ a: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('subscribe devuelve una función para desuscribir', () => {
    const store = createStore({ a: 1 });
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    unsub();
    store.setState({ a: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run test/Store.test.js`
Expected: FAIL — "createStore is not a function" / módulo no encontrado.

- [ ] **Step 3: Implementar `src/state/Store.js`**

```js
// Estado central + bus de eventos. No sabe nada de audio ni de dibujo.
export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    const changed = [];
    for (const key of Object.keys(patch)) {
      if (state[key] !== patch[key]) {
        changed.push(key);
      }
    }
    if (changed.length === 0) return;
    state = { ...state, ...patch };
    for (const fn of listeners) fn(state, changed);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, subscribe };
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run test/Store.test.js`
Expected: PASS — 5 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/state/Store.js test/Store.test.js
git commit -m "feat: store con estado central y bus de eventos"
```

---

## Task 3: Paletas + interpolación de color

**Files:**
- Create: `src/color/palettes.js`
- Test: `test/palettes.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { describe, it, expect } from 'vitest';
import { PALETTES, colorAt } from '../src/color/palettes.js';

describe('palettes', () => {
  it('expone varias paletas con nombre y colores', () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(4);
    for (const p of PALETTES) {
      expect(typeof p.name).toBe('string');
      expect(p.colors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('colorAt en t=0 devuelve el primer color', () => {
    const pal = { name: 'x', colors: [0xff0000, 0x0000ff] };
    expect(colorAt(pal, 0)).toBe(0xff0000);
  });

  it('colorAt en t=1 devuelve el último color', () => {
    const pal = { name: 'x', colors: [0xff0000, 0x0000ff] };
    expect(colorAt(pal, 1)).toBe(0x0000ff);
  });

  it('colorAt en t=0.5 interpola (rojo→azul = morado)', () => {
    const pal = { name: 'x', colors: [0xff0000, 0x0000ff] };
    // R=128, G=0, B=128
    expect(colorAt(pal, 0.5)).toBe(0x800080);
  });

  it('clampea t fuera de rango', () => {
    const pal = { name: 'x', colors: [0xff0000, 0x0000ff] };
    expect(colorAt(pal, -1)).toBe(0xff0000);
    expect(colorAt(pal, 2)).toBe(0x0000ff);
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run test/palettes.test.js`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `src/color/palettes.js`**

```js
// Paletas predefinidas + interpolación lineal entre stops.
// Los colores son números 0xRRGGBB (formato que usa PixiJS).
export const PALETTES = [
  { name: 'Neón',   colors: [0x00f0ff, 0xff00e6, 0xfffb00] },
  { name: 'Fuego',  colors: [0xfff200, 0xff7b00, 0xd00000] },
  { name: 'Océano', colors: [0x012a4a, 0x2a9d8f, 0x90e0ef] },
  { name: 'Retro',  colors: [0xf72585, 0x7209b7, 0x4cc9f0] },
  { name: 'Mono',   colors: [0x222222, 0xffffff] },
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// t en 0..1 a lo largo de toda la paleta.
export function colorAt(palette, t) {
  const colors = palette.colors;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0) return colors[0];
  if (clamped >= 1) return colors[colors.length - 1];

  const scaled = clamped * (colors.length - 1);
  const i = Math.floor(scaled);
  const frac = scaled - i;
  const c0 = colors[i];
  const c1 = colors[i + 1];

  const r = lerp((c0 >> 16) & 0xff, (c1 >> 16) & 0xff, frac);
  const g = lerp((c0 >> 8) & 0xff, (c1 >> 8) & 0xff, frac);
  const b = lerp(c0 & 0xff, c1 & 0xff, frac);
  return (r << 16) | (g << 8) | b;
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run test/palettes.test.js`
Expected: PASS — 5 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/color/palettes.js test/palettes.test.js
git commit -m "feat: paletas de color con interpolacion"
```

---

## Task 4: Análisis de bandas (puro)

**Files:**
- Create: `src/audio/analyze.js`
- Test: `test/analyze.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { describe, it, expect } from 'vitest';
import { analyzeBands } from '../src/audio/analyze.js';

// Helper: arma un spectrum con energía concentrada en ciertos bins.
function spectrumWith(length, activeBins, value = 255) {
  const arr = new Uint8Array(length);
  for (const i of activeBins) arr[i] = value;
  return arr;
}

describe('analyzeBands', () => {
  const sampleRate = 48000;
  const fftSize = 2048; // binHz = 48000/2048 ≈ 23.4 Hz

  it('detecta energía en graves (bin bajo)', () => {
    // 100 Hz cae en el bin 4 (4*23.4 ≈ 94 Hz)
    const spectrum = spectrumWith(1024, [4]);
    const r = analyzeBands(spectrum, sampleRate, fftSize);
    expect(r.bass).toBeGreaterThan(0);
    expect(r.treble).toBe(0);
  });

  it('detecta energía en agudos (bin alto)', () => {
    // 8000 Hz cae en el bin ~341
    const spectrum = spectrumWith(1024, [341]);
    const r = analyzeBands(spectrum, sampleRate, fftSize);
    expect(r.treble).toBeGreaterThan(0);
    expect(r.bass).toBe(0);
  });

  it('todas las bandas en 0..1', () => {
    const spectrum = spectrumWith(1024, [4, 50, 341]);
    const r = analyzeBands(spectrum, sampleRate, fftSize);
    for (const k of ['bass', 'mid', 'treble', 'energy']) {
      expect(r[k]).toBeGreaterThanOrEqual(0);
      expect(r[k]).toBeLessThanOrEqual(1);
    }
  });

  it('silencio total da 0 en todo', () => {
    const spectrum = new Uint8Array(1024);
    const r = analyzeBands(spectrum, sampleRate, fftSize);
    expect(r).toEqual({ bass: 0, mid: 0, treble: 0, energy: 0 });
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run test/analyze.test.js`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `src/audio/analyze.js`**

```js
// Análisis puro del espectro: promedia la energía en 3 bandas.
// spectrum: Uint8Array (0..255). Devuelve valores normalizados 0..1.
const BANDS = {
  bass: [20, 250],
  mid: [250, 2000],
  treble: [2000, 16000],
};

function bandAverage(spectrum, binHz, loHz, hiHz) {
  const loBin = Math.max(0, Math.floor(loHz / binHz));
  const hiBin = Math.min(spectrum.length - 1, Math.ceil(hiHz / binHz));
  let sum = 0;
  let count = 0;
  for (let i = loBin; i <= hiBin; i++) {
    sum += spectrum[i];
    count++;
  }
  if (count === 0) return 0;
  return sum / count / 255;
}

export function analyzeBands(spectrum, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const bass = bandAverage(spectrum, binHz, ...BANDS.bass);
  const mid = bandAverage(spectrum, binHz, ...BANDS.mid);
  const treble = bandAverage(spectrum, binHz, ...BANDS.treble);

  let total = 0;
  for (let i = 0; i < spectrum.length; i++) total += spectrum[i];
  const energy = total / spectrum.length / 255;

  return { bass, mid, treble, energy };
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run test/analyze.test.js`
Expected: PASS — 4 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/audio/analyze.js test/analyze.test.js
git commit -m "feat: analisis de bandas de audio"
```

---

## Task 5: BeatDetector

**Files:**
- Create: `src/audio/BeatDetector.js`
- Test: `test/BeatDetector.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { describe, it, expect } from 'vitest';
import { createBeatDetector } from '../src/audio/BeatDetector.js';

describe('BeatDetector', () => {
  it('no detecta beat mientras llena el historial con valores bajos', () => {
    const d = createBeatDetector({ historySize: 10, sensitivity: 1.3 });
    let beats = 0;
    for (let i = 0; i < 10; i++) if (d.detect(0.1)) beats++;
    expect(beats).toBe(0);
  });

  it('detecta beat cuando la energía supera el promedio * sensibilidad', () => {
    const d = createBeatDetector({ historySize: 10, sensitivity: 1.3 });
    for (let i = 0; i < 10; i++) d.detect(0.1); // promedio ≈ 0.1
    expect(d.detect(0.5)).toBe(true); // 0.5 > 0.1*1.3
  });

  it('no detecta beat con energía apenas por encima del promedio', () => {
    const d = createBeatDetector({ historySize: 10, sensitivity: 1.3 });
    for (let i = 0; i < 10; i++) d.detect(0.1);
    expect(d.detect(0.11)).toBe(false); // 0.11 < 0.1*1.3
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run test/BeatDetector.test.js`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `src/audio/BeatDetector.js`**

```js
// Detección de beat por energía: compara la energía instantánea de graves
// contra el promedio reciente. Si la supera por un factor, es un golpe.
export function createBeatDetector({ historySize = 43, sensitivity = 1.3 } = {}) {
  const history = [];

  function average() {
    if (history.length === 0) return 0;
    let sum = 0;
    for (const v of history) sum += v;
    return sum / history.length;
  }

  function detect(energy) {
    const full = history.length >= historySize;
    const avg = average();
    const isBeat = full && energy > avg * sensitivity;

    history.push(energy);
    if (history.length > historySize) history.shift();

    return isBeat;
  }

  return { detect };
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run test/BeatDetector.test.js`
Expected: PASS — 3 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/audio/BeatDetector.js test/BeatDetector.test.js
git commit -m "feat: detector de beat por energia"
```

---

## Task 6: PresetManager

**Files:**
- Create: `src/presets/PresetManager.js`
- Test: `test/PresetManager.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { describe, it, expect } from 'vitest';
import { createPresetManager } from '../src/presets/PresetManager.js';

// Storage falso con la misma forma que localStorage.
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

describe('PresetManager', () => {
  it('arranca sin presets', () => {
    const pm = createPresetManager(fakeStorage());
    expect(pm.list()).toEqual([]);
  });

  it('guarda y lista un preset', () => {
    const pm = createPresetManager(fakeStorage());
    pm.save('fiesta', { pattern: 'bars', palette: 'Neón' });
    expect(pm.list()).toEqual(['fiesta']);
  });

  it('carga un preset guardado', () => {
    const pm = createPresetManager(fakeStorage());
    pm.save('fiesta', { pattern: 'bars', palette: 'Neón' });
    expect(pm.load('fiesta')).toEqual({ pattern: 'bars', palette: 'Neón' });
  });

  it('persiste entre instancias con el mismo storage', () => {
    const storage = fakeStorage();
    createPresetManager(storage).save('a', { x: 1 });
    const pm2 = createPresetManager(storage);
    expect(pm2.load('a')).toEqual({ x: 1 });
  });

  it('load de un nombre inexistente devuelve null', () => {
    const pm = createPresetManager(fakeStorage());
    expect(pm.load('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run test/PresetManager.test.js`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `src/presets/PresetManager.js`**

```js
// Guarda/carga escenas (patrón + paleta + parámetros) en un storage
// inyectable (localStorage en runtime, fake en tests).
const KEY = 'vizmusica.presets';

export function createPresetManager(storage) {
  function readAll() {
    const raw = storage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  }

  function writeAll(obj) {
    storage.setItem(KEY, JSON.stringify(obj));
  }

  return {
    list() {
      return Object.keys(readAll());
    },
    save(name, scene) {
      const all = readAll();
      all[name] = scene;
      writeAll(all);
    },
    load(name) {
      const all = readAll();
      return name in all ? all[name] : null;
    },
  };
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run test/PresetManager.test.js`
Expected: PASS — 5 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/presets/PresetManager.js test/PresetManager.test.js
git commit -m "feat: preset manager con storage inyectable"
```

---

## Task 7: Estado inicial

**Files:**
- Create: `src/state/defaultState.js`

- [ ] **Step 1: Crear `src/state/defaultState.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/state/defaultState.js
git commit -m "feat: estado inicial de la app"
```

---

## Task 8: AudioEngine (captura + emisión de frames)

No es TDD: envuelve APIs del navegador (getDisplayMedia, AudioContext). Se valida corriendo la app. La lógica testeable (análisis, beat) ya está cubierta en Tasks 4 y 5.

**Files:**
- Create: `src/audio/AudioEngine.js`

- [ ] **Step 1: Crear `src/audio/AudioEngine.js`**

```js
import { analyzeBands } from './analyze.js';
import { createBeatDetector } from './BeatDetector.js';

// Captura el audio del sistema (loopback) y, en cada frame, emite un AudioFrame.
// Uso:
//   const engine = createAudioEngine();
//   await engine.start();
//   engine.onFrame(frame => { ... });
//   engine.tick(); // llamar una vez por cuadro de render
export function createAudioEngine() {
  let analyser = null;
  let spectrum = null;
  let audioCtx = null;
  let sampleRate = 48000;
  const beatDetector = createBeatDetector();
  const listeners = new Set();

  async function start(smoothing = 0.8) {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    stream.getVideoTracks().forEach((t) => t.stop());

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error('No se capturó audio del sistema.');
    }

    audioCtx = new AudioContext();
    sampleRate = audioCtx.sampleRate;
    const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = smoothing;
    source.connect(analyser);
    spectrum = new Uint8Array(analyser.frequencyBinCount);
  }

  function setSmoothing(value) {
    if (analyser) analyser.smoothingTimeConstant = value;
  }

  function onFrame(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function tick() {
    if (!analyser) return;
    analyser.getByteFrequencyData(spectrum);
    const bands = analyzeBands(spectrum, sampleRate, analyser.fftSize);
    const beat = beatDetector.detect(bands.bass);
    const frame = { spectrum, ...bands, beat };
    for (const fn of listeners) fn(frame);
  }

  return { start, setSmoothing, onFrame, tick };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/audio/AudioEngine.js
git commit -m "feat: audio engine con captura loopback y emision de frames"
```

---

## Task 9: Renderer (loop de PixiJS + visualizador activo)

**Files:**
- Create: `src/render/Renderer.js`

- [ ] **Step 1: Crear `src/render/Renderer.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/render/Renderer.js
git commit -m "feat: renderer con loop y registro de visualizadores"
```

---

## Task 10: Visualizador SpectrumBars

**Files:**
- Create: `src/visualizers/SpectrumBars.js`

Se valida corriendo la app (Task 13). Usa la global `PIXI` (cargada por `<script>` en index.html) y `colorAt` de palettes.

- [ ] **Step 1: Crear `src/visualizers/SpectrumBars.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/visualizers/SpectrumBars.js
git commit -m "feat: visualizador de barras de espectro"
```

---

## Task 11: Visualizador Particles

**Files:**
- Create: `src/visualizers/Particles.js`

- [ ] **Step 1: Crear `src/visualizers/Particles.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/visualizers/Particles.js
git commit -m "feat: visualizador de particulas reactivas"
```

---

## Task 12: ControlPanel (interactividad: sliders, atajos, auto-paleta)

**Files:**
- Create: `src/ui/ControlPanel.js`

Se valida corriendo la app. Lee/muta el `Store`; los visualizadores reaccionan al próximo frame.

- [ ] **Step 1: Crear `src/ui/ControlPanel.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/ControlPanel.js
git commit -m "feat: panel de control con sliders y atajos"
```

---

## Task 13: Integración (index.html + app.js)

**Files:**
- Modify: `index.html` (reescribir)
- Create: `src/app.js`

- [ ] **Step 1: Reescribir `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Visualizador de Música</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #000; color: #fff; overflow: hidden;
           font-family: system-ui, "Segoe UI", sans-serif; }
    #start { position: fixed; inset: 0; display: flex; align-items: center;
             justify-content: center; flex-direction: column; gap: 16px;
             background: #000; z-index: 10; }
    #start button { padding: 14px 28px; font-size: 18px; border: none;
             border-radius: 10px; background: #6c5ce7; color: #fff;
             font-weight: 600; cursor: pointer; }
    #panel { position: fixed; top: 12px; left: 12px; z-index: 5;
             background: rgba(20,20,28,0.82); padding: 14px 16px;
             border-radius: 12px; width: 240px; backdrop-filter: blur(6px); }
    #panel h3 { margin: 0 0 10px; font-size: 15px; }
    #panel label { display: block; font-size: 13px; margin: 8px 0; }
    #panel select, #panel input[type=range] { width: 100%; }
    #panel .hint { font-size: 11px; opacity: 0.6; margin: 10px 0 0; line-height: 1.5; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="start">
    <h1>🎵 Visualizador</h1>
    <p>Reproducí música en la PC y empezá.</p>
    <button id="start-btn">▶ Iniciar</button>
  </div>
  <script src="node_modules/pixi.js/dist/pixi.min.js"></script>
  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `src/app.js`**

```js
import { createStore } from './state/Store.js';
import { defaultState } from './state/defaultState.js';
import { createAudioEngine } from './audio/AudioEngine.js';
import { createRenderer } from './render/Renderer.js';
import { createSpectrumBars } from './visualizers/SpectrumBars.js';
import { createParticles } from './visualizers/Particles.js';
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

  const renderer = createRenderer(app, store);
  renderer.register('bars', createSpectrumBars());
  renderer.register('particles', createParticles());
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
```

- [ ] **Step 3: Verificación manual — correr la app**

Run: `npm start`
Reproducí música en la PC, hacé click en "Iniciar".
Expected (mirar a ojo):
- Aparece el panel arriba a la izquierda.
- Las barras se mueven con la música.
- Cambiar el select "Patrón" a Partículas → aparecen partículas que explotan con los graves.
- Cambiar "Paleta" → cambian los colores en vivo.
- Mover "Sensibilidad" → cambia la intensidad de la reacción.
- Tecla [C] cicla paletas; [P] cicla patrones; [F] pantalla completa; [H] oculta el panel.
- Tildar "Auto-paleta" → la paleta cambia sola cada ~5s.

- [ ] **Step 4: Commit**

```bash
git add index.html src/app.js
git commit -m "feat: integracion completa del visualizador fase 1"
```

---

## Task 14: Flash (disparador manual) en los visualizadores

**Files:**
- Modify: `src/app.js` (decaimiento del flash)
- Modify: `src/visualizers/SpectrumBars.js` (aplicar flash)
- Modify: `src/visualizers/Particles.js` (aplicar flash)

- [ ] **Step 1: Decaer el flash en el loop de `src/app.js`**

Dentro de `loop()`, después de leer `state`, agregar:
```js
    if (state.flash > 0) {
      store.setState({ flash: Math.max(0, state.flash - 0.05) });
    }
```

- [ ] **Step 2: Aplicar el flash en `SpectrumBars.update` (un overlay blanco)**

Al final de `update(frame, state)`, antes de cerrar la función, agregar:
```js
      if (!this._flash) {
        this._flash = new PIXI.Graphics();
        app.stage.addChild(this._flash);
      }
      this._flash.clear();
      if (state.flash > 0) {
        this._flash.rect(0, 0, app.renderer.width, app.renderer.height);
        this._flash.fill({ color: 0xffffff, alpha: state.flash * 0.6 });
      }
```
Nota: como `update` usa `this`, convertir el método a función normal ya lo es (objeto literal con métodos → `this` apunta al visualizador). Verificar que `init`/`update`/`destroy` se llamen como métodos del objeto (lo son, vía `active.update(...)`).

- [ ] **Step 3: Aplicar el flash en `Particles.update`**

Mismo bloque que el Step 2, al final de `update(frame, state)` de `Particles.js`.

- [ ] **Step 4: Verificación manual**

Run: `npm start` → iniciar → apretar [Espacio].
Expected: un destello blanco que aparece y se desvanece suave, en ambos patrones.

- [ ] **Step 5: Commit**

```bash
git add src/app.js src/visualizers/SpectrumBars.js src/visualizers/Particles.js
git commit -m "feat: disparador de flash con barra espaciadora"
```

---

## Task 15: Verificación final de Fase 1

- [ ] **Step 1: Correr toda la batería de tests**

Run: `npm test`
Expected: PASS — todos los tests (Store, palettes, analyze, BeatDetector, PresetManager, smoke).

- [ ] **Step 2: Checklist manual con la app corriendo**

Run: `npm start`. Verificar a ojo, con música sonando:
- [ ] Barras se mueven con la música.
- [ ] Partículas explotan con los graves/beats.
- [ ] Cambio de paleta en vivo (select, tecla C, y auto-paleta).
- [ ] Sliders de sensibilidad / suavizado / partículas tienen efecto.
- [ ] Flash con [Espacio].
- [ ] Fullscreen con [F]; ocultar panel con [H].

- [ ] **Step 3: Commit final (si hubo ajustes)**

```bash
git add -A
git commit -m "chore: verificacion final fase 1"
```

---

## Notas para Fase 1.5 y Fase 2 (fuera de alcance de este plan)

- **Fase 1.5:** `src/visualizers/Tunnel3D.js` con three.js, registrado en el `Renderer` igual que los otros. Requiere cargar three.js (otro `<script>` o módulo) y crear su propio canvas/escena 3D.
- **Fase 2:** `ControlServer` (HTTP+WebSocket en `main.js`), `RemoteBridge` (sincroniza el Store con los celulares vía IPC), y overlay de QR. El control del celular muta el mismo `Store` — por eso toda la interactividad ya pasa por él.
