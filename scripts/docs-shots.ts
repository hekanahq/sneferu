// Re-renders every picture in docs/images from docs/examples/example-store and the
// starter, in English, with the `sneferu dev` sample data. Run: pnpm docs:shots
//
// Each page is compiled and rendered by the Sneferu runtime exactly as `sneferu dev`
// renders it (same sample data, same page wrapper, same CSS), then captured with
// Chromium at device scale 2: desktop 1080 px wide, phone 390 px wide. The script
// fails if a rendered page is not dir="ltr" lang="en" or contains Arabic script.
// Product images come from placehold.co, so it needs network access.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { compileTheme } from '../packages/compiler/src/index';
import { createDefaultRegistry } from '../packages/components/src/index';
import { renderPage, type PageNode } from '../packages/runtime/src/index';
import { loadTheme } from '../packages/sneferu/src/load';
import { sampleContext } from '../packages/sneferu/src/sample-data';
import { devPage } from '../packages/sneferu/src/dev-page';

const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const OUT = root('docs/images');
const DESKTOP = 1080;
const PHONE = 390;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const registry = createDefaultRegistry();

function themePage(dir: string) {
  const { artifact, diagnostics } = compileTheme(loadTheme(dir), registry);
  if (!artifact) throw new Error(`${dir} does not compile:\n${diagnostics.map((d) => `${d.code} ${d.message}`).join('\n')}`);
  const assets = join(dir, 'assets');
  const themeCss = readdirSync(assets).filter((f) => f.endsWith('.css')).sort().map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
  const locale = artifact.manifest.defaultLocale;
  if (locale !== 'en') throw new Error(`${dir}: the pictures are English; defaultLocale is ${locale}`);
  return (sections?: PageNode[]): string => {
    const r = renderPage(artifact, { template: 'index', sections, ctx: sampleContext(locale, artifact.locales, locale), registry });
    if (r.diagnostics.length) throw new Error(`${dir}: ${r.diagnostics.map((d) => `${d.code} ${d.message}`).join('; ')}`);
    const html = devPage(artifact, { body: r.html, locale, css: r.css, themeCss, reloadScript: false });
    if (!r.html.includes('dir="ltr" lang="en"')) throw new Error(`${dir}: page is not dir="ltr" lang="en"`);
    const text = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    if (ARABIC.test(text)) throw new Error(`${dir}: page contains Arabic text: ${text.match(new RegExp(`.{0,30}${ARABIC.source}.{0,30}`))?.[0]}`);
    return html;
  };
}

const example = themePage(root('docs/examples/example-store'));
const starter = themePage(root('packages/sneferu/starter'));
const one = (type: string, children?: PageNode[]): PageNode[] => [{ id: type, type, ...(children ? { children } : {}) }];
const quote = (id: string, text: string, author: string): PageNode => ({ id, type: 'quote', props: { text, author } });

type Shot = { file: string; html: string; width: number; target: 'section' | 'page' | { height: number } };
const sectionShots = (type: string, phone: boolean): Shot[] => [
  { file: `${type}@2x.webp`, html: example(one(type)), width: DESKTOP, target: 'section' },
  ...(phone ? [{ file: `${type}-phone@2x.webp`, html: example(one(type)), width: PHONE, target: 'section' as const }] : []),
];

const shots: Shot[] = [
  ...sectionShots('announcement-bar', true),
  ...sectionShots('promo-hero', true),
  ...sectionShots('feature-row', true),
  ...sectionShots('product-grid', true),
  ...sectionShots('pricing', true),
  ...sectionShots('on-sale', false),
  { file: 'testimonials@2x.webp', width: DESKTOP, target: 'section', html: example(one('testimonials', [
    quote('q1', 'Delivery was fast and the packaging was perfect.', 'Mona, Alexandria'),
    quote('q2', 'I paid when it arrived. Easy, and no surprises.', 'Karim, Cairo'),
    quote('q3', 'The size guide was right. It fits well.', 'Salma, Mansoura'),
  ])) },
  { file: 'testimonials-empty@2x.webp', width: DESKTOP, target: 'section', html: example(one('testimonials')) },
  { file: 'full-page@2x.webp', width: DESKTOP, target: 'page', html: example() },
  { file: 'starter-dev@2x.webp', width: DESKTOP, target: { height: 1040 }, html: starter() },
  { file: 'starter-hero@2x.webp', width: DESKTOP, target: 'section', html: starter(one('hero')) },
];

const only = process.argv.slice(2);
const browser = await chromium.launch();
try {
  for (const s of shots.filter((x) => !only.length || only.some((o) => x.file.startsWith(o)))) {
    const page = await browser.newPage({ viewport: { width: s.width, height: typeof s.target === 'object' ? s.target.height : 800 }, deviceScaleFactor: 2 });
    await page.setContent(s.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const dir = await page.evaluate(() => document.querySelector('[data-hk-theme]')?.getAttribute('dir'));
    if (dir !== 'ltr') throw new Error(`${s.file}: theme root dir is ${dir}`);
    const png = s.target === 'section'
      ? await page.locator('[data-hk-section]').first().screenshot()
      : await page.screenshot({ fullPage: s.target === 'page' });
    const webp = await sharp(png).webp({ quality: 88, effort: 6 }).toBuffer();
    writeFileSync(join(OUT, s.file), webp);
    const { width, height } = await sharp(webp).metadata();
    console.log(`${s.file.padEnd(32)} ${width}x${height}  ${(webp.length / 1024).toFixed(1)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
}
