#############################
Build, Test, and Benchmark
#############################

This page describes the public ``raisim2Lib`` package workflow. The workspace
downloads RaiSim and rayrai as binary packages, then builds examples and
optional wrappers against those packages. It does not contain the RaiSim engine
source tree. For installation and activation, see :doc:`Installation`. For
repository layout and build output paths, see :doc:`ProjectLayout`.

Common CMake options
====================

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - Option
     - Meaning
   * - ``RAISIM_EXAMPLE``
     - Build C++ examples. Enabled by default.
   * - ``RAISIM_PY``
     - Build the Python wrapper.
   * - ``RAISIM_MATLAB``
     - Build the MATLAB wrapper.
   * - ``RAISIM_DOC``
     - Build documentation through CMake.

Build examples
==============

Build the package workspace with examples enabled:

.. code-block:: bash

    cd /path/to/raisim2Lib
    cmake -S . -B build \
      -DCMAKE_BUILD_TYPE=Release \
      -DRAISIM_EXAMPLE=ON
    cmake --build build -j12

You can also build only the example CMake project against an installed RaiSim
and rayrai package:

.. code-block:: bash

    cmake -S examples -B /tmp/raisim2lib-examples \
      -DCMAKE_BUILD_TYPE=Release \
      -DRAISIM_PREFIX=/path/to/raisim \
      -DRAYRAI_PREFIX=/path/to/rayrai
    cmake --build /tmp/raisim2lib-examples -j12

Run examples from the installed package ``bin`` directory or from the example
build directory:

.. code-block:: bash

    <raisim-install>/bin/rayrai_tcp_viewer
    <raisim-install>/bin/primitive_grid
    /tmp/raisim2lib-examples/rayrai_tcp_viewer
    /tmp/raisim2lib-examples/primitive_grid

Timing examples
===============

``raisim2Lib`` includes standalone timing-oriented example executables. The
full source-tree benchmark runner used for RaiSim release validation is not
shipped in this binary-package workspace. Run package timing examples on one
thread and repeat the same command several times when comparing package or scene
changes:

.. code-block:: bash

    cmake --build /tmp/raisim2lib-examples \
      --target anymal_standing_benchmark articulated_system_benchmark \
               granular_media island_sleep_benchmark -j12
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      /tmp/raisim2lib-examples/anymal_standing_benchmark --fast
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      /tmp/raisim2lib-examples/articulated_system_benchmark
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
      /tmp/raisim2lib-examples/island_sleep_benchmark --steps=12000

Use :doc:`Performance` for scene-level tuning guidance and for choosing a
representative package example before changing solver settings or sensor
workloads in a downstream application.

Build the documentation
=======================

Prefer the CMake documentation target when you need API reference blocks,
because CMake can generate Doxygen XML and pass the Breathe project path to
Sphinx:

.. code-block:: bash

    cmake -S /path/to/raisim2Lib/docs -B /tmp/raisim2lib-docs \
      -DRAISIM_DOCS_RAISIM_INCLUDE_DIR=/path/to/raisim2Lib/raisim/include/raisim \
      -DRAISIM_DOCS_RAYRAI_INCLUDE_DIR=/path/to/raisim2Lib/rayrai/include/rayrai
    cmake --build /tmp/raisim2lib-docs -j12

For prose and link checks, the documentation can also be built directly with
Sphinx:

.. code-block:: bash

    /path/to/raisim2Lib/docs/.venv/bin/sphinx-build \
      -b html /path/to/raisim2Lib/docs /tmp/raisim2lib-docs-html

Direct Sphinx builds do not generate Doxygen XML by themselves. They are useful
for quick RST validation, but Breathe API directives will warn unless
``breathe_projects.raisim`` points to generated Doxygen XML.
See :doc:`Troubleshooting` for common warning modes.
