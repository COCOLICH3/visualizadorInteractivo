// Estado central + bus de eventos. No sabe nada de audio ni de dibujo.
export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    const changed = [];
    for (const key of Object.keys(patch)) {
      if (state[key] !== patch[key]) {
        changed.push(key);
      }
    }
    if (changed.length === 0) return;
    state = { ...state, ...patch };
    for (const fn of listeners) fn(state, changed);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, subscribe };
}
