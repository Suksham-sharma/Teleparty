export type StageMode = "lobby" | "band" | "rail";

export const PAGE_PAD = 48;
export const CHROME = 233;
export const GAP = 16;
export const TILE_GAP = 8;
export const BAND_PAD = 20;
export const RAIL_HEIGHT = 64;
export const SIDEBAR_MIN = 340;
export const SIDEBAR_MAX = 520;
export const SIDEBAR_RATIO = 0.28;
export const TILES_PER_ROW = 4;
export const TILES_PER_ROW_MAX = 6;
export const LOBBY_GAP = 12;

export interface StageLayout {
  mode: StageMode;
  sidebar: number;
  colW: number;
  frameW: number;
  frameH: number;
  bandH: number;
  tileW: number;
  tileH: number;
}

export const sidebarFor = (viewportW: number) =>
  Math.round(
    Math.min(
      SIDEBAR_MAX,
      Math.max(SIDEBAR_MIN, (viewportW - PAGE_PAD) * SIDEBAR_RATIO)
    )
  );

export function solveStage(
  viewportW: number,
  viewportH: number,
  cams: number,
  playing: boolean
): StageLayout {
  const sidebar = sidebarFor(viewportW);
  const colW = Math.max(240, viewportW - PAGE_PAD - sidebar - GAP);
  const stageH = Math.max(320, viewportH - CHROME);

  const fit = (budget: number) => {
    const frameH = Math.max(160, Math.min(budget, (colW * 9) / 16));
    return { frameH, frameW: (frameH * 16) / 9 };
  };

  const base = { sidebar, colW, tileW: 0, tileH: 0 };

  if (!playing) {
    return { mode: "lobby", bandH: 0, ...fit(stageH), ...base };
  }

  if (cams === 0) {
    return {
      mode: "rail",
      bandH: RAIL_HEIGHT,
      ...fit(stageH - RAIL_HEIGHT - 12),
      ...base,
    };
  }

  const cols = Math.min(
    Math.max(cams, TILES_PER_ROW),
    TILES_PER_ROW_MAX
  );

  let bandH = 160;
  let frameH = 0;
  let frameW = 0;
  let tileW = 0;

  for (let pass = 0; pass < 4; pass++) {
    ({ frameH, frameW } = fit(stageH - bandH - 12));
    tileW = (frameW - TILE_GAP * (cols - 1)) / cols;
    bandH = (tileW * 9) / 16 + BAND_PAD;
  }

  return {
    mode: "band",
    sidebar,
    colW,
    frameW,
    frameH,
    bandH,
    tileW,
    tileH: (tileW * 9) / 16,
  };
}

export function solveLobbyGrid(
  count: number,
  width: number,
  height: number,
  maxTileW = Number.POSITIVE_INFINITY
) {
  const n = Math.max(count, 1);
  let best = { cols: 1, tileW: 0, tileH: 0 };

  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const byWidth = (width - LOBBY_GAP * (cols - 1)) / cols;
    const byHeight = ((height - LOBBY_GAP * (rows - 1)) / rows) * (16 / 9);
    const tileW = Math.min(byWidth, byHeight, maxTileW);
    if (tileW > best.tileW) best = { cols, tileW, tileH: (tileW * 9) / 16 };
  }

  return {
    cols: best.cols,
    tileW: Math.max(0, best.tileW),
    tileH: Math.max(0, best.tileH),
  };
}
