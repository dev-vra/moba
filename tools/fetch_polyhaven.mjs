// Baixa modelos (glTF 1k) e texturas (1k) do Poly Haven (CC0) para assets/polyhaven/.
// Idempotente: pula arquivos já baixados. Uso: node tools/fetch_polyhaven.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.polyhaven.com';
const UA = { 'User-Agent': 'ekoofall-asset-fetch/1.0' };
const OUT = path.resolve('assets/polyhaven');
const RES = '1k';

const range = (base, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${base}${String(a + i).padStart(2, '0')}`);

export const MODELS = {
  ekoo: ['Barrel_01', 'barrel_03', 'barrel_stove', 'old_military_crate', 'wooden_crate_01', 'wooden_crate_02', 'wooden_barrels_01',
    'portable_generator', 'propane_tank', 'small_lpg_tank', 'metal_jerrycan', 'portable_welding_cart', 'old_military_compressor',
    'old_tyre', 'rusted_wheel_rim_01', 'rusted_wheel_rim_02',
    'vintage_radio_transceiver', 'Megaphone_01', 'caged_hanging_light', 'Lantern_01',
    'worn_metal_rack', 'stone_fire_pit', 'trashbag'],
  axiom: ['security_camera_01', 'security_camera_02', 'security_light', 'flood_lights', 'utility_box_01', 'utility_box_02',
    'exterior_aircon_unit', 'power_box_01', 'concrete_road_barrier', 'concrete_road_barrier_02', 'steel_frame_shelves_03'],
  mid: ['modular_chainlink_fence', 'large_iron_gate', 'modular_electricity_poles', 'modular_electric_cables',
    'modular_industrial_pipes_01', 'modular_pipes', 'street_lamp_01', 'street_lamp_02', 'covered_car',
    'planter_box_01', 'planter_box_02', 'planter_box_03', 'compost_bags', 'watering_can_metal_01', 'water_manhole_cover'],
  nature: ['boulder_01', 'rock_07', 'rock_09', 'rock_moss_set_01', 'rock_moss_set_02', 'namaqualand_boulder_04',
    'grass_medium_01', 'grass_medium_02', 'grass_bermuda_01', ...range('shrub_', 1, 4), 'nettle_plant',
    'dead_tree_trunk_02', 'tree_stump_01', 'tree_stump_02', 'dry_branches_medium_01', 'tree_small_02', 'pine_tree_01'],
  vessari: range('moon_rock_', 1, 7),
};

// Texturas: categoria -> palavras-chave para ranquear (escolha automática, revisável).
const TEX_WANT = {
  rusty_corrugated_metal: [['corrugated'], ['rust']],
  painted_metal: [['metal'], ['painted', 'paint']],
  dirt_road_tire_tracks: [['dirt', 'road', 'track', 'tyre', 'tire', 'mud'], ['track', 'tyre', 'tire']],
  dry_grass: [['grass'], ['dry', 'dead']],
  concrete: [['concrete'], ['floor', 'wall', 'clean', 'plain']],
  tarp_canvas: [['fabric', 'canvas', 'tarp', 'cloth'], ['canvas', 'tarp', 'denim', 'rough']],
};

// Escolha curada (revisada à mão sobre o ranking automático).
const TEX_PICK = { rusty_corrugated_metal: 'rusty_corrugated_iron', painted_metal: 'painted_metal_shutter',
  dirt_road_tire_tracks: 'muddy_tracks', dry_grass: 'withered_grass', concrete: 'concrete_floor_worn_001', tarp_canvas: 'hessian_230' };

const getJSON = async (u) => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const exists = (p) => fs.access(p).then(() => true, () => false);
async function download(url, dest) {
  if (await exists(dest)) return false;
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
  return true;
}

async function fetchModel(id, group) {
  const files = await getJSON(`${API}/files/${id}`);
  const g = files.gltf?.[RES]?.gltf;
  if (!g) throw new Error(`sem gltf ${RES}`);
  const dir = path.join(OUT, 'models', group, id);
  await download(g.url, path.join(dir, `${id}.gltf`));
  for (const [rel, f] of Object.entries(g.include ?? {})) await download(f.url, path.join(dir, rel));
  return dir;
}

async function main() {
  const index = await getJSON(`${API}/assets?type=models`);
  const byLower = Object.fromEntries(Object.keys(index).map((k) => [k.toLowerCase(), k]));
  const manifest = { models: [], textures: [], missing: [] };

  const jobs = Object.entries(MODELS).flatMap(([group, ids]) => ids.map((want) => ({ group, want })));
  let i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const { group, want } = jobs[i++];
      const id = byLower[want.toLowerCase()];
      if (!id) { manifest.missing.push({ want, group }); console.log(`✗ ${want} (não existe na API)`); continue; }
      try {
        await fetchModel(id, group);
        const a = index[id];
        manifest.models.push({ id, group, name: a.name, authors: Object.keys(a.authors ?? {}) });
        console.log(`✓ ${group}/${id}`);
      } catch (e) { manifest.missing.push({ want, group, err: e.message }); console.log(`✗ ${id}: ${e.message}`); }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  const texIndex = await getJSON(`${API}/assets?type=textures`);
  for (const [slot, [must, bonus]] of Object.entries(TEX_WANT)) {
    const scored = Object.entries(texIndex).map(([id, a]) => {
      const hay = `${id} ${a.name} ${(a.tags ?? []).join(' ')} ${(a.categories ?? []).join(' ')}`.toLowerCase();
      const m = must.filter((w) => hay.includes(w)).length;
      const b = bonus.filter((w) => hay.includes(w)).length;
      return { id, a, score: m ? m * 2 + b * 3 + Math.log10(1 + (a.download_count ?? 0)) * 0.3 : -1 };
    }).filter((s) => s.score > 0).sort((x, y) => y.score - x.score);
    const pick = scored.find((s) => s.id === TEX_PICK[slot]) ?? (texIndex[TEX_PICK[slot]] && { id: TEX_PICK[slot], a: texIndex[TEX_PICK[slot]] }) ?? scored[0];
    if (!pick) { manifest.missing.push({ want: slot, group: 'texture' }); continue; }
    const files = await getJSON(`${API}/files/${pick.id}`);
    const dir = path.join(OUT, 'textures', slot);
    const maps = { Diffuse: 'diff', nor_gl: 'nor_gl', Rough: 'rough', AO: 'ao', arm: 'arm', Displacement: 'disp' };
    for (const [k, short] of Object.entries(maps)) {
      const f = files[k]?.[RES]?.jpg ?? files[k]?.[RES]?.png;
      if (f) await download(f.url, path.join(dir, `${pick.id}_${short}_${RES}.${f.url.split('.').pop()}`));
    }
    manifest.textures.push({ slot, id: pick.id, name: pick.a.name, authors: Object.keys(pick.a.authors ?? {}),
      alternatives: scored.slice(1, 4).map((s) => s.id) });
    console.log(`✓ textura ${slot} → ${pick.id} (alt: ${scored.slice(1, 4).map((s) => s.id).join(', ')})`);
  }

  manifest.models.sort((a, b) => (a.group + a.id).localeCompare(b.group + b.id));
  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nmodelos ${manifest.models.length}, texturas ${manifest.textures.length}, faltando ${manifest.missing.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
