#################################
Server Example: NVIDIA USD Robots
#################################

Overview
========
Loads several bundled Isaac Sim robot USD scenes with
``World::addUsdArticulatedSystem`` and publishes them together through
``RaisimServer``. The example is intentionally limited to assets that were
smoke-tested as RaiSim articulated systems with supported collision bodies.

.. image:: ../../../image/rayrai/rayrai_usd_nvidia_robots.png
   :alt: Collision bodies from three Isaac Sim USD robot assets imported into RaiSim
   :width: 100%

Build Availability
==================
The executable is generated only when CMake finds a RaiSim package with USD
scene loading. RaiSim is expected to include OpenUSD on every supported
architecture.

Target
======
CMake target when available: ``nvidia_usd_robots``.

Assets
======
The bundled assets are:

- ``create3``: ``rsc/isaac/Robots/iRobot/Create3/create_3.usd`` (BSD-3)
- ``jetbot``: ``rsc/isaac/Robots/NVIDIA/Robomaker/aws_robomaker_jetbot.usd`` (MIT)
- ``ant``: ``rsc/isaac/Robots/IsaacSim/Ant/ant.usd`` (MIT)

Run
===
Run the example:

.. code-block:: bash

   ./build-examples/examples/nvidia_usd_robots

On Windows, run ``nvidia_usd_robots.exe`` instead. This example uses
RaisimServer. Start ``rayrai_tcp_viewer`` and connect to port 8080.

Details
=======
- Loads each USD file with ``World::addUsdArticulatedSystem``.
- Fails fast if the USD scene does not import as an articulated system or if no
  supported collision bodies are imported.
- Places the imported floating bases above the ground and applies a shared
  ``nvidia_usd_robot`` collision material.
