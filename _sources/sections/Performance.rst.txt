#############################
Performance
#############################

This page is a practical tuning guide for users of the ``raisim2Lib`` binary
package workspace and for downstream applications linked against the downloaded
RaiSim and rayrai packages. For commands that build and run package examples,
see :doc:`BuildAndTest`.

Fast scenes usually come from three choices:

* keep collision geometry simple and intentional;
* avoid creating more contacts than the task needs;
* measure with timing-oriented package examples or your downstream workload on
  one thread before changing solver or modeling choices.

What Usually Costs Time
=======================

.. list-table::
   :header-rows: 1
   :widths: 24 38 38

   * - Cost center
     - What increases it
     - What to do first
   * - Broadphase collision detection
     - Many active collision bodies, large worlds, or dense moving object sets.
     - Use collision groups/masks and choose a broadphase that matches the scene.
       See :doc:`WorldSystem` and :doc:`CollisionDetection`.
   * - Narrowphase collision detection
     - Expensive shape pairs, dense mesh contact, or geometry that creates many
       candidate contacts.
     - Use primitives, height maps, simplified convex collision assets, or cached
       mesh preprocessing where possible. See :doc:`SingleBodyObjects`.
   * - Contact properties
     - Many articulated bodies touching many other bodies.
     - Remove unnecessary collision shapes and split non-interacting objects with
       collision masks.
   * - Contact solver
     - Stacks, pinched contacts, highly coupled contacts, or excessive contact
       manifolds.
     - Reduce redundant contacts before tuning solver iterations.
   * - Sensors
     - Large CPU depth images, many lidar rays, or high sensor update rates.
     - Use in-process rayrai for RGB/depth sensor images when rayrai is
       available. Lower CPU ray-query resolution/update rate only for headless
       fallback or deterministic physics-ray workloads. See :doc:`Sensors`.
   * - Visualization
     - Rendering in the simulation process, high-quality PBR settings, or
       synchronous screen capture.
     - Use ``RaisimServer`` + ``rayrai_tcp_viewer`` for debugging, and
       in-process rayrai only when the application needs rendered images. See
       :doc:`Visualization`.

Collision Modeling
==================

Collision geometry is often the largest performance lever. Visual meshes should
not automatically become collision meshes. Prefer this order:

1. primitive shapes for robot links and simple objects;
2. height maps for terrain;
3. preprocessed convex collision assets for irregular objects;
4. mesh collision only when the task really needs mesh-level contact.

Use ``World::addMesh`` preprocessing and cache reuse when a mesh collision asset
is needed repeatedly. For broadphase-heavy scenes, configure
``contact::BroadphaseType::MultiBoxPrune`` with bounds and cell sizes that match
the active world volume. For very small scenes or debugging, brute-force
broadphase can be useful, but it should not be the default assumption for large
worlds.

Contacts and Solver Work
========================

The contact solver cost depends on how coupled the contacts are. Ten isolated
contacts are very different from ten contacts in a compressed stack. Before
tuning solver parameters, check whether the model is generating contacts that do
not matter for the task:

* remove decorative collision bodies;
* simplify foot, gripper, and terrain collision geometry;
* avoid overlapping collision shapes in one body unless they are intentional;
* use collision groups and masks to skip pairs that should never interact;
* keep timesteps and material parameters within the stability range required by
  the task.

``World::setContactSolverParam`` exposes solver parameters for advanced users,
but it is usually a later step. Reducing redundant contacts tends to be more
robust than asking the solver to process a harder problem faster.

Sleeping Islands
================

Sleeping is enabled by default. RaiSim can skip simulation work for dynamic
islands whose velocities remain below the configured thresholds for a few steps.
This helps scenes with piles, props, or objects that settle and then stay quiet.

.. code-block:: cpp

  world.setSleepingEnabled(true);
  world.setSleepingParameters(/*linear*/ 0.002, /*angular*/ 0.01, /*quietSteps*/ 2);
  world.wakeAll();

Disable sleeping when every object must remain numerically active every step, or
when a benchmark is intended to measure the awake dynamics path. Use the
``island_sleep`` benchmark to quantify the effect for stack-like scenes.

Package Timing Examples
=======================

``raisim2Lib`` ships standalone timing-oriented examples for binary package
users. The RaiSim engine source tree has a separate unified benchmark runner
used by maintainers for release validation, but that runner is not available in
this workspace because ``raisim2Lib`` downloads RaiSim and rayrai as binary
packages. Build the public examples in Release mode and run timing commands on
one thread:

.. code-block:: bash

  cmake -S examples -B /tmp/raisim2lib-examples -DCMAKE_BUILD_TYPE=Release
  cmake --build /tmp/raisim2lib-examples \
      --target anymal_standing_benchmark articulated_system_benchmark \
               granular_media island_sleep_benchmark -j12
  OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      /tmp/raisim2lib-examples/anymal_standing_benchmark --fast
  OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      /tmp/raisim2lib-examples/articulated_system_benchmark
  OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      /tmp/raisim2lib-examples/island_sleep_benchmark --steps=12000

Installed binary packages can also provide these executables under
``<raisim-install>/bin``.

Representative timing examples include:

.. list-table::
   :header-rows: 1
   :widths: 36 64

   * - Executable
     - Use it for
   * - ``anymal_standing_benchmark``
     - Headless articulated robot contact scenario.
   * - ``articulated_system_benchmark``
     - Articulated-system stepping cost.
   * - ``granular_media``
     - Granular bed interaction with a robot model.
   * - ``island_sleep_benchmark``
     - Sleeping-island speedup and wake behavior.

For stable comparisons, run the same executable, package version, compiler,
build type, CPU governor, benchmark arguments, and repeat count. Run one timing
process at a time. Avoid comparing a visualized run against a headless run
unless visualization is the measured workload.

Threading and Determinism
=========================

RaiSim simulation performance should be measured on one simulation thread unless
the experiment explicitly studies external parallelism. Running many worlds in
parallel is an application-level design choice; it is different from changing the
deterministic stepping behavior of one ``raisim::World``.

``World::setContactSolverIterationOrder(order)`` sets the starting sweep
direction for the next contact solve. The solver flips the stored direction
after each solve, so reset it before each measured step only if the experiment
requires the same starting sweep every time. For reproducible benchmark numbers,
also control random seeds in the benchmark or application, keep visualization
disabled unless measured, and pin the same benchmark arguments.

Algorithm Background
====================

RaiSim uses an articulated-system dynamics path designed to avoid forming and
inverting a full mass matrix for ordinary forward dynamics. The practical effect
is that articulated dynamics without heavy contact work scales much better with
degrees of freedom than a pipeline that explicitly forms and factorizes the mass
matrix every step.

That does not make every simulation linear in model size. Collision detection,
contact generation, solver coupling, deformable bodies, granular media, sensors,
and rendering can dominate the wall time. Treat old headline kHz numbers as
historical context, not as a guarantee for a current scene. Measure the package
example or downstream application you actually run, with the compiler, hardware,
and build options in front of you.
