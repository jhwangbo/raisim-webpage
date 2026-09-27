###############
Example targets
###############

Examples
========
Rayrai examples are documented in :doc:`Examples <../Examples>`. Each example
page includes a short explanation, CMake target, and build-tree usage.

Quick map to the current rayrai-related targets:

* ``rayrai_tcp_viewer``: source-built viewer for ``raisim::RaisimServer``
  scenes.
* ``rayrai_basic_scene``: minimal ImGui + SDL2 app that loads Go1 on a
  checkerboard ground and runs the standard update loop.
* ``rayrai_complete_showcase``: broad in-process scene with a sensored ANYmal
  that combines RGB/depth cameras, raw buffer readback, LiDAR visualization,
  camera frustums, instancing, and custom visuals.
* ``rayrai_rgb_camera`` / ``rayrai_depth_camera`` /
  ``rayrai_heightmap_replacement`` /
  ``rayrai_lidar_pointcloud`` / ``rayrai_aruco_marker``: robot-attached sensor
  rendering, deleted-heightmap depth visualization, depth readback,
  point-cloud visualization, and marker rendering.
* ``rayrai_custom_visuals`` / ``rayrai_instancing_grid`` /
  ``rayrai_pointcloud_animation``: visual primitives, instancing, and dynamic
  point-cloud streaming.
* ``rayrai_pbr_material_grid`` / ``rayrai_pbr_texture_maps`` /
  ``rayrai_quality_lighting``: bundled glTF PBR sample assets, texture maps,
  HDR image-based lighting, quality presets, and additional-light
  configurations.
* ``rayrai_nested_glass``: nested water, glass, and air with automatic geometry tracing; see
  :doc:`../examples/rayrai/rayrai_nested_glass`.
* ``rayrai_visual_asset_support``: textured URDF visual meshes (OBJ/DAE with
  image textures) rendered separately from their collision geometry.
* ``rayrai_coacd_mesh_approximation``: in-process comparison of source meshes
  and CoACD convex approximation parts generated through ``World::addMesh``.
* ``rayrai_runtime_scene_editing``: snapshots, cloning, removal, stable object
  ids, and collision-filter changes in a running world.
* ``rayrai_rolling_spinning_friction`` / ``rayrai_swept_ccd``: physics-focused
  scenes that visualize rolling/spinning friction and swept CCD.
* ``rayrai_tendons``: automatic spatial tendon rendering for the elastic,
  pulley, and coupling scenes; see :doc:`../tendons/Examples`.
* ``rayrai_forest``: dense instanced vegetation on a heightmap with automatic
  mesh LOD, foliage wind and shadows, and asynchronous loading; see
  :doc:`../examples/rayrai/rayrai_forest`.
* glTF/GLB scene import with authored lights and reflection-probe sidecars is
  described in :doc:`../examples/rayrai/rayrai_blender_scene_import`.
* OpenUSD visual meshes can be loaded through ``RayraiWindow::addVisualMesh``;
  see :doc:`../OpenUSD` for importer scope and runtime layout.
