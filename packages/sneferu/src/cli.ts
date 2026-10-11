import { Command } from 'commander';
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runBuild } from './commands/build';
import { runDev } from './commands/dev';
import { runPush } from './commands/push';
import { runLogin } from './commands/login';
import { runLogout } from './commands/logout';
import { runWhoami } from './commands/whoami';

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
  .option('--dev-store', 'then install and publish the version on your dev store (developer key only)')
  .description('upload the theme source to Hekana (auth: sneferu login, or env HEKANA_TOKEN; env HEKANA_API_URL)')
  .action(async (dir: string, o: { package: string; devStore?: boolean }) => {
    const r = await runPush(dir, {
      pkg: o.package,
      devStore: o.devStore === true,
      ...(process.env.HEKANA_API_URL ? { apiUrl: process.env.HEKANA_API_URL } : {}),
      ...(process.env.HEKANA_TOKEN ? { token: process.env.HEKANA_TOKEN } : {}),
    });
    console.log(r.output);
    process.exitCode = r.ok ? 0 : 1;
  });
program.command('login').option('--api-url <url>', 'Hekana API URL (default: HEKANA_API_URL or https://api.hekana.com/api/v1)')
  .description('sign in with your Hekana account in the browser and save a developer key')
  .action(async (o: { apiUrl?: string }) => {
    const r = await runLogin(o.apiUrl ? { apiUrl: o.apiUrl } : {});
    (r.ok ? console.log : console.error)(r.output);
    process.exitCode = r.ok ? 0 : 1;
  });
program.command('logout').description('revoke the saved developer key and delete it')
  .action(async () => { const r = await runLogout(); console.log(r.output); process.exitCode = r.ok ? 0 : 1; });
program.command('whoami').description('show the account, key and dev store the CLI uses')
  .action(async () => { const r = await runWhoami(); (r.ok ? console.log : console.error)(r.output); process.exitCode = r.ok ? 0 : 1; });

try {
  await program.parseAsync(process.argv);
} catch (e) {
  console.error(`✖ ${(e as Error)?.message ?? String(e)}`);
  process.exitCode = 2;
}
