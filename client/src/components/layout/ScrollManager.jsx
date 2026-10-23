import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToElement, scrollToTop } from "@/lib/scroll";

const scrollToHash = (hash) => {
  const target = document.getElementById(hash.slice(1));
  scrollToElement(target);
};

export default function ScrollManager() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) return;
    scrollToTop();
  }, [pathname]);

  useEffect(() => {
    if (!hash) return;

    const frame = requestAnimationFrame(() => scrollToHash(hash));
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  useEffect(() => {
    const handleHashChange = () => {
      if (!window.location.hash) return;
      requestAnimationFrame(() => scrollToHash(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return null;
}
