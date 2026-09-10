import { animate } from "motion/mini";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const easeOut = [0.2, 0.8, 0.2, 1] as const;
const EXIT_SETTLE_TIMEOUT_MS = 240;

export function enterDashboard(overlay: HTMLElement, dialog: HTMLElement): void {
  animate(overlay, { opacity: [0, 1] }, { duration: reducedMotionQuery.matches ? 0.1 : 0.14, ease: "easeOut" });
  if (reducedMotionQuery.matches) return;
  animate(
    dialog,
    {
      opacity: [0, 1],
      transform: ["translateY(6px) scale(.985)", "translateY(0) scale(1)"],
    },
    { duration: 0.18, ease: easeOut },
  );
}

export async function exitDashboard(overlay: HTMLElement, dialog: HTMLElement): Promise<void> {
  const animations = [animate(overlay, { opacity: 0 }, { duration: reducedMotionQuery.matches ? 0.08 : 0.12, ease: "easeIn" })];
  if (!reducedMotionQuery.matches) {
    animations.push(animate(
      dialog,
      { opacity: 0, transform: "translateY(4px) scale(.99)" },
      { duration: 0.12, ease: "easeIn" },
    ));
  }
  // Chromium can suspend animation timelines for an unfocused Electron window.
  // Closing state must settle even when the visual transition never completes.
  await Promise.race([
    Promise.all(animations),
    new Promise<void>((resolve) => setTimeout(resolve, EXIT_SETTLE_TIMEOUT_MS)),
  ]);
}

export function enterSortMenu(menu: HTMLElement): void {
  if (reducedMotionQuery.matches) return;
  animate(
    menu,
    { opacity: [0, 1], transform: ["translateY(-4px) scale(.98)", "translateY(0) scale(1)"] },
    { duration: 0.12, ease: easeOut },
  );
}

export function enterDashboardContent(content: HTMLElement): void {
  animate(
    content,
    reducedMotionQuery.matches
      ? { opacity: [0, 1] }
      : { opacity: [0, 1], transform: ["translateY(2px)", "translateY(0)"] },
    { duration: reducedMotionQuery.matches ? 0.08 : 0.12, ease: "easeOut" },
  );
}

export function refreshResults(results: HTMLElement): void {
  animate(
    results,
    reducedMotionQuery.matches
      ? { opacity: [0.72, 1] }
      : { opacity: [0.72, 1], transform: ["translateY(2px)", "translateY(0)"] },
    { duration: reducedMotionQuery.matches ? 0.08 : 0.12, ease: "easeOut" },
  );
}
