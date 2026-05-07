#############################
Installation
#############################

What This Page Covers
=====================

This page covers installed package paths, environment variables, build commands
for examples and ``raisimPy``, dependencies, and license activation for the
binary RaiSim2 distribution. Get RaiSim2 from
``https://github.com/raisimTech/raisim2Lib``; it is distributed as binary
libraries with headers, examples, rayrai tools, and documentation.

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

Download
========

Download the RaiSim2 binary package for your platform from:

.. code-block:: text

    https://github.com/raisimTech/raisim2Lib

Unpack the package to a local directory such as ``$HOME/raisim2Lib`` on
Linux/macOS or ``C:\raisim`` on Windows. Keep the package directories together;
examples and rayrai tools expect the bundled assets to remain next to the
installed binaries.

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

RaiSim and rayrai are installed as CMake packages. Downstream projects that use
only physics should point ``CMAKE_PREFIX_PATH`` at the RaiSim package prefix.
Projects that use rayrai should include both prefixes.

Environment Setup
=================

.. tabs::
  .. group-tab:: Linux

    .. code-block:: bash

        cd $HOME/raisim2Lib
        source ./raisim_env.sh

    ``raisim_env.sh`` adds both ``raisim/lib`` and ``rayrai/lib`` to
    ``LD_LIBRARY_PATH``. Configure and build this source tree with examples and
    ``raisimPy`` enabled:

    .. code-block:: bash

        cmake -S . -B build \
          -DRAISIM_EXAMPLE=ON \
          -DRAISIM_PY=ON
        cmake --build build -j

    ``RAISIM_EXAMPLE`` is enabled by default. ``RAISIM_PY`` must be enabled
    explicitly when you want the Python wrapper.

  .. group-tab:: macOS

    .. code-block:: bash

        cd $HOME/raisim2Lib
        source ./raisim_env.sh

    ``raisim_env.sh`` adds both ``raisim/lib`` and ``rayrai/lib`` to
    ``DYLD_LIBRARY_PATH``. Configure and build this source tree with examples
    and ``raisimPy`` enabled:

    .. code-block:: bash

        cmake -S . -B build \
          -DRAISIM_EXAMPLE=ON \
          -DRAISIM_PY=ON
        cmake --build build -j

    ``RAISIM_EXAMPLE`` is enabled by default. ``RAISIM_PY`` must be enabled
    explicitly when you want the Python wrapper.

  .. group-tab:: Windows

    Run ``raisim_env.bat`` or add the installed RaiSim and rayrai ``bin``
    directories to ``Path``. Configure and build this source tree with examples
    and ``raisimPy`` enabled:

    .. code-block:: powershell

        cmake -S . -B build -DRAISIM_EXAMPLE=ON -DRAISIM_PY=ON
        cmake --build build --config Release

Build And Install
=================

Use this command sequence when you want examples and ``raisimPy`` from the local
``raisim2Lib`` tree:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh
    cmake -S . -B build \
      -DRAISIM_EXAMPLE=ON \
      -DRAISIM_PY=ON
    cmake --build build -j

Installation is optional for running examples from the build tree. If you do
install, choose a prefix you can write to instead of relying on CMake's default
``/usr/local``:

.. code-block:: bash

    cmake --install build --prefix $HOME/raisim2Lib/install

For downstream C++ projects that use both RaiSim and rayrai, configure with both
package prefixes from the unpacked ``raisim2Lib`` tree:

.. code-block:: bash

    export RAISIM_ROOT=$HOME/raisim2Lib
    cmake -S . -B build -DCMAKE_PREFIX_PATH="$RAISIM_ROOT/raisim;$RAISIM_ROOT/rayrai"
    cmake --build build -j

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

* ``rayrai_tcp_viewer`` connects to applications that publish a
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
      --python $HOME/raisim2Lib/scripts/export_blender_scene.py \
      -- --format glb --output /path/to/scene.glb

The exporter writes renderable glTF/GLB scenes, keeps Z-up coordinates for
RaiSim/rayrai, and emits ``*.rayrai_lights.json`` sidecars for Blender area
lights.
