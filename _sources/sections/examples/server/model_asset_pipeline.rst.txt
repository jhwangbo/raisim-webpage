####################################
Server Example: Model Asset Pipeline
####################################

Overview
========
Demonstrates the model import and export pipeline from a regular server-side
RaiSim example.

Use this example when preparing mesh assets for simulation. The mesh processing
is intentionally done by the RaiSim asset APIs so application code only calls
``preprocessMesh``, ``addMesh``, and export helpers.

Binary
======
Installed executable: ``model_asset_pipeline``.

This example is only built when the installed RaiSim package exposes
``raisim::Mesh::preprocessMesh`` and ``World::exportMeshAssetsToObj``.

Run
===
Run the installed executable:

.. code-block:: bash

   <raisim-install>/bin/model_asset_pipeline

On Windows, run ``model_asset_pipeline.exe`` instead.
This example is non-visual and prints the generated asset paths.

Details
=======
- Runs mesh preprocessing before adding the mesh to the world.
- Adds the generated mesh asset through ``World::addMesh``.
- Exports mesh assets from the world to OBJ files.
- Keeps the workflow in ``addMesh`` and the asset APIs instead of duplicating
  mesh processing in application code.

Generated files
===============
The example writes temporary output under:

.. code-block:: bash


   /tmp/raisim_model_asset_pipeline_example

The output includes:

- a small source OBJ created by the example,
- a preprocessed mesh in a cache directory,
- exported OBJ files from the RaiSim world, and
- an XML world file that references the resulting scene.

API pattern
===========

.. code-block:: cpp


   raisim::Mesh::PreprocessOptions options;
   auto result = raisim::Mesh::preprocessMesh(inputObj, options);
   auto* mesh = world.addMesh(result.outputPath, mass, scale);
   auto exported = world.exportMeshAssetsToObj(outputDirectory);

The preprocessing result includes cache-hit information and output paths, so a
toolchain can skip repeated work when the source mesh and options have not
changed.

