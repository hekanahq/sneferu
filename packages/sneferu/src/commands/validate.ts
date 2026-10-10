import { formatDiagnostic } from '@hekana/sneferu-core';
import { compileTheme } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { loadTheme } from '../load';

export function runValidate(dir: string): { ok: boolean; output: string } {
  let files;
  try { files = loadTheme(dir); } catch (e) { return { ok: false, output: `error ${(e as Error).message}` }; }
  const { artifact, diagnostics } = compileTheme(files, createDefaultRegistry());
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.length - errors;
  const lines = diagnostics.map(formatDiagnostic);
  lines.push(artifact ? `✔ theme ${artifact.manifest.id}@${artifact.manifest.version} is valid${warnings ? ` (${warnings} warning${warnings > 1 ? 's' : ''})` : ''}` : `✖ ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
  return { ok: !!artifact, output: lines.join('\n') };
}
