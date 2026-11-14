// Lista modelos animados nos packs (nome, nº de clips, tris aprox.). node tools/inspect_anims.mjs
import fs from 'node:fs'; import path from 'node:path';
const root = 'assets/packs/x';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter((f) => /\.gltf$/i.test(f))) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); const n = j.animations?.length || 0; if (!n) continue;
  console.log(f.replace(root + path.sep, '').padEnd(80), n, (j.animations || []).map((a) => a.name).slice(0, 14).join(','));
}
