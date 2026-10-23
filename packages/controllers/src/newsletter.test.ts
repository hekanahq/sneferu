// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { makeHost } from './test-host';

const CFG = JSON.stringify({ success: 'Thanks', invalid: 'Bad email', failed: 'Failed' });
const mount = () => {
  document.body.innerHTML = `<form data-hk-controller="newsletter" data-hk-config='${CFG}' novalidate>
    <input type="email" name="email"><button type="submit" disabled>Subscribe</button>
    <p class="sn-newsletter-status" hidden></p></form>`;
  return {
    form: document.querySelector('form') as HTMLFormElement,
    input: document.querySelector('input') as HTMLInputElement,
    button: document.querySelector('button') as HTMLButtonElement,
    status: document.querySelector('.sn-newsletter-status') as HTMLElement,
  };
};
const submit = (f: HTMLFormElement) => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
const downs: Array<() => void> = [];
const start = (host: Parameters<typeof startControllers>[1]) => void downs.push(startControllers(document.body, host));
afterEach(() => downs.splice(0).forEach((d) => d()));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('newsletter controller', () => {
  it('enables the button and rejects a bad address without calling the host', async () => {
    const { host } = makeHost();
    const sent: string[] = [];
    host.subscribeEmail = async (e) => (sent.push(e), { ok: true });
    const m = mount();
    start(host);
    expect(m.button.disabled).toBe(false);
    m.input.value = 'nope';
    submit(m.form);
    await tick();
    expect(sent).toEqual([]);
    expect(m.status.hidden).toBe(false);
    expect(m.status.textContent).toBe('Bad email');
  });

  it('sends the trimmed address, shows the success text and clears the field', async () => {
    const { host } = makeHost();
    const sent: string[] = [];
    host.subscribeEmail = async (e) => (sent.push(e), { ok: true });
    const m = mount();
    start(host);
    m.input.value = '  a@b.co ';
    submit(m.form);
    await tick();
    expect(sent).toEqual(['a@b.co']);
    expect(m.status.textContent).toBe('Thanks');
    expect(m.input.value).toBe('');
    expect(m.button.disabled).toBe(false);
  });

  it('shows the host message or the failure text when it fails, and when the host cannot subscribe', async () => {
    const { host } = makeHost();
    host.subscribeEmail = async () => ({ ok: false, message: 'Rate limited' });
    const m = mount();
    start(host);
    m.input.value = 'a@b.co';
    submit(m.form);
    await tick();
    expect(m.status.textContent).toBe('Rate limited');

    downs.splice(0).forEach((d) => d());
    const h2 = makeHost().host;
    const m2 = mount();
    start(h2);
    m2.input.value = 'a@b.co';
    submit(m2.form);
    await tick();
    expect(m2.status.textContent).toBe('Failed');
  });
});
