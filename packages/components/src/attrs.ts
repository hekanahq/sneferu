import { escapeAttr, safeToken, toStr } from '@hekana/sneferu-core';

const DATA = /^data-[a-z0-9_.-]+$/;
const ARIA = /^aria-[a-z]+$/;

/**
 * Pass-through attributes written on an hk-* tag (class, id, role, title,
 * data-*, aria-*), ready to splice into the component's root element.
 * class/id are reduced to safe tokens; the rest are attribute-escaped.
 * data-hk-* is reserved for the platform and dropped. `ownA11y`: the tag sets its own
 * role and aria-* (an icon, a search form), so those are dropped too.
 */
export function passthrough(props: Record<string, unknown>, ownA11y = false): { cls: string; attrs: string } {
  let cls = '';
  let attrs = '';
  for (const [k, v] of Object.entries(props)) {
    const s = toStr(v);
    if (k === 'class') { const t = safeToken(s); if (t) cls += ` ${t}`; }
    else if (k === 'id') { const t = safeToken(s).replace(/ /g, '-'); if (t) attrs += ` id="${escapeAttr(t)}"`; }
    else if (ownA11y && (k === 'role' || ARIA.test(k))) continue;
    else if (k === 'role' || k === 'title' || ARIA.test(k) || (DATA.test(k) && !k.startsWith('data-hk-'))) attrs += ` ${k}="${escapeAttr(s)}"`;
  }
  return { cls, attrs };
}
