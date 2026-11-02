const STORAGE_KEY = 'patagonia-age-ok';

function wasAccepted(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // sin almacenamiento, se pregunta cada vez
  }
}

function remember() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Se pide de nuevo en la próxima carga
  }
}

/** Se resuelve cuando la persona confirma que es mayor de edad, o si ya lo hizo en esta sesión. */
export function waitForAgeConfirmation(): Promise<void> {
  const enter = () => {
    document.documentElement.classList.add('age-ok');
    for (const element of document.querySelectorAll<HTMLElement>('[data-gated]')) element.inert = false;
  };

  if (wasAccepted()) {
    enter();
    return Promise.resolve();
  }

  const yes = document.querySelector<HTMLButtonElement>('#age-yes')!;
  const no = document.querySelector<HTMLButtonElement>('#age-no')!;
  const back = document.querySelector<HTMLButtonElement>('#age-back')!;
  const ask = document.querySelector<HTMLElement>('#age-ask')!;
  const denied = document.querySelector<HTMLElement>('#age-denied')!;

  yes.focus();

  no.addEventListener('click', () => {
    ask.hidden = true;
    denied.hidden = false;
    back.focus();
  });
  back.addEventListener('click', () => {
    denied.hidden = true;
    ask.hidden = false;
    yes.focus();
  });

  return new Promise((resolve) => {
    yes.addEventListener('click', () => {
      remember();
      enter();
      resolve();
    });
  });
}
