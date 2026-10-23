import { afterEach, beforeEach, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearListingReturnPosition, getListingReturnPosition, isSameTabNavigation,
  rememberListingPosition, requestListingReturn, restoreListingPosition,
} from './listing-return-position';

const scope = '/careers-and-jobs?tab=listings&q=data&page=2';
const detail = 'https://example.test/careers-and-jobs/listings/sample-2?tab=listings&q=data&page=2';
let browser: Window;
let frame: (() => void) | undefined;
let scroll: ScrollToOptions | undefined;
let focused = '';
let events: EventTarget;

function navigate(href: string, type = 'pushState') {
  Object.assign(browser, { location: new URL(href, 'https://example.test') });
  events.dispatchEvent(new Event(type));
}

function link(id = 'sample-2', kind = 'details', top = 240) {
  return {
    href: detail, dataset: { listingId: id, listingLink: kind },
    getBoundingClientRect: () => ({ top }),
    focus: (options: FocusOptions) => {
      assert.deepEqual(options, { preventScroll: true });
      focused = `${id}:${kind}`;
    },
  } as unknown as HTMLAnchorElement;
}

function root(links = [link()], animations: { finished: Promise<void> }[] = []) {
  return {
    closest: () => ({ getAnimations: () => [] }),
    getAnimations: () => animations,
    querySelectorAll: () => links,
    querySelector: () => null,
  } as unknown as HTMLElement;
}

beforeEach(() => {
  events = new EventTarget();
  frame = undefined;
  scroll = undefined;
  focused = '';
  browser = {
    location: new URL(scope, 'https://example.test'),
    history: { scrollRestoration: 'auto' },
    scrollY: 2400, innerHeight: 900,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    requestAnimationFrame: (callback: () => void) => { frame = callback; return 1; },
    cancelAnimationFrame: () => { frame = undefined; },
    scrollTo: (options: ScrollToOptions) => { scroll = options; },
  } as unknown as Window;
  Object.assign(globalThis, { window: browser });
});

afterEach(() => {
  clearListingReturnPosition();
  Reflect.deleteProperty(globalThis, 'window');
});

function open(kind: 'title' | 'details' = 'details') {
  rememberListingPosition(link('sample-2', kind), 'sample-2', kind);
  navigate(detail);
}

it('restores browser Back only after the results are rendered, then consumes the position', async () => {
  open();
  assert.equal(browser.history.scrollRestoration, 'manual');
  assert.equal(getListingReturnPosition(scope), undefined);
  navigate(scope, 'popstate');
  assert.ok(getListingReturnPosition(scope));
  assert.equal(scroll, undefined);
  restoreListingPosition(root(), scope);
  await Promise.resolve();
  frame?.();
  assert.equal(focused, 'sample-2:details');
  assert.deepEqual(scroll, { top: 2400, behavior: 'instant' });
  assert.equal(getListingReturnPosition(scope), undefined);
  assert.equal(browser.history.scrollRestoration, 'auto');
});

it('Back to listings restores the originating title link and preserves the page/filter scope', async () => {
  open('title');
  requestListingReturn('sample-2');
  navigate(scope);
  assert.equal(getListingReturnPosition('/careers-and-jobs?tab=listings'), undefined);
  restoreListingPosition(root([link('sample-2', 'title')]), scope);
  await Promise.resolve();
  frame?.();
  assert.equal(focused, 'sample-2:title');
});

it('fresh visits, unrelated navigation and changed filters cannot reuse a position', () => {
  assert.equal(restoreListingPosition(root(), scope), undefined);
  open();
  navigate(scope); // A normal navigation, not Back or the explicit return link.
  assert.equal(getListingReturnPosition(scope), undefined);
  open();
  navigate('/dashboard');
  navigate(scope, 'popstate');
  assert.equal(getListingReturnPosition(scope), undefined);
  open();
  requestListingReturn('sample-2');
  navigate('/careers-and-jobs?tab=listings&q=nurse&page=2');
  assert.equal(getListingReturnPosition(scope), undefined);
});

it('Reset clears an armed position and restores the original browser policy', () => {
  open();
  navigate(scope, 'popstate');
  clearListingReturnPosition();
  assert.equal(restoreListingPosition(root(), scope), undefined);
  assert.equal(browser.history.scrollRestoration, 'auto');
});

it('waits for entry animations and cancels on unmount', async () => {
  open();
  navigate(scope, 'popstate');
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  const cleanup = restoreListingPosition(root([link()], [{ finished }]), scope);
  await Promise.resolve();
  assert.equal(frame, undefined);
  cleanup?.();
  finish();
  await finished;
  await Promise.resolve();
  assert.equal(frame, undefined);
  assert.equal(focused, '');
});

it('does not steal focus or scroll after the reader starts interacting while waiting', async () => {
  open();
  navigate(scope, 'popstate');
  restoreListingPosition(root(), scope);
  events.dispatchEvent(new Event('keydown'));
  await Promise.resolve();
  frame?.();
  assert.equal(focused, '');
  assert.equal(scroll, undefined);
  assert.equal(getListingReturnPosition(scope), undefined);
});

it('falls back to the first visible listing if the original disappeared', async () => {
  open();
  navigate(scope, 'popstate');
  restoreListingPosition(root([link('replacement', 'title', 360)]), scope);
  await Promise.resolve();
  frame?.();
  assert.equal(focused, 'replacement:title');
  assert.deepEqual(scroll, { top: 2660, behavior: 'instant' });
});

it('ignores modified clicks, middle clicks, prevented navigation and new tabs', () => {
  const click = {
    button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    defaultPrevented: false, currentTarget: { target: '' },
  };
  assert.equal(isSameTabNavigation(click), true); // Keyboard Enter produces a primary click too.
  for (const patch of [
    { button: 1 }, { metaKey: true }, { ctrlKey: true }, { shiftKey: true },
    { altKey: true }, { defaultPrevented: true }, { currentTarget: { target: '_blank' } },
  ]) assert.equal(isSameTabNavigation({ ...click, ...patch }), false);
});
