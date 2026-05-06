example_usd_importer
====================

``example_usd_importer`` exercises OpenUSD mesh loading through
``raisim::World::addMesh``. It loads three bundled OpenUSD tutorial assets from
``res/usd``/``rsc`` resources, adds them as mesh collision objects, prints
vertex and triangle counts, and steps the world briefly.

Run:

.. code-block:: bash


   <raisim-install>/bin/example_usd_importer

This example requires the package's OpenUSD runtime and bundled OpenUSD assets.
