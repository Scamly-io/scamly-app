/**
 * Rank article rows by `weekly_views`, or shuffle when every row has zero weekly views.
 */

export type HasWeeklyViews = { weekly_views?: number | null };

export function weeklyViewsScore(row: HasWeeklyViews): number {
  return Number(row.weekly_views) || 0;
}

export function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Full pool ordered by weekly_views desc, or shuffled when all scores are zero. */
export function orderPoolByWeeklyViewsOrRandom<T extends HasWeeklyViews>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const copy = [...rows];
  const allZero = copy.every((r) => weeklyViewsScore(r) === 0);
  if (allZero) {
    shuffleInPlace(copy);
    return copy;
  }
  return copy.sort((a, b) => {
    const diff = weeklyViewsScore(b) - weeklyViewsScore(a);
    if (diff !== 0) return diff;
    const idA = String((a as { id?: string }).id ?? "");
    const idB = String((b as { id?: string }).id ?? "");
    return idA.localeCompare(idB);
  });
}

export function pickByWeeklyViewsOrRandom<T extends HasWeeklyViews>(rows: T[], count: number): T[] {
  if (count <= 0 || rows.length === 0) return [];
  const ordered = orderPoolByWeeklyViewsOrRandom(rows);
  return ordered.slice(0, Math.min(count, ordered.length));
}

/** Featured = first in ranked/shuffled pool; trending = next three (no overlap). */
export function pickFeaturedAndTrending<T extends HasWeeklyViews>(
  rows: T[]
): { featured: T | null; trending: T[] } {
  const ordered = orderPoolByWeeklyViewsOrRandom(rows);
  if (ordered.length === 0) return { featured: null, trending: [] };
  return {
    featured: ordered[0] ?? null,
    trending: ordered.slice(1, 4),
  };
}
