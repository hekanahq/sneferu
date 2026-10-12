export interface CartLine {
  key: string;
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  image?: string;
  url?: string;
  unitPrice: number;
  quantity: number;
  maxQuantity?: number;
}

export type CartText =
  | 'add_to_cart'
  | 'added'
  | 'sold_out'
  | 'remove'
  | 'subtotal'
  | 'checkout'
  | 'empty'
  | 'quantity'
  | 'close';

export interface CartHost {
  locale: 'ar' | 'en';
  currency: string;
  format(minor: number): string;
  get(): CartLine[];
  add(input: { productId: string; variantId?: string; quantity: number }): Promise<{ ok: boolean; message?: string }>;
  update(key: string, quantity: number): void;
  remove(key: string): void;
  subscribe(fn: (lines: CartLine[]) => void): () => void;
  checkoutUrl: string;
  t(key: CartText): string;
}

export const EVENT_VARIANT_CHANGE = 'hk:variant-change';
export const EVENT_CART_ADDED = 'hk:cart-added';
/** Internal: variant picker tells an add-to-cart form which variant is selected. */
export const EVENT_VARIANT_APPLY = 'hk:variant-apply';
