import { TagRegistry } from '@hekana/sneferu-core';
import { hkContainer, hkGrid, hkSection, hkStack } from './layout';
import { hkBadge, hkButton, hkCard, hkHeading, hkImage, hkRichText, hkText } from './content';
import { hkPrice, hkProductCard, hkProductGrid, formatMoney } from './commerce';
import { hkIcon } from './icon';
import { hkSearchForm } from './search';
import { hkProductGallery } from './gallery';
import { hkPagination, hkLocaleSwitch } from './pagination';
import { hkVariantPicker, hkAddToCart, hkCartCount, hkCartItems, hkCartSummary, hkCartDrawer } from './cart';
import { hkSectionGroup } from './group';
import { CHECKOUT_TAG_LIST } from './checkout';

export const BASE_TAGS = [hkSection, hkContainer, hkStack, hkGrid, hkHeading, hkText, hkRichText, hkImage, hkButton, hkCard, hkBadge, hkIcon, hkSearchForm, hkPrice, hkProductCard, hkProductGrid,
  hkProductGallery, hkPagination, hkLocaleSwitch, hkVariantPicker, hkAddToCart, hkCartCount, hkCartItems, hkCartSummary, hkCartDrawer, hkSectionGroup, ...CHECKOUT_TAG_LIST];
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
export { sanitizeRichText } from './sanitize';
export { hkIcon, iconSvg, iconSize, iconStroke, isIconName, FLIP_CSS } from './icon';
export { ICONS, ICON_NAMES, FLIP_ICONS } from './icons';
export { hkSearchForm, VISUALLY_HIDDEN_CSS } from './search';
export { pickVariant, srcsetOf, candidatesOf, type ImageRef, type ImageCandidate } from './image-src';
export { hkProductGallery, GALLERY_CSS } from './gallery';
export { hkPagination, hkLocaleSwitch, PAGINATION_CSS } from './pagination';
export { hkVariantPicker, hkAddToCart, hkCartCount, hkCartItems, hkCartSummary, hkCartDrawer } from './cart';
export { hkSectionGroup } from './group';
export { hkCheckoutLayout, hkCheckoutContact, hkCheckoutShipping, hkCheckoutSummary, hkCheckoutPayment, CHECKOUT_TAG_LIST } from './checkout';
export { COMMERCE_STRINGS } from './strings';
export { imagesOf, variantsOf, optionsOf, selectedVariant, qtyRules } from './product-view';
