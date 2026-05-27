rayrai_complete_showcase_benchmark
==================================

``rayrai_complete_showcase_benchmark`` is the timed, source-build benchmark
version of the complete rayrai showcase. It builds the Anymal sensor scene,
streams LiDAR data into a rayrai point cloud, renders RGB and depth sensor
views, and can include CPU readback, legacy visualization paths, PBR world
materials, visualization startup, and startup profiling.

Run benchmark cases on one thread:

.. code-block:: bash

   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_complete_showcase_benchmark --json
   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_complete_showcase_benchmark --frames=60 --warmup=10 --readback --json
   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_complete_showcase_benchmark --async-readback --json
   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_complete_showcase_benchmark --legacy-showcase --json
   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/rayrai_complete_showcase_benchmark --viz --viz-frames=1 --profile-startup --pbr-world

Supported options are ``--frames=``, ``--warmup=``, ``--viz-frames=``,
``--json``, ``--readback``, ``--async-readback``, ``--legacy-point-cloud``,
``--legacy-depth-color``, ``--legacy-showcase``, ``--viz``,
``--profile-startup``, and ``--pbr-world``.

``--async-readback`` also enables readback timing. ``--legacy-showcase`` enables
both the legacy point-cloud upload path and the legacy depth-color path. With
``--viz``, ``--viz-frames=0`` keeps the visualization open until the window is
closed; positive values close after that many frames.
