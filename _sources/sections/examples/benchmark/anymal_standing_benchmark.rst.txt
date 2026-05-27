anymal_standing_benchmark
=========================

``anymal_standing_benchmark`` is a headless timing-oriented example for the
ANYmal PD-standing contact workload. It reports simulation throughput and the
average number of contacts.

Installed executable: ``anymal_standing_benchmark``.

Run it single-threaded for benchmark comparisons:

.. code-block:: bash

   OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 <raisim-install>/bin/anymal_standing_benchmark --fast

On Windows, run ``anymal_standing_benchmark.exe`` instead.

Useful controls:

* ``--steps N`` or ``--loops N`` changes the number of integration steps.
* ``--fast`` or ``--quick`` caps the default run at 20000 steps for smoke tests.
* ``ANYMAL_STEPS`` sets the default step count from the environment.
* ``RAISIM_ANYMAL_PHASE_PROFILE=1`` prints separate ``integrate1`` and
  ``integrate2`` timing per step.

The example uses the packaged ANYmal URDF under ``rsc/anymal`` and disables
sleeping so the measured workload stays active throughout the run.
