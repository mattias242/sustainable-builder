"""Render the default splash screen: a dusk street view of the generated city with an armored car.

    Blender -b cities/<slug>/city.blend --python pipeline/blender/render_splash.py -- <slug> [out.jpg]

The camera stands at the game's spawn point (pack/config.json) looking along the street; the
Interceptor stands on the right third so the menu title has dark space on the left. This is the
no-API fallback — the imagegen skill can repaint it as cinematic key art (it makes a good reference).
"""
import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import citylib  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
args = sys.argv[sys.argv.index('--') + 1:]
slug = args[0]
pack = ROOT / 'cities' / slug / 'pack'
out = Path(args[1]) if len(args) > 1 else ROOT / 'cities' / slug / 'media' / 'splash-default.jpg'
out.parent.mkdir(parents=True, exist_ok=True)
config = json.loads((pack / 'config.json').read_text())
sp = config['spawn']
x, y = sp['x'], -sp['z']
# Game heading h (counter-clockwise from north) → forward vector in Blender (east, north).
fx, fy = -math.sin(sp['heading']), math.cos(sp['heading'])
rx, ry = fy, -fx  # right-hand side of the street
ground = citylib.Terrain.of_scene()

scene = bpy.context.scene
for candidate in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):  # Blender 5.x / 4.2–4.4
    try:
        scene.render.engine = candidate
        break
    except TypeError:
        continue
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90
try:
    scene.eevee.taa_render_samples = 48
    scene.eevee.use_shadows = True
    scene.eevee.use_raytracing = True
except AttributeError:
    pass
scene.view_settings.view_transform = 'AgX'
try:
    scene.view_settings.look = 'AgX - Punchy'
except TypeError:
    pass

# Low, warm sun from far down the street, behind the car.
sun = bpy.data.objects.get('Sun')
if sun:
    sun.data.energy = 4.5
    sun.data.color = (1.0, 0.62, 0.32)
    yaw = math.atan2(fy, fx)
    sun.rotation_euler = (math.radians(80), 0, yaw - math.pi / 2 + math.radians(25))
world = scene.world
nt = world.node_tree
bg = nt.nodes.get('Background')
bg.inputs['Color'].default_value = (0.75, 0.45, 0.24, 1)
bg.inputs['Strength'].default_value = 0.9

# The car: imported from the game's own model, facing the camera at three-quarters.
car_path = ROOT / 'game/public/models/interceptor.glb'
if car_path.exists():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(car_path))
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    holder = bpy.data.objects.new('SplashCar', None)
    scene.collection.objects.link(holder)
    for o in roots:
        o.parent = holder
    d, side = 9.0, 1.6
    cx, cy = x + fx * d + rx * side, y + fy * d + ry * side
    holder.location = (cx, cy, 0.05 + float(ground.at(cx, cy)))
    # glTF cars face -Z in three.js = +Y in Blender after import; turn it towards the camera-left.
    holder.rotation_euler = (0, 0, math.atan2(fy, fx) + math.pi / 2 - math.radians(35))
    for o in new:
        o.hide_render = False

cam = bpy.data.objects.new('SplashCamera', bpy.data.cameras.new('SplashCamera'))
cam.data.lens = 24
cam.data.clip_end = 3000
cx, cy = x - fx * 1.0 - rx * 1.2, y - fy * 1.0 - ry * 1.2
cam.location = (cx, cy, 1.25 + float(ground.at(cx, cy)))
tx, ty = x + fx * 30 + rx * 1.2, y + fy * 30 + ry * 1.2
target = Vector((tx, ty, 2.2 + float(ground.at(tx, ty))))
direction = target - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
scene.collection.objects.link(cam)
scene.camera = cam

# Dusty haze: a volume box around the camera (a world volume renders black in Eevee).
bpy.ops.mesh.primitive_cube_add(size=1, location=(cam.location.x, cam.location.y, 30))
haze = bpy.context.active_object
haze.name = 'SplashHaze'
haze.scale = (500, 500, 70)
hm = bpy.data.materials.new('Haze')
hm.use_nodes = True
hn = hm.node_tree
# Found by type: Blender 5 names the default nodes in the interface language, or adds none.
for node in [n for n in hn.nodes if n.type == 'BSDF_PRINCIPLED']:
    hn.nodes.remove(node)
out_node = next((n for n in hn.nodes if n.type == 'OUTPUT_MATERIAL'), None) or hn.nodes.new('ShaderNodeOutputMaterial')
vol = hn.nodes.new('ShaderNodeVolumePrincipled')
vol.inputs['Density'].default_value = float(os.environ.get('WB_FOG_DENSITY', '0.012'))
vol.inputs['Color'].default_value = (0.95, 0.7, 0.48, 1)
vol.inputs['Anisotropy'].default_value = 0.45
hn.links.new(vol.outputs['Volume'], out_node.inputs['Volume'])
haze.data.materials.append(hm)
try:
    scene.eevee.volumetric_end = 400
    scene.eevee.volumetric_tile_size = '4'
except (AttributeError, TypeError):
    pass
scene.render.filepath = str(out)
bpy.ops.render.render(write_still=True)
print('SPLASH_OK', out, flush=True)
