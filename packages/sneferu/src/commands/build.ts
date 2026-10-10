import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { formatDiagnostic } from '@hekana/sneferu-core';
import { compileTheme } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { loadTheme } from '../load';

export function runBuild(dir: string, outDir = 'dist'): { ok: boolean; output: string; artifactPath?: string } {
  const root = resolve(dir);
  const { artifact, diagnostics } = compileTheme(loadTheme(root), createDefaultRegistry());
  const out = diagnostics.map(formatDiagnostic);
  if (!artifact) return { ok: false, output: [...out, '✖ build failed'].join('\n') };
  const dist = resolve(root, outDir);
  mkdirSync(dist, { recursive: true });
  const artifactPath = join(dist, `${artifact.manifest.id}-${artifact.manifest.version}.sneferu.json`);
  writeFileSync(artifactPath, JSON.stringify(artifact));
  if (existsSync(join(root, 'assets'))) cpSync(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
  out.push(`✔ built ${artifact.manifest.id}@${artifact.manifest.version} → ${artifactPath} (hash ${artifact.hash})`);
  return { ok: true, output: out.join('\n'), artifactPath };
}
