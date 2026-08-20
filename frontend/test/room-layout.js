const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "roomlayout-"));

execSync(
  `npx tsc ${path.join(root, "src/lib/room-layout.ts")} ` +
    `--outDir ${outDir} --module commonjs --target es2020 --strict`,
  { cwd: root, stdio: "inherit" }
);

const {
  solveStage,
  solveLobbyGrid,
  sidebarFor,
  SIDEBAR_MIN,
  SIDEBAR_MAX,
  RAIL_HEIGHT,
} = require(path.join(outDir, "room-layout.js"));

const results = [];
const check = (label, ok, extra = "") => {
  results.push({ label, ok: !!ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`, extra);
};

const W = 1512;
const H = 945;
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

const sidebar = sidebarFor(W);
check("sidebar sits between its floor and ceiling", sidebar >= SIDEBAR_MIN && sidebar <= SIDEBAR_MAX, sidebar);
check("a narrow viewport pins the sidebar to its floor", sidebarFor(900) === SIDEBAR_MIN);
check("a very wide viewport pins the sidebar to its ceiling", sidebarFor(3200) === SIDEBAR_MAX);

const bandCounts = [1, 2, 3, 4].map((n) => solveStage(W, H, n, true));

check("one to four cameras all produce the same band height", new Set(bandCounts.map((l) => Math.round(l.bandH))).size === 1, Math.round(bandCounts[0].bandH));
check("one to four cameras all produce the same frame", new Set(bandCounts.map((l) => Math.round(l.frameW))).size === 1, Math.round(bandCounts[0].frameW));
check("the four-camera band is the ceiling", solveStage(W, H, 5, true).bandH < bandCounts[3].bandH);
check("five cameras shrink the tile", solveStage(W, H, 5, true).tileW < bandCounts[3].tileW);
check("six cameras shrink it further", solveStage(W, H, 6, true).tileW < solveStage(W, H, 5, true).tileW);
check("past six the tile stops shrinking", near(solveStage(W, H, 9, true).tileW, solveStage(W, H, 6, true).tileW));

const rail = solveStage(W, H, 0, true);
check("no cameras collapses to the rail", rail.mode === "rail" && rail.bandH === RAIL_HEIGHT);
check("the rail gives the frame more height than the band does", rail.frameH > bandCounts[0].frameH);

const lobby = solveStage(W, H, 3, false);
check("nothing playing is the lobby", lobby.mode === "lobby" && lobby.bandH === 0);
check("the lobby frame is the tallest of the three states", lobby.frameH >= rail.frameH);

for (const cams of [0, 1, 3, 4, 5, 6]) {
  const l = solveStage(W, H, cams, true);
  check(`${cams} cameras: frame plus sidebar fits the viewport`, l.frameW + 16 + l.sidebar <= W - 48 + 1, `${Math.round(l.frameW)}+${l.sidebar}`);
  check(`${cams} cameras: the frame keeps 16:9`, near(l.frameW / l.frameH, 16 / 9, 0.02));
}
const tiles = solveStage(W, H, 3, true);
check("three tiles and their gaps fit the frame width", tiles.tileW * 4 + 8 * 3 <= tiles.frameW + 1);
check("the band is taller than its tiles by the padding", near(tiles.bandH - tiles.tileH, 20));

check("a short viewport still yields a usable frame", solveStage(W, 500, 3, true).frameH >= 160);
check("a tiny viewport does not go negative", solveStage(400, 300, 3, true).frameW > 0);

const g3 = solveLobbyGrid(3, 1000, 600);
check("three in the lobby fit their column count", g3.cols >= 1 && g3.cols <= 3, `cols=${g3.cols}`);
check("the lobby grid keeps 16:9", near(g3.tileW / g3.tileH, 16 / 9, 0.02));
check("a lobby of one takes the whole width", solveLobbyGrid(1, 1000, 600).cols === 1);
check("more people in the lobby means smaller tiles", solveLobbyGrid(6, 1000, 600).tileW < solveLobbyGrid(2, 1000, 600).tileW);
check("the lobby grid never overflows its height", (() => {
  for (let n = 1; n <= 8; n++) {
    const g = solveLobbyGrid(n, 1000, 600);
    const rows = Math.ceil(n / g.cols);
    if (rows * g.tileH + 12 * (rows - 1) > 600 + 1) return false;
  }
  return true;
})());
check("the lobby grid never overflows its width", (() => {
  for (let n = 1; n <= 8; n++) {
    const g = solveLobbyGrid(n, 1000, 600);
    if (g.tileW * g.cols + 12 * (g.cols - 1) > 1000 + 1) return false;
  }
  return true;
})());
check("a cramped lobby still returns a positive tile", solveLobbyGrid(8, 600, 120).tileW > 0);
check("one person in a wide short stage is bounded by height", (() => {
  const g = solveLobbyGrid(1, 1006, 492);
  return g.tileH <= 492 + 1 && g.tileW <= 1006 + 1;
})(), JSON.stringify(solveLobbyGrid(1, 1006, 492)));
check("the lobby grid fits both axes across many shapes", (() => {
  for (const [w, h] of [[1006, 492], [1400, 300], [500, 800], [900, 505]]) {
    for (let n = 1; n <= 8; n++) {
      const g = solveLobbyGrid(n, w, h);
      const rows = Math.ceil(n / g.cols);
      if (g.tileW * g.cols + 12 * (g.cols - 1) > w + 1) return false;
      if (g.tileH * rows + 12 * (rows - 1) > h + 1) return false;
      if (g.tileW <= 0) return false;
    }
  }
  return true;
})());

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? `\nall ${results.length} checks passed`
    : `\n${failed.length} of ${results.length} checks FAILED`
);
process.exit(failed.length === 0 ? 0 : 1);
