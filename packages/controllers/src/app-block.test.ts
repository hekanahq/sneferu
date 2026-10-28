// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { startControllers, MSG_APP_BLOCK_HEIGHT, MSG_APP_BLOCK_UNAVAILABLE } from './index';
import { makeHost } from './test-host';

let current: (() => void) | null = null;
afterEach(() => { current?.(); current = null; });

function setup() {
  current?.();
  document.body.innerHTML = '<div data-hk-controller="app-block"><iframe src="/hk2/app-block/subscriptions/subscribe?product=x"></iframe></div>';
  current = startControllers(document.body, makeHost().host);
  const el = document.querySelector('[data-hk-controller]') as HTMLElement;
  const frame = document.querySelector('iframe')!;
  const fromFrame = (data: unknown, origin = location.origin, source: unknown = frame.contentWindow) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as Window }));
  return { el, frame, fromFrame };
}

describe('app-block controller', () => {
  it('exports the message names the framed pages use', () => {
    expect([MSG_APP_BLOCK_HEIGHT, MSG_APP_BLOCK_UNAVAILABLE]).toEqual(['hk:app-block-height', 'hk:app-block-unavailable']);
  });
  it('sizes the frame to the reported height, clamped', () => {
    const s = setup();
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 251.2 });
    expect(s.frame.style.height).toBe('251px');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 1 });
    expect(s.frame.style.height).toBe('40px');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 1e9 });
    expect(s.frame.style.height).toBe('4000px');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: Number.NaN });
    expect(s.frame.style.height).toBe('4000px');
  });
  it('ignores a message from another origin or from a window that is not its frame', () => {
    const s = setup();
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 900 }, 'https://evil.example');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: 900 }, location.origin, window);
    s.fromFrame({ type: MSG_APP_BLOCK_UNAVAILABLE }, 'https://evil.example');
    s.fromFrame({ type: MSG_APP_BLOCK_UNAVAILABLE }, location.origin, window);
    expect(s.frame.style.height).toBe('');
    expect(s.el.hidden).toBe(false);
  });
  it('removes the block when its page says the app is off or has nothing to show', () => {
    const s = setup();
    s.fromFrame({ type: MSG_APP_BLOCK_UNAVAILABLE });
    expect(s.el.hidden).toBe(true);
    expect(s.el.style.display).toBe('none');
  });
  it('ignores malformed data', () => {
    const s = setup();
    s.fromFrame(null);
    s.fromFrame('hk:app-block-height');
    s.fromFrame({ type: MSG_APP_BLOCK_HEIGHT, height: '900' });
    expect(s.frame.style.height).toBe('');
  });
});
