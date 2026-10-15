# Changelog

## 0.9.1

## 0.9.0

0.8.0 was the reverted checkout-template release (#63, #67) and stays on npm under the `next` tag only; this release supersedes it.

## 0.7.0

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.

## 0.5.0

### Minor Changes

- No functional changes; versions follow the fixed group.

## 0.4.2

## 0.4.1

### Patch Changes

- Cart controller honours `minQuantity` and `quantityStep` and uses the `increase`, `decrease` and `add_failed` text keys; raw errors are never shown.
- Host impact: `CartHost` `t()` must provide `increase`, `decrease` and `add_failed`.

## 0.4.0

### Minor Changes

- First release: variant picker, add to cart, cart count, cart items, cart summary, cart drawer and gallery controllers behind `startControllers(root, host)`.
- `CartLine.minQuantity` and `quantityStep` drive the cart steppers; host text keys `increase`, `decrease` and `add_failed` (a failed add never shows a raw error).
