import { listingReturnHref } from './job-listing-filters';

type ReturnPosition = {
  scope: string;
  jobId: string;
  link: 'title' | 'details';
  top: number;
  scrollY: number;
  detailUrl: string;
  originPath: string;
  returning: boolean;
};

// One in-memory round trip only: never persist profile data, URLs or DOM nodes.
let pending: ReturnPosition | undefined;
let stopWatching: (() => void) | undefined;
let explicitReturn = false;

export function clearListingReturnPosition() {
  pending = undefined;
  explicitReturn = false;
  stopWatching?.();
  stopWatching = undefined;
}

export function isSameTabNavigation(event: {
  button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean;
  defaultPrevented: boolean; currentTarget: { target: string };
}) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey
    && !event.shiftKey && !event.altKey && (!event.currentTarget.target || event.currentTarget.target === '_self');
}

export function rememberListingPosition(anchor: HTMLAnchorElement, jobId: string, link: 'title' | 'details') {
  clearListingReturnPosition();
  pending = {
    scope: listingReturnHref(window.location.search),
    jobId, link, top: anchor.getBoundingClientRect().top, scrollY: window.scrollY,
    detailUrl: anchor.href, originPath: window.location.pathname, returning: false,
  };
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';
  const onNavigation = (event: Event) => {
    if (!pending || window.location.href === pending.detailUrl) return;
    const atOrigin = window.location.pathname === pending.originPath
      && new URLSearchParams(window.location.search).get('tab') === 'listings'
      && listingReturnHref(window.location.search) === pending.scope;
    if (atOrigin && (event.type === 'popstate' || explicitReturn)) {
      pending.returning = true;
      explicitReturn = false;
    } else {
      clearListingReturnPosition();
    }
  };
  // Wouter emits these history events. Capture before its React subscribers.
  const events = ['popstate', 'pushState', 'replaceState', 'hashchange'];
  events.forEach(name => window.addEventListener(name, onNavigation, true));
  stopWatching = () => {
    events.forEach(name => window.removeEventListener(name, onNavigation, true));
    window.history.scrollRestoration = previousRestoration;
  };
}

export function requestListingReturn(jobId: string) {
  explicitReturn = pending?.jobId === jobId && window.location.href === pending.detailUrl;
}

export function getListingReturnPosition(scope: string) {
  return pending?.returning && pending.scope === scope ? pending : undefined;
}

/** Wait for entry animations, not an arbitrary delay, then restore without smooth scrolling. */
export function restoreListingPosition(root: HTMLElement, scope: string) {
  const position = getListingReturnPosition(scope);
  if (!position) return;
  let cancelled = false;
  let frame = 0;
  const cancel = () => {
    cancelled = true;
    window.cancelAnimationFrame(frame);
  };
  // A user who starts navigating/scrolling while waiting must not be pulled back.
  const interrupt = () => { cancel(); clearListingReturnPosition(); };
  const inputs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  inputs.forEach(name => window.addEventListener(name, interrupt, { passive: true }));
  const animations = [
    ...(root.closest('main')?.getAnimations() ?? []),
    ...root.getAnimations({ subtree: true }),
  ].filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
  void Promise.all(animations.map(animation => animation.finished.catch(() => undefined))).then(() => {
    if (cancelled) return;
    frame = window.requestAnimationFrame(() => {
      if (cancelled || getListingReturnPosition(scope) !== position) return;
      const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-listing-link]'));
      const anchor = links.find(link => link.dataset.listingId === position.jobId
        && link.dataset.listingLink === position.link);
      const target = anchor ?? links[0] ?? root.querySelector<HTMLElement>('[data-listing-results-heading]');
      target?.focus({ preventScroll: true });
      const top = target
        ? window.scrollY + target.getBoundingClientRect().top
          - (anchor ? Math.max(100, Math.min(position.top, window.innerHeight - 100)) : 100)
        : position.scrollY;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
      inputs.forEach(name => window.removeEventListener(name, interrupt));
      clearListingReturnPosition();
    });
  });
  return () => {
    cancel();
    inputs.forEach(name => window.removeEventListener(name, interrupt));
  };
}
