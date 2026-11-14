"""Bakes Poly Haven zips (assets/textures) + HDRI (assets/hdri) into web-ready files under public/.
   d = albedo (sRGB jpg), n = GL normal (jpg), orm = AO/Roughness/Metal packed (jpg).  Re-runnable."""
import os, re, zipfile, glob
os.environ['OPENCV_IO_ENABLE_OPENEXR'] = '1'
import cv2, numpy as np, OpenEXR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS = {  # zip stem -> (short name, size)
  'rocky_terrain_02_1k': ('grass', 1024), 'grass_ground_1k': ('dirt', 1024), 'aerial_rocks_02_2k': ('gravel', 1024),
  'rusty_metal_04_1k': ('rustA', 1024), 'rusty_metal_05_1k': ('rustB', 1024), 'rusty_metal_grid_2k': ('grid', 1024),
  'worn_corrugated_iron_1k': ('corrugated', 1024), 'painted_concrete_02_1k': ('darkpanel', 512),
  'concrete_wall_009_1k': ('hull', 1024), 'worn_plaster_wall_1k': ('concrete', 1024), 'dark_rock_02_1k': ('rock', 512),
}
out = os.path.join(ROOT, 'public', 'tex'); os.makedirs(out, exist_ok=True)

def dec(z, name, flags=cv2.IMREAD_UNCHANGED):
    data = z.read(name)
    if name.endswith('.exr'):
        tmp = os.path.join(out, '_tmp.exr'); open(tmp, 'wb').write(data); img = read_exr(tmp); os.remove(tmp); return img
    return cv2.imdecode(np.frombuffer(data, np.uint8), flags)
def read_exr(path):   # returns float32 BGR (or single channel)
    ch = OpenEXR.File(path).channels()
    if 'RGB' in ch: return ch['RGB'].pixels.astype(np.float32)[..., ::-1]
    if 'RGBA' in ch: return ch['RGBA'].pixels.astype(np.float32)[..., 2::-1]
    if 'R' in ch and 'G' in ch: return np.dstack([ch['B'].pixels, ch['G'].pixels, ch['R'].pixels]).astype(np.float32)
    return next(iter(ch.values())).pixels.astype(np.float32)
def f01(img):
    if img.dtype == np.uint8: return img.astype(np.float32) / 255
    if img.dtype == np.uint16: return img.astype(np.float32) / 65535
    return np.clip(img.astype(np.float32), 0, 1)
def gray(img): return img if img.ndim == 2 else img[..., 0]

for stem, (short, size) in SETS.items():
    z = zipfile.ZipFile(os.path.join(ROOT, 'assets', 'textures', stem + '.blend.zip'))
    find = lambda k: next((n for n in z.namelist() if re.search(rf'_{k}_\dk\.', n)), None)
    rs = lambda im: cv2.resize(im, (size, size), interpolation=cv2.INTER_AREA)
    d = f01(dec(z, find('diff'), cv2.IMREAD_COLOR))
    hsv = cv2.cvtColor(d, cv2.COLOR_BGR2HSV); hsv[..., 1] *= 0.15 if short == 'hull' else 0.8                                        # neutral environment; AXIOM hull = clean white
    if short == 'hull': hsv[..., 2] = np.clip(hsv[..., 2] * 1.12 + 0.04, 0, 1)
    if short == 'rock': hsv[..., 2] = np.clip(hsv[..., 2] * 1.7, 0, 1)
    d = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    cv2.imwrite(os.path.join(out, short + '_d.jpg'), (rs(d) * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 84])
    n = f01(dec(z, find('nor_gl'), cv2.IMREAD_UNCHANGED))[..., :3]
    cv2.imwrite(os.path.join(out, short + '_n.jpg'), (rs(n) * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
    r = gray(f01(dec(z, find('rough'))))
    m = gray(f01(dec(z, find('metal')))) if find('metal') else np.zeros_like(r)
    h = gray(f01(dec(z, find('disp'))))
    cav = cv2.GaussianBlur(h, (0, 0), h.shape[0] / 40) - h                 # cavity AO from displacement
    ao = np.clip(1 - cav * 6, 0.25, 1)
    orm = np.dstack([rs(m), rs(r), rs(ao)])                                 # BGR order -> R=ao G=rough B=metal
    cv2.imwrite(os.path.join(out, short + '_orm.jpg'), (orm * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 86])
    print('baked', short)

env = os.path.join(ROOT, 'public', 'env'); os.makedirs(env, exist_ok=True)
for exr in glob.glob(os.path.join(ROOT, 'assets', 'hdri', '*.exr')):
    img = read_exr(exr)[..., :3]
    img = np.minimum(cv2.resize(img, (1024, 512), interpolation=cv2.INTER_AREA), 400)
    cv2.imwrite(os.path.join(env, 'sky_1k.hdr'), img); print('baked hdri', img.shape, float(img.mean()))
