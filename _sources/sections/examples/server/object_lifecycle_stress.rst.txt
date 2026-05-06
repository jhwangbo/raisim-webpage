#######################################
Server Example: Object Lifecycle Stress
#######################################

Overview
========
Stress-tests object lifecycle by creating many primitives, simulating briefly, and then removing them in a loop.

Binary
======
Installed executable: ``object_lifecycle_stress``.

Run
====
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/object_lifecycle_stress

On Windows, run ``object_lifecycle_stress.exe`` instead.
This example runs headless and does not use RaisimServer.


Details
=======
- Repeatedly creates a grid of primitives and then removes them.
- Intended as a stress test for object lifecycle and memory handling.
- Runs headless (no RaisimServer rendering).

