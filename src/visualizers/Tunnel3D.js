import * as THREE from '../../node_modules/three/build/three.module.js';
import { PALETTES, colorAt } from '../color/palettes.js';

// Túnel 3D: un túnel serpenteante de anillos que viajan hacia la cámara, con
// campo de estrellas de fondo, twist helicoidal, color que fluye con la música
// y un "punch" en cada beat (acelerón + golpe de escala + roll de cámara).
// Usa su propio canvas WebGL (three.js), superpuesto al de PixiJS.
export function createTunnel3D() {
  const RING_COUNT = 60;
  const SPACING = 2;
  const DEPTH = RING_COUNT * SPACING;
  const STAR_COUNT = 500;
  const CAM_Z = 5;

  let renderer = null;
  let scene = null;
  let camera = null;
  let rings = [];
  let stars = null;
  let starPos = null;
  let canvas = null;
  let pixiApp = null;
  let onResize = null;
  let t = 0;
  let travel = 0; // distancia acumulada, para el flujo de color
  let punch = 0;  // impulso por beat, decae solo

  const clearColor = new THREE.Color(0x000000);
  const black = new THREE.Color(0x000000);
  const white = new THREE.Color(0xffffff);
  const tmpColor = new THREE.Color();

  // Curva del túnel: a una profundidad z, cuánto se desplaza en x,y.
  function pathAt(z, time) {
    return {
      x: Math.sin(z * 0.05 + time * 0.3) * 3.5,
      y: Math.cos(z * 0.04 + time * 0.22) * 3.5,
    };
  }

  function resize(w, h) {
    if (!renderer) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return {
    init(app) {
      pixiApp = app;
      const w = app.renderer.width;
      const h = app.renderer.height;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      canvas = renderer.domElement;
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.zIndex = '1'; // por debajo del panel (z-index 5)
      document.body.appendChild(canvas);

      app.canvas.style.visibility = 'hidden';

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.04);
      camera = new THREE.PerspectiveCamera(80, w / h, 0.1, 1000);
      camera.position.z = CAM_Z;

      // Anillos del túnel.
      rings = [];
      for (let i = 0; i < RING_COUNT; i++) {
        const geo = new THREE.TorusGeometry(2.6, 0.12, 8, 24);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = -i * SPACING;
        scene.add(mesh);
        rings.push(mesh);
      }

      // Campo de estrellas de fondo.
      starPos = new Float32Array(STAR_COUNT * 3);
      for (let i = 0; i < STAR_COUNT; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 14;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        starPos[i * 3 + 2] = -Math.random() * DEPTH;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.07 });
      stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      onResize = () => resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', onResize);
    },

    update(frame, state) {
      const palette = PALETTES[state.paletteIndex];
      const bass = frame.bass * state.sensitivity;
      const energy = frame.energy * state.sensitivity;

      if (frame.beat) punch = 1;
      punch *= 0.9;

      const speed = 0.3 + energy * 0.9 + punch * 1.6;
      t += 0.016;
      travel += speed;

      // Anillos: viajan, serpentean, giran en espiral, laten y cambian color.
      for (let i = 0; i < rings.length; i++) {
        const m = rings[i];
        m.position.z += speed;
        if (m.position.z > CAM_Z + 2) m.position.z -= DEPTH;

        const p = pathAt(m.position.z, t);
        m.position.x = p.x;
        m.position.y = p.y;

        m.rotation.z = m.position.z * 0.15 + t * (0.5 + energy);
        m.rotation.x = Math.sin(t * 0.5 + i * 0.3) * 0.15;

        const scale = 1 + bass * 0.7 + punch * 0.4;
        m.scale.set(scale, scale, 1);

        const depth = (CAM_Z - m.position.z) / DEPTH;
        const ct = (Math.abs(depth) + travel * 0.002) % 1;
        tmpColor.set(colorAt(palette, ct));
        m.material.color.copy(tmpColor).multiplyScalar(0.45 + energy * 0.9 + punch * 0.5);
      }

      // Estrellas: viajan hacia la cámara y reciclan al fondo.
      for (let i = 0; i < STAR_COUNT; i++) {
        starPos[i * 3 + 2] += speed;
        if (starPos[i * 3 + 2] > CAM_Z) {
          starPos[i * 3 + 2] -= DEPTH;
          starPos[i * 3] = (Math.random() - 0.5) * 14;
          starPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        }
      }
      stars.geometry.attributes.position.needsUpdate = true;

      // Cámara: sigue la curva del túnel y mira hacia adelante; roll con el beat.
      const here = pathAt(camera.position.z - 6, t);
      camera.position.x += (here.x - camera.position.x) * 0.1;
      camera.position.y += (here.y - camera.position.y) * 0.1;
      const ahead = pathAt(camera.position.z - 25, t);
      camera.lookAt(ahead.x, ahead.y, camera.position.z - 25);
      camera.rotateZ(Math.sin(t * 0.5) * 0.06 + punch * 0.12);

      // Flash: fondo de negro a blanco con el pulso + un toque en cada beat.
      clearColor.copy(black).lerp(white, Math.min(1, state.flash * 0.6 + punch * 0.12));
      renderer.setClearColor(clearColor, 1);

      renderer.render(scene, camera);
    },

    resize,

    destroy() {
      if (onResize) window.removeEventListener('resize', onResize);
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      for (const m of rings) {
        m.geometry.dispose();
        m.material.dispose();
      }
      if (stars) {
        stars.geometry.dispose();
        stars.material.dispose();
      }
      if (renderer) renderer.dispose();
      if (pixiApp) pixiApp.canvas.style.visibility = 'visible';
      rings = [];
      stars = null;
      starPos = null;
      scene = null;
      camera = null;
      renderer = null;
      canvas = null;
    },
  };
}
