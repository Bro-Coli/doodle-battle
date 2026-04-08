const ROOT_ID = 'app';

export function initStyle(): void {
  const rootElement = document.getElementById(ROOT_ID);
  if (!rootElement) {
    throw new Error('App root element not found.');
  }

  document.documentElement.className = 'h-full bg-white';
  document.body.className = 'h-full bg-white';
  rootElement.className = 'h-full w-full';
}
