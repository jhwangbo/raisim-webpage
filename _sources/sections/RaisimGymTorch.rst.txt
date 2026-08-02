#############################
RaisimGymTorch
#############################


What is RaisimGymTorch?
===========================

.. image:: ../image/raisimGymTorch.png
  :width: 600
  :alt: RaiSimPy demo (robots.py)

RaisimGymTorch is a gym environment example for RaiSim.
A lightweight PyTorch-based RL framework is provided, but it should work with other RL frameworks.
Instead of using RaisimPy, nanobind wraps a vectorized environment in C++ so that the parallelization happens in C++.
This improves performance significantly.

Why RaisimGymTorch?
============================

RaisimGymTorch is designed to collect **tens of billions of state transitions** with a single desktop machine.
Such a number of state transitions can be necessary for challenging tasks. An example of a trained policy is shown below.

.. image:: ../image/raisimGymTorch_trainedPolicy1.gif
  :alt: trained policy 1

.. image:: ../image/raisimGymTorch_trainedPolicy2.gif
  :alt: trained policy 2

Approximately **160 billion time steps** were used to train the above controller.
RaisimGymTorch can process about 500k time steps per second in the above environment (with 3950x) with an actuator network whose cost matches the physics simulation.

Dependencies
============
Assuming that you have installed RaiSim:

* Anaconda
* PyTorch (https://pytorch.org/)
* To use the GPU, install CUDA as well. Use the version recommended by PyTorch.
* OpenMP on Linux/Windows. On macOS, OpenMP is used when available; otherwise
  RaisimGymTorch builds with a serial fallback.
* Other dependencies are installed when you build a RaisimGymTorch environment for the first time.

How to run the example
=============================
We provide an ANYmal locomotion example.
From the ``raisimGymTorch`` directory:

.. code-block:: bash

    pip install numpy tensorboard ruamel.yaml
    python setup.py develop
    python raisimGymTorch/env/envs/rsg_anymal/runner.py

On macOS, source the package environment before building so Python can load the
RaiSim and rayrai dynamic libraries:

.. code-block:: bash

    cd ..
    source ./raisim_env.sh
    cd raisimGymTorch
    python setup.py develop

If ``../raisim`` or ``../rayrai`` is missing, CMake downloads the matching
macOS package automatically: ``macos-arm64`` on Apple Silicon, including
Rosetta shells, and ``macos-x86_64`` on Intel when that asset is available.
Install ``libomp`` if you want OpenMP parallelism on macOS; without it, the C++
vectorized environment compiles with a serial fallback.

To visualize the policy, use ``rayrai_tcp_viewer`` as described in
:doc:`Visualization`. The training script records policy performance every 200
iterations. Older RaisimUnity/Unreal visualization workflows have been replaced;
see :doc:`LegacyIntegrations` for migration notes.

How to debug
=============================
A nanobind package (e.g., your environment) can be difficult to debug because it is written in C++ but not run as a normal executable.
We provide a debug app that wraps your environment and creates an executable.
To build the debug app, build your environment with

.. code-block:: bash

    python setup.py develop --Debug

Then, the debug executable is created next to your nanobind package
(``raisimGymTorch/raisimGymTorch/env/bin``).
If you use CLion (recommended), open the raisimGymTorch directory in CLion.
It will automatically add the debug app executable.
It provides a convenient GUI for debugging.

You can run the debug app as:

.. code-block:: bash

    ./<environment name>_debug_app <full path to rsc directory> <full path to the cfg file>

or add the arguments to the CLion run configuration.

**On Windows**, make sure that you are linking against the debug-build raisim.
Visual Studio compiled executables will not work if it links against a library built with different compile flags.

How does it work?
=============================
RaisimGymTorch wraps a C++ environment (i.e., ``Environment.hpp``) as a Python
library using nanobind.
When you call ``python3 setup.py develop``, all environments under ``raisimGymTorch/raisimGymTorch/env/envs`` are compiled.
The compiled libraries are stored in ``raisimGymTorch/raisimGymTorch/env/bin``.

Everything else happens in Python.
You can import your environment from your Python code.
For example, the ANYmal locomotion environment can be imported as ``from raisimGymTorch.env.bin import rsg_anymal``.
Your launch file (e.g., ``runner.py``) can be customized as needed.


How to add a custom environment?
===================================
Keep the top-level ``raisimGymTorch`` directory beside the current flat
``raisim`` and ``rayrai`` package directories. Its CMake project discovers
those sibling prefixes directly. After adding or copying an environment under
``raisimGymTorch/raisimGymTorch/env/envs``, rebuild with:

.. code-block:: bash

    cd /path/to/raisim2Lib/raisimGymTorch
    python setup.py develop

Delete generated ``build`` and ``raisim_gym_torch.egg-info`` directories before
a clean rebuild when changing Python interpreters or build configurations.
However, if you want to keep multiple environments, you may want to rename a few items.

 * Package name: You can find it in ``setup.py`` (``name='raisim_gym_torch'``). This is the name you will find in ``site_packages`` directory of your anaconda environment.
 * Directory name: This is the directory name that you will find in the top ``raisimGymTorch`` directory. The default name is ``raisimGymTorch``. Modify it if necessary, and update the directories in the header of ``runner.py`` and the ``CMakeLists.txt``.
 * Binary name: This is the name of the directory of your environment. The default name is ``rsg_anymal``. If you change the directory name, update ``rsg_anymal`` in ``runner.py``.
 * Environment name: This is the name of the binary that will be built from your ``Environment.hpp`` file. The default name is ``RaisimGymVecEnv``. You can find it in ``raisim_gym.cpp``. If you change it, update the name in ``runner.py``.

 You can also create another conda environment to avoid name conflicts.

Code structure (if you are curious)
======================================
The ``ENVIRONMENT`` class defines the dynamics, reward, termination condition, and so on.
This class inherits from ``RaisimGymEnv``, which adds basic functionality such as ``setSimulationTimeStep``, ``setControlTimeStep``, and ``getObDim``.
If ``RaisimGymEnv`` is not general enough for you, you can also make ``ENVIRONMENT`` independent of ``RaisimGymEnv``.

``RaisimGymEnv`` is wrapped by ``VectorizedEnvironment``, which parallelizes the environment using OpenMP when OpenMP is available.
You can consider it similar to ``VectorEnv`` in OpenAI Baselines, but RaisimGym parallelization happens in C++, which makes it orders of magnitude faster.

``raisim_gym.cpp`` is a nanobind wrapper for ``VectorizedEnvironment``.
It defines the interface functions.

Finally, ``RaisimGymVecEnv`` is a Python class that wraps a Python library created from ``raisim_gym.cpp``.

Common issues and solutions
================================
* If Python scripts complain about missing "libcudnn.so": conda install -c nvidia cudnn
