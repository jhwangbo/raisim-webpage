#############################
Troubleshooting
#############################

This page covers common issues when using the binary RaiSim distribution.

Executable Not Found
====================

When you build examples from the public ``raisim2Lib`` workspace, CMake places them
under the build directory:

.. code-block:: bash

    ./build-examples/examples/primitive_grid
    ./build-examples/examples/rayrai_tcp_viewer

The unpacked package does not include a prebuilt TCP viewer. Build the
``rayrai_tcp_viewer`` example target and run it from the build tree.
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
* The server-based example and TCP viewer must use the same port. The default
  is ``8080``.
* Run ``linux_install.sh``, ``mac_install.sh``, or ``win_install.ps1`` after
  updating the package, then rebuild the examples copy of
  ``rayrai_tcp_viewer``. A stale viewer source can connect but disagree with
  the installed rayrai/RaiSim protocol implementation.

For manual RGB/depth cameras, keep the examples-built viewer connected. It
renders requested frames and returns them to ``RaisimServer``. If the viewer
reports ``Refusing RGB sensor update without a complete render``, rerun the
platform install script and rebuild ``rayrai_tcp_viewer`` in
``build-examples``; do not launch an older installed viewer binary.

rayrai Window Or Offscreen Context Fails
========================================

rayrai requires a working OpenGL 3.3 core-profile context; its context helpers
request 4.3 first. On Linux, make sure OpenGL and SDL2 development/runtime
packages are available. On headless systems, use the offscreen context helpers
documented in :doc:`Rayrai` and verify that the machine provides a usable
software or hardware OpenGL stack.

.. _rayrai-vulkan-ray-query-troubleshooting:

Vulkan Ray Queries Unavailable
==============================

Geometry-traced glass can use Vulkan ray queries on Linux and Windows. If
rayrai was built without the optional Vulkan backend, the portable OpenGL
tracer remains available. Installing a compiler or driver after a binary
package was built does not add the missing backend to that package. Use a
package built with Vulkan support or rebuild rayrai from source. A
``RayraiWindow`` from a build configured without ``glslc`` prints a warning
once to standard output with installation and rebuild steps. An existing
Vulkan-enabled binary does not need ``glslc`` at run time.

For a source build on Ubuntu, install the Vulkan development files and the
``glslc`` shader compiler (Python 3 is also required):

.. code-block:: bash

    sudo apt update
    sudo apt install libvulkan-dev glslc
    glslc --version

A source build enables the optional Vulkan ray-query backend automatically
when these tools are present; ``RAYRAI_ENABLE_VULKAN_RAY_QUERY`` defaults to
``ON``. Reconfigure and build after installing ``glslc``:

.. code-block:: bash

    cmake -S /path/to/raisim-source -B /path/to/existing-build
    cmake --build /path/to/existing-build

An existing CMake cache with ``RAYRAI_ENABLE_VULKAN_RAY_QUERY=OFF`` keeps that
explicit setting; change it to ``ON`` when reconfiguring. If tests were
enabled in that source build, check the hardware cases with
``ctest --test-dir /path/to/existing-build -j12 -L hardware-ray-query``.

Check for the CMake message
``optional Vulkan ray queries enabled``. A message about ``portable glass
tracing only`` means the optional backend was not built. The
``raisim2Lib`` example build links to a prebuilt rayrai library; configuring
that example build cannot change which backend the library contains.

At run time, the active OpenGL device must match a non-CPU Vulkan 1.2 GPU
with ray queries, acceleration structures, buffer device addresses, and
external memory and semaphore sharing (including the OpenGL FD extensions
``GL_EXT_memory_object_fd`` and ``GL_EXT_semaphore_fd`` on Linux). On Ubuntu,
``vulkan-tools`` provides ``vulkaninfo`` for checking the visible Vulkan
devices:

.. code-block:: bash

    sudo apt install vulkan-tools
    vulkaninfo --summary

Run the viewer and hardware tests in a graphical session with GPU device
access. Containers and sandboxes may hide ``/dev/dri`` or NVIDIA device
nodes even when the host driver works. If ``VulkanRayQuery`` was explicitly
selected, an unavailable backend raises an error; ``Automatic`` uses the
portable tracer when hardware ray queries cannot be used. See
:doc:`rayrai/Materials` for these backend settings.

Post-Processing Effect Missing On macOS
=======================================

macOS provides OpenGL 4.1 with 16 fragment texture units, so rayrai uses its
compact PBR programs and the common post-process program there. Effects such
as screen-space reflections, volumetric fog, color grading, saturation, and
white balance are not applied on macOS; see :ref:`rayrai-platform-support` for
the full list.

Some rayrai examples print the Apple driver message ``unit 10
GLD_TEXTURE_INDEX_2D is unloadable``. No program samples a 2D texture on that
unit at those draws, so the message has no visible effect.

First Launch Of An Example Is Slow
==================================

``rayrai_coacd_mesh_approximation`` runs CoACD for every mesh on its first run,
which can take a few minutes; Ctrl-C stops it during that phase. RaiSim caches
the parts beside each mesh, so later runs load them directly. ``rayrai_forest``
builds mesh LODs on its first launch and saves them as ``rayrai_cache_*.lods``
files beside its assets. Delete these cache files to force regeneration.

Example Asset Missing
=====================

Examples expect their bundled assets to stay with the release workspace. If
an example cannot find a URDF, mesh, texture, heightmap, or USD asset, verify
that the top-level ``rsc`` directory exists and that CMake copied it to
``build-examples/examples/rsc`` (or ``build-examples/bin/rsc`` on Windows).

OpenUSD Runtime Or Plugin Missing
=================================

USD mesh loading uses the bundled OpenUSD runtime. Keep the installed
``openusd`` directory and USD shared libraries next to the RaiSim binaries:
``raisim/lib/openusd`` on Linux, and ``raisim/bin/openusd`` plus the ``usd_*.dll``
files on Windows.

If an executable is launched from another directory, run the package environment
script first so the runtime loader can find RaiSim and OpenUSD. If an OpenUSD
runtime is missing from the public package, reinstall or upgrade the matching
``raisim2Lib`` release instead of trying to rebuild the closed-source engine.
