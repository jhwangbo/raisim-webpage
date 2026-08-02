############
.rscene File
############

Availability
============

``.rscene`` is an internal RaiSim Engine 2 authoring format. The public
``raisim2Lib`` distribution does not include an ``.rscene`` parser, Engine 2
headers or libraries, or an Engine 2 executable. It is therefore not a
supported user-facing scene format in the current binary release.

Do not generate ``.rscene`` files for a public application or depend on
internal Engine 2 record syntax. The format can change independently of the
public RaiSim and rayrai APIs.

Supported Public Scene Inputs
=============================

Use one of the scene inputs shipped by the binary package:

* RaiSim world XML for hand-authored or template-driven worlds;
* MJCF for supported MuJoCo model imports;
* OpenUSD for USD-native physics scenes and asset pipelines; or
* the public C++ or RaisimPy APIs to construct a world programmatically.

See :doc:`WorldConfigurationFile`, :doc:`OpenUSD`, and :doc:`WorldSystem` for
the supported workflows.
