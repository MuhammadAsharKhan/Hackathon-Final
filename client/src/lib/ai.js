const PROVIDER_LABELS = {
  gemini: "Gemini",
  grok: "Grok",
};

export const providerLabel = (provider) =>
  PROVIDER_LABELS[provider] || provider;
