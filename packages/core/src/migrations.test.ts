import { describe, it, expect } from 'vitest';
import { applyMigrations, checkMigrationsShape, MAX_MIGRATION_NODES, type Migration, type MigrationInput } from './migrations';

const M: Migration[] = [
  { from: '1.1.0', to: '1.2.0', settings: { rename: { b_color: 'c_color' } }, sections: { remove: ['old_banner'] } },
  { from: '1.0.0', to: '1.1.0', settings: { rename: { a_color: 'b_color' }, remove: ['dead'] }, sections: { rename: { hero_v1: 'hero' } }, blocks: { rename: { btn: 'button' }, remove: ['spark'] } },
];
const input = (): MigrationInput => ({
  settings: { a_color: '#111', dead: 1, keep: 'k' },
  pages: { index: [
    { id: 's1', type: 'hero_v1', props: { a_color: 'red', title: 'T' }, children: [{ id: 'b1', type: 'btn', props: { a_color: 'x' } }, { id: 'b2', type: 'spark' }, { id: 'b3', type: 'btn', children: [{ id: 'b4', type: 'btn' }] }] },
    { id: 's2', type: 'old_banner' }, { id: 's3', type: 'custom', props: { z: 1 } },
  ] },
  groups: { header: [{ id: 'h', type: 'hero_v1', props: { a_color: 'g' } }] },
});

describe('applyMigrations', () => {
  it('chains 1.0 -> 1.1 -> 1.2 and reports every change', () => {
    const inp = input();
    const { output, report } = applyMigrations(inp, M, '1.0.0', '1.2.0');
    expect(output.settings).toEqual({ c_color: '#111', keep: 'k' });
    const s1 = output.pages.index![0]!;
    expect(s1.type).toBe('hero');
    expect(s1.props).toEqual({ c_color: 'red', title: 'T' });
    expect(s1.children!.map((b) => b.type)).toEqual(['button', 'button']);
    expect(s1.children![1]!.children![0]!.type).toBe('button');
    expect(output.pages.index!.map((n) => n.id)).toEqual(['s1', 's3']);
    expect(output.groups!.header![0]).toEqual({ id: 'h', type: 'hero', props: { c_color: 'g' } });
    expect(report.dropped.map((d) => d.path).sort()).toEqual(['pages.index[0].children[1]', 'pages.index[1]', 'settings.dead'].sort());
    expect(report.migrated).toContainEqual({ path: 'pages.index[0].type', from: 'hero_v1', to: 'hero' });
    expect(report.migrated).toContainEqual({ path: 'settings.a_color', from: 'a_color', to: 'b_color' });
    expect(report.kept).toBe(1 + 2 + 1 + 1 + 1); // s1, b1, b3, b4, s3 ... plus header
    expect(report.missingPath).toBe(false);
  });
  it('never mutates the input and shares nothing', () => {
    const inp = input(); const snap = JSON.stringify(inp);
    const { output } = applyMigrations(inp, M, '1.0.0', '1.2.0');
    expect(JSON.stringify(inp)).toBe(snap);
    output.pages.index![1]!.props!.z = 2;
    expect(JSON.stringify(inp)).toBe(snap);
  });
  it('applies only the steps from the installed version on', () => {
    const { output } = applyMigrations({ settings: { b_color: 'x' }, pages: {} }, M, '1.1.0', '1.2.0');
    expect(output.settings).toEqual({ c_color: 'x' });
    const r = applyMigrations({ settings: { a_color: 'x' }, pages: {} }, M, '1.1.0', '1.2.0');
    expect(r.output.settings).toEqual({ a_color: 'x' });
  });
  it('stops at the target version', () => {
    const { output } = applyMigrations(input(), M, '1.0.0', '1.1.0');
    expect(output.settings).toEqual({ b_color: '#111', keep: 'k' });
    expect(output.pages.index!.map((n) => n.type)).toEqual(['hero', 'old_banner', 'custom']);
  });
  it('reports a missing chain and returns the input unchanged', () => {
    const inp = input();
    const { output, report } = applyMigrations(inp, M, '0.5.0', '0.9.0');
    expect(report.missingPath).toBe(true);
    expect(output).toEqual(inp);
    expect(output).not.toBe(inp);
    expect(applyMigrations(inp, [], '1.0.0', '1.1.0').report.missingPath).toBe(false);
    expect(applyMigrations(inp, M, '1.2.0', '1.2.0').report.missingPath).toBe(false);
  });
  it('leaves unknown keys and types alone', () => {
    const inp: MigrationInput = { settings: { x: 1 }, pages: { p: [{ id: 'a', type: 'unknown', props: { q: 1 }, children: [{ id: 'b', type: 'mystery' }] }] } };
    const { output, report } = applyMigrations(inp, M, '1.0.0', '1.2.0');
    expect(output).toEqual(inp);
    expect(report.migrated).toEqual([]);
    expect(report.dropped).toEqual([]);
  });
  it('is idempotent', () => {
    const once = applyMigrations(input(), M, '1.0.0', '1.2.0').output;
    const twice = applyMigrations(once, M, '1.0.0', '1.2.0');
    expect(twice.output).toEqual(once);
    expect(twice.report.migrated).toEqual([]);
    expect(twice.report.dropped).toEqual([]);
  });
  it('keeps a value already under the new name and says so', () => {
    const { output, report } = applyMigrations({ settings: { a_color: 'old', b_color: 'new' }, pages: {} }, M, '1.0.0', '1.1.0');
    expect(output.settings).toEqual({ b_color: 'new' });
    expect(report.dropped.some((d) => d.path === 'settings.a_color')).toBe(true);
  });
  it('is prototype-safe', () => {
    const evil = JSON.parse('{"settings":{"__proto__":{"polluted":1},"a_color":"x"},"pages":{"__proto__":[{"id":"a","type":"hero_v1","props":{"__proto__":{"p":1},"a_color":"y"}}]}}') as MigrationInput;
    const ms = JSON.parse('[{"from":"1.0.0","to":"1.1.0","settings":{"rename":{"__proto__":"x","toString":"y","a_color":"b_color"}},"sections":{"rename":{"constructor":"z"}}}]') as Migration[];
    const { output } = applyMigrations(evil, ms, '1.0.0', '1.1.0');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).p).toBeUndefined();
    expect(Object.getPrototypeOf(output.settings)).toBe(Object.prototype);
    expect(output.settings.b_color).toBe('x');
    expect(output.pages.index).toBeUndefined();
    const n = Object.getOwnPropertyDescriptor(output.pages, '__proto__')!.value[0];
    expect(n.type).toBe('hero_v1');
    expect(n.props.b_color).toBe('y');
    // lookups never reach inherited names
    const r = applyMigrations({ settings: { toString: 1, constructor: 2 }, pages: { p: [{ id: 'a', type: 'constructor' }, { id: 'b', type: 'toString' }] } }, [{ from: '1.0.0', to: '1.1.0' }], '1.0.0', '1.1.0');
    expect(r.output.pages.p!.map((x) => x.type)).toEqual(['constructor', 'toString']);
  });
  it('is bounded', () => {
    const many = Array.from({ length: MAX_MIGRATION_NODES + 1 }, (_, i) => ({ id: `n${i}`, type: 'hero_v1' }));
    const r = applyMigrations({ settings: {}, pages: { p: many } }, M, '1.0.0', '1.2.0');
    expect(r.report.tooLarge).toBe(true);
    expect(r.output.pages.p![0]!.type).toBe('hero_v1');
    let deep: { id: string; type: string; children?: unknown[] } = { id: 'x', type: 'hero_v1' };
    for (let i = 0; i < 30; i++) deep = { id: 'x', type: 'btn', children: [deep] };
    expect(applyMigrations({ settings: {}, pages: { p: [deep as never] } }, M, '1.0.0', '1.2.0').report.tooLarge).toBe(true);
    const ok = Array.from({ length: MAX_MIGRATION_NODES }, (_, i) => ({ id: `n${i}`, type: 'hero_v1' }));
    expect(applyMigrations({ settings: {}, pages: { p: ok } }, M, '1.0.0', '1.2.0').report.tooLarge).toBe(false);
  });
  it('skips malformed stored migrations instead of throwing', () => {
    const junk = [null, 5, 'x', [], { from: 1, to: 2 }, { from: 'a', to: 'b' }, { from: '1.1.0', to: '1.0.0' }, { from: '1.0.0', to: '1.1.0', settings: { rename: 'no' } },
      { from: '1.0.0', to: '1.1.0', settings: { rename: { a: 5 } } }, { from: '1.0.0', to: '1.1.0', blocks: { remove: [1] } }, { from: '1.0.0', to: '1.1.0', sections: null }] as unknown as Migration[];
    const r = applyMigrations(input(), [...junk, ...M], '1.0.0', '1.2.0');
    expect(r.output.settings).toEqual({ c_color: '#111', keep: 'k' });
    expect(applyMigrations(input(), junk, '1.0.0', '1.2.0').report.missingPath).toBe(false);
    expect(() => applyMigrations(input(), null as never, '1.0.0', '1.2.0')).not.toThrow();
  });
  it('validates the stored shape', () => {
    expect(checkMigrationsShape(undefined)).toEqual([]);
    expect(checkMigrationsShape(M)).toEqual([]);
    expect(checkMigrationsShape('x').map((d) => d.code)).toEqual(['SN9015']);
    expect(checkMigrationsShape([null, { from: '1.0.0', to: '1.1.0' }, { from: 'x' }]).length).toBe(2);
  });
  it('does not copy an oversized or too deeply nested input', () => {
    const many = Array.from({ length: MAX_MIGRATION_NODES + 1 }, (_, i) => ({ id: `n${i}`, type: 'hero_v1' }));
    const big = { settings: {}, pages: { p: many } };
    expect(applyMigrations(big, M, '1.0.0', '1.2.0').output).toBe(big);
    let v: unknown = 1; for (let i = 0; i < 40; i++) v = { v };
    const r = applyMigrations({ settings: { deep: v }, pages: {} }, M, '1.0.0', '1.2.0');
    expect(r.report.tooLarge).toBe(true);
    expect(r.report.migrated).toEqual([]);
  });
  it('a colliding setting is dropped, not also migrated', () => {
    const { report } = applyMigrations({ settings: { a_color: 'o', b_color: 'n' }, pages: {} }, M, '1.0.0', '1.1.0');
    expect(report.migrated.some((m) => m.path === 'settings.a_color')).toBe(false);
  });
});
