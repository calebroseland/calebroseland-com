/* Runs in the page: at each view transition, samples the old and new page snapshots through the
   animation and records any moment they leave part of the page uncovered. */
export function probeTransitionCoverage() {
  const w = window as unknown as { __vtGaps: string[] };
  w.__vtGaps = [];
  if (typeof document.startViewTransition !== 'function') {
    return;
  }
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
    const t = start(arg);
    t.ready.then(
      () => {
        const root = document.documentElement;
        const running = document
          .getAnimations()
          .filter((a) =>
            ((a.effect as KeyframeEffect | null)?.pseudoElement ?? '').startsWith(
              '::view-transition',
            ),
          );
        if (running.length === 0) {
          return;
        }
        const saved = running.map((a) => a.currentTime);
        const end = Math.max(...running.map((a) => Number(a.effect?.getComputedTiming().endTime)));
        const style = (pseudo: string) => getComputedStyle(root, pseudo);
        for (const a of running) {
          a.pause();
        }
        try {
          for (const f of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]) {
            for (const a of running) {
              a.currentTime = end * f;
            }
            const old = Number(style('::view-transition-old(root)').opacity);
            const next = Number(style('::view-transition-new(root)').opacity);
            if (Number.isNaN(old) || Number.isNaN(next)) {
              return;
            }
            const additive = style('::view-transition-new(root)').mixBlendMode === 'plus-lighter';
            const cover = additive ? Math.min(1, old + next) : next + old * (1 - next);
            if (cover < 0.99) {
              w.__vtGaps.push(
                `${root.dataset.vt ?? 'page'} at ${Math.round(f * 100)}%: ${cover.toFixed(2)} covered`,
              );
            }
          }
        } finally {
          running.forEach((a, i) => {
            a.currentTime = saved[i] ?? 0;
            a.play();
          });
        }
      },
      () => undefined,
    );
    return t;
  }) as typeof document.startViewTransition;
}
