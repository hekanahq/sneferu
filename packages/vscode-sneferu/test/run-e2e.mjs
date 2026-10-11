// Runs the extension tests in a real VS Code (downloaded once into .vscode-test/).
// On Linux without a display, run under xvfb-run:  xvfb-run -a node test/run-e2e.mjs
// SNEFERU_SHOTS=<dir> also saves screenshots of completion, hover, diagnostics and the preview.
import { runTests } from '@vscode/test-electron';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const repo = join(pkg, '..', '..');
const work = mkdtempSync(join(tmpdir(), 'sneferu-e2e-'));
// a copy, so the tests can edit files freely: the arcade example and the starter side by side
cpSync(join(repo, 'examples/themes/arcade'), join(work, 'arcade'), { recursive: true });
cpSync(join(repo, 'packages/sneferu/starter'), join(work, 'starter'), { recursive: true });
// a clean editor for the screenshots
mkdirSync(join(work, '.user', 'User'), { recursive: true });
writeFileSync(join(work, '.user', 'User', 'settings.json'), JSON.stringify({
  'workbench.colorTheme': 'Default Dark Modern', 'editor.minimap.enabled': false, 'editor.fontSize': 14,
  'workbench.startupEditor': 'none', 'window.restoreWindows': 'none', 'telemetry.telemetryLevel': 'off', 'update.mode': 'none',
  'workbench.secondarySideBar.defaultVisibility': 'hidden', 'chat.disableAIFeatures': true, 'workbench.tips.enabled': false,
  'window.titleBarStyle': 'native', 'window.menuBarVisibility': 'hidden', 'window.title': '${activeEditorShort} — ${rootName}', 'editor.hover.delay': 100, 'files.exclude': { '.user': true, '.ext': true, 'preview.json': true },
}, null, 1));
try {
  await runTests({
    version: process.env.VSCODE_VERSION ?? 'stable',
    // SNEFERU_EXT_PATH: run the suite against an installed .vsix (its unpacked folder) instead of this checkout
    extensionDevelopmentPath: process.env.SNEFERU_EXT_PATH ?? pkg,
    extensionTestsPath: join(here, 'suite', 'index.cjs'),
    launchArgs: [work, `--extensions-dir=${join(work, '.ext')}`, '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(work, '.user')}`, ...(process.env.SNEFERU_SCALE ? [`--force-device-scale-factor=${process.env.SNEFERU_SCALE}`] : [])],
    extensionTestsEnv: { SNEFERU_E2E_WORK: work, SNEFERU_SHOTS: process.env.SNEFERU_SHOTS ?? '', SNEFERU_SCREEN: process.env.SNEFERU_SCREEN ?? '1600x1000' },
  });
  console.log('e2e: all passed');
} catch (e) {
  console.error('e2e failed', e);
  process.exitCode = 1;
} finally {
  if (!process.env.KEEP_E2E) rmSync(work, { recursive: true, force: true });
}
