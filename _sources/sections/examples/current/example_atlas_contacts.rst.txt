example_atlas_contacts
======================

``example_atlas_contacts`` creates a ``raisim::World`` with a 1 ms timestep,
adds ground, loads ``rsc/atlas/robot.urdf``, initializes Atlas at a raised
configuration, and publishes the simulation through ``raisim::RaisimServer``.

Run the rayrai TCP viewer in one terminal, then run the example in another:

.. code-block:: bash


   <raisim-install>/bin/rayrai_raisim_tcp_viewer
   <raisim-install>/bin/example_atlas_contacts

The example runs for 20 seconds and focuses the viewer on Atlas.
