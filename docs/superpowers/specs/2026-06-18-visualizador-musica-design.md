# Visualizador de Música Interactivo — Diseño

**Fecha:** 2026-06-18
**Estado:** Diseño aprobado · Spike de audio validado ✅

## 1. Objetivo

Una app de escritorio para Windows que captura **todo el audio que suena en la PC**
(Spotify, YouTube, lo que sea), lo analiza en tiempo real y lo transforma en
visualizaciones a pantalla completa que laten con la música. Pensada para usarse
en fiestas: vistosa, interactiva y, eventualmente, controlable desde el celular.

## 2. Decisiones tomadas

| Tema | Decisión | Motivo |
|------|----------|--------|
| Plataforma | App de escritorio **Electron** (Windows) | Captura el audio del sistema sin fricción |
| Captura de audio | **Loopback del sistema** vía Chromium (`getDisplayMedia` + `setDisplayMediaRequestHandler` con `audio: 'loopback'`) | Capta cualquier fuente que suene en la PC |
| Análisis | **Web Audio API** (`AnalyserNode`, FFT) + detección de beat por energía de graves | Estándar, en tiempo real, sin dependencias pesadas |
| Motor 2D | **PixiJS / WebGL** | GPU, 60fps, miles de partículas y efectos (glow/blur) |
| Motor 3D | **three.js** | Para el patrón 3D (túnel/geometría) |
| Patrones iniciales | Barras de espectro · Partículas reactivas *(el patrón 3D pasa a Fase 1.5)* | Mezcla de preciso y energético; el 3D suma después |
| Control | **Fase 1:** panel local (mouse + atajos). **Fase 2:** celular | Validar primero lo visual, después el remoto |
| Arquitectura | **Estado central + bus de eventos** | Permite enchufar el control del celular sin reescribir |
| Tests | **Vitest** (lógica) | Visual se valida a ojo |

## 3. Validación del spike (hecha)

Se construyó un spike mínimo (`main.js`, `index.html`, `renderer.js`, `package.json`)
que captura el audio del sistema vía loopback y dibuja un espectro simple en Canvas 2D.
**Resultado: funciona** — las barras responden a la música en tiempo real. Esto despeja
el riesgo técnico más grande (la captura de audio en Windows/Electron).

> El código del spike se reaprovecha como base; la versión final usa PixiJS en lugar
> de Canvas 2D y separa las responsabilidades según la arquitectura de abajo.

## 4. Flujo de datos

```
Audio del sistema  →  AudioEngine  →  AudioFrame  →  Visualizador activo  →  Pantalla
  (loopback)          (FFT + beat)   (cada frame)     (lee el Estado)        (Pixi/three)
                                                            ↑
                              Estado central  ←──  Controles (panel local / celular)
```

- **AudioEngine** emite un `AudioFrame` por cuadro:
  `{ espectro: number[], graves, medios, agudos, energia, beat: boolean }`.
- **Estado central (Store)** guarda: patrón activo, paleta de colores, sensibilidad,
  parámetros por patrón. Emite eventos cuando algo cambia.
- **Visualizadores** reciben el `AudioFrame` y leen el Estado para dibujar.

## 5. Componentes (una responsabilidad cada uno)

| Componente | Responsabilidad | Depende de |
|-----------|-----------------|-----------|
| `AudioEngine` | Captura + análisis (FFT, beat). Emite `AudioFrame`. | Web Audio API |
| `Store` | Estado + bus de eventos. | — |
| `Renderer` | Loop de render; delega al visualizador activo. | PixiJS / three.js |
| `visualizers/SpectrumBars` | Patrón barras de espectro (2D). | PixiJS, Store |
| `visualizers/Particles` | Patrón partículas reactivas (2D). | PixiJS, Store |
| `visualizers/Tunnel3D` | Patrón 3D (túnel/geometría que late y gira). | three.js, Store |
| `ControlPanel` | UI local: sliders, botones, atajos de teclado. | Store |
| `PresetManager` | Guarda/carga escenas (patrón + paleta + parámetros). | Store, disco |

**Interfaz común de un visualizador:** `init(canvas, store)` · `update(audioFrame, state)` · `destroy()`.
Sumar un patrón nuevo = agregar un archivo que cumpla esta interfaz, sin tocar el resto.

**Fase 2 (control remoto):**

| Componente | Responsabilidad |
|-----------|-----------------|
| `ControlServer` | Servidor HTTP + WebSocket local; sirve la página de control móvil. |
| `RemoteBridge` | Sincroniza el Store con los celulares (estado completo al conectar, diffs después). |
| `QR overlay` | Muestra un QR con la URL `http://IP-local:puerto` para conectarse fácil. |

## 6. Manejo de errores

- **Captura falla / sin permiso** → mensaje claro + fallback a micrófono.
- **Silencio** → animación "en reposo" suave (que no quede pantalla negra).
- **Fase 2 — firewall bloquea el puerto** → mostrar IP/puerto e instrucciones para permitirlo una vez.
- **Fase 2 — cel en otra red** → el QR no conecta; sugerir misma WiFi o hotspot de la PC.

## 7. Interactividad y personalización (MVP)

La interactividad es el corazón del proyecto: todo lo importante se cambia **en vivo**,
sin frenar la música. Todo esto modifica el Estado central, así que en la Fase 2 el
celular controla exactamente lo mismo.

**Colores / paletas (en vivo):**
- Varias **paletas predefinidas** (neón, retro, fuego, océano, b/n, etc.) que se ciclan con un click o tecla.
- **Selector de color propio** para armar la paleta a mano.
- **Modo auto-paleta:** la paleta cambia sola — opciones: rotación cada N segundos, o cambio en cada "drop"/beat fuerte.

**Parámetros en vivo (sliders + atajos):**
- Sensibilidad al audio, suavizado, velocidad, intensidad de efectos (glow/blur).
- Parámetros propios de cada patrón (ej. cantidad de partículas, ancho de barras).

**Disparadores manuales:**
- Tecla/botón para efectos puntuales (ej. *flash*, explosión de partículas).
- Cambiar de patrón con una tecla.
- Toggle de pantalla completa.

**Presets / escenas:**
- Combinaciones guardables (patrón + paleta + parámetros) que se cambian con un click o tecla.

## 8. Testing

Tests de lógica con **Vitest**:
- `AudioEngine`: análisis con audio sintético; detección de beat.
- `Store`: mutaciones y emisión de eventos del bus.
- `PresetManager`: guardar/cargar escenas.
- Visualizadores: lógica de parámetros (lo visual se valida a ojo).

## 9. Fases de implementación

- **Fase 0 — Spike de audio** ✅ *(hecho)*: captura loopback + espectro simple.
- **Fase 1 — Visualizador local:** arquitectura (AudioEngine, Store, Renderer),
  los **2 patrones 2D** (barras + partículas) en PixiJS, panel local con toda la
  interactividad (paletas en vivo, sliders, atajos, disparadores), presets y fullscreen.
- **Fase 1.5 — Patrón 3D:** `Tunnel3D` en three.js, enchufado a la misma arquitectura.
- **Fase 2 — Control remoto:** ControlServer + RemoteBridge + QR; página de control móvil.

## 10. Estructura de carpetas propuesta

```
visualizadorMusica/
├─ main.js                 # proceso principal Electron (ventana, loopback, Fase 2: server)
├─ index.html
├─ src/
│  ├─ audio/AudioEngine.js
│  ├─ state/Store.js
│  ├─ render/Renderer.js
│  ├─ visualizers/
│  │  ├─ SpectrumBars.js
│  │  ├─ Particles.js
│  │  └─ Tunnel3D.js
│  ├─ ui/ControlPanel.js
│  └─ presets/PresetManager.js
├─ remote/                 # Fase 2: página de control móvil
└─ test/                   # Vitest
```
