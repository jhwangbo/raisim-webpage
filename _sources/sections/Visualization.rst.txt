#############################
Visualization
#############################

RaiSim has two current visualization workflows. Choose the workflow based on
where rendering should happen.

.. list-table::
   :header-rows: 1
   :widths: 28 36 36

   * - Workflow
     - Use it when
     - Main executable/API
   * - ``RaisimServer`` + TCP viewer
     - Your simulation should publish world state and a separate viewer should
       display it.
     - ``raisim::RaisimServer`` and ``rayrai_raisim_tcp_viewer``
   * - In-process rayrai
     - Your application needs direct access to OpenGL textures, RGB/depth
       images, screenshots, PBR assets, or custom UI embedding.
     - ``raisin::RayraiWindow``

For older Unity or Unreal workflows, see :doc:`LegacyIntegrations`.

RaisimServer + TCP Viewer
=========================

This is the simplest way to inspect a simulation while keeping the renderer out
of the simulation process. Your application owns the world and starts a
``RaisimServer``:

.. code-block:: cpp

    raisim::World world;
    raisim::RaisimServer server(&world);
    server.launchServer(8080);

    while (running) {
      server.integrateWorldThreadSafe();
    }

Start the viewer from the same source build:

.. code-block:: bash

    <raisim-install>/bin/rayrai_raisim_tcp_viewer

Then run a server-based example:

.. code-block:: bash

    <raisim-install>/bin/example_anymal_contacts

The viewer connects to port ``8080`` by default. Use this workflow for normal
debug visualization, object inspection, and interactive camera control.

Important boundary: the TCP viewer only receives world state. It does not render
RGB/depth frames back into RaiSim sensors. For RGB/depth sensor buffers, prefer
in-process rayrai with ``Sensor::MeasurementSource::MANUAL``. Use RaiSim-side
CPU depth only when rayrai is unavailable or a deterministic headless ray-query
fallback is explicitly required.

In-Process rayrai
=================

Use in-process rayrai when rendering is part of the application:

.. code-block:: cpp

    auto world = std::make_shared<raisim::World>();
    raisin::RayraiWindow viewer(world, 1280, 720);

    while (running) {
      world->integrate();
      viewer.update(1280, 720, false, 0, 0, false);
      unsigned int colorTexture = viewer.getImageTexture();
      (void)colorTexture;
    }

Examples:

.. code-block:: bash

    <raisim-install>/bin/example_rayrai_pbr_asset_inspector
    <raisim-install>/bin/example_polyhaven_blue_wall --screenshot /tmp/blue_wall.png
    <raisim-install>/bin/example_rayrai_usd_importer

Use this workflow for screenshots, offscreen rendering, dataset generation,
custom ImGui/Qt tools, PBR visual inspection, glTF/USD visual import, picking,
and direct RGB/depth readback.

Which Page Next?
================

* :doc:`RaisimServer` documents the server lifecycle, thread-safety boundary,
  synchronous request loop, and server-side visual helper API.
* :doc:`Rayrai` documents ``RayraiWindow``, render-quality controls, custom
  visuals, glTF/Blender import, offscreen contexts, sensors, and rayrai API
  reference.
* :doc:`Sensors` documents the recommended rayrai RGB/depth sensor workflow,
  manual sensor buffers, and CPU-only fallback paths.
