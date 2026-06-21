#############################
Project Layout
#############################

``raisim2Lib`` is the public package workspace. It downloads and uses binary
RaiSim and rayrai packages, then provides examples, wrappers, resources, and
documentation around those packages. It is not the RaiSim engine source tree,
so engine-internal benchmark sources and implementation files are not available
here. This page maps the directories users most often need while installing the
package and building examples.

Source Directories
==================

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - Path
     - Purpose
   * - ``raisim``
     - Platform-specific binary RaiSim package with headers, libraries, and
       CMake config files.
   * - ``rayrai``
     - Platform-specific binary rayrai package with the renderer library, TCP
       viewer runtime, headers, and CMake config files.
   * - ``examples``
     - C++ example sources and their CMake project. Targets use installed
       executable names such as ``primitive_grid`` and ``rayrai_tcp_viewer``.
   * - ``rsc``
     - Runtime resources such as robot models, meshes, textures, USD/glTF
       assets, and example data.
   * - ``raisimPy``
     - Optional Python wrapper build for the binary RaiSim package.
   * - ``raisimGymTorch``
     - Reinforcement-learning package built against the binary RaiSim package.
   * - ``docs``
     - Sphinx documentation sources and generated example pages.
   * - ``third_party``
     - Third-party code used by optional wrappers and docs tooling.
   * - ``cmake``
     - CMake helpers for package discovery and local installation.

Build Directories
=================

Build directories are not part of the source tree. The docs use these names for
clarity:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Build directory
     - Typical use
   * - ``build``
     - Default local build for examples and optional wrappers.
   * - ``build-examples``
     - Common local build directory for the example CMake project.
   * - ``build-debug``
     - Debug build for local debugging.
   * - ``build-docs``
     - CMake-driven docs build.

On Linux and macOS, example executables built from ``raisim2Lib/examples`` are
placed under the example build tree. Installed binary-package executables are
under ``<raisim-install>/bin``. For example:

.. code-block:: bash

    ./build-examples/primitive_grid
    ./build-examples/rayrai_tcp_viewer
    <raisim-install>/bin/primitive_grid
    <raisim-install>/bin/rayrai_tcp_viewer

On Windows, CMake places runtime executables under ``<build-dir>/bin``.

The package example tree documented under :doc:`Examples` contains grouped
source directories such as ``src/server``, ``src/rayrai``, ``src/worlds``, and
``src/xml``. Target names, not source directory names, are the stable
user-facing interface.

Installed Package Layout
========================

A local install creates separate package prefixes for RaiSim and rayrai:

.. code-block:: text

    $RAISIM_LOCAL_INSTALL_ROOT/raisim
    $RAISIM_LOCAL_INSTALL_ROOT/rayrai

Downstream projects use ``CMAKE_PREFIX_PATH`` to find these installed packages.
See :doc:`Installation` for environment setup and activation.

Where To Add New Things
=======================

.. list-table::
   :header-rows: 1
   :widths: 38 62

   * - Change
     - Usual location
   * - New user-facing C++ example
     - ``examples/src`` plus a target registration in ``examples/CMakeLists.txt``.
   * - New example resource
     - ``rsc`` or ``examples/rsc``, depending on whether it is shared package
       data or example-only data.
   * - New Python wrapper behavior
     - ``raisimPy``.
   * - New RL package behavior
     - ``raisimGymTorch``.
   * - New docs page
     - ``docs/sections`` and the relevant ``toctree`` in ``index.rst`` or a
       section index page.

Keep examples focused on demonstrating the public binary-package APIs.
