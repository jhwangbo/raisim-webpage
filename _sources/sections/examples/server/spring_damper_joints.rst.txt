####################################
Server Example: Spring Damper Joints
####################################

Overview
========
Loads URDFs with spring and damper joints (cartpole and chain) to visualize joint compliance. This example focuses on spring-damper behavior.

Screenshot
==========
.. image:: ../../../image/spring_damper_joints.png
   :alt: spring_damper_joints example
   :width: 100%

Binary
======
Installed executable: ``spring_damper_joints``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/spring_damper_joints

On Windows, run ``spring_damper_joints.exe`` instead.
This example uses RaisimServer. Start ``rayrai_raisim_tcp_viewer`` and connect to port 8080.


Details
=======
- Loads cartpole and chain URDFs with spring/damper joint parameters.
- Demonstrates URDF-based joint spring/damper behavior.
- Focuses on the ball-joint chain for clarity.

