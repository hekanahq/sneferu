import { createServer, request, type Server } from 'node:http';

/**
 * Injected into every HTML page the preview shows. Alt+click (or any click in
 * inspect mode) on the page reports the nearest data-hk-section /
 * data-hk-block wrapper to the webview, which opens the source file.
 */
export const INSPECT_SCRIPT = `<script>(function(){
var inspect=false,box=null;
function mark(el){if(!box){box=document.createElement('div');box.setAttribute('data-sneferu-inspect','');box.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #0E7490;background:rgba(14,116,144,.08);transition:all .05s'}if(!el){box.remove();return}var r=el.getBoundingClientRect();box.style.left=r.left+'px';box.style.top=r.top+'px';box.style.width=r.width+'px';box.style.height=r.height+'px';document.body.appendChild(box)}
function target(t){return t&&t.closest?t.closest('[data-hk-block],[data-hk-section]'):null}
window.addEventListener('message',function(e){if(e.data&&e.data.type==='sneferu-inspect'){inspect=!!e.data.on;document.documentElement.style.cursor=inspect?'crosshair':'';if(!inspect)mark(null)}});
document.addEventListener('mouseover',function(e){if(inspect)mark(target(e.target))},true);
document.addEventListener('click',function(e){if(!inspect&&!e.altKey)return;e.preventDefault();e.stopPropagation();
var s=e.target.closest&&e.target.closest('[data-hk-section]'),b=e.target.closest&&e.target.closest('[data-hk-block]');
parent.postMessage({type:'sneferu-reveal',section:s?s.getAttribute('data-hk-section'):null,block:b?b.getAttribute('data-hk-block'):null,path:location.pathname},'*')},true);
parent.postMessage({type:'sneferu-loaded',path:location.pathname,title:document.title},'*');
})();</script>`;

/** Adds the inspect script to a page, before </body> when there is one. */
export function inject(html: string): string {
  const i = html.lastIndexOf('</body>');
  return i >= 0 ? html.slice(0, i) + INSPECT_SCRIPT + html.slice(i) : html + INSPECT_SCRIPT;
}

/**
 * A local proxy in front of `sneferu dev`: passes everything through (the live
 * reload event stream included) and injects the inspect script into HTML.
 * The dev server itself is unchanged, so the preview shows exactly what
 * `sneferu dev` serves.
 */
export async function startProxy(upstreamPort: number): Promise<{ server: Server; port: number; close: () => void }> {
  const server = createServer((req, res) => {
    const up = request({ host: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}`, 'accept-encoding': 'identity' } }, (ur) => {
      const type = String(ur.headers['content-type'] ?? '');
      if (!type.startsWith('text/html')) {
        res.writeHead(ur.statusCode ?? 502, ur.headers);
        ur.pipe(res);
        return;
      }
      const chunks: Buffer[] = [];
      ur.on('data', (c: Buffer) => chunks.push(c));
      ur.on('end', () => {
        const body = Buffer.from(inject(Buffer.concat(chunks).toString('utf8')), 'utf8');
        const headers = { ...ur.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
        delete headers['transfer-encoding'];
        res.writeHead(ur.statusCode ?? 200, headers);
        res.end(body);
      });
    });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/html; charset=utf-8' }); res.end('<!doctype html><meta charset="utf-8"><p style="font:14px system-ui;padding:24px">The Sneferu dev server is not running.</p>'); });
    req.pipe(up);
    res.on('close', () => up.destroy());
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { server, port, close: () => { server.closeAllConnections?.(); server.close(); } };
}
