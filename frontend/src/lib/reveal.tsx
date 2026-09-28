// Design reminder: reveal is a quiet arrival cue — content must be fully readable with or without it.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * Thin reading-progress rail pinned under the header. Fades out at the very
 * top of the page so it never fights the hero. Disabled for reduced motion.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [location] = useLocation();

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 0;
      setProgress(reducedMotion ? ratio : ratio);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`reading-progress ${progress <= 0.005 ? "reading-progress-hidden" : ""}`}
      style={{ transform: `scaleX(${progress})` }}
      key={location}
      aria-hidden="true"
    />
  );
}

// Tag the root before React's first paint so staged content never flashes in un-revealed.
if (typeof document !== "undefined") document.documentElement.classList.add("js-reveal");

const REVEAL_SELECTOR = "[data-reveal]";

/**
 * Marks a scroll-reveal element as visible once it enters the viewport.
 * Runs after every route change and after Suspense swaps, so lazily-mounted
 * pages are picked up too. Re-attaches when the observed subtree changes.
 */
function scanAndObserve() {
  const pending = Array.from(document.querySelectorAll<HTMLElement>(`${REVEAL_SELECTOR}:not([data-revealed])`));
  if (!pending.length) return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    for (const el of pending) el.setAttribute("data-revealed", "true");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.setAttribute("data-revealed", "true");
        observer.unobserve(el);
        // Hand the element back its normal transition/hover physics once the
        // entrance settles; the staging attributes are no longer needed.
        window.setTimeout(() => el.removeAttribute("data-reveal"), 1500);
      }
    },
    { rootMargin: "0px 0px -7% 0px", threshold: 0.06 },
  );
  for (const el of pending) observer.observe(el);
}

let observingNewNodes = false;
function ensureBodyObserver() {
  if (observingNewNodes) return;
  observingNewNodes = true;
  const mutationObserver = new MutationObserver(() => scanAndObserve());
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  // Fast scrolls can hop past the IntersectionObserver's 6% threshold before a
  // frame lands, leaving a below-fold section staged at opacity 0. When the
  // user stops scrolling, reveal anything already inside the viewport.
  let settleTimer = 0;
  window.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(`${REVEAL_SELECTOR}:not([data-revealed])`))) {
          const box = el.getBoundingClientRect();
          if (box.top < window.innerHeight * 0.95 && box.bottom > 0) {
            el.setAttribute("data-revealed", "true");
            window.setTimeout(() => el.removeAttribute("data-reveal"), 1500);
          }
        }
      }, 140);
    },
    { passive: true }
  );
}

/** App-level scroll-reveal controller. Mount once near the router. */
export function RevealController() {
  const [location] = useLocation();

  useEffect(() => {
    scanAndObserve();
    ensureBodyObserver();
    // Elements that never intersect above the fold line still need the class
    // swap; run once more on the next paint so fresh route content is staged.
    const raf = requestAnimationFrame(scanAndObserve);
    return () => cancelAnimationFrame(raf);
  }, [location]);

  return null;
}
