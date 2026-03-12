/**
 * Hexagonal grid of points over Kaunas for Before/After heatmap.
 * Before: mostly red 20, one 19, one 11, one 3 (green).
 * After: mainly 1, some 2, few 3 (all green when "After" tab).
 */

const KAUNAS_CENTER = { lat: 54.8985, lng: 23.9036 };
const STEP_LAT = 0.008;
const STEP_LNG = 0.012;
const COLS = 11;
const ROWS = 12;

export interface HeatmapPoint {
  lat: number;
  lng: number;
  beforeValue: number;
  afterValue: number;
}

function hexGrid(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const rowCounts = [5, 9, 11, 11, 13, 13, 13, 13, 13, 11, 11, 9, 5];
  const STEP_LAT = 0.0065;
  const STEP_LNG = 0.011;
  const ROWS = rowCounts.length;

  rowCounts.forEach((count, row) => {
    const latIndex = row - ROWS / 2;
    const lat = KAUNAS_CENTER.lat - latIndex * STEP_LAT; // Negative to start from top
    
    // Stagger logic: subtly shift even/odd rows to break strict vertical alignment
    // This maintains the organic honeycomb look while following exact counts
    const staggerOffset = (row % 2 === 0) ? 0 : 0.0001; 

    for (let col = 0; col < count; col++) {
      const lngOffset = (col - (count - 1) / 2) * STEP_LNG;
      const lng = KAUNAS_CENTER.lng + lngOffset + staggerOffset;
      
      points.push({ lat, lng, beforeValue: 20, afterValue: 1 });
    }
  });

  // Before adjustments: mostly 20, some 15-19 for visual interest
  const len = points.length;
  if (len > 0) {
    const randomOutliers = [12, 45, 78, 101, 125, 135];
    randomOutliers.forEach((idx, i) => {
      if (points[idx]) points[idx].beforeValue = 15 + (i % 5);
    });
  }

  // After: All 1s as requested
  for (let i = 0; i < len; i++) {
    points[i].afterValue = 1;
  }

  return points;
}

export const HEATMAP_POINTS = hexGrid();
