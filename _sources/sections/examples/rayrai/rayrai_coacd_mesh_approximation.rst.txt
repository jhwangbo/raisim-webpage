##########################################
Rayrai Example: COACD Mesh Approximation
##########################################

Overview
========
Compares original triangle meshes with their COACD convex decomposition output. Use it to visually inspect convex parts generated from YCB and Minitaur meshes.

Screenshot
==========
.. image:: ../../../image/rayrai_coacd_mesh_approximation.png

Binary
======
CMake target and executable name: ``rayrai_coacd_mesh_approximation``.

Run
====
Build and run from your build directory:

.. code-block:: bash

   cmake --build . --target rayrai_coacd_mesh_approximation
   ./rayrai_coacd_mesh_approximation

On Windows, run ``rayrai_coacd_mesh_approximation.exe`` instead.
This example uses the in-process rayrai renderer (no external client required).


Details
=======
- Loads several YCB and Minitaur OBJ meshes.
- Builds COACD convex parts with ``raisim::CoacdOptions`` and prints original triangle counts and part counts.
- Displays original meshes in gray beside colored convex decomposition parts.

Source
======
.. literalinclude:: ../../../../examples/src/rayrai/rayrai_coacd_mesh_approximation.cpp
   :language: cpp
