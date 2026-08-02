#############################
RaiSim Engine 2
#############################

Availability
============

RaiSim Engine 2 is an internal, closed-source authoring component. It is not
part of the public ``raisim2Lib`` distribution. The public repository does not
ship Engine 2 executables, headers, libraries, CMake targets, examples, or
tests, so users cannot build or invoke it from ``raisim2Lib``.

The public package boundary is the downloaded RaiSim and rayrai binaries and
headers together with the example, wrapper, resource, and documentation sources
in ``raisim2Lib``. Engine 2 implementation paths and internal build options are
therefore intentionally not documented as user workflows.

Public Alternatives
===================

Use the supported public interfaces instead:

* construct and modify a ``raisim::World`` through the C++ or RaisimPy API;
* load RaiSim XML, MJCF, or OpenUSD scenes as documented in
  :doc:`WorldConfigurationFile` and :doc:`OpenUSD`;
* use :doc:`Rayrai` or :doc:`RayraiTcpViewer` for visualization; and
* use :doc:`RaisimGymTorch` for reinforcement-learning training.

``.rscene`` and ``.re2`` are internal Engine 2 formats, not supported public
interchange formats in the current binary release. See :doc:`RsceneFile` for
the public availability boundary.
