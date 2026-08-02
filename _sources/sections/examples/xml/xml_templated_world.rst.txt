############################
XML Example: Templated World
############################

.. image:: ../../../image/xml_templated_world.png
   :alt: xml_templated_world example
   :width: 100%


Overview
========
Instantiates a templated XML world with parameter overrides (spawn options, counts, offsets). Use this to see how parameterized XML files can generate variants of a scene without duplicating the XML.

Target
======
CMake target: ``xml_templated_world``.

Run
====
Run the build-tree executable:

.. code-block:: bash

   ./build-examples/examples/xml_templated_world

On Windows, run ``xml_templated_world.exe`` instead.
This example uses RaisimServer. Start ``rayrai_tcp_viewer`` and connect to port 8080.


Details
=======
- Loads a templated XML world and overrides parameters at runtime.
- Uses ``World::ParameterContainer`` to set spawn flags and counts.
- Runs the scene with RaisimServer for visualization.

