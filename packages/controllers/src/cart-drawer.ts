import { EVENT_CART_ADDED } from './host';
import { listen, join, readConfig, type Ctl } from './dom';

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]';

export const cartDrawer: Ctl = (el, _host, root) => {
  const c = readConfig(el);
  if (!c) return;
  const dlg = el as HTMLDialogElement;
  let prev: HTMLElement | null = null;
  let offDoc: (() => void) | null = null;
  const isOpen = () => dlg.hasAttribute('open');

  const focusables = () =>
    Array.from(dlg.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (f) => !f.hasAttribute('disabled') && f.getAttribute('tabindex') !== '-1' && !f.closest('[hidden]') && f.getAttribute('type') !== 'hidden',
    );
  const onKey = (e: KeyboardEvent) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const a = document.activeElement;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && (a === first || !dlg.contains(a))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (a === last || !dlg.contains(a))) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  const restore = () => {
    const p = prev;
    prev = null;
    offDoc?.();
    offDoc = null;
    if (p && p.isConnected) p.focus();
  };
  function open() {
    if (isOpen()) return;
    prev = document.activeElement as HTMLElement | null;
    try {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    } catch {
      dlg.setAttribute('open', '');
    }
    offDoc = listen(document, 'keydown', onKey);
    (dlg.querySelector<HTMLElement>('[data-hk-close]') || dlg).focus();
  }
  function close() {
    if (!isOpen()) return;
    try {
      if (typeof dlg.close === 'function') dlg.close();
    } catch {
      /* fall through */
    }
    dlg.removeAttribute('open');
    restore();
  }

  return join(
    listen(root as unknown as EventTarget, 'click', (e: Event) => {
      const o = (e.target as Element | null)?.closest?.('[data-hk-open="cart-drawer"]');
      if (!o) return;
      e.preventDefault();
      open();
    }),
    listen(dlg, 'click', (e: Event) => {
      if (e.target === dlg || (e.target as Element | null)?.closest?.('[data-hk-close]')) close();
    }),
    listen(dlg, 'close', () => {
      if (!isOpen()) restore();
    }),
    listen(root as unknown as EventTarget, EVENT_CART_ADDED, () => {
      if (c.openOnAdd !== false) open();
    }),
    () => {
      offDoc?.();
      offDoc = null;
    },
  );
};
