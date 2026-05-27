##########################################
Rayrai Example: CoACD Mesh Approximation
##########################################

Overview
========
Compares original triangle meshes with their CoACD convex approximation output.
Use it to visually inspect collision approximations generated from YCB meshes.

Screenshot
==========
.. image:: ../../../image/rayrai_coacd_mesh_approximation.png
   :alt: rayrai_coacd_mesh_approximation example
   :width: 100%

Binary
======
Installed executable: ``rayrai_coacd_mesh_approximation``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/rayrai_coacd_mesh_approximation

On Windows, run ``rayrai_coacd_mesh_approximation.exe`` instead.
This example uses the in-process rayrai renderer (no external client required).


Details
=======
- Loads several YCB OBJ meshes.
- Calls ``World::addMesh`` directly for both the original triangle mesh and the
  CoACD convex approximation mesh.
- Passes ``raisim::CoacdOptions`` into ``addMesh`` so the mesh processing stays
  inside RaiSim rather than in application-side rendering code.
- Prints the number of generated convex parts for each mesh.
- Displays the original meshes in gray beside the CoACD convex approximation
  collision parts.

What this example is not
========================
This is not a manual mesh-processing example. Application code should not need
to load OBJ vertices, split convex parts, or build OpenGL meshes directly just
to use CoACD collision. The intended user-facing workflow is:

.. code-block:: cpp


   raisim::CoacdOptions options;
   options.maxConvexHull = 12;
   auto* mesh = world->addMesh(path, mass, scale, "",
                               raisim::MeshCollisionMode::CONVEX_APPROXIMATION,
                               collisionGroup, collisionMask, options);

The rayrai side then visualizes the resulting RaiSim object.

