// Detección de beat por energía: compara la energía instantánea de graves
// contra el promedio móvil reciente. Si la supera por un factor, es un golpe.
// El debounce evita dobles disparos: ignora beats que llegan demasiado seguidos.
export function createBeatDetector({
  historySize = 43,
  sensitivity = 1.3,
  debounceMs = 150,
  now = () => Date.now(),
} = {}) {
  const history = [];
  let lastBeat = -Infinity;

  function average() {
    if (history.length === 0) return 0;
    let sum = 0;
    for (const v of history) sum += v;
    return sum / history.length;
  }

  function detect(energy) {
    const full = history.length >= historySize;
    const avg = average();
    let isBeat = full && energy > avg * sensitivity;

    if (isBeat) {
      const tNow = now();
      if (tNow - lastBeat < debounceMs) {
        isBeat = false; // demasiado pronto desde el último golpe
      } else {
        lastBeat = tNow;
      }
    }

    history.push(energy);
    if (history.length > historySize) history.shift();

    return isBeat;
  }

  return { detect };
}
