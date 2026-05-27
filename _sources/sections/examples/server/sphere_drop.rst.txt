###########################
Server Example: Sphere Drop
###########################

Overview
========
Drops 1000 dynamic spheres from a compact 3D lattice above a ground plane. It is a simple high-object-count scene for checking primitive creation, broadphase contacts, and server visualization.

Binary
======
Installed executable: ``sphere_drop``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/sphere_drop

On Windows, run ``sphere_drop.exe`` instead.
This example uses RaisimServer. Start ``rayrai_raisim_tcp_viewer`` and connect to port 8080.


Details
=======
- Creates a ground plane and a 10 x 10 x 10 lattice of spheres.
- Places every sphere above the ground with small alternating layer offsets.
- Runs continuously so the spheres fall, collide, and settle into a pile.
