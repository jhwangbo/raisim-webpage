example_polyhaven_blue_wall
===========================

``example_polyhaven_blue_wall`` imports a Poly Haven ``blue_wall.glb`` scene into
rayrai, configures high-quality PBR rendering, imported lights, HDR IBL,
optional reflection probes, shadow budgets, and screenshot output.

Useful options include:

.. code-block:: bash


   <raisim-install>/bin/example_polyhaven_blue_wall --fast-load
   <raisim-install>/bin/example_polyhaven_blue_wall --screenshot /tmp/blue_wall.png

If the exported GLB is missing, the example prints the Blender command needed to
export it from the bundled ``blue_wall.blend``.
