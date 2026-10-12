import type { CartHost, CartLine } from './host';

const T: Record<string, string> = {
  add_to_cart: 'Add to cart', added: 'Added', sold_out: 'Sold out', remove: 'Remove',
  subtotal: 'Subtotal', checkout: 'Checkout', empty: 'Empty', quantity: 'Quantity', close: 'Close',
  increase: 'Increase quantity', decrease: 'Decrease quantity', add_failed: 'Could not add',
};

/** Test double for CartHost; not part of the published bundle. */
export function makeHost(lines: CartLine[] = []) {
  const subs = new Set<(l: CartLine[]) => void>();
  const calls = { add: [] as any[], update: [] as any[], remove: [] as any[] };
  const state = { lines, addResult: { ok: true } as { ok: boolean; message?: string }, addImpl: null as null | (() => Promise<any>) };
  const host: CartHost = {
    locale: 'en',
    currency: 'EGP',
    format: (m) => `E${m / 100}`,
    get: () => state.lines,
    add: (i) => {
      calls.add.push(i);
      return state.addImpl ? state.addImpl() : Promise.resolve(state.addResult);
    },
    update: (k, q) => void calls.update.push([k, q]),
    remove: (k) => void calls.remove.push(k),
    subscribe: (fn) => {
      subs.add(fn);
      return () => void subs.delete(fn);
    },
    checkoutUrl: '/checkout',
    t: (k) => T[k] ?? k,
  };
  const set = (l: CartLine[]) => {
    state.lines = l;
    subs.forEach((f) => f(l));
  };
  return { host, calls, state, set, subs };
}

export const line = (o: Partial<CartLine> = {}): CartLine => ({
  key: 'k1', productId: 'P1', title: 'Tee', unitPrice: 1000, quantity: 2, ...o,
});
