#################################
Rayrai Example: PBR Material Grid
#################################

Overview
========
Renders the Khronos MetalRoughSpheres glTF asset to check metallic-roughness material import, lighting, and shadow response in rayrai.

Screenshot
==========
.. image:: ../../../image/rayrai_pbr_material_grid.png
   :alt: rayrai_pbr_material_grid example
   :width: 100%

Binary
======
Installed executable: ``rayrai_pbr_material_grid``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/rayrai_pbr_material_grid

On Windows, run ``rayrai_pbr_material_grid.exe`` instead.
This example uses the in-process rayrai renderer (no external client required).


Details
=======
- Loads ``rayrai/pbr/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf``.
- Displays a grid of spheres spanning metallic and roughness values.
- Animates the mesh orientation so highlights and shadows can be checked over time.

