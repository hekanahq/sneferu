import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { renderPage, type ArtifactLike } from './page';
// the CLI's sample data: the same context the 0.2 fixture was rendered with
import { sampleContext } from '../../sneferu/src/sample-data';

const fx = (n: string) => readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), 'utf8');

/** The 0.2 compatibility guarantee: a 0.2 artifact renders the same HTML under every later runtime. */
describe('0.2 golden fixture', () => {
  it('renders the starter 0.2 artifact to the saved HTML', () => {
    const artifact = JSON.parse(fx('starter-0.2.artifact.json')) as ArtifactLike & { locales: Record<string, Record<string, string>> };
    const registry = createDefaultRegistry();
    const dl = (artifact.manifest.defaultLocale ?? 'ar') as 'ar' | 'en';
    const r = renderPage(artifact, { template: 'index', ctx: sampleContext('ar', artifact.locales, dl), registry });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toBe(fx('starter-0.2.ar.html'));
  });
});
