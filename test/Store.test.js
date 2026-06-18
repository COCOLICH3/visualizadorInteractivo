import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/state/Store.js';

describe('Store', () => {
  it('devuelve el estado inicial', () => {
    const store = createStore({ a: 1, b: 2 });
    expect(store.getState()).toEqual({ a: 1, b: 2 });
  });

  it('setState mergea y devuelve el nuevo estado', () => {
    const store = createStore({ a: 1, b: 2 });
    store.setState({ b: 9 });
    expect(store.getState()).toEqual({ a: 1, b: 9 });
  });

  it('notifica a los suscriptores con las claves cambiadas', () => {
    const store = createStore({ a: 1 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ a: 5 });
    expect(fn).toHaveBeenCalledWith({ a: 5 }, ['a']);
  });

  it('no notifica si el valor no cambió', () => {
    const store = createStore({ a: 1 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ a: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('subscribe devuelve una función para desuscribir', () => {
    const store = createStore({ a: 1 });
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    unsub();
    store.setState({ a: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
