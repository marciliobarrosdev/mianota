import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

function normalizeLength(length: number) {
  if (!Number.isFinite(length) || length <= 0) return 0;
  return Math.floor(length);
}

function normalizeIndex(index: number, length: number) {
  if (length === 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.floor(index), 0), length - 1);
}

export function useInViewCycle(length: number, intervalMs: number) {
  const itemCount = normalizeLength(length);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeState, setActiveState] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
    typeof document === "undefined" ? false : !document.hidden,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [restartKey, setRestartKey] = useState(0);

  const active = normalizeIndex(activeState, itemCount);

  const setActive = useCallback<Dispatch<SetStateAction<number>>>(
    (nextActive) => {
      setActiveState((currentActive) => {
        const current = normalizeIndex(currentActive, itemCount);
        const next = typeof nextActive === "function" ? nextActive(current) : nextActive;

        return normalizeIndex(next, itemCount);
      });
      setRestartKey((key) => key + 1);
    },
    [itemCount],
  );

  const replay = useCallback(() => {
    setActiveState(0);
    setRestartKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(Boolean(entry?.isIntersecting));
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  useEffect(() => {
    const hasValidInterval = Number.isFinite(intervalMs) && intervalMs > 0;
    if (
      itemCount < 2 ||
      active >= itemCount - 1 ||
      !hasValidInterval ||
      !isInView ||
      !isDocumentVisible ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveState((currentActive) =>
        Math.min(normalizeIndex(currentActive, itemCount) + 1, itemCount - 1),
      );
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [
    active,
    intervalMs,
    isDocumentVisible,
    isInView,
    itemCount,
    prefersReducedMotion,
    restartKey,
  ]);

  return { sectionRef, active, setActive, replay, isInView };
}
