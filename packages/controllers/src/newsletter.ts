import { listen, mk, readConfig, setHidden, type Ctl } from './dom';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Submits a newsletter signup form through the host. The button starts disabled in the markup, so the form is inert until this runs. */
export const newsletter: Ctl = (el, host) => {
  const form = el as HTMLFormElement;
  const input = form.querySelector<HTMLInputElement>('input[name="email"]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  let status = form.querySelector<HTMLElement>('.sn-newsletter-status');
  if (!input || !button) return;
  if (!status) {
    status = mk('p', 'sn-newsletter-status');
    status.setAttribute('role', 'status');
    form.appendChild(status);
  }
  const out = status;
  const cfg = readConfig(el) ?? {};
  const say = (msg: string) => {
    out.textContent = msg;
    setHidden(out, msg === '');
  };
  let busy = false;
  button.disabled = false;
  const onSubmit = (e: Event) => {
    e.preventDefault();
    if (busy) return;
    const email = input.value.trim();
    if (!EMAIL.test(email) || email.length > 254) {
      say(String(cfg.invalid ?? ''));
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    input.removeAttribute('aria-invalid');
    if (typeof host.subscribeEmail !== 'function') {
      say(String(cfg.failed ?? ''));
      return;
    }
    busy = true;
    button.disabled = true;
    say('');
    host
      .subscribeEmail(email)
      .then((r) => {
        if (r.ok) {
          input.value = '';
          say(String(cfg.success ?? ''));
        } else {
          say(r.message || String(cfg.failed ?? ''));
        }
      })
      .catch(() => say(String(cfg.failed ?? '')))
      .finally(() => {
        busy = false;
        button.disabled = false;
      });
  };
  return listen(form, 'submit', onSubmit);
};
