#############################
Troubleshooting
#############################

This page covers common issues when using the binary RaiSim distribution.

Executable Not Found
====================

Binary packages place tools and examples in the package ``bin`` directory:

.. code-block:: bash

    <raisim-install>/bin/example_anymal_contacts
    <raisim-install>/bin/rayrai_raisim_tcp_viewer

If a command from old docs uses a build directory, replace it with the installed
package ``bin`` directory.

Missing Shared Libraries
========================

For installed packages, ensure the runtime loader can find RaiSim:

.. code-block:: bash

    export RAISIM_LOCAL_INSTALL_ROOT=$HOME/raisim2Lib
    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$RAISIM_LOCAL_INSTALL_ROOT/raisim/lib

On macOS, use ``DYLD_LIBRARY_PATH``.

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
* The server-based example and ``rayrai_raisim_tcp_viewer`` must use the same
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
