#############################
rayrai Visualizer
#############################

Overview
========
rayrai is an in-process C++ renderer for RaiSim. It renders into an offscreen OpenGL
texture and is designed to embed in custom UIs (ImGui, Qt, etc.) or headless pipelines.
RaisimUnity and RaisimUnreal are no longer supported; rayrai is the supported
visualization path. It runs inside the simulation process and exposes direct
access to render targets, picking, and custom visuals.

Key characteristics:

* In-process rendering (no server required)
* Offscreen textures for UI embedding or sensor simulation
* Lightweight scene management for RaiSim objects and custom visuals
* glTF/GLB visual-scene import with PBR materials, normal maps, and lights
* HDR image-based lighting, reflection probes, and real-time shadow maps
* Support for point clouds, coordinate frames, and picking
* Direct ImGui/SDL2 integration patterns and headless/offscreen workflows

The public API lives in the `raisin` namespace (note the spelling). The primary entry
point is ``raisin::RayraiWindow``.

Dependencies
============
rayrai depends on SDL2, OpenGL, glbinding, glm, assimp, stb, and imgui. The installed
package in ``rayrai/<OS>`` ships the headers and CMake config for these dependencies.

TCP Viewer
==========
For most users, the easiest way to use rayrai with ``RaisimServer`` examples is
the TCP viewer. Build it with the rest of the examples, source the environment,
and run it from the build tree:

.. code-block:: bash

    source ./raisim_env.sh
    cmake -S . -B build -DRAISIM_EXAMPLE=ON
    cmake --build build --target rayrai_tcp_viewer -j
    ./build/examples/rayrai_tcp_viewer

Run it with ``--help`` to see available options. On Windows, use the ``.exe``
binary. If you installed the build, run the copy from the configured install
prefix's ``bin`` directory. Source ``raisim_env.sh`` before running the viewer
or server example so both RaiSim and rayrai shared libraries are visible.

The TCP viewer overlay has two compact panels: the left ``Raisim TCP`` control/object
panel and the right selected-object details panel. Both panels have a small ``-``/``+``
button in the header to minimize or restore the panel. The left panel also auto-minimizes
when you click elsewhere in the viewer, leaving only the compact header visible.

Build and link
==============
rayrai installs a CMake package under ``rayrai/<OS>``. Add it to
``CMAKE_PREFIX_PATH`` and link the ``rayrai`` target.

.. code-block:: cmake

    find_package(rayrai CONFIG REQUIRED)

    add_executable(my_app main.cpp)
    target_link_libraries(my_app PRIVATE rayrai)

In practice, you will also set the Raisim prefix (for example, ``-DCMAKE_PREFIX_PATH``)
to include both ``raisim/<OS>`` and ``rayrai/<OS>``.

Minimal usage
=============
The typical workflow is:

1. Create a RaiSim world.
2. Construct a ``raisin::RayraiWindow`` for that world.
3. Update the renderer each frame and consume the output texture.

.. code-block:: cpp

    #include <memory>

    #include <raisim/World.hpp>
    #include <rayrai/RayraiWindow.hpp>

    int main() {
      auto world = std::make_shared<raisim::World>();
      raisin::RayraiWindow viewer(world, 1280, 720);

      auto sphere = viewer.addVisualSphere("goal", 0.2, 0.9f, 0.2f, 0.2f, 1.0f);
      sphere->setPosition(0.0, 0.0, 1.0);

      while (true) {
        world->integrate();
        viewer.update(1280, 720, false, 0, 0, false);
        unsigned int tex = viewer.getImageTexture();
        (void)tex; // use the texture in your UI or pipeline
      }
    }

If you are integrating with an existing OpenGL context, you can use
``RayraiWindow::createOffscreenGlContext`` and
``RayraiWindow::makeOffscreenContextCurrent`` to control the context setup.

Example: custom visuals + background color
==========================================
This example adds a custom box, renders an RGB texture each frame, and reads the
image texture handle for UI integration. New code should prefer explicit color-range
APIs such as ``setBackgroundColorRgb255`` or ``setBackgroundColorLinear``.

.. code-block:: cpp

    #include <memory>

    #include <raisim/World.hpp>
    #include <rayrai/RayraiWindow.hpp>

    int main() {
      auto world = std::make_shared<raisim::World>();
      world->addGround();

      raisin::RayraiWindow viewer(world, 1280, 720);
      viewer.setBackgroundColorRgb255({40, 45, 55, 255});

      auto box = viewer.addVisualBox("marker", 0.4, 0.2, 0.1, 0.9f, 0.6f, 0.1f, 1.0f);
      box->setPosition(1.0, 0.0, 0.3);

      while (true) {
        world->integrate();
        viewer.update(1280, 720, false, 0, 0, false);
        unsigned int colorTex = viewer.getImageTexture();
        (void)colorTex; // feed into your UI or pipeline
      }
    }

Color and gamma semantics
=========================
rayrai uses explicit color ranges for new APIs:

* ``Visuals::setColor`` and most object/material color factors use linear ``0..1`` RGBA.
* ``Camera::setBackgroundColorRgb255`` and ``RayraiWindow::setBackgroundColorRgb255``
  use legacy ``0..255`` RGBA. ``setBackgroundColor`` is kept as a compatibility wrapper
  for the same ``0..255`` range.
* ``setBackgroundColorLinear`` accepts linear ``0..1`` RGBA and converts it internally.
* Texture uploads distinguish color maps and data maps. Use ``loadColorTextureWithTiling``
  for sRGB albedo/emissive maps, and ``loadDataTextureWithTiling`` for normal,
  metallic-roughness, AO, depth, mask, or other linear data textures.

The renderer applies display gamma at the shader/output stage. Do not pre-gamma-correct
linear object colors before passing them to rayrai.

Shadows and lights
==================
rayrai has a fast single-main-light path for robotics workloads and a higher-quality
multi-light path for authored visual scenes. The main light is a directional light and
is always the cheapest shadow-casting source. Imported glTF/Blender scenes can also
use additional directional, point, spot, and area-style lights.

By default, the main shadow center tracks a point in front of the camera and the shadow
box is fixed in size. You can customize both via ``RayraiWindow``:

.. code-block:: cpp

    // shadow center is N meters ahead of the camera (default: 10.0)
    viewer.setShadowCenterOffset(12.0f);
    // shadow box (default: halfSize=12.5, near=0.1, far=55.0)
    viewer.setShadowOrtho(20.0f, 0.1f, 80.0f);

If you need a fully custom shadow view/projection, use the lower-level
``raisin::Light`` API directly.

Additional lights are controlled explicitly and capped so the fast path stays fast.
Rayrai currently supports up to ``RayraiWindow::kMaxAdditionalLights`` additional lights
and up to ``RayraiWindow::kMaxAdditionalShadowLights`` additional shadow maps. Directional,
spot, and area-style lights use 2D shadow maps. Point lights use cubemap shadow maps.
Shadow framebuffer setup validates the current OpenGL context and recreates stale
framebuffer/texture names when a viewer context is rebuilt; this matters for TCP-viewer
lifetime, offscreen tests, and applications that create/destroy render contexts.
For imported scenes, ``RenderQualitySettings::autoSelectImportedShadowLight`` can promote
the strongest imported light to the main shadow caster, while the remaining shadow budget
is assigned to additional lights.

.. code-block:: cpp

    raisin::RayraiWindow::AdditionalLight fill;
    fill.type = raisin::LightType::DIRECTIONAL;
    fill.direction = glm::normalize(glm::vec3(0.4f, -0.2f, -0.8f));
    fill.diffuse = glm::vec3(0.10f, 0.12f, 0.16f);
    viewer.addAdditionalLight(fill);

    raisin::RayraiWindow::AdditionalLight spot;
    spot.type = raisin::LightType::SPOT;
    spot.position = glm::vec3(1.8f, -1.6f, 2.6f);
    spot.direction = glm::normalize(glm::vec3(-1.4f, 1.0f, -1.8f));
    spot.diffuse = glm::vec3(0.18f, 0.42f, 1.0f);
    spot.spotInnerCos = std::cos(glm::radians(14.0f));
    spot.spotOuterCos = std::cos(glm::radians(28.0f));
    viewer.addAdditionalLight(spot);

    raisin::RayraiWindow::AdditionalLight area;
    area.type = raisin::LightType::AREA;
    area.position = glm::vec3(0.0f, 1.8f, 2.1f);
    area.diffuse = glm::vec3(0.55f, 0.65f, 0.42f);
    area.radius = 1.4f;
    area.areaSize = glm::vec2(1.8f, 0.9f);
    viewer.addAdditionalLight(area);

    viewer.clearAdditionalLights();

Shadow update cost is configurable. Dynamic scenes can update shadows every frame; static
visual scenes can bake shadow maps at startup or refresh them only when light/object
placement changes.

.. code-block:: cpp

    auto quality = raisin::RayraiWindow::defaultRenderQualitySettings(
      raisin::RayraiWindow::RenderQualityPreset::Ultra);
    quality.updateShadowsEveryFrame = false;       // startup/on-demand shadow bake
    quality.maxAdditionalLightsPerFrame = 12;      // light evaluation budget
    quality.maxAdditionalShadowLights = 4;         // 2D shadow-map budget
    quality.maxPointShadowLights = 2;              // cubemap shadow budget
    quality.additionalShadowResolutionScale = 0.5f;
    quality.pointShadowResolutionScale = 0.5f;
    viewer.setRenderQualitySettings(quality);

Use lower budgets for interactive editing or RL throughput. Use higher budgets for
offline screenshots, inspection, or demos where visual fidelity is more important than
frame time.

HDR, image-based lighting, and reflections
==========================================
rayrai supports HDR equirectangular environments for real-time PBR preview and
inspection. The HDR path is not a ray tracer; it precomputes cubemap data for
environment background, diffuse irradiance, specular prefiltering, and a split-sum BRDF
lookup table, then samples those textures in the PBR shader.

The typical setup is:

.. code-block:: cpp

    const char* hdr = "/path/to/small_harbour_sunset_1k.hdr";
    unsigned int env = raisin::RayraiWindow::loadHdrEquirectangularCubemap(hdr, 128, true);
    unsigned int irradiance = raisin::RayraiWindow::createHdrIrradianceCubemap(hdr, 32, 64);
    unsigned int prefiltered =
      raisin::RayraiWindow::createHdrPrefilteredEnvironmentCubemap(hdr, 128, 5, 64);
    unsigned int brdf = raisin::RayraiWindow::createSplitSumBrdfLut(128, 128);

    visual->setPbrEnvironment(env, irradiance, prefiltered, brdf, 1.0f);

Use HDR environments with visible features when inspecting reflective materials. A
featureless sky or uniform studio HDR can make it hard to tell whether reflections are
working. ``rayrai_pbr_material_grid`` and ``rayrai_pbr_texture_maps`` use
image-based lighting and PBR texture maps so metallic and glossy surfaces show
visible reflections while non-metallic assets remain mostly diffuse.

For scene-wide reflections, rayrai also has static reflection probe capture and planar
ground reflection support. These are real-time approximation tools: they improve visual
fidelity without enabling path tracing or other slow offline rendering mechanisms.
Choose lower environment resolution, fewer prefilter samples, and fewer reflection
updates for fast interactive runs; increase those values for screenshots or inspection.


Render-quality controls
=======================
rayrai keeps RL throughput and visual fidelity separate. The ``Fast`` preset keeps
reflections, high-fidelity PBR, FXAA, and extra expensive viewer effects off by default.
``High`` and ``Ultra`` enable the quality-oriented path, including high-fidelity PBR,
reflective ground, planar reflection sampling, stronger shadow filtering, FXAA, and
depth-of-field postprocessing.

Use presets for common cases:

.. code-block:: cpp

    viewer.setRenderQualityPreset(raisin::RayraiWindow::RenderQualityPreset::Fast);
    viewer.setRenderQualityPreset(raisin::RayraiWindow::RenderQualityPreset::Ultra);

Use explicit settings when you need runtime control:

.. code-block:: cpp

    auto quality = raisin::RayraiWindow::defaultRenderQualitySettings(
      raisin::RayraiWindow::RenderQualityPreset::Ultra);
    quality.fxaaEnabled = true;
    quality.depthOfFieldEnabled = true;
    quality.depthOfFieldFocusDistance = 5.0f;
    quality.depthOfFieldFocusRange = 8.0f;
    quality.depthOfFieldMaxRadius = 1.25f;
    quality.reflectiveGround = true;
    quality.addViewerFillLights = false;
    viewer.setRenderQualitySettings(quality);

The shipped ``rayrai_feature_showcase`` target exercises these controls and
writes offscreen images and reports.

PBR materials
=============
rayrai supports a lightweight glTF-style metallic-roughness PBR path in addition to
the existing simple Phong-style renderer. Simple color and legacy textured meshes stay
on the fast path; PBR shader work is used only for meshes whose material requests PBR
features or PBR texture maps.

Supported material inputs include:

* base color factor and base color texture
* metallic and roughness factors
* metallic-roughness texture
* normal texture
* occlusion texture
* emissive factor and emissive texture

Lighting is based on rayrai's main light, optional additional lights, shadow maps,
HDR/image-based lighting when configured, and optional reflection probes. Color textures
are uploaded as sRGB; data maps such as normal, metallic-roughness, and AO remain
linear. Normal maps require tangent data; glTF assets usually provide it, and rayrai
generates or imports tangent data where possible. The PBR path is suitable for preview,
data generation, and asset inspection; it is not an offline path tracer.

The shipped PBR examples and tools are:

* ``rayrai_pbr_material_grid``: Khronos glTF material-grid asset inspection.
* ``rayrai_pbr_texture_maps``: base-color, normal, metallic-roughness,
  occlusion, and emissive texture-map coverage.
* ``KHR_lights_punctual`` from the glTF/GLB file for directional, point, and spot lights.
* ``*.rayrai_lights.json`` for Blender area lights with size, direction, color, and energy.

For best results, keep the authored scene in metric scale, keep Z as up, and prefer
glTF/GLB over OBJ. OBJ is useful for simple geometry interchange, but it loses too much
of the scene-level material and light data needed for high-quality rendering.

Material import details
=======================
The Assimp/glTF importer is asset-agnostic. It does not special-case the blue-wall
scene or material names. It follows this priority:

* Use explicit material texture slots from the source asset when present.
* Treat base-color and emissive maps as color textures.
* Treat normal, metallic-roughness, occlusion, masks, and other data maps as linear data.
* Preserve normal-map scale and detect common OpenGL-vs-DirectX normal-map naming.
* Use embedded glTF textures when available.
* Search sibling texture files for common PBR map names when the source material omits
  a slot but the files are packaged next to the asset.
* Keep simple solid-color materials on the simple path unless normal maps or PBR features
  require the PBR shader.

This fallback behavior is meant to support real downloadable assets whose Blender,
glTF, FBX, DAE, and OBJ exports often disagree about how texture slots are authored.
If an asset renders white or flat, first check the import report/debug output for which
texture slots were found and whether the file paths exist next to the scene.

Visual assets and collision assets
==================================
rayrai visual meshes are renderer assets. URDF models can define separate
``visual`` and ``collision`` meshes, and standalone rayrai visuals can use glTF
material and texture data for inspection or presentation without becoming
collision geometry in ``raisim::World``. Keep this separation when an asset has
high-detail visual triangles, PBR materials, or texture maps.

Use this pattern when you want realistic visuals with collision meshes tuned for
physics:

.. code-block:: cpp

    auto* robot = world.addArticulatedSystem("anymal_c/urdf/anymal.urdf");
    auto* object = world.addArticulatedSystem("ycb/002_master_chef_can.urdf");

Only call ``World::addMesh`` for collision when the mesh is intentionally part
of the physics model. The current textured glTF and imported scene examples keep
renderer assets separate from collision geometry; the physics model still comes
from the URDF or explicit collision objects.

CoACD mesh approximation visualization
======================================
The ``rayrai_coacd_mesh_approximation`` example visualizes collision convexification. It shows the source mesh and
the generated convex parts side by side. The decomposition side uses per-part
colors so individual convex bodies can be inspected.

This example uses real meshes from ``rsc`` such as YCB and Minitaur assets. Some robot
visual meshes are intentionally not used because they are non-manifold visual shells and
are rejected by the minimal CoACD integration.

Examples
========
Rayrai examples are documented in :doc:`Examples <Examples>`. Each example page includes a short explanation and installed executable usage.

Quick map to the current rayrai-related targets:

* ``rayrai_basic_scene``: minimal in-process rayrai rendering.
* ``rayrai_complete_showcase``: broad rayrai feature overview with sensors and
  visuals.
* ``rayrai_pbr_material_grid``: glTF material-grid inspection.
* ``rayrai_pbr_texture_maps``: PBR texture-map import and inspection.
* ``rayrai_coacd_mesh_approximation``: visual comparison of original meshes and CoACD convex parts generated through
  ``World::addMesh``.
* ``rayrai_tcp_viewer``: TCP viewer for ``raisim::RaisimServer`` scenes.

ImGui integration (SDL2 + OpenGL)
=================================
rayrai is designed to be embedded in custom UI. The repository ships a minimal
SDL2/ImGui helper in ``rayrai/example_common.hpp``. The core idea is:

1) Create an OpenGL context (SDL2 here).
2) Render the RayraiWindow texture into an ImGui ``Image``.
3) Forward hover and cursor data to ``RayraiWindow::update``.

Minimal pattern (trimmed from the examples):

.. code-block:: cpp

    ExampleApp app;
    if (!app.init("rayrai_example", 1280, 720))
      return -1;

    auto world = std::make_shared<raisim::World>();
    auto viewer = std::make_shared<raisin::RayraiWindow>(world, 1280, 720);

    while (!app.quit) {
      app.processEvents();
      world->integrate();

      app.beginFrame();
      app.renderViewer(*viewer); // ImGui::Image + viewer.update(...)
      app.endFrame();
    }

The ``renderViewer`` helper uses ``ImGui::IsItemHovered()`` and mouse positions
to drive camera interaction and picking. Current offscreen examples exercise
the camera paths used by rayrai rendering and validation.

Headless/offscreen OpenGL context
=================================
If you already manage an OpenGL context (or want a headless one), use the static
helpers to create and bind a hidden SDL window context:

.. code-block:: cpp

    SDL_Window* window = nullptr;
    SDL_GLContext glContext = nullptr;
    raisin::RayraiWindow::createOffscreenGlContext(window, glContext, "rayrai_offscreen");
    raisin::RayraiWindow::makeOffscreenContextCurrent(window, glContext);

    auto world = std::make_shared<raisim::World>();
    raisin::RayraiWindow viewer(world, 640, 480);

The offscreen path does not require an ImGui context. If an application embeds rayrai
without ImGui, pass ``false`` for hover/click arguments to ``RayraiWindow::update`` or
drive camera state explicitly. The renderer guards ImGui input access so headless tests
and batch image generation can run without creating ImGui state.

Custom visuals and instancing
=============================
rayrai renders two categories of content:

* **RaiSim objects**: The renderer mirrors the objects already in the world.
* **Custom visuals**: Extra visuals you add explicitly (spheres, boxes, meshes, etc.).

Custom visuals are created through ``RayraiWindow`` and returned as ``Visuals``:

.. code-block:: cpp

    auto box = viewer.addVisualBox("marker", 0.1, 0.1, 0.1, 0.2f, 0.6f, 1.0f, 1.0f);
    box->setPosition(1.0, 0.0, 0.5);

For repeated geometry, use ``InstancedVisuals`` to reduce draw overhead:

.. code-block:: cpp

    auto instanced = viewer.addInstancedVisuals(
      "boxes", raisim::Shape::Box, glm::vec3(0.1f, 0.1f, 0.1f),
      glm::vec4(1.f, 0.2f, 0.2f, 1.f), glm::vec4(0.2f, 0.2f, 1.f, 1.f));
    instanced->addInstance(glm::vec3(0.0f, 0.0f, 0.1f), 0.0f);
    instanced->addInstance(glm::vec3(0.2f, 0.0f, 0.1f), 1.0f);

If you want to load meshes once and share them across visuals, use
``raisin::RayraiGlobalAsset`` and ``addVisualCustomMesh``:

.. code-block:: cpp

    auto assets = std::make_shared<raisin::RayraiGlobalAsset>();
    auto meshes = assets->getMeshes("/path/to/model.obj");
    auto custom = viewer.addVisualCustomMesh("custom", meshes, glm::vec4(0.9f, 0.9f, 1.0f, 1.0f));
    custom->setPosition(0.0, 1.0, 0.5);

Point clouds and coordinate frames
==================================
Point clouds and coordinate frames are lightweight debug aids:

.. code-block:: cpp

    auto cloud = viewer.addPointCloud("scan");
    auto frame = viewer.addCoordinateFrame("robot_frame");

These objects are rendered alongside the world and can be updated every frame.
Call ``updatePointBuffer()`` after changing point cloud data.

.. code-block:: cpp

    cloud->positions = {glm::vec3(0, 0, 1), glm::vec3(0.2f, 0.1f, 1.1f)};
    cloud->colors = {glm::vec4(0, 1, 0, 1), glm::vec4(1, 0, 0, 1)};
    cloud->updatePointBuffer();

Camera control and picking
==========================
``RayraiWindow`` manages an internal camera for offscreen rendering.
You can access or override it through ``getCamera()`` or by using
``renderWithExternalCamera`` when you want explicit control.

Picking is available through ``pickWithExternalCamera``. It renders a
selection pass and returns the encoded object id for a pixel.

The internal ``update`` call drives camera input and picking:

.. code-block:: cpp

    // Cursor is in framebuffer coordinates of the render area
    viewer.update(width, height, isHovered, cursorX, cursorY, shouldClick);

Sensor alignment
================
rayrai can align rendering to RaiSim camera sensors. Use
``syncRaisimCameraPose`` and ``renderWithExternalCamera`` to ensure the
render camera matches the sensor pose and intrinsics. RaiSim sensor rendering is
world-object-only: custom visuals, instanced visuals, point clouds, coordinate
frames, and other viewer-only helpers are excluded from RGB, depth, and LiDAR
data-generation passes. Use generic external-camera rendering only when you
intentionally want a viewer render that includes visualization objects.
Note: ``syncRaisimCameraPose`` updates ``Camera::position/front/up`` directly;
avoid calling ``Camera::update()`` immediately afterward unless you also update
``yaw``/``pitch``.

For complete runnable examples, see
:doc:`Rayrai RGB camera <examples/rayrai/rayrai_rgb_camera>`,
:doc:`Rayrai depth camera <examples/rayrai/rayrai_depth_camera>`, and
:doc:`Rayrai LiDAR point cloud <examples/rayrai/rayrai_lidar_pointcloud>`.
The broader ``examples/src/rayrai/getting_started/rayrai_complete_showcase.cpp``
source combines RGB, depth, raw buffer readback, LiDAR visualization, and camera
frustums in one scene. The sensor overview in :doc:`Sensors <Sensors>` includes
a longer RGB/depth readback example.

RGB/Depth camera workflow (manual source + external camera):

.. code-block:: cpp

    auto rgbCam = anymal->getSensorSet("d455_front")->getSensor<raisim::RGBCamera>("color");
    auto depthCam = anymal->getSensorSet("d455_front")->getSensor<raisim::DepthCamera>("depth");

    rgbCam->setMeasurementSource(raisim::Sensor::MeasurementSource::MANUAL);
    depthCam->setMeasurementSource(raisim::Sensor::MeasurementSource::MANUAL);

    raisin::Camera rgbCamera(*rgbCam);
    raisin::Camera depthCamera(*depthCam);

    viewer.renderWithExternalCamera(*rgbCam, rgbCamera, {});
    viewer.renderWithExternalCamera(*depthCam, depthCamera, {});
    viewer.renderDepthPlaneDistance(*depthCam, depthCamera);

You can read back the camera buffers on CPU:

.. code-block:: cpp

    const auto& prop = rgbCam->getProperties();
    const int width = std::max(1, prop.width);
    const int height = std::max(1, prop.height);
    std::vector<char> rgba(size_t(width) * size_t(height) * 4);
    rgbCamera.getRawImage(*rgbCam, raisin::Camera::SensorStorageMode::CUSTOM_BUFFER,
      rgba.data(), rgba.size(), /*flipVertical=*/false);

Depth uses a ``float`` buffer with ``width * height`` entries.

TCP viewer protocol
===================
The rayrai TCP viewer protocol is explicitly versioned. The current viewer sends a
protocol header with feature bits before each request, and the server replies with the
negotiated feature set. A viewer rejects newer unsupported protocol versions with a clear
error instead of attempting to parse an incompatible stream.

Current feature bits cover the explicit header and deformable delta streaming. Deformable
objects send mesh topology during initialization or topology changes; ordinary update
frames send vertex positions only. This keeps dynamic cloth/cube streaming cheaper while
avoiding binary compression until network bandwidth is measured as a bottleneck.

Depth and LiDAR
===============
The renderer supports a linear depth plane and a GPU-assisted LiDAR pass. These sensor
passes render RaiSim world objects only; visualization-only objects are intentionally
ignored so they cannot leak into training observations.

* ``renderDepthPlaneDistance`` renders a linear depth texture.
* ``measureSpinningLidarSingleDrawGPU`` renders a LiDAR slice using a
  spherical chunk shader.

You can retrieve the depth texture via ``getDepthPlaneTexture()``.

LiDAR usage has two paths. Prefer the rayrai GPU path when rayrai is available:

1) GPU slice rendering via ``measureSpinningLidarSingleDrawGPU`` for fast
   incremental updates.
2) CPU-based scan via RaiSim (``SpinningLidar::update``), then visualize with a
   point cloud, only when rayrai is unavailable or deterministic CPU ray-query
   behavior is required.

GPU slice example:

.. code-block:: cpp

    lidar->updatePose();
    const glm::dvec3 posW = raisin::toGlm(lidar->getPosition());
    const glm::dmat3 rotW = raisin::toGlm(lidar->getOrientation());
    viewer.measureSpinningLidarSingleDrawGPU(*lidar, posW, rotW);

Performance notes
=================

rayrai is intended to stay single-threaded so it can be embedded in
simulation, replay, and data-generation tools without adding renderer worker
synchronization. The renderer keeps the main performance controls explicit:

* Disable shadows for high-throughput camera observations when shadows are not part
  of the desired output. Use ``RenderOverrides::doShadows = false`` or disable the
  light's shadow map globally.
* Prefer ``addInstancedVisuals`` for repeated primitives or meshes. A single
  instanced visual renders many copies with one instance buffer instead of many
  separate visual objects.
* Opaque RaiSim single-body primitives are internally batched on non-shadowed color
  renders. This helps high-throughput observation rendering while keeping shadowed
  rendering on the conservative per-object path.
* Use ``InstancedVisuals::setMaxRenderedInstances`` and
  ``PointCloud::setMaxRenderedPoints`` as simple LOD caps for debug overlays,
  particles, scans, or dense markers that do not need full density in every frame.
* Keep non-visible debug geometry outside the camera frustum when possible. rayrai
  performs coarse frustum culling for RaiSim objects, custom visuals, instanced
  visuals, and point clouds, so off-camera content is skipped before draw submission.
* If the world topology is stable, repeated ``updateObjectLists()`` calls are cheap:
  rayrai refreshes appearances without rebuilding the object cache unless objects
  were added or removed.
* RGB/depth CPU readback supports an optional PBO-backed asynchronous path. The
  synchronous path remains the deterministic default for simple RL loops.
* Dynamic point clouds and instanced visuals support partial buffer updates for
  streaming changes.
* Deformable TCP streaming sends topology/indices only during initialization or topology
  changes; normal frames send vertex positions only.

Additional tips
===============

* If you add/remove RaiSim objects after constructing the viewer, call
  ``RayraiWindow::updateObjectLists()`` so the renderer refreshes its cache.
* Use ``setShowCollisionBodies(true)`` for debug visualization of collision shapes.
* If you want rayrai overlays to use your ImGui font, pass it via ``setExternalFont``.

API
====

Core types
**********

.. doxygenclass:: raisin::RayraiWindow
   :members:

.. doxygenclass:: raisin::Camera
   :members:

.. doxygenclass:: raisin::RayraiGlobalAsset
   :members:

Visuals and geometry
********************

.. doxygenclass:: raisin::Visuals
   :members:

.. doxygenclass:: raisin::InstancedVisuals
   :members:

.. doxygenclass:: OpenGLMesh
   :members:

.. doxygennamespace:: raisin::assimp
   :members:

Scene helpers
*************

.. doxygenclass:: raisin::PointCloud
   :members:

.. doxygenclass:: raisin::CoordinateFrame
   :members:

.. doxygenclass:: raisin::CameraFrustum
   :members:

.. doxygenenum:: raisin::VisualCategory

Rendering and materials
************************

.. doxygenclass:: raisin::Light
   :members:

.. doxygenclass:: raisin::Material
   :members:

RaiSim integration
******************

.. doxygenclass:: raisin::RaisimObject
   :members:

.. doxygenstruct:: raisin::tcp_viewer::BufferReader
   :members:
