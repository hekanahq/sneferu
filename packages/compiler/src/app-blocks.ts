import { APP_BLOCKS, appBlockSectionSettings, appBlockSectionType, type AppBlockDef } from '@hekana/sneferu-core';
import type { ThemeFile } from './files';

const enc = new TextEncoder();

/**
 * The source of the theme-editor section the SDK generates for an app block. It is ordinary Sneferu
 * markup, compiled like any section, so it follows every rule a theme section follows.
 */
export function appBlockSectionSource(d: AppBlockDef): string {
  const product = d.context === 'product' ? ' product="{{ product }}"' : '';
  const schema = {
    name: d.name,
    description: d.description,
    version: 1,
    templates: [...d.templates],
    settings: appBlockSectionSettings(d),
  };
  return [
    '<div data-hk-app-section="1">',
    '<hk-section padding-y="{{ section.settings.padding_y }}" mobile-padding-y="{{ section.settings.padding_y }}">',
    '  {% if section.settings.heading %}<hk-heading text="{{ section.settings.heading }}" level="h2" size="22" />{% endif %}',
    `  <hk-app-block app="${d.app}" block="${d.block}"${product} settings="{{ section.settings }}" label="{{ section.settings.heading }}" />`,
    '</hk-section>',
    '</div>',
    '<hk-schema>',
    JSON.stringify(schema, null, 2),
    '</hk-schema>',
    '',
  ].join('\n');
}

export function appBlockFiles(list: readonly AppBlockDef[] = APP_BLOCKS): ThemeFile[] {
  return list.map((d) => ({ path: `sections/${appBlockSectionType(d)}.snf`, bytes: enc.encode(appBlockSectionSource(d)) }));
}
