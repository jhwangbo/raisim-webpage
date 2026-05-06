##########################
Rayrai Example: TCP Viewer
##########################

Overview
========
Standalone TCP viewer for RaisimServer scenes. It connects to a running server,
downloads the remote scene, and renders it with rayrai and ImGui controls. Use
this as the reference for the TCP viewer workflow and resource discovery.

Binary
======
Installed executable: ``rayrai_tcp_viewer``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/rayrai_tcp_viewer

On Windows, run ``rayrai_tcp_viewer.exe`` instead.
This example uses the in-process rayrai renderer (no external client required).


Details
=======
- Connects to a running RaisimServer over TCP and downloads the remote scene.
- Renders the streamed scene with rayrai and exposes an ImGui control panel.
- Does not send RGB/depth sensor measurements back to RaiSim. RaiSim does not
  support sensor measurement updates from a visualizer.

