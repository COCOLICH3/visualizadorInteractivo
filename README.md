# 🎵 Visualizador de Música Interactivo

Un visualizador de música **interactivo** para fiestas. Capturás el audio que suena
en la PC (Spotify, YouTube, lo que sea) y se transforma en visualizaciones a pantalla
completa que laten al ritmo de la música. Pensado para cambiar patrones, colores y
efectos **en vivo** — incluso desde el celular (próximamente).

> Estado actual: **Fase 1 en desarrollo** · El spike de captura de audio ya está validado ✅

---

## ✨ Características

- 🎧 **Captura el audio del sistema** en Windows (loopback) — no necesita configurar cables ni nada raro.
- 📊 **Patrones visuales** que reaccionan en tiempo real:
  - Barras de espectro
  - Partículas reactivas
  - *(Túnel/geometría 3D — Fase 1.5)*
- 🎨 **Paletas de colores** intercambiables en vivo, con selector propio y modo auto-paleta.
- 🎛 **Interactividad total**: sliders de sensibilidad/efectos, atajos de teclado y disparadores manuales (flash, explosiones).
- 💾 **Presets**: guardá combinaciones (patrón + paleta + parámetros) y cambialas con un click.
- 📱 **Control desde el celular** *(Fase 2)*: la PC levanta un servidor local y te conectás por QR.

---

## 🛠 Tecnologías

| Área | Tecnología |
|------|-----------|
| App de escritorio | [Electron](https://www.electronjs.org/) |
| Captura + análisis de audio | Web Audio API (loopback vía Chromium) |
| Motor de dibujo 2D | [PixiJS](https://pixijs.com/) (WebGL) |
| Motor 3D *(Fase 1.5)* | [three.js](https://threejs.org/) |
| Tests | [Vitest](https://vitest.dev/) |

---

## 🚀 Instalación y uso

Requisitos: **Node.js 18+** y **Windows** (la captura de audio loopback usa Chromium).

```bash
# Clonar el repo
git clone https://github.com/COCOLICH3/visualizadorInteractivo.git
cd visualizadorInteractivo

# Instalar dependencias
npm install

# Arrancar la app
npm start
```

Una vez abierta la ventana:

1. Reproducí música en la PC.
2. Hacé click en **▶ Iniciar**.
3. ¡Disfrutá! Cambiá patrones, paletas y efectos en vivo.

### ⌨️ Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `P` | Cambiar de patrón |
| `C` | Cambiar de paleta |
| `Espacio` | Flash / disparo de efecto |
| `F` | Pantalla completa |
| `H` | Ocultar / mostrar el panel de control |

---

## 🧪 Tests

```bash
npm test
```

La lógica testeable (estado, análisis de audio, detección de beat, paletas, presets)
está cubierta con tests; lo visual se valida corriendo la app.

---

## 🗺 Roadmap

- [x] **Fase 0** — Spike: captura del audio del sistema + espectro simple.
- [ ] **Fase 1** — Visualizador local: 2 patrones 2D + interactividad total (paletas, sliders, atajos, presets).
- [ ] **Fase 1.5** — Patrón 3D (túnel/geometría con three.js).
- [ ] **Fase 2** — Control remoto desde el celular (servidor local + QR).

---

## 📐 Arquitectura

El corazón del proyecto es un **estado central** (`Store`) con un bus de eventos:

```
Audio del sistema  →  AudioEngine  →  AudioFrame  →  Visualizador activo  →  Pantalla
  (loopback)          (FFT + beat)   (cada frame)     (lee el Estado)        (PixiJS)
                                                            ↑
                              Estado central  ←──  Controles (panel / celular)
```

Cualquier control (el panel local o, en Fase 2, el celular) muta el mismo estado, y los
visualizadores lo leen en cada cuadro. Sumar un patrón nuevo es agregar un archivo que
cumpla la interfaz `init / update / resize / destroy`.

Los documentos de diseño y los planes de implementación viven en
[`docs/superpowers/`](docs/superpowers/).
