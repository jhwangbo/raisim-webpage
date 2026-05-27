#############################
Raisim Server
#############################

RaisimServer serializes ``raisim::World`` and streams the data to clients via TCP/IP.
Use ``rayrai_raisim_tcp_viewer`` for supported server-side visualization.
For older Unity or Unreal visualization workflows, see :doc:`LegacyIntegrations`.
For a workflow-level comparison between server-based visualization and
in-process rayrai rendering, see :doc:`Visualization`.

In addition to visualizing a ``raisim::World``, ``raisim::RaisimServer`` can visualize additional objects.
The legacy visual-object showcase is displayed as follows; use the current
examples index for runnable source targets:

.. image:: ../image/visuals.gif

Typical usage
=========================
Create the server, launch it, and advance the world through the thread-safe
integration helper:

.. code-block:: cpp

  raisim::World world;
  raisim::RaisimServer server(&world);
  server.launchServer(8080);
  for (;;) {
    server.integrateWorldThreadSafe();
  }

``integrateWorldThreadSafe()`` locks the world mutex, drains pending
client requests, decides whether this call is allowed to advance the world
(pause / step state), applies active client forces only on advancing ticks,
runs any callback overload, integrates the world when allowed, and unlocks
the mutex.

Thread safety and lifecycle
===========================
The server reads the world state from a background thread. If you modify the
world manually while the server is running, guard it with the visualization
mutex (``lockVisualizationServerMutex()`` / ``unlockVisualizationServerMutex()``)
to avoid races.

The server can be paused with ``hibernate()`` and resumed with ``wakeup()``.
Call ``killServer()`` to stop the server thread and disconnect the client.

Sensor measurements
==================================
RaiSim does not support sensor measurement updates from a visualizer.
``RaisimServer`` streams the world state to visualizer clients, but it does not
request RGB or depth frames back from TCP visualizers and does not write
visualizer-rendered data into RaiSim sensor buffers.

Use ``Sensor::MeasurementSource::RAISIM`` for sensors that RaiSim can compute
from the physics world, such as IMU, spinning LiDAR, and depth-camera CPU ray
updates. Use ``Sensor::MeasurementSource::MANUAL`` when user code or an
in-process renderer writes the sensor buffer.

Synchronous updates (optional)
==============================
``processRequests()`` implements a synchronous request/response loop used by
clients that explicitly pull world-state updates. It returns ``false`` if the
client does not respond or rejects the protocol version.

Protocol versioning and deformable streaming
============================================
The TCP wire protocol is explicitly versioned. Each request starts with a
protocol header that advertises the negotiated feature set, and the server
rejects newer or otherwise unsupported protocol versions with a clear error
rather than misparsing the stream. The current feature flags are:

* ``PROTOCOL_FEATURE_EXPLICIT_HEADER``: the client and server exchange the
  explicit version header before each request.
* ``PROTOCOL_FEATURE_DEFORMABLE_DELTA``: deformable mesh topology is sent only
  during initialization or when the topology changes; normal frames send
  vertex positions only.
* ``PROTOCOL_FEATURE_SIM_CONTROL``: when both ends advertise this bit, the
  client may pause / resume / step the simulation and push external forces,
  torques, body poses, and articulated-system generalized coordinates over the
  wire. The server applies no authentication — if the connection is open, the
  client can drive it. See `Interactive sim control`_ below.

The rayrai TCP viewer negotiates all three flags automatically. Custom clients
can opt into any flag through the ``RaisimServer`` and ``RaisimTcpCommon``
headers.

.. _Interactive sim control:

Interactive sim control
=======================
When the ``SIM_CONTROL`` feature is negotiated, a connected client (such as
``rayrai_raisim_tcp_viewer``) can drive the simulation from its UI rather than
just observing it. The viewer's **Control** tab gets a *Simulation* row with
icon-text buttons for Pause / Resume / Step / Step 10.

Client requests added by this feature:

* ``CR_PAUSE`` / ``CR_RESUME`` — toggle a flag consulted in
  ``integrateWorldThreadSafe()``. While paused, ``world_->integrate()`` is not
  called even though the network thread keeps streaming state.
* ``CR_STEP_N`` — queue *N* single-step integrations to advance while paused.
* ``CR_APPLY_FORCE`` — apply an external force at a world-space application
  point on a body. Drained at the next integration tick.
* ``CR_APPLY_TORQUE`` — apply an external torque on a body.
* ``CR_SET_POSE`` — teleport a single-body object to a position + quaternion.
* ``CR_SET_GC`` — set the generalized coordinate of an articulated system.

There is no authentication or capability handshake — if the connection is open,
the client can issue any of these requests. The bind address is the only
access control the server provides:

The same pause / step state is reachable from your own simulation code,
so a headless server can drive its own loop:

.. code-block:: cpp

  server.pauseSimulation();
  // ... do something while the integrator is paused; state streaming keeps running ...
  server.stepSimulation(10);   // queue 10 single-step integrations
  // ... or release the brake completely ...
  server.resumeSimulation();
  if (server.isSimulationPaused()) { /* … */ }

Pose and generalized-coordinate requests are applied when the server drains
client requests under the world mutex. Force and torque requests refresh an
active client-force slot, held for 0.12 s of simulation time and applied on
each integration tick until refreshed or expired. While paused, the slot can
be refreshed but the force is not applied until a step or resume call allows
``integrateWorldThreadSafe()`` to advance. ``stepSimulation(N)`` queues N
single-step integrations that drain one per ``integrateWorldThreadSafe()``
call; ``resumeSimulation()`` clears any queued steps and resumes normal
integration.


.. code-block:: cpp

  raisim::RaisimServer server(&world);
  server.setBindLoopbackOnly(false);  // expose on all interfaces (off by default)
  server.launchServer();

Keep the default (``127.0.0.1``-only) for development. Open the bind to a wider
network only when you trust every host that can reach the port.

Custom mutation under the world mutex
-------------------------------------
Examples that need to spawn / move / modify world objects every tick can pass
a callback to ``integrateWorldThreadSafe()``. The callback runs inside the
world mutex after pending sim-control requests are drained and active client
forces are applied for advancing ticks. It runs before ``world_->integrate()``
when the pause / step state allows the tick to advance:

.. code-block:: cpp

  for (int i = 0;; i++) {
    server.integrateWorldThreadSafe([&]() {
      if (i % 600 == 0) {
        auto* ball = world.addSphere(0.1, 1.0);
        ball->setPosition(0, -2, 0.8);
        ball->setVelocity(0, 10, 0, 0, 0, 0);
      }
    });
  }

The callback overload preserves all the pause / step / force / pose behavior
of the no-arg version — the viewer can still drive the simulation even when
the example mutates the world each tick. See
``examples/src/server/dynamic_object_addition.cpp`` and
``examples/src/server/dynamic_heightmap.cpp`` for working uses, and
``examples/src/server/sim_control_demo.cpp`` for a minimal demo of the
viewer-facing controls.

Default bind address
====================
``RaisimServer`` binds to ``127.0.0.1`` by default rather than ``INADDR_ANY``.
This prevents accidental exposure to a shared LAN. Opt back into external
visibility with:

.. code-block:: cpp

  server.setBindLoopbackOnly(false);

Treat this as a security boundary — once the server is reachable from a wider
network, every client on that network can pause / step / force-apply /
spawn-remove. There is no token or capability handshake to fall back on.


RaisimServer API
=========================

.. doxygenclass:: raisim::RaisimServer
   :members:

Visuals API
=========================

.. doxygenstruct:: raisim::Visuals
   :members:

Polyline API
=========================

.. doxygenstruct:: raisim::PolyLine
   :members:

ArticulatedSystemVisual API
============================

.. doxygenstruct:: raisim::ArticulatedSystemVisual
   :members:
