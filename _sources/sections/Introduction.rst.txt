#############################
Introduction
#############################

RaiSim is a high-performance physics engine developed for robotics and AI. It
is designed for deterministic, single-process simulation of rigid bodies,
articulated systems, contacts, sensors, deformable bodies, and granular
particles.

**Why RaiSim?**

* RaiSim is optimized for high-throughput robotics simulation.
* The accuracy of RaiSim has been validated in numerous academic publications (`[2] <https://robotics.sciencemag.org/content/4/26/eaau5872/tab-article-info>`_, `[3] <https://arxiv.org/pdf/1901.07517.pdf>`_, `[4] <https://robotics.sciencemag.org/content/5/47/eabc5986>`_,  `[5] <https://arxiv.org/abs/1909.08399>`_,  `[6] <https://arxiv.org/abs/2011.08811>`_)
* The C++ API is organized around explicit worlds, objects, materials, sensors,
  and visualizer integration.
* The binary distribution ships headers, libraries, examples, rayrai tools, and
  documentation.

System Requirements
=====================
* **Linux**: Ubuntu 22.04 or newer is recommended. x86 builds require AVX2.
* **Windows**: Windows 10 or newer with Visual Studio 2019 or newer.
* **macOS**: current macOS releases. Apple silicon is supported; Intel systems
  require AVX2.

See :doc:`Installation` for dependency and activation details.

Example Code
===================
The following is the shape of a simple RaiSim application. It creates a world,
adds objects, publishes the scene through ``RaisimServer``, and steps the world
through the server's thread-safe helper. Use ``rayrai_raisim_tcp_viewer`` for current
visualization.

.. code-block:: cpp

  #include "raisim/World.hpp"
  #include "raisim/RaisimServer.hpp"
	
  int main() {
    raisim::World::setActivationKey("PATH_TO_THE_ACTIVATION_KEY");
	
    raisim::World world;
    auto* anymal = world.addArticulatedSystem(PATH_TO_URDF);
    auto* ball = world.addSphere(1.0, 1.0);
    auto* ground = world.addGround();
    world.setTimeStep(0.002);
	
    raisim::RaisimServer server(&world);
    server.launchServer();
	
    while (true) {
      raisim::MSLEEP(2);
      server.integrateWorldThreadSafe();
    }
  }

Below is a minimal downstream CMake file for an installed RaiSim package.

.. code-block:: cmake

  cmake_minimum_required(VERSION 3.16)
  project(raisim_examples LANGUAGES CXX)
	
  find_package(raisim CONFIG REQUIRED)
  find_package(Eigen3 REQUIRED)
	
  add_executable(app main.cpp)
  target_link_libraries(app PUBLIC raisim::raisim)
  if (UNIX)
    target_link_libraries(app PUBLIC pthread)
  endif()

For installed examples and visualization workflows, see :doc:`QuickStart` and
:doc:`Examples`.

.. _RAISIM_EXAMPLE: https://github.com/raisimTech/raisimExample
