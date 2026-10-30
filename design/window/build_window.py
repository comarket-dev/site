"""The hero's browser window as a real object (Blender). Renders the window's body (a thin rounded slab, near white, lit from the upper right like the page) on a transparent
background; its shadow is drawn by the page, from the hero's three-quarter view. The screen face is left for the browser: the live HTML
dashboard (src/components/Window.astro) is mapped onto it with the four corners this script writes out.

    blender -b -P design/window/build_window.py -- public/assets/window

Two shapes, matching the HTML's two layouts: wide (760 x 420 units, desktop) and narrow (560 x 480, phones).
Writes <out>/window-<shape>.webp (via PNG) and <out>/window.json with each render's size and screen corners in pixels.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "public/assets/window"
os.makedirs(out, exist_ok=True)

SHAPES = {"wide": (760, 376), "narrow": (560, 452)}
YAW, PITCH, ROLL = 13, 5, 0  # degrees: the right edge turns away, the top leans back, a hair of roll
WIDTH_PX = 2600

def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c] + [1]

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = srgb("#fff3e2")
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    return sc

def slab(W, H, D, r):
    """A rounded rectangle (corners r) W x H, extruded D deep toward the back, every edge eased by a bevel."""
    me = bpy.data.meshes.new("slab")
    bm = bmesh.new()
    vs = [bm.verts.new(c) for c in [(-W / 2, 0, -H / 2), (W / 2, 0, -H / 2), (W / 2, 0, H / 2), (-W / 2, 0, H / 2)]]
    bm.faces.new(vs)
    bmesh.ops.bevel(bm, geom=vs, offset=r, segments=24, affect="VERTICES", profile=0.5)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("window", me)
    bpy.context.collection.objects.link(ob)
    so = ob.modifiers.new("depth", "SOLIDIFY")
    so.thickness = D
    so.offset = 1  # the face stays at y=0 (the front), the body goes back
    bv = ob.modifiers.new("ease", "BEVEL")
    bv.width = D * 0.45
    bv.segments = 6
    bv.limit_method = "ANGLE"
    me.shade_smooth() if hasattr(me, "shade_smooth") else None
    return ob

def material(name, hexc, rough, spec=0.35):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(hexc)
    b.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = spec
    return m

for shape, (uw, uh) in SHAPES.items():
    sc = reset()
    W = 2.0
    H = W * uh / uw
    D = 0.028
    r = W * 16 / uw  # the HTML sheet's corner radius, 16 units
    ob = slab(W, H, D, r)
    ob.data.materials.append(material("shell", "#f6f3ee", 0.32, 0.5))
    ob.rotation_euler = (math.radians(-PITCH), math.radians(ROLL), math.radians(-YAW))
    bpy.context.view_layer.update()

    # no shadow in the render: the page draws it (Window.astro), mapped through the same perspective as the screen,
    # so it can't be cropped and always lines up at any size

    # light: a big soft window, upper right and in front, and a faint fill from the left
    L = bpy.data.lights.new("key", "AREA")
    L.shape = "DISK"
    L.size = 9
    L.energy = 330
    key = bpy.data.objects.new("key", L)
    key.location = (3.2, -3.0, 2.8)
    bpy.context.collection.objects.link(key)
    key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat("-Z", "Y").to_euler()
    F = bpy.data.lights.new("fill", "AREA")
    F.size = 4
    F.energy = 60
    fill = bpy.data.objects.new("fill", F)
    fill.location = (-3.5, -2.5, 0.5)
    bpy.context.collection.objects.link(fill)
    fill.rotation_euler = (Vector((0, 0, 0)) - fill.location).to_track_quat("-Z", "Y").to_euler()

    # camera straight on, a long lens so it reads like the page's own perspective
    cd = bpy.data.cameras.new("cam")
    cd.lens = 85
    cam = bpy.data.objects.new("cam", cd)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    dist = 9.2 if shape == "wide" else 7.6
    cam.location = (0.0, -dist, 0.0)
    cam.rotation_euler = (math.radians(90), 0, 0)
    cd.sensor_fit = "HORIZONTAL"
    # frame: the window plus room for its shadow down and to the left
    aspect = (W * 1.24) / (H * 1.42)
    sc.render.resolution_x = WIDTH_PX
    sc.render.resolution_y = round(WIDTH_PX / aspect)
    cd.shift_x = -0.035
    cd.shift_y = -0.05
    bpy.context.view_layer.update()

    # the screen face's corners (front face, just in front of the eased edge), into pixels
    front = -0.0005
    corners_local = [(-W / 2, front, H / 2), (W / 2, front, H / 2), (W / 2, front, -H / 2), (-W / 2, front, -H / 2)]
    px = []
    for c in corners_local:
        v = world_to_camera_view(sc, cam, ob.matrix_world @ Vector(c))
        px.append([round(v.x * sc.render.resolution_x, 2), round((1 - v.y) * sc.render.resolution_y, 2)])

    path = os.path.join(out, f"window-{shape}.png")
    sc.render.filepath = path
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    bpy.ops.render.render(write_still=True)
    meta = {}
    jp = os.path.join(out, "window.json")
    if os.path.exists(jp):
        meta = json.load(open(jp))
    meta[shape] = {"w": sc.render.resolution_x, "h": sc.render.resolution_y, "units": [uw, uh], "corners": px}
    json.dump(meta, open(jp, "w"), indent=1)
    print(shape, meta[shape])
