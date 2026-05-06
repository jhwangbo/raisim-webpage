example_model_asset_pipeline
============================

``example_model_asset_pipeline`` demonstrates the current mesh asset pipeline.
It writes a small tetrahedron OBJ under ``/tmp/raisim_model_asset_pipeline_example``,
preprocesses it with ``raisim::Mesh::preprocessMesh``, adds the processed mesh to
a ``raisim::World`` with ``MeshCollisionMode::ORIGINAL_MESH``, exports mesh
assets to OBJ, and writes a RaiSim XML world file.

Run:

.. code-block:: bash


   <raisim-install>/bin/example_model_asset_pipeline

The program prints the preprocessed mesh path, whether the preprocessing result
was a cache hit, exported OBJ paths, and the exported XML path.
