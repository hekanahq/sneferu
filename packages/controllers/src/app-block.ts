import { join, listen, type Ctl } from './dom';

// Spelled out here: this package has no dependency on core. core/app-blocks.ts holds the same two strings.
export const MSG_APP_BLOCK_HEIGHT = 'hk:app-block-height';
export const MSG_APP_BLOCK_UNAVAILABLE = 'hk:app-block-unavailable';

const MIN_H = 40;
const MAX_H = 4000;

/**
 * Sizes an app block's frame from the height its page reports, and removes the block when the page
 * says the app is not installed or has nothing to show. A message counts only when it comes from the
 * store's own origin AND from this block's own frame window.
 */
export const appBlock: Ctl = (el) => {
  const frame = el.firstElementChild;
  if (!(frame instanceof HTMLIFrameElement)) return;
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const d = e.data as { type?: unknown; height?: unknown } | null;
    if (!d || typeof d !== 'object') return;
    if (d.type === MSG_APP_BLOCK_UNAVAILABLE) {
      el.setAttribute('hidden', '');
      (el as HTMLElement).style.display = 'none';
    } else if (d.type === MSG_APP_BLOCK_HEIGHT && typeof d.height === 'number' && Number.isFinite(d.height)) {
      frame.style.height = `${Math.min(MAX_H, Math.max(MIN_H, Math.round(d.height)))}px`;
    }
  };
  return join(listen(window, 'message', onMessage));
};
