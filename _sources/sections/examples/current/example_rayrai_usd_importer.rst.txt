example_rayrai_usd_importer
===========================

``example_rayrai_usd_importer`` loads the same OpenUSD tutorial assets as
rayrai visual meshes. It creates an offscreen OpenGL context, constructs a
``raisin::RayraiWindow``, loads three USD/USDA assets with ``addVisualMesh``,
waits for asynchronous visual loads to finish, and exits after printing the
number of loaded assets.

Run:

.. code-block:: bash


   <raisim-install>/bin/example_rayrai_usd_importer

This example requires rayrai, SDL2/OpenGL, OpenUSD support, and the bundled USD
assets.
