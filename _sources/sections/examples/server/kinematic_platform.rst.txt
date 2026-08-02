##################################
Server Example: Kinematic Platform
##################################

Overview
========
Creates a kinematic ground platform that moves sinusoidally under an ANYmal. It demonstrates kinematic bodies and their interaction with dynamic robots.

Screenshot
==========
.. image:: ../../../image/kinematic_platform.png
   :alt: kinematic_platform example
   :width: 100%

Target
======
CMake target: ``kinematic_platform``.

Run
====
Run the build-tree executable:

.. code-block:: bash

   ./build-examples/examples/kinematic_platform

On Windows, run ``kinematic_platform.exe`` instead.
This example uses RaisimServer. Start ``rayrai_tcp_viewer`` and connect to port 8080.


Details
=======
- Creates a kinematic ground platform (infinite mass) and moves it sinusoidally.
- Places ANYmal on top with PD posture control.
- Demonstrates ``BodyType::KINEMATIC`` and prescribed motion.

