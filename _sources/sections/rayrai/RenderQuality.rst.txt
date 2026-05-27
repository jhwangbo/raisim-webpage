###########################################
Render quality, tone mapping, color grading
###########################################

``RenderQualitySettings`` is the single struct that drives the renderer's
behaviour each frame. Pick a preset for the common cases, then override
individual flags for the effects you need. Other pages cover narrower
subsets of this struct: :doc:`PostProcess` for cinematic and screen-space
effects, :doc:`Weather` for atmospheric state, and :doc:`Lighting` for
shadow/light budgets.

Color and gamma semantics
=========================
rayrai applies display gamma at the shader/output stage; do not pre-gamma-correct
linear colours before passing them in. The convention:

* ``Visuals::setColor`` and most object/material color factors use linear ``0..1`` RGBA.
* ``Camera::setBackgroundColorRgb255`` and ``RayraiWindow::setBackgroundColorRgb255``
  use legacy ``0..255`` RGBA. ``setBackgroundColor`` is kept as a compatibility wrapper
  for the same ``0..255`` range.
* ``setBackgroundColorLinear`` accepts linear ``0..1`` RGBA and converts it internally.
* Texture uploads distinguish color maps and data maps. Use ``loadColorTextureWithTiling``
  for sRGB albedo/emissive maps, and ``loadDataTextureWithTiling`` for normal,
  metallic-roughness, AO, depth, mask, or other linear data textures.

.. code-block:: cpp

    // Linear object colours (0..1 floats).
    sphere->setColor(glm::vec4(0.95f, 0.43f, 0.12f, 1.0f));

    // Background: pick the API that matches your colour range.
    viewer.setBackgroundColorRgb255({40, 45, 55, 255});           // 0..255 sRGB
    viewer.setBackgroundColorLinear({0.157f, 0.176f, 0.216f, 1});  // 0..1 linear

    // Texture uploads distinguish colour maps from data maps:
    unsigned int albedo = raisin::RayraiWindow::loadColorTextureWithTiling(
        "/path/wood_albedo.png");      // treated as sRGB
    unsigned int normal = raisin::RayraiWindow::loadDataTextureWithTiling(
        "/path/wood_normal.png");      // treated as linear data
    unsigned int roughness = raisin::RayraiWindow::loadDataTextureWithTiling(
        "/path/wood_orm.png");         // treated as linear data

Render-quality controls
=======================
rayrai keeps RL throughput and visual fidelity separate. The ``Fast`` preset keeps
reflections, high-fidelity PBR, FXAA, and extra expensive viewer effects off by default.
``Balanced`` now uses the PBR + IBL path and a reflective checker ground, but
still leaves the heavier High/Ultra effects off. ``High`` and ``Ultra`` enable
the quality-oriented path, including stronger shadow filtering, FXAA,
additional screen-space effects, and depth-of-field postprocessing.

Every preset is tuned so directional shadows are readable out of the box while
smooth and metallic materials still receive enough sky/IBL fill. Balanced and
High use brighter ambient/environment defaults than older releases; Ultra keeps
a lower direct ambient with stronger IBL and AgX tone mapping. You should not
need to tweak ambient/diffuse/shadow values for a readable outdoor scene.

The reflective checker ground is on by default for ``Balanced``, ``High``, and
``Ultra`` (``reflectiveGround = true`` plus the PBR path) and off for ``Fast``.
Heightmap terrain is intentionally excluded from the planar reflective-ground
policy; it uses a rough, non-reflective PBR terrain material even when
``reflectiveGround`` is enabled.

Use presets for common cases:

.. code-block:: cpp

    viewer.setRenderQualityPreset(raisin::RayraiWindow::RenderQualityPreset::Fast);
    viewer.setRenderQualityPreset(raisin::RayraiWindow::RenderQualityPreset::Ultra);

Use explicit settings when you need runtime control:

.. code-block:: cpp

    auto quality = raisin::RayraiWindow::defaultRenderQualitySettings(
      raisin::RayraiWindow::RenderQualityPreset::Ultra);
    quality.fxaaEnabled = true;
    quality.depthOfFieldEnabled = true;
    quality.depthOfFieldFocusDistance = 5.0f;
    quality.depthOfFieldFocusRange = 8.0f;
    quality.depthOfFieldMaxRadius = 1.25f;
    quality.reflectiveGround = true;
    quality.addViewerFillLights = false;
    viewer.setRenderQualitySettings(quality);

The shipped ``rayrai_feature_showcase`` target exercises these controls and
writes offscreen images and reports.

.. list-table::
   :header-rows: 1
   :widths: 50 50

   * - Fast
     - Balanced
   * - .. image:: ../../image/rayrai/rayrai_quality_fast.png
          :alt: Fast preset
     - .. image:: ../../image/rayrai/rayrai_quality_balanced.png
          :alt: Balanced preset
   * - High
     - Ultra
   * - .. image:: ../../image/rayrai/rayrai_quality_high.png
          :alt: High preset
     - .. image:: ../../image/rayrai/rayrai_quality_ultra.png
          :alt: Ultra preset

These four images are produced by ``doc_image_quality_presets`` in
``docs/image_generators/`` and are regenerated automatically as part of the
``Sphinx`` build target.

Tone mapping, exposure, and color grading
=========================================
The viewer color pipeline is driven by ``RenderQualitySettings``. Tone mapping is
selected by ``colorMode`` (``ViewerColorMode``): ``FastLinear`` (no tone curve),
``AcesApprox`` (ACES-fitted), ``UnrealPreviewApprox``, ``FilmicApprox``, and
``AgXApprox``. Exposure is controlled by ``pbrExposure`` plus an optional
auto-exposure loop (``autoExposureEnabled``, ``autoExposureKey``,
``autoExposureSpeed``, ``autoExposureMinFactor``, ``autoExposureMaxFactor``)
that drives exposure toward a target post-tonemap luma. White balance and
saturation use ``viewerWhiteBalance`` and ``viewerSaturation``.

.. code-block:: cpp

    auto quality = viewer.getRenderQualitySettings();

    // Pick the tone curve.
    quality.colorMode = raisin::ViewerColorMode::AcesApprox;
    quality.pbrToneMapping = true;
    quality.pbrExposure = 1.0f;

    // Auto-exposure: target mid-gray luma 0.18 at moderate adaptation speed.
    quality.autoExposureEnabled = true;
    quality.autoExposureKey = 0.18f;
    quality.autoExposureSpeed = 0.05f;
    quality.autoExposureMinFactor = 0.10f;
    quality.autoExposureMaxFactor = 6.0f;

    // White balance + saturation tweaks (applied before grading).
    quality.viewerWhiteBalance = glm::vec3(1.02f, 1.00f, 0.96f);  // slightly warm
    quality.viewerSaturation = 1.05f;

    // ASC-CDL grade applied at the end of the post-process chain.
    quality.viewerColorGradePreset = raisin::ColorGradePreset::Cinematic;
    quality.viewerColorGradeStrength = 0.8f;

    viewer.setRenderQualitySettings(quality);

The five tone-mapping curves render the same scene very differently — flat
linear preserves source intensity but rolls off bright surfaces; ACES and
Filmic compress highlights cinematically; AgX trades a slightly desaturated
look for cleaner skin tones; UnrealPreview matches the engine reference:

.. list-table::
   :header-rows: 1
   :widths: 50 50

   * - FastLinear
     - ACES
   * - .. image:: ../../image/rayrai/rayrai_tonemap_fast_linear.png
          :alt: FastLinear tone map
     - .. image:: ../../image/rayrai/rayrai_tonemap_aces.png
          :alt: ACES tone map
   * - UnrealPreview
     - Filmic
   * - .. image:: ../../image/rayrai/rayrai_tonemap_unreal_preview.png
          :alt: UnrealPreview tone map
     - .. image:: ../../image/rayrai/rayrai_tonemap_filmic.png
          :alt: Filmic tone map
   * - AgX
     -
   * - .. image:: ../../image/rayrai/rayrai_tonemap_agx.png
          :alt: AgX tone map
     -

ASC-CDL color grading is applied at the end of the post-process chain. Pick a
preset with ``viewerColorGradePreset`` (``Neutral``, ``Warm``, ``Cool``,
``Cinematic``, ``Bleach``) and blend it with the ungraded image using
``viewerColorGradeStrength``. ``gamma`` overrides display gamma when needed.

.. list-table::
   :header-rows: 1
   :widths: 50 50

   * - Neutral
     - Warm
   * - .. image:: ../../image/rayrai/rayrai_grade_neutral.png
          :alt: Neutral grade
     - .. image:: ../../image/rayrai/rayrai_grade_warm.png
          :alt: Warm grade
   * - Cool
     - Cinematic
   * - .. image:: ../../image/rayrai/rayrai_grade_cool.png
          :alt: Cool grade
     - .. image:: ../../image/rayrai/rayrai_grade_cinematic.png
          :alt: Cinematic grade
   * - Bleach
     -
   * - .. image:: ../../image/rayrai/rayrai_grade_bleach.png
          :alt: Bleach grade
     -

The tone-mapping grid is produced by ``doc_image_tone_mapping`` and the grade
grid by ``doc_image_color_grading`` in ``docs/image_generators/``.

For batch capture, the static helpers ``analyzeRgbaLuminance``,
``recommendExposure``, and ``smoothExposure`` (see *Exposure, calibration, and
output transforms* below) drive automatic exposure adjustment without touching
renderer state directly.


Adaptive quality and texture budgets
====================================
For long-running applications and offline pipelines, two static helpers convert
measured timings or memory budgets into recommended settings without mutating
the renderer:

* ``recommendDynamicQuality(currentSettings, preset, timings)`` looks at GPU
  pass timings (from ``captureRenderPassTimings``) and proposes a render-scale,
  shadow-update cadence, bloom/SSAO quality, and target frame time. The result
  is a ``DynamicQualityRecommendation`` with bottleneck flags
  (``fillRate``/``shadow``/``postprocess``) and a human-readable reason.
* ``recommendMaterialTextureBudget(budgetBytes)`` proposes texture
  formats/filters and which slots can fall back when the asset set exceeds a
  byte budget. The result describes what would be changed; the application
  decides whether to apply it.

.. code-block:: cpp

    // Measure once per second of headroom.
    raisin::RayraiWindow::RenderOverrides ov;
    auto timings = viewer.captureRenderPassTimings(viewer.getCamera(), ov);

    auto rec = raisin::RayraiWindow::recommendDynamicQuality(
        viewer.getRenderQualitySettings(),
        raisin::RayraiWindow::RenderQualityPreset::High,
        timings);

    if (rec.fillRateBottleneck) {
      auto q = viewer.getRenderQualitySettings();
      q.viewerRenderScale = rec.recommendedRenderScale;  // e.g. 0.85
      q.updateShadowsEveryFrame = rec.updateShadowsEveryFrame;
      viewer.setRenderQualitySettings(q);
      std::printf("Adaptive: %s\n", rec.reason.c_str());
    }

    // Texture budget recommendation for a 512 MiB target.
    auto budget = raisin::RayraiWindow::recommendMaterialTextureBudget(
        /*budgetBytes=*/512ull * 1024 * 1024);
    // budget.recommendedFilter / .recommendedFormat tell you what to lower.

