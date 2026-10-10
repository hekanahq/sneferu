export const ENGINE_VERSION = '2.0.0';
export const IR_VERSION = 'sneferu/ir@1';
export const MANIFEST_SCHEMA = 'sneferu/manifest@1';
export const LIMITS = {
  loopDefault: 50, loopMax: 250, includeDepth: 8,
  renderDepth: 64, renderNodes: 20_000, outputChars: 1_500_000, loopIterations: 2_000,
  files: 400, totalBytes: 25 * 1024 * 1024, assetBytes: 2 * 1024 * 1024, templateBytes: 300 * 1024,
} as const;
export const FILTERS = ['money', 'img', 'date', 't', 'escape', 'upcase', 'downcase', 'truncate', 'default', 'size', 'first', 'last', 'join', 'json_attr'] as const;
export const LOOKUPS = ['collection', 'product', 't', 'settings', 'asset_url'] as const;
export type FilterName = (typeof FILTERS)[number];
export type LookupName = (typeof LOOKUPS)[number];
