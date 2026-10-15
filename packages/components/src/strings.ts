import type { TagRenderContext } from '@hekana/sneferu-core';

type S = Record<string, { ar: string; en: string }>;

/** The built-in words of the commerce tags (see HkTag.strings). */
export const COMMERCE_STRINGS: S = {
  add_to_cart: { ar: 'أضف للسلة', en: 'Add to cart' },
  choose_options: { ar: 'اختر', en: 'Choose options' },
  sold_out: { ar: 'نفد المخزون', en: 'Sold out' },
  quantity: { ar: 'الكمية', en: 'Quantity' },
  quantity_decrease: { ar: 'تقليل الكمية', en: 'Decrease quantity' },
  quantity_increase: { ar: 'زيادة الكمية', en: 'Increase quantity' },
  variant: { ar: 'النوع', en: 'Variant' },
  option: { ar: 'خيار', en: 'Option' },
  cart: { ar: 'السلة', en: 'Cart' },
  view_cart: { ar: 'عرض السلة', en: 'View cart' },
  cart_empty: { ar: 'سلتك فاضية', en: 'Your cart is empty' },
  subtotal: { ar: 'المجموع', en: 'Subtotal' },
  checkout: { ar: 'إتمام الشراء', en: 'Checkout' },
  close: { ar: 'إغلاق', en: 'Close' },
  image: { ar: 'صورة', en: 'Image' },
  pagination: { ar: 'التنقل بين الصفحات', en: 'Pagination' },
  previous_page: { ar: 'الصفحة السابقة', en: 'Previous page' },
  next_page: { ar: 'الصفحة التالية', en: 'Next page' },
  page: { ar: 'صفحة', en: 'Page' },
};

/** The page's text for `key`, else the built-in one (the key itself means "no translation"). */
export function str(c: TagRenderContext, key: string, builtin: S = COMMERCE_STRINGS): string {
  const t = c.t(key);
  return t && t !== key ? t : (builtin[key]?.[c.locale] ?? key);
}
