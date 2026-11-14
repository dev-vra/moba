// Texturas Poly Haven (CC0) → public/ui/*.webp para os menus (albedo × AO, 768px). Uso: node tools/bake_ui.mjs
import sharp from 'sharp';
const T = 'assets/polyhaven/textures', OUT = 'public/ui';
const SETS = { rust: 'rusty_corrugated_metal/rusty_corrugated_iron', painted: 'painted_metal/painted_metal_shutter', concrete: 'concrete/concrete_floor_worn_001', canvas: 'tarp_canvas/hessian_230', mud: 'dirt_road_tire_tracks/muddy_tracks' };
for (const [k, p] of Object.entries(SETS)) {
  const ao = await sharp(`${T}/${p}_ao_1k.jpg`).resize(768).greyscale().toBuffer();
  await sharp(`${T}/${p}_diff_1k.jpg`).resize(768).composite([{ input: ao, blend: 'multiply' }]).webp({ quality: 78 }).toFile(`${OUT}/${k}.webp`);
  await sharp(`${T}/${p}_nor_gl_1k.jpg`).resize(512).webp({ quality: 75 }).toFile(`${OUT}/${k}_n.webp`);
  console.log('✓', k);
}
