import { describe, it, expect } from 'vitest';
import { createAsymmetricSmoother } from '../src/audio/AsymmetricSmoother.js';

describe('AsymmetricSmoother', () => {
  it('con attack=1 sube instantáneo', () => {
    const s = createAsymmetricSmoother({ attack: 1, release: 0.1 });
    expect(s.process(1)).toBe(1);
  });

  it('con attack=0.5 sube a la mitad por paso', () => {
    const s = createAsymmetricSmoother({ attack: 0.5, release: 0.1 });
    expect(s.process(1)).toBe(0.5);
    expect(s.process(1)).toBe(0.75);
  });

  it('baja lento según release', () => {
    const s = createAsymmetricSmoother({ attack: 1, release: 0.1 });
    s.process(1); // current = 1
    expect(s.process(0)).toBeCloseTo(0.9, 5); // 1 + (0-1)*0.1
  });

  it('sube más rápido de lo que baja (asimetría)', () => {
    const s = createAsymmetricSmoother({ attack: 0.5, release: 0.1 });
    const up = s.process(1); // sube 0.5 desde 0
    expect(up).toBe(0.5);
    const down = s.process(0); // baja solo 0.05 desde 0.5
    expect(down).toBeCloseTo(0.45, 5);
  });
});
