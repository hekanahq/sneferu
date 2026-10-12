import type { CartHost } from './host';

/** A controller upgrades one element and returns its teardown. */
export type Ctl = (el: HTMLElement, host: CartHost, root: ParentNode) => (() => void) | void;

export const all = (r: ParentNode, s: string): HTMLElement[] => Array.from(r.querySelectorAll<HTMLElement>(s));

/** Parsed data-hk-config; {} when absent, null when malformed (caller skips the element). */
export function readConfig(e: Element): Record<string, any> | null {
  const raw = e.getAttribute('data-hk-config');
  if (raw === null || raw.trim() === '') return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Only https:// or a single-slash site-relative path survives. */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  if (/^https:\/\/[^\s"'<>\\]+$/i.test(u)) return u;
  if (/^\/(?![/\\])[^\s\\]*$/.test(u)) return u;
  return null;
}

export function setHidden(e: Element, hidden: boolean): void {
  if (hidden) e.setAttribute('hidden', '');
  else e.removeAttribute('hidden');
}

export function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function listen(t: EventTarget, type: string, fn: (e: any) => void): () => void {
  t.addEventListener(type, fn);
  return () => t.removeEventListener(type, fn);
}

export const join = (...fns: Array<() => void>) => () => {
  for (const f of fns) {
    try {
      f();
    } catch {
      /* keep tearing down */
    }
  }
};

export const sameProduct = (e: Element, id: string) => e.getAttribute('data-hk-product') === id;

export const total = (lines: { unitPrice: number; quantity: number }[]) =>
  lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
