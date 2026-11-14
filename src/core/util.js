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
export const TOWER_X = 36;          // |x| of each lane tower

// ---- walkable area: lane (wider at tower plazas) + base yards + jungle paths + Vessari camps ----
export const widen = (x) => 1 + 0.75 * Math.exp(-(((Math.abs(x) - TOWER_X) / 6) ** 2));
export const CAMPS = [{ x: 0, z: -35, r: 8.5, side: -1 }, { x: 0, z: 35, r: 8.5, side: 1 }];   // side: -1 north, +1 south
export const PATH_R = 3;
export const PATHS = [];                       // jungle trail segments [ax, az, bx, bz]
for (const s of [-1, 1]) for (const m of [-1, 1]) {
  const pts = [[m * 22, s * 3], [m * 21.5, s * 19], [m * 11, s * 31], [m * 3, s * 35]];
  for (let i = 0; i < pts.length - 1; i++) PATHS.push([...pts[i], ...pts[i + 1]]);
}
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
