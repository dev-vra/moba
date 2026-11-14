// Otimiza assets/polyhaven/models/** → public/props/<grupo>/<id>{,_lod1,_lod2}.glb
// weld + dedup + simplify (LODs) + texturas ≤512 + meshopt. KTX2 (ETC1S/UASTC) se `toktx` estiver no PATH,
// senão WebP como fallback. Idempotente: pula saídas mais novas que a fonte. Uso: node tools/optimize_polyhaven.mjs [filtro]
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, meshopt, textureCompress, resample, flatten, join } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = path.resolve('assets/polyhaven/models');
const OUT = path.resolve('public/props');
const filter = process.argv[2] ?? '';
const LODS = [{ suffix: '', ratio: 1 }, { suffix: '_lod1', ratio: 0.4, error: 0.004 }, { suffix: '_lod2', ratio: 0.12, error: 0.02 }];
const SKIP = new Set(['pine_tree_01', 'tree_small_02']);
const TEX_MAX = 512; // 1k na fonte; do zoom da câmera MOBA 512 sobra.

let hasToktx = false;
try { execSync('toktx --version', { stdio: 'ignore' }); hasToktx = true; } catch { /* fallback webp */ }

await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

const newer = async (a, b) => { try { return (await fs.stat(a)).mtimeMs > (await fs.stat(b)).mtimeMs; } catch { return false; } };

async function ktx2(doc) {
  // toktx via arquivo temporário por textura: UASTC p/ normal, ETC1S p/ cor/ORM.
  const tmp = path.resolve('assets/polyhaven/.ktxtmp'); await fs.mkdir(tmp, { recursive: true });
  for (const [i, tex] of doc.getRoot().listTextures().entries()) {
    const isNormal = doc.getRoot().listMaterials().some((m) => m.getNormalTexture() === tex);
    const isColor = doc.getRoot().listMaterials().some((m) => m.getBaseColorTexture() === tex);
    const png = path.join(tmp, `t${i}.png`), out = path.join(tmp, `t${i}.ktx2`);
    await fs.writeFile(png, await sharp(Buffer.from(tex.getImage())).resize(TEX_MAX, TEX_MAX, { fit: 'inside', withoutEnlargement: true }).png().toBuffer());
    const mode = isNormal ? '--uastc 2 --zcmp 18 --assign_oetf linear' : `--encode etc1s --clevel 2 --qlevel 160 ${isColor ? '' : '--assign_oetf linear'}`;
    execSync(`toktx --t2 --genmipmap ${mode} "${out}" "${png}"`, { stdio: 'ignore' });
    tex.setImage(await fs.readFile(out)).setMimeType('image/ktx2');
  }
  doc.createExtension((await import('@gltf-transform/extensions')).KHRTextureBasisu).setRequired(true);
}

const report = [];
for (const group of await fs.readdir(SRC)) {
  for (const id of await fs.readdir(path.join(SRC, group))) {
    if (filter && !id.includes(filter)) continue;
    if (SKIP.has(id)) continue; // malha de scan pesada demais (milhões de tris) — árvores ficam em código
    const src = path.join(SRC, group, id, `${id}.gltf`);
    const dir = path.join(OUT, group); await fs.mkdir(dir, { recursive: true });
    const row = { id, group };
    for (const lod of LODS) {
      const dst = path.join(dir, `${id}${lod.suffix}.glb`);
      if (await newer(dst, src)) { row[lod.suffix || 'lod0'] = (await fs.stat(dst)).size; continue; }
      const doc = await io.read(src);
      await doc.transform(dedup(), flatten(), join(), weld(), resample(),
        ...(lod.ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: lod.ratio, error: lod.error })] : []), prune());
      // LODs distantes: texturas menores ainda.
      const max = lod.ratio < 1 ? TEX_MAX / (lod.ratio < 0.2 ? 4 : 2) : TEX_MAX;
      if (hasToktx && lod.ratio === 1) await ktx2(doc);
      else await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [max, max], quality: 80 }));
      await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
      await io.write(dst, doc);
      const tris = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
      row[lod.suffix || 'lod0'] = (await fs.stat(dst)).size; row[`tris${lod.suffix}`] = Math.round(tris);
    }
    report.push(row);
    console.log(`${group}/${id}  ${(row.lod0 / 1024).toFixed(0)}KB  tris ${row.tris ?? '-'} → ${row.tris_lod1 ?? '-'} → ${row.tris_lod2 ?? '-'}`);
  }
}
await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify({ ktx2: hasToktx, report }, null, 2));
console.log(`\nKTX2: ${hasToktx ? 'sim' : 'NÃO (toktx ausente → WebP)'}`);
