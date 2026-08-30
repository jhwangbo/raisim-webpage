##########################
Rayrai Example: TCP Viewer
##########################

Overview
========
Standalone TCP viewer for ``raisim::RaisimServer`` scenes. It
connects to a running server, downloads the remote scene, and renders it with
rayrai and ImGui controls. Build the ``rayrai_tcp_viewer`` target from this
repository for interactive viewing. The target also exposes batch and
diagnostics command-line options.

Target
======
CMake target: ``rayrai_tcp_viewer``.

Source
======
The public example entry point is ``examples/src/rayrai/rayrai_tcp_viewer.cpp``.
It is a compatibility wrapper for older local build scripts; the maintained
implementation lives in ``examples/src/rayrai/tools/rayrai_tcp_viewer.cpp`` and
is the file used by ``examples/CMakeLists.txt``.

Run
====
Run the build-tree executable while a ``RaisimServer`` application is running:

.. code-block:: bash

   ./build-examples/examples/rayrai_tcp_viewer

On Windows, the source-built executable is
``.\build-examples\bin\rayrai_tcp_viewer.exe``. This viewer is a separate
rayrai client process; in-process rayrai examples open their own renderer
window and do not need it.

Useful options
==============

.. code-block:: bash

   rayrai_tcp_viewer --connect 127.0.0.1:8080 --auto-frame
   rayrai_tcp_viewer --host 192.168.1.42 --port 8081 --auto-connect
   rayrai_tcp_viewer --connect '[2001:db8::10]:8080'
   rayrai_tcp_viewer --resource-dir /path/to/rsc --window-size 1600x900
   rayrai_tcp_viewer --fullscreen --minimize-panels --keep-overlay-open
   rayrai_tcp_viewer --no-pre-warm
   rayrai_tcp_viewer --warm-at-startup
   rayrai_tcp_viewer --camera-lookat 3,-4,2,0,0,0 --force-camera-lookat
   rayrai_tcp_viewer --camera-offset 2,-3,1
   rayrai_tcp_viewer --screenshot /tmp/rayrai_tcp_viewer.png
   rayrai_tcp_viewer --screenshot-dir /tmp/rayrai_frames
   rayrai_tcp_viewer --record-session /tmp/session.rrtcs
   rayrai_tcp_viewer --update-rate 30
   rayrai_tcp_viewer --replay-session /tmp/session.rrtcs --replay-speed 0.5 --replay-loop
   rayrai_tcp_viewer --trajectory-csv /tmp/poses.csv --export-scene /tmp/scene.json
   rayrai_tcp_viewer --server-list /tmp/servers.txt --wait-for-server 10 --exit-after 30

Run ``rayrai_tcp_viewer --help`` for the full option list.

Details
=======
- Connects to a running RaisimServer over TCP and downloads the remote scene.
- Renders the streamed scene with rayrai and exposes an ImGui control panel.
- Supports explicit host/port selection, ``--connect`` endpoint shortcuts, local
  TCP-listener discovery, and LAN RaisimServer beacon discovery.
- Supports repeatable ``--resource-dir`` entries for resolving streamed mesh and
  texture resources.
- Provides camera framing, orthographic view snaps, fullscreen startup, panel
  minimization, screenshots, PNG sequence output, raw TCP session recording,
  offline replay, trajectory CSV logging, target update-rate control, and
  scene/object JSON diagnostics.
- Interactive tools include Shift+left-drag force application, a 2-point ruler,
  3-point angle measurement, pose grabber axes, body frames, COM markers, and
  keyboard shortcut help.
- Rebuild the ``rayrai_tcp_viewer`` target after changing its checked-in source
  or the packaged rayrai library.
- Services manual RGB/depth camera requests from ``RaisimServer``, returns
  completed BGRA/metric-depth buffers, and shows previews and camera frustums
  in the selected-object Sensors tab.
- Prefer in-process rayrai when the application must own the render context or
  access textures without a viewer process and TCP round trip.
