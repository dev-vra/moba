// Terrain: PBR layers (grass / dirt lane / gravel) blended by a painted splat map,
// plus a tint map (large-scale variation, tyre tracks, mud, oil, frost, AXIOM plating) and an emissive mask.
import * as THREE from 'three';
import { mk, pbr } from '../core/tex.js';
import { rng, heightAt, noise, smooth, widen, BASE_X, SPAWN_X, PATHS, PATH_R, CAMPS } from '../core/util.js';

export const SIZE_X = 230, SIZE_Z = 180;
export const FARMS = [
  { x: -54, z: 36, w: 20, d: 11, r: 0.14 }, { x: 12, z: 60, w: 24, d: 11, r: -0.08 }, { x: 54, z: 38, w: 18, d: 11, r: 0.1 },
  { x: 54, z: -38, w: 20, d: 10, r: 0.12 }, { x: -54, z: -37, w: 20, d: 10, r: -0.1 }, { x: -12, z: -60, w: 22, d: 10, r: 0.06 },
];
const PAD = [[-112, -23], [-62, -23], [-54, -14], [-54, 14], [-62, 23], [-112, 23]];

// painter bound to one canvas, working in world units
function painter(W, H, bg) {
  const [c, x] = mk(W, H), sx = W / SIZE_X, sz = H / SIZE_Z, X = (v) => (v + SIZE_X / 2) * sx, Z = (v) => (v + SIZE_Z / 2) * sz;
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const dab = (wx, wz, r, col, a, sq = 0.65, rot = Math.random() * 3.14) => {
    const pr = r * sx, g = x.createRadialGradient(0, 0, 0, 0, 0, pr);
    g.addColorStop(0, col); g.addColorStop(0.4, col); g.addColorStop(1, col + '00');
    x.globalAlpha = a; x.save(); x.translate(X(wx), Z(wz)); x.rotate(rot); x.scale(1, sq); x.fillStyle = g; x.fillRect(-pr, -pr, pr * 2, pr * 2); x.restore();
  };
  const poly = (pts) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.closePath(); };
  return { c, x, sx, sz, X, Z, dab, poly };
}
const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
// stamp along every jungle trail and camp clearing
function trails(R, fn) {
  for (const [ax, az, bx, bz] of PATHS) { const L = Math.hypot(bx - ax, bz - az); for (let d = 0; d <= L; d += 0.45) fn(ax + (bx - ax) * d / L + (R() - 0.5) * PATH_R * 1.5, az + (bz - az) * d / L + (R() - 0.5) * PATH_R * 1.5, false); }
  for (const c of CAMPS) for (let i = 0; i < 260; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * c.r * 0.95; fn(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, true); }
}

function paintSplat(R) {                       // R = lane dirt, G = gravel / dry soil, B = AXIOM plating
  const p = painter(1024, 800, '#000'), { x } = p; x.globalCompositeOperation = 'lighter';
  trails(R, (wx, wz) => p.dab(wx, wz, 1.5 + R() * 1.5, '#ff0000', 0.4));
  for (const f of FARMS) for (let i = 0; i < 220; i++) {
    const u = (R() - 0.5) * f.w, v = (R() - 0.5) * f.d, c = Math.cos(f.r), s = Math.sin(f.r);
    p.dab(f.x + u * c - v * s, f.z + u * s + v * c, 1.5 + R() * 2, '#00ff00', 0.3);
  }
  for (let i = 0; i < 1500; i++) {            // dry patches, heavier toward EKOO
    const wx = (R() - 0.5) * SIZE_X, wz = (R() - 0.5) * SIZE_Z;
    if (noise(wx * 0.07, wz * 0.07) + smooth(-20, 80, wx) * 0.22 > 0.6) p.dab(wx, wz, 1.5 + R() * 3.5, '#00ff00', 0.25);
  }
  for (let i = 0; i < 1500; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * 30; p.dab(BASE_X + 6 + Math.cos(a) * d * 1.15, Math.sin(a) * d * 0.85, 2 + R() * 3, '#00ff00', 0.35); }
  for (let wx = -80; wx <= 80; wx += 0.4) for (let j = 0; j < 3; j++) p.dab(wx + R(), (R() * 2 - 1) * 5.2 * widen(wx), 1.6 + R() * 1.6, '#ff0000', 0.45);
  for (let i = 0; i < 60; i++) p.dab((R() - 0.5) * 150, (R() < 0.5 ? -1 : 1) * (7 + R() * 5), 1 + R() * 2, '#ff0000', 0.3);   // worn side paths
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = '#0000ff'; p.poly(PAD); x.fill();
  return tex(p.c, false);
}

function paintTint(R) {                        // multiplied x2 over the albedo (128 grey = neutral)
  const p = painter(2048, 1600, '#808080'), { x, X, Z, sx, sz } = p, HH = 1600;
  for (let i = 0; i < 5000; i++) {            // broad neutral variation, cool at AXIOM, dry-warm at EKOO
    const wx = (R() - 0.5) * SIZE_X, wz = (R() - 0.5) * SIZE_Z, t = smooth(-70, 70, wx) + (R() - 0.5) * 0.3, k = R();
    const col = k < 0.4 ? '#5e625c' : k < 0.7 ? '#a3a39b' : t < 0.35 ? '#7c8a94' : t > 0.65 ? '#9a8c74' : '#7e8a70';
    p.dab(wx, wz, 2 + R() * 6, col, 0.22);
  }
  for (const f of FARMS) {                    // furrows
    x.save(); x.translate(X(f.x), Z(f.z)); x.rotate(f.r); const w = f.w * sx, d = f.d * sz;
    for (let row = -d / 2; row < d / 2; row += 1.25 * sz) {
      x.globalAlpha = 0.5; x.strokeStyle = '#3c3830'; x.lineWidth = 4; x.beginPath(); x.moveTo(-w / 2, row);
      for (let k = -w / 2; k <= w / 2; k += 30) x.lineTo(k, row + (R() - 0.5) * 3); x.stroke();
      x.globalAlpha = 0.3; x.strokeStyle = '#b0a898'; x.lineWidth = 3; x.beginPath(); x.moveTo(-w / 2, row + 5); x.lineTo(w / 2, row + 5); x.stroke();
    }
    x.restore();
  }
  // jungle: damp dark trails, Vessari corruption staining the camps violet-black
  trails(R, (wx, wz, camp) => { if (R() < 0.5) p.dab(wx, wz, 1 + R() * 1.6, camp ? '#55485e' : '#5c5a50', 0.28); });
  for (const c of CAMPS) for (let i = 0; i < (c.rift ? 160 : 60); i++) { const a = R() * 6.283, d = c.r * (0.5 + R() * 1.1); p.dab(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 0.8 + R() * 2, '#3c3048', 0.25); }
  // lane: darker worn shoulders, tyre tracks, mud
  for (let wx = -80; wx <= 80; wx += 0.5) for (const s of [-1, 1]) p.dab(wx + R(), s * (5.6 + R() * 1.6) * widen(wx), 0.9 + R() * 1.2, '#4c4840', 0.3);
  x.lineCap = 'round';
  for (const off of [-1.7, 1.7, -0.9, 2.4]) {
    x.globalAlpha = Math.abs(off) === 1.7 ? 0.5 : 0.22; x.strokeStyle = '#3e3a34'; x.lineWidth = 0.55 * sx; x.beginPath();
    for (let wx = -78; wx <= 78; wx += 1) { const wz = off + (noise(wx * 0.12, off) - 0.5) * 1.8; wx === -78 ? x.moveTo(X(wx), Z(wz)) : x.lineTo(X(wx), Z(wz)); }
    x.stroke();
  }
  for (let i = 0; i < 34; i++) { const wx = -50 + R() * 100, wz = (R() * 2 - 1) * 6.5; for (let k = 0; k < 3; k++) p.dab(wx + R() * 0.8, wz + R() * 0.5, 0.3 + R() * 0.5, '#24211e', 0.5); }   // mud puddles (dark -> wet)
  // AXIOM plating: clean tiles, panel seams, light wear
  x.save(); p.poly(PAD); x.clip(); x.globalAlpha = 1; x.fillStyle = '#7e848a'; x.fillRect(0, 0, X(-50), HH);
  for (let tx = -112; tx < -52; tx += 3) for (let tz = -24; tz < 24; tz += 3) {
    const v = 112 + R() * 34 | 0; x.globalAlpha = 0.6; x.fillStyle = `rgb(${v},${v + 3},${v + 8})`; x.fillRect(X(tx) + 2, Z(tz) + 2, 3 * sx - 4, 3 * sz - 4);
  }
  for (let i = 0; i < 500; i++) { x.globalAlpha = 0.14; x.strokeStyle = R() < 0.5 ? '#c8ccd0' : '#4a4e54'; x.lineWidth = 1; const px = X(-112 + R() * 60), py = Z((R() - 0.5) * 46), a = R() * 3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 26, py + Math.sin(a) * 26); x.stroke(); }
  x.globalAlpha = 0.85; x.strokeStyle = '#34383e'; x.lineWidth = 2.5;
  for (let tx = -112; tx < -52; tx += 3) { x.beginPath(); x.moveTo(X(tx), 0); x.lineTo(X(tx), HH); x.stroke(); }
  for (let tz = -24; tz < 24; tz += 3) { x.beginPath(); x.moveTo(0, Z(tz)); x.lineTo(X(-50), Z(tz)); x.stroke(); }
  x.restore(); x.globalAlpha = 0.9; x.strokeStyle = '#2a2e34'; x.lineWidth = 5; p.poly(PAD); x.stroke();
  for (let i = 0; i < 700; i++) {             // frost creeping out of the base
    const a = R() * 6.283, d = 20 + R() * 26, wx = -BASE_X + 8 + Math.cos(a) * d * 1.3, wz = Math.sin(a) * d;
    if (wx > -50 || Math.abs(wz) > 23) p.dab(wx, wz, 0.8 + R() * 2.4, '#d2dce4', 0.2 * (1 - smooth(-52, -30, wx)));
  }
  // EKOO yard decals: oil (dark, glossy), scorch, rust stains
  for (let i = 0; i < 60; i++) { const wx = BASE_X - 24 + R() * 46, wz = (R() - 0.5) * 40; for (let k = 0; k < 3; k++) p.dab(wx + R(), wz + R(), 0.5 + R() * 1.4, '#141312', 0.6); }
  for (let i = 0; i < 220; i++) p.dab(30 + R() * 34, (R() - 0.5) * 50, 0.8 + R() * 2.4, '#4a443e', 0.2);
  for (let i = 0; i < 90; i++) p.dab(BASE_X - 26 + R() * 50, (R() - 0.5) * 44, 0.6 + R() * 1.6, '#96705a', 0.3);
  x.globalAlpha = 1; return tex(p.c, false);
}

function paintEmis() {
  const p = painter(1024, 800, '#000'), { x, X, Z, sx } = p;
  // Vessari rift veins crawling out of each camp
  x.strokeStyle = '#8a4cf0'; x.shadowColor = '#8a4cf0'; x.shadowBlur = 6; x.lineCap = 'round';
  for (const c of CAMPS) for (let i = 0; i < (c.rift ? 16 : 7); i++) {
    let a = (i / (c.rift ? 16 : 7)) * 6.283 + Math.sin(i * 7) * 0.2, r = 1.5, px = c.x, pz = c.z + c.side * (c.rift ? 5 : 2); x.lineWidth = c.rift ? 2.6 : 1.6; x.beginPath(); x.moveTo(X(px), Z(pz));
    for (let k = 0; k < 7; k++) { a += Math.sin(i * 3 + k * 1.7) * 0.5; r = 1.2 + k * 0.25; px += Math.cos(a) * r; pz += Math.sin(a) * r; x.lineTo(X(px), Z(pz)); }
    x.globalAlpha = 0.8; x.stroke();
  }
  x.globalAlpha = 1; x.lineWidth = 2.2; x.strokeStyle = '#35dcff'; x.shadowColor = '#35dcff'; x.shadowBlur = 5;
  for (const s of [-1, 1]) {
    x.beginPath(); x.moveTo(X(-BASE_X + 8), Z(s * 4.5)); x.lineTo(X(-SPAWN_X - 6), Z(s * 4.5)); x.lineTo(X(-SPAWN_X - 3), Z(s * 7.5)); x.lineTo(X(-58), Z(s * 7.5)); x.stroke();
    x.beginPath(); x.moveTo(X(-BASE_X), Z(s * 13)); x.lineTo(X(-BASE_X + 14), Z(s * 13)); x.lineTo(X(-BASE_X + 18), Z(s * 17)); x.lineTo(X(-60), Z(s * 17)); x.stroke();
  }
  x.beginPath(); x.arc(X(-SPAWN_X), Z(0), 4.6 * sx, 0, 6.283); x.stroke();
  return tex(p.c, true);
}

export function buildGround(scene) {
  const R = rng(7), g = new THREE.PlaneGeometry(SIZE_X, SIZE_Z, 184, 144); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();
  const grass = pbr('grass'), dirt = pbr('dirt'), grav = pbr('gravel');
  const mat = new THREE.MeshStandardMaterial({ map: grass.d, normalMap: grass.n, roughness: 1, metalness: 0 });
  const U = {
    tGrassO: { value: grass.orm }, tDirtD: { value: dirt.d }, tDirtN: { value: dirt.n }, tDirtO: { value: dirt.orm },
    tGravD: { value: grav.d }, tGravN: { value: grav.n }, tGravO: { value: grav.orm },
    tSplat: { value: paintSplat(R) }, tTint: { value: paintTint(R) }, tEmis: { value: paintEmis() }, uTile: { value: new THREE.Vector2(SIZE_X / 5, SIZE_Z / 5) },
  };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.fragmentShader = `uniform sampler2D tGrassO,tDirtD,tDirtN,tDirtO,tGravD,tGravN,tGravO,tSplat,tTint,tEmis; uniform vec2 uTile;
      vec3 gN; float gRough; float gMetal;\n` + s.fragmentShader
      .replace('#include <map_fragment>', /* glsl */`
        vec2 tuv = vMapUv * uTile; vec3 sp = texture2D(tSplat, vMapUv).rgb; vec3 tint = texture2D(tTint, vMapUv).rgb;
        vec3 aG = texture2D(map, tuv).rgb, aD = texture2D(tDirtD, tuv * .8).rgb, aV = texture2D(tGravD, tuv * .7).rgb;
        // texture-aware transitions instead of a flat lerp
        float wv = smoothstep(.3, .7, sp.g + (.3 - aG.g) * 1.6 * (1. - abs(sp.g * 2. - 1.)));
        float wl = smoothstep(.3, .7, sp.r + (aD.r - .3) * 1.4 * (1. - abs(sp.r * 2. - 1.)));
        float wp = sp.b;
        vec3 alb = mix(mix(aG, aV * vec3(.9, .86, .8), wv), aD, wl);
        vec3 orm = mix(mix(texture2D(tGrassO, tuv).rgb, texture2D(tGravO, tuv * .7).rgb, wv), texture2D(tDirtO, tuv * .8).rgb, wl);
        gN = mix(mix(texture2D(normalMap, tuv).rgb, texture2D(tGravN, tuv * .7).rgb, wv), texture2D(tDirtN, tuv * .8).rgb, wl);
        alb = mix(alb, vec3(.34, .38, .44), wp); orm = mix(orm, vec3(1., .5, 0.), wp); gN = mix(gN, vec3(.5, .5, 1.), wp);
        alb *= tint * 2.;
        float wet = smoothstep(.34, .16, dot(tint, vec3(.333))) * (1. - wp);     // mud / oil decals turn glossy
        gRough = mix(orm.g, .1, wet); gMetal = wp * .3;
        gN = mix(gN, vec3(.5, .5, 1.), wet * .8);
        diffuseColor.rgb = alb * mix(1., orm.r, .75);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = gMetal;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize(tbn * (gN * 2. - 1.));')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance += texture2D(tEmis, vMapUv).rgb * 1.25;');
  };
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
}
