import { TagRegistry } from '@hekana/sneferu-core';
import { hkContainer, hkGrid, hkSection, hkStack } from './layout';
import { hkBadge, hkButton, hkCard, hkHeading, hkImage, hkText } from './content';
import { hkPrice, hkProductCard, hkProductGrid, formatMoney } from './commerce';

export const BASE_TAGS = [hkSection, hkContainer, hkStack, hkGrid, hkHeading, hkText, hkImage, hkButton, hkCard, hkBadge, hkPrice, hkProductCard, hkProductGrid];
export function createDefaultRegistry(): TagRegistry {
  const r = new TagRegistry();
  for (const t of BASE_TAGS) r.register(t);
  return r;
}
export { formatMoney };
export * from './css';
export * from './attrs';
export * from './layout';
export * from './content';
export * from './commerce';
