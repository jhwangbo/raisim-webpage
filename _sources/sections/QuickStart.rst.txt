#############################
Quick Start
#############################

This page gets an installed RaiSim binary package to a running example. For
package layout, environment variables, and activation details, see
:doc:`Installation`.

1. Install and activate RaiSim
==============================

Install the binary package for your platform and place the activation file at
the default location:

.. code-block:: text

    Linux/macOS: $HOME/.raisim/activation.raisim
    Windows:     C:\Users\<YOUR-USERNAME>\.raisim\activation.raisim

The examples and rayrai tools are distributed as binaries. The commands below
use ``<raisim-install>/bin`` for the directory containing those executables.

2. Run a server-based example
=============================

Start ``rayrai_raisim_tcp_viewer`` in one terminal:

.. code-block:: bash

    <raisim-install>/bin/rayrai_raisim_tcp_viewer

Run a RaiSim example in another terminal:

.. code-block:: bash

    <raisim-install>/bin/example_anymal_contacts

``example_anymal_contacts`` and ``example_atlas_contacts`` create a
``raisim::RaisimServer`` scene. The viewer connects to the default port
``8080`` unless the application changes it.

3. Run an in-process rayrai example
===================================

Rayrai examples create their own window or offscreen OpenGL context and do not
need the TCP viewer:

.. code-block:: bash

    <raisim-install>/bin/example_rayrai_pbr_asset_inspector
    <raisim-install>/bin/example_polyhaven_blue_wall --fast-load

4. Run a non-visual example
===========================

.. code-block:: bash

    <raisim-install>/bin/example_model_asset_pipeline

5. Run an OpenUSD mesh-loading example
======================================

Start the TCP viewer, then run the ShadowHand USD example:

.. code-block:: bash

    <raisim-install>/bin/rayrai_raisim_tcp_viewer
    <raisim-install>/bin/shadow_hand_usd_cube

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
