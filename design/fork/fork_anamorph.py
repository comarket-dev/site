"""Comarket fork proof: one solid that reads BRAND from the front and CREATOR from the side.

Run: blender -b -P fork_anamorph.py -- <font.otf> <out_dir> [views]
views: comma list of key,front,side (default all)
"""
import bpy, sys, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
FONT, OUT = argv[0], argv[1]
VIEWS = argv[2].split(",") if len(argv) > 2 else ["key", "front", "side"]
SAMPLES = int(argv[3]) if len(argv) > 3 else 128
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def lin(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (a,)


PAPER, INDIGO, BENZOL = "#EDF0EC", "#051230", "#00978D"
font = bpy.data.fonts.load(FONT)


def select_only(ob):
    for o in scene.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def word(body, rot):
    cu = bpy.data.curves.new(body, "FONT")
    cu.body, cu.font, cu.size = body, font, 1.0
    cu.extrude, cu.resolution_u = 0.5, 16
    cu.space_character = 1.06
    cu.align_x, cu.align_y = "CENTER", "BOTTOM_BASELINE"
    ob = bpy.data.objects.new(body, cu)
    scene.collection.objects.link(ob)
    ob.rotation_euler = rot
    select_only(ob)
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


def bbox(ob):
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return mn, mx


# BRAND reads along +X seen from -Y. CREATOR reads along -Y seen from -X.
brand = word("BRAND", (math.radians(90), 0, 0))
creator = word("CREATOR", (math.radians(90), 0, math.radians(-90)))
bmn, bmx = bbox(brand)
cmn, cmx = bbox(creator)
wB, wC = bmx.x - bmn.x, cmx.y - cmn.y
print("widths", wB, wC, "heights", bmx.z - bmn.z, cmx.z - cmn.z)

# Stretch each word's extrusion so it spans the other word's width.
for ob, axis, span, center in ((brand, 1, wC * 1.08, (cmn.y + cmx.y) / 2), (creator, 0, wB * 1.08, (bmn.x + bmx.x) / 2)):
    mn, mx = bbox(ob)
    cur = mx[axis] - mn[axis]
    s = [1, 1, 1]
    s[axis] = span / cur
    ob.scale = s
    select_only(ob)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mn, mx = bbox(ob)
    loc = [0, 0, 0]
    loc[axis] = center - (mn[axis] + mx[axis]) / 2
    ob.location = loc
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

mod = brand.modifiers.new("intersect", "BOOLEAN")
mod.operation, mod.object, mod.solver = "INTERSECT", creator, "EXACT"
select_only(brand)
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(creator, do_unlink=True)
solid = brand
solid.name = "Fork"

# Center the solid and float it above the floor.
mn, mx = bbox(solid)
lift = 0.9
solid.location = (-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, lift - mn.z)
select_only(solid)
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.0001)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode="OBJECT")
for op in ("shade_smooth_by_angle", "shade_auto_smooth"):
    try:
        getattr(bpy.ops.object, op)()
        break
    except Exception as e:
        print("smooth op failed", op, e)
mn, mx = bbox(solid)
print("solid bbox", tuple(mn), tuple(mx), "verts", len(solid.data.vertices))


def material(name, hexc, rough, spec=0.5, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = lin(hexc)
    p.inputs["Roughness"].default_value = rough
    for key in ("Specular IOR Level", "Specular"):
        if key in p.inputs:
            p.inputs[key].default_value = spec
            break
    if coat and "Coat Weight" in p.inputs:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = 0.08
    return m


solid.data.materials.clear()
solid.data.materials.append(material("Benzol", BENZOL, 0.42, 0.5, 0.2))
paper = material("Paper", PAPER, 0.92, 0.2)


def quad(name, verts):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], [(0, 1, 2, 3)])
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(paper)
    return ob


gap, far, H = 3.2, 18.0, 12.0
xc, yc = mx.x + gap, mx.y + gap
quad("BackWall", [(-far, yc, 0), (xc, yc, 0), (xc, yc, H), (-far, yc, H)])
quad("SideWall", [(xc, -far, 0), (xc, yc, 0), (xc, yc, H), (xc, -far, H)])
quad("Floor", [(-far, -far, 0), (xc, -far, 0), (xc, yc, 0), (-far, yc, 0)])


def sun(name, rot, strength, angle_deg):
    ld = bpy.data.lights.new(name, "SUN")
    ld.energy, ld.angle = strength, math.radians(angle_deg)
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    ob.rotation_euler = rot
    return ob


sun("FrontSun", (math.radians(90), 0, 0), 2.35, 0.25)                    # travels +Y, BRAND on back wall
sun("SideSun", (math.radians(90), 0, math.radians(-90)), 2.35, 0.25)     # travels +X, CREATOR on side wall
sun("TopSun", (0, 0, 0), 0.7, 6.0)                                      # soft fill for the floor

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = lin("#7F8CB4")
bg.inputs["Strength"].default_value = 0.16

scene.render.engine = "CYCLES"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:
    print("GPU setup failed, using CPU", e)
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 88

target = bpy.data.objects.new("Target", None)
scene.collection.objects.link(target)


def camera(name, loc, look, lens=None, ortho=None):
    cd = bpy.data.cameras.new(name)
    if ortho:
        cd.type, cd.ortho_scale = "ORTHO", ortho
    else:
        cd.lens = lens
    ob = bpy.data.objects.new(name, cd)
    scene.collection.objects.link(ob)
    ob.location = loc
    direction = Vector(look) - Vector(loc)
    ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return ob


zc = (mn.z + mx.z) / 2
shots = {
    "key": (camera("KeyCam", (-9.6, -10.4, 4.6), (1.5, 1.4, 1.35), lens=44), (1600, 1000)),
    "front": (camera("FrontCam", (0, -20, zc + 1.7), (0, 0, zc), ortho=wB * 1.22), (1600, 640)),
    "side": (camera("SideCam", (-20, 0, zc + 1.7), (0, 0, zc), ortho=wC * 1.18), (1600, 560)),
}
if "orbit" in VIEWS:
    VIEWS = [v for v in VIEWS if v != "orbit"]
    ocam = camera("OrbitCam", (0, -13, 2.6), (0, 0, zc), lens=50)
    scene.camera = ocam
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.render.resolution_percentage = 100
    N = 25
    os.makedirs(os.path.join(OUT, "orbit"), exist_ok=True)
    for i in range(N):
        phi = math.radians(-90 - 90 * i / (N - 1))
        loc = Vector((13 * math.cos(phi), 13 * math.sin(phi), 2.6))
        ocam.location = loc
        ocam.rotation_euler = (Vector((0, 0, zc + 0.35)) - loc).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(OUT, "orbit", f"f{i:02d}.jpg")
        bpy.ops.render.render(write_still=True)
        print("wrote", scene.render.filepath)

for v in VIEWS:
    cam, (rx, ry) = shots[v]
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = rx, ry
    scene.render.resolution_percentage = 100
    scene.render.filepath = os.path.join(OUT, f"fork-{v}.jpg")
    bpy.ops.render.render(write_still=True)
    print("wrote", scene.render.filepath)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "fork.blend"))
