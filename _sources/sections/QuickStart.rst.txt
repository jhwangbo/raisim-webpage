#############################
Quick Start
#############################

This page gets an unpacked RaiSim binary package to a running example. For
package layout, environment variables, and activation details, see
:doc:`Installation`.

1. Install and activate RaiSim
==============================

Install the binary package for your platform and place the activation file at
the default location:

.. code-block:: text

    Linux/macOS: $HOME/.raisim/activation.raisim
    Windows:     C:\Users\<YOUR-USERNAME>\.raisim\activation.raisim

Source the environment and build the examples from the release workspace:

.. code-block:: bash

    cd /path/to/raisim2Lib
    source ./raisim_env.sh
    cmake -S . -B build-examples \
      -DCMAKE_BUILD_TYPE=Release \
      -DRAISIM_EXAMPLE=ON
    cmake --build build-examples --parallel 12

On Linux and macOS, example executables are then under
``build-examples/examples``. On Windows, configure without
``CMAKE_BUILD_TYPE`` and build with ``--config Release``; executables are under
``build-examples\\bin``.

2. Run a server-based example
=============================

Start the packaged TCP viewer in one terminal:

.. code-block:: bash

    ./rayrai/bin/rayrai_raisim_tcp_viewer

Run a server example in another terminal:

.. code-block:: bash

    ./build-examples/examples/primitive_grid

``primitive_grid`` and the other server examples create a ``raisim::RaisimServer``
scene. The viewer connects to the default port ``8080`` unless the application
changes it.

3. Run an in-process rayrai example
===================================

Rayrai examples create their own window or offscreen OpenGL context and do not
need the TCP viewer:

.. code-block:: bash

    ./build-examples/examples/rayrai_pbr_material_grid
    ./build-examples/examples/rayrai_visual_asset_support

4. Run a non-visual example
===========================

.. code-block:: bash

    ./build-examples/examples/model_asset_pipeline

5. Run an OpenUSD mesh-loading example
======================================

Start the TCP viewer, then run the ShadowHand USD example:

.. code-block:: bash

    ./rayrai/bin/rayrai_raisim_tcp_viewer
    ./build-examples/examples/shadow_hand_usd_cube

Next steps
==========

* Use :doc:`Examples` to choose a target by feature.
* Use :doc:`OpenUSD` for USD mesh-loading scope, runtime layout, and
  troubleshooting.
* Use :doc:`Visualization` to choose between the TCP viewer and in-process
  rayrai.
* Use :doc:`Troubleshooting` for common runtime, viewer, and activation issues.
* Use :doc:`Rayrai` for renderer controls, offscreen rendering, and the TCP
  viewer.
