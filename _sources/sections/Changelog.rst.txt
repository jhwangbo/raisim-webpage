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

   changelog/upcoming
   changelog/v2.6.1
   changelog/v2.5.8
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
   * - :doc:`Upcoming <changelog/upcoming>`
     - glm::vec4 orientations read as (w, x, y, z) (breaking); geometry-traced
       glass; foliage LOD, batching and caches; faster frames with identical
       images; screen-space AO and macOS fixes.
   * - :doc:`v2.6.1 <changelog/v2.6.1>`
     - Tendons; TCP viewer split panes, local world simulation, recording,
       Live Signals and scene editing; restored panes reconnect (2.6.1).
   * - :doc:`v2.5.8 <changelog/v2.5.8>`
     - Shared GPU mesh buffers for compatible rayrai contexts; depth-camera
       target allocation fixes; current TCP sensor and heightmap workflows.
   * - :doc:`v2.4.5 <changelog/v2.4.5>`
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
