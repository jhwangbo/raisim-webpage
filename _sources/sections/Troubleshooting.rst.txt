#############################
Troubleshooting
#############################

This page covers common issues when using the binary RaiSim distribution.

Executable Not Found
====================

When you build examples from the ``raisim2Lib`` source tree, CMake places them
under the build directory:

.. code-block:: bash

    ./build/examples/primitive_grid
    ./build/examples/rayrai_tcp_viewer

If a command from old docs uses an ``example_`` prefix, check :doc:`Examples`
for the current target name.

Missing Shared Libraries
========================

For installed packages and local builds, source the environment script before
running examples, rayrai tools, applications, or importing ``raisimPy``:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh

The script adds both RaiSim and rayrai libraries to the platform loader path.
On macOS this is ``DYLD_LIBRARY_PATH``. On Linux this is ``LD_LIBRARY_PATH``.
Because this is a per-terminal shell setting, source the script again in every
new terminal before starting a viewer, an example, or Python with ``raisimPy``.

Activation Key Not Found
========================

Place the activation key at:

.. code-block:: text

    $HOME/.raisim/activation.raisim

or pass an explicit path before creating worlds:

.. code-block:: cpp

    raisim::World::setActivationKey("/absolute/path/to/activation.raisim");

TCP Viewer Does Not Connect
===========================

Check these points:

* The simulation must create ``raisim::RaisimServer`` and call
  ``launchServer``.
* The server-based example and ``rayrai_tcp_viewer`` must use the same
  port. The default is ``8080``.
* Start the simulation and viewer from the same installed RaiSim version.

The TCP viewer receives world state only. It does not write RGB/depth rendered
images back into RaiSim sensor buffers.

rayrai Window Or Offscreen Context Fails
========================================

rayrai requires a working OpenGL context. On Linux, make sure OpenGL and SDL2
development/runtime packages are available. On headless systems, use the
offscreen context helpers documented in :doc:`Rayrai` and verify that the
machine provides a usable software or hardware OpenGL stack.

Example Asset Missing
=====================

Examples expect their bundled assets to stay next to the installed package. If
an example cannot find a URDF, mesh, texture, heightmap, or USD asset, verify
that the package ``rsc`` or asset directory was copied together with ``bin`` and
``lib``.

OpenUSD Runtime Or Plugin Missing
=================================

USD mesh loading uses the bundled OpenUSD runtime. Keep the installed
``openusd`` directory and USD shared libraries next to the RaiSim binaries:
``raisim/lib/openusd`` on Linux, and ``raisim/bin/openusd`` plus the ``usd_*.dll``
files on Windows.

If an executable is launched from another directory, run the package environment
script first so the runtime loader can find RaiSim and OpenUSD. Source builds
fail during CMake configuration when the matching ``prebuilt/openusd`` runtime
is missing; regenerate that prebuilt package instead of disabling USD support.
