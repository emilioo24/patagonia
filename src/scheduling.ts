/** Espera un momento libre del navegador. */
export function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    // Safari todavía no tiene requestIdleCallback
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 1500 });
    else setTimeout(resolve, 300);
  });
}

/** Le devuelve el control al navegador entre dos pasos pesados. */
export function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/** Se resuelve con la primera interacción o, si no hay ninguna, pasado el tiempo indicado. */
export function whenInteractedOr(timeoutMs: number): Promise<void> {
  if (window.scrollY > 0) return Promise.resolve(); // recargó a mitad de la página

  const events = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'];
  return new Promise((resolve) => {
    const start = () => {
      clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, start);
      resolve();
    };
    const timer = setTimeout(start, timeoutMs);
    for (const name of events) window.addEventListener(name, start, { passive: true });
  });
}
