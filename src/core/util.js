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

// terrain height (lane and bases are flat at y=0)
export function heightAt(x, z) {
  const az = Math.abs(z), ax = Math.abs(x);
  const edge = smooth(13, 28, az);
  let h = (fbm(x * 0.07 + 5, z * 0.07) - 0.5) * 2.6 * edge;
  h += smooth(36, 55, az) * 8 * (0.6 + 0.4 * noise(x * 0.03, z * 0.03 + 9));
  h += smooth(98, 110, ax) * 8;
  const baseFlat = smooth(52, 62, ax) * (1 - smooth(24, 36, az)) * (1 - smooth(98, 106, ax));
  return h * (1 - baseFlat);
}
