############################################
Capture, diagnostics, and headless rendering
############################################

This page covers everything you need to drive rayrai without a GUI: the
headless/offscreen GL context and context hand-off between renderers, ImGui
integration, the camera and picking APIs, screenshot/diagnostics captures,
exposure and calibration helpers, async mesh loading and the mesh caches,
compressed texture storage, and heightmap texture overrides.

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

Several renderers and context hand-off
======================================
``createOffscreenGlContext`` leaves the new context current on the calling
thread, and a context can be current on only one thread at a time. To hand a
context created on the main thread to a worker, release it with
``RayraiWindow::detachOffscreenGlContext(window)`` (safe to call when no
context is current), then call ``makeOffscreenContextCurrent`` on the worker.
When several renderers share one thread, switch between their contexts with
``makeOffscreenContextCurrent`` too: it also resets rayrai's per-thread GL
binding caches, which a plain ``SDL_GL_MakeCurrent`` does not.

A context created while another one is current joins its share group. Within
a share group, the geometry of untextured meshes is uploaded once and reused;
textured meshes and their textures are loaded separately for each context,
because rayrai tunes texture filtering per renderer. See :doc:`../Rayrai` for
the threading contract.

SDL keyboard state is shared by the whole process, so with several renderers
enable keyboard input only on the focused one. ``setKeyboardInputEnabled(false)``
stops WASD/Space camera movement, and ``setKeyboardShortcutsEnabled(false)``
stops global shortcuts such as ``B`` (pick-buffer view). Both default to
``true``. Mouse input is already scoped by the hover flag passed to ``update``.

Detectability in camera captures
================================
External-camera captures draw RaiSim world objects according to the usual
object visibility rules, but they intentionally filter rayrai custom
visualization objects. ``Visuals``, ``InstancedVisuals``, and ``PointCloud``
instances must be marked detectable to appear in capture paths where
``RenderOverrides::drawVisualizationObjects`` or
``RenderOverrides::drawPointClouds`` is enabled:

.. code-block:: cpp

    auto prop = viewer.addVisualMesh("visible_to_camera", "/path/prop.glb",
                                     glm::dvec3(1.0), glm::vec4(1.0f));
    prop->setDetectable(true);

``RenderOverrides::drawVisualizationObjects`` and
``RenderOverrides::drawPointClouds`` enable those object families for an
external render; they do not force non-detectable debug helpers into the
captured image. Leave overlays, camera frustums, coordinate aids, and temporary
debug geometry non-detectable when they should remain visible only in the
interactive viewer.

Detectability is not a physics flag. It does not create collision, dynamics,
or a semantic label, and it does not affect normal viewer visibility.

The ``renderWithExternalCamera`` overloads that take a RaiSim ``RGBCamera`` or
``DepthCamera`` are stricter: they disable custom visualization objects and
point clouds entirely, regardless of detectability. That keeps RaiSim sensor
images limited to world geometry.

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

For custom visuals under the internal camera, ``pickTargetVisualAt`` resolves
the pick id and returns the public ``Visuals*`` directly. A null pointer means
nothing was hit:

.. code-block:: cpp

    // From an ImGui handler: convert the mouse position into the render-target
    // framebuffer space and pick.
    if (ImGui::IsItemHovered() && ImGui::IsMouseClicked(0)) {
      auto pos = ImGui::GetMousePos();
      auto origin = ImGui::GetItemRectMin();
      int fbX = static_cast<int>(pos.x - origin.x);
      int fbY = static_cast<int>(pos.y - origin.y);

      if (auto* visual = viewer.pickTargetVisualAt(fbX, fbY)) {
        viewer.setTargetVisual(visual);
      }
    }

For an explicit camera, ``pickWithExternalCamera`` returns the encoded
selection value (``0`` for no hit). The current public API does not expose an
encoded-id-to-object lookup. Treat that value as opaque and maintain an
application-side registry when external-camera picks must be correlated with
application entities. Known custom visuals can still be retrieved by name with
``getVisualObject(name)``.

Picking renders a dedicated selection pass with a flat shader, so it is
roughly as cheap as one MSAA-off pass of the scene. Use it on click events,
not in the per-frame fast path.

The public picking helpers do not require ``setDetectable(true)`` by default.
Detectability is primarily for external-camera/capture render filtering; some
internal render policies can request detectable-only visualization candidates,
but ordinary click picking is not the reason to mark a custom visual
detectable.

Captures and diagnostics
========================
Rayrai has explicit diagnostics APIs for renderer tuning, regression artifacts,
and bug reports. These helpers are opt-in and are not part of the normal fast
frame path.

* ``captureSupersampledRgba`` renders high-resolution screenshots without
  resizing the caller's camera. ``scale`` is clamped to 1–4.
* ``captureDebugPasses`` captures the standard PBR/post-process debug-pass set
  as top-left ordered RGBA buffers. It overrides the PBR debug output for this
  renderer only and leaves the process environment untouched;
  ``pbrDebugOutputMode()`` returns the mode in force, which otherwise comes from
  ``RAYRAI_PBR_DEBUG_OUTPUT``.
* ``captureRenderPassTimings`` inserts blocking GPU timer queries for pass-level
  measurements of an external camera. Use it for benchmarks, not ordinary
  frames.
* ``captureViewerPassTimings(width, height)`` measures the built-in viewer the
  same way. It calls ``update`` at that size, so it also resizes the viewer, and
  it includes non-detectable foliage.
* ``renderDiagnosticsJson`` and ``writeRenderDiagnosticsFiles`` export structured
  quality, scene, material, shadow, transparent-rendering, and resource state.
* ``analyzeRgbaLuminance``, ``recommendExposure``, luminance histograms, and
  calibration helpers operate on captured RGBA pixels for screenshot/report
  workflows.

.. code-block:: cpp

    raisin::RayraiWindow::RenderOverrides ov;
    ov.doShadows = true;
    auto rgba = viewer.captureSupersampledRgba(viewer.getCamera(), 2, ov);
    auto timings = viewer.captureRenderPassTimings(viewer.getCamera(), ov);
    auto viewerTimings = viewer.captureViewerPassTimings(1280, 720);
    std::string json = viewer.renderDiagnosticsJson();
    viewer.writeRenderDiagnosticsFiles("/tmp/rayrai_diag", /*importReport=*/{});

When the scene contains foliage batches, both timing captures render twice.
The coarse passes (``shadow``, ``scene_color`` or ``scene_color_and_resolve``,
``postprocess``, and so on) come from the first render, and the foliage
sub-passes (``scene_foliage_*`` and ``shadow_foliage_*``) from the second. The
sub-passes overlap the coarse passes, so do not add them to a frame total.

Per-frame state can be read without extra rendering, and describes the most
recent ``update`` or external-camera render:

* ``foliageRenderDiagnostics()`` — foliage draw calls, instance counts, culling
  and batching counters, and the foliage GPU times filled in by the timing
  captures.
* ``shadowCacheDiagnostics()`` — shadow-map renders versus reuses, including
  per-light and static/dynamic layer tracking.
* ``conservativeOcclusionCullingDiagnostics()`` — occlusion-query and Hi-Z
  culling counters.
* ``environmentBackgroundDiagnostics()`` — ``drawn``, ``deferred`` (drawn inside
  the scene pass rather than right after the clear), and ``depthTested`` (drawn
  after the depth prepass, so only uncovered samples were shaded).

For offline multi-view captures such as probe bakes, set
``RenderOverrides::fixedShadowCenterEnabled`` and ``fixedShadowCenter`` so all
views share one directional shadow region instead of centering it on each
camera; use a single shadow cascade with it. External renders reuse the
previous frame when the camera, overrides, settings, and scene are unchanged;
call ``invalidateExternalFrameCache()`` after editing GL resources in place.
When the quality settings enable MSAA, an external camera keeps its
multisample buffers between renders; ``camera.setSceneMsaaSamples(1)`` releases
them.

With ``setLinearHdrRenderingEnabled(true)`` (off by default), scene colour stays
linear through MSAA, fog, bloom, and depth of field, and exposure, the tone
curve, and gamma are applied once at the end of postprocessing; bloom
thresholds are then scene-linear. Captures that run the built-in
postprocessing (``RenderOverrides::postProcess``, the default) follow this
pipeline, while renders with ``postProcess = false``, a custom ``post`` shader,
or a PBR debug output keep the previous output.

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

    // rgba: std::vector<unsigned char> with width * height RGBA8 pixels.
    auto metrics = raisin::RayraiWindow::analyzeRgbaLuminance(rgba, width, height);
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
          frame.rgba, frame.width, frame.height);
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
Mesh files load asynchronously by default. The import runs on a worker
thread, materials and textures are resolved on the render thread, geometry is
optimized on a worker, and the prepared submeshes are uploaded to the GPU one
per step on the render thread. Until an asset is ready, its visuals draw
nothing; instanced batches also wait for their LOD chains (see :doc:`Visuals`).
``update()`` and every external-camera render advance one step themselves.
``pollAsyncMeshLoads(n)`` advances up to ``n`` import or upload steps (``0``
does nothing) and returns the number of assets that finished. OpenUSD files
always load synchronously.

.. code-block:: cpp

    auto visual = viewer.addVisualMesh("shelf", "/path/to/large_scene.glb",
                                       glm::dvec3(1.0), glm::vec4(1.0f));

    while (viewer.pendingAsyncMeshLoadCount() > 0) {
      viewer.pollAsyncMeshLoads(/*maxAssets=*/4);
      // continue rendering / updating the UI between polls
    }

``pendingAsyncMeshLoadCount()`` includes unfinished GPU uploads and instanced
LOD jobs. Call ``setAsyncMeshLoadingEnabled(false)`` before adding visuals when
assets must be complete as soon as ``addVisualMesh`` or ``importVisualScene``
returns. Assets already held in memory are returned immediately either way.

Mesh caches on disk
===================
rayrai keeps two regenerable caches for imported meshes; deleting them only
costs regeneration time on the next load.

* Mesh metadata and generated LOD chains are written to
  ``RAYRAI_MESH_PREPROCESS_CACHE_DIR``, by default the
  ``rayrai_mesh_preprocess_cache`` folder in the system temporary directory.
  An entry is invalidated when the source file's size or modification time
  changes, or when the cache format changes.
  ``RAYRAI_SUPPRESS_MESH_PREPROCESS_CACHE_FALLBACK_WARNINGS=1`` silences the
  warnings printed when the cache cannot be used.
* LOD chains that instanced batches prepare during asynchronous loading are
  stored next to each asset as ``rayrai_cache_<file name>.lods``. They are
  invalidated by a fingerprint of the imported geometry, so edits to external
  glTF buffers are detected. ``RAYRAI_ASYNC_LOD_CACHE_DIR`` stores them in
  another folder instead (if that folder is not writable, nothing is cached).
  Without it, an unwritable asset folder falls back to the system temporary
  directory. Setting ``RAYRAI_DISABLE_ASYNC_LOD_CACHE`` to any value disables
  this cache.

Compressed texture storage
==========================
``rayrai/Bc7TextureStorage.hpp`` provides an opt-in, load-time helper that
re-encodes eligible colour textures as BC7 to reduce texture memory. Call it
with the renderer's GL context current, after the visuals are loaded:

.. code-block:: cpp

    #include <rayrai/Bc7TextureStorage.hpp>

    std::vector<unsigned int> textures;
    visual->collectMaterialTextureIds(textures);
    std::sort(textures.begin(), textures.end());
    textures.erase(std::unique(textures.begin(), textures.end()), textures.end());
    for (unsigned int id : textures) {
      const auto stored = raisin::compressRgbTextureBc7(id);
      // stored.mipLevels == 0 means the texture was left unchanged.
    }

Only mutable 8-bit RGB or sRGB 2D textures are converted. Textures with alpha,
float, depth, immutable, or already compressed storage are left untouched, as
is any texture that would not get smaller. Every authored mip level, the
filtering state, and the texture id are kept. ``supportsBc7TextureStorage()``
reports whether the context has OpenGL 4.2 or
``GL_ARB_texture_compression_bptc``; without it the helper does nothing. The
driver's encoder is lossy and runs again on every launch, so compare images
before enabling it for an asset.

Heightmap appearance and streaming updates
==========================================

``setHeightmapPatternResourcePath`` applies one tiled albedo texture to every
heightmap in the viewer. The matching
``setHeightmapNormalResourcePath`` and ``setHeightmapHeightResourcePath``
methods provide global normal and height/parallax textures. Passing an empty
path clears the corresponding resource.

``setHeightmapTerrainMaterialParameters(normalStrength, roughness,
parallaxScale, deepParallax = true)`` tunes the heightmap terrain material
(defaults ``1.0``, ``0.90``, ``4.0``). With a height texture,
``deepParallax = true`` uses layered parallax occlusion mapping and ``false`` a
single-sample parallax offset; ``parallaxScale = 0`` disables parallax.
Parallax changes texture sampling only, not collision or the terrain
silhouette.

Per-heightmap data is authored on ``raisim::HeightMap`` itself. Use
``setColor`` for a full RGB color map, ``setColorPatch`` for a rectangular
color patch after the full map has been initialized, and
``updateVisualHeightPatch`` for a visualization-only height update. These
updates are synchronized into the mirrored rayrai heightmap; they do not create
a renderer-owned per-name texture override.

.. code-block:: cpp

    auto* terrain = world->addHeightMap(/*sample_x=*/256, /*sample_y=*/256,
                                        /*size_x=*/40.0, /*size_y=*/40.0,
                                        /*centerX=*/0.0, /*centerY=*/0.0, heights);
    viewer.setHeightmapPatternResourcePath("/path/to/terrain_albedo.png");
    viewer.setHeightmapNormalResourcePath("/path/to/terrain_normal.png");

    // Initialize one RGB value per height sample.
    std::vector<raisim::ColorRGB> colors(256 * 256, {90, 130, 70});
    terrain->setColor(colors);

    // Patch bounds are inclusive; the patch vector is tightly packed.
    constexpr size_t minX = 20, maxX = 59;
    constexpr size_t minY = 30, maxY = 69;
    std::vector<raisim::ColorRGB> patch(
        (maxX - minX + 1) * (maxY - minY + 1), {210, 170, 70});
    if (!terrain->setColorPatch(patch, minX, maxX, minY, maxY)) {
      // Invalid bounds, patch size, or no initialized full color map.
    }

``updateVisualHeightPatch`` also takes inclusive bounds, but its height input is
the full row-major height array; only the requested region is copied. Call
``update(...)`` instead when physics collision heights must change too.
