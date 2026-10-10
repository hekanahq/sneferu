import { Command } from 'commander';
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runBuild } from './commands/build';
import { runDev } from './commands/dev';
import { runPush } from './commands/push';

const program = new Command().name('sneferu').description('Build Hekana themes with Sneferu').version('0.1.0');
program.command('init').argument('[dir]', 'folder to create', 'my-theme').option('--force', 'write into a non-empty folder')
  .action((dir: string, o: { force?: boolean }) => { try { runInit(dir, o); console.log(`✔ created ${dir} — next: cd ${dir} && npx @hekana/sneferu dev`); } catch (e) { console.error(`✖ ${(e as Error).message}`); process.exitCode = 2; } });
program.command('validate').argument('[dir]', 'theme folder', '.')
  .action((dir: string) => { const r = runValidate(dir); console.log(r.output); process.exitCode = r.ok ? 0 : 1; });
program.command('build').argument('[dir]', 'theme folder', '.').option('--out <dir>', 'output folder', 'dist')
  .action((dir: string, o: { out: string }) => { const r = runBuild(dir, o.out); console.log(r.output); process.exitCode = r.ok ? 0 : 1; });
program.command('dev').argument('[dir]', 'theme folder', '.').option('--port <n>', 'port', '4100')
  .action(async (dir: string, o: { port: string }) => { await runDev(dir, Number(o.port)); });
program.command('push').argument('[dir]', 'theme folder', '.')
  .requiredOption('--package <slug>', 'theme package on Hekana (must equal theme.json id)')
  .description('upload the theme source to Hekana (env: HEKANA_TOKEN, HEKANA_API_URL)')
  .action(async (dir: string, o: { package: string }) => {
    const r = await runPush(dir, { pkg: o.package, apiUrl: process.env.HEKANA_API_URL, token: process.env.HEKANA_TOKEN });
    console.log(r.output);
    process.exitCode = r.ok ? 0 : 1;
  });

try {
  await program.parseAsync(process.argv);
} catch (e) {
  console.error(`✖ ${(e as Error)?.message ?? String(e)}`);
  process.exitCode = 2;
}
