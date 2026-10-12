# Changelog

## 0.4.1

### Patch Changes

- Cart controller honours `minQuantity` and `quantityStep` and uses the `increase`, `decrease` and `add_failed` text keys; raw errors are never shown.
- Host impact: `CartHost` `t()` must provide `increase`, `decrease` and `add_failed`.

## 0.4.0

### Minor Changes

- First release: variant picker, add to cart, cart count, cart items, cart summary, cart drawer and gallery controllers behind `startControllers(root, host)`.
- `CartLine.minQuantity` and `quantityStep` drive the cart steppers; host text keys `increase`, `decrease` and `add_failed` (a failed add never shows a raw error).
