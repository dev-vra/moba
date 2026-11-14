// Set dressing com props Poly Haven (carregado async depois do mundo; ?props=0 desliga).
// AXIOM = x<0 (limpo/tech), EKOO = x>0 (sucata/rádio), centro = Cidade-Celeiro, fendas = Vessari.
// Escala de leitura: câmera a ~48u — itens pequenos ganham exagero p/ não virar pontinho.
import { loadProp, propLoader } from '../core/polyprops.js';
import { rng, heightAt, layoutDist, CAMPS, BASE_X, TOWER_X } from '../core/util.js';

const READ = 1.7;   // pequenos (≤0.6m)
const MED = 1.3;    // médios (barris, caixas, gerador)
const BIG = 1.1;    // carro, postes, barreiras

// [grupo, id, escala, raio de navegação mínimo]
const EKOO = [['ekoo', 'Barrel_01', MED], ['ekoo', 'barrel_03', MED], ['ekoo', 'barrel_stove', MED], ['ekoo', 'portable_generator', MED],
  ['ekoo', 'propane_tank', MED], ['ekoo', 'metal_jerrycan', READ], ['ekoo', 'old_tyre', READ], ['ekoo', 'wooden_crate_01', MED],
  ['ekoo', 'wooden_crate_02', MED], ['ekoo', 'old_military_crate', MED], ['ekoo', 'small_lpg_tank', READ], ['ekoo', 'rusted_wheel_rim_01', READ],
  ['ekoo', 'portable_welding_cart', MED], ['ekoo', 'trashbag', READ], ['ekoo', 'worn_metal_rack', MED], ['ekoo', 'old_military_compressor', MED]];
const AXIOM = [['axiom', 'concrete_road_barrier_02', BIG], ['axiom', 'utility_box_01', MED], ['axiom', 'utility_box_02', MED],
  ['axiom', 'exterior_aircon_unit', MED], ['axiom', 'power_box_01', MED], ['axiom', 'security_light', MED], ['axiom', 'steel_frame_shelves_03', MED]];
const MID = [['mid', 'compost_bags', MED], ['mid', 'planter_box_01', MED], ['mid', 'planter_box_02', MED], ['mid', 'planter_box_03', MED],
  ['mid', 'watering_can_metal_01', READ]];
const NATURE = [['nature', 'rock_07', MED], ['nature', 'rock_09', MED], ['nature', 'shrub_02', MED], ['nature', 'shrub_03', MED], ['nature', 'shrub_04', MED],
  ['nature', 'tree_stump_01', MED], ['nature', 'dry_branches_medium_01', MED], ['nature', 'grass_medium_02', MED], ['nature', 'nettle_plant', MED]];
const VESSARI = [1, 2, 3, 4, 5, 6, 7].map((i) => ['vessari', `moon_rock_0${i}`, 1.4]);

export async function dress(scene, renderer) {
  if (new URLSearchParams(location.search).get('props') === '0') return;
  propLoader(renderer);
  const R = rng(7331), jobs = [];
  const pick = (list) => list[Math.floor(R() * list.length)];
  const place = (entry, x, z, minNav = 1.4) => {
    if (layoutDist(x, z) <= minNav) return;   // nunca bloqueia chão andável
    const [g, id, s] = entry;
    jobs.push(loadProp(g, id, { scale: s * (0.9 + R() * 0.2) }).then((o) => {
      o.position.set(x, heightAt(x, z), z); o.rotation.y = R() * Math.PI * 2; scene.add(o);
    }).catch((e) => console.warn('[props]', id, e.message)));
  };
  // aglomerado: re-sorteia até achar chão fora da navegação (antes ~metade era descartada na borda da lane)
  const cluster = (list, cx, cz, n, r = 2.2) => {
    for (let i = 0; i < n; i++) for (let k = 0; k < 8; k++) {
      const a = R() * 6.28, d = R() * r * (1 + k * 0.25), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (layoutDist(x, z) > 1.4) { place(pick(list), x, z); break; }
    }
  };

  // bordas da lane: sucata do lado EKOO, infraestrutura AXIOM do outro
  for (let i = 0; i < 9; i++) {
    const t = TOWER_X * 0.5 + R() * (BASE_X - TOWER_X * 0.5 - 14), zs = R() < 0.5 ? -1 : 1, z = zs * (11 + R() * 4);
    cluster(EKOO, t, z, 4); cluster(AXIOM, -t, z, 3, 1.8);
  }
  place(['ekoo', 'stone_fire_pit', MED], BASE_X - 18, 10); cluster(EKOO, BASE_X - 18, 13, 4);
  place(['mid', 'covered_car', BIG], 10, 13.5); place(['mid', 'covered_car', BIG], -12, -14);
  for (const x of [-26, -6, 14, 30]) cluster(MID, x, (x % 4 ? 1 : -1) * 15, 2, 1.5);
  // campo aberto
  for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 170, z = (R() < 0.5 ? -1 : 1) * (14 + R() * 50); place(pick(NATURE), x, z, 1.8); }
  // fendas Vessari: anel de pedra lunar
  for (const c of CAMPS.filter((k) => k.rift)) for (let i = 0; i < 9; i++) { const a = R() * 6.28, d = c.r + 1.5 + R() * 2.5; place(pick(VESSARI), c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 1); }

  await Promise.all(jobs);
}
