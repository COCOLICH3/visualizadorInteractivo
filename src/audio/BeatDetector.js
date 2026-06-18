// Detección de beat por energía: compara la energía instantánea de graves
// contra el promedio reciente. Si la supera por un factor, es un golpe.
export function createBeatDetector({ historySize = 43, sensitivity = 1.3 } = {}) {
  const history = [];

  function average() {
    if (history.length === 0) return 0;
    let sum = 0;
    for (const v of history) sum += v;
    return sum / history.length;
  }

  function detect(energy) {
    const full = history.length >= historySize;
    const avg = average();
    const isBeat = full && energy > avg * sensitivity;

    history.push(energy);
    if (history.length > historySize) history.shift();

    return isBeat;
  }

  return { detect };
}
