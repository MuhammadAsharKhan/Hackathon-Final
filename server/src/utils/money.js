// Money is stored as PKR numbers and rounded once per computed amount.
export const round2 = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
