"""
Asteroides de plastilina que se abren por la mitad (para el motor de diapositivas).

Uso (dentro de Blender, con prueba_look.blend abierto):
    exec(open(r".../presentacion/blender/exportar_asteroides.py", encoding="utf-8").read())

Por cada variante:
1. Piedra densa: icosfera + desplazamientos (bultos y grumos), con el material de plastilina.
2. Piedra liviana: la densa diezmada, con color y normal horneados desde la densa.
3. Dos mitades (cortadas por el plano X = 0) con la cara del corte tapada. Esa tapa usa el
   material "geoda" con UV plano: la web le pone una textura de geoda dibujada en código.
Resultado: public/modelos/asteroides.glb con nodos asteroide_<i> > mitad_L_<i>, mitad_R_<i>.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

BASE = os.path.dirname(bpy.data.filepath)
TEXTURAS = os.path.join(BASE, "texturas")
MODELOS = os.path.join(os.path.dirname(BASE), "public", "modelos")
RADIO = 0.42
# (color de la piedra, escala de la forma, base de ruido)
VARIANTES = [
    ("#7E8F74", 0.55, "ORIGINAL_PERLIN"),
    ("#8C9182", 0.7, "IMPROVED_PERLIN"),
    ("#6E8A69", 0.48, "BLENDER_ORIGINAL"),
]

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE, "asteroides_web.blend"))
sc = bpy.context.scene
col = bpy.data.collections.new("AsteroidesWeb")
sc.collection.children.link(col)


def lin(hexs):
    hexs = hexs.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hexs[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def seleccionar(objs, activo):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = activo


def material_piedra(i, hexs):
    m = bpy.data.materials["asteroide"].copy()
    m.name = f"asteroide_{i}_plastilina"
    ramp = next(n for n in m.node_tree.nodes if n.type == "VALTORGB")
    r, g, b = lin(hexs)
    v = 0.22
    ramp.color_ramp.elements[0].color = (r * (1 - v), g * (1 - v), b * (1 - v), 1)
    ramp.color_ramp.elements[1].color = (min(1, r * (1 + v)), min(1, g * (1 + v)), min(1, b * (1 + v)), 1)
    return m


def principled_horneado(nombre, img_color, img_normal):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Roughness"].default_value = 0.7
    p.inputs["Specular IOR Level"].default_value = 0.25
    p.inputs["Sheen Weight"].default_value = 0.1
    p.inputs["Sheen Roughness"].default_value = 0.6
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img_color
    nt.links.new(t.outputs["Color"], p.inputs["Base Color"])
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img_normal
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(t.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    return m


def material_geoda():
    m = bpy.data.materials.get("geoda") or bpy.data.materials.new("geoda")
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*lin("#F4B860"), 1)
    p.inputs["Roughness"].default_value = 0.55
    return m


def piedra_densa(i, hexs, escala, base_ruido):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=5, radius=RADIO)
    me = bpy.data.meshes.new(f"asteroide_{i}_alta")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(f"asteroide_{i}_alta", me)
    col.objects.link(o)
    forma = bpy.data.textures.new(f"ast{i}_forma", "CLOUDS")
    forma.noise_scale = escala
    forma.noise_depth = 1
    forma.noise_basis = base_ruido
    m1 = o.modifiers.new("forma", "DISPLACE")
    m1.texture = forma
    m1.strength = RADIO * 0.45
    grumos = bpy.data.textures.new(f"ast{i}_grumos", "CLOUDS")
    grumos.noise_scale = 0.12
    grumos.noise_depth = 2
    grumos.noise_basis = base_ruido
    m2 = o.modifiers.new("grumos", "DISPLACE")
    m2.texture = grumos
    m2.strength = RADIO * 0.3
    dg = bpy.context.evaluated_depsgraph_get()
    aplicada = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    o.modifiers.clear()
    o.data = aplicada
    # centrar en el origen para que el corte pase por el medio
    centro = sum((v.co for v in aplicada.vertices), Vector()) / len(aplicada.vertices)
    aplicada.transform(Matrix.Translation(-centro))
    for p in aplicada.polygons:
        p.use_smooth = True
    aplicada.materials.append(material_piedra(i, hexs))
    return o


def piedra_liviana(i, alta):
    baja = bpy.data.objects.new(f"asteroide_{i}_baja", alta.data.copy())
    col.objects.link(baja)
    seleccionar([baja], baja)
    m = baja.modifiers.new("dec", "DECIMATE")
    m.ratio = 0.3
    bpy.ops.object.modifier_apply(modifier="dec")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01)
    bpy.ops.object.mode_set(mode="OBJECT")
    # hornear color y normal desde la densa
    tmp = bpy.data.materials.new(f"asteroide_{i}_bake")
    tmp.use_nodes = True
    baja.data.materials.clear()
    baja.data.materials.append(tmp)
    motor = sc.render.engine
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 16
    b = sc.render.bake
    b.use_selected_to_active, b.cage_extrusion, b.max_ray_distance, b.margin = True, 0.03, 0.08, 6
    b.use_pass_direct = b.use_pass_indirect = False
    b.use_pass_color = True
    imgs = []
    for tipo, suf in (("DIFFUSE", "color"), ("NORMAL", "normal")):
        img = bpy.data.images.new(f"asteroide_{i}_{suf}", 512, 512)
        if suf == "normal":
            img.colorspace_settings.name = "Non-Color"
        n = tmp.node_tree.nodes.new("ShaderNodeTexImage")
        n.image = img
        tmp.node_tree.nodes.active = n
        seleccionar([alta, baja], baja)
        bpy.ops.object.bake(type=tipo)
        img.filepath_raw = os.path.join(TEXTURAS, f"asteroide_{i}_{suf}.png")
        img.file_format = "PNG"
        img.save()
        imgs.append(img)
    b.use_selected_to_active = False
    sc.render.engine = motor
    baja.data.materials.clear()
    baja.data.materials.append(principled_horneado(f"asteroide_{i}_cascara", *imgs))
    baja.data.materials.append(material_geoda())
    return baja


def mitad(i, baja, lado):
    """lado = -1 se queda con x < 0 (mitad_L), lado = 1 con x > 0 (mitad_R)."""
    bm = bmesh.new()
    bm.from_mesh(baja.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(1, 0, 0),
                           clear_inner=lado > 0, clear_outer=lado < 0)
    borde = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=borde, sides=0)
    tapa = [f for f in bm.faces if all(abs(v.co.x) < 1e-4 for v in f.verts)]
    bmesh.ops.triangulate(bm, faces=tapa, quad_method="BEAUTY", ngon_method="BEAUTY")
    tapa = [f for f in bm.faces if all(abs(v.co.x) < 1e-4 for v in f.verts)]
    uv = bm.loops.layers.uv.active
    radio = max(max(abs(v.co.y), abs(v.co.z)) for v in bm.verts) or RADIO
    for f in tapa:
        f.material_index = 1
        f.smooth = False
        for loop in f.loops:
            loop[uv].uv = (0.5 + loop.vert.co.y / (2 * radio), 0.5 + loop.vert.co.z / (2 * radio))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    nombre = f"mitad_{'L' if lado < 0 else 'R'}_{i}"
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    for m in baja.data.materials:
        me.materials.append(m)
    o = bpy.data.objects.new(nombre, me)
    col.objects.link(o)
    return o, len(tapa)


for i, (hexs, escala, base_ruido) in enumerate(VARIANTES):
    alta = piedra_densa(i, hexs, escala, base_ruido)
    baja = piedra_liviana(i, alta)
    raiz = bpy.data.objects.new(f"asteroide_{i}", None)
    col.objects.link(raiz)
    raiz.location = (i * 1.2, 0, 0)
    for lado in (-1, 1):
        o, caras = mitad(i, baja, lado)
        o.parent = raiz
        print(o.name, "caras de tapa:", caras)
    alta.hide_viewport = alta.hide_render = True
    baja.hide_viewport = baja.hide_render = True

objs = [o for o in col.all_objects if not o.hide_viewport]
seleccionar(objs, objs[0])
ruta = os.path.join(MODELOS, "asteroides.glb")
bpy.ops.export_scene.gltf(
    filepath=ruta, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
    export_animations=False, export_image_format="WEBP", export_image_quality=85,
)
tris = 0
for o in objs:
    if o.type == "MESH":
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
print(f"asteroides.glb: {os.path.getsize(ruta) / 1024:.0f} KB, {tris} triángulos en {len(VARIANTES)} variantes")
bpy.ops.wm.save_mainfile()
