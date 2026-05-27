###########################################
Performance notes and the C++ API reference
###########################################

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
* TCP viewer scenes synthesize repeated articulated mesh visuals into internal
  ``InstancedVisuals`` batches when mesh path, scale, color policy, and color match.
  ``RemoteScene::tcpMeshBatchCount()`` and
  ``tcpMeshBatchMeshColorCount()`` expose diagnostics for this path.
* Use ``InstancedVisuals::setMaxRenderedInstances`` and
  ``PointCloud::setMaxRenderedPoints`` as simple LOD caps for debug overlays,
  particles, scans, or dense markers that do not need full density in every frame.
* Keep non-visible debug geometry outside the camera frustum when possible. rayrai
  performs coarse frustum culling for RaiSim objects, custom visuals, instanced
  visuals, and point clouds, so off-camera content is skipped before draw submission.
  Mesh-local bounds are used when available, so offset meshes, articulated links,
  deformables, and heightmaps cull and frame from their rendered bounds rather
  than only from the object origin.
* If the world topology is stable, repeated ``updateObjectLists()`` calls are cheap:
  rayrai refreshes appearances without rebuilding the object cache unless objects
  were added or removed.
* RGB/depth CPU readback supports an optional PBO-backed asynchronous path. The
  synchronous path remains the deterministic default for simple RL loops.
* Dynamic point clouds and instanced visuals support partial buffer updates for
  streaming changes.
* Deformable TCP streaming sends topology/indices only during initialization or topology
  changes; normal frames send vertex positions only.

Shader binary cache and multi-threaded prewarming
=================================================

rayrai's PBR shaders compile in 10-30 seconds on first run depending on the
GL driver. v2.3.0 adds two features that eliminate that wait in production
RL pipelines:

1. **Persistent shader binary cache.** Compiled GL programs are written to a
   per-driver cache directory and reloaded on subsequent runs.
2. **Static prewarm helper** for multi-threaded RL setups where many worker
   threads will each construct their own ``RayraiWindow`` — one thread can
   pre-compile every shader, then every worker thread reads from the cache.

Both are wired through the ``RayraiWindow`` constructor:

.. code-block:: cpp

    raisin::RayraiWindow viewer(
      world,
      /*width=*/1280, /*height=*/720,
      raisin::RayraiWindow::ThreadingMode::SingleThread,
      /*shaderCompileThreadCount=*/1,            // 1 = matches rayrai's default
      /*shaderBinaryCacheEnabled=*/true,         // on by default
      /*shaderBinaryCacheDirectory=*/"",          // empty → $HOME/.raisim/rayrai
      /*logShaderBinaryCache=*/false);

* ``shaderCompileThreadCount`` is passed to
  ``glMaxShaderCompilerThreadsARB`` and only takes effect on drivers that
  expose ``KHR/ARB_parallel_shader_compile``. Raise it only when the host
  application is itself multi-threaded.
* ``shaderBinaryCacheEnabled = true`` (the default) writes program binaries
  under the cache directory keyed by GL vendor / renderer / version + GLSL
  source. On the next run, identical configurations are loaded directly,
  skipping the GLSL compile entirely.
* ``shaderBinaryCacheDirectory = ""`` uses ``$XDG_CACHE_HOME/raisim/rayrai``
  (or ``$HOME/.raisim/rayrai`` on Linux/macOS).
* ``logShaderBinaryCache = true`` prints every hit/miss/store to stderr —
  useful for verifying the cache is actually being consulted.

Cache statistics (per process, across all ``Shader::compile`` calls):

.. code-block:: cpp

    auto s = raisin::Shader::binaryCacheStats();
    std::printf("hits=%llu misses=%llu stores=%llu coordinated_waits=%llu\n",
                static_cast<unsigned long long>(s.hits),
                static_cast<unsigned long long>(s.misses),
                static_cast<unsigned long long>(s.stores),
                static_cast<unsigned long long>(s.coordinatedWaits));
    raisin::Shader::resetBinaryCacheStats();  // scope a measurement window

Pre-warming for parallel RL can be done with the installed/source-tree
``rayrai_shader_prewarm`` utility, which creates an offscreen context and
compiles every built-in shader into the persistent binary cache:

.. code-block:: bash

    rayrai_shader_prewarm --cache-dir /tmp/rayrai-cache --compile-threads 4 --multi-thread
    rayrai_shader_prewarm --log-cache

For an embedded application, spawn one background thread, give it its own
offscreen GL context, call ``prewarmShadersForCurrentContext`` once. Worker
threads that later construct their own ``RayraiWindow`` will find the heavy
shaders already cached (or briefly block on a per-shader compile mutex if
the warm-up is still in flight):

.. code-block:: cpp

    std::thread([]{
      SDL_Window* w = nullptr; SDL_GLContext gl = nullptr;
      raisin::RayraiWindow::createOffscreenGlContext(w, gl, "rayrai_prewarm");
      raisin::RayraiWindow::makeOffscreenContextCurrent(w, gl);
      raisin::RayraiWindow::prewarmShadersForCurrentContext(
        raisin::RayraiWindow::ThreadingMode::MultiThread);
      SDL_GL_MakeCurrent(nullptr, nullptr);
      SDL_GL_DeleteContext(gl);
      SDL_DestroyWindow(w);
    }).detach();

Across the whole process, each shader's GLSL→binary compile runs exactly
once regardless of the number of worker threads.

When you only want to warm a specific subset:

.. code-block:: cpp

    // Names of every program registered with the running RayraiWindow.
    auto names = viewer.linkedShaderNames();

    // Compile the heaviest authored-content shader explicitly.
    long long ms = viewer.compileShaderByName("pbrMeshHigh");
    std::printf("pbrMeshHigh warmup: %lld ms\n", ms);

    // Iterate every program, one per call. `done` flips true when all are
    // linked; useful for spreading shader work across multiple frames.
    bool done = false;
    while (!done) {
      viewer.warmupNextShader(done);
    }

For diagnostics on the cost of the lazy-compile pipeline (how long each
program took on first use, how many are linked so far), call
``shaderWarmupDiagnostics()``.

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

.. doxygenstruct:: raisin::RenderQualitySettings
   :members:

.. doxygenstruct:: raisin::RenderOverrides
   :members:

.. doxygenenum:: raisin::RenderQualityPreset

.. doxygenenum:: raisin::ViewerColorMode

.. doxygenenum:: raisin::ColorGradePreset

.. doxygenenum:: raisin::PostProcessDebugMode

Weather, scene effects, and reflections
***************************************

.. doxygenstruct:: raisin::WeatherSettings
   :members:

.. doxygenenum:: raisin::WeatherPreset

.. doxygenstruct:: raisin::LocalFogVolume
   :members:

.. doxygenstruct:: raisin::ProjectedDecal
   :members:

.. doxygenstruct:: raisin::IrradianceVolume
   :members:

.. doxygenstruct:: raisin::ReflectionProbe
   :members:

.. doxygenstruct:: raisin::ReflectionProbeCaptureSettings
   :members:

.. doxygenstruct:: raisin::ReflectionProbeFilterSettings
   :members:

.. doxygenstruct:: raisin::ReflectionProbeBlend
   :members:

.. doxygenstruct:: raisin::ReflectionProbePlacementSuggestion
   :members:

Render quality, weather, capture, reflection-probe, and diagnostics helpers are
exposed through ``raisin::RayraiWindow`` and the public headers included by
``rayrai/RayraiWindow.hpp``. The sections above document the intended entry
points and the fast-path boundaries for those APIs.

RaiSim integration
******************

.. doxygenclass:: raisin::RaisimObject
   :members:

.. (BufferReader doxygen entry moved to :doc:`../RayraiTcpViewer`.)

