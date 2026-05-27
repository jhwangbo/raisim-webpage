rayrai_pbr_first_draw_benchmark
===============================

``rayrai_pbr_first_draw_benchmark`` isolates setup, first draw, and warm-frame
cost for rayrai PBR mesh materials. It creates a small in-memory quad in an
offscreen rayrai renderer, so the result focuses on renderer and shader-material
startup rather than mesh loading.

Run benchmark cases on one thread:

.. code-block:: bash

   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_pbr_first_draw_benchmark --json
   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_pbr_first_draw_benchmark --core-eligible --frames=5 --warmup=1 --json
   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_pbr_first_draw_benchmark --width=1280 --height=720 --frames=20

Supported options are ``--frames=``, ``--warmup=``, ``--width=``,
``--height=``, ``--json``, and ``--core-eligible``.

The default case exercises the full ``pbrMesh`` material path. The
``--core-eligible`` case disables clearcoat/emissive-only features and adds
specular parameters so the renderer can use the core PBR shader path.
