import { setHidden, type Ctl } from './dom';

export const cartCount: Ctl = (el, host) => {
  const render = (lines: { quantity: number }[]) => {
    const n = lines.reduce((s, l) => s + l.quantity, 0);
    el.textContent = String(n);
    setHidden(el, n <= 0);
  };
  render(host.get());
  return host.subscribe(render);
};
