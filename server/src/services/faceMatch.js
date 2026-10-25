const MATCH_THRESHOLD = 0.5;

const isFiniteVector = (values) =>
  Array.isArray(values) &&
  values.length === 128 &&
  values.every((value) => Number.isFinite(value));

// Euclidean distance between two 128-number face templates.
export const compareDescriptors = (enrolled, live) => {
  if (!isFiniteVector(enrolled) || !isFiniteVector(live)) {
    return { ok: false, distance: null, matched: false };
  }

  let sum = 0;
  for (let index = 0; index < 128; index += 1) {
    const delta = enrolled[index] - live[index];
    sum += delta * delta;
  }

  const distance = Math.sqrt(sum);
  return {
    ok: true,
    distance,
    matched: distance < MATCH_THRESHOLD,
  };
};
