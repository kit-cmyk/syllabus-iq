const DEFAULT_ALPHA = 0.4

/**
 * Exponentially weighted moving average.
 * Favors recent quiz attempts over older ones.
 * alpha=0.4 means recent score gets 40% weight.
 */
export function computeEwma(
  prevMastery: number,
  scorePercent: number,
  alpha = DEFAULT_ALPHA
): number {
  const updated = alpha * scorePercent + (1 - alpha) * prevMastery
  return Math.min(100, Math.max(0, Math.round(updated * 10) / 10))
}

export function scoreToPercent(score: number, totalItems: number): number {
  if (totalItems === 0) return 0
  return (score / totalItems) * 100
}
