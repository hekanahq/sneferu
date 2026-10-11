// Drives the preview in a real browser: the page the dev server serves through the
// inspect proxy, and the preview panel's own HTML (with a stand-in for the VS Code
// webview API) around it. Run by the e2e suite while the dev server is up:
//   node test/preview-playwright.mjs <preview.json> [screenshot.png]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const [, , jsonPath, shotPath] = process.argv;
const { origin, html } = JSON.parse(readFileSync(jsonPath, 'utf8'));

const browser = await chromium.launch();
try {
  // 1. the URL the webview's iframe loads
  const page = await browser.newPage();
  const res = await page.goto(`${origin}/?locale=en`);
  assert.equal(res.status(), 200);
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  const sections = await page.locator('[data-hk-section]').count();
  assert.ok(sections >= 3, `sections rendered: ${sections}`);
  await page.goto(`${origin}/?locale=ar`);
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  console.log(`dev server page ok: ${sections} sections, en and ar`);

  // 2. the preview panel itself
  const panel = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  // the webview API, stubbed: messages to the extension are collected in window.__msgs
  const nonce = /nonce="([^"]+)"/.exec(html)[1];
  const stub = `<script nonce="${nonce}">window.__msgs=[];window.acquireVsCodeApi=()=>({postMessage:(m)=>window.__msgs.push(m),getState:()=>null,setState:()=>{}});</script>`;
  panel.on('pageerror', (e) => console.log('pageerror', e.message)); panel.on('console', (m) => console.log('console', m.text()));
  await panel.setContent(html.replace('<body>', `<body>${stub}`), { waitUntil: 'load' });
  const frameEl = panel.locator('#frame');
  await panel.waitForFunction(() => document.getElementById('frame').contentWindow && document.getElementById('frame').src.includes('locale='));
  const frame = () => panel.frames().find((f) => f.url().startsWith(origin));
  await panel.waitForFunction(() => true);
  for (let i = 0; i < 50 && !frame(); i++) await panel.waitForTimeout(100);
  await frame().waitForSelector('[data-hk-section="default-0"]');

  await panel.click('[data-width="phone"]');
  assert.equal(Math.round((await frameEl.boundingBox()).width), 390);
  await panel.click('[data-width="tablet"]');
  assert.equal(Math.round((await frameEl.boundingBox()).width), 820);
  await panel.click('[data-locale="en"]');
  await panel.waitForFunction(() => document.getElementById('frame').src.includes('locale=en'));
  for (let i = 0; i < 50 && !(frame() && frame().url().includes('locale=en')); i++) await panel.waitForTimeout(100);
  await frame().waitForSelector('html[lang="en"] [data-hk-section="default-1"]');

  // Alt+click a section: the panel posts { type: 'reveal', section } to the extension
  await frame().click('[data-hk-section="default-1"] >> nth=0', { modifiers: ['Alt'], position: { x: 20, y: 20 } });
  await panel.waitForFunction(() => window.__msgs.some((m) => m.type === 'reveal'));
  const reveal = (await panel.evaluate(() => window.__msgs)).find((m) => m.type === 'reveal');
  assert.equal(reveal.section, 'default-1');
  // Inspect mode: a plain click does the same
  await panel.click('#inspect');
  await frame().click('[data-hk-section="default-2"] >> nth=0', { position: { x: 20, y: 20 } });
  await panel.waitForFunction(() => window.__msgs.filter((m) => m.type === 'reveal').length === 2);
  console.log('preview panel ok: widths, language, click to source');

  await panel.click('#inspect');
  await panel.click('[data-width="phone"]');
  await panel.waitForTimeout(400);
  if (shotPath) { await panel.screenshot({ path: shotPath }); console.log(`screenshot ${shotPath}`); }
} finally {
  await browser.close();
}
