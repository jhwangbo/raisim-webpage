#############################
Contact and Collision
#############################

Collision Group and Mask
=========================

Collision groups and masks in RaiSim use bit operations, as in most other physics engines. The example below is self-explanatory.

.. code-block:: cpp

  raisim::World world;
  auto sphere0 = world.addSphere(1, 1, "default", raisim::COLLISION(0), raisim::COLLISION(0) | raisim::COLLISION(1));
  auto sphere1 = world.addSphere(1, 1, "default", raisim::COLLISION(1), raisim::COLLISION(0) | raisim::COLLISION(1));
  auto sphere2 = world.addSphere(1, 1, "default", raisim::COLLISION(2), raisim::COLLISION(1));
  auto sphere3 = world.addSphere(1, 1, "default", raisim::COLLISION(3), -1);

In the above example, ``sphere0`` is in collision group 0 and can collide with collision group 0 and 1.
``sphere1`` is in collision group 1 and can collide with collision group 0 and 1.
``sphere2`` is in collision group 2 and can collide with collision group 1.
``sphere3`` is in collision group 3 and can collide with any object (-1 means all groups).

**The collision group and mask use AND logic**.
For A and B to collide, A must be able to collide with B and vice versa.

``sphere0`` can collide with ``sphere1``.
``sphere1`` cannot collide with ``sphere2`` (both conditions must be satisfied).
``sphere3`` cannot collide with any objects (because ``sphere0``, ``sphere1`` and ``sphere2`` cannot collide with the collision group 3).

By default, movable objects are in collision group 1 and can collide with anything (collision mask = -1).
All static objects (e.g., ground and heightmap) are in collision group 63 and can collide with anything.

Contacts
=========================

:code:`raisim::Object` (and thus :code:`raisim::ArticulatedSystem` and :code:`raisim::SingleBodyObject`) have a method :code:`getContacts` which returns the list of contacts.
For example,

.. code-block:: cpp

  auto& contactsOnAnymal = anymal->getContacts();

The Contact class is header-only and can be found at :code:`include/raisim/contact/Contact.hpp`.

Note that all vector quantities are expressed in the respective **Contact Frame**.
A contact frame is defined such that its z-axis is colinear with the contact normal and its origin is at the contact point. 
Its x- and y-axes are chosen arbitrarily.
Here is a more detailed example:

.. code-block:: cpp

  /// Check all contact impulses acting on "LF_SHANK"
  auto footIndex = anymal->getBodyIdx("LF_SHANK");

  /// For all contacts on the robot, check ...
  for(auto& contact: anymal->getContacts()) {
    if (contact.skip()) continue; /// if the contact is internal, one contact point is set to 'skip'
    if ( footIndex == contact.getlocalBodyIndex() ) {
      std::cout<<"Contact impulse in the contact frame: "<<contact.getImpulse()->e()<<std::endl;
      /// the impulse acts from objectB to objectA. You can check if this object is objectA or B by:
      std::cout<<"is ObjectA: "<<contact.isObjectA()<<std::endl;
      std::cout<<"Contact frame: \n"<<contact.getContactFrame().e().transpose()<<std::endl;
      /// the contact frame is transposed.
      std::cout<<"Contact impulse in the world frame: "<<contact.getContactFrame().e().transpose() * contact.getImpulse()->e()<<std::endl;
      std::cout<<"Contact Normal in the world frame: "<<contact.getNormal().e().transpose()<<std::endl;
      std::cout<<"Contact position in the world frame: "<<contact.getPosition().e().transpose()<<std::endl;
      std::cout<<"It collides with: "<<world.getObject(contact.getPairObjectIndex())<<std::endl;
      if (contact.getPairObjectBodyType() != raisim::BodyType::STATIC) {
        /// Static objects do not store contacts, so check whether the pair object is static.
        /// This saves computation in RaiSim.
        world.getObject(contact.getPairObjectIndex())->getContacts(); /// You can use the same methods on the pair object
      }
      std::cout<<"See Contact.hpp for the full list of methods"<<std::endl;
    }
  }

Collision detection details
===========================
For a detailed breakdown of collision pairs, narrowphase algorithms, and
per-pair contact counts, see the :doc:`CollisionDetection` section.

Contact Solver Notes
====================

RaiSim uses a bisection-based per-contact solver for rigid contacts, closed-loop
pin constraints, and hard length constraints. ``World::setContactSolverParam``
still accepts the historical alpha arguments, but the current implementation
keeps the three alpha values fixed internally; only ``maxIter`` and
``threshold`` affect the solver configuration. ``World::setERP`` controls the
position-error reduction terms used by the contact solve.

The solver warm-starts ordinary rigid contacts from the previous converged
solve when the object pair and contact position still match. The cached impulse
is stored in world coordinates and projected into the current contact frame and
friction cone before it is applied. Warm-start data is intentionally not reused
after a non-converged or stalled solve.

Particle-style contacts are handled differently. Deformable and granular
contacts use particle/vertex ids as solver point ids, and those ids are not
persistent contact-list indices. The contact solver therefore does not
warm-start deformable or granular contacts; they use the exact re-solve path
each step. This avoids treating a particle id as an index into
``Object::getContacts()`` and keeps particle contacts independent of contact
list layout.

``World::setContactSolverIterationOrder(order)`` sets the starting sweep
direction for the next contact solve. The bisection solver then flips the stored
direction after each solve, so subsequent solves alternate between forward and
reverse sweeps unless the application sets the starting direction again.

API
=========
You can get a vector of collisions on an object using ``raisim::Object::getContacts``.
Each element in the vector has the following API:

.. doxygenclass:: raisim::Contact
   :members:
