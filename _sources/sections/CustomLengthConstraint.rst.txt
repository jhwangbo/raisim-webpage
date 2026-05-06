CustomLengthConstraint
==========================

``CustomLengthConstraint`` allows users to apply custom constraints.
Users set the tension between two points using ``setTension()``.

An example is shown below:

.. code-block:: cpp

  auto wire7 = world.addCustomWire(pin7, 0, {0,0,0}, anymalB, 0, {0., 0, 0}, 2.0);
  wire7->setTension(400);

The following code results in:

.. image:: ../image/customWire.gif

Use the current examples index for runnable source targets; the snippet above
shows the core custom-wire API.


API
----------------

.. doxygenclass:: raisim::CustomLengthConstraint
   :members:
