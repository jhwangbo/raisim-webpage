############################################
Capture, diagnostics, and headless rendering
############################################

This page covers everything you need to drive rayrai without a GUI: the
headless/offscreen GL context, ImGui integration, the camera and picking
APIs, screenshot/diagnostics captures, exposure and calibration helpers,
async mesh loading, and heightmap texture overrides.

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

End-to-end headless capture (build a scene, render once, write a PNG):

.. code-block:: cpp

    #include <SDL.h>
    #include <stb/stb_image_write.h>

    #include <raisim/World.hpp>
    #include <rayrai/RayraiWindow.hpp>

    int main() {
      SDL_Init(SDL_INIT_VIDEO);
      SDL_Window* window = nullptr;
      SDL_GLContext gl = nullptr;
      raisin::RayraiWindow::createOffscreenGlContext(window, gl, "capture");
      raisin::RayraiWindow::makeOffscreenContextCurrent(window, gl);

      auto world = std::make_shared<raisim::World>();
      world->addGround();
      auto* box = world->addBox(0.4, 0.4, 0.4, 1.0);
      box->setPosition(0.0, 0.0, 0.2);
      box->setAppearance("0.95,0.43,0.12,1");

      raisin::RayraiWindow viewer(world, 1280, 720);
      auto q = raisin::RayraiWindow::defaultRenderQualitySettings(
          raisin::RayraiWindow::RenderQualityPreset::Ultra);
      q.colorMode = raisin::ViewerColorMode::AcesApprox;
      q.pbrToneMapping = true;
      q.bloomEnabled = true;
      viewer.setRenderQualitySettings(q);

      // Frame the box.
      auto& cam = viewer.getCamera();
      cam.position = glm::vec3(2.6f, 2.2f, 1.6f);
      cam.front = glm::normalize(glm::vec3(-0.55f, -0.45f, -0.30f));
      cam.worldUp = cam.up = glm::vec3(0.0f, 0.0f, 1.0f);
      cam.yaw = glm::degrees(std::atan2(cam.front.y, cam.front.x));
      cam.pitch = glm::degrees(std::asin(cam.front.z));
      cam.aspect = 1280.0f / 720.0f;
      cam.update(false);

      // Warm up shadow maps / IBL / particle systems, then capture.
      for (int i = 0; i < 3; ++i) viewer.update(1280, 720, false, 0, 0, true);
      raisin::RayraiWindow::RenderOverrides ov;
      ov.doShadows = true;
      auto capture = viewer.captureSupersampledRgba(viewer.getCamera(), 2, ov);

      // captureSupersampledRgba returns top-left row order, ready for PNG.
      stbi_write_png("/tmp/headless.png", capture.width, capture.height,
                     4, capture.rgba.data(), capture.width * 4);
      return 0;
    }

This is the same pattern used by the doc image generators under
``docs/image_generators/`` — see ``doc_image_common.hpp`` for a packaged
helper that wraps the boilerplate above.

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

For explicit picking against any camera (typically the same one used to render
the visible frame), call ``pickWithExternalCamera`` with the framebuffer
pixel coordinates. A return value of ``0`` means nothing was hit:

.. code-block:: cpp

    // From an ImGui handler: convert the mouse position into the render-target
    // framebuffer space and pick.
    if (ImGui::IsItemHovered() && ImGui::IsMouseClicked(0)) {
      auto pos = ImGui::GetMousePos();
      auto origin = ImGui::GetItemRectMin();
      int fbX = static_cast<int>(pos.x - origin.x);
      int fbY = static_cast<int>(pos.y - origin.y);

      uint32_t encoded = viewer.pickWithExternalCamera(viewer.getCamera(),
                                                       fbX, fbY);
      if (encoded != 0) {
        // The encoded id is `RaisimObject::encodeId` / decode with the
        // matching renderer helpers; for visuals you can look up by name in
        // your own registry, or use the renderer's ``findVisualById`` /
        // ``findObjectById`` accessors.
        std::printf("picked id = %u\n", encoded);
      }
    }

Picking renders a dedicated selection pass with a flat shader, so it is
roughly as cheap as one MSAA-off pass of the scene. Use it on click events,
not in the per-frame fast path.

Captures and diagnostics
========================
Rayrai has explicit diagnostics APIs for renderer tuning, regression artifacts,
and bug reports. These helpers are opt-in and are not part of the normal fast
frame path.

* ``captureSupersampledRgba`` renders high-resolution screenshots without
  resizing the caller's camera.
* ``captureDebugPasses`` captures the standard PBR/post-process debug-pass set
  as top-left ordered RGBA buffers.
* ``captureRenderPassTimings`` inserts blocking GPU timer queries for pass-level
  measurements. Use it for benchmarks, not ordinary frames.
* ``renderDiagnosticsJson`` and ``writeRenderDiagnosticsFiles`` export structured
  quality, scene, material, shadow, transparent-rendering, and resource state.
* ``analyzeRgbaLuminance``, ``recommendExposure``, luminance histograms, and
  calibration helpers operate on captured RGBA pixels for screenshot/report
  workflows.

.. code-block:: cpp

    raisin::RenderOverrides ov;
    ov.doShadows = true;
    auto rgba = viewer.captureSupersampledRgba(viewer.getCamera(), 2, ov);
    auto timings = viewer.captureRenderPassTimings(viewer.getCamera(), ov);
    std::string json = viewer.renderDiagnosticsJson();
    viewer.writeRenderDiagnosticsFiles("/tmp/rayrai_diag", /*importReport=*/{});

For transparent scenes, ``transparentDrawDebugView`` reports draw order, OIT,
refraction, overdraw, and per-item sorting state. Shadow and reflection-probe
planning are similarly exposed through ``shadowDebugOverlaySummary``,
``planDirectionalShadowCascades``, ``planAdditionalShadowAtlas``, and
``reflectionProbeDebugOverlaySummary``. ``shaderWarmupDiagnostics`` reports
shader compile/link cost from startup, and ``estimateRenderPassAccounting``
returns a CPU-only summary of which passes are active (fast path eligible,
shadows, post-process, bloom, denoise, readback) along with the dominant
bottleneck.

For long-running applications and offline pipelines, see
:doc:`RenderQuality` for the ``recommendDynamicQuality`` and
``recommendMaterialTextureBudget`` helpers that turn ``captureRenderPassTimings``
measurements into proposed setting changes.

Exposure, calibration, and output transforms
============================================
Capture pipelines often need consistent brightness and color across
screenshots. rayrai provides static helpers that operate on captured RGBA
buffers without touching renderer state:

.. code-block:: cpp

    auto metrics = raisin::RayraiWindow::analyzeRgbaLuminance(rgba.data(),
                                                              width, height);
    auto rec = raisin::RayraiWindow::recommendExposure(
        metrics, /*currentExposure=*/1.0f, /*targetMedian=*/0.18f,
        /*targetP95=*/0.7f, /*minExp=*/0.05f, /*maxExp=*/16.0f);
    float exposure = raisin::RayraiWindow::smoothExposure(
        /*current=*/1.0f, rec.recommendedExposure,
        /*dt=*/0.016f, /*brightenRate=*/4.0f, /*darkenRate=*/2.0f,
        /*minExp=*/0.05f, /*maxExp=*/16.0f);

For batch capture validation, place known reference patches in the scene and
measure them with ``analyzeRgbaCalibrationPatches``; the recommended output
transform from ``recommendCalibrationOutputTransform`` can then be applied
with ``transformRgbaForOutput`` before saving the image.

``renderLuminanceHistogramRgba``, ``renderCloudDebugRgba``,
``renderRainDebugRgba``, and ``renderSnowDebugRgba`` render diagnostic panels
(luminance histogram, cloud/precipitation breakdown, wet/snow response) as
plain RGBA buffers for embedding into reports.

The renderer also has a built-in auto-exposure loop: enable it via
``RenderQualitySettings::autoExposureEnabled`` and the renderer drives
``pbrExposure`` toward ``autoExposureKey`` (target post-tonemap luma) at
``autoExposureSpeed`` per frame, clamped to ``[autoExposureMinFactor,
autoExposureMaxFactor]``. For applications that need to drive exposure
themselves (e.g. tone-matched batch capture), use the static helpers above to
read the current frame's luminance and recommend a new exposure value:

.. code-block:: cpp

    // Frame loop driving exposure manually from the most recent capture.
    float currentExposure = 1.0f;
    while (running) {
      auto frame = viewer.captureSupersampledRgba(viewer.getCamera(), 1, {});
      auto metrics = raisin::RayraiWindow::analyzeRgbaLuminance(
          frame.rgba.data(), frame.width, frame.height);
      auto rec = raisin::RayraiWindow::recommendExposure(
          metrics, currentExposure,
          /*targetMedian=*/0.18f, /*targetP95=*/0.7f,
          /*minExp=*/0.05f, /*maxExp=*/16.0f);
      currentExposure = raisin::RayraiWindow::smoothExposure(
          currentExposure, rec.recommendedExposure,
          /*dt=*/dtSeconds,
          /*brightenRate=*/4.0f, /*darkenRate=*/2.0f,
          /*minExp=*/0.05f, /*maxExp=*/16.0f);

      auto q = viewer.getRenderQualitySettings();
      q.pbrExposure = currentExposure;
      viewer.setRenderQualitySettings(q);
    }

Async mesh loading
==================
For scene authoring tools and editors, expensive mesh imports can run on
worker threads. The renderer's main thread polls for completed assets and
finalizes their GPU buffers:

.. code-block:: cpp

    viewer.setAsyncMeshLoadingEnabled(true);
    auto* visual = viewer.addVisualMesh(
        "shelf", "/path/to/large_scene.glb", 1.0f, 1.0f, 1.0f,
        1.0f, 1.0f, 1.0f, 1.0f);

    while (viewer.pendingAsyncMeshLoadCount() > 0) {
      viewer.pollAsyncMeshLoads(/*maxAssets=*/4);
      // continue rendering / updating the UI between polls
    }

Async loading keeps the frame loop responsive on first import. The flag has
no effect for assets that are already cached through
``RayraiGlobalAsset``.

Heightmap visual textures
=========================
Heightmap visuals can carry application-specific color textures, overriding
the default pattern resource for one heightmap at a time. Use
``setHeightmapPatternResourcePath`` for a global override or
``setHeightmapColorTextureOverride(name, width, height, rgb)`` for a per-name
override that takes a contiguous RGB byte buffer. Patch updates are supported
through ``updateHeightmapColorTextureOverridePatch`` (specify a min/max range
in grid coordinates) so streaming visualizations can refresh dirty regions
without re-uploading the full texture. Clear with
``clearHeightmapColorTextureOverride(name)``.

.. code-block:: cpp

    auto* terrain = world->addHeightMap(/*sample_x=*/256, /*sample_y=*/256,
                                        /*size_x=*/40.0, /*size_y=*/40.0,
                                        /*centerX=*/0.0, /*centerY=*/0.0, heights);
    terrain->setName("procedural_terrain");

    // Initial full-resolution colour upload (e.g. semantic class colour map).
    const int W = 256, H = 256;
    std::vector<unsigned char> rgb(W * H * 3);
    fillSemanticColours(rgb.data(), W, H);
    viewer.setHeightmapColorTextureOverride("procedural_terrain", W, H, rgb.data());

    // Later, after the simulation marked a 40×40 cell patch as dirty:
    for (int y = dirtyMinY; y <= dirtyMaxY; ++y) {
      for (int x = dirtyMinX; x <= dirtyMaxX; ++x) {
        size_t idx = (y * W + x) * 3;
        std::tie(rgb[idx], rgb[idx + 1], rgb[idx + 2]) = classColour(grid[y][x]);
      }
    }
    viewer.updateHeightmapColorTextureOverridePatch(
        "procedural_terrain",
        /*minX=*/dirtyMinX, /*maxX=*/dirtyMaxX,
        /*minY=*/dirtyMinY, /*maxY=*/dirtyMaxY,
        rgb.data());

    // Clean up when the heightmap is destroyed.
    viewer.clearHeightmapColorTextureOverride("procedural_terrain");

