#############################
Quick Start
#############################

This page gets a RaiSim package from build to a running example. For package
layout, environment variables, install prefixes, and activation details, see
:doc:`Installation`.

1. Install and activate RaiSim
==============================

Download the RaiSim2 binary package for your platform from
``https://github.com/raisimTech/raisim2Lib`` and unpack it to
``$HOME/raisim2Lib`` on Linux/macOS or ``C:\raisim`` on Windows. RaiSim2 is
distributed as binary libraries with headers, examples, rayrai tools, and
documentation.

Place the activation file at the default location:

.. code-block:: text

    Linux/macOS: $HOME/.raisim/activation.raisim
    Windows:     C:\Users\<YOUR-USERNAME>\.raisim\activation.raisim

2. Build examples and raisimPy
==============================

From the ``raisim2Lib`` root, source the environment and build examples plus the
Python wrapper:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh
    cmake -S . -B build \
      -DRAISIM_EXAMPLE=ON \
      -DRAISIM_PY=ON
    cmake --build build -j

``RAISIM_EXAMPLE`` is enabled by default. ``RAISIM_PY`` is disabled by default,
so pass ``-DRAISIM_PY=ON`` when you want ``raisimPy``.

3. Run a server-based example
=============================

Source the environment in every terminal that runs an example or tool. Start
the rayrai TCP viewer in one terminal:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh
    ./build/examples/rayrai_tcp_viewer

Run a RaiSim example in another terminal:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh
    ./build/examples/primitive_grid

Server examples create a ``raisim::RaisimServer`` scene. The viewer connects to
the default port ``8080`` unless the application changes it.

4. Run an in-process rayrai example
===================================

Rayrai examples create their own window or offscreen OpenGL context and do not
need the TCP viewer:

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh
    ./build/examples/rayrai_basic_scene
    ./build/examples/rayrai_complete_showcase

5. Use raisimPy
===========================

.. code-block:: bash

    cd $HOME/raisim2Lib
    source ./raisim_env.sh
    python -c "import raisimpy; print('raisimPy import OK')"

Next steps
==========

* Use :doc:`Examples` to choose a target by feature.
* Use :doc:`Visualization` to choose between the TCP viewer and in-process
  rayrai.
* Use :doc:`Troubleshooting` for common runtime, viewer, and activation issues.
* Use :doc:`Rayrai` for renderer controls, offscreen rendering, and the TCP
  viewer.
