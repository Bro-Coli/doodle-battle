export function navigate(pathname: string, search?: string): void {
  const url = search ? `${pathname}${search}` : pathname;
  if (window.location.pathname + window.location.search === url) return;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
