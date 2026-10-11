/**
 * The preview panel's page: a toolbar (width, language, template, inspect,
 * reload, open in browser) over an iframe showing the dev server through the
 * inspect proxy. Plain HTML, VS Code theme colours, no framework.
 */
export interface PreviewOptions {
  /** Origin the iframe loads, e.g. http://127.0.0.1:53211 (after asExternalUri). */
  origin: string;
  locales: string[];
  locale: string;
  templates: string[];
  nonce: string;
  cspSource: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function previewHtml(o: PreviewOptions): string {
  const frame = new URL(o.origin).origin;
  const btn = (group: string, value: string, label: string, on: boolean) => `<button type="button" class="seg${on ? ' on' : ''}" data-${group}="${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${frame}; style-src ${o.cspSource} 'unsafe-inline'; script-src 'nonce-${o.nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sneferu preview</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;flex-direction:column;background:var(--vscode-editor-background);color:var(--vscode-foreground);font:12px var(--vscode-font-family)}
  .bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--vscode-panel-border,rgba(128,128,128,.35))}
  .group{display:inline-flex;border:1px solid var(--vscode-panel-border,rgba(128,128,128,.35));border-radius:4px;overflow:hidden}
  button{font:inherit;color:inherit;background:transparent;border:0;padding:4px 10px;cursor:pointer;min-height:24px}
  button:hover{background:var(--vscode-toolbar-hoverBackground)}
  button.on{background:var(--vscode-button-secondaryBackground,rgba(128,128,128,.25));color:var(--vscode-button-secondaryForeground,inherit)}
  .group button+button{border-inline-start:1px solid var(--vscode-panel-border,rgba(128,128,128,.35))}
  select{font:inherit;color:var(--vscode-dropdown-foreground);background:var(--vscode-dropdown-background);border:1px solid var(--vscode-dropdown-border,transparent);border-radius:4px;padding:3px 6px}
  .grow{flex:1}
  .url{opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%}
  .stage{flex:1;overflow:auto;display:flex;justify-content:center;background:var(--vscode-sideBar-background,var(--vscode-editor-background))}
  iframe{border:0;background:#fff;height:100%;width:100%;transition:width .12s}
  .stage.framed iframe{box-shadow:0 0 0 1px var(--vscode-panel-border,rgba(128,128,128,.35))}
  .hint{padding:4px 8px;opacity:.75;border-top:1px solid var(--vscode-panel-border,rgba(128,128,128,.35))}
</style></head>
<body>
<div class="bar" role="toolbar" aria-label="Preview">
  <span class="group" aria-label="Width">${btn('width', 'desktop', 'Desktop', true)}${btn('width', 'tablet', 'Tablet', false)}${btn('width', 'phone', 'Phone', false)}</span>
  ${o.locales.length > 1 ? `<span class="group" aria-label="Language">${o.locales.map((l) => btn('locale', l, l.toUpperCase(), l === o.locale)).join('')}</span>` : ''}
  ${o.templates.length > 1 ? `<select id="template" aria-label="Template">${o.templates.map((t) => `<option value="${esc(t)}"${t === 'index' ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
  <span class="group"><button type="button" id="inspect" aria-pressed="false" title="Click an element in the preview to open its section file (Alt+click works any time)">Inspect</button></span>
  <span class="group"><button type="button" id="reload" title="Reload">Reload</button><button type="button" id="browser" title="Open in the browser">Browser</button></span>
  <span class="grow"></span><span class="url" id="url"></span>
</div>
<div class="stage" id="stage"><iframe id="frame" title="Theme preview"></iframe></div>
<div class="hint" id="hint">Alt+click an element to open its section.</div>
<script nonce="${o.nonce}">
(function(){
  const vscode = acquireVsCodeApi();
  const origin = ${JSON.stringify(o.origin.replace(/\/$/, ''))};
  const WIDTHS = { desktop: null, tablet: 820, phone: 390 };
  const saved = vscode.getState() || {};
  let state = { width: saved.width || 'desktop', locale: saved.locale || ${JSON.stringify(o.locale)}, template: saved.template || 'index', inspect: false };
  const frame = document.getElementById('frame'), stage = document.getElementById('stage');
  let lastLoad = 0;
  function url(){ const p = state.template === 'index' ? '/' : '/__template/' + encodeURIComponent(state.template); return origin + p + '?locale=' + encodeURIComponent(state.locale); }
  function apply(){
    const w = WIDTHS[state.width];
    frame.style.width = w ? w + 'px' : '100%';
    stage.classList.toggle('framed', !!w);
    document.querySelectorAll('[data-width]').forEach(b => { const on = b.dataset.width === state.width; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('[data-locale]').forEach(b => { const on = b.dataset.locale === state.locale; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const sel = document.getElementById('template'); if (sel) sel.value = state.template;
    const ib = document.getElementById('inspect'); ib.classList.toggle('on', state.inspect); ib.setAttribute('aria-pressed', state.inspect);
    vscode.setState({ width: state.width, locale: state.locale, template: state.template });
  }
  function load(){ frame.src = url(); document.getElementById('url').textContent = url(); }
  function sendInspect(){ try { frame.contentWindow.postMessage({ type: 'sneferu-inspect', on: state.inspect }, '*'); } catch (e) {} }
  frame.addEventListener('load', () => { lastLoad = Date.now(); sendInspect(); });
  document.querySelectorAll('[data-width]').forEach(b => b.addEventListener('click', () => { state.width = b.dataset.width; apply(); }));
  document.querySelectorAll('[data-locale]').forEach(b => b.addEventListener('click', () => { state.locale = b.dataset.locale; apply(); load(); }));
  const sel = document.getElementById('template'); if (sel) sel.addEventListener('change', () => { state.template = sel.value; apply(); load(); });
  document.getElementById('inspect').addEventListener('click', () => { state.inspect = !state.inspect; apply(); sendInspect(); });
  document.getElementById('reload').addEventListener('click', load);
  document.getElementById('browser').addEventListener('click', () => vscode.postMessage({ type: 'openExternal', url: url() }));
  window.addEventListener('message', (e) => {
    const m = e.data || {};
    if (e.source === frame.contentWindow) {
      if (m.type === 'sneferu-reveal') vscode.postMessage({ type: 'reveal', section: m.section, block: m.block, path: m.path });
      return;
    }
    if (m.type === 'reload' && Date.now() - lastLoad > 800) load();
    if (m.type === 'navigate') { const reload = (m.locale && m.locale !== state.locale) || (m.template && m.template !== state.template); if (m.locale) state.locale = m.locale; if (m.template) state.template = m.template; if (m.width) state.width = m.width; apply(); if (reload) load(); }
  });
  apply(); load();
})();
</script>
</body></html>`;
}
