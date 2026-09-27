#######################
Sensors and depth/LiDAR
#######################

This page covers aligning rayrai to RaiSim camera sensors, fisheye lenses,
CPU readback, rendering depth and LiDAR data, and the TCP viewer protocol. For
the general camera control and picking APIs (free-fly, orbit, picking from the
viewer) see :doc:`Capture`.

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
:doc:`Rayrai heightmap replacement <../examples/rayrai/rayrai_heightmap_replacement>`,
:doc:`Rayrai LiDAR point cloud <../examples/rayrai/rayrai_lidar_pointcloud>`, and
:doc:`Rayrai ArUco marker <../examples/rayrai/rayrai_aruco_marker>` for dedicated
sensor examples. ``rayrai_complete_showcase`` combines RGB/depth cameras, LiDAR
visualization, camera frustums, raw buffer readback, and custom visuals in one
runnable scene. The sensor overview in :doc:`Sensors <../Sensors>` includes a
longer RGB/depth readback example.

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

Depth uses a ``float`` buffer with ``width * height`` entries. In 2.5.8,
constructing ``Camera`` from a ``DepthCamera`` allocates depth targets without
also eagerly allocating the RGB/post-processing targets. Keep the camera alive
across frames to reuse its buffers, and destroy it while its owning GL context
is current. ``Camera`` cannot be copied or moved because it owns GL handles.

The ``RGBCamera``/``DepthCamera`` overloads of ``renderWithExternalCamera``
always render without MSAA, temporal AA, or viewer upscaling, whatever the
quality preset. They do run the built-in postprocessing unless
``RenderOverrides::postProcess`` is ``false``, so enabling
``setLinearHdrRenderingEnabled(true)`` (see :doc:`Capture`) also changes RGB
sensor images; pass ``postProcess = false`` to keep the previous output.

Asynchronous readback
=====================
``getRawImage`` is synchronous. For high-rate capture,
``Camera::setAsyncReadbackEnabled(true, ringSize)`` (ring size at least 2,
default 3) enables a ring of pixel-buffer objects:
``readSceneColorRgbaAsync(rgba)`` and ``readLinearDepthAsync(depth)`` start a
readback of the current frame and return ``true`` once they have copied an
earlier one. The first calls return ``false`` until the ring is full, and the
copied frame then lags the latest render by ``ringSize`` calls.

.. code-block:: cpp

    rgbCamera.setAsyncReadbackEnabled(true, 3);
    std::vector<unsigned char> rgba;
    viewer.renderWithExternalCamera(*rgbCam, rgbCamera, {});
    if (rgbCamera.readSceneColorRgbaAsync(rgba, /*flipVertical=*/true)) {
      // rgba holds the frame rendered three calls earlier.
    }

Fisheye lenses
==============
A RaiSim camera whose ``lens`` property is an equidistant fisheye model
(``raisim::CameraLensModel::setOpenCvFisheye(fx, fy, cx, cy, k1, k2, k3, k4)``)
is honoured by ``raisin::Camera``. The ``RGBCamera`` and ``DepthCamera``
constructors copy the lens, ``isFisheyeLens()`` reports it, and
``renderWithExternalCamera`` resamples the rendered colour image through the
OpenCV/ROS equidistant model with ``k1``–``k4`` distortion. The source view is
rasterized with a horizontal field of view of at most 179°. Only the colour
image is remapped; depth from ``renderDepthPlaneDistance`` stays rectilinear.
For a camera that is not built from a RaiSim sensor, call
``Camera::setLensModel(lens, hFovRad)`` and set ``zoom`` (the vertical field of
view of the rasterized source view) yourself.

TCP viewer protocol
===================
The rayrai TCP viewer protocol is explicitly versioned. The current viewer sends a
protocol header with feature bits before each request, and the server replies with the
negotiated feature set. A viewer rejects newer unsupported protocol versions with a clear
error instead of attempting to parse an incompatible stream.

Current feature bits cover the explicit header, deformable delta streaming, sim
control, and contact ownership tags. Deformable objects send mesh topology during initialization or topology
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
  ``kProtocolFeatureSimControl``, and ``kProtocolFeatureContactObjectTags`` —
  the currently-negotiated feature bits;
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

    raisin::tcp_viewer::BufferReader reader(buffer);
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

The current viewer also services ``MeasurementSource::MANUAL`` RGB/depth
requests received in the scene stream. It renders from the streamed camera
pose and lens, returns BGRA or metric-depth buffers in a sensor-update message,
and exposes the latest preview in the selected object's Sensors tab. IMU and
spinning-LiDAR values remain RaiSim-side. See :doc:`../RayraiTcpViewer` for the
full request/response sequence and troubleshooting guidance.

Depth and LiDAR
===============
The renderer supports a linear depth plane and a GPU-assisted LiDAR pass. These sensor
passes render RaiSim world objects only; visualization-only objects are intentionally
ignored so they cannot leak into training observations.

* ``renderDepthPlaneDistance`` renders a linear depth texture. Its optional
  ``drawVisualizationObjects`` argument (default ``false``) adds custom and
  instanced visuals; only detectable ones are included unless
  ``visualizationObjectsMustBeDetectable`` is ``false``.
* ``measureSpinningLidarSingleDrawGPU`` renders a LiDAR slice using a
  spherical chunk shader. Pass ``objectToExclude`` (for example the robot
  carrying the sensor) to leave one object out of the scan.

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
