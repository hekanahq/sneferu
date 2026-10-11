import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request, type Server } from 'node:http';
import { pickSampleData, sampleContext, withSampleData } from './sample-data';
import { readSampleData, sampleDataPath, startDev } from './commands/dev';

const book = { title: 'Notes', url: '/products/notes', price: 9900, compare_at: null, image: { url: 'https://cdn.example/n.png' } };

describe('sample data', () => {
  it('has category collections and locale-aware URLs', () => {
    const en = sampleContext('en', {}, 'ar');
    expect(Object.keys(en.collections)).toEqual(expect.arrayContaining(['featured', 'new', 'gift-cards', 'subscriptions']));
    for (const h of ['featured', 'new', 'gift-cards', 'subscriptions']) expect(en.collections[h]!.products.length).toBeGreaterThanOrEqual(4);
    expect((en.collections['new']!.products[0] as { url: string }).url).toMatch(/^\/en\/products\//);
    expect((sampleContext('ar', {}, 'ar').collections['new']!.products[0] as { url: string }).url).toMatch(/^\/products\//);
  });
  it('adds collections and products, and overrides the store name', () => {
    const ctx = withSampleData(sampleContext('en', {}, 'en'), pickSampleData({ store: { name: 'Pages' }, collections: { ebooks: { title: 'E-books', products: [book] } }, products: { notes: book } }, 'en'));
    expect(ctx.store.name).toBe('Pages');
    expect(ctx.collections.ebooks).toEqual({ title: 'E-books', products: [book] });
    expect(ctx.collections.featured?.products.length).toBe(6);
    expect(ctx.products.notes).toEqual(book);
  });
  it('picks the block for the page locale when split by locale', () => {
    const raw = { ar: { store: { name: 'صفحات' } }, en: { store: { name: 'Pages' } } };
    expect(pickSampleData(raw, 'ar').store).toEqual({ name: 'صفحات' });
    expect(pickSampleData(raw, 'en').store).toEqual({ name: 'Pages' });
    expect(pickSampleData({ ar: { store: { name: 'x' } } }, 'en')).toEqual({});
  });
  it('drops malformed parts instead of throwing', () => {
    expect(pickSampleData(null, 'en')).toEqual({});
    expect(pickSampleData([1], 'en')).toEqual({});
    expect(pickSampleData({ collections: { a: { products: 'no' }, b: 3, c: { title: 1, products: [] } } }, 'en')).toEqual({ collections: { c: { products: [] } } });
  });
  it('finds .sneferu-dev/data.json, prefers --data, and reports a bad file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'snf-data-'));
    expect(sampleDataPath(dir)).toBeUndefined();
    mkdirSync(join(dir, '.sneferu-dev'));
    writeFileSync(join(dir, '.sneferu-dev', 'data.json'), '{ nope');
    expect(sampleDataPath(dir)).toBe(join(dir, '.sneferu-dev', 'data.json'));
    expect(sampleDataPath(dir, join(dir, 'other.json'))).toBe(join(dir, 'other.json'));
    expect(readSampleData(sampleDataPath(dir)).error).toMatch(/data\.json/);
    expect(readSampleData(undefined)).toEqual({ raw: undefined });
  });
});

function get(port: number, path: string): Promise<string> {
  return new Promise((ok, bad) => {
    const r = request({ host: '127.0.0.1', port, path }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => ok(b)); });
    r.on('error', bad); r.end();
  });
}

describe('dev server with sample data', () => {
  let server: Server | undefined;
  afterAll(() => server?.close());
  it('renders a collection from .sneferu-dev/data.json', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'snf-data-srv-'));
    for (const d of ['layout', 'templates', 'locales']) mkdirSync(join(dir, d));
    writeFileSync(join(dir, 'theme.json'), JSON.stringify({ id: 'pages', name: 'Pages', description: 'd', version: '1.0.0', author: 'a', category: 'digital', engine: 'hk2', engineCompatibility: '^2.0.0', defaultLocale: 'en', locales: ['en'], settings: {}, tokens: { colors: { primary: '#111111', secondary: '#222222', accent: '#333333', background: '#FFFFFF', text: '#000000' } } }));
    writeFileSync(join(dir, 'layout', 'theme.sneferu'), '<main><hk-slot name="content" /></main>');
    writeFileSync(join(dir, 'templates', 'index.sneferu'), '<p>{{ store.name }}</p>{% for p in collection(\'ebooks\').products %}<b>{{ p.title }}</b>{% endfor %}');
    writeFileSync(join(dir, 'locales', 'en.json'), '{}');
    mkdirSync(join(dir, '.sneferu-dev'));
    writeFileSync(join(dir, '.sneferu-dev', 'data.json'), JSON.stringify({ store: { name: 'Pages' }, collections: { ebooks: { products: [book] } } }));
    const dev = await startDev(dir, 0);
    server = dev.server;
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const html = await get(port, '/');
    expect(html).toContain('<p>Pages</p>');
    expect(html).toContain('<b>Notes</b>');
    dev.close();
  });
});
