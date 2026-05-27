articulated_system_benchmark
=============================

``articulated_system_benchmark`` is a headless timing-oriented example for
articulated dynamics workloads. It runs several fixed scenes and prints timing
through ``raisim::print_timediff``.

Installed executable: ``articulated_system_benchmark``.

Run it single-threaded for benchmark comparisons:

.. code-block:: bash

   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/articulated_system_benchmark

On Windows, run ``articulated_system_benchmark.exe`` instead.

The example covers:

* ANYmal standing with ground contact and then without the ground object.
* Atlas falling with and without ground contact.
* Chain robots with 10 and 20 springed links.

Use the unified benchmark runner documented in the Performance page for
repeatable benchmark selection and shorter targeted runs. Use this example when
you want the package-level standalone executable that mirrors the historical
articulated-system timing scenes.
