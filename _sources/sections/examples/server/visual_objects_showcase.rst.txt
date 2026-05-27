#######################################
Server Example: Visual Objects Showcase
#######################################

Overview
========
Adds visual primitives, meshes, arrows, polylines, dynamic meshes, and a visual heightmap through the server API. It demonstrates the visualization helpers and dynamic updates.

Screenshot
==========
.. image:: ../../../image/visual_objects_showcase.png
   :alt: visual_objects_showcase example
   :width: 100%

Binary
======
Installed executable: ``visual_objects_showcase``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/visual_objects_showcase

On Windows, run ``visual_objects_showcase.exe`` instead.
This example uses RaisimServer. Start ``rayrai_raisim_tcp_viewer`` and connect to port 8080.


Details
=======
- Adds visual-only primitives, meshes, arrows, polylines, and a visual heightmap.
- Updates colors/sizes and dynamic mesh data every frame.
- Shows visual articulated systems and custom mesh streaming.

