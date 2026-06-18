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
