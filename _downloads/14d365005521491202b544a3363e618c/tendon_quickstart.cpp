#include <raisim/World.hpp>
#include <cmath>
#include <iostream>
#include <stdexcept>

int main(int argc, char** argv) {
  try {
    if (argc > 1) raisim::World::setActivationKey(argv[1]);
    raisim::World world;
    world.setTimeStep(0.001);
    world.addGround();
    auto* load = world.addSphere(0.1, 1.0);
    load->setName("load");
    load->setPosition(0.0, 0.0, 0.8);

    using Path = raisim::Tendon::PathElement;
    raisim::Tendon::Properties p;
    p.springLower = 0.0;
    p.springUpper = 1.0;
    p.stiffness = 500.0;
    p.damping = 8.0;
    p.upperLimit = 1.5;
    p.width = 0.008;
    auto* cable = world.addSpatialTendon("suspension", {
        Path::via({nullptr, 0, {0.0, 0.0, 2.0}}),
        Path::via({load})}, p);
    cable->setTension(2.0);  // Negative signed feedforward force.

    for (int step = 0; step < 2000; ++step) world.integrate();
    cable->updateGeometry();  // Inspect the final integrated configuration.
    if (!std::isfinite(cable->getLength()) ||
        std::abs(cable->getLength() - 1.01562) > 0.001)
      throw std::runtime_error("unexpected suspended-load equilibrium");
    std::cout << "length=" << cable->getLength()
              << " total_tension=" << cable->getTension()
              << " actuator_force=" << cable->getActuationForce() << '\n';
    return 0;
  } catch (const std::exception& error) {
    std::cerr << error.what() << '\n';
    return 1;
  }
}
