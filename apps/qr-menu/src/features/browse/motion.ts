// Small Web Animations helper (design: motion()); skipped for reduced motion.

export const reduceMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function motion(
  el: Element | null | undefined,
  frames: Keyframe[],
  opts: KeyframeAnimationOptions = {},
) {
  if (!el?.animate || reduceMotion()) return;
  try {
    el.animate(frames, {
      duration: 280,
      easing: "cubic-bezier(.2,.8,.2,1)",
      ...opts,
    });
  } catch {
    /* ignore */
  }
}
