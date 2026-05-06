#############################
Objects
#############################

Body types
===============

RaiSim uses ``BodyType`` to describe whether a body or particle is integrated
as a dynamic state, moved kinematically, or treated as static collision
geometry. There are three available body types:

1. ``DYNAMIC``: can have a velocity, has finite mass
2. ``KINEMATIC``: can have a velocity, has infinite mass (e.g., conveyor belt)
3. ``STATIC``: cannot have a velocity, has infinite mass (e.g., wall)

``SingleBodyObject`` instances can be any of the three body types.
``ArticulatedSystem`` instances are dynamic, except fixed-base systems can
report static base bodies. ``DeformableObject`` particles are dynamic unless
they are pinned, in which case the pinned particle reports ``STATIC``.
``GranularSystem`` particles are dynamic unless they are marked fixed, in which
case the fixed particle reports ``STATIC``.

You can get or set the body type using:

* ``setBodyType(BodyType type)``
* ``getBodyType()`` or ``getBodyType(body_index)``

For multi-body or multi-particle objects, pass the local body/particle index to
``getBodyType(localIdx)`` when querying a specific element.

Object Identity And Indices
===========================

Every object has both a world index and a stable id:

* ``getIndexInWorld()`` is the object's current position in
  ``World::getObjects()``. It is useful for iterating the current world state,
  but it can change when objects are removed and the world's object list is
  compacted.
* ``getId()`` is assigned by ``World`` and remains stable for the lifetime of
  the object. Use it for runtime scene editing, visualizer bookkeeping, or
  application-side maps that must survive object-list compaction.

Local indices are separate from both of these. A ``SingleBodyObject`` has local
index ``0``. ``ArticulatedSystem`` local indices refer to links. ``DeformableObject``
and ``GranularSystem`` local indices refer to particles.

Name
===============

All objects can be named.
These names are used by visualizers.
`raisim::World` provides functionality to retrieve an object by name.
Here is an example.

.. code:: cpp

    auto sphere = world.addSphere(1,1);
    sphere->setName("sphere");
    std::string name = sphere->getName();
    auto same_sphere = world.getObject("sphere");

Types
===============

The common base class is ``raisim::Object``. Concrete object families include:

* ``SingleBodyObject``: primitive and mesh rigid bodies with one body index.
* ``ArticulatedSystem``: URDF/MJCF-style multi-body robots and mechanisms.
* ``DeformableObject``: XPBD/PBD cloth, shell, and coarse soft-body objects.
* ``GranularSystem``: many spherical grains stored and stepped as one object.

.. toctree::
   :maxdepth: 2

   ArticulatedSystem
   SingleBodyObjects
   DeformableObject
   GranularMedia

Contacts And External Forces
============================

``getContacts()`` returns the contacts accumulated on an object during the last
world step. Contact point ids are local to that contact list and can be passed
to ``getContactPointVel(pointId, vel)`` to query the world-frame contact-point
velocity.

External forces and torques use local body or particle indices:

.. code-block:: cpp

    object->setExternalForce(localIdx, {0.0, 0.0, 5.0});
    object->setExternalTorque(localIdx, {0.0, 0.0, 0.2});
    object->clearExternalForcesAndTorques();

For rigid bodies and articulated links, ``setExternalForce(localIdx, pos, force)``
applies a world-frame force at a body-frame position. For particle-like objects
such as deformables and granular systems, use the particle index as ``localIdx``.

Threaded Visualization
======================

``Object`` exposes ``lockMutex``/``unlockMutex`` and ``lock``/``unlock`` for
applications that update object state while a visualizer or another thread is
reading it. Prefer ``std::scoped_lock`` in user code so exceptions or early
returns do not leave the object locked:

.. code-block:: cpp

    std::scoped_lock guard(*object);
    object->setName("updated_name");

API
=========

.. doxygenclass:: raisim::Object
   :members:
