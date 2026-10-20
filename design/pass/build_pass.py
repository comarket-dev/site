"""Comarket pass and material assets.

Run from the repo root:
  blender -b -P design/pass/build_pass.py -- public/assets/pass
Writes:
  public/assets/pass/pass.glb          card geometry with front, back and edge material slots
  public/assets/matcaps/*.jpg          ceramic matcaps for the split coin
  design/pass/render-brand.png         studio render of a brand pass (share images, email)
  design/pass/render-creator.png       studio render of a creator pass
Needs design/pass/tex/*.png from `npm run assets:textures`.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/assets/pass")
ROOT = os.path.abspath(os.path.join(OUT, "..", "..", ".."))
TEX = os.path.join(ROOT, "design", "pass", "tex")
MATCAPS = os.path.join(ROOT, "public", "assets", "matcaps")
RENDERS = os.path.join(ROOT, "design", "pass")
SAMPLES = int(os.environ.get("PASS_SAMPLES", "160"))
os.makedirs(OUT, exist_ok=True)
os.makedirs(MATCAPS, exist_ok=True)

W, H, T, R = 1.585, 1.0, 0.028, 0.07  # card size in scene units, ISO ID-1 proportions


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
        print("GPU unavailable, CPU render", e)
    s.cycles.samples = SAMPLES
    s.cycles.use_denoising = True
    s.view_settings.view_transform = "Standard"
    s.view_settings.look = "None"
    return s


def select_only(ob):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


# ---------------------------------------------------------------- card
def outline(n=14):
    pts = []
    corners = [(W / 2 - R, H / 2 - R, 0), (-W / 2 + R, H / 2 - R, 90), (-W / 2 + R, -H / 2 + R, 180), (W / 2 - R, -H / 2 + R, 270)]
    for cx, cz, a0 in corners:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + R * math.cos(a), cz + R * math.sin(a)))
    return pts


def build_card():
    """Card stands in Blender's XZ plane with the front facing -Y, so glTF's Y-up export faces it toward +Z."""
    me = bpy.data.meshes.new("pass")
    bm = bmesh.new()
    pts = outline()
    front = [bm.verts.new((x, -T / 2, z)) for x, z in pts]
    back = [bm.verts.new((x, T / 2, z)) for x, z in pts]
    f_front = bm.faces.new(list(reversed(front)))
    f_back = bm.faces.new(back)
    f_front.material_index = 0
    f_back.material_index = 1
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        side = bm.faces.new((front[i], front[j], back[j], back[i]))
        side.material_index = 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    rim = [e for e in bm.edges if len(e.link_faces) == 2 and {f.material_index for f in e.link_faces} != {2}]
    bevel = bmesh.ops.bevel(bm, geom=rim, offset=0.006, segments=3, affect="EDGES", profile=0.5)
    for f in bevel["faces"]:
        f.material_index = 2
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            x, _, z = loop.vert.co
            u = (x + W / 2) / W
            v = (z + H / 2) / H
            if f.material_index == 1:
                u = 1 - u
            loop[uv].uv = (u, v)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Pass", me)
    bpy.context.scene.collection.objects.link(ob)
    select_only(ob)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    except Exception:
        bpy.ops.object.shade_smooth()
    for name in ("pass_front", "pass_back", "pass_edge"):
        me.materials.append(bpy.data.materials.new(name))
    return ob


def export_glb(ob):
    select_only(ob)
    path = os.path.join(OUT, "pass.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    print("wrote", path, os.path.getsize(path), "bytes")


# ---------------------------------------------------------------- materials
def principled(name, color=None, rough=0.4, metal=0.0, coat=0.0, image=None, film_mask=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get("Principled BSDF")
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if "Coat Weight" in p.inputs:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = 0.12
    if color:
        p.inputs["Base Color"].default_value = lin(color)
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(image)
        tex.interpolation = "Cubic"
        nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    if film_mask and "Thin Film Thickness" in p.inputs:
        fm = nt.nodes.new("ShaderNodeTexImage")
        fm.image = bpy.data.images.load(film_mask)
        fm.image.colorspace_settings.name = "Non-Color"
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = 520.0
        nt.links.new(fm.outputs["Color"], mul.inputs[0])
        nt.links.new(mul.outputs[0], p.inputs["Thin Film Thickness"])
        p.inputs["Thin Film IOR"].default_value = 1.6
    return m


def studio(world_top, world_bottom, strength=1.0):
    s = bpy.context.scene
    w = bpy.data.worlds.new("Studio")
    s.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes.get("Background")
    grad = nt.nodes.new("ShaderNodeTexGradient")
    mapping = nt.nodes.new("ShaderNodeMapping")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    mapping.inputs["Rotation"].default_value = (0, math.radians(-90), 0)
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], grad.inputs["Vector"])
    nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].color = lin(world_bottom)
    ramp.color_ramp.elements[1].color = lin(world_top)
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength


def area(name, loc, target, size, energy, color="#FFFFFF"):
    ld = bpy.data.lights.new(name, "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = lin(color)[:3]
    ob = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def camera(loc, target, lens=50, ortho=None, dof=None):
    cd = bpy.data.cameras.new("Cam")
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    if dof:
        cd.dof.use_dof = True
        cd.dof.focus_distance = dof[0]
        cd.dof.aperture_fstop = dof[1]
    ob = bpy.data.objects.new("Cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = ob
    return ob


# ---------------------------------------------------------------- 1. geometry
reset()
card = build_card()
export_glb(card)

if os.environ.get("PASS_ONLY_GLB"):
    sys.exit(0)

# ---------------------------------------------------------------- 2. matcaps
CAPS = {
    "paper": ("#D9DFDA", 0.32, 0.4),
    "jasper": ("#EB5324", 0.22, 0.7),
    "benzol": ("#00978D", 0.22, 0.7),
    "ink": ("#051230", 0.18, 0.8),
}
for name, (color, rough, coat) in CAPS.items():
    reset()
    s = bpy.context.scene
    s.render.resolution_x = s.render.resolution_y = 512
    s.render.image_settings.file_format = "JPEG"
    s.render.image_settings.quality = 88
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=1)
    sph = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    sph.data.materials.append(principled(f"cap_{name}", color, rough, 0.0, coat))
    studio("#F4F6F2", "#2A3550", 0.55)
    area("Key", (-3, -4, 4), (0, 0, 0), 3.2, 520)
    area("Rim", (3.5, 2.5, 2.5), (0, 0, 0), 2.2, 260)
    area("Fill", (2.5, -4, -2.5), (0, 0, 0), 4, 90, "#DDE8FF")
    camera((0, -10, 0), (0, 0, 0), ortho=2.0)
    s.render.filepath = os.path.join(MATCAPS, f"{name}.jpg")
    bpy.ops.render.render(write_still=True)
    print("wrote", s.render.filepath)

# ---------------------------------------------------------------- 3. hero renders
def hero(side):
    reset()
    s = bpy.context.scene
    s.render.resolution_x, s.render.resolution_y = 1600, 1000
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    s.render.film_transparent = True
    ob = build_card()
    front_tex = os.path.join(TEX, f"front-{side}.png")
    ob.data.materials[0] = principled("front", rough=0.38, coat=0.55, image=front_tex, film_mask=os.path.join(TEX, "foil.png"))
    ob.data.materials[1] = principled("back", rough=0.45, coat=0.4, image=os.path.join(TEX, "back.png"))
    ob.data.materials[2] = principled("edge", "#00978D", 0.28, 0.35, 0.5)
    ob.rotation_euler = (math.radians(-8), math.radians(-6), math.radians(-14))
    ob.location = (0.05, 0, 0.08)
    bg_top, bg_bottom = ("#F4F6F2", "#D9E0DA") if side == "brand" else ("#13224A", "#030B20")
    studio(bg_top, bg_bottom, 0.38 if side == "brand" else 0.5)
    area("Key", (-2.6, -3.2, 2.8), (0, 0, 0), 2.4, 95)
    area("Rim", (2.8, 0.8, 1.8), (0, 0, 0), 1.6, 70, "#E6FFF8")
    area("Fill", (1.8, -3.5, -1.2), (0, 0, 0), 3, 22)
    camera((0.35, -4.6, 0.55), (0, 0, 0.02), lens=58, dof=(4.62, 4.0))
    s.render.filepath = os.path.join(RENDERS, f"render-{side}.png")
    bpy.ops.render.render(write_still=True)
    print("wrote", s.render.filepath)


if os.path.exists(os.path.join(TEX, "front-brand.png")):
    hero("brand")
    hero("creator")
else:
    print("skipping hero renders: run `npm run assets:textures` first")

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(RENDERS, "pass.blend"))
