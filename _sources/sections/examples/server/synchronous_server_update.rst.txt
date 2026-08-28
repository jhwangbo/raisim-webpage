#########################################
Server Example: Synchronous Server Update
#########################################

Overview
========
Runs the RaisimServer in a manual socket loop and updates sensors only when the client requests them. This shows how to drive synchronous visualization and sensor updates.

Target And Source
=================

CMake target: ``synchronous_server_update``.

Source file: ``examples/src/server/synchronous_server_update.cpp``.

Run the build-tree example and connect with the source-built viewer:

.. code-block:: bash

   ./build-examples/examples/synchronous_server_update
   ./build-examples/examples/rayrai_tcp_viewer

Details
=======
- Runs RaisimServer in synchronous request/response mode.
- Manually accepts a TCP connection and processes sensor update requests.
- Configures RGB/depth cameras with ``MeasurementSource::MANUAL`` and gates
  request processing with ``needsSensorUpdate()``.
- Uses ``setupSocket()``, ``acceptConnection()``, ``waitForMessageFromClient()``,
  ``processRequests()``, and ``closeConnection()`` instead of
  ``launchServer()``.
