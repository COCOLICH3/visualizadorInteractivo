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
