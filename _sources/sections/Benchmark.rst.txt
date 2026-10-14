#############################
Benchmark
#############################

Eleven workloads cover articulated dynamics, rigid contacts, closed loops, ray queries, and
deformable objects. The tables compare RaiSim and MuJoCo on the same machine, with three runs per
backend. For tuning guidance, see :doc:`Performance`.

.. container:: benchmark-page

   .. tabs::

      .. tab:: Results

         **Median wall-clock seconds; lower is better.** The smaller range below each median is
         the minimum–maximum of three runs. Speedup is MuJoCo's median divided by RaiSim's median.
         All rows include scene construction and the benchmark loop; rendering is disabled.

         .. include:: benchmark_results.inc

         The eight-cube MuJoCo run reports numerical instability at 0.020 s. Its timing and speedup
         are omitted. Cloth and cube-stack backends use different deformable models; their
         parameters and comparison limits are in **Workloads**.

         .. container:: benchmark-graph-block

            .. figure:: ../../rsc/docs/image/benchmark_speedup.svg
               :alt: Vertical bars showing MuJoCo time divided by RaiSim time for ten valid comparisons, on a logarithmic vertical axis.
               :width: 100%

         :download:`Download the recorded results and exact arguments <../_static/benchmark_results.json>`.
         Absolute timings depend on the machine, compiler, and scene. These ratios describe the
         recorded development build; use your application workload to evaluate the distributed
         |raisim_version| package.

      .. tab:: Workloads

         DOF counts generalized velocity coordinates; a floating base contributes six.
         A step count denotes simulation steps unless the row says queries or sensor updates.

         .. container:: benchmark-table-block benchmark-table-scenes

            .. list-table::
               :header-rows: 1
               :widths: 30 18 52

               * - Benchmark ID
                 - Run
                 - Scene and settings
               * - ``chain10_speed``
                 - 100,000 steps

                   Δt = 1 ms
                 - Fixed-base chain, 10 spherical joints, **30 DOF**. Spring-dampers bend each
                   link by 90°. No collision geometry or contacts; pure articulated dynamics.
               * - ``chain20_speed``
                 - 100,000 steps

                   Δt = 1 ms
                 - The same spring chain with 20 spherical joints and **60 DOF**.
               * - ``anymal_standing``
                 - 1,000,000 steps

                   Δt = 2 ms
                 - ANYmal: floating base and 12 revolute joints, **18 DOF**. PD control holds a
                   stance on a plane, with about four persistent foot contacts. Primitive robot
                   collision shapes; friction 0.8.
               * - ``anymal_falling``
                 - 100,000 steps

                   Δt = 2 ms
                 - ANYmal, **18 DOF**, falling freely with no ground or contacts.
               * - ``heightmap_anymal_speed``
                 - 200,000 steps

                   Δt = 2 ms
                 - ANYmal, **18 DOF**, on a 20 × 20 m fractal heightmap: 100 × 100 samples,
                   three octaves. Tests robot–terrain contacts.
               * - ``primitive_speed``
                 - 100,000 steps

                   Δt = 2 ms
                 - **32 rigid bodies**: sixteen 0.4 m boxes and sixteen spheres of radius
                   0.15 m, in a 4 × 4 grid at 0.6 m spacing. Spheres fall onto boxes above a
                   ground plane; tests box–ground and sphere–box contacts.
               * - ``strandbeest``
                 - 3,000 steps

                   Δt = 1 ms
                 - Twelve-legged linkage, **79 DOF** and **42 hinge closures / 84 pin
                   constraints**, driven by a crank at one revolution per second. RaiSim imports
                   OpenUSD; MuJoCo loads converted MJCF with connect equalities. This row includes
                   import, unlike the simulation-only timing in earlier versions of this page.
               * - ``heightmap_lidar``
                 - 2,000 updates

                   Δt = 5 ms
                 - Spinning LiDAR on ANYmal C over a **200 × 200 m heightmap, 400 × 400 samples**.
                   Uses 512 yaw × 64 pitch samples per revolution at 10 Hz, ±16.6° pitch and
                   0.8–40 m range. The robot settles for 200 steps, then stays fixed while
                   sensor time advances. Both backends check hit ratio and terrain-surface error.
               * - ``primitive_ray_scaling``
                 - 10,000 queries

                   256 warmup rays
                 - **10,000 static primitives** on a 2.5 m grid: spheres, boxes, capsules, and
                   cylinders. The deterministic ``mixed`` workload casts vertical rays in an
                   incoherent order, with 50% hits. Initial queries verify hits and target IDs;
                   the timed loop consumes hit results. This row is one point in the scaling
                   workload; change ``--objects`` and ``--workload`` to measure others.
               * - ``deformable_cloth``
                 - 2,000 steps

                   Δt = 1 ms
                 - Unpinned **32 × 32 cloth grid: 1,024 particles, 1,922 triangles**, 0.035 m
                   spacing, dropped from 0.85 m onto a static sphere of radius 0.25 m and a
                   plane. Six solver iterations. RaiSim uses XPBD distance compliance 10⁻⁵
                   with bending disabled; MuJoCo uses a 2D flex grid with edge equalities.
               * - ``deformable_cube_stack``
                 - 1,200 steps

                   Δt = 1 ms
                 - **Eight 0.3 m cubes**, stacked above a plane; six solver iterations.
                   Explicit arguments request resolution 4 and collision radius 0.04 m; the
                   shared spacing guard increases resolution to 5. RaiSim uses 784 surface
                   particles with internal struts, compliance 7.5 × 10⁻⁵ and effective collision
                   radius 0.06525 m. MuJoCo uses 1,000 volumetric flex particles, Young's modulus
                   50 kPa and radius 0.005 m; that run becomes unstable.

         Deformable rows compare these implementations and settings, without matching material
         response or solver accuracy. In particular, the cube stack uses different particle
         counts, masses, and collision radii. A timing ratio alone does not measure physical fidelity.

      .. tab:: Method

         .. container:: benchmark-table-block benchmark-table-environment

            .. list-table::
               :header-rows: 1
               :widths: 24 76

               * - Setting
                 - Recorded configuration
               * - Machine
                 - AMD Ryzen 9 3950X, 16 cores / 32 threads, 64 GB RAM; x86-64.
               * - System
                 - Ubuntu 26.04.1 LTS, Linux 7.0.0-38-generic.
               * - Run
                 - October 14, 2026; private development revision ``ded44a528`` with local
                   rendering fixes. Physics and benchmark sources match that revision.
               * - Builds
                 - Clang 20.1.8, C++20, ``Release``. RaiSim: ``-O3 -DNDEBUG -march=native
                   -mtune=native``; MuJoCo 3.13.0 built from source with ``-O3 -DNDEBUG -mavx``.
               * - Threading
                 - One thread, pinned to CPU 8 with ``taskset``; ``OMP_NUM_THREADS``,
                   ``OPENBLAS_NUM_THREADS``, ``MKL_NUM_THREADS``, and ``VECLIB_MAXIMUM_THREADS``
                   all set to 1. Benchmarks run serially, without rendering.
               * - Measurement
                 - Three calls per workload and backend. Median, minimum, and maximum of the
                   launcher's wall-clock duration, including construction, warmup, validation,
                   and the benchmark loop. Separate query-only timings appear in the downloadable
                   results for ``primitive_ray_scaling``. Speedups use unrounded medians.
               * - Arguments
                 - Default launcher arguments for ten workloads; explicit eight-cube arguments
                   below replace the launcher's one-cube, 20-step quick check. Exact arguments
                   for every row are in the downloadable JSON.

         **Private comparison suite.** The launcher and MuJoCo backend are maintained in the
         engine repository and are not targets in ``raisim2Lib``. The recorded commands are:

         .. code-block:: bash

            export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1
            taskset -c 8 ./build-benchmark/benchmark/benchmarks --backend=both --repeat 3 \
                -b chain10_speed -b chain20_speed -b anymal_standing -b anymal_falling \
                -b heightmap_anymal_speed -b primitive_speed -b strandbeest \
                -b heightmap_lidar -b primitive_ray_scaling -b deformable_cloth \
                --report --report-dir /tmp/raisim-benchmark-report
            taskset -c 8 ./build-benchmark/benchmark/benchmarks --backend=both --repeat 3 \
                -b deformable_cube_stack --report --report-dir /tmp/raisim-cube-stack-report \
                -- --cubes=8 --resolution=4 --steps=1200 --iterations=6 --collision-radius=0.04

         **Measure the distributed package.** Build the public timing examples from
         ``raisim2Lib`` and repeat your chosen run at least three times:

         .. code-block:: bash

            cmake -S . -B build-examples -DCMAKE_BUILD_TYPE=Release -DRAISIM_EXAMPLE=ON
            cmake --build build-examples --target anymal_standing_benchmark \
                articulated_system_benchmark --parallel 12
            OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 \
                ./build-examples/examples/anymal_standing_benchmark --steps=1000000

         On Windows, build with ``--config Release`` and run
         ``build-examples\bin\anymal_standing_benchmark.exe``. These public examples time RaiSim
         only, using their own scenes; they do not reproduce the private comparisons. Keep the
         package version, scene, timestep, step count, and machine fixed. See :doc:`BuildAndTest`
         for other timing examples.

Scene illustrations
===================

.. container:: benchmark-table-block benchmark-scene-gallery

   .. list-table::
      :widths: 50 50

      * - **Chain, 10 links**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_chain10.png
             :width: 100%
             :alt: Ten-link spring chain curling upward.
        - **Chain, 20 links**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_chain20.png
             :width: 100%
             :alt: Twenty-link spring chain curling upward.
      * - **ANYmal standing**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_anymal_standing.png
             :width: 100%
             :alt: ANYmal standing on flat ground.
        - **ANYmal falling**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_anymal_falling.png
             :width: 100%
             :alt: ANYmal falling freely above a reference floor.
      * - **ANYmal on terrain**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_heightmap_anymal.png
             :width: 100%
             :alt: ANYmal standing on fractal terrain.
        - **Rigid primitives**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_primitive_speed.png
             :width: 100%
             :alt: Sixteen boxes and sixteen spheres on a ground plane.
      * - **Strandbeest**

          .. image:: ../../rsc/docs/image/rayrai/constraints_strandbeest.png
             :width: 100%
             :alt: Twelve-legged Strandbeest walking linkage.
        - **Heightmap LiDAR**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_heightmap_lidar.png
             :width: 100%
             :alt: ANYmal C on fractal terrain, with green LiDAR hit points and sample rays.
      * - **Primitive ray scaling**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_primitive_ray_scaling.png
             :width: 100%
             :alt: A field of 10,000 spheres, boxes, capsules and cylinders, with green hit rays and red miss rays.
        - **Deformable cloth**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_deformable_cloth.png
             :width: 100%
             :alt: A 32 by 32 particle cloth draping over a static sphere above a ground plane.
      * - **Deformable cube stack**

          .. image:: ../../rsc/docs/image/rayrai/benchmark_deformable_cube_stack.png
             :width: 100%
             :alt: Eight deformable cubes falling into contact on a ground plane.
        -

Images show the RaiSim setups. The chain, falling robot, and primitive ray field have a floor
only for visual reference. Green LiDAR points are recorded terrain hits; colored ray segments
illustrate hits and misses without changing the benchmark's collision geometry.
