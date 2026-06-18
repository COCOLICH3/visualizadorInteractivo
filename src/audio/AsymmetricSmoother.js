// Smoothing asimétrico (envelope follower): sube rápido y baja lento, como un
// VU meter / compresor. Suaviza el tembleque del FFT sin perder los transientes.
// attack y release son factores 0..1 (cuánto se acerca al objetivo por paso).
export function createAsymmetricSmoother({ attack = 0.6, release = 0.08 } = {}) {
  let current = 0;

  return {
    process(value) {
      const rate = value > current ? attack : release;
      current += (value - current) * rate;
      return current;
    },
    get value() {
      return current;
    },
  };
}
