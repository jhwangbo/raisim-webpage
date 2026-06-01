#############################
Examples
#############################

Overview
========
The RaiSim binary distribution ships runnable C++ examples and rayrai tools.
Use the ``example_*`` executables to exercise RaiSim physics APIs, mesh
import/export, OpenUSD mesh loading, and PBR rayrai asset inspection. Use
``rayrai_raisim_tcp_viewer`` to inspect applications that publish a
``raisim::World`` through ``raisim::RaisimServer``. RaisimUnity and
RaisimUnreal are no longer supported.

.. image:: ../image/examples_overview.png
   :alt: Overview of RaiSim and rayrai examples
   :width: 100%

.. toctree::
   :hidden:

   examples/overview
   examples/current/rayrai_coacd_mesh_approximation

Run
===
Run examples from the installed package ``bin`` directory:

.. code-block:: bash

    <raisim-install>/bin/example_anymal_contacts
    <raisim-install>/bin/example_rayrai_pbr_asset_inspector

On Windows, use the ``.exe`` executable from the installed package ``bin``
directory:

.. code-block:: powershell

    C:\path\to\raisim\bin\example_anymal_contacts.exe

If the runtime loader cannot find shared libraries, use the platform-specific
environment setup before running examples:

.. code-block:: bash

    source /path/to/raisim2Lib/raisim_env.sh

This script sets ``LD_LIBRARY_PATH`` on Linux and ``DYLD_LIBRARY_PATH`` on macOS.

.. code-block:: powershell

    .\raisim_env.ps1

.. code-block:: batch

    raisim_env.bat

Visualization modes
===================
There are two visualization paths. See :doc:`Visualization` for the
full workflow comparison.

RaisimServer examples
---------------------
``example_anymal_contacts`` and ``example_atlas_contacts`` create a RaiSim world
and publish it through ``raisim::RaisimServer``. They do not open a renderer
window themselves. Start ``rayrai_raisim_tcp_viewer``, then run the example:

.. code-block:: bash

    # Terminal 1
    <raisim-install>/bin/rayrai_raisim_tcp_viewer

    # Terminal 2
    <raisim-install>/bin/example_anymal_contacts

The default server port is ``8080`` unless the example changes it. Use this
path when you want to inspect the same simulation data that a normal
RaisimServer application publishes.

Rayrai examples
---------------
Examples such as ``example_polyhaven_blue_wall`` and
``example_rayrai_pbr_asset_inspector`` create or use a
``raisin::RayraiWindow`` directly and render in process. They do not need the
TCP viewer:

.. code-block:: bash

    <raisim-install>/bin/example_rayrai_pbr_asset_inspector

Prefer these examples when you need camera images, GPU/offscreen rendering, PBR
materials, glTF visual import, or standalone rayrai feature inspection. USD
visual meshes can also be loaded through ``RayraiWindow::addVisualMesh``; see
:doc:`OpenUSD` for the importer scope.

Non-visual examples
-------------------
Some examples are intended to print output or create files rather than show a
window. ``example_model_asset_pipeline`` writes preprocessed and exported OBJ
files to ``/tmp/raisim_model_asset_pipeline_example``.

Example layout
==============
The installed package groups examples by executable behavior:

.. list-table::
   :header-rows: 1
   :widths: 32 68

   * - Group
     - Purpose
   * - ``example_*``
     - Installed examples for RaiSim physics, mesh import/export, OpenUSD mesh
       loading, and rayrai asset inspection.
   * - ``rayrai_*``
     - rayrai tools and standalone renderer examples.
   * - Server examples
     - Examples that publish a world through ``RaisimServer`` and are viewed
       with ``rayrai_raisim_tcp_viewer``.

Choosing an example
===================
Start with these targets when learning a specific feature:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Target
     - Demonstrates
   * - ``example_anymal_contacts``
     - ANYmal standing on ground with PD gains and RaisimServer publishing.
   * - ``example_atlas_contacts``
     - Atlas contact simulation with a small timestep and RaisimServer
       publishing.
   * - ``example_model_asset_pipeline``
     - Mesh preprocessing, content-hash cache reuse, ``addMesh`` with processed
       assets, and OBJ export from a world.
   * - ``shadow_hand_usd_cube``
     - Loading an OpenUSD ShadowHand scene through ``World(shadow_hand.usd)``
       with a textured cube visual and publishing it through ``RaisimServer``.
   * - ``nvidia_usd_robots``
     - Loading vetted NVIDIA Isaac Sim robot USD scenes through the ``World``
       constructor and publishing them through ``RaisimServer``.
   * - ``example_polyhaven_blue_wall``
     - Importing a Poly Haven glTF scene with HDR IBL, imported lights,
       reflection probes, and screenshot command-line options.
   * - ``example_rayrai_pbr_asset_inspector``
     - Inspecting bundled glTF PBR sample assets under rayrai quality settings.
   * - ``rayrai_coacd_mesh_approximation``
     - Visually comparing original meshes and CoACD convex approximation
       parts generated through ``World::addMesh``.
   * - ``rayrai_feature_showcase``
     - Offscreen image generation for rayrai features, including full scene,
       depth of field, depth plane, deformables, PBR maps, and HDR IBL.
   * - ``rayrai_quality_comparison``
     - Preset comparison images and quality reports for rayrai rendering.
   * - ``rayrai_benchmark``
     - Rendering, readback, scene-sync, and TCP serialization benchmarks.
   * - ``rayrai_complete_showcase_benchmark``
     - Timed Anymal sensor-showcase benchmark with optional readback,
       visualization startup, startup profiling, and PBR world materials.
   * - ``rayrai_pbr_first_draw_benchmark``
     - First-draw and warm-frame benchmark for full PBR and core-eligible PBR
       shader-material paths.
   * - ``rayrai_raisim_tcp_viewer``
     - The TCP visualizer used by RaisimServer examples.

Runtime assets
==============
Some targets depend on bundled assets or platform runtime packages:

* OpenUSD loading uses the package's bundled OpenUSD runtime and USD files; keep
  the ``openusd`` runtime directory and ``rsc`` assets with the installed
  package. OpenUSD examples are skipped by CMake only when the selected RaiSim
  package is too old to expose USD scene loading.
* Rayrai examples require SDL2/OpenGL and rayrai runtime libraries.
* Poly Haven and PBR asset examples require the corresponding assets under
  ``rsc``.

List available examples by inspecting the installed package ``bin`` directory:

.. code-block:: bash

    ls <raisim-install>/bin

Current Package Examples
========================

.. toctree::
   :maxdepth: 1

   examples/current/example_anymal_contacts
   examples/current/example_atlas_contacts
   examples/current/granular_media

Benchmark Examples
==================

.. toctree::
   :maxdepth: 1

   examples/benchmark/articulated_system_benchmark
   examples/benchmark/anymal_standing_benchmark

Rayrai Tools And Examples
=========================

.. toctree::
   :maxdepth: 1

   examples/current/rayrai_raisim_tcp_viewer
   examples/current/rayrai_quality_comparison
   examples/current/rayrai_benchmark
   examples/current/rayrai_complete_showcase_benchmark
   examples/current/rayrai_pbr_first_draw_benchmark
   examples/rayrai/rayrai_basic_scene
   examples/rayrai/rayrai_complete_showcase
   examples/rayrai/rayrai_blender_scene_import
   examples/rayrai/rayrai_rgb_camera
   examples/rayrai/rayrai_depth_camera
   examples/rayrai/rayrai_lidar_pointcloud
   examples/rayrai/rayrai_aruco_marker
   examples/rayrai/rayrai_custom_visuals
   examples/rayrai/rayrai_instancing_grid
   examples/rayrai/rayrai_pointcloud_animation
   examples/rayrai/rayrai_pbr_material_grid
   examples/rayrai/rayrai_pbr_texture_maps
   examples/rayrai/rayrai_quality_lighting
   examples/rayrai/rayrai_visual_asset_support
   examples/rayrai/rayrai_coacd_mesh_approximation
   examples/rayrai/rayrai_runtime_scene_editing
   examples/rayrai/rayrai_rolling_spinning_friction
   examples/rayrai/rayrai_swept_ccd
   examples/rayrai/rayrai_feature_showcase
   examples/rayrai/rayrai_tcp_viewer

Server Examples
===============

.. toctree::
   :maxdepth: 1

   examples/server/compound_object
   examples/server/deformable_objects
   examples/server/dynamic_heightmap
   examples/server/dynamic_object_addition
   examples/server/dzhanibekov_effect
   examples/server/granular_media
   examples/server/heightmap_from_png
   examples/server/inverse_dynamics
   examples/server/kinematic_platform
   examples/server/length_constraints_newtons_cradle
   examples/server/material_restitution
   examples/server/material_static_friction
   examples/server/mesh_stack
   examples/server/minitaur_pd
   examples/server/mjcf_gymnasium_hopper
   examples/server/mjcf_gymnasium_humanoid
   examples/server/mjcf_gymnasium_walker2d
   examples/server/model_asset_pipeline
   examples/server/nvidia_usd_robots
   examples/server/object_lifecycle_stress
   examples/server/primitive_grid
   examples/server/procedural_heightmap
   examples/server/ray_casting
   examples/server/ray_scan_lidar
   examples/server/sphere_drop
   examples/server/spring_damper_joints
   examples/server/shadow_hand_usd_cube
   examples/server/templated_tracked_robot
   examples/server/visual_objects_showcase
   examples/server/wheeled_robot_force_control
   examples/server/ycb_objects
   examples/worlds/anymal_pair
   examples/worlds/atlas
   examples/worlds/hill1_heightmap
   examples/worlds/kinova_arm
   examples/worlds/lake1_heightmap
   examples/worlds/mountain1_heightmap
   examples/worlds/office1_scene

XML Examples
============

.. toctree::
   :maxdepth: 1

   examples/xml/xml_templated_world
   examples/xml/xml_world_loader
