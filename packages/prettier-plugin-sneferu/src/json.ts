/**
 * `<hk-schema>` JSON: a tiny parser that keeps keys in order and every scalar
 * exactly as written, so pretty-printing changes whitespace and nothing else.
 */
import { doc, type Doc } from 'prettier';

const { group, indent, line, softline, hardline, join } = doc.builders;

type J = { k: 'obj'; props: [string, J][] } | { k: 'arr'; items: J[] } | { k: 'raw'; v: string };

function parseJson(src: string): J | undefined {
  let i = 0;
  const ws = () => { while (i < src.length && ' \t\n\r'.includes(src[i]!)) i++; };
  const str = (): string => {
    const m = /^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/.exec(src.slice(i));
    if (!m) throw new Error('string');
    i += m[0].length; return m[0];
  };
  const value = (): J => {
    ws();
    const c = src[i];
    if (c === '{') {
      i++; ws();
      const props: [string, J][] = [];
      if (src[i] === '}') { i++; return { k: 'obj', props }; }
      for (;;) {
        ws(); const key = str(); ws();
        if (src[i++] !== ':') throw new Error(':');
        props.push([key, value()]); ws();
        const d = src[i++];
        if (d === '}') return { k: 'obj', props };
        if (d !== ',') throw new Error(',');
      }
    }
    if (c === '[') {
      i++; ws();
      const items: J[] = [];
      if (src[i] === ']') { i++; return { k: 'arr', items }; }
      for (;;) {
        items.push(value()); ws();
        const d = src[i++];
        if (d === ']') return { k: 'arr', items };
        if (d !== ',') throw new Error(',');
      }
    }
    if (c === '"') return { k: 'raw', v: str() };
    const m = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(src.slice(i));
    if (!m) throw new Error('value');
    i += m[0].length;
    return { k: 'raw', v: m[0] };
  };
  try {
    JSON.parse(src);
    const v = value(); ws();
    return i === src.length ? v : undefined;
  } catch { return undefined; }
}

function print(j: J): Doc {
  if (j.k === 'raw') return j.v;
  if (j.k === 'obj') {
    if (j.props.length === 0) return '{}';
    return ['{', indent([hardline, join([',', hardline], j.props.map(([k, v]) => [k, ': ', print(v)]))]), hardline, '}'];
  }
  if (j.items.length === 0) return '[]';
  const items = j.items.map(print);
  if (j.items.every((x) => x.k === 'raw')) return group(['[', indent([softline, join([',', line], items)]), softline, ']']);
  return ['[', indent([hardline, join([',', hardline], items)]), hardline, ']'];
}

/** A Doc for the JSON, or undefined when it is not valid JSON (then it is left as written). */
export function jsonDoc(src: string): Doc | undefined {
  const j = parseJson(src);
  return j ? print(j) : undefined;
}
