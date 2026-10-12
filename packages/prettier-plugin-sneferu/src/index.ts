import type { Plugin, SupportOption } from 'prettier';
import { parse, type Node, type Root } from './parse';
import { print } from './print';

export const languages: Plugin['languages'] = [
  { name: 'Sneferu', parsers: ['sneferu'], extensions: ['.snf', '.sneferu'], vscodeLanguageIds: ['sneferu'] },
];

export const parsers: Plugin<Node | Root>['parsers'] = {
  sneferu: {
    parse: (text: string) => parse(text),
    astFormat: 'sneferu-ast',
    locStart: (n: Node | Root) => n.start,
    locEnd: (n: Node | Root) => n.end,
  },
};

export const printers: Plugin<Node | Root>['printers'] = {
  'sneferu-ast': { print: print as never },
};

export const options: Record<string, SupportOption> = {
  sneferuSingleQuote: {
    type: 'boolean', category: 'Sneferu', default: true,
    description: "Use single quotes for strings inside {{ }} and {% %} (a string that contains a single quote keeps double quotes).",
  },
  indentSchema: {
    type: 'boolean', category: 'Sneferu', default: true,
    description: 'Indent the JSON inside <hk-schema> one level.',
  },
};

export const defaultOptions: Plugin['defaultOptions'] = { printWidth: 120, tabWidth: 2 };

const plugin: Plugin<Node | Root> = { languages, parsers, printers, options, defaultOptions };
export default plugin;
export { parse } from './parse';
