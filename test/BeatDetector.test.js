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
