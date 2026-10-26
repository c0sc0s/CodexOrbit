export interface Weighted { id: string; tokens: number }
export interface Tile<T> { item: T; x: number; y: number; width: number; height: number }

// Balanced bisection preserves exact area without a minimum tile size distorting occupancy.
export function treemap<T extends Weighted>(items: readonly T[], width: number, height: number, x = 0, y = 0): Tile<T>[] {
  const sorted = items.filter(item => Number.isFinite(item.tokens) && item.tokens > 0).sort((a, b) => b.tokens - a.tokens || a.id.localeCompare(b.id));
  if (!sorted.length || width <= 0 || height <= 0) return [];
  const split = (values: T[], left: number, top: number, w: number, h: number): Tile<T>[] => {
    if (values.length === 1) return [{ item: values[0], x: left, y: top, width: w, height: h }];
    const total = values.reduce((sum, value) => sum + value.tokens, 0);
    let sum = values[0].tokens, boundary = 1;
    while (boundary < values.length - 1 && Math.abs(sum + values[boundary].tokens - total / 2) < Math.abs(sum - total / 2)) sum += values[boundary++].tokens;
    const fraction = sum / total;
    return w >= h
      ? [...split(values.slice(0, boundary), left, top, w * fraction, h), ...split(values.slice(boundary), left + w * fraction, top, w * (1 - fraction), h)]
      : [...split(values.slice(0, boundary), left, top, w, h * fraction), ...split(values.slice(boundary), left, top + h * fraction, w, h * (1 - fraction))];
  };
  return split(sorted, x, y, width, height);
}
