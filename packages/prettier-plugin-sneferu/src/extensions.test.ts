import { describe, expect, it } from 'vitest';
import * as prettier from 'prettier';
import plugin from './index';

describe('file extensions', () => {
  it('registers .snf and keeps .sneferu', () => {
    expect(plugin.languages?.[0]?.extensions).toEqual(['.snf', '.sneferu']);
  });
  it('prettier picks the sneferu parser from either file name', async () => {
    const src = '<div><p>{{a|upcase}}</p></div>';
    const bySnf = await prettier.format(src, { filepath: 'sections/hero.snf', plugins: [plugin] });
    const byOld = await prettier.format(src, { filepath: 'sections/hero.sneferu', plugins: [plugin] });
    expect(bySnf).toBe(byOld);
    expect(bySnf).toContain('{{ a | upcase }}');
    const info = await prettier.getFileInfo('sections/hero.snf', { plugins: [plugin] });
    expect(info.inferredParser).toBe('sneferu');
  });
});
