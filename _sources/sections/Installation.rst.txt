#############################
Installation
#############################

What This Page Covers
=====================

This page covers installed package paths, environment variables, dependencies,
and license activation for the binary RaiSim distribution.

Dependencies
============

Minimum requirements:

* A supported 64-bit operating system.
* A C++17-capable compiler when building your own application against RaiSim.
* OpenGL runtime support for rayrai.
* SDL2 runtime libraries for rayrai on Linux or macOS when they are not bundled
  with the package.
* Visual Studio 2019 or newer on Windows when compiling downstream C++ projects.

The binary package includes RaiSim and rayrai libraries, headers, tools, and
examples. See the license files distributed with the package for third-party
license details.

Local Install Layout
====================

Local installation is recommended so RaiSim does not conflict with unrelated
system packages. The Linux installer uses:

.. code-block:: bash

    RAISIM_LOCAL_INSTALL_ROOT=${RAISIM_LOCAL_INSTALL_ROOT:-$HOME/raisim2Lib}

The installer places the current architecture into:

.. code-block:: text

    $RAISIM_LOCAL_INSTALL_ROOT/raisim
    $RAISIM_LOCAL_INSTALL_ROOT/rayrai

RaiSim and rayrai are installed as CMake packages. Downstream projects should
point ``CMAKE_PREFIX_PATH`` at the installed package prefix.

Environment Setup
=================

.. tabs::
  .. group-tab:: Linux

    .. code-block:: bash

        export RAISIM_LOCAL_INSTALL_ROOT=$HOME/raisim2Lib
        export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$RAISIM_LOCAL_INSTALL_ROOT/raisim/lib

    Configure downstream CMake projects with:

    .. code-block:: bash

        cmake -S . -B build -DCMAKE_PREFIX_PATH=$RAISIM_LOCAL_INSTALL_ROOT/raisim

  .. group-tab:: macOS

    .. code-block:: bash

        export RAISIM_LOCAL_INSTALL_ROOT=$HOME/raisim2Lib
        export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:$RAISIM_LOCAL_INSTALL_ROOT/raisim/lib

    Configure downstream CMake projects with:

    .. code-block:: bash

        cmake -S . -B build -DCMAKE_PREFIX_PATH=$RAISIM_LOCAL_INSTALL_ROOT/raisim

  .. group-tab:: Windows

    Add the installed RaiSim ``bin`` directory to ``Path``. Configure downstream
    CMake projects with:

    .. code-block:: powershell

        cmake -S . -B build -DCMAKE_PREFIX_PATH=C:\path\to\raisim

Activation Key
==============

Rename the activation key received by email to ``activation.raisim`` and place
it in:

* Linux and macOS: ``$HOME/.raisim/activation.raisim``
* Windows: ``C:\Users\<YOUR-USERNAME>\.raisim\activation.raisim``

RaiSim also checks the path passed to
``raisim::World::setActivationKey()``. If that file is not found, it falls back
to the user-directory location above.

Rayrai
======

rayrai is the supported visualizer for current RaiSim. There are two usage
modes:

* ``rayrai_raisim_tcp_viewer`` connects to applications that publish a
  ``raisim::World`` through ``raisim::RaisimServer``.
* In-process rayrai examples create ``raisin::RayraiWindow`` directly for
  screenshots, RGB/depth rendering, PBR assets, HDR lighting, and offscreen
  workflows.

RaisimUnity and RaisimUnreal are legacy integrations and are no longer the
supported visualization path.

Blender and glTF Assets
=======================

For Blender-authored scenes, use the general exporter:

.. code-block:: bash

    blender --background scene.blend \
      --python /path/to/raisim2Lib/scripts/export_blender_scene.py \
      -- --format glb --output /path/to/scene.glb

The exporter writes renderable glTF/GLB scenes, keeps Z-up coordinates for
RaiSim/rayrai, and emits ``*.rayrai_lights.json`` sidecars for Blender area
lights.
