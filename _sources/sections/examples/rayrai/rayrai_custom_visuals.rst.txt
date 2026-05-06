##############################
Rayrai Example: Custom Visuals
##############################

Overview
========
Demonstrates custom visual primitives (sphere, box, cylinder, capsule, mesh) and simple animation of positions and orientations.

Screenshot
==========
.. image:: ../../../image/rayrai_custom_visuals.png
   :alt: rayrai_custom_visuals example
   :width: 100%

Binary
======
Installed executable: ``rayrai_custom_visuals``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/rayrai_custom_visuals

On Windows, run ``rayrai_custom_visuals.exe`` instead.
This example uses the in-process rayrai renderer (no external client required).


Details
=======
- Creates custom visuals (sphere/box/cylinder/capsule/mesh) outside the physics world.
- Animates visual positions and orientations each frame.
- Demonstrates detectability for picking (``setDetectable(true)``).

