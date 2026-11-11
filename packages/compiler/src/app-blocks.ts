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

/** The platform's custom HTML/CSS section: offered on every theme, on every page type the theme renders except cart. */
export const CUSTOM_HTML_SECTION = 'custom-html';
export const CUSTOM_HTML_TEMPLATES = ['index', 'product', 'collection', 'search', 'page', '404'] as const;

export function customHtmlSectionSource(): string {
  const schema = {
    name: { ar: 'كود مخصص', en: 'Custom HTML' },
    description: {
      ar: 'HTML و CSS من كتابتك. لا يعمل أي سكربت، والـ CSS يطبق على هذا القسم فقط.',
      en: 'Your own HTML and CSS. No script runs, and the CSS applies to this section only.',
    },
    version: 1,
    templates: [...CUSTOM_HTML_TEMPLATES],
    settings: {
      html: { type: 'textarea', label: { ar: 'كود HTML', en: 'HTML' }, maxLength: 30000, default: '' },
      css: { type: 'textarea', label: { ar: 'كود CSS', en: 'CSS' }, maxLength: 10000, default: '' },
      padding_y: { type: 'range', label: { ar: 'المسافة الرأسية', en: 'Vertical spacing' }, min: 0, max: 80, step: 4, default: 16 },
    },
  };
  return [
    '<hk-section padding-y="{{ section.settings.padding_y }}" mobile-padding-y="{{ section.settings.padding_y }}">',
    '  <hk-custom-html html="{{ section.settings.html }}" css="{{ section.settings.css }}" />',
    '</hk-section>',
    '<hk-schema>',
    JSON.stringify(schema, null, 2),
    '</hk-schema>',
    '',
  ].join('\n');
}

export function customHtmlFiles(): ThemeFile[] {
  return [{ path: `sections/${CUSTOM_HTML_SECTION}.snf`, bytes: enc.encode(customHtmlSectionSource()) }];
}

export const ANNOUNCEMENT_SECTION = 'announcement-banner';
const ANNOUNCEMENT_SLOT_COUNT = 6;

export function announcementSectionSource(): string {
  const settings: Record<string, unknown> = {};
  for (let i = 1; i <= ANNOUNCEMENT_SLOT_COUNT; i++) {
    settings[`m${i}`] = { type: 'text', label: { ar: `الرسالة ${i}`, en: `Message ${i}` }, localized: true, default: '', maxLength: 160 };
    settings[`l${i}`] = { type: 'link', label: { ar: `رابط الرسالة ${i}`, en: `Message ${i} link` }, default: '' };
  }
  settings.motion = { type: 'select', label: { ar: 'الحركة', en: 'Motion' }, options: ['static', 'rotate', 'marquee'], default: 'static' };
  settings.speed = { type: 'range', label: { ar: 'السرعة', en: 'Speed' }, min: 1, max: 10, step: 1, default: 5 };
  settings.background = { type: 'color', label: { ar: 'لون الخلفية', en: 'Background colour' }, default: 'theme:text' };
  settings.color = { type: 'color', label: { ar: 'لون النص', en: 'Text colour' }, default: 'theme:background' };
  settings.dismissible = { type: 'boolean', label: { ar: 'زر إغلاق', en: 'Close button' }, default: false };
  const schema = {
    name: { ar: 'شريط إعلانات', en: 'Announcement bar' },
    description: {
      ar: 'حتى ست رسائل قصيرة بروابط، ثابتة أو تتبدل أو تتحرك. بدون أي سكربت.',
      en: 'Up to six short messages with links: still, fading in turn, or scrolling. No script runs.',
    },
    version: 1,
    templates: [...CUSTOM_HTML_TEMPLATES, 'announcement'],
    settings,
  };
  const attrs = Array.from({ length: ANNOUNCEMENT_SLOT_COUNT }, (_, i) => `m${i + 1}="{{ section.settings.m${i + 1} }}" l${i + 1}="{{ section.settings.l${i + 1} }}"`).join(' ');
  return [
    '<hk-section background="{{ section.settings.background }}" padding-y="0" mobile-padding-y="0">',
    `  <hk-announcement ${attrs} motion="{{ section.settings.motion }}" speed="{{ section.settings.speed }}" color="{{ section.settings.color }}" dismissible="{{ section.settings.dismissible }}" />`,
    '</hk-section>',
    '<hk-schema>',
    JSON.stringify(schema, null, 2),
    '</hk-schema>',
    '',
  ].join('\n');
}

export function announcementFiles(): ThemeFile[] {
  return [{ path: `sections/${ANNOUNCEMENT_SECTION}.snf`, bytes: enc.encode(announcementSectionSource()) }];
}
