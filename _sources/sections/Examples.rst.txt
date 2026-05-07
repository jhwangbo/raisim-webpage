#############################
Examples
#############################

Overview
========
The RaiSim source package builds runnable C++ examples and rayrai tools. Use
server examples such as ``primitive_grid`` to exercise RaiSim physics APIs and
``rayrai_*`` examples for in-process rendering, sensors, PBR assets, and rayrai
tools. Use ``rayrai_tcp_viewer`` to inspect applications that publish a
``raisim::World`` through ``raisim::RaisimServer``. RaisimUnity and
RaisimUnreal are no longer supported.

.. image:: ../image/examples_overview.png
   :alt: Overview of RaiSim and rayrai examples
   :width: 100%

Build
=====
Build examples from the ``raisim2Lib`` root. Source the environment first so
both RaiSim and rayrai shared libraries are visible:

.. code-block:: bash

    source ./raisim_env.sh
    cmake -S . -B build \
      -DRAISIM_EXAMPLE=ON \
      -DRAISIM_PY=ON
    cmake --build build -j

``RAISIM_EXAMPLE`` is enabled by default. ``RAISIM_PY`` is disabled by default,
so enable it when you want ``raisimPy``.

Run
===
Run examples from the build tree:

.. code-block:: bash

    source ./raisim_env.sh
    ./build/examples/primitive_grid
    ./build/examples/rayrai_basic_scene

On Windows, use the ``.exe`` executable from the build tree:

.. code-block:: powershell

    .\build\examples\Release\primitive_grid.exe

If the runtime loader cannot find shared libraries, use the platform-specific
environment setup before running examples:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh

This script sets ``LD_LIBRARY_PATH`` on Linux and ``DYLD_LIBRARY_PATH`` on macOS.

.. code-block:: batch

    raisim_env.bat

Visualization modes
===================
There are two visualization paths. See :doc:`Visualization` for the
full workflow comparison.

RaisimServer examples
---------------------
Server examples such as ``primitive_grid`` and ``atlas`` create a RaiSim world
and publish it through ``raisim::RaisimServer``. They do not open a renderer
window themselves. Start the rayrai TCP viewer in one sourced terminal, then run
the example in another sourced terminal:

.. code-block:: bash

    # Terminal 1
    source ./raisim_env.sh
    ./build/examples/rayrai_tcp_viewer

    # Terminal 2
    source ./raisim_env.sh
    ./build/examples/primitive_grid

The default server port is ``8080`` unless the example changes it. Use this
path when you want to inspect the same simulation data that a normal
RaisimServer application publishes.

Rayrai examples
---------------
Examples such as ``rayrai_basic_scene``, ``rayrai_complete_showcase``,
``rayrai_pbr_material_grid``, and ``rayrai_pbr_texture_maps`` create or use a
``raisin::RayraiWindow`` directly and render in process. They do not need the
TCP viewer:

.. code-block:: bash

    source ./raisim_env.sh
    ./build/examples/rayrai_basic_scene

Prefer these examples when you need camera images, GPU/offscreen rendering, PBR
materials, glTF visual import, or standalone rayrai feature inspection.

Non-visual examples
-------------------
Some examples are intended to print output or create files rather than show a
window. ``object_lifecycle_stress`` runs headless, and
``model_asset_pipeline`` writes preprocessed and exported mesh assets when the
installed RaiSim package exposes the asset-pipeline APIs.

Example layout
==============
The build groups examples by executable behavior:

.. list-table::
   :header-rows: 1
   :widths: 32 68

   * - Group
     - Purpose
   * - Server examples
     - Examples that publish a world through ``RaisimServer`` and are viewed
       with ``rayrai_tcp_viewer``.
   * - ``rayrai_*``
     - rayrai tools and standalone renderer examples.
   * - Benchmarks
     - Timing-oriented examples such as ``anymal_standing_benchmark``.

Choosing an example
===================
Start with these targets when learning a specific feature:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Target
     - Demonstrates
   * - ``primitive_grid``
     - Basic server-side simulation and visualization.
   * - ``atlas``
     - Atlas contact simulation with RaisimServer publishing.
   * - ``model_asset_pipeline``
     - Mesh preprocessing, content-hash cache reuse, ``addMesh`` with processed
       assets, and OBJ export from a world.
   * - ``rayrai_basic_scene``
     - Minimal in-process rayrai rendering.
   * - ``rayrai_complete_showcase``
     - Broad rayrai feature overview with sensors and visuals.
   * - ``rayrai_pbr_material_grid``
     - Inspecting bundled glTF PBR sample assets under rayrai lighting.
   * - ``rayrai_pbr_texture_maps``
     - PBR texture-map import and material inspection.
   * - ``rayrai_coacd_mesh_approximation``
     - Visually comparing original meshes and convexified collision modes
       generated through ``World::addMesh``.
   * - ``rayrai_tcp_viewer``
     - The TCP visualizer used by RaisimServer examples.

Optional targets
================
Some targets depend on optional assets or platform packages:

* Rayrai examples require SDL2/OpenGL and rayrai runtime libraries.
* PBR asset examples require the corresponding assets under ``rsc``.

List available examples by inspecting the build tree:

.. code-block:: bash

    ls build/examples

Rayrai Tools
============

.. toctree::
   :maxdepth: 1

   examples/rayrai/rayrai_tcp_viewer

Server Examples
===============

.. toctree::
   :maxdepth: 1

   examples/server/compound_object
   examples/server/deformable_objects
   examples/server/dynamic_heightmap_unreal
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
   examples/server/object_lifecycle_stress
   examples/server/primitive_grid
   examples/server/procedural_heightmap
   examples/server/ray_casting
   examples/server/ray_scan_lidar
   examples/server/spring_damper_joints
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

Rayrai Example Gallery
======================

.. toctree::
   :maxdepth: 1

   examples/rayrai/rayrai_aruco_marker
   examples/rayrai/rayrai_basic_scene
   examples/rayrai/rayrai_blender_scene_import
   examples/rayrai/rayrai_coacd_mesh_approximation
   examples/rayrai/rayrai_complete_showcase
   examples/rayrai/rayrai_custom_visuals
   examples/rayrai/rayrai_depth_camera
   examples/rayrai/rayrai_feature_showcase
   examples/rayrai/rayrai_instancing_grid
   examples/rayrai/rayrai_lidar_pointcloud
   examples/rayrai/rayrai_pbr_material_grid
   examples/rayrai/rayrai_pbr_texture_maps
   examples/rayrai/rayrai_pointcloud_animation
   examples/rayrai/rayrai_quality_lighting
   examples/rayrai/rayrai_rgb_camera
   examples/rayrai/rayrai_runtime_scene_editing
   examples/rayrai/rayrai_swept_ccd
   examples/rayrai/rayrai_tcp_viewer
   examples/rayrai/rayrai_visual_asset_support
