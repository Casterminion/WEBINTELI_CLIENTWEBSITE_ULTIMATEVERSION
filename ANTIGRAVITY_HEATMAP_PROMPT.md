# Antigravity prompt: Analyze heatmap images and create Kaunas map version

Use this prompt in Antigravity to analyze the Before/After LeadSnap heatmap images and generate a map-based version for Kaunas.

---

## Prompt

Analyze these two heatmap reference images:

1. **Before heatmap** (BadHeatmap.png): A map with a dense hexagonal grid of circular markers. Each marker is a perfect circle with a thin black outline. Most circles are **red** and display the number **20** in bold white sans-serif text. A few exceptions: one red circle shows **19**, one **green** circle shows **3**, one **yellow** circle shows **11**. The map has a light beige/grey background with streets in light grey; labels show district/area names. The circles are arranged in a tight interlocking hexagonal grid over a central area.

2. **After heatmap** (goodheatmap.png): Same visual style and layout, but the distribution represents the “after” state (better performance): predominantly **green** circles with lower numbers (mainly **1**, some **2**, few **3**).

**Task:** Create the same visual style for a **map of Kaunas, Lithuania**:

- Use a real or stylized **map of Kaunas** (street network, light background, light grey roads, optional green for parks).
- Overlay a **hexagonal grid of circles** in the same style:
  - Perfect circles, thin solid black border.
  - Bold white number centered in each circle.
  - **“Before” state:** Mostly **red** circles with value **20**; a few red **19**; one **green** with **3**; one **yellow** with **11**.
  - **“After” state:** Same grid positions, but circles turn **green**; values change to mainly **1**, some **2**, few **3**.
- Keep layout, density, and typography consistent with the reference so it looks like a “copy-paste” of the same look onto a Kaunas map.

Output: Two images (or one before/after pair) of a Kaunas map with this heatmap overlay, suitable for use as “Before” and “After” LeadSnap heatmap visuals.
