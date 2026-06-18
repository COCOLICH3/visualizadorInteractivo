import { describe, it, expect } from 'vitest';
import { createPresetManager } from '../src/presets/PresetManager.js';

// Storage falso con la misma forma que localStorage.
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

describe('PresetManager', () => {
  it('arranca sin presets', () => {
    const pm = createPresetManager(fakeStorage());
    expect(pm.list()).toEqual([]);
  });

  it('guarda y lista un preset', () => {
    const pm = createPresetManager(fakeStorage());
    pm.save('fiesta', { pattern: 'bars', palette: 'Neón' });
    expect(pm.list()).toEqual(['fiesta']);
  });

  it('carga un preset guardado', () => {
    const pm = createPresetManager(fakeStorage());
    pm.save('fiesta', { pattern: 'bars', palette: 'Neón' });
    expect(pm.load('fiesta')).toEqual({ pattern: 'bars', palette: 'Neón' });
  });

  it('persiste entre instancias con el mismo storage', () => {
    const storage = fakeStorage();
    createPresetManager(storage).save('a', { x: 1 });
    const pm2 = createPresetManager(storage);
    expect(pm2.load('a')).toEqual({ x: 1 });
  });

  it('load de un nombre inexistente devuelve null', () => {
    const pm = createPresetManager(fakeStorage());
    expect(pm.load('nope')).toBeNull();
  });
});
