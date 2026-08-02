#########
Changelog
#########

Release-specific notes for RaiSim. An explicitly marked upcoming release is at
the top, followed by the documented published releases in descending version
order. Each version page summarises the user-visible changes — new features,
behaviour changes, and bug fixes — without re-stating commit history.

Package metadata is updated only when a release is published. Consequently,
an upcoming changelog entry can be one version newer than the package version
shown in the documentation title and reported by ``RAISIM_VERSION``.

.. toctree::
   :maxdepth: 1
   :caption: Releases

   changelog/v2.4.5
   changelog/v2.4.3
   changelog/v2.3.0
   changelog/v2.2.0

Versions at a glance
====================

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Version
     - Headline
   * - :doc:`v2.4.5 (upcoming) <changelog/v2.4.5>`
     - Contact and collision correctness fixes; solver and articulated hot-path
       improvements; safer path/MJCF/heightmap behavior; C++20 package exports
       with Debug/Release coexistence; internal Engine 2 work is not shipped.
   * - :doc:`v2.4.3 <changelog/v2.4.3>`
     - Binary package version update; speed and code-cleanup work in RaiSim;
       expanded release-validation benchmarks; longer stress and actuated Atlas
       workloads; granular/deformable/contact diagnostics; mesh/OpenUSD asset
       pipeline improvements; corrected mesh collision-mode documentation.
   * - :doc:`v2.3.0 <changelog/v2.3.0>`
     - Rolling and spinning friction; interactive sim control (pause /
       step / force / pose); MJCF into an existing world; shader binary
       cache + parallel prewarming; rayrai out-of-the-box quality;
       documentation overhaul.
   * - :doc:`v2.2.0 <changelog/v2.2.0>`
     - Rayrai becomes the main visual workflow; deformable objects and
       granular media examples; build / upgrade / Python polish.

Older releases predate this changelog structure and are not yet
documented in this format. See the GitHub release tags for the raw
release notes prior to v2.2.0.
