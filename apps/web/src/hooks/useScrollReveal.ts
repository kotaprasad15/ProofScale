import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (els.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
