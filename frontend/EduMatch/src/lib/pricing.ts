export const MIN_SESSION_PRICE = 100;

export function minimumPriceMessage() {
  return `Session price cannot be less than ${MIN_SESSION_PRICE} EGP.`;
}
