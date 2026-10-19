import { join, listen, type Ctl } from './dom';

/** Frame → page: `{ type, height }`, the block's document height in px. */
export const MSG_APP_BLOCK_HEIGHT = 'hk:app-block-height';
/** Frame → page: the store has not installed this app; take the block out of the page. */
export const MSG_APP_BLOCK_UNAVAILABLE = 'hk:app-block-unavailable';

const MIN_H = 40;
const MAX_H = 4000;

/**
 * Keeps an app block's frame the height of its content and removes it when the app is not
 * installed. Listens only to its own frame and only on this origin; never changes `src`.
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
