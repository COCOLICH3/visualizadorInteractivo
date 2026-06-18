// Spike: captura el audio del sistema (loopback) y dibuja un espectro simple.
// Si esto funciona, el riesgo técnico más grande del proyecto queda despejado.

const startBtn = document.getElementById('start');
const statusEl = document.getElementById('status');
const levelEl = document.getElementById('level');
const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

let analyser = null;
let dataArray = null;
let audioCtx = null;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60; // 60 = alto de la barra superior
}
window.addEventListener('resize', resize);
resize();

startBtn.addEventListener('click', async () => {
  try {
    // El main intercepta este pedido y devuelve el audio del sistema (loopback).
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    // No usamos el video: lo frenamos para no gastar recursos.
    stream.getVideoTracks().forEach((t) => t.stop());

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      statusEl.textContent =
        '⚠ No se capturó audio del sistema. Probá de nuevo o revisá los permisos.';
      return;
    }

    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    // No conectamos a destination a propósito: evitamos eco/duplicado del audio.

    dataArray = new Uint8Array(analyser.frequencyBinCount);

    statusEl.textContent = '🎵 Capturando el audio de la PC...';
    startBtn.style.display = 'none';
    draw();
  } catch (e) {
    statusEl.textContent = 'Error al capturar: ' + e.message;
    console.error(e);
  }
});

const BARS = 64;

function draw() {
  requestAnimationFrame(draw);
  analyser.getByteFrequencyData(dataArray);

  // Rastro suave: en vez de borrar todo, pintamos un negro semitransparente.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const step = Math.floor(dataArray.length / BARS);
  const barWidth = canvas.width / BARS;
  let total = 0;

  for (let i = 0; i < BARS; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += dataArray[i * step + j];
    const v = sum / step / 255; // 0..1
    total += v;

    const h = v * canvas.height;
    const hue = (i / BARS) * 260 + 200; // de azul a rosa
    ctx.fillStyle = `hsl(${hue}, 90%, ${30 + v * 45}%)`;
    ctx.fillRect(i * barWidth + 2, canvas.height - h, barWidth - 4, h);
  }

  const avg = Math.round((total / BARS) * 100);
  levelEl.textContent = 'nivel: ' + avg;
}
