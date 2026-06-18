// Guarda/carga escenas (patrón + paleta + parámetros) en un storage
// inyectable (localStorage en runtime, fake en tests).
const KEY = 'vizmusica.presets';

export function createPresetManager(storage) {
  function readAll() {
    const raw = storage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  }

  function writeAll(obj) {
    storage.setItem(KEY, JSON.stringify(obj));
  }

  return {
    list() {
      return Object.keys(readAll());
    },
    save(name, scene) {
      const all = readAll();
      all[name] = scene;
      writeAll(all);
    },
    load(name) {
      const all = readAll();
      return name in all ? all[name] : null;
    },
  };
}
