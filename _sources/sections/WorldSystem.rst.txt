#############################
World
#############################
The :code:`raisim::World` class owns simulation resources: objects, constraints,
materials, collision detection, contact solving, sensors, time, and gravity. All
objects within a single World instance can collide with one another unless their
collision group and mask settings disable that pair. See :doc:`Contact` and
:doc:`CollisionDetection` for contact and collision details.

A ``raisim::World`` can be instantiated in three ways:

#. **From a USD scene file (recommended default).** Pass a ``.usd``, ``.usda``,
   ``.usdc``, or ``.usdz`` path to the constructor. RaiSim opens the USD
   stage, imports the rigid bodies, articulated systems, and supported
   collision shapes, and the world is ready to step. See :doc:`OpenUSD` for
   the full import semantics and tooling story.

   .. code-block:: cpp

     raisim::World world("scene.usd");

   This is the preferred entry point because the scene is portable across
   public USD-native tools such as Isaac Sim, Omniverse, and Blender.

#. **From a RaiSim XML or MuJoCo MJCF configuration file.** Pass an ``.xml``
   or ``.mjcf`` path to the same constructor; the file's root tag
   (``<raisim>`` or ``<mujoco>``) selects the loader. Use this when the
   scene is hand-edited, template-driven, or already lives in one of those
   formats. See :doc:`WorldConfigurationFile` for the XML schema.

#. **Programmatically.** Default-construct an empty world and add objects
   in code:

   .. code-block:: cpp

     raisim::World world;
     world.addGround();
     auto* box = world.addBox(1.0, 1.0, 1.0, 1.0);

These methods can be combined: load an initial USD or XML scene and then
add or remove objects in code before stepping.

An experimental MJCF (MuJoCo file format) reader is also available. MJCF files
can be loaded with the same
``raisim::World`` constructor used for RaiSim XML:

.. code-block:: cpp

  raisim::World world("rsc/mjcf/gymnasium/hopper.xml");

The reader supports the subset used by the bundled MJCF examples: world bodies,
articulated bodies, free, slide, and hinge joints, primitive geoms, mesh assets,
inertial tags, defaults, compiler ``angle``/``eulerseq`` settings,
``compiler meshdir``, and material colors. Mesh asset paths are resolved
relative to the MJCF file directory, or relative to ``compiler meshdir`` when it
is provided. MJCF files without an ``asset`` block are accepted. Following the
MJCF default, a ``geom`` with no ``type`` attribute is treated as a sphere and
must provide at least one ``size`` value for its radius.

It is not a complete MuJoCo replacement; advanced MJCF features such as
``include``, tendons, equality constraints, actuators beyond the supported
examples, and full simulator options should be validated before relying on them.

Example targets:

* ``mjcf_gymnasium_hopper`` loads and actuates Gymnasium's Hopper model.
* ``mjcf_gymnasium_walker2d`` loads and actuates Gymnasium's Walker2d model.
* ``mjcf_gymnasium_humanoid`` loads Gymnasium's Humanoid model and drops it
  from a raised arbitrary configuration.

For callers that already hold a constructed ``raisim::World`` and want to
populate it from an MJCF file at runtime (instead of constructing the world
from the file path), use ``World::loadMjcfFile``:

.. code-block:: cpp

  raisim::World world;
  world.loadMjcfFile("rsc/mjcf/gymnasium/hopper.xml");

This is the same dispatch that ``World(configFile)`` does internally when
the file's root is ``<mujoco>``. The world should normally be empty before
calling — MJCF files often declare ground planes, ``worldbody`` lights, and
option blocks that overwrite world-level state. The rayrai TCP viewer uses
this entry point in its drag-drop **Joint Inspector** mode (see
:doc:`RayraiTcpViewer`).

Adding New Objects
============================
To add a new object of type X, utilize the :code:`addX` method.
For example, to add a sphere:

.. code-block:: cpp

  raisim::World world;
  auto sphere = world.addSphere(0.5, 1.0);

:code:`sphere` represents a pointer to the internal resource.
It facilitates access to and modification of internal variables.

Most object-creation methods accept optional :code:`material`, :code:`collisionGroup`, and :code:`collisionMask` arguments.
Static objects such as ground and heightmaps use a fixed collision group and expose only a collision mask.
Collision variables are detailed in the "Contact and Collision" section.
The :code:`material` argument specifies the material governing contact dynamics, as further explained in the "Material System" chapter.

A comprehensive list of objects is provided in the "Object" chapter.

Upon object addition, a name may be assigned:

.. code-block:: cpp

  sphere->setName("ball");

An object pointer can be retrieved by name:

.. code-block:: cpp

  auto* ball = world.getObject("ball");

An object may consist of multiple bodies (e.g., an articulated system).
A **local index** is used to designate individual bodies.
To maintain API consistency, many methods require the local index argument even for single-body objects.
For single-body objects, the local index is ignored, and users may pass 0 to comply with the API.

Stable object identifiers
-------------------------
``Object::Id`` (a ``uint64_t``) is assigned when an object is added to a world
and remains valid for the lifetime of that object even when other objects are
removed. ``World::getObjectById(id)`` returns a pointer or ``nullptr`` when the
object has been removed; ``isObjectAlive(id)`` returns the same information
without dereferencing. ``getIndexInWorld()`` is fine for steady-state lookups,
but in code that adds and removes objects (RL resets, asset streaming) prefer
the stable id because indices shift after every removal.

Snapshots and cloning
---------------------
Single-body objects support a fast capture/restore workflow for RL resets and
rollback debugging. ``captureSingleBodySnapshot(obj, snapshotOut)`` fills a
``SingleBodySnapshot`` (object id, type, body type, pose, linear/angular
velocity, material, and collision group/mask). ``restoreSingleBodySnapshot``
reapplies it later, either by pointer to the same object or by stable
``ObjectId``; pass ``restoreCollisionProperties=false`` to skip material and
collision filter restoration. The snapshot is plain data and cheap to copy and
reuse. ``cloneSingleBodyObject(source, name)`` produces a new single-body
object with the same primitive shape, mass, pose, velocity, body type,
material, collision filter, and appearance; it returns ``nullptr`` for
non-primitive single-body types.

.. code-block:: cpp

    raisim::World::SingleBodySnapshot snapshot;
    world.captureSingleBodySnapshot(sphere, snapshot);
    // ... simulate, then reset:
    world.restoreSingleBodySnapshot(sphere, snapshot);

    auto* twin = world.cloneSingleBodyObject(sphere, "sphere_copy");

Saving the World to an XML File
================================
``raisim::World::exportToXml(dir, file)`` (or ``exportToXml(path)``) saves the current world state to an XML file.
The current examples index lists the source targets that exercise world
creation and asset loading.

Stepping and time
=================

``World::integrate()`` advances the world by one timestep. It is equivalent to
calling ``integrate1()`` and then ``integrate2()``.

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - Method
     - Work performed
   * - ``setTimeStep(dt)``
     - Updates the world timestep, contact solver timestep, and object-local
       timestep state.
   * - ``integrate1()``
     - Clears previous contacts, runs collision detection, registers contacts,
       and calls each object's first pre-solver update hook.
   * - ``integrate2()``
     - Runs the second pre-solver update hook, solves contacts, and integrates
       object state.
   * - ``integrate()``
     - Runs ``integrate1(); integrate2();``.
   * - ``integrateNoContactDetection()``
     - Updates objects without contact detection and contact-problem
       construction.

``getWorldTime()`` returns the integrated simulation time, and
``setWorldTime(time)`` can manually adjust it. For visualization through
``RaisimServer``, prefer ``RaisimServer::integrateWorldThreadSafe()`` so the
server's background reader and user interactions are synchronized.

Collision Detection and Broadphase
==================================
RaiSim performs collision detection in two stages: a broadphase pass that filters
candidate pairs using axis-aligned bounding boxes (AABBs), followed by a
narrowphase pass (analytic tests, SAT, MPR, and GJK/EPA depending on the shape pair)
to generate contact points. You can configure the
contact detector via :code:`setContactSettings` or adjust only the broadphase
via :code:`setBroadphaseSettings`. These settings should be updated when the
world is not stepping.

Broadphase options are defined by :code:`contact::BroadphaseType`:

* :code:`None` (brute-force pairs, useful for debugging or very small scenes)
* :code:`Sap3Axis` (sweep-and-prune, default)
* :code:`MultiBoxPrune` (grid-based broadphase for large worlds)

The current ``contact::ContactSettings`` defaults are:

.. list-table::
   :header-rows: 1
   :widths: 34 66

   * - Setting
     - Default
   * - ``gjkMaxIterations``, ``gjkTolerance``
     - ``32``, ``1e-6``
   * - ``epaMaxIterations``, ``epaTolerance``
     - ``64``, ``1e-4``
   * - ``maxContactsPerPair``
     - ``8``
   * - ``sweptCcdEnabled``
     - ``false``
   * - ``sweptCcdMinSpeed``
     - ``0.0``
   * - ``sweptCcdSpeculativeMargin``
     - ``1e-4``
   * - ``broadphase.type``
     - ``Sap3Axis``
   * - ``broadphase.mbpWorldMin`` / ``mbpWorldMax``
     - ``{-100, -100, -100}`` / ``{100, 100, 100}``
   * - ``broadphase.mbpCellSize``
     - ``{1, 1, 1}``
   * - ``broadphase.mbpPadding``
     - ``0.5``
   * - ``broadphase.mbpMaxCellsPerAxis`` / ``mbpMaxCellsPerObject``
     - ``128`` / ``64``

Example broadphase configuration (MultiBoxPrune):

.. code-block:: cpp

  #include <raisim/World.hpp>
  #include <raisim/contact_engine/contact_engine.h>

  raisim::World world;
  auto settings = world.getContactSettings();
  settings.broadphase.type = contact::BroadphaseType::MultiBoxPrune;
  settings.broadphase.mbpWorldMin = {-50.0, -50.0, -2.0};
  settings.broadphase.mbpWorldMax = { 50.0,  50.0, 10.0};
  settings.broadphase.mbpCellSize = {  1.0,   1.0,  1.0};
  settings.broadphase.mbpUseWorldBounds = true;
  world.setContactSettings(settings);

Collision groups and masks still gate which pairs are considered in both
broadphase and narrowphase.

Contact Solver Settings
=======================

``World::setERP(erp, erp2)`` updates the contact solver's error-reduction
parameters. ``World::setContactSolverParam(alpha_init, alpha_min, alpha_decay,
maxIter, threshold)`` updates the solver configuration. In the current public
API, the alpha arguments are kept for compatibility; the practical knobs are
``maxIter`` and ``threshold``. The solver defaults are ``maxIteration = 150`` and
``error_to_terminate = 1e-8``.

Use ``World::setContactSolverIterationOrder(order)`` when you need a fixed
contact iteration order for determinism. Without an explicit order, the solver
order may flip between integration calls.

Sleeping islands
================
RaiSim can skip simulation for *sleeping islands*: groups of dynamic objects
connected by contacts. Sleeping is **enabled by default**. An island goes to
sleep when all objects in the island remain quiet for a configurable number of
consecutive steps (:code:`quietSteps`, default **2**) and their maximum linear
and angular velocities stay below the configured thresholds (defaults:
**linear 0.002**, **angular 0.01**).

Notes:

* Only **dynamic** objects participate in sleeping islands.
* Any user modification (e.g., changing state) keeps the island awake.
* Contacts between awake and sleeping islands will wake the sleeping island
  on the next step.

Configuration API:

.. code-block:: cpp

  world.setSleepingEnabled(true);
  world.setSleepingParameters(/*linear*/ 0.002, /*angular*/ 0.01, /*quietSteps*/ 2);
  world.setSleepingVelocityThresholds(0.002, 0.01);
  world.wakeObject(obj);   // wakes the object's island
  world.wakeAll();

You can query whether a specific object is sleeping with
:code:`isObjectSleeping`.

API
=========

.. doxygenclass:: raisim::World
   :members:
