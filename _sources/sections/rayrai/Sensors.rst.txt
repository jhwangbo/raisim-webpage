#######################
Sensors and depth/LiDAR
#######################

This page covers aligning rayrai to RaiSim camera sensors, rendering depth
and LiDAR data, and the picking pipeline. For the general camera control
APIs (free-fly, orbit, picking from the viewer) see :doc:`Capture`.

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

For runnable coverage, see
:doc:`Rayrai RGB camera <../examples/rayrai/rayrai_rgb_camera>`,
:doc:`Rayrai depth camera <../examples/rayrai/rayrai_depth_camera>`,
:doc:`Rayrai LiDAR point cloud <../examples/rayrai/rayrai_lidar_pointcloud>`, and
:doc:`Rayrai ArUco marker <../examples/rayrai/rayrai_aruco_marker>` for dedicated
sensor examples. ``rayrai_feature_showcase`` adds aggregate external-camera,
linear-depth, sensor-only, and fisheye coverage. ``rayrai_benchmark`` adds
timed readback, picking, point-cloud, and scene-sync paths, while
``rayrai_complete_showcase_benchmark`` times the full Anymal RGB/depth/LiDAR
showcase with optional readback and visualization startup profiling. The sensor
overview in :doc:`Sensors <Sensors>` includes a longer RGB/depth readback
example.

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

Current feature bits cover the explicit header, deformable delta streaming, and sim
control. Deformable objects send mesh topology during initialization or topology
changes; ordinary update frames send vertex positions only. This keeps dynamic
cloth/cube streaming cheaper while avoiding binary compression until network bandwidth
is measured as a bottleneck. Sim-control messages share the same feature-negotiated
request path.

The protocol constants live in ``rayrai/RaisimTcpCommon.hpp`` (namespace
``raisin::tcp_viewer``):

* ``kDefaultPort`` — default ``RaisimServer`` port the viewer connects to.
* ``kProtocolVersion`` — the current wire version. Mismatched versions cause
  the viewer to disconnect with a versioned-protocol error.
* ``kProtocolFeatureExplicitHeader``, ``kProtocolFeatureDeformableDelta``,
  and ``kProtocolFeatureSimControl`` — the currently-negotiated feature bits;
  ``kProtocolSupportedFeatures`` is the OR of all bits this build understands.
* ``kMaxMessageBytes`` — maximum accepted message size (default 64 MiB),
  overridable at build time via the
  ``RAISIM_TCP_VIEWER_MAX_MESSAGE_BYTES`` preprocessor define when very large
  scenes need a larger frame budget.

The wire format is a native-endian binary stream. Each TCP frame begins with
an ``int32_t`` total-frame-size header (including the 4-byte header itself).
Scene strings use ``int32_t`` lengths; sensor-response names use ``uint64_t``
lengths to remain ABI-compatible with the legacy ``RaisimServer`` protocol.

Custom TCP clients should use ``raisin::tcp_viewer::BufferReader`` to decode
frames. It is a non-owning view over the received byte buffer with bounds-
checked accessors:

.. code-block:: cpp

    raisin::tcp_viewer::BufferReader reader(buffer.data(), buffer.size());
    auto version = reader.read<int>();
    auto features = reader.read<std::uint64_t>();
    auto name = reader.readString();
    auto positions = reader.readVector<float>();
    if (!reader.ok) {
      // malformed frame; drop the connection
    }

Each read advances ``reader.offset()`` and sets ``reader.ok = false`` if there
is not enough data left, so callers can decode an entire frame and check
``ok`` at the end rather than after every field.

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

