##################################
Server Example: Dynamic Heightmap
##################################

Overview
========
Updates a heightmap height field and color map every frame to animate terrain.
Use ``rayrai_tcp_viewer`` for supported visualization.

Screenshot
==========
.. image:: ../../../image/dynamic_heightmap.png
   :alt: dynamic_heightmap example
   :width: 100%

Target
======
CMake target: ``dynamic_heightmap``.

Run
====
Run the build-tree executable:

.. code-block:: bash

   ./build-examples/examples/dynamic_heightmap

On Windows, run ``dynamic_heightmap.exe`` instead.
This example uses RaisimServer. Start ``rayrai_tcp_viewer`` and connect to port 8080.


Details
=======
- Creates a heightmap grid and updates heights and colors every frame.
- Uses visualization mutex locking while updating the heightmap.
- Intended for dynamic heightmap rendering in the supported rayrai TCP viewer.

