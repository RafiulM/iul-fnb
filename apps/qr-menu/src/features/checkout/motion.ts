export const reduceMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** el.animate() with the design's default easing; skipped on reduced motion. */
export function motion(
  el: Element | null | undefined,
  frames: Keyframe[],
  opts: KeyframeAnimationOptions = {},
) {
  if (!el?.animate || reduceMotion()) return undefined;
  try {
    return el.animate(frames, {
      duration: 280,
      easing: "cubic-bezier(.2,.8,.2,1)",
      ...opts,
    });
  } catch {
    return undefined;
  }
}
