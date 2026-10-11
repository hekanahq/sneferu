import * as vscode from 'vscode';
import { LanguageClient, TransportKind, type LanguageClientOptions, type ServerOptions } from 'vscode-languageclient/node';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { DevServer, type DevState } from './dev-server';
import { previewHtml } from './preview-html';
import { manifestOf, resolveCli, sourceFor } from './reveal';
import { closingTagFor } from '../server/context';

let client: LanguageClient | undefined;
let dev: DevServer | undefined;
let panel: vscode.WebviewPanel | undefined;
let output: vscode.OutputChannel;
let status: vscode.StatusBarItem;
let ctx: vscode.ExtensionContext;

const cfg = () => vscode.workspace.getConfiguration('sneferu');

function serverSettings() {
  const c = cfg();
  return {
    diagnostics: { delay: c.get<number>('diagnostics.delay', 250) },
    checks: { enable: c.get<boolean>('checks.enable', true), disabled: c.get<string[]>('checks.disabled', []), assetSizeWarnKb: c.get<number>('checks.assetSizeWarnKb', 500) },
  };
}

function isThemeRoot(dir: string): boolean {
  try { return /"engine"\s*:\s*"hk2"/.test(readFileSync(join(dir, 'theme.json'), 'utf8')); } catch { return false; }
}

function rootAbove(file: string): string | undefined {
  let d = dirname(file);
  for (let i = 0; i < 12; i++) {
    if (isThemeRoot(d)) return d;
    const up = dirname(d);
    if (up === d) return undefined;
    d = up;
  }
  return undefined;
}

/** The theme to act on: the one holding the active file, else the only one, else ask. */
async function pickRoot(): Promise<string | undefined> {
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active?.scheme === 'file') { const r = rootAbove(active.fsPath); if (r) return r; }
  const found = await vscode.workspace.findFiles('**/theme.json', '**/{node_modules,dist,.git}/**', 50);
  const roots = [...new Set(found.map((u) => dirname(u.fsPath)).filter(isThemeRoot))].sort();
  if (roots.length === 1) return roots[0];
  if (!roots.length) { void vscode.window.showWarningMessage('No Sneferu theme found: open a folder with a theme.json whose engine is "hk2".'); return undefined; }
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const pick = await vscode.window.showQuickPick(roots.map((r) => ({ label: relative(ws, r) || '.', description: manifestOf(r).id, root: r })), { placeHolder: 'Which theme?' });
  return pick?.root;
}

function cliFor(root: string) {
  const bundled = ctx.asAbsolutePath(join('dist', 'cli', 'cli.mjs'));
  return resolveCli(root, bundled, cfg().get<string>('cliPath') || undefined);
}

/** Runs a CLI command for a theme, output to the Sneferu channel. */
function runCli(root: string, args: string[], title: string): Promise<number> {
  const cli = cliFor(root);
  output.appendLine(`\n$ sneferu ${args.join(' ')}  (${cli.origin} CLI)`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli.path, ...args], { cwd: root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '0' }, windowsHide: true });
    child.stdout.on('data', (b: Buffer) => output.append(b.toString()));
    child.stderr.on('data', (b: Buffer) => output.append(b.toString()));
    child.on('error', (e) => { output.appendLine(e.message); resolve(1); });
    child.on('exit', (code) => {
      const ok = code === 0;
      void (ok ? vscode.window.showInformationMessage(`Sneferu: ${title} done.`, 'Show output') : vscode.window.showErrorMessage(`Sneferu: ${title} failed.`, 'Show output'))
        .then((a) => { if (a) output.show(true); });
      resolve(code ?? 1);
    });
  });
}

/** Commands that talk to the user (login opens a browser) run in a terminal. */
function runInTerminal(root: string, args: string[], name: string) {
  const cli = cliFor(root);
  const term = vscode.window.createTerminal({ name: `Sneferu: ${name}`, cwd: root, shellPath: process.execPath, shellArgs: [cli.path, ...args], env: { ELECTRON_RUN_AS_NODE: '1' } });
  term.show();
}

function setStatus(s: DevState) {
  if (s.s === 'stopped') { status.text = '$(debug-start) Sneferu'; status.tooltip = 'Sneferu dev server: stopped. Click to open the preview.'; status.command = 'sneferu.openPreview'; }
  else if (s.s === 'starting') { status.text = '$(sync~spin) Sneferu'; status.tooltip = 'Sneferu dev server: starting'; status.command = undefined; }
  else if (s.s === 'running') { status.text = `$(broadcast) Sneferu :${s.port}`; status.tooltip = `Sneferu dev server on http://127.0.0.1:${s.port} for ${s.root}. Click to stop.`; status.command = 'sneferu.stopPreview'; }
  else { status.text = '$(error) Sneferu'; status.tooltip = `Sneferu dev server failed: ${s.message}. Click to retry.`; status.command = 'sneferu.openPreview'; }
  status.show();
}

const templatesOf = (root: string) => {
  try { return readdirSync(join(root, 'templates')).filter((f) => f.endsWith('.sneferu')).map((f) => f.slice(0, -8)).sort((a, b) => (a === 'index' ? -1 : b === 'index' ? 1 : a.localeCompare(b))); } catch { return ['index']; }
};

async function openPreview() {
  const root = await pickRoot();
  if (!root) return;
  const data = cfg().get<string>('preview.dataFile') || undefined;
  const st = await dev!.start(root, cliFor(root).path, { port: cfg().get<number>('preview.port', 4100), ...(data ? { data: join(root, data) } : {}) });
  if (st.s !== 'running') {
    const a = await vscode.window.showErrorMessage(`Sneferu: the dev server did not start${st.s === 'failed' ? `: ${st.message}` : ''}.`, 'Show output');
    if (a) output.show(true);
    return;
  }
  const external = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${st.proxyPort}`));
  const m = manifestOf(root);
  if (!panel) {
    panel = vscode.window.createWebviewPanel('sneferu.preview', 'Sneferu Preview', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, { enableScripts: true, retainContextWhenHidden: true });
    panel.iconPath = vscode.Uri.file(ctx.asAbsolutePath('media/file-icon.svg'));
    panel.onDidDispose(() => { panel = undefined; });
    panel.webview.onDidReceiveMessage(async (msg: { type: string; section?: string; block?: string; path?: string; url?: string }) => {
      if (msg.type === 'openExternal' && msg.url) void vscode.env.openExternal(vscode.Uri.parse(msg.url));
      if (msg.type === 'reveal' && dev?.state.s === 'running') {
        const src = sourceFor(dev.state.root, { section: msg.section, block: msg.block, path: msg.path ?? '/' });
        if (existsSync(src.file)) {
          const doc = await vscode.workspace.openTextDocument(src.file);
          await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
          vscode.window.setStatusBarMessage(`Sneferu: ${src.reason}`, 3000);
        }
      }
    });
  }
  panel.title = `Preview: ${m.id ?? 'theme'}`;
  panel.webview.html = previewHtml({
    origin: external.toString(true).replace(/\/$/, ''), locales: m.locales.length ? m.locales : ['en'], locale: m.defaultLocale ?? m.locales[0] ?? 'en',
    templates: templatesOf(root), nonce: randomBytes(16).toString('base64'), cspSource: panel.webview.cspSource,
  });
  panel.reveal(vscode.ViewColumn.Beside, true);
}

export async function activate(context: vscode.ExtensionContext): Promise<typeof _test> {
  ctx = context;
  output = vscode.window.createOutputChannel('Sneferu');
  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  status.name = 'Sneferu dev server';
  dev = new DevServer(process.execPath, (l) => output.appendLine(l));
  dev.onState(setStatus);
  setStatus(dev.state);
  context.subscriptions.push(output, status, { dispose: () => dev?.stop() });

  const serverModule = context.asAbsolutePath(join('dist', 'server.js'));
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6011'] } },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'sneferu' },
      { scheme: 'file', language: 'json', pattern: '**/theme.json' },
      { scheme: 'file', language: 'json', pattern: '**/locales/*.json' },
    ],
    synchronize: {
      configurationSection: 'sneferu',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/{*.sneferu,theme.json,locales/*.json,assets/**}'),
    },
    initializationOptions: { settings: serverSettings() },
  };
  client = new LanguageClient('sneferu', 'Sneferu Language Server', serverOptions, clientOptions);
  await client.start();

  const reg = (id: string, fn: () => unknown) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  reg('sneferu.openPreview', openPreview);
  reg('sneferu.stopPreview', () => { dev?.stop(); });
  reg('sneferu.restartServer', async () => { await client?.restart(); });
  reg('sneferu.validateTheme', async () => {
    const root = await pickRoot();
    if (!root || !client) return;
    const r = await client.sendRequest<{ errors: number; warnings: number; problems: { rel: string; code: string; severity: string; message: string }[] }>('sneferu/check', { root });
    output.appendLine(`\nValidate ${root}`);
    for (const p of r.problems) output.appendLine(`${p.rel} ${p.severity} ${p.code} ${p.message}`);
    const msg = r.errors ? `Sneferu: ${r.errors} error${r.errors > 1 ? 's' : ''}, ${r.warnings} warning${r.warnings === 1 ? '' : 's'}.` : `Sneferu: the theme is valid${r.warnings ? ` (${r.warnings} warning${r.warnings > 1 ? 's' : ''})` : ''}.`;
    const a = await (r.errors ? vscode.window.showErrorMessage(msg, 'Show problems') : vscode.window.showInformationMessage(msg, ...(r.warnings ? ['Show problems'] : [])));
    if (a) await vscode.commands.executeCommand('workbench.actions.view.problems');
  });
  reg('sneferu.formatTheme', async () => {
    const root = await pickRoot();
    if (!root) return;
    const dirty = vscode.workspace.textDocuments.filter((d) => d.isDirty && d.uri.fsPath.startsWith(root));
    if (dirty.length) await vscode.workspace.saveAll(false);
    await runCli(root, ['format', root], 'format');
  });
  reg('sneferu.build', async () => { const root = await pickRoot(); if (root) await runCli(root, ['build', root, '--out', join(root, 'dist')], 'build'); });
  reg('sneferu.push', async () => {
    const root = await pickRoot();
    if (!root) return;
    const id = manifestOf(root).id;
    if (!id) { void vscode.window.showErrorMessage('Sneferu: theme.json has no id.'); return; }
    const go = await vscode.window.showWarningMessage(`Push "${id}" to Hekana and publish it on your dev store?`, { modal: true, detail: 'Uses the developer key saved by Sneferu: Log In (or HEKANA_TOKEN).' }, 'Push');
    if (go === 'Push') runInTerminal(root, ['push', root, '--package', id, '--dev-store'], 'push');
  });
  reg('sneferu.login', async () => { const root = (await pickRoot()) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; if (root) runInTerminal(root, ['login'], 'login'); });
  reg('sneferu.whoami', async () => { const root = (await pickRoot()) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; if (root) runInTerminal(root, ['whoami'], 'whoami'); });

  // auto-close tags: typing `>` after `<hk-stack …` adds `</hk-stack>`, like the HTML editor
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
    const editor = vscode.window.activeTextEditor;
    if (e.document.languageId !== 'sneferu' || editor?.document !== e.document || e.contentChanges.length !== 1) return;
    if (e.reason === vscode.TextDocumentChangeReason.Undo || e.reason === vscode.TextDocumentChangeReason.Redo) return;
    const c = e.contentChanges[0]!;
    if (c.text !== '>' || !vscode.workspace.getConfiguration('html', e.document).get<boolean>('autoClosingTags', true)) return;
    const at = c.range.start.translate(0, 1);
    const doc = e.document;
    const before = doc.getText(new vscode.Range(new vscode.Position(Math.max(0, at.line - 40), 0), at));
    const after = doc.getText(new vscode.Range(at, at.translate(0, 0).with(at.line, at.character + 200)));
    const close = closingTagFor(before, after);
    if (close) void editor.insertSnippet(new vscode.SnippetString(`$0${close}`), at, { undoStopBefore: false, undoStopAfter: false });
  }));

  let reloadTimer: NodeJS.Timeout | undefined;
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((d) => {
    if (!panel || dev?.state.s !== 'running' || !cfg().get<boolean>('preview.reloadOnSave', true)) return;
    if (!d.uri.fsPath.startsWith(dev.state.root)) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => { void panel?.webview.postMessage({ type: 'reload' }); }, 600);
  }));
  return _test;
}

export async function deactivate() {
  dev?.stop();
  await client?.stop();
}

/** For the extension tests. */
export const _test = { get dev() { return dev; }, get panel() { return panel; }, get client() { return client; } };
