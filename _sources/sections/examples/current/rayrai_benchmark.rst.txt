rayrai_benchmark
================

``rayrai_benchmark`` measures rayrai rendering and serialization paths, including
shadowed and unshadowed color rendering, readback, depth, picking, transparent
visuals, culling, instanced visuals, point clouds, quality presets, HDR/IBL
setup, scene synchronization, and TCP deformable serialization.

Run:

.. code-block:: bash

   <raisim-install>/bin/rayrai_benchmark
   <raisim-install>/bin/rayrai_benchmark --json
   <raisim-install>/bin/rayrai_benchmark --only=viewer_quality_fast --frames=60 --warmup=10
   <raisim-install>/bin/rayrai_benchmark --objects=1024 --width=1280 --height=720

Supported options are ``--objects=``, ``--frames=``, ``--warmup=``,
``--width=``, ``--height=``, ``--min-lod-speedup=``, ``--only=``, and
``--json``.

When Python support is available, the ``rayrai_benchmark_json`` custom target
can run the benchmark, check thresholds, and write the configured JSON path.


For focused Rayrai timing, use
:doc:`rayrai_complete_showcase_benchmark <rayrai_complete_showcase_benchmark>`
for the full sensor showcase and
:doc:`rayrai_pbr_first_draw_benchmark <rayrai_pbr_first_draw_benchmark>` for
PBR shader-material first-draw cost.
