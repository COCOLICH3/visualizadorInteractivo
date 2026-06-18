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
