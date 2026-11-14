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
export const SIDE_Z = 54;           // |z| das lanes laterais (top = -, bot = +)

// ---- 3 lanes: polylinhas de AXIOM (x<0) para EKOO (x>0). Todas correm ao longo de x no trecho principal. ----
export const LANES = {
  mid: [[-64, 0], [64, 0]],
  top: [[-60, -9], [-66, -44], [-56, -SIDE_Z], [56, -SIDE_Z], [66, -44], [60, -9]],
  bot: [[-60, 9], [-66, 44], [-56, SIDE_Z], [56, SIDE_Z], [66, 44], [60, 9]],
};
export const LANE_IDS = ['top', 'mid', 'bot'];
// Rio: corta o mapa de norte a sul (cruz com a mid), ligando a lane top à bot. Raso: dá para andar.
export const RIVER_HALF = 3.6, RIVER_Z = SIDE_Z - 2;
export const riverX = (z) => 4.5 * Math.sin(z * 0.075) + 1.5 * Math.sin(z * 0.21);
export const laneZ = (id) => (id === 'top' ? -SIDE_Z : id === 'bot' ? SIDE_Z : 0);
// Referencial local da lane no ponto (x,z) para quem anda no sentido `dir` (+1 AXIOM→EKOO, -1 o contrário):
// f = direção de avanço, n = normal (esquerda), off = deslocamento lateral do ponto em relação ao eixo.
const _fr = { fx: 1, fz: 0, nx: 0, nz: 1, off: 0, t: 0 };
export function laneFrame(id, x, z, dir) {
  const P = LANES[id]; let best = Infinity, bi = 0, bt = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1], vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz;
    const t = clamp(((x - ax) * vx + (z - az) * vz) / L2, 0, 1), d = (x - ax - vx * t) ** 2 + (z - az - vz * t) ** 2;
    if (d < best) { best = d; bi = i; bt = t; }
  }
  const seg = (i) => { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az); return [(bx - ax) / L, (bz - az) / L]; };
  let [fx, fz] = seg(bi);
  // perto do fim do segmento (no sentido de marcha), já vira para o próximo: curvas suaves
  const L = Math.hypot(P[bi + 1][0] - P[bi][0], P[bi + 1][1] - P[bi][1]), toEnd = (dir > 0 ? 1 - bt : bt) * L;
  const ni = dir > 0 ? bi + 1 : bi - 1;
  if (toEnd < 6 && ni >= 0 && ni < P.length - 1) { const [gx, gz] = seg(ni), k = 1 - toEnd / 6; fx = fx * (1 - k) + gx * k; fz = fz * (1 - k) + gz * k; const l = Math.hypot(fx, fz); fx /= l; fz /= l; }
  if (dir < 0) { fx = -fx; fz = -fz; }
  const [ax, az] = P[bi], [sx, sz] = seg(bi), px = ax + sx * bt * L, pz = az + sz * bt * L;
  _fr.fx = fx; _fr.fz = fz; _fr.nx = -fz; _fr.nz = fx; _fr.off = (x - px) * _fr.nx + (z - pz) * _fr.nz; _fr.t = bi + bt;
  return _fr;
}

// ---- walkable area: lane (wider at tower plazas) + base yards + jungle paths + Vessari camps ----
export const widen = (x) => 1 + 0.75 * Math.exp(-(((Math.abs(x) - TOWER_X) / 6) ** 2));
const widenSide = (x) => 30 * Math.exp(-(((Math.abs(x) - TOWER_X) / 6) ** 2));   // praça da torre nas laterais (+3u)
// Jungle camps. reward: 'convert' (Vessari join the lane), 'power' / 'signal' (hero buff), or none (gold + xp farm).
export const CAMPS = [
  { id: 'riftN', name: 'Fenda Norte', x: 0, z: -30, r: 8.5, side: -1, rift: true, kinds: ['eco', 'eco', 'eco'], reward: 'convert', respawn: 60 },
  { id: 'riftS', name: 'Fenda Sul', x: 0, z: 30, r: 8.5, side: 1, rift: true, kinds: ['eco', 'eco', 'eco'], reward: 'convert', respawn: 60 },
  { id: 'power', name: 'Colosso Colheitadeira', x: 24, z: -40, r: 6.8, side: -1, kinds: ['colosso'], reward: 'power', respawn: 90, first: 15 },
  { id: 'signal', name: 'Eco Ancião', x: -24, z: 40, r: 6.8, side: 1, kinds: ['anciao'], reward: 'signal', respawn: 90, first: 15 },
  { id: 'caesN', name: 'Matilha de Sucata', x: -33, z: -29, r: 5.2, side: -1, kinds: ['cao', 'cao', 'cao'], respawn: 45 },
  { id: 'caesS', name: 'Matilha de Sucata', x: 33, z: 29, r: 5.2, side: 1, kinds: ['cao', 'cao', 'cao'], respawn: 45 },
  // buff duplo: cada metade da selva tem SOBRECARGA e SINAL LIMPO (o caçador faz os dois)
  { id: 'power2', name: 'Colosso Colheitadeira', x: -24, z: -40, r: 6.8, side: -1, kinds: ['colosso'], reward: 'power', respawn: 90, first: 15 },
  { id: 'signal2', name: 'Eco Ancião', x: 24, z: 40, r: 6.8, side: 1, kinds: ['anciao'], reward: 'signal', respawn: 90, first: 15 },
  // objetivos épicos (fossos colados nas lanes laterais), com primeira aparição atrasada
  { id: 'lord', name: 'O QUE ESCUTA', x: 0, z: -46, r: 5, side: -1, kinds: ['lorde'], reward: 'lord', respawn: 180, first: 240, epic: true },
  { id: 'colossus', name: 'COLOSSO DA FENDA', x: 0, z: 46, r: 5, side: 1, kinds: ['tita'], reward: 'team', respawn: 150, first: 120, epic: true },
  // rota de ouro (bot): ninhos de farm colados na lane, um de cada lado
  { id: 'ouroA', name: 'Ninho de Sucata', x: -40, z: 46, r: 4.2, side: 1, kinds: ['cao', 'cao'], respawn: 35 },
  { id: 'ouroE', name: 'Ninho de Sucata', x: 40, z: 46, r: 4.2, side: 1, kinds: ['cao', 'cao'], respawn: 35 },
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
PATHS.push([11, -31, 24, -40], [-11, 31, -24, 40]);                        // spurs to the buff camps
PATHS.push([24, -40, 33, -29], [-24, 40, -33, 29], [-11, -31, -24, -40], [-24, -40, -33, -29], [11, 31, 24, 40], [24, 40, 33, 29]);
// selva → lanes laterais: cada quadrante tem uma saída para a lane top/bot (rotas de gank)
for (const s of [-1, 1]) for (const m of [-1, 1]) PATHS.push([m * 24, s * 40, m * 20, s * 50], [m * 3, s * 35, m * 4, s * 50], [m * 46, s * 22, m * 48, s * 50]);   // loops: every camp has two exits
for (const s of [-1, 1]) for (const m of [-1, 1]) {
  PATHS.push([m * 33, s * 29, m * 46, s * 22], [m * 46, s * 22, m * 55, s * 13.5]);     // outer ring: farm camp -> side gate of the base
  PATHS.push([m * 41, s * 3, m * 41, s * 14], [m * 41, s * 14, m * 46, s * 22]);        // gank gate just behind the outer tower
}
// Milharais (tall corn): a hero standing inside is hidden from enemies that are not in the same patch or right next to it.
export const BRUSH = [];
for (const s of [-1, 1]) for (const m of [-1, 1]) BRUSH.push({ x: m * 9, z: s * 5.0, r: 2.7 }, { x: m * 21.7, z: s * 11, r: 2.9 }, { x: m * 41, z: s * 9.5, r: 2.9 }, { x: m * 16.5, z: s * 25, r: 2.8 }, { x: m * 46, z: s * 22, r: 3.1 });
export function inBrush(x, z) { for (let i = 0; i < BRUSH.length; i++) { const b = BRUSH[i]; if ((x - b.x) ** 2 + (z - b.z) ** 2 < b.r * b.r) return i; } return -1; }
const laneLim = (x) => { const ax = Math.abs(x); return ax > 54 ? 12.5 : lerp(5.6 * widen(x), 12.5, smooth(50, 54, ax)); };
// LAYOUT: corredores desenhados (lanes, trilhas, camps). Usado só para posicionar decoração e achatar o terreno.
export function layoutDist(x, z, out) {
  const cx = clamp(x, -73.5, 73.5), lim = laneLim(cx), cz = clamp(z, -lim, lim);
  let best = Math.hypot(x - cx, z - cz), bx = cx, bz = cz;
  const test = (px, pz, r) => {
    const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz), d = l - r;
    if (d < best) { best = d; if (d > 0) { bx = px + (dx / l) * r; bz = pz + (dz / l) * r; } else { bx = x; bz = z; } }
  };
  if (Math.abs(z) > 4) {
    if (Math.abs(z) <= RIVER_Z) test(riverX(z), z, RIVER_HALF);
    for (const id of ['top', 'bot']) { const P = LANES[id]; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [ex, ez] = P[i + 1], vx = ex - ax, vz = ez - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1); test(ax + vx * t, az + vz * t, LANE_HALF + 0.1 * widenSide(ax + vx * t)); } }
    for (const [ax, az, ex, ez] of PATHS) { const vx = ex - ax, vz = ez - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1); test(ax + vx * t, az + vz * t, PATH_R); }
    for (const c of CAMPS) test(c.x, c.z, c.r);
  }
  if (out) { out.x = bx; out.z = bz; }
  return best;
}
// ---- NAVEGAÇÃO (mundo aberto): anda-se em quase todo o mapa; só o entorno dos objetos colide ----
export const OBST = [];                         // { x, z, r }
const CELL = 8, GRID = new Map(); let gridN = -1;
export function addObst(x, z, r) { OBST.push({ x, z, r }); }
function grid() {
  if (gridN === OBST.length) return; GRID.clear(); gridN = OBST.length;
  for (const o of OBST) for (let cx = Math.floor((o.x - o.r) / CELL); cx <= Math.floor((o.x + o.r) / CELL); cx++) for (let cz = Math.floor((o.z - o.r) / CELL); cz <= Math.floor((o.z + o.r) / CELL); cz++) {
    const k = cx * 1000 + cz; if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(o);
  }
}
const MAP_X = 52, MAP_Z = 59.5;                 // área aberta = entre as bordas externas das lanes laterais; bases só pelos corredores
// distância até o chão andável (<= 0 dentro). `out` recebe o ponto andável mais próximo.
// andável = (retângulo aberto ∪ corredores desenhados) − obstáculos
export function navDist(x, z, out) {
  const ox = clamp(x, -MAP_X, MAP_X), oz = clamp(z, -MAP_Z, MAP_Z), dBox = Math.hypot(x - ox, z - oz);
  if (dBox > 0) {
    const o2 = { x: 0, z: 0 }, dL = layoutDist(x, z, o2);
    if (dL <= 0) { if (out) { out.x = x; out.z = z; } return dL; }
    if (dL < dBox) { if (out) { out.x = o2.x; out.z = o2.z; } return dL; }
    if (out) { out.x = ox; out.z = oz; } return dBox;
  }
  let bx = x, bz = z;
  grid(); const list = GRID.get(Math.floor(x / CELL) * 1000 + Math.floor(z / CELL));
  let pen = -1;                                 // dentro de algum obstáculo? (maior penetração)
  if (list) for (const o of list) { const dx = x - o.x, dz = z - o.z, l = Math.hypot(dx, dz), p = o.r - l; if (p > pen) { pen = p; if (p > 0) { bx = o.x + (dx / (l || 1)) * o.r; bz = o.z + (dz / (l || 1)) * o.r; } } }
  if (pen > 0) { if (out) { out.x = bx; out.z = bz; } return pen; }
  if (out) { out.x = x; out.z = z; } return Math.min(-0.01, pen);
}
const _np = { x: 0, z: 0 };
export function clampWalk(p) { if (navDist(p.x, p.z, _np) > 0) { p.x = _np.x; p.z = _np.z; } return p; }

// terrain height: flat on everything walkable, in the town band beside the lane and in the bases
export function heightAt(x, z) {
  const az = Math.abs(z), ax = Math.abs(x);
  let h = (fbm(x * 0.07 + 5, z * 0.07) - 0.5) * 2.6;
  h += smooth(64, 86, az) * 9 * (0.6 + 0.4 * noise(x * 0.03, z * 0.03 + 9));
  h += smooth(98, 110, ax) * 8;
  const flat = Math.max(1 - smooth(17, 32, az), 1 - smooth(1.5, 8, layoutDist(x, z)), smooth(52, 62, ax) * (1 - smooth(24, 36, az)) * (1 - smooth(98, 106, ax)));
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
  for (let z = -48; z <= 48; z += 8) add(riverX(z), z);
  for (const id of ['top', 'bot']) { for (const [x, z] of LANES[id]) add(x, z); const z = laneZ(id); for (const x of [-44, -28, -12, 12, 28, 44]) add(x, z); for (const sx of [-1, 1]) for (const dz of [-5, 5]) add(sx * TOWER_X, z + dz); }
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
