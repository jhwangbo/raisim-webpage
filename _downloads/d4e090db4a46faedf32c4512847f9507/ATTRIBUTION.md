# Off-road buggy asset licenses and attribution

The third-party models and textures in this directory are free assets under
two licenses:

* **CC BY 4.0** for the buggy, the coilover and four props of the race venue
  from Sketchfab: copying, modification, commercial use and redistribution are
  allowed, provided the authors are credited as below
  (https://creativecommons.org/licenses/by/4.0/). `meshes/` keeps the
  `license.txt` that Sketchfab ships with each model, as
  `license_sci_fi_buggy.txt` and `license_coilover.txt`, and each venue prop
  keeps its own in `props/<name>/license.txt`.
* **CC0 1.0 Universal (CC0-1.0)** for the Poly Haven ground textures and
  models and the BlendKit traffic cone: the same freedoms without attribution.
  The legal text is in [LICENSE-CC0-1.0.txt](LICENSE-CC0-1.0.txt).

The URDF (`buggy.urdf`), the suspension parts in `meshes/` that do not come
from the models (wishbones, uprights, brake discs and calipers, tie rods,
steering rack), the terrain (`terrain/height.png`, `terrain/surface.png`,
`terrain/wear.png`, `terrain/terrain.txt`) and the generated venue props
(`props/start_gantry`, `props/feather_flag`, `props/canopy`,
`props/marker_post`, and the collision proxies `collision.obj`) are made by
`examples/tools/offroad_buggy_design.py`,
`examples/tools/prepare_offroad_buggy_assets.py`,
`examples/tools/prepare_offroad_venue.py` and
`examples/tools/generate_offroad_terrain.py`.

## Sketchfab (CC BY 4.0)

Credits, as the authors ask for them:

* Buggy body, wheels and steering wheel: This work is based on "Sci - Fi Buggy" (https://sketchfab.com/3d-models/sci-fi-buggy-085bd97876a64eacbc041299ac945e9c) by TiyaMakes (https://sketchfab.com/tiyamakes) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* Coilover dampers: This work is based on "[Free] Coilover Shock Absorber Damper" (https://sketchfab.com/3d-models/free-coilover-shock-absorber-damper-92e61757780840a683abdd38c4e8a700) by Robert Prispilović (https://sketchfab.com/rprispil) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* `props/hay_bales`: This work is based on "Hay Bales" (https://sketchfab.com/3d-models/hay-bales-6b775049e57e4d9da87977905493ebfb) by FrodoUndead (https://sketchfab.com/FrodoUndead) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* `props/water_barrier`: This work is based on "Water Barriers" (https://sketchfab.com/3d-models/water-barriers-b39c313f0b2148dca48bf113529fb06e) by xplanepilot (https://sketchfab.com/xplanepilot) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* `props/porta_potty`: This work is based on "Porta Potty" (https://sketchfab.com/3d-models/porta-potty-b970702ea74a456e89673e73cfb6d873) by Sean Thomas (https://sketchfab.com/foon.) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* `props/bleacher`: This work is based on "Bleacher" (https://sketchfab.com/3d-models/bleacher-4960023d1ea340bfb07625aaa7f9713b) by JanStano (https://sketchfab.com/JanStano) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* Parked car, `../city/cars/fairheaven_lt80`: This work is based on "Fairheaven LT '80 - Low poly model" (https://sketchfab.com/3d-models/fairheaven-lt-80-low-poly-model-e2678da920cc4be68dbc193727919ffb) by Daniel Zhabotinsky (https://sketchfab.com/DanielZhabotinsky) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* Parked car, `../city/cars/fairheaven_sw84`: This work is based on "Fairheaven SW '84 - Low poly model" (https://sketchfab.com/3d-models/fairheaven-sw-84-low-poly-model-aa0becb6e854422596cac6b21bf79787) by Daniel Zhabotinsky (https://sketchfab.com/DanielZhabotinsky) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* Parked car, `../city/cars/kiri86`: This work is based on "Kiri '86 - Low poly model" (https://sketchfab.com/3d-models/kiri-86-low-poly-model-5c17c582ef9549798f694b660feea42a) by Daniel Zhabotinsky (https://sketchfab.com/DanielZhabotinsky) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

Changes made: the buggy's node transforms are baked into Z-up meshes in metres
(scale 0.145) in the frame of the simulated chassis, with one primitive per
material and textures reduced to 2K JPEG files. Its static front and rear
suspension and their decals are removed; the wheels, the steering wheel and the
front fenders are split off into the frames of the links that carry them, and
the rims get a satin finish instead of their mirror-like metal-roughness map.
The coilover is scaled to the 412 mm damper of the simulated suspension and
split into the damper body with its top eye and the rod with its bottom eye;
its original coil spring is replaced by a procedural spring mesh in the
URDF, whose length follows the simulated shock travel. The procedural rear
drive shafts and CV boot visuals are also defined in the URDF. The venue props are baked into Z-up meshes in metres, one
primitive per material, with textures reduced to 1K JPEG files; the hay bales
are scaled by 0.65 and split into a round and a square bale, and the water
barriers into a red and a white one.

The parked cars' node transforms are baked into one Z-up mesh per car with
one primitive per material. Their textures are reduced to 1K (JPEG unless
blended), the clear-coated metallic body paint is replaced by a plain car
paint, and extra paint colours are added. The example uses the three models
above, including an alternate paint of the Fairheaven LT '80.

These credits apply to the example's rendered screenshots and videos as well
as its asset files. When sharing a render, include the applicable credits or
a link to an accessible copy of this notice. Keep the city asset notices with
the parked-car files when distributing the example's resources.

## Poly Haven (CC0)

Provider's license statement: https://polyhaven.com/license. Powered by Poly Haven.

| Asset | Author | Used as |
| --- | --- | --- |
| [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02) | Amal Kumar | meadow colour and normal map |
| [Dry Ground Rocks](https://polyhaven.com/a/dry_ground_rocks) | Rob Tuytel | packed racing surface |
| [Brown Mud Dry](https://polyhaven.com/a/brown_mud_dry) | Rob Tuytel | loose dirt on the berms and verges |
| [Rocky Trail](https://polyhaven.com/a/rocky_trail) | Amal Kumar | gravel of the pits |
| [Rock Face 03](https://polyhaven.com/a/rock_face_03) | Dario Barresi, Rico Cilliers | steep rock |
| [Boulder 01](https://polyhaven.com/a/boulder_01) | Rico Cilliers | `props/boulder_01` |
| [Namaqualand Boulder 02](https://polyhaven.com/a/namaqualand_boulder_02) | Greg Zaal, Rico Cilliers | `props/namaqualand_boulder_02` |
| [Rock 07](https://polyhaven.com/a/rock_07) | Jenelle van Heerden | `props/rock_07`, the rock garden |
| [Rock 09](https://polyhaven.com/a/rock_09) | Jenelle van Heerden | `props/rock_09`, verge stones |
| [Dead Tree Trunk 02](https://polyhaven.com/a/dead_tree_trunk_02) | Jenelle van Heerden, Rico Cilliers | `props/dead_tree_trunk_02` |
| [Old Tyre](https://polyhaven.com/a/old_tyre) | MP | `props/tyre_stack` |
| [Modular Chainlink Fence](https://polyhaven.com/a/modular_chainlink_fence) | James Ray Cock, Amal Kumar | `props/chainlink_fence` |
| [Portable Generator](https://polyhaven.com/a/portable_generator) | James Ray Cock | `props/portable_generator` |
| [Metal Jerrycan](https://polyhaven.com/a/metal_jerrycan) | Sean Buckley | `props/metal_jerrycan` |
| [Wooden Picnic Table](https://polyhaven.com/a/wooden_picnic_table) | Ulan Cabanilla | `props/wooden_picnic_table` |
| [Plastic Monobloc Chair 01](https://polyhaven.com/a/plastic_monobloc_chair_01) | Kuutti Siitonen | `props/plastic_monobloc_chair_01` |
| [Tool Cart](https://polyhaven.com/a/tool_cart) | Savva Zakharov | `props/tool_cart`, from `../warehouse` |
| [Plastic Crate 03](https://polyhaven.com/a/plastic_crate_03) | Pacific Penguin | `props/plastic_crate_03`, from `../warehouse` |

The scanned models have fewer triangles than the originals
(`examples/tools/mesh_simplify.py`); the fence's wire takes its opacity map as
the alpha channel of its colour map.

## BlendKit (CC0)

`props/traffic_cone` is a copy with fewer triangles of `../city/traffic_cone`,
[Traffic Cone (Photoscanned)](https://www.blendkit.com/asset-gallery-detail/4aec6ae7-3b6f-4888-90ec-2e77f890c223/)
by Nik Kottmann, licensed CC0 on BlendKit.

## Assets used from other folders

The example also places trees, rocks, grass and flowers from `../forest`
(Poly Haven, CC0), credited in [../forest/ATTRIBUTION.md](../forest/ATTRIBUTION.md);
the sky and the parked cars from `../city` (CC0 and CC BY 4.0), credited in
[../city/ATTRIBUTION.md](../city/ATTRIBUTION.md); and the barrels and propane
tank from `../warehouse` (Poly Haven, CC0), credited in
[../warehouse/ATTRIBUTION.md](../warehouse/ATTRIBUTION.md).

This notice covers the third-party asset resources in this directory. It does
not change the licenses of Raisim, Rayrai, or the surrounding example code.
