# Decisions and open points

Decisions taken where the brief was silent, ambiguous or self-contradictory, and what could not be verified.

## Inputs

* The reference video was not attached, so the text is the whole spec (section 0.2). No side-by-side screenshots are possible; `screenshots/` holds the model's view at every checkpoint, portrait and landscape.

## Plan

* Four pairs of rooms share a face with zero wall thickness in section 6 (A|B at Y 0, B|C and B|E at X 0, E|F at X -3). Each got a 0.15 m interior wall by moving the smaller room's face: reception north face Y -0.15, kitchen and lobby east face X -0.15, master bedroom east face X -3.15. The hall keeps its exact size.
* The corridor starts at X 7.15 (beyond the hall's east wall); the hall's cased opening is the corridor's full width.
* Bedroom 2 and bedroom 6 are L-shaped polygons because their ensuites (H1, N1) sit inside their rectangles.
* Walls are built per room as half-thickness slabs (0.075 m interior, 0.30 m exterior). Each room is self-contained, so zone culling never opens a hole, and neighbouring halves meet back to back inside the wall.
* Door swing sides were chosen so every leaf stands at about 95 degrees against a wall and at least 0.4 m from the tour path. Exception: the master ensuite leaf opens to 88 degrees because a full 95 degrees would hit the ensuite's east wall. The ensuite vanity moved 0.15 m north (centre Y 7.75) to clear that leaf.
* Bedroom 3: the slim window (X 12.05-12.5) and the right-hand pink panel compete for the same wall. The pink pleated panel hangs in front of the window's west half; the charcoal curtain stays on the window.
* Reception lounge chairs moved from Y -0.4/-0.7 to -0.7/-0.78 so they clear the north wall, which moved to Y -0.15.
* The swivel chair in the master bedroom sits at (-3.65, 0.0) instead of (-3.6, -0.1) so it does not touch two walls.
* Bedroom 5 has one nightstand (east side, with the egg lamp). The dressing table of the navy section takes the west side.
* Closed decorative doors were added on the corridor walls in front of the unvisited filler rooms.
* The N1 layout (shower in the north part, vanity on the east wall, WC with the niche on the south wall) was chosen so the 84.0, 85.5 and 86.0 checkpoints frame what they list.

## Look and rendering

* Global illumination is approximated with one 256 px cube probe per room, captured twice at load (two bounces) and converted to a mip-mapped environment map. It is sampled with box projection (custom shader patch), which gives parallax-correct floor and mirror reflections without Reflector.
* An analytic ambient occlusion term from each room's bounding box darkens wall, floor and ceiling corners. Contact shadows under furniture are soft decals generated per piece, on every preset. GTAO is added on High.
* Lights come from a fixed pool (6 RectAreaLights, 6 PointLights, 1 shadowed DirectionalLight, 1 HemisphereLight). The light count never changes, so no shader recompiles while walking. Each pool light is clipped in the shader to its room's box, so unshadowed lights do not leak through walls. Lights fade in over about 0.4 s when they are reassigned.
* Cove LEDs are emissive lips plus additive light-wash gradients, which the probes pick up as indirect light. RectAreaLights are used for windows (sky light) and the long LED lines and track rows.
* Tone mapping: Neutral (closer to the soft, lifted look than ACES in tests), exposure 0.95. The grade runs inside a custom tone-mapping function, so the Low preset (no post-processing) looks the same as Medium and High. It applies, in order: a cool white balance (x0.90 red, x0.985 green, x1.12 blue) before tone mapping, then saturation x0.8, a slight cool tint in the shadows and a 0.035 black lift.
* The white balance step is not in the brief. Chandeliers (2700-3200 K) and warm coves gave every frame a warm cast that the probes then spread through the bounce light, so the measured mean saturation came out at twice the reference. Balancing the camera to about 4000 K, as an archviz artist would for mixed light, brings back the cool-neutral look of section 4.1 while lamps and wood still read warm.
* Rooms seen only through a thin, distant door sliver (portal less than 5% of the screen width and more than 3.5 m away) render only their shell: walls, floor, ceiling and windows. This keeps the long corridor views within the draw-call budget; furniture appears once the door is close enough to show it.
* Static geometry is merged per material per room (static batching), which gives fewer draw calls than InstancedMesh. Repeats (slats, globes, rods, books) are generated in code and batched the same way. Per-vertex colour, roughness and metalness let all untextured parts of a room share one material.
* Floors and wall tiles use a shader that picks a random window and rotation of a large stone texture for every tile and draws the grout procedurally, so no texture repeat is visible.
* Window exteriors are one painted canvas (sky, tree masses, lawn), drawn small and upscaled for softness, on unlit planes 6 m outside each window at 2.3x brightness so they bloom slightly.
* Textures are generated on the GPU (seeded hash noise) at load: floors up to 2048 px, the rest 512-1024 px.

## Controls and UI

* The joystick sits bottom-right because the UI is right-to-left (section 5.2).
* Dragging to look uses "grab the scene" direction (drag right, the view turns left), like most walkthrough viewers.
* On tall phones the portrait vertical FOV widens from 75 degrees up to 92 degrees so the horizontal FOV stays near 46 degrees.
* Tapping a wall or furniture walks to the floor point just in front of it.
* The signature "Py | Sohaib Qudeih" is set in Great Vibes (SIL Open Font License), subset to the needed letters and embedded as a data URI. The script font slants the "|", so the bar is drawn upright as a separate thin stroke. Arabic UI text uses Tajawal (OFL), also embedded. Fonts are not models, textures or HDRIs, so embedding them does not break rule 1.1; they are fetched once at build time and never at run time.

## Auto-tour

* Times and keys are exactly as in section 11. Positions are piecewise linear with a ±0.22 s smoothing window. Yaw and horizon use monotone cubic interpolation along the shortest turn.
* A few reference descriptions disagree with the listed yaw. At 60.6 s and 77.5 s the listed yaw points away from what the reference lists (at 77.5 s, yaw 300 looks north-west while the glass box is north-east). The 25-degree allowance cannot fix these, so the camera follows the listed yaw.

## Not verified

* No real phone GPU was available. Frame times from the sandbox (software rendering) mean nothing; performance was judged by draw calls, triangles and texture memory only (see `test/qa-report.json`).
* Safari/iOS was not tested.
* Shader compile time and probe capture time on a mid-range Android phone are estimates. Two probe passes for 16 rooms means about 200 cube-face renders at load.

## QA results (sandbox, headless Chromium with software WebGL)

* No console errors and no network requests at run time (`test/qa-report.json`).
* Budgets on the Medium preset over all 108 checkpoint renders: at most 173 draw calls and 597k triangles (budget 250 / 1.2M). Generated material textures are about 155 MB plus about 67 MB of environment probes (16 rooms x 256 px mip-mapped cubes).
* Auto-tour: sampled every 0.02 s, the path never comes closer than 0.21 m to a wall or a piece of furniture.
* Controls (Playwright touch emulation through CDP): joystick walk, wall stop at 0.25 m, sliding along a wall, stopping at furniture, drag to look, pinch zoom, tap the floor to walk, walking through a doorway, pausing the auto-tour on touch, and W/A/S/D on desktop all pass.
* Arabic UI computes as right-to-left.
* Brightness and colour over the 108 screenshots: mean luma 0.535 (reference 0.578), luma p2/p50/p98 38/145/202 (reference 34/151/219), mean saturation 0.116 (reference 0.079). 96 of 108 frames fall inside the reference's per-frame luma range of 0.39-0.67. The darker exceptions are close-ups of dark surfaces (fridge and ovens at 14.0 s, the walnut TV wall at 25.0 s, the walnut slats behind the ensuite mirror at 33.0 s); the brighter ones face white walls by a window (study at 64.5-65.5 s). Saturation stays above the reference because of the pink, navy and walnut rooms; the grade could be pushed further, but that would grey out the brass and wood the brief asks for.
