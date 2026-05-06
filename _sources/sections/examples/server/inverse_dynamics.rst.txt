################################
Server Example: Inverse Dynamics
################################

.. image:: ../../../image/inverse_dynamics.png
   :alt: inverse_dynamics example
   :width: 100%


Overview
========
Enables inverse dynamics on ANYmal and prints the resulting joint forces and torques. It compares inverse dynamics outputs to the applied generalized forces.

Binary
======
Installed executable: ``inverse_dynamics``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/inverse_dynamics

On Windows, run ``inverse_dynamics.exe`` instead.
This example uses RaisimServer. Start the rayrai TCP viewer and connect to port 8080. RaisimUnity and RaisimUnreal are no longer supported.


Details
=======
- Enables inverse dynamics and applies external forces on the robot.
- Reads joint forces/torques in the world frame after integration.
- Prints inverse-dynamics results alongside commanded torques.

