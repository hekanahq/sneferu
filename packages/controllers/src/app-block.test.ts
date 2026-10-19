// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startControllers, MSG_APP_BLOCK_HEIGHT, MSG_APP_BLOCK_UNAVAILABLE } from './index';
import { makeHost } from './test-host';

let current: (() => void) | null = null;
afterEach(() => { current?.(); current = null; vi.restoreAllMocks(); });

function setup() {
  current?.();
  document.body.innerHTML = '<div data-hk-controller="app-block"><iframe src="/apps/embed/subscriptions/portal"></iframe></div>';
  current = startControllers(document.body, makeHost().host);
  const el = document.querySelector('[data-hk-controller="app-block"]') as HTMLElement;
  const frame = document.querySelector('iframe')!;
  const fromFrame = (data: unknown, origin = location.origin, source: unknown = frame.contentWindow) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as Window }));
  return { el, frame, fromFrame };
}

describe('app-block', () => {
  it('names the messages the platform page uses', () => {
    expect([MSG_APP_BLOCK_HEIGHT, MSG_APP_BLOCK_UNAVAILABLE]).toEqual(['hk:app-block-height', 'hk:app-block-unavailable']);
  });
  it('sizes the frame to the height it reports, clamped', () => {
    const s = setup();
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 512.4 });
    expect(s.frame.style.height).toBe('512px');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 1 });
    expect(s.frame.style.height).toBe('40px');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 1e9 });
    expect(s.frame.style.height).toBe('4000px');
  });
  it('removes the block when the app is not installed', () => {
    const s = setup();
    s.fromFrame({ type: MSG_APP_BLOCK_UNAVAILABLE });
    expect(s.el.hidden).toBe(true);
    expect(s.el.style.display).toBe('none');
  });
  it('ignores messages from another origin or window, and junk', () => {
    const s = setup();
    s.fromFrame({ type: MSG_APP_BLOCK_UNAVAILABLE }, 'https://evil.test');
    s.fromFrame({ type: MSG_APP_BLOCK_UNAVAILABLE }, location.origin, window);
    s.fromFrame('hello');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 'tall' });
    expect(s.el.hidden).toBe(false);
    expect(s.frame.style.height).toBe('');
  });
});
