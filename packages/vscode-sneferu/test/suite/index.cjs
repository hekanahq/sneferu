// The extension tests, run inside VS Code by @vscode/test-electron (test/run-e2e.mjs).
// Plain assertions, no test framework: run() rejects on the first failure.
const vscode = require('vscode');
const assert = require('node:assert/strict');
const { execFileSync, execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const work = process.env.SNEFERU_E2E_WORK;
const shots = process.env.SNEFERU_SHOTS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`  e2e: ${m}`);

async function until(what, fn, ms = 20000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(150);
  }
}

/** A screenshot of the whole X display (Xvfb), when SNEFERU_SHOTS is set. */
async function shot(name, settle = 1200) {
  if (!shots) return;
  await vscode.commands.executeCommand('notifications.clearAll');
  await sleep(settle);
  mkdirSync(shots, { recursive: true });
  try { execFileSync('import', ['-window', 'root', join(shots, `${name}.png`)], { env: process.env }); log(`screenshot ${name}`); } catch (e) { log(`screenshot ${name} failed: ${e.message}`); }
}

async function open(rel) {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(join(work, rel)));
  const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: false });
  return { doc, editor };
}
const posOf = (doc, needle, delta = 0) => {
  const i = doc.getText().indexOf(needle);
  assert.ok(i >= 0, `"${needle}" not in ${doc.uri.fsPath}`);
  return doc.positionAt(i + delta);
};
const hoverText = (hovers) => hovers.flatMap((h) => h.contents.map((c) => (typeof c === 'string' ? c : c.value))).join('\n');

async function run() {
  const ext = vscode.extensions.getExtension('hekana.sneferu');
  assert.ok(ext, 'extension hekana.sneferu is installed');
  const api = await ext.activate();
  log('activated');

  // 1. language + grammar
  const { doc } = await open('arcade/sections/arcade-products.snf');
  assert.equal(doc.languageId, 'sneferu');
  const original = doc.getText();

  // 1b. the old extension: .sneferu is the same language, and a section type opens it
  const legacy = (await open('legacy/sections/hero.sneferu')).doc;
  assert.equal(legacy.languageId, 'sneferu');
  const idx = (await open('legacy/templates/index.snf')).doc;
  const toHero = await until('definition → hero.sneferu', async () => {
    const d = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', idx.uri, posOf(idx, '"hero"', 2));
    return d && d.length ? d : undefined;
  });
  assert.ok(toHero.some((d) => (d.uri ?? d.targetUri).fsPath.endsWith(join('sections', 'hero.sneferu'))), 'section type → .sneferu file');
  log('.sneferu: language and definition');
  await open('arcade/sections/arcade-products.snf');

  // 2. completion
  const at = posOf(doc, '<hk-product-grid', 1);
  const list = await until('completion', async () => {
    const l = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', doc.uri, at.translate(0, 3));
    return l && l.items.length ? l : undefined;
  });
  const names = list.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));
  for (const t of ['hk-image', 'hk-product-grid', 'hk-stack']) assert.ok(names.includes(t), `completion has ${t}`);
  const attrAt = posOf(doc, 'columns="4"');
  const attrs = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', doc.uri, attrAt);
  const attrNames = attrs.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));
  assert.ok(attrNames.includes('mobile-columns') && !attrNames.includes('products'), `prop completion: ${attrNames.slice(0, 12)}`);
  log(`completion ok (${names.length} items)`);

  // 2b. the starter theme, in the same workspace: its own schema drives section.settings
  {
    const hero = (await open('starter/sections/hero.snf')).doc;
    const sp = posOf(hero, 'section.settings.title', 'section.settings.'.length);
    const l = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', hero.uri, sp);
    const got = l.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label)).sort();
    assert.deepEqual(got, ['subtitle', 'title'], `starter settings: ${got}`);
    const hh = hoverText(await vscode.commands.executeCommand('vscode.executeHoverProvider', hero.uri, posOf(hero, "t('shop_now')", 4)));
    assert.ok(hh.includes('Shop now'), `starter translation hover: ${hh}`);
    const fmt = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', hero.uri, { tabSize: 2, insertSpaces: true });
    assert.equal((fmt ?? []).length, 0, 'the starter is already formatted');
    await open('arcade/sections/arcade-products.snf');
    log('starter ok');
  }

  // 3. hover
  const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', doc.uri, posOf(doc, 'hk-product-grid', 4));
  const ht = hoverText(hovers);
  assert.ok(ht.includes('<hk-product-grid>'), `hover: ${ht.slice(0, 200)}`);
  assert.ok(ht.includes('hekana.dev/reference/tags#hk-product-grid'));
  log('hover ok');

  // 4. go to definition: a translation key → both locale files
  const tAt = posOf(doc, "t('view_all')", 4);
  const defs = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', doc.uri, tAt);
  const defFiles = defs.map((d) => (d.uri ?? d.targetUri).fsPath.replace(/\\/g, '/')).sort();
  assert.deepEqual(defFiles, [join(work, 'arcade/locales/ar.json'), join(work, 'arcade/locales/en.json')].map((p) => p.replace(/\\/g, '/')).sort());
  const chip = (await open('arcade/blocks/chip.snf')).doc;
  const snip = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', chip.uri, posOf(chip, "'glyph'", 2));
  assert.ok(snip.some((d) => (d.uri ?? d.targetUri).fsPath.endsWith(join('snippets', 'glyph.snf'))), 'render → snippet');
  log('definition ok');

  // 5. live diagnostics from the compiler, on unsaved text
  const ed = (await open('arcade/sections/arcade-products.snf')).editor;
  await ed.edit((e) => e.insert(new vscode.Position(1, 0), '  <hk-imagez src="x" />\n'));
  const diag = await until('SN2003', () => vscode.languages.getDiagnostics(doc.uri).find((d) => (typeof d.code === 'object' ? d.code.value : d.code) === 'SN2003'));
  assert.equal(String(diag.code.target), 'https://hekana.dev/reference/diagnostics#SN2003');
  assert.match(diag.message, /unknown tag <hk-imagez>/);
  assert.equal(diag.range.start.line, 1);
  log('diagnostics ok');
  if (shots) {
    vscode.window.activeTextEditor.selection = new vscode.Selection(diag.range.start.translate(0, 3), diag.range.start.translate(0, 3));
    await vscode.commands.executeCommand('workbench.actions.view.problems');
    await sleep(400);
    await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
    await vscode.commands.executeCommand('editor.action.showHover');
    await shot('diagnostics', 2000);
    await vscode.commands.executeCommand('workbench.action.closePanel');
  }
  await ed.edit((e) => e.replace(new vscode.Range(0, 0, doc.lineCount, 0), original));
  await until('diagnostics cleared', () => !vscode.languages.getDiagnostics(doc.uri).some((d) => d.severity === vscode.DiagnosticSeverity.Error));

  // 5b. typing `>` closes the tag; renaming the opening tag renames the closing one
  {
    const line = doc.lineAt(posOf(doc, '<hk-stack gap="20">').line);
    await ed.edit((e) => e.insert(line.range.end, '\n    <hk-card'));
    const p = doc.lineAt(line.lineNumber + 1).range.end;
    ed.selection = new vscode.Selection(p, p);
    await vscode.commands.executeCommand('type', { text: '>' });
    await until('closing tag', () => doc.lineAt(line.lineNumber + 1).text.includes('<hk-card></hk-card>'), 5000);
    // no public command for linked editing: ask the language server directly
    const at2 = p.translate(0, -3);
    const linked = await api.client.sendRequest('textDocument/linkedEditingRange', { textDocument: { uri: doc.uri.toString() }, position: { line: at2.line, character: at2.character } });
    assert.equal(linked?.ranges?.length, 2, 'linked editing ranges for <hk-card>');
    await ed.edit((e) => e.replace(new vscode.Range(0, 0, doc.lineCount, 0), original));
    log('auto-close + linked editing ok');
  }

  // 6. formatting with the Prettier plugin: undo a re-indent
  const messy = original.replace(/\n {2,}/g, '\n');
  await ed.edit((e) => e.replace(new vscode.Range(0, 0, doc.lineCount, 0), messy));
  const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', doc.uri, { tabSize: 4, insertSpaces: true });
  assert.ok(edits && edits.length, 'format returns edits');
  const we = new vscode.WorkspaceEdit();
  we.set(doc.uri, edits);
  await vscode.workspace.applyEdit(we);
  assert.equal(doc.getText(), original, 'formatted text equals the formatted original');
  await doc.save();
  log('format ok');

  // 7. theme checks + quick fix: a key only in en.json
  const en = (await open('arcade/locales/en.json')).doc;
  const enEditor = vscode.window.activeTextEditor;
  await enEditor.edit((e) => e.insert(posOf(en, '"menu"'), '"only_in_en": "Only English",\n  '));
  const mt = await until('MatchingTranslations', () => vscode.languages.getDiagnostics(en.uri).find((d) => (typeof d.code === 'object' ? d.code.value : d.code) === 'MatchingTranslations'));
  const actions = await vscode.commands.executeCommand('vscode.executeCodeActionProvider', en.uri, mt.range);
  const fix = actions.find((a) => a.title.includes('only_in_en'));
  assert.ok(fix, `quick fix offered: ${actions.map((a) => a.title)}`);
  await vscode.workspace.applyEdit(fix.edit);
  const ar = await vscode.workspace.openTextDocument(vscode.Uri.file(join(work, 'arcade/locales/ar.json')));
  assert.ok(ar.getText().includes('"only_in_en": "Only English"'), 'key added to ar.json');
  JSON.parse(ar.getText());
  log('theme check + quick fix ok');
  await vscode.commands.executeCommand('workbench.action.files.saveAll');

  // 8. live preview
  await open('arcade/sections/arcade-products.snf');
  await vscode.commands.executeCommand('sneferu.openPreview');
  const st = api.dev.state;
  assert.equal(st.s, 'running', `dev server: ${JSON.stringify(st)}`);
  const page = await (await fetch(`http://127.0.0.1:${st.proxyPort}/?locale=en`)).text();
  assert.ok(page.includes('data-hk-section="default-0"') && page.includes('sneferu-reveal'), 'preview page through the inspect proxy');
  assert.ok(api.panel, 'preview panel is open');
  const html = api.panel.webview.html;
  assert.ok(html.includes('id="frame"') && html.includes(`127.0.0.1:${st.proxyPort}`), 'webview points at the proxy');
  // the same page in a real browser (Playwright): iframe URL, widths, language, click to source
  const pj = join(work, 'preview.json');
  writeFileSync(pj, JSON.stringify({ origin: `http://127.0.0.1:${st.proxyPort}`, devPort: st.port, html }, null, 1));
  const { stdout: pw } = await promisify(execFile)('node', [join(__dirname, '..', 'preview-playwright.mjs'), pj, ...(shots ? [join(shots, 'preview-panel.png')] : [])], { encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined } });
  log(pw.trim().split('\n').join(' | '));
  log(`preview ok (dev ${st.port}, proxy ${st.proxyPort})`);
  await shot('preview', 4000);
  if (shots) {
    // a short recording of the preview for the README: widths and languages
    await vscode.commands.executeCommand('workbench.action.closeSidebar');
    await sleep(800);
    const rec = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-video_size', process.env.SNEFERU_SCREEN || '1600x1000', '-framerate', '12', '-i', process.env.DISPLAY, '-t', '13', join(shots, 'preview.mp4')]);
    const done = new Promise((r) => rec.on('exit', r));
    const nav = (m) => api.panel.webview.postMessage({ type: 'navigate', ...m });
    await sleep(1500); await nav({ locale: 'en' });
    await sleep(2500); await nav({ width: 'tablet' });
    await sleep(2500); await nav({ width: 'phone' });
    await sleep(2500); await nav({ locale: 'ar' });
    await sleep(2500); await nav({ width: 'desktop' });
    await done;
    await vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
    log('recorded preview.mp4');
  }

  if (shots) {
    // completion and hover, as a user sees them
    await vscode.commands.executeCommand('workbench.action.closeEditorsInOtherGroups');
    const { doc: d2, editor: e2 } = await open('arcade/sections/arcade-products.snf');
    const line = d2.lineAt(posOf(d2, '<hk-stack gap="20">').line);
    await e2.edit((e) => e.insert(line.range.end, '\n    <hk-'));
    const p = d2.lineAt(line.lineNumber + 1).range.end;
    e2.selection = new vscode.Selection(p, p);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    await shot('completion', 2500);
    await vscode.commands.executeCommand('hideSuggestWidget');
    await vscode.commands.executeCommand('undo');
    const hp = posOf(d2, 'hk-product-grid', 5);
    e2.selection = new vscode.Selection(hp, hp);
    await vscode.commands.executeCommand('editor.action.showHover');
    await shot('hover', 2000);
    // settings completion inside an expression
    const sp = posOf(d2, 'section.settings.count', 'section.settings.'.length);
    e2.selection = new vscode.Selection(sp, sp);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    await shot('completion-settings', 2500);
    await vscode.commands.executeCommand('hideSuggestWidget');
  }

  await vscode.commands.executeCommand('sneferu.stopPreview');
  await until('dev server stopped', () => api.dev.state.s === 'stopped', 5000);
  log('stop ok');
}

module.exports = { run };
