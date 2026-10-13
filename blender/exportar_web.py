"""
Exporta el dino de prueba_look.blend a un GLB liviano para la web.

Uso (dentro de Blender, con prueba_look.blend abierto):
    exec(open(r".../presentacion/blender/exportar_web.py", encoding="utf-8").read())

Qué hace:
1. Guarda una copia (prueba_look_web.blend) y trabaja ahí; el original no se toca.
2. Deja al dino en pose de reposo (sin animación).
3. Une las piezas estáticas (cuerpo y cabeza), las diezma, hornea color + normal
   (los nodos procedurales no sobreviven a glTF) y les pone un Principled simple.
4. Arma la jerarquía que anima la web: dino > cabeza > ojo_L/R > mirada_L/R, más
   parpado_*, ceja_*, boca_sonrisa y boca_o (bocas de reemplazo).
5. Exporta public/modelos/dino.glb (los asteroides salen de exportar_asteroides.py).
"""
import math
import os

import bpy
from mathutils import Vector

BASE = os.path.dirname(bpy.data.filepath)
TEXTURAS = os.path.join(BASE, "texturas")
MODELOS = os.path.join(os.path.dirname(BASE), "public", "modelos")
os.makedirs(TEXTURAS, exist_ok=True)
os.makedirs(MODELOS, exist_ok=True)

D = bpy.data.objects
sc = bpy.context.scene
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE, "prueba_look_web.blend"))


def principled(nombre, color=None, img_color=None, img_normal=None, rough=0.62, sheen=0.18):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Roughness"].default_value = rough
    p.inputs["Specular IOR Level"].default_value = 0.3
    p.inputs["Sheen Weight"].default_value = sheen
    p.inputs["Sheen Roughness"].default_value = 0.6
    if color:
        p.inputs["Base Color"].default_value = (*color, 1)
    if img_color:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img_color
        nt.links.new(t.outputs["Color"], p.inputs["Base Color"])
    if img_normal:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img_normal
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    return m


def color_medio(mat):
    ramp = next(n for n in mat.node_tree.nodes if n.type == "VALTORGB")
    a, b = ramp.color_ramp.elements[0].color, ramp.color_ramp.elements[1].color
    return tuple((a[i] + b[i]) / 2 for i in range(3))


def seleccionar(objs, activo):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = activo


def hornear(obj, alta=None, tam=1024):
    """Hornea color y normal a imágenes; con `alta`, de la malla densa a la liviana."""
    motor = sc.render.engine
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 16
    sc.render.bake.margin = 6
    sc.render.bake.use_selected_to_active = alta is not None
    sc.render.bake.cage_extrusion = 0.03
    sc.render.bake.max_ray_distance = 0.08
    sc.render.bake.use_pass_direct = False
    sc.render.bake.use_pass_indirect = False
    sc.render.bake.use_pass_color = True
    imgs = []
    for tipo, suf in (("DIFFUSE", "color"), ("NORMAL", "normal")):
        nombre = f"{obj.name}_{suf}"
        if nombre in bpy.data.images:
            bpy.data.images.remove(bpy.data.images[nombre])
        img = bpy.data.images.new(nombre, tam, tam)
        if suf == "normal":
            img.colorspace_settings.name = "Non-Color"
        for mat in obj.data.materials:
            n = mat.node_tree.nodes.new("ShaderNodeTexImage")
            n.image = img
            mat.node_tree.nodes.active = n
        seleccionar([obj] + ([alta] if alta else []), obj)
        bpy.ops.object.bake(type=tipo)
        img.filepath_raw = os.path.join(TEXTURAS, nombre + ".png")
        img.file_format = "PNG"
        img.save()
        imgs.append(img)
    sc.render.bake.use_selected_to_active = False
    sc.render.engine = motor
    return imgs


def preparar_baja(obj, ratio):
    seleccionar([obj], obj)
    m = obj.modifiers.new("dec", "DECIMATE")
    m.ratio = ratio
    bpy.ops.object.modifier_apply(modifier="dec")
    for p in obj.data.polygons:
        p.use_smooth = True
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.008)
    bpy.ops.object.mode_set(mode="OBJECT")


# --- 1) pose de reposo y nombres libres para el GLB ---------------------------------
for o in D:
    o.animation_data_clear()
D["cabeza_pivote"].rotation_euler = (0, 0, 0)
for l in ("L", "R"):
    D[f"parpado_{l}"].rotation_euler = (math.radians(-62), 0, 0)
    D[f"ceja_{l}"].location = (0, 0.03, -0.045)
    D[f"ojo_pupila_{l}"].scale = (1, 0.35, 1)
    mirada = D[f"ojo_mirada_{l}"]
    for c in list(mirada.constraints):
        mirada.constraints.remove(c)
    mirada.rotation_mode = "QUATERNION"
    mirada.rotation_quaternion = Vector((0, -1, 0)).to_track_quat("-Y", "Z")
for nombre in ("boca", "boca_o"):
    D[nombre].hide_render = D[nombre].hide_viewport = False
for o in list(D):
    if o.name.startswith(("parpado_", "ceja_", "boca")):
        o.name = o.name + "_src"
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()

web = bpy.data.collections.new("Web")
sc.collection.children.link(web)


def copia(fuente, nombre, aplicar_mundo=True):
    src = D[fuente]
    me = bpy.data.meshes.new_from_object(src.evaluated_get(dg), depsgraph=dg)
    if aplicar_mundo:
        me.transform(src.matrix_world)
    o = bpy.data.objects.new(nombre, me)
    web.objects.link(o)
    if not aplicar_mundo:
        o.matrix_world = src.matrix_world.copy()
    for p in me.polygons:
        p.use_smooth = True
    return o


def unir(nombre, fuentes):
    partes = [copia(f, f + "_w") for f in fuentes]
    seleccionar(partes, partes[0])
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = o.data.name = nombre
    return o


def con_padre(o, padre):
    o.parent = padre
    o.matrix_parent_inverse = padre.matrix_world.inverted()


def vacio(nombre, mw, padre=None):
    e = bpy.data.objects.new(nombre, None)
    web.objects.link(e)
    e.empty_display_size = 0.08
    e.matrix_world = mw
    if padre:
        con_padre(e, padre)
    return e


def horneado_final(obj, ratio, alta=None, tam=1024):
    preparar_baja(obj, ratio)
    for i, mat in enumerate(obj.data.materials):
        obj.data.materials[i] = mat.copy()
    col_img, nor_img = hornear(obj, alta, tam)
    for p in obj.data.polygons:
        p.material_index = 0
    obj.data.materials.clear()
    obj.data.materials.append(principled(obj.name + "_mat", img_color=col_img, img_normal=nor_img))


# --- 2) cuerpo y cabeza horneados ----------------------------------------------------
nombres = [o.name for o in D]
estaticas = ["dino_cuerpo_m", "dino_panza_m"] + [
    n for n in nombres if n.startswith(("placa_", "dedo_", "brazo_", "mano_", "dedito_"))
]
cuerpo = unir("dino_cuerpo", estaticas)
horneado_final(cuerpo, 0.33)
cabeza_malla = unir("dino_cabeza", ["dino_cabeza_m"] + [n for n in nombres if n.startswith(("nariz_", "cachete_"))])
horneado_final(cabeza_malla, 0.45)

# --- 3) jerarquía animable -------------------------------------------------------------
piel = color_medio(bpy.data.materials["dino_piel"])
m_parpado = principled("parpado_mat", color=piel)
m_ceja = principled("ceja_mat", color=color_medio(bpy.data.materials["dino_cejas"]))
m_boca = principled("boca_mat", color=color_medio(bpy.data.materials["dino_boca"]))

raiz = vacio("dino", D["dino_cuerpo_m"].matrix_world.copy())
con_padre(cuerpo, raiz)
piv = vacio("cabeza", D["cabeza_pivote"].matrix_world.copy(), raiz)
con_padre(cabeza_malla, piv)


def pieza(nombre, fuente, padre, mat=None):
    o = copia(fuente, nombre, aplicar_mundo=False)
    if mat:
        o.data.materials.clear()
        o.data.materials.append(mat)
    con_padre(o, padre)
    return o


for l in ("L", "R"):
    zocalo = vacio(f"ojo_{l}", D[f"ojo_zocalo_{l}"].matrix_world.copy(), piv)
    mirada = vacio(f"mirada_{l}", D[f"ojo_mirada_{l}"].matrix_world.copy(), zocalo)
    pieza(f"ojo_blanco_{l}_w", f"ojo_blanco_{l}", zocalo)
    for parte in ("iris", "pupila", "destello"):
        pieza(f"ojo_{parte}_{l}_w", f"ojo_{parte}_{l}", mirada)
    pieza(f"parpado_{l}", f"parpado_{l}_src", zocalo, m_parpado)
    pieza(f"ceja_{l}", f"ceja_{l}_src", piv, m_ceja)
pieza("boca_sonrisa", "boca_src", piv, m_boca)
pieza("boca_o", "boca_o_src", piv, m_boca)

# --- 4) exportar -------------------------------------------------------------------
def exportar(coleccion, archivo):
    objs = [o for o in coleccion.all_objects if not o.hide_viewport]
    seleccionar(objs, objs[0])
    ruta = os.path.join(MODELOS, archivo)
    bpy.ops.export_scene.gltf(
        filepath=ruta, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
        export_animations=False, export_image_format="WEBP", export_image_quality=85,
    )
    tris = 0
    for o in objs:
        if o.type == "MESH":
            o.data.calc_loop_triangles()
            tris += len(o.data.loop_triangles)
    print(f"{archivo}: {os.path.getsize(ruta) / 1048576:.2f} MB, {tris} triángulos")


exportar(web, "dino.glb")
bpy.ops.wm.save_mainfile()
