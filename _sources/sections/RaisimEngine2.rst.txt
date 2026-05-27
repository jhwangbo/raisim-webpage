#############################
RaiSim Engine 2
#############################

``raisim_engine2`` is a source-tree world authoring layer for RaiSim and
rayrai scenes. It is intended to create, validate, preview, and instantiate
``.rscene`` files. It is not an RL training framework; use
:doc:`RaisimGymTorch` for training workloads and use Engine 2 to prepare scenes
or XML-compatible assets for those workflows.

Availability
============

Engine 2 is built from the source tree when ``RAISIM_ENGINE2=ON``. The root
CMake option is enabled by default, and the subproject exposes these targets:

.. list-table::
   :header-rows: 1
   :widths: 34 66

   * - Target
     - Purpose
   * - ``raisim_engine2_cli``
     - Builds the ``raisim_engine2`` command-line scene loader, saver,
       validator, demo generator, and instantiation checker.
   * - ``raisim_engine2_headless``
     - Loads an ``.rscene`` file, instantiates it into ``raisim::World``, and
       optionally steps the simulation without opening a window.
   * - ``raisim_engine2_app``
     - Builds the ``raisim_engine2_editor`` ImGui/rayrai editor when the
       ``rayrai`` target and GUI dependencies are available.
   * - ``raisim_engine2_benchmark``
     - Runs Engine 2 scene, terrain, edit, runtime, asset, and project
       authoring benchmarks.

On Linux and macOS, source-tree binaries are emitted below the CMake subdirectory
that defines them, for example ``./build-release/raisim_engine2/raisim_engine2``.
On Windows, use ``<build-dir>/bin``.

Scene Model
===========

The ``.rscene`` format stores a scene tree rooted at ``/World`` plus the authoring
resources needed to instantiate that scene. The current model includes:

* assets, materials, primitive bodies, meshes, articulated systems, compounds,
  deformables, granular systems, terrain regions, and wire constraints;
* lights, cameras, sensors, point clouds, coordinate frames, instanced visuals,
  projected decals, irradiance volumes, reflection probes, and local fog;
* environment, sky, render-quality, terrain-brush, snapping, editor UX, and
  render-bake settings;
* mesh import metadata, material remaps, generated collision settings, and
  project metadata for ``.rscene`` files under a project directory.

Godot and glTF assets are Y-up, while RaiSim/rayrai scenes are authored Z-up.
Use the import settings for Godot/Y-up assets so Engine 2 applies the right-handed
conversion ``p_raisim = (x_godot, -z_godot, y_godot)`` to the imported local basis.

Command-Line Workflow
=====================

Generate, validate, save, and instantiate-check scenes with the CLI:

.. code-block:: bash

    ./build-release/raisim_engine2/raisim_engine2 \
      --demo /tmp/engine2_demo.rscene \
      --validate

    ./build-release/raisim_engine2/raisim_engine2 \
      --load raisim_engine2/examples/warehouse_scene.rscene \
      --save /tmp/warehouse.rscene \
      --validate \
      --instantiate-check

The CLI accepts ``--load``, ``--save``, ``--demo``, ``--script``,
``--validate``, and ``--instantiate-check``. ``--script`` runs a ``.re2``
authoring script against the in-memory document before any subsequent
``--save``/``--validate``/``--instantiate-check`` steps.

For no-window smoke tests or CI checks, use the headless runner:

.. code-block:: bash

    ./build-release/raisim_engine2/raisim_engine2_headless \
      --load /tmp/warehouse.rscene \
      --validate \
      --steps 120 \
      --dt 0.0025

The headless runner accepts ``--load`` or ``--script`` for the scene source plus
``--validate``, ``--steps``, and ``--dt``. It instantiates the scene into
``raisim::World`` and reports object, sensor, step, and world-time counts.

Editor Workflow
===============

When rayrai is available, ``raisim_engine2_app`` produces the
``raisim_engine2_editor`` executable. The editor uses a Godot-derived dock layout
with Scene and FileSystem docks on the left, a rayrai 3D viewport in the center,
Inspector and Node docks on the right, and Output/Debugger docks at the bottom.
It can create scenes from built-in templates and imported demo scenes.

.. code-block:: bash

    ./build-release/raisim_engine2/raisim_engine2_editor \
      --scene raisim_engine2/examples/warehouse_scene.rscene

    ./build-release/raisim_engine2/raisim_engine2_editor \
      --script raisim_engine2/examples/warehouse_scene.re2

The editor accepts ``--scene``, ``--script``, ``--save``, ``--headless``,
``--validate``, ``--instantiate-check``,
``--quality fast|balanced|high|ultra``, ``--width``, and ``--height``.
Either ``--scene`` (load an ``.rscene`` file) or ``--script`` (run a ``.re2``
authoring script) selects the starting document; if neither is given, the
editor opens an empty starter scene.

Rayrai Bridge
=============

The optional ``raisim_engine2_rayrai`` bridge applies an Engine 2 scene to a
``raisin::RayraiWindow``. It maps authored visuals, lights, reflection probes,
local fog volumes, projected decals, irradiance volumes, point clouds,
coordinate frames, instanced visuals, terrain foliage/splat layers, sensors,
material overrides, imported scene lights, environment/weather sidecars,
ground/heightmap patterns, and render-quality settings. The bridge reports what
was applied through ``raisim_engine2::RayraiApplyReport``.

Use Engine 2 for authoring and inspection. Use ordinary RaiSim APIs,
``RaisimServer`` + ``rayrai_raisim_tcp_viewer``, or in-process
``raisin::RayraiWindow`` code for runtime applications that do not need the
editor/document layer.

Validation And Tests
====================

Relevant source-tree checks are registered as CTest targets whose names begin
with ``raisim_engine2_``. Run them with the same test worker count used for the
rest of RaiSim:

.. code-block:: bash

    ctest --test-dir build-release -R '^raisim_engine2_' -j12 --output-on-failure

Run the Engine 2 benchmark on one thread when collecting timing numbers:

.. code-block:: bash

    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      ./build-release/raisim_engine2/raisim_engine2_benchmark
