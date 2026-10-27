"""Comarket stage assets: the phone and the studio environment it reflects.

Run from the repo root:
  blender -b -P design/stage/build_stage.py -- public/assets/stage
Writes:
  phone.glb            body (frame, glass, back, lens) + screen quad with 0..1 UVs
  studio.hdr           softbox environment for reflections
Env STAGE_ONLY=glb skips the environment render.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/assets/stage")
ROOT = os.path.abspath(os.path.join(OUT, "..", "..", ".."))
ONLY = os.environ.get("STAGE_ONLY", "")
os.makedirs(OUT, exist_ok=True)

# Phone proportions in scene units (about 72 x 152 mm, slab with a soft chamfer)
PW, PH, PD, PR = 0.72, 1.52, 0.074, 0.118
INSET, SR = 0.026, 0.094  # screen inset and screen corner radius

BLUE, YELLOW, INK, CREAM = "#006EB8", "#FFF200", "#1E0E3F", "#FDBF68"


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        s.cycles.device = "GPU"
    except Exception as e:
        print("GPU unavailable", e)
    s.cycles.use_denoising = True
    s.view_settings.view_transform = "Standard"
    return s


def select_only(ob):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def rounded(w, h, r, n=20):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def slab(name, w, h, d, r, mats, bevel=0.0, bevel_seg=3, z0=None):
    """Rounded-rect slab facing +Z. Material 0 = top, 1 = bottom, 2 = sides and bevel."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = rounded(w, h, r)
    z_top = d / 2 if z0 is None else z0 + d
    z_bot = -d / 2 if z0 is None else z0
    top = [bm.verts.new((x, y, z_top)) for x, y in pts]
    bot = [bm.verts.new((x, y, z_bot)) for x, y in pts]
    ft = bm.faces.new(top)
    fb = bm.faces.new(list(reversed(bot)))
    ft.material_index, fb.material_index = 0, 1
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((bot[i], bot[j], top[j], top[i]))
        f.material_index = 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel:
        rim = [e for e in bm.edges if len(e.link_faces) == 2 and {f.material_index for f in e.link_faces} != {2}]
        res = bmesh.ops.bevel(bm, geom=rim, offset=bevel, segments=bevel_seg, affect="EDGES", profile=0.5)
        for f in res["faces"]:
            f.material_index = 2
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            x, y, _ = loop.vert.co
            loop[uv].uv = ((x + w / 2) / w, (y + h / 2) / h)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in mats:
        me.materials.append(bpy.data.materials.get(m) or bpy.data.materials.new(m))
    select_only(ob)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception:
        bpy.ops.object.shade_smooth()
    return ob


def stand_up(ob):
    """Built facing +Z; turn to face -Y so glTF's Y-up export faces +Z."""
    ob.rotation_euler = (math.radians(90), 0, 0)
    select_only(ob)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)


def principled(name, color, rough, metal=0.0, coat=0.0, emission=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = lin(color)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if "Coat Weight" in p.inputs:
        p.inputs["Coat Weight"].default_value = coat
    if emission:
        p.inputs["Emission Color"].default_value = lin(emission)
        p.inputs["Emission Strength"].default_value = strength
    return m


def build_phone():
    body = slab("Phone", PW, PH, PD, PR, ["glass", "back", "frame"], bevel=0.012, bevel_seg=4)
    screen = slab("Screen", PW - INSET * 2, PH - INSET * 2, 0.0006, SR, ["screen", "screen", "screen"], z0=PD / 2 + 0.0004)
    # camera module on the back, top left
    cam = slab("Camera", 0.27, 0.27, 0.012, 0.07, ["frame", "frame", "frame"], bevel=0.004, z0=-PD / 2 - 0.012)
    cam.location = (-PW / 2 + 0.2, PH / 2 - 0.2, 0)
    select_only(cam)
    bpy.ops.object.transform_apply(location=True)
    lenses = []
    for i, (dx, dy) in enumerate(((-0.055, 0.055), (0.055, -0.055))):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.045, depth=0.02, location=(-PW / 2 + 0.2 + dx, PH / 2 - 0.2 + dy, -PD / 2 - 0.02))
        l = bpy.context.active_object
        l.name = f"Lens{i}"
        l.data.materials.append(bpy.data.materials.get("lens") or bpy.data.materials.new("lens"))
        bpy.ops.object.shade_smooth()
        lenses.append(l)
    # side buttons
    btns = []
    for i, (y, ln) in enumerate(((0.32, 0.16), (0.08, 0.1))):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(PW / 2 + 0.004, y, 0))
        b = bpy.context.active_object
        b.scale = (0.012, ln, 0.03)
        b.name = f"Button{i}"
        select_only(b)
        bpy.ops.object.transform_apply(scale=True)
        bev = b.modifiers.new("b", "BEVEL")
        bev.width, bev.segments = 0.005, 3
        bpy.ops.object.modifier_apply(modifier=bev.name)
        b.data.materials.append(bpy.data.materials.get("frame"))
        btns.append(b)
    # join the hardware into the body; the screen stays its own mesh
    for o in [cam, *lenses, *btns]:
        o.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    for o in (body, screen):
        stand_up(o)
    return body, screen


def export(objs, name):
    for o in bpy.context.scene.objects:
        o.select_set(o in objs)
    path = os.path.join(OUT, name)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT")
    print("wrote", path, os.path.getsize(path))


# ------------------------------------------------ 1. GLBs
reset()
body, screen = build_phone()
export([body, screen], "phone.glb")
if ONLY == "glb":
    sys.exit(0)

# ------------------------------------------------ 2. studio environment
s = reset()
s.cycles.samples = 96
w = bpy.data.worlds.new("W")
s.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = lin("#0E0A18")
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0


def softbox(name, loc, size, strength, color="#FFFFFF"):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    p = bpy.context.active_object
    p.name = name
    p.scale = (size[0], size[1], 1)
    p.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("Z", "Y").to_euler()
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = lin(color)
    em.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    p.data.materials.append(m)


softbox("Key", (-3, 2.5, 3.2), (3.2, 1.2), 14)
softbox("Strip", (3.4, 0.5, 1.2), (0.5, 4.0), 18)
softbox("Top", (0, 0.5, 4.2), (4.5, 4.5), 4, "#EAF2FF")
softbox("Warm", (0.5, -4, -0.4), (5, 1.0), 2.5, CREAM)
softbox("Floor", (0, 0, -3.5), (8, 8), 0.4, "#6C78A8")
cd = bpy.data.cameras.new("Pano")
cd.type = "PANO"
try:
    cd.panorama_type = "EQUIRECTANGULAR"
except Exception:
    cd.cycles.panorama_type = "EQUIRECTANGULAR"
cam = bpy.data.objects.new("Pano", cd)
s.collection.objects.link(cam)
cam.rotation_euler = (math.radians(90), 0, 0)
s.camera = cam
s.render.resolution_x, s.render.resolution_y = 1024, 512
s.render.image_settings.file_format = "HDR"
s.render.filepath = os.path.join(OUT, "studio.hdr")
bpy.ops.render.render(write_still=True)
print("wrote", s.render.filepath)
