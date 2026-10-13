"""Render review images of a built city (and the default splash screen).

    Blender -b cities/<slug>/city.blend --python pipeline/blender/render_views.py -- <out dir> [camera names…|street:x,y,heading_deg]

Without camera names every camera in 'Review cameras' is rendered. A 'street:x,y,heading' spec
renders a 1.6 m high street-level view at local metres (x east, y north; heading 0 = north), standing
on the terrain.
Uses Eevee when a GPU is available and falls back to Workbench (textured) otherwise.
"""
import math
import os
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import citylib  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
out = os.path.abspath(args[0])
os.makedirs(out, exist_ok=True)
specs = args[1:]
scene = bpy.context.scene
res = os.environ.get('WB_RES', '1280x720').split('x')
scene.render.resolution_x, scene.render.resolution_y = int(res[0]), int(res[1])
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG' if os.environ.get('WB_JPEG') else 'PNG'
engine = os.environ.get('WB_ENGINE')
for candidate in ([engine] if engine else []) + ['BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'BLENDER_WORKBENCH']:
    try:
        scene.render.engine = candidate
        break
    except TypeError:
        continue
if scene.render.engine == 'BLENDER_WORKBENCH':
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'TEXTURE'
else:
    try:
        scene.eevee.taa_render_samples = int(os.environ.get('WB_SAMPLES', '32'))
        scene.eevee.use_shadows = True
    except AttributeError:
        pass
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Punchy' if 'AgX - Punchy' in [l for l in ('AgX - Punchy',)] else 'None'

# Optional dusty haze (WB_FOG=1): a volume box over the city; a world volume renders black in Eevee.
if os.environ.get('WB_FOG') == '1' and scene.render.engine != 'BLENDER_WORKBENCH':
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 30))
    haze = bpy.context.active_object
    haze.scale = (3000, 3000, 70)
    hm = bpy.data.materials.new('Haze')
    hm.use_nodes = True
    hn = hm.node_tree
    # Found by type: Blender 5 names the default nodes in the interface language, or adds none.
    for node in [n for n in hn.nodes if n.type == 'BSDF_PRINCIPLED']:
        hn.nodes.remove(node)
    out_node = next((n for n in hn.nodes if n.type == 'OUTPUT_MATERIAL'), None) or hn.nodes.new('ShaderNodeOutputMaterial')
    vol = hn.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value = float(os.environ.get('WB_FOG_DENSITY', '0.006'))
    vol.inputs['Color'].default_value = (0.95, 0.7, 0.48, 1)
    hn.links.new(vol.outputs['Volume'], out_node.inputs['Volume'])
    haze.data.materials.append(hm)

cams = []
if specs:
    for s in specs:
        if s.startswith('street:'):
            x, y, hd = (float(v) for v in s[7:].split(','))
            c = bpy.data.objects.new(f'street_{x:.0f}_{y:.0f}', bpy.data.cameras.new('street'))
            c.data.lens = float(os.environ.get('WB_LENS', '22'))
            c.data.clip_end = 3000
            c.location = (x, y, float(os.environ.get('WB_EYE', '1.6')) + float(citylib.Terrain.of_scene(scene).at(x, y)))
            c.rotation_euler = (math.radians(90 + float(os.environ.get('WB_PITCH', '4'))), 0, -math.radians(hd))
            scene.collection.objects.link(c)
            cams.append(c)
        else:
            cams.append(bpy.data.objects[s])
else:
    cams = sorted(bpy.data.collections['Review cameras'].objects, key=lambda o: o.name)
for c in cams:
    scene.camera = c
    scene.render.filepath = os.path.join(out, c.name)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', scene.render.filepath, flush=True)
