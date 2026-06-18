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
