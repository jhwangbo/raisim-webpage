rayrai_blender_scene_import
===========================

Rayrai can import complete authored visual scenes through glTF/GLB. This is the
recommended workflow for rooms, offices, shelves, lamps, props, and other scenes that
should stay authored in Blender instead of being reconstructed object by object in C++.

The pipeline is:

1. Author or download the complete scene in Blender.
2. Export it with ``scripts/export_blender_scene.py``.
3. Load the resulting ``.glb`` with ``RayraiWindow::importVisualScene``.
4. Add separate RaiSim collision objects only where physics is needed.

Why glTF/GLB
------------
Use glTF/GLB for whole-scene rendering. Compared with OBJ, glTF carries much more of the
visual intent:

* node hierarchy and transforms
* PBR metallic-roughness materials
* base-color, normal, metallic-roughness, occlusion, and emissive textures
* alpha modes and material factors
* tangent data for normal mapping
* punctual lights through ``KHR_lights_punctual``

OBJ remains useful for simple mesh interchange, but it is a poor format for modern
scene rendering because material, normal-map, and light semantics are too limited.

Exporter location
-----------------
The general Blender exporter is installed in:

.. code-block:: bash


   /path/to/raisim2Lib/scripts/export_blender_scene.py

It is copied from the source-tree helper used by the RayRai examples. The script is not
asset-specific. It exports renderable Blender objects, applies modifiers, preserves
Z-up coordinates, writes glTF/GLB output, and emits a RayRai sidecar for Blender area
lights that glTF cannot store directly.

Export command
--------------
Run Blender in background mode:

.. code-block:: bash


   blender --background /path/to/scene.blend \
     --python /path/to/raisim2Lib/scripts/export_blender_scene.py \
     -- --format glb --output /path/to/scene.glb

The exporter also supports separate glTF output:

.. code-block:: bash


   blender --background /path/to/scene.blend \
     --python /path/to/raisim2Lib/scripts/export_blender_scene.py \
     -- --format gltf --output /path/to/scene.gltf

``.glb`` is usually easier to move around because most texture images are embedded in
one file. Separate ``.gltf`` is easier to inspect and edit by hand.

Area-light sidecar
------------------
glTF's standard light extension supports directional, point, and spot lights, but not
Blender area lights. Indoor scenes often rely on area lights for windows, ceiling panels,
and lamp shades. The exporter writes those lights next to the scene:

.. code-block:: text


   scene.glb
   scene.glb.rayrai_lights.json

Rayrai automatically looks for both ``scene.glb.rayrai_lights.json`` and
``scene.rayrai_lights.json`` next to the imported scene. Keep the sidecar beside the
GLB when moving assets.

C++ loading
-----------
Load the scene as a visual scene:

.. code-block:: cpp


   raisin::RayraiWindow::SceneImportReport report;
   auto scene = viewer.importVisualScene(
     "imported_room",
     "/path/to/scene.glb",
     &report,
     /*importLights=*/true,
     /*lightIntensityScale=*/0.08f);

The returned object owns the imported visual nodes. The import report records mesh,
material, texture, and light decisions. Use it when diagnosing missing maps, unexpected
alpha, or lights that look too strong or too weak.

The scene import is renderer-only. It does not create RaiSim collision bodies. For a
simulation scene, create simplified collision geometry separately and use the glTF scene
for visual fidelity.

Lighting quality
----------------
For authored interiors, start from the ``High`` or ``Ultra`` quality preset and tune the
shadow budget explicitly:

.. code-block:: cpp


   auto quality = raisin::RayraiWindow::defaultRenderQualitySettings(
     raisin::RayraiWindow::RenderQualityPreset::Ultra);
   quality.autoSelectImportedShadowLight = true;
   quality.updateShadowsEveryFrame = false;
   quality.maxAdditionalLightsPerFrame = 12;
   quality.maxAdditionalShadowLights = 4;
   quality.maxPointShadowLights = 2;
   quality.additionalShadowResolutionScale = 0.5f;
   quality.pointShadowResolutionScale = 0.5f;
   viewer.setRenderQualitySettings(quality);

``updateShadowsEveryFrame = false`` bakes shadows at startup or on demand. This is much
faster for static rooms. Enable per-frame updates when lights or shadow-casting objects
move every frame.

Material and texture expectations
---------------------------------
Rayrai's importer uses explicit glTF material slots first, then falls back to sibling
PBR texture files when assets are packaged loosely. It supports:

* base color factor and texture
* metallic and roughness factors
* metallic-roughness texture
* normal texture and normal scale
* occlusion texture
* emissive factor and texture
* alpha mode and alpha cutoff

Color maps are uploaded as sRGB. Normal, metallic-roughness, occlusion, and mask maps
are uploaded as linear data. Normal-map convention is detected from common file names
such as ``*_nor_gl`` and ``*normaldx*`` where possible.

Common failure checks
---------------------
If the imported scene looks wrong, check these first:

* White or flat objects usually mean the texture path is missing or the asset package
  omitted the PBR map slot.
* Transparent walls or frames usually mean an alpha mode/cutoff is being imported from
  the source material; inspect the import report.
* Missing lamp or ceiling meshes usually means the Blender object was hidden for render,
  disabled in the view layer, or not converted/exportable by Blender's glTF exporter.
* Missing area lights usually means the ``.rayrai_lights.json`` sidecar was not copied
  next to the GLB.
* Over-bright interiors usually mean HDR/environment light, imported light scale, and
  authored light energy need to be balanced for real-time rendering.
* Sharp window shadows usually mean the light was exported as a small directional/spot
  light rather than an area light with an appropriate size.

Exporter source
---------------
For reference, the installed exporter is:

