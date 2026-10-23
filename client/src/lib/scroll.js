const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const scrollToElement = (element, block = "start") => {
  if (!element) return;

  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block,
  });
};

export const scrollToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
};
