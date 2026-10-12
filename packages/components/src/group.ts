import { GROUP_NAMES, type HkTag } from '@hekana/sneferu-core';

/**
 * Where a shared section group (header, footer, announcement) sits in the layout. The runtime
 * renders the group's section tree here; the tag itself prints nothing. Layout only (SN2018).
 */
export const hkSectionGroup: HkTag = {
  name: 'hk-section-group', version: 1, category: 'layout',
  props: { name: { type: 'select', label: { ar: 'المجموعة', en: 'Group' }, options: [...GROUP_NAMES], required: true } },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: [],
  editor: { label: { ar: 'مجموعة أقسام مشتركة', en: 'Shared section group' }, group: 'layout', insertable: false, privileged: true },
  render: () => '',
};
