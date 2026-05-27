rayrai_raisim_tcp_viewer
========================

``rayrai_raisim_tcp_viewer`` is the supported packaged TCP viewer for
``raisim::RaisimServer`` applications. Start a RaisimServer example or
application, then launch the viewer to connect to the default server port
(``8080`` unless the application changes it). The viewer runs as a separate
rayrai client process; in-process rayrai examples open their own renderer window
and do not need it.

Run:

.. code-block:: bash

   <raisim-install>/bin/rayrai_raisim_tcp_viewer

Current command-line options configure connection, resource lookup, startup
camera/UI state, screenshots, TCP session recording/replay, and diagnostics:

.. code-block:: bash

   <raisim-install>/bin/rayrai_raisim_tcp_viewer --connect 127.0.0.1:8080 --auto-frame
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --host 192.168.1.42 --port 8081 --auto-connect
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --connect '[2001:db8::10]:8080'
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --resource-dir /path/to/rsc --window-size 1600x900
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --fullscreen --minimize-panels --keep-overlay-open
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --no-pre-warm
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --warm-at-startup
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --camera-lookat 3,-4,2,0,0,0 --force-camera-lookat
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --camera-offset 2,-3,1
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --screenshot /tmp/rayrai_tcp_viewer.png
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --screenshot-dir /tmp/rayrai_frames
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --record-session /tmp/session.rrtcs
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --update-rate 30
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --replay-session /tmp/session.rrtcs --replay-speed 0.5 --replay-loop
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --trajectory-csv /tmp/poses.csv --export-scene /tmp/scene.json
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --server-list /tmp/servers.txt --wait-for-server 10 --exit-after 30
   <raisim-install>/bin/rayrai_raisim_tcp_viewer --help

Supported options are ``--host``, ``--port``, ``--connect``,
``--auto-connect``, ``--no-auto-connect``, repeatable ``--resource-dir``,
``--window-size``, ``--fullscreen``, ``--minimize-panels``,
``--keep-overlay-open``, ``--auto-frame``, ``--no-pre-warm``,
``--warm-at-startup``, ``--camera-lookat``, ``--camera-offset``,
``--force-camera-lookat``, ``--screenshot``, ``--screenshot-dir``,
``--record-session``, ``--update-rate``, ``--replay-session``,
``--replay-speed``, ``--replay-loop``, ``--export-scene``,
``--trajectory-csv``, ``--server-list``, ``--wait-for-server``,
``--exit-after``, and ``--help``.

Details
-------
- Connects to a running RaisimServer over TCP and downloads the remote scene.
- Renders the streamed scene with rayrai and exposes ImGui controls.
- Lists compatible LAN ``RaisimServer`` beacons in the connection dropdown.
- Provides UI controls for host/port connection, recent endpoints, resource
  search directories, collision body display, contacts, body frames, COM
  markers, pose grabbing, camera speed, lighting, render quality, UI scale,
  orthographic view snaps, and world-frame display.
- Provides batch-friendly startup framing, screenshots, PNG output directory
  selection, raw TCP session recording, offline replay, trajectory CSV logging,
  target update-rate control, and scene/object JSON diagnostics.
- The TCP protocol data path includes visualizer-side RGB/depth sensor update
  plumbing, but direct sensor workflows should still prefer in-process rayrai
  when the application needs deterministic render buffers.

``rayrai_tcp_viewer`` is the package-example/source-tree viewer target with the
same batch-oriented workflow. Use ``rayrai_raisim_tcp_viewer`` as the supported
packaged viewer when both binaries are available.

Use this viewer instead of the legacy RaisimUnity or RaisimUnreal visualizers.
