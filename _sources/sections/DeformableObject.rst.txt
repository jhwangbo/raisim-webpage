#############################
Deformable Objects
#############################

``raisim::DeformableObject`` is RaiSim's XPBD/PBD deformable-body object.
It is intended for fast simulation and data-generation workloads that need
cloth, soft shells, or coarse volumetric proxies without leaving RaiSim's
single-threaded stepping model.

The implementation uses distance constraints between particles and optional
isometric bending constraints between adjacent triangles. Collision is handled
by one aggregate deformable object in the broad phase, with spherical particle
proxies used internally for contact generation. This keeps deformable objects
cheap to register in the world while still allowing particle-level contacts
against the ground, rigid bodies, and other deformable objects.

API Surface
===========

The public constructors are exposed through ``raisim::World``:

* ``World::addDeformableCloth(vertices, triangles, pinnedVertices, material, contactMaterial, collisionGroup, collisionMask)``
  creates a deformable cloth or shell directly from world-space particle
  positions and triangle indices.
* ``World::addDeformableCloth(meshFileInObjFormat, scale, pinnedVertices, material, contactMaterial, collisionGroup, collisionMask)``
  loads an OBJ mesh as a surface cloth/shell.
* ``World::addDeformableObject(meshFileInObjFormat, material, options, pinnedVertices, contactMaterial, collisionGroup, collisionMask)``
  loads an OBJ mesh with ``MeshBuildOptions`` for surface particles, filled
  particles, and optional internal struts.

All three creation paths register one ``DeformableObject`` in the world.
Particle-level operations use local particle indices. Pinned particles report
``BodyType::STATIC`` through ``getBodyType(localIdx)``; all other particles
report ``BodyType::DYNAMIC``.

Data Model
==========

The simulated state is particle based:

* ``getNumParticles()`` returns the number of particles.
* ``getPositions()`` returns world-space particle positions.
* ``getTriangles()`` returns the visual/surface triangle topology.
* ``getVisualPosition(idx)`` returns the particle position plus any visual
  offset created by filled-mesh construction.
* ``getDistanceConstraintCount()`` and ``getBendingConstraintCount()`` expose
  the generated constraint counts for diagnostics.
* ``getCollisionBodyCount()`` is normally ``1`` because one aggregate collision
  body represents the deformable object in the broad phase.

The collision proxy radius is not the visual mesh thickness. It controls the
spherical particle contacts used by the solver. If visual geometry appears to
touch but contacts are weak or delayed, check ``collisionRadius`` and particle
spacing before increasing stiffness.

Creating A Deformable Object
============================

Explicit vertices
-----------------

Use ``World::addDeformableCloth`` when you already have particle positions and
surface triangle indices. The vertices are in world coordinates.

.. code-block:: cpp

    std::vector<raisim::Vec<3>> vertices = {
        {-0.5, -0.5, 1.0},
        { 0.5, -0.5, 1.0},
        { 0.5,  0.5, 1.0},
        {-0.5,  0.5, 1.0}};

    std::vector<raisim::DeformableObject::Triangle> triangles = {
        {0, 1, 2},
        {0, 2, 3}};

    raisim::DeformableObject::Material material;
    material.totalMass = 1.0;
    material.distanceCompliance = 1.0e-5;
    material.bendCompliance = 1.0e-5;
    material.damping = 0.02;
    material.collisionRadius = 0.01;
    material.iterations = 6;

    auto* cloth = world.addDeformableCloth(vertices, triangles, {}, material);

Mesh surface particles
----------------------

Use ``World::addDeformableObject`` with ``MeshParticleOptions::Mode::Surface``
when the simulated particles should be the OBJ mesh vertices.

.. code-block:: cpp

    raisim::DeformableObject::MeshBuildOptions build;
    build.particles.mode = raisim::DeformableObject::MeshParticleOptions::Mode::Surface;
    build.particles.scale = 1.0;

    auto* shell = world.addDeformableObject("soft_shell.obj", material, build);
    shell->setPositionOffset({0.0, 0.0, 1.0});

OBJ polygon faces are triangulated as a fan. Texture and normal indices are
ignored. This mode is suitable for cloth and shell meshes.

Filled mesh particles
---------------------

Use ``MeshParticleOptions::Mode::Filled`` for a closed OBJ triangle mesh that
should receive interior particles. RaiSim samples interior particles on a
regular grid controlled by ``spacing``.

.. code-block:: cpp

    raisim::DeformableObject::MeshBuildOptions build;
    build.particles.mode = raisim::DeformableObject::MeshParticleOptions::Mode::Filled;
    build.particles.scale = 1.0;
    build.particles.spacing = 0.05;
    build.particles.maxFillParticles = 50000;

    auto* softBody = world.addDeformableObject("closed_cube.obj", material, build);
    softBody->setPositionOffset({0.0, 0.0, 1.0});

Filled mode requires a closed triangle mesh. It is intended for feasible,
watertight meshes with a meaningful inside/outside volume. If the mesh is not
closed, construction fails instead of guessing an interior.

When using filled mode, tune ``spacing`` and ``maxFillParticles`` together.
Smaller spacing increases particle count and usually improves shape support,
but it also increases contact and constraint cost. ``maxFillParticles`` is a
safety cap; if the requested spacing would generate too many particles, use a
larger spacing or a simpler mesh instead of silently accepting an unexpectedly
large model.

Internal struts
---------------

Internal struts are additional distance constraints used to preserve a rest
shape and provide bounce/recovery for soft shells or filled objects.

.. code-block:: cpp

    raisim::DeformableObject::MeshBuildOptions build;
    build.particles.mode = raisim::DeformableObject::MeshParticleOptions::Mode::Filled;
    build.particles.spacing = 0.05;
    build.internalStruts.mode =
        raisim::DeformableObject::InternalStrutOptions::Mode::PairsWithinRadius;
    build.internalStruts.radius = 0.09;

    auto* softBody = world.addDeformableObject("closed_cube.obj", material, build);

You can also add constraints after construction:

.. code-block:: cpp

    softBody->addDistanceConstraint(0, 7);
    softBody->addDistanceConstraints({{0, 6}, {1, 7}});
    softBody->addInternalStruts(build.internalStruts);

Manual constraints are useful for adding diagonal support to coarse shells.
They use current particle positions as the rest configuration, so add them
immediately after construction or after intentionally placing the object in its
desired rest pose.

Material Parameters
===================

``DeformableObject::Material`` controls mass, solver behavior, collision proxy
size, and elastic response:

* ``totalMass``: total mass distributed uniformly over all particles.
* ``distanceCompliance``: XPBD distance compliance. ``0`` is rigid; larger
  values are softer. Negative values preserve legacy behavior by using
  ``1 / distanceStiffness``.
* ``distanceStiffness``: legacy stiffness parameter. Prefer
  ``distanceCompliance`` for new code.
* ``bendCompliance``: XPBD isometric bending compliance for adjacent triangle
  pairs. ``0`` is rigid; larger values allow easier folding. Negative values
  disable bending unless ``bendStiffness`` is positive.
* ``bendStiffness``: legacy bending stiffness parameter. Prefer
  ``bendCompliance`` for new code.
* ``youngsModulus``: Young's modulus in Pa. If positive, per-edge XPBD
  compliance is derived from rest length and effective area.
* ``poissonRatio``: stored and validated for elastic material definitions.
  The current distance-constraint model does not implement a volumetric
  shear/Poisson model.
* ``thickness``: surface thickness used to derive an effective area from each
  edge length when ``youngsModulus`` is positive and ``crossSectionArea`` is not
  set.
* ``crossSectionArea``: effective area for each distance constraint. If
  positive, this overrides the thickness-based estimate.
* ``damping``: per-step velocity damping in ``[0, 1]``.
* ``collisionRadius``: radius of each internal particle collision proxy.
* ``iterations``: number of constraint projection iterations per substep.
* ``substeps``: number of deformable substeps per RaiSim world step.
* ``solverMode``: ``XPBD`` by default; ``PBD`` is also available.

Elastic Modulus
===============

For engineering-style material input, set ``youngsModulus`` instead of
``distanceCompliance``:

.. code-block:: cpp

    raisim::DeformableObject::Material material;
    material.totalMass = 1.0;
    material.youngsModulus = 5.0e4;
    material.poissonRatio = 0.3;
    material.thickness = 0.02;
    material.collisionRadius = 0.01;

When ``youngsModulus > 0``, RaiSim computes each distance-constraint compliance
as:

.. math::

    \alpha = \frac{L}{E A}

where ``L`` is the rest length, ``E`` is ``youngsModulus``, and ``A`` is either
``crossSectionArea`` or the thickness-derived area. Larger ``youngsModulus``
therefore produces a stiffer object.

Pinned Vertices And Forces
==========================

Pinned vertices are fixed in world coordinates and are exposed to collision as
static proxies. They can be specified at construction time or changed later:

.. code-block:: cpp

    cloth->pinVertex(0);
    cloth->unpinVertex(0, 0.01);

External forces can be applied per particle with the standard ``Object``
interface:

.. code-block:: cpp

    softBody->setExternalForce(3, {0.0, 0.0, 2.0});
    softBody->clearExternalForcesAndTorques();

``unpinVertex(idx, mass)`` restores a finite mass for that particle. Use a
positive mass that is consistent with the surrounding particles; an extremely
small mass makes the particle hard to move, while a very large mass can make
the local constraints dominate the rest of the object.

Solver Tuning
=============

Start with the largest stable time step your application needs, then tune in
this order:

1. Choose a particle spacing that resolves the shape at the level your task
   actually observes.
2. Set ``collisionRadius`` so neighboring particle proxies cover the surface
   without making the visual mesh appear inflated.
3. Increase ``iterations`` until distance constraints converge enough for the
   task.
4. Increase ``substeps`` when contacts are jittery or high-speed impacts create
   excessive penetration.
5. Reduce ``distanceCompliance`` or increase ``youngsModulus`` only after the
   discretization and solver budget are reasonable.

``XPBD`` is the recommended default because compliance is less dependent on the
number of iterations than legacy PBD stiffness. Use ``PBD`` mainly for
backward-compatible behavior or controlled comparisons.

Common failure modes:

* Exploding or jittering contacts usually mean the time step is too large for
  the stiffness/contact radius combination.
* A cloth that stretches too much needs lower ``distanceCompliance`` or more
  iterations.
* A cloth that folds too easily needs lower ``bendCompliance`` or a positive
  legacy ``bendStiffness``.
* Filled objects that collapse need more internal struts, smaller spacing, or
  higher elastic stiffness.

Validation

Rayrai Visualization
====================

``RaisimServer`` serializes deformable objects as dynamic ``Shape::Mesh``
visuals for ``visualizer/rayrai``. The first visualizer packet sends the object
name, triangle topology, and current vertex positions. Later packets keep the
same topology and stream updated vertex positions only. Rayrai rebuilds the
custom OpenGL mesh, recomputes normals from the triangle list, and renders the
deformable surface in world coordinates.

The particle collision proxies are an internal physics representation and are
not rendered as one sphere per vertex. The visible mesh can therefore be smaller
or larger than the collision proxy envelope by approximately ``collisionRadius``.
For stacked soft cubes or other closed shapes, choose particle spacing and
``collisionRadius`` together: neighboring particle spheres should cover the
surface without leaving gaps, but the radius should not be so large that the
visual mesh appears to float far outside the collision envelope.

Limitations
===========

This is still an experimental implementation. It does not yet include
tetrahedral finite elements, deformable self-collision, or topology-changing
visual mesh updates in ``RaisimServer``. Swept CCD is available for rigid body
contact settings, but deformable particle contacts use the discrete collision
path described above.

API Reference
=============

.. doxygenclass:: raisim::DeformableObject
   :members:
