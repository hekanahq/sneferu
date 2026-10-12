import {
  createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind, DiagnosticSeverity, CodeActionKind,
  type Diagnostic, type InitializeParams, type CodeAction, type TextEdit, type WorkspaceEdit,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dataJson from '../generated/data.json';
import { complete } from './completion';
import { tagPair } from './context';
import { hover } from './hover';
import { definition, links } from './navigation';
import { checkTheme, type Problem } from './diagnostics';
import { formatDocument } from './format';
import { findThemeRoot, indexTheme, type ThemeIndex } from './theme';
import { checkUrl, diagnosticUrl, type LangData } from './types';
import { codeDoc } from './docs';
import { isTemplateFile } from '@hekana/sneferu-core';

const data = dataJson as unknown as LangData;
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

interface Settings { diagnostics: { delay: number }; checks: { enable: boolean; disabled: string[]; assetSizeWarnKb: number } }
let settings: Settings = { diagnostics: { delay: 250 }, checks: { enable: true, disabled: [], assetSizeWarnKb: 500 } };
let workspaceRoots: string[] = [];
/** theme root → URIs we published problems for, so stale ones get cleared */
const published = new Map<string, Set<string>>();
const timers = new Map<string, NodeJS.Timeout>();
const lastProblems = new Map<string, Problem[]>();

const pathOf = (uri: string) => (uri.startsWith('file:') ? fileURLToPath(uri) : uri);
const uriOf = (abs: string) => pathToFileURL(abs).href;
const relOf = (root: string, abs: string) => relative(root, abs).split(sep).join('/');

function overlay(): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of documents.all()) if (d.uri.startsWith('file:')) m.set(pathOf(d.uri), d.getText());
  return m;
}

const rootCache = new Map<string, string | undefined>();
function rootOf(abs: string): string | undefined {
  if (!rootCache.has(abs)) rootCache.set(abs, findThemeRoot(abs));
  return rootCache.get(abs);
}

/** Every hk2 theme in the workspace folders (theme.json up to 4 levels down). */
function discoverRoots(): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    if (depth > 4) return;
    const m = join(d, 'theme.json');
    if (existsSync(m)) { try { if (/"engine"\s*:\s*"hk2"/.test(readFileSync(m, 'utf8'))) { out.push(d); return; } } catch { /* skip */ } }
    let names: string[] = [];
    try { names = readdirSync(d); } catch { return; }
    for (const n of names) {
      if (n.startsWith('.') || n === 'node_modules' || n === 'dist') continue;
      const p = join(d, n);
      try { if (statSync(p).isDirectory()) walk(p, depth + 1); } catch { /* skip */ }
    }
  };
  for (const r of workspaceRoots) walk(r, 0);
  return out;
}

const SEVERITY = { error: DiagnosticSeverity.Error, warning: DiagnosticSeverity.Warning, info: DiagnosticSeverity.Information, hint: DiagnosticSeverity.Hint };

/** The open document for a path. Compared as paths, not URI strings: Windows drive letters and escaping differ between the two. */
const samePath = (a: string, b: string) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
function openDoc(abs: string): TextDocument | undefined {
  return documents.all().find((d) => d.uri.startsWith('file:') && samePath(pathOf(d.uri), abs));
}

function textOf(root: string, rel: string): TextDocument {
  const abs = join(root, ...rel.split('/'));
  const open = openDoc(abs);
  if (open) return open;
  let t = '';
  try { t = /\.(sneferu|json|css|svg|txt|md)$/.test(rel) ? readFileSync(abs, 'utf8') : ''; } catch { /* gone */ }
  return TextDocument.create(uriOf(abs), 'plaintext', 0, t);
}

function runCheck(root: string): Problem[] {
  const { problems } = checkTheme(root, overlay(), { checks: settings.checks.enable, disabled: settings.checks.disabled, assetSizeWarnKb: settings.checks.assetSizeWarnKb });
  lastProblems.set(root, problems);
  const byUri = new Map<string, Diagnostic[]>();
  for (const p of problems) {
    const doc = textOf(root, p.rel);
    const d: Diagnostic = {
      range: { start: doc.positionAt(p.start), end: doc.positionAt(Math.max(p.end, p.start)) },
      severity: SEVERITY[p.severity], code: p.code, source: p.source, message: p.message,
      codeDescription: { href: p.source === 'sneferu' ? diagnosticUrl(p.code) : checkUrl(p.code) },
      ...(p.data ? { data: { ...p.data, rel: p.rel, root } } : { data: { rel: p.rel, root } }),
    };
    const uri = doc.uri;
    if (!byUri.has(uri)) byUri.set(uri, []);
    byUri.get(uri)!.push(d);
  }
  const before = published.get(root) ?? new Set<string>();
  for (const uri of before) if (!byUri.has(uri)) void connection.sendDiagnostics({ uri, diagnostics: [] });
  for (const [uri, diagnostics] of byUri) void connection.sendDiagnostics({ uri, diagnostics });
  published.set(root, new Set(byUri.keys()));
  return problems;
}

function schedule(root: string | undefined, delay = settings.diagnostics.delay) {
  if (!root) return;
  clearTimeout(timers.get(root));
  timers.set(root, setTimeout(() => { timers.delete(root); try { runCheck(root); } catch (e) { connection.console.error(`sneferu check failed: ${(e as Error).stack ?? e}`); } }, delay));
}

/** The language environment for a request on an open document. */
function envFor(uri: string, offset: number) {
  const doc = documents.get(uri);
  if (!doc) return undefined;
  const abs = pathOf(uri);
  const root = rootOf(abs);
  const theme: ThemeIndex | undefined = root ? indexTheme(root, overlay()) : undefined;
  return { data, theme, rel: root ? relOf(root, abs) : undefined, text: doc.getText(), offset, doc, root };
}

connection.onInitialize((params: InitializeParams) => {
  workspaceRoots = (params.workspaceFolders ?? []).map((f) => pathOf(f.uri));
  if (!workspaceRoots.length && params.rootUri) workspaceRoots = [pathOf(params.rootUri)];
  const init = params.initializationOptions as { settings?: Partial<Settings> } | undefined;
  if (init?.settings) settings = { ...settings, ...init.settings };
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ['<', ' ', '.', '|', "'", '"', '{', '%', '-'] },
      hoverProvider: true,
      definitionProvider: true,
      documentLinkProvider: { resolveProvider: false },
      documentFormattingProvider: true,
      codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
      linkedEditingRangeProvider: true,
    },
    serverInfo: { name: 'sneferu-language-server' },
  };
});

connection.onInitialized(() => {
  for (const r of discoverRoots()) schedule(r, 50);
});

connection.onDidChangeConfiguration((p) => {
  const s = (p.settings as { sneferu?: Partial<Settings> } | undefined)?.sneferu;
  if (s) settings = { diagnostics: { ...settings.diagnostics, ...s.diagnostics }, checks: { ...settings.checks, ...s.checks } };
  for (const r of published.keys()) schedule(r, 10);
});

documents.onDidChangeContent((e) => schedule(rootOf(pathOf(e.document.uri))));
documents.onDidClose((e) => schedule(rootOf(pathOf(e.document.uri))));
connection.onDidChangeWatchedFiles((p) => {
  rootCache.clear();
  const roots = new Set<string>();
  for (const c of p.changes) { const r = findThemeRoot(pathOf(c.uri)); if (r) roots.add(r); }
  for (const r of roots) schedule(r, 100);
});

connection.onCompletion((p) => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc) return [];
  const env = envFor(p.textDocument.uri, doc.offsetAt(p.position));
  return env ? complete(env) : [];
});

connection.onHover((p) => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc) return null;
  const env = envFor(p.textDocument.uri, doc.offsetAt(p.position));
  if (!env) return null;
  const h = hover(env);
  if (h) return { contents: { kind: 'markdown', value: h.markdown }, range: { start: doc.positionAt(h.start), end: doc.positionAt(h.end) } };
  // an SN code written in a comment or a doc: explain it
  const line = doc.getText({ start: { line: p.position.line, character: 0 }, end: { line: p.position.line + 1, character: 0 } });
  const code = [...line.matchAll(/SN\d{4}/g)].find((m) => p.position.character >= m.index! && p.position.character <= m.index! + 6)?.[0];
  const md = code && codeDoc(data, code);
  return md ? { contents: { kind: 'markdown', value: md } } : null;
});

connection.onDefinition((p) => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc) return [];
  const env = envFor(p.textDocument.uri, doc.offsetAt(p.position));
  if (!env?.root) return [];
  return definition(env).map((t) => {
    const td = textOf(env.root!, t.rel);
    return { uri: td.uri, range: { start: td.positionAt(t.offset), end: td.positionAt(t.offset + t.length) } };
  });
});

connection.onDocumentLinks((p) => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc || !isTemplateFile(doc.uri)) return [];
  const abs = pathOf(doc.uri);
  const root = rootOf(abs);
  if (!root) return [];
  const theme = indexTheme(root, overlay());
  return links(doc.getText(), relOf(root, abs), theme).map((l) => ({
    range: { start: doc.positionAt(l.offset), end: doc.positionAt(l.offset + l.length) },
    target: uriOf(join(root, ...l.rel.split('/'))),
  }));
});

connection.onDocumentFormatting(async (p) => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc) return [];
  const abs = pathOf(doc.uri);
  const text = doc.getText();
  const out = await formatDocument(abs, text, { root: rootOf(abs) });
  if (out === undefined || out === text) return [];
  return [{ range: { start: { line: 0, character: 0 }, end: doc.positionAt(text.length) }, newText: out }];
});

/** An edit adding `"key": "value"` as the last entry of a flat JSON object. */
function appendKey(doc: TextDocument, key: string, value: string): TextEdit | undefined {
  const t = doc.getText();
  const close = t.lastIndexOf('}');
  if (close < 0) return undefined;
  let i = close - 1;
  while (i >= 0 && /\s/.test(t[i]!)) i--;
  const entry = `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  const at = doc.positionAt(i + 1);
  return t[i] === '{' ? { range: { start: at, end: at }, newText: `\n  ${entry}\n` } : { range: { start: at, end: at }, newText: `,\n  ${entry}` };
}

connection.onCodeAction((p) => {
  const actions: CodeAction[] = [];
  for (const d of p.context.diagnostics) {
    const info = d.data as { rel?: string; root?: string; key?: string; value?: string; to?: string; tag?: string } | undefined;
    if (!info?.root) continue;
    if (d.code === 'MatchingTranslations' && info.key && info.to) {
      const target = textOf(info.root, info.to);
      const edit = appendKey(target, info.key, info.value ?? '');
      if (edit) actions.push({ title: `Add "${info.key}" to ${info.to} (copy of the text, to translate)`, kind: CodeActionKind.QuickFix, diagnostics: [d], edit: { changes: { [target.uri]: [edit] } } });
    }
    if (d.code === 'TranslationKeyExists' && info.key) {
      const theme = indexTheme(info.root, overlay());
      const changes: WorkspaceEdit['changes'] = {};
      for (const code of theme.locales.keys()) {
        const target = textOf(info.root, `locales/${code}.json`);
        const edit = appendKey(target, info.key, info.key);
        if (edit) changes[target.uri] = [edit];
      }
      if (Object.keys(changes).length) actions.push({ title: `Add "${info.key}" to every locale file`, kind: CodeActionKind.QuickFix, diagnostics: [d], edit: { changes }, isPreferred: true });
    }
    if (d.code === 'ImgAltText' && info.tag) {
      const at = { line: d.range.start.line, character: d.range.start.character + 1 + info.tag.length };
      actions.push({ title: 'Add alt text', kind: CodeActionKind.QuickFix, diagnostics: [d], edit: { changes: { [p.textDocument.uri]: [{ range: { start: at, end: at }, newText: ' alt=""' }] } } });
    }
  }
  return actions;
});

connection.languages.onLinkedEditingRange((p) => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc) return null;
  const r = tagPair(doc.getText(), doc.offsetAt(p.position));
  return r ? { ranges: r.map(([s, e]) => ({ start: doc.positionAt(s), end: doc.positionAt(e) })), wordPattern: '[a-zA-Z][\\w-]*' } : null;
});

/** Custom requests used by the extension's commands. */
connection.onRequest('sneferu/check', (params: { root: string }) => {
  const problems = runCheck(params.root);
  return {
    errors: problems.filter((p) => p.severity === 'error').length,
    warnings: problems.filter((p) => p.severity === 'warning').length,
    problems: problems.map((p) => ({ rel: p.rel, code: p.code, severity: p.severity, message: p.message })),
  };
});
connection.onRequest('sneferu/roots', () => discoverRoots());
connection.onRequest('sneferu/formatFile', async (params: { path: string; root?: string }) => {
  const text = readFileSync(params.path, 'utf8');
  const out = await formatDocument(params.path, text, { root: params.root });
  return { changed: out !== undefined && out !== text, text: out, failed: out === undefined };
});

documents.listen(connection);
connection.listen();
