#################################
Rayrai Example: PBR Texture Maps
#################################

Overview
========
Loads the Khronos BoomBox glTF asset to exercise textured PBR mesh import, including base color, normal, metallic-roughness, occlusion, and emissive texture maps.

Screenshot
==========
.. image:: ../../../image/rayrai_pbr_texture_maps.png

Binary
======
CMake target and executable name: ``rayrai_pbr_texture_maps``.

Run
====
Build and run from your build directory:

.. code-block:: bash

   cmake --build . --target rayrai_pbr_texture_maps
   ./rayrai_pbr_texture_maps

On Windows, run ``rayrai_pbr_texture_maps.exe`` instead.
This example uses the in-process rayrai renderer (no external client required).


Details
=======
- Loads ``rayrai/pbr/BoomBox/glTF/BoomBox.gltf``.
- Uses a fixed target camera for close inspection of the textured asset.
- Rotates the mesh to check texture coordinates and lighting from multiple angles.

Source
======
.. literalinclude:: ../../../../examples/src/rayrai/rayrai_pbr_texture_maps.cpp
   :language: cpp
