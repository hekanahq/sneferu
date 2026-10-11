import { describe, expect, it } from 'vitest';
import { fmt, meaning } from './test-utils';

/** One case per construct; each is also checked for idempotency and for an unchanged compile. */
const CASES: Record<string, string> = {
  'nested elements': '<div class="a"><section><p>Hello</p></section></div>',
  'hk components': '<hk-section padding-y="96"><hk-stack gap="16"><hk-heading text="{{ section.settings.title }}" level="h1" /><hk-text text="Hi" /></hk-stack></hk-section>',
  'long attribute list': '<hk-heading text="{{ section.settings.title }}" level="h1" size="56" tablet-size="44" mobile-size="32" color="#FFFFFF" align="center" />',
  'long open tag with children': '<hk-section background="{{ section.settings.background }}" padding-y="112" tablet-padding-y="80" mobile-padding-y="56"><hk-text text="x" /></hk-section>',
  'interpolation spacing': '<p>{{product.title|upcase}} {{ price|money }} {{ x | truncate:20 }} {{ collection("featured").products | size }}</p>',
  'filters with several arguments': '<p>{{ a|default:"none" }} {{ t("cart.count")|default:  b , c }}</p>',
  'operators and keywords': '{% if a==1 and not b or c!=\'x\' %}<b>yes</b>{% endif %}',
  'if elsif else': '<div>{% if a %}<p>A</p>{% elsif b %}<p>B</p>{% else %}<p>C</p>{% endif %}</div>',
  'for with limit': '<ul>{% for p in collection(\'featured\').products limit:4 %}<li>{{ p.title }}</li>{% endfor %}</ul>',
  'nested control flow': '<hk-stack>{% for p in products %}{% if p.available %}<hk-text text="{{ p.title }}" />{% else %}<hk-badge text="Sold out" />{% endif %}{% endfor %}</hk-stack>',
  'render': '<hk-grid>{% render \'plan-card\',name:p.name ,  best: p.best == "1" %}</hk-grid>',
  'render that does not compile is kept as written': '{% render "plan-card",name:p.name %}',
  'schema json': '<hk-section></hk-section>\n<hk-schema>{"name":"Hero","version":1,"blocks":{"allowed":["chip","quote"],"max":4},"settings":{"title":{"type":"text","label":"Title","default":"Hello"},"n":{"type":"number","default":1.50,"min":-2e3}},"presets":[],"empty":{}}</hk-schema>',
  'invalid schema json is left alone': '<hk-schema>{ "name": oops }</hk-schema>',
  'inline text fills to the print width': '<p>Delivery across Egypt, every day of the week. Pay cash when your order arrives, or pay online with a card or a wallet. Returns are free for fourteen days.</p>',
  'inline elements keep their spacing': '<p>Price:<strong>{{ p.price | money }}</strong> <small>per month</small>,<a href="/x">more</a></p>',
  'hugging inline elements stay hugged': '<span><b>a</b><i>b</i></span>',
  'significant space in an empty inline element': '<p>a<span> </span>b</p>',
  'html comment': '<div>\n<!-- the hero --><hk-text text="x" />\n</div>',
  'prettier-ignore': '<div>\n  <!-- prettier-ignore -->\n  <p   class="keep"  >  as   written </p>\n  <p   class="tidy"  >  tidied </p>\n</div>',
  'pre is left alone': '<div><pre>  keep\n    this   </pre></div>',
  'blank lines between blocks are kept (one)': '<div>\n<p>a</p>\n\n\n\n<p>b</p>\n</div>',
  'void and self-closing': '<div><img src="/a.png" alt="A"><br><hk-sections/></div>',
  'attribute quotes': "<div class='a' data-x=plain title='say \"hi\"' data-y=\"{{ t('k') }}\" hidden></div>",
  'unknown directive is kept': '{% while x %}',
  'arabic text': '<p>أهلاً بك في متجرنا. {{ store.name }}</p>',
  'text and entities': '<p>Fish &amp; chips &nbsp; a &lt; b</p>',
  'table': '<table><tr><td>1</td><td>{{ x }}</td></tr></table>',
};

describe('printer', () => {
  for (const [name, src] of Object.entries(CASES)) {
    it(name, async () => {
      const out = await fmt(src);
      expect(out).toMatchSnapshot();
      expect(await fmt(out)).toBe(out);
      expect(meaning(out)).toBe(meaning(src));
    });
  }
});

describe('options', () => {
  it('printWidth decides when attributes break', async () => {
    const src = '<hk-text text="{{ section.settings.subtitle }}" size="20" color="#E5E7EB" />';
    expect(await fmt(src)).toBe(`${src}\n`);
    expect(await fmt(src, { printWidth: 40 })).toBe('<hk-text\n  text="{{ section.settings.subtitle }}"\n  size="20"\n  color="#E5E7EB"\n/>\n');
  });
  it('tabWidth and useTabs indent', async () => {
    const src = '<div><p>a</p></div>';
    expect(await fmt(src, { tabWidth: 4 })).toBe('<div>\n    <p>a</p>\n</div>\n');
    expect(await fmt(src, { useTabs: true })).toBe('<div>\n\t<p>a</p>\n</div>\n');
  });
  it('sneferuSingleQuote picks the quote inside {{ }} and {% %}', async () => {
    expect(await fmt('{{ "a" | default: \'b\' }}')).toBe("{{ 'a' | default: 'b' }}\n");
    expect(await fmt('{{ "a" | default: \'b\' }}', { sneferuSingleQuote: false } as never)).toBe('{{ "a" | default: "b" }}\n');
    expect(await fmt('{{ "it\'s" }}')).toBe('{{ "it\'s" }}\n');
  });
  it('singleQuote picks the attribute quote; strings inside use the other one', async () => {
    expect(await fmt('<a title="{{ t(\'k\') }}">x</a>', { singleQuote: true })).toBe('<a title=\'{{ t("k") }}\'>x</a>\n');
    expect(await fmt('<a title=\'{{ t("k") }}\'>x</a>')).toBe('<a title="{{ t(\'k\') }}">x</a>\n');
  });
  it('indentSchema: false keeps the JSON at the tag level', async () => {
    expect(await fmt('<hk-schema>{"a":1}</hk-schema>', { indentSchema: false } as never)).toBe('<hk-schema>\n{\n  "a": 1\n}\n</hk-schema>\n');
  });
  it('defaults to printWidth 120', async () => {
    const src = `<hk-text text="${'x'.repeat(90)}" size="20" />`;
    expect(await fmt(src)).toBe(`${src}\n`);
  });
});

describe('refuses broken files instead of guessing', () => {
  for (const src of ['<div>', '</p>', '<div><span></div>', '{% if a %}x', '{% endif %}', '{% else %}', '{{ a', '<!-- x', '<hk-schema>{}', '<div "x">', '{% if a %}{% else %}{% elsif b %}{% endif %}']) {
    it(JSON.stringify(src), async () => { await expect(fmt(src)).rejects.toThrow(); });
  }
});
