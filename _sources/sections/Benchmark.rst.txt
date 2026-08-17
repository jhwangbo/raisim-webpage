#############################
Benchmark
#############################

This page reports representative timing comparisons between RaiSim and another
widely used multi-body physics engine (MuJoCo) on articulated-dynamics
workloads, and documents the environment in enough detail to reproduce the
numbers. For general tuning guidance, see :doc:`Performance`.

Environment
===========

All numbers on this page were collected on a single machine with the following
configuration.

.. container:: benchmark-table-block benchmark-table-environment

   .. list-table::
      :header-rows: 1
      :widths: 26 74

      * - Component
        - Detail
      * - Machine
        - Apple MacBook Air (``MacBookAir10,1``), Apple M1 SoC, 8 CPU cores
          (4 performance + 4 efficiency), 8 GB unified memory.
      * - Operating system
        - macOS 26.5.1 (build ``25F80``), arm64.
      * - Compiler
        - Apple Clang 21.0.0 (Xcode toolchain), C++20, target ``arm64-apple-darwin``.
      * - Benchmark run
        - August 7, 2026, from clean RaiSim revision
          ``84f7ad114f890aa31ca5255e5481393d61830895``
          (``v0.4.1-1136-g84f7ad11``).
      * - RaiSim build
        - Current optimized RaiSim build, ``CMAKE_BUILD_TYPE=Release``
          (``-O3 -DNDEBUG``) with ``-mcpu=apple-m1``.
      * - MuJoCo build
        - MuJoCo 3.4.1, compiled from source as part of the benchmark suite
          (same compiler and ``Release`` flags).
      * - Threading
        - Single threaded. Both engines run the simulation loop on one core; no
          multi-threading or SIMD batching across bodies is used.
          ``OMP_NUM_THREADS``, ``OPENBLAS_NUM_THREADS``, ``MKL_NUM_THREADS``,
          and ``VECLIB_MAXIMUM_THREADS`` were all set to 1.
      * - Metric
        - Wall-clock seconds for the timed simulation loop of each scene (scene
          construction is excluded). Lower is better; ``Speedup (R/M)`` is the
          MuJoCo time divided by the RaiSim time.
      * - Settings
        - Each benchmark/backend pair was run three times with its default
          arguments (the per-benchmark step counts listed below). The table and
          charts report the median; the table also shows the minimum and maximum.
          The RaiSim and MuJoCo variants use matching scene parameters and the
          same integration timestep, so the two engines simulate equivalent scenes.

Build the benchmark binary
==========================

From the RaiSim source tree, configure a ``Release`` build with the benchmark
suite and the MuJoCo comparison enabled, then build the ``benchmarks`` target:

.. code-block:: bash

   cmake -S . -B build-benchmark \
       -DCMAKE_BUILD_TYPE=Release \
       -DRAISIM_BENCHMARK=ON \
       -DRAISIM_MUJOCO_BENCHMARK=ON

   cmake --build build-benchmark --target benchmarks -j

This produces ``build-benchmark/benchmark/benchmarks``. ``RAISIM_MUJOCO_BENCHMARK``
fetches and builds MuJoCo from source, so the first configure/build is slower.

Run the comparison
==================

Run the six benchmarks below with both backends. ``--backend=both`` selects
RaiSim and MuJoCo, while ``--repeat 3`` runs every benchmark/backend pair three
times and reports the median, minimum, and maximum wall-clock time:

.. code-block:: bash

   ./build-benchmark/benchmark/benchmarks --backend=both --repeat 3 \
       -b chain20_speed -b heightmap_anymal_speed -b primitive_speed \
       -b chain10_speed -b anymal_standing -b anymal_falling

Each benchmark can also be run on its own, e.g.
``benchmarks --backend=both -b anymal_standing``. No extra arguments are needed;
the step counts in the table below are the built-in defaults.

What the benchmarks simulate
============================

Each scene is described below with its articulation (joint types and degrees of
freedom), its collision/contact content, the integration timestep, and the
number of simulation steps timed. "DOF" is the number of generalized velocity
coordinates the dynamics solves for. A floating base contributes 6 DOF
(3 translation + 3 rotation).

.. container:: benchmark-table-block benchmark-table-scenes

   .. list-table::
      :header-rows: 1
      :widths: 22 12 66

      * - Benchmark (``id``)
        - Steps
        - Scene details
      * - ``chain10_speed``
        - 100,000
        - One articulated chain with a **fixed base** and 10 links joined by
          **10 spherical joints** (3 DOF each) → **30 DOF**. Each joint has a
          spring-damper. **No collision geometry** (the link spheres are visual
          only), so there is **no contact** — this is pure articulated forward
          dynamics. Timestep 0.001 s.
      * - ``chain20_speed``
        - 100,000
        - Same as ``chain10_speed`` but 20 links and **20 spherical joints** →
          **60 DOF**. No collision, no contact. Timestep 0.001 s.
      * - ``anymal_standing``
        - 1,000,000
        - One ANYmal quadruped: **floating base + 12 revolute joints = 18 DOF**,
          under PD position control. It stands on a flat ground plane. ANYmal's
          collision geometry is primitive shapes (a trunk box plus cylinders and
          spheres on the legs); the four feet rest on the ground, giving about
          four persistent contacts. Friction coefficient 0.8, timestep 0.002 s.
      * - ``anymal_falling``
        - 100,000
        - The same ANYmal (**18 DOF**), but **no ground is added** — the robot
          falls freely under gravity. There is **no contact**, so this isolates
          floating-base articulated dynamics. Timestep 0.002 s.
      * - ``heightmap_anymal_speed``
        - 200,000
        - One ANYmal (**18 DOF**) on a procedurally generated **fractal
          height-map terrain** (20 m × 20 m, 100 × 100 samples, 3 fractal
          octaves). Contacts form between the feet and the terrain cells.
          Timestep 0.002 s.
      * - ``primitive_speed``
        - 100,000
        - **No articulated system.** 32 rigid bodies — 16 boxes (0.4 m cubes) and
          16 spheres (radius 0.15 m) — arranged in a 4 × 4 grid, each sphere
          stacked above a box, dropped onto a flat ground plane. Contacts are
          box–ground, sphere–box, and box–box primitive pairs. Timestep 0.002 s.

Results
=======

RaiSim is 2.59× to 6.23× faster than MuJoCo across these six workloads. The
charts below show both the median timings and the relative speedup.

.. container:: benchmark-graph-block

   .. figure:: ../image/benchmark_backend_times.svg
      :alt: Bar chart comparing median RaiSim and MuJoCo wall-clock times for the benchmark suite.
      :width: 100%

.. container:: benchmark-graph-block

   .. figure:: ../image/benchmark_speedup.svg
      :alt: Bar chart showing MuJoCo time divided by RaiSim time for each benchmark.
      :width: 100%

.. container:: benchmark-table-block benchmark-table-results

   .. list-table:: RaiSim vs MuJoCo (seconds; median with min–max in parentheses)
      :header-rows: 1
      :widths: 34 26 26 14

      * - Benchmark
        - RaiSim median (min–max)
        - MuJoCo median (min–max)
        - Speedup (R/M)
      * - Chain20 speed
        - 0.433 (0.433–0.434)
        - 2.697 (2.694–2.700)
        - 6.23×
      * - Heightmap ANYmal speed
        - 0.914 (0.913–0.916)
        - 4.346 (4.339–4.375)
        - 4.75×
      * - Primitive speed
        - 2.729 (2.664–2.744)
        - 10.904 (10.793–11.076)
        - 4.00×
      * - Chain10 speed
        - 0.214 (0.214–0.215)
        - 0.739 (0.739–0.742)
        - 3.46×
      * - ANYmal standing
        - 3.528 (3.515–3.560)
        - 10.969 (10.968–11.359)
        - 3.11×
      * - ANYmal falling
        - 0.171 (0.171–0.174)
        - 0.444 (0.444–0.449)
        - 2.59×

Absolute times depend on hardware, compiler, and scene configuration, so treat
them as relative magnitudes rather than fixed specifications.

Why RaiSim is faster here
=========================

RaiSim wins these benchmarks because it has better methods for articulated
systems. Its articulated-system dynamics and contact solver are designed
specifically for jointed mechanisms, so simulating chains, legged robots, and
other articulated systems is more efficient. Raisim has O(n) articulated system
solver that can even handle contact properties as well, whereas other physics engines
use O(n^3) solver due to inversion of mass matrix.
