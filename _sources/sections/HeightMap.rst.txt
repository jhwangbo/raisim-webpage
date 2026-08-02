#############################
Height Map
#############################

A height map is a grid of points that are triangulated to form a surface.
Since it is axis-aligned, collision checking is very efficient and it is a recommended way to create terrain.

Heightmap collision requires identity orientation. Translating a heightmap is
supported, but collision detection raises a fatal error and terminates the
simulation process if a heightmap is rotated. This check is active in every
build configuration. Use a mesh when the terrain surface itself must be
rotated.

You can get the following two properties from a height map instance:

* height: :code:`getHeight()`
* normal vector: :code:`getNormal()`

Runtime updates
===============

``update(...)`` changes the visual and collision height data. The supplied
height vector must contain exactly ``getXSamples() * getYSamples()`` entries;
an invalid-size update is ignored and leaves the existing map unchanged.

For visualization-only streaming, ``updateVisualHeight(...)`` replaces the
full visual height array and ``updateVisualHeightPatch(...)`` updates an
inclusive rectangular sample range without rebuilding collision. The patch
method receives the full row-major height array and copies only the requested
range. Per-vertex colors use ``setColor(...)``; after a full color map has been
initialized, ``setColorPatch(...)`` updates a tightly packed rectangular color
range.

Example
=============================

.. toctree::
   :maxdepth: 2

   HeightMap_example_png
   HeightMap_example_raw_values
   HeightMap_example_terrain_generator
   HeightMap_example_txt

API
====

HeightMap
**********

.. doxygenclass:: raisim::HeightMap
   :members:

Terrain properties
******************

.. doxygenstruct:: raisim::TerrainProperties
   :members:
