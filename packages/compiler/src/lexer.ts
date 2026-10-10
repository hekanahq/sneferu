import { err, type Diagnostic } from '@hekana/sneferu-core';

export interface Loc { line: number; col: number }
export interface RawAttr { name: string; value: string | null; loc: Loc }
export type Token =
  | { t: 'text'; v: string; loc: Loc }
  | { t: 'interp'; src: string; loc: Loc }
  | { t: 'dir'; src: string; loc: Loc }
  | { t: 'open'; name: string; attrs: RawAttr[]; selfClosing: boolean; loc: Loc }
  | { t: 'close'; name: string; loc: Loc }
  | { t: 'schema'; json: string; loc: Loc };

export function lex(src: string, file: string): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const loc = (): Loc => ({ line, col });
  const advance = (n: number) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === '\n') { line++; col = 1; } else col++;
      i++;
    }
  };
  const at = (s: string) => src.startsWith(s, i);
  let text = '';
  let textLoc = loc();
  const flush = () => { if (text) tokens.push({ t: 'text', v: text, loc: textLoc }); text = ''; };

  while (i < src.length) {
    if (at('<!--')) {
      flush();
      const end = src.indexOf('-->', i);
      advance(end === -1 ? src.length - i : end + 3 - i);
      textLoc = loc();
      continue;
    }
    if (at('{{') || at('{%')) {
      flush();
      const isInterp = at('{{');
      const close = isInterp ? '}}' : '%}';
      const start = loc();
      const end = src.indexOf(close, i + 2);
      if (end === -1) {
        diagnostics.push(err(isInterp ? 'SN1001' : 'SN1002', `unterminated ${isInterp ? '{{' : '{%'}`, { file, ...start }));
        advance(src.length - i);
        break;
      }
      advance(2);
      const inner = src.slice(i, end).trim();
      advance(end + 2 - i);
      tokens.push(isInterp ? { t: 'interp', src: inner, loc: start } : { t: 'dir', src: inner, loc: start });
      textLoc = loc();
      continue;
    }
    if (at('<hk-schema>')) {
      flush();
      const start = loc();
      const end = src.indexOf('</hk-schema>', i);
      if (end === -1) { diagnostics.push(err('SN1004', 'unterminated <hk-schema>', { file, ...start })); advance(src.length - i); break; }
      advance('<hk-schema>'.length);
      const json = src.slice(i, end).trim();
      advance(end + '</hk-schema>'.length - i);
      tokens.push({ t: 'schema', json, loc: start });
      textLoc = loc();
      continue;
    }
    if (at('</')) {
      const m = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(src.slice(i));
      if (m) { flush(); const start = loc(); advance(m[0].length); tokens.push({ t: 'close', name: m[1]!.toLowerCase(), loc: start }); textLoc = loc(); continue; }
    }
    if (src[i] === '<' && /[a-zA-Z]/.test(src[i + 1] ?? '')) {
      flush();
      const start = loc();
      advance(1);
      let name = '';
      while (i < src.length && /[a-zA-Z0-9-]/.test(src[i]!)) { name += src[i]; advance(1); }
      const attrs: RawAttr[] = [];
      let selfClosing = false;
      let closed = false;
      while (i < src.length) {
        while (/\s/.test(src[i] ?? '')) advance(1);
        if (at('/>')) { selfClosing = true; advance(2); closed = true; break; }
        if (src[i] === '>') { advance(1); closed = true; break; }
        const aLoc = loc();
        let aName = '';
        while (i < src.length && /[^\s=/>"']/.test(src[i]!)) { aName += src[i]; advance(1); }
        if (!aName) { advance(1); continue; }
        let value: string | null = null;
        if (src[i] === '=') {
          advance(1);
          const q = src[i];
          if (q === '"' || q === "'") {
            const end = src.indexOf(q, i + 1);
            if (end === -1) { diagnostics.push(err('SN1003', `unterminated attribute value for ${aName}`, { file, ...aLoc })); advance(src.length - i); break; }
            advance(1);
            value = src.slice(i, end);
            advance(end + 1 - i);
          } else {
            value = '';
            while (i < src.length && /[^\s>]/.test(src[i]!)) { value += src[i]; advance(1); }
          }
        }
        attrs.push({ name: aName.toLowerCase(), value, loc: aLoc });
      }
      if (!closed && !diagnostics.some((d) => d.code === 'SN1003')) diagnostics.push(err('SN1003', `unterminated tag <${name}>`, { file, ...start }));
      tokens.push({ t: 'open', name: name.toLowerCase(), attrs, selfClosing, loc: start });
      textLoc = loc();
      continue;
    }
    if (!text) textLoc = loc();
    text += src[i];
    advance(1);
  }
  flush();
  return { tokens, diagnostics };
}
