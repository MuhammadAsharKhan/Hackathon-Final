export const PROVIDER_LABELS = {
  gemini: "Gemini",
  grok: "Grok",
};

export const providerLabel = (provider) =>
  PROVIDER_LABELS[provider] || provider;

export const STARTER_PROMPTS = [
  "Explain what an index does in MongoDB, with one example.",
  "Write a small Express middleware that logs request duration.",
  "Compare PUT and PATCH for an update endpoint.",
];

export const MAX_MESSAGE_LENGTH = 4000;
