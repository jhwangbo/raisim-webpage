###############
Example targets
###############

Examples
========
Rayrai examples are documented in :doc:`Examples <Examples>`. Each example
page includes a short explanation, CMake target, and build-tree usage.

Quick map to the current rayrai-related targets:

* ``rayrai_tcp_viewer``: source-built example target corresponding to the
  packaged ``rayrai_raisim_tcp_viewer`` tool for ``raisim::RaisimServer``
  scenes.
* ``rayrai_basic_scene``: minimal ImGui + SDL2 app showing the standard update
  loop, custom visuals, and the offscreen render texture.
* ``rayrai_complete_showcase``: broad in-process scene that combines RGB/depth
  cameras, raw buffer readback, LiDAR visualization, camera frustums, and
  custom visuals.
* ``rayrai_rgb_camera`` / ``rayrai_depth_camera`` /
  ``rayrai_lidar_pointcloud`` / ``rayrai_aruco_marker``: robot-attached sensor
  rendering, depth readback, point-cloud visualization, and marker rendering.
* ``rayrai_custom_visuals`` / ``rayrai_instancing_grid`` /
  ``rayrai_pointcloud_animation``: visual primitives, instancing, and dynamic
  point-cloud streaming.
* ``rayrai_pbr_material_grid`` / ``rayrai_pbr_texture_maps`` /
  ``rayrai_quality_lighting``: PBR materials, texture slots, quality presets,
  and additional-light configurations.
* ``rayrai_visual_asset_support``: authored glTF/GLB scene import with PBR
  materials, embedded lights, and reflection-probe sidecars.
* ``rayrai_coacd_mesh_approximation``: in-process comparison of source meshes
  and CoACD convex approximation parts generated through ``World::addMesh``.
* ``rayrai_runtime_scene_editing``: runtime add/remove of RaiSim objects and
  rayrai visuals with stable ids, snapshots, collision filters, and cloning.
* ``rayrai_rolling_spinning_friction`` / ``rayrai_swept_ccd``: physics-focused
  scenes that visualize rolling/spinning friction and swept CCD.
* ``rayrai_pbr_material_grid`` and ``rayrai_pbr_texture_maps``: bundled glTF
  PBR sample assets under rayrai quality settings.
* OpenUSD visual meshes can be loaded through ``RayraiWindow::addVisualMesh``;
  see :doc:`../OpenUSD` for importer scope and runtime layout.
* ``rayrai_visual_asset_support``: glTF/GLB scene import with imported lights,
  HDR IBL, optional reflection probes, and screenshots.
