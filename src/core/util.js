export function rng(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function hash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
export function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
export const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.1;

// ---- layout constants shared by the whole game ----
export const LANE_HALF = 5.5;       // walkable half width of the lane
export const BASE_X = 84;           // |x| of each faction base centre
export const SPAWN_X = 66;          // |x| of spawn pads
export const TOWER_X = 36;          // |x| of each outer lane tower
export const CORE_X = 59;           // |x| of each base core (destroy it to win)

// ---- walkable area: lane (wider at tower plazas) + base yards + jungle paths + Vessari camps ----
export const widen = (x) => 1 + 0.75 * Math.exp(-(((Math.abs(x) - TOWER_X) / 6) ** 2));
// Jungle camps. reward: 'convert' (Vessari join the lane), 'power' / 'signal' (hero buff), or none (gold + xp farm).
export const CAMPS = [
  { id: 'riftN', name: 'Fenda Norte', x: 0, z: -35, r: 8.5, side: -1, rift: true, kinds: ['eco', 'eco', 'eco'], reward: 'convert', respawn: 60 },
  { id: 'riftS', name: 'Fenda Sul', x: 0, z: 35, r: 8.5, side: 1, rift: true, kinds: ['eco', 'eco', 'eco'], reward: 'convert', respawn: 60 },
  { id: 'power', name: 'Colosso Colheitadeira', x: 24, z: -48, r: 6.8, side: -1, kinds: ['colosso'], reward: 'power', respawn: 90 },
  { id: 'signal', name: 'Eco Ancião', x: -24, z: 48, r: 6.8, side: 1, kinds: ['anciao'], reward: 'signal', respawn: 90 },
  { id: 'caesN', name: 'Matilha de Sucata', x: -33, z: -29, r: 5.2, side: -1, kinds: ['cao', 'cao', 'cao'], respawn: 45 },
  { id: 'caesS', name: 'Matilha de Sucata', x: 33, z: 29, r: 5.2, side: 1, kinds: ['cao', 'cao', 'cao'], respawn: 45 },
  { id: 'faiscasN', name: 'Faíscas da Fenda', x: 33, z: -29, r: 5.2, side: -1, kinds: ['faisca', 'faisca'], respawn: 45 },
  { id: 'faiscasS', name: 'Faíscas da Fenda', x: -33, z: 29, r: 5.2, side: 1, kinds: ['faisca', 'faisca'], respawn: 45 },
];
export const PATH_R = 3;
export const PATHS = [];                       // jungle trail segments [ax, az, bx, bz]
for (const s of [-1, 1]) for (const m of [-1, 1]) {
  const pts = [[m * 22, s * 3], [m * 21.5, s * 19], [m * 11, s * 31], [m * 3, s * 35]];
  for (let i = 0; i < pts.length - 1; i++) PATHS.push([...pts[i], ...pts[i + 1]]);
  PATHS.push([m * 21.5, s * 19, m * 33, s * 29]);                          // spur to the small farm camps
}
PATHS.push([11, -31, 24, -48], [-11, 31, -24, 48]);                        // spurs to the buff camps
PATHS.push([24, -48, 33, -29], [-24, 48, -33, 29], [-11, -31, -24, -46], [-24, -46, -33, -29], [11, 31, 24, 46], [24, 46, 33, 29]);   // loops: every camp has two exits
for (const s of [-1, 1]) for (const m of [-1, 1]) {
  PATHS.push([m * 33, s * 29, m * 46, s * 22], [m * 46, s * 22, m * 55, s * 13.5]);     // outer ring: farm camp -> side gate of the base
  PATHS.push([m * 41, s * 3, m * 41, s * 14], [m * 41, s * 14, m * 46, s * 22]);        // gank gate just behind the outer tower
}
// Milharais (tall corn): a hero standing inside is hidden from enemies that are not in the same patch or right next to it.
export const BRUSH = [];
for (const s of [-1, 1]) for (const m of [-1, 1]) BRUSH.push({ x: m * 9, z: s * 5.0, r: 2.7 }, { x: m * 21.7, z: s * 11, r: 2.9 }, { x: m * 41, z: s * 9.5, r: 2.9 }, { x: m * 16.5, z: s * 25, r: 2.8 }, { x: m * 46, z: s * 22, r: 3.1 });
export function inBrush(x, z) { for (let i = 0; i < BRUSH.length; i++) { const b = BRUSH[i]; if ((x - b.x) ** 2 + (z - b.z) ** 2 < b.r * b.r) return i; } return -1; }
const laneLim = (x) => { const ax = Math.abs(x); return ax > 54 ? 12.5 : lerp(5.6 * widen(x), 12.5, smooth(50, 54, ax)); };
// distance to the walkable area (<= 0 inside). `out` receives the nearest walkable point.
export function navDist(x, z, out) {
  const cx = clamp(x, -73.5, 73.5), lim = laneLim(cx), cz = clamp(z, -lim, lim);
  let best = Math.hypot(x - cx, z - cz), bx = cx, bz = cz;
  const test = (px, pz, r) => {
    const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz), d = l - r;
    if (d < best) { best = d; if (d > 0) { bx = px + (dx / l) * r; bz = pz + (dz / l) * r; } else { bx = x; bz = z; } }
  };
  if (Math.abs(z) > 4) {
    for (const [ax, az, ex, ez] of PATHS) { const vx = ex - ax, vz = ez - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1); test(ax + vx * t, az + vz * t, PATH_R); }
    for (const c of CAMPS) test(c.x, c.z, c.r);
  }
  if (out) { out.x = bx; out.z = bz; }
  return best;
}
const _np = { x: 0, z: 0 };
export function clampWalk(p) { if (navDist(p.x, p.z, _np) > 0) { p.x = _np.x; p.z = _np.z; } return p; }

// terrain height: flat on everything walkable, in the town band beside the lane and in the bases
export function heightAt(x, z) {
  const az = Math.abs(z), ax = Math.abs(x);
  let h = (fbm(x * 0.07 + 5, z * 0.07) - 0.5) * 2.6;
  h += smooth(64, 86, az) * 9 * (0.6 + 0.4 * noise(x * 0.03, z * 0.03 + 9));
  h += smooth(98, 110, ax) * 8;
  const flat = Math.max(1 - smooth(17, 32, az), 1 - smooth(1.5, 8, navDist(x, z)), smooth(52, 62, ax) * (1 - smooth(24, 36, az)) * (1 - smooth(98, 106, ax)));
  return h * (1 - flat);
}

// ---- path finding: straight line when clear, otherwise a tiny waypoint graph (lane spine + trail joints + camps) ----
export const BLOCKERS = [];                    // circular obstacles (towers): { x, z, r, on() }
export function clear(ax, az, bx, bz) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.8));
  for (let i = 0; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (navDist(x, z) > 0.05) return false;
    for (const o of BLOCKERS) if (o.on() && Math.hypot(x - o.x, z - o.z) < o.r + 0.5 && i > 0 && i < n) return false;
  }
  return true;
}
let NODES = null, EDGES = null;
function graph() {
  NODES = []; const add = (x, z) => { if (!NODES.some((n) => Math.hypot(n[0] - x, n[1] - z) < 1)) NODES.push([x, z]); };
  for (const x of [-68, -52, -44, -28, -22, -11, 0, 11, 22, 28, 44, 52, 68]) add(x, 0);
  for (const s of [-1, 1]) for (const z of [-5, 5]) { add(s * TOWER_X, z); add(s * CORE_X, z * 1.3); }                    // slip past either side of a tower / core
  for (const [a, b2, c, d] of PATHS) { add(a, b2); add(c, d); } for (const c of CAMPS) add(c.x, c.z);
  EDGES = NODES.map((a, i) => NODES.map((b2, j) => (i !== j && clear(a[0], a[1], b2[0], b2[1]) ? Math.hypot(a[0] - b2[0], a[1] - b2[1]) : 0)));
}
export function findPath(from, to) {
  const goal = clampWalk({ x: to.x, z: to.z });
  if (clear(from.x, from.z, goal.x, goal.z)) return [goal];
  if (!NODES) graph();
  const N = NODES.length, dist = new Array(N + 1).fill(Infinity), prev = new Array(N + 1).fill(-1), done = new Array(N + 1).fill(false);
  const toGoal = NODES.map((n) => (clear(n[0], n[1], goal.x, goal.z) ? Math.hypot(n[0] - goal.x, n[1] - goal.z) : 0));
  NODES.forEach((n, i) => { if (clear(from.x, from.z, n[0], n[1])) dist[i] = Math.hypot(n[0] - from.x, n[1] - from.z); });
  for (;;) {
    let u = -1; for (let i = 0; i <= N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === N) break; done[u] = true;
    for (let v = 0; v < N; v++) if (EDGES[u][v] && dist[u] + EDGES[u][v] < dist[v]) { dist[v] = dist[u] + EDGES[u][v]; prev[v] = u; }
    if (toGoal[u] && dist[u] + toGoal[u] < dist[N]) { dist[N] = dist[u] + toGoal[u]; prev[N] = u; }
  }
  if (dist[N] === Infinity) return [goal];
  const out = [goal]; for (let u = prev[N]; u >= 0; u = prev[u]) out.unshift({ x: NODES[u][0], z: NODES[u][1] });
  return out;
}
