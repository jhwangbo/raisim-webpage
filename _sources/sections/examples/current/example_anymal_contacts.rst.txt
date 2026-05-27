example_anymal_contacts
=======================

``example_anymal_contacts`` creates a ``raisim::World``, adds ground, loads
``rsc/anymal/urdf/anymal.urdf``, applies PD gains to the leg joints, and
publishes the simulation through ``raisim::RaisimServer``.

Run ``rayrai_raisim_tcp_viewer`` in one terminal, then run the example in another:

.. code-block:: bash


   <raisim-install>/bin/rayrai_raisim_tcp_viewer
   <raisim-install>/bin/example_anymal_contacts

The example runs for 20 seconds and focuses the viewer on the ANYmal model.
