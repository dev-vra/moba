// Packs CC0 (Quaternius/Kenney) extraídos em assets/packs/x → public/packs/<set>/<Nome>.glb
// weld + dedup + meshopt + texturas KTX2 (toktx) ≤512. Low-poly: sem LOD. Idempotente.
// Uso: node tools/optimize_packs.mjs [set]
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, flatten, textureCompress, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const X = path.resolve('assets/packs/x'), OUT = path.resolve('public/packs');
const n = (pre, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${pre}${a + i}`);
const SN = 'Stylized_Nature_MegaKit/glTF', USN = 'Ultimate_Stylized_Nature_-_May_2022';

// set -> [pasta relativa a X (busca recursiva), nomes]
export const SETS = {
  units: [['Sci-Fi_Essentials_Kit/glTF', ['Enemy_EyeDrone', 'Enemy_QuadShell', 'Enemy_Trilobite']]],
  nature: [
    [SN, [...n('CommonTree_', 1, 5), ...n('Pine_', 1, 5), ...n('DeadTree_', 1, 5), ...n('TwistedTree_', 1, 5), 'Bush_Common', 'Bush_Common_Flowers',
      ...n('Rock_Medium_', 1, 3), ...n('Pebble_Round_', 1, 3), ...n('Pebble_Square_', 1, 3), 'Grass_Common_Tall', 'Grass_Common_Short', 'Grass_Wispy_Tall',
      'Fern_1', 'Plant_1_Big', 'Plant_7_Big', 'Flower_3_Group', 'Flower_4_Group', 'Mushroom_Common', 'Clover_1']],
    [USN, [...n('BirchTree_', 1, 3), ...n('MapleTree_', 1, 3), 'Bush_Large', 'Bush_Small', 'Bush_Large_Flowers', 'Grass_Large', 'Grass_Small', ...n('DeadTree_', 6, 9)]],
  ],
};

let toktx = false; try { execSync('toktx --version', { stdio: 'ignore' }); toktx = true; } catch { /* webp */ }
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

async function findFile(dir, name) {
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && /\.(gltf|glb)$/i.test(e.name) && e.name.replace(/\.(gltf|glb)$/i, '') === name) return path.join(e.parentPath ?? e.path, e.name);
  }
  return null;
}

async function ktx2(doc) {
  const tmp = path.resolve('assets/packs/.ktxtmp'); await fs.mkdir(tmp, { recursive: true });
  const mats = doc.getRoot().listMaterials();
  for (const [i, tex] of doc.getRoot().listTextures().entries()) {
    const normal = mats.some((m) => m.getNormalTexture() === tex), color = mats.some((m) => m.getBaseColorTexture() === tex || m.getEmissiveTexture() === tex);
    const png = path.join(tmp, `t${i}.png`), out = path.join(tmp, `t${i}.ktx2`);
    await fs.writeFile(png, await sharp(Buffer.from(tex.getImage())).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png().toBuffer());
    const mode = normal ? '--encode uastc --uastc_quality 1 --zcmp 18 --assign_oetf linear' : `--encode etc1s --clevel 2 --qlevel 160${color ? '' : ' --assign_oetf linear'}`;
    execSync(`toktx --t2 --genmipmap ${mode} "${out}" "${png}"`, { stdio: 'ignore' });
    tex.setImage(await fs.readFile(out)).setMimeType('image/ktx2');
  }
  if (doc.getRoot().listTextures().length) doc.createExtension(KHRTextureBasisu).setRequired(true);
}

const only = process.argv[2];
for (const [set, groups] of Object.entries(SETS)) {
  if (only && set !== only) continue;
  const dir = path.join(OUT, set); await fs.mkdir(dir, { recursive: true });
  const index = [];
  for (const [rel, names] of groups) for (const name of names) {
    const src = await findFile(path.join(X, rel), name);
    if (!src) { console.log(`✗ ${rel}/${name}`); continue; }
    const tag = rel.startsWith('Ultimate') ? 'U_' : '';
    const dst = path.join(dir, `${tag}${name}.glb`);
    index.push(`${tag}${name}`);
    try { if ((await fs.stat(dst)).mtimeMs > (await fs.stat(src)).mtimeMs) continue; } catch { /* novo */ }
    const doc = await io.read(src);
    // árvores: folhagem densa demais p/ ~200 instâncias × 3 passes (cor, normal, sombra)
    const heavy = /Tree|Pine/.test(name);
    await doc.transform(dedup(), flatten(), weld(), ...(heavy ? [simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.06 })] : []), prune());
    if (toktx) await ktx2(doc); else await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }));
    await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(dst, doc);
    const tris = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);
    console.log(`✓ ${set}/${tag}${name}  ${((await fs.stat(dst)).size / 1024).toFixed(0)}KB  ${tris} tris`);
  }
  await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify(index));
}
console.log(`KTX2: ${toktx}`);
