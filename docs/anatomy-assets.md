# Anatomy atlas assets: provenance and rebuild guide

The 3D body of the Astronaut Health Intelligence Platform is built from the **Z-Anatomy** atlas,
prepared in Blender and shipped as compressed glTF binaries, one per anatomical system. This page
records where the model comes from, what was changed, what was left out and how to rebuild it.

The published files live in `frontend/web/public/anatomy/` (`manifest.json`, nine `*.glb` files
and `LICENSE.md`). The pipeline lives in `frontend/web/scripts/anatomy/`.

## 1. Source model

| Item | Value |
| --- | --- |
| Model | Z-Anatomy, "Human male model" (the libre 3D atlas of anatomy), based on BodyParts3D |
| Project | https://www.z-anatomy.com/ |
| Repository | https://github.com/Z-Anatomy/Models-of-human-anatomy |
| File | `Z-Anatomy.zip` (86,734,957 bytes), which contains `Z-Anatomy/Startup.blend` (306,838,281 bytes) |
| Download URL | https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/Z-Anatomy.zip |
| SHA-256 of the zip | `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736` |
| Date obtained | 2026-11-14 |
| Source format | Blender file (.blend), meters, Z up, about 7,180 objects, flat material colors, no image textures |
| Published format | glTF 2.0 binary (GLB) with `EXT_meshopt_compression` and `KHR_mesh_quantization` |

### License and attribution

Z-Anatomy is distributed under the **Creative Commons Attribution-ShareAlike 4.0 International**
license (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/). The derived GLB files and
the manifest are distributed under the same license. The application source code keeps its own
license (MIT).

Attribution text required by the upstream license file:

- "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0"
- "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"

Authors listed upstream: Kousaku Okubo (BodyParts3D), Gauthier Kervyn (design, 3D, anatomy),
Marcin Zielinski (Blender add-on), Lluis Vinent (Unity development).

The upstream license file also lists models that Z-Anatomy used as reference or included and
adapted: "Brainder" and "White matter" from the University of Washington, "Cranial Nerves and
Foramina" by University of Dundee, CAHID (CC BY 4.0), "Anatomy of the Inner Ear" by University of
Dundee School of Medicine (CC BY-NC-SA 4.0) and "Kidney" by Lissie Cowley (CC BY-NC 4.0). The last
two are non commercial and are excluded from our files (section 3).

The same information is published next to the assets in `frontend/web/public/anatomy/LICENSE.md`
and inside `manifest.json` (`source`).

## 2. What the blend contains and how it is read

The blend is organized for the Z-Anatomy Blender add-on, not for export. Findings that drive the
pipeline:

- Top level collections `1: Skeletal system`, `2: Muscular insertions`, `3: Joints`,
  `4: Muscular system`, `5: Cardiovascular system`, `6: Lymphoid organs`,
  `7: Nervous system & Sense organs`, `8: Visceral systems`, `9: Regions of human body` hold the
  objects directly. The `Bonus collection` links the same objects again in a detailed tree, so it
  adds nothing: only four helper curves exist in it alone.
- The anatomical hierarchy is in the parent chain: every body is parented to a text label, and
  group labels (suffix `.g`) form the tree ("Bones of foot", "Rotator cuff muscles", and so on).
  The grouping rules read this chain.
- Name suffixes:
  - `.l` / `.r`: left and right. The body faces -Y in Blender and anatomical left is +X.
  - `.t`, `.s`, `.st`: text labels (FONT objects). Never exported.
  - `.g`: group titles (text, a few converted to mesh). Never exported.
  - `.j`: empty helper meshes that draw the leader line of a label. Never exported.
  - `.i`: empty hidden helper meshes parented to sub labels. Never exported.
  - `.ol`, `.or`, `.o1l`, `.o2r` ...: muscle origin maps painted on the bones. Never exported.
  - `.el`, `.er`, `.e1l`, `.e2r` ...: muscle end (insertion) maps painted on the bones. Never exported.
- Vessels, nerves, bronchi and ducts are CURVE objects with a round bevel (about 950 curves).
- Many meshes are low resolution with Subdivision Surface, Solidify, Mirror, Array and Curve
  modifiers. The spinal cord is a small cross section extruded along a path with Array and Curve.
- The body surface is about 250 separate region patches with a Solidify modifier.
- Right side objects are often mirrored copies with a negative scale.

## 3. What was excluded and why

License exclusions (recorded with the exact object names in `manifest.json`, `source.excluded`):

- **Ear**: internal ear (cochlea, vestibule), auditory ossicles (incus, malleus, stapes), tympanic
  membrane, auditory tube, cochlear and vestibular nerves. The upstream "Anatomy of the Inner Ear"
  model is CC BY-NC-SA 4.0. When in doubt the whole ear was removed (18 objects).
- **Kidney**: `Kidney.l`, `Kidney.r`, `Renal pelvis.l`, `Renal pelvis.r` and the four intrarenal
  vessel curves. The upstream "Kidney" model is CC BY-NC 4.0. The kidneys in our files are AHI
  procedural geometry (section 5).

Neutral reference body (product decision, also recorded in `manifest.json`, `source.excluded`):
the atlas stands for every crew member, men and women, and no monitored metric relates to
reproductive structures. Reason recorded: "not related to any monitored metric; neutral reference
body".

- **Reproductive structures are not exported** (33 objects): corpus cavernosum, corpus spongiosum
  and glans of the penis, testes, epididymides, ductus deferentes, ejaculatory ducts, seminal
  glands, prostate; the vessels, nerves and ducts that only serve them (testicular arteries and
  veins, arteries and veins of the penis, external pudendal arteries and veins, genital branch of
  the genitofemoral nerve) and the urethra, whose male course runs through the external genitalia.
  The structure `male-reproductive-organs` of the first build no longer exists.
- **External genital region of the skin**: the two `Urogenital region` patches of collection
  "9: Regions of human body" are removed and replaced by a smooth neutral surface inside the
  `skin` structure (section 4, step 7).

Not physical bodies: text labels and their helpers, muscle origin and insertion maps, reference
lines, reference planes, movement arrows, cross section planes and objects that only exist in the
Bonus collection.

Left out for clarity and draw call budget: lymph nodes and tonsils, fasciae (they wrap whole limbs
and hide the muscles), bursae, tendon sheaths, ligaments, joint capsules and membranes, meninges,
pleura, peritoneum and omenta, ventricles and other cavities, paranasal sinuses, hair, liver
segments (duplicates of the liver surface), small brainstem nuclei, the inner white matter surface
of the cerebrum, the internal parts of the eyeball and the lacrimal apparatus, gingiva and palate.

## 4. Modifications made in Blender

Everything below is done by `scripts/anatomy/export_atlas.py`, headless, with
`--factory-startup --disable-autoexec` (scripts embedded in the blend never run).

1. Classification: every MESH and CURVE object of the eight used collections is matched by name
   and by its ancestor labels to one structure, or dropped. Unmatched objects are reported.
2. Modifiers: evaluated through the dependency graph in a new empty scene. Subdivision Surface is
   limited to one level. Boolean, Geometry Nodes, Skin, Wireframe, Decimate and Hook modifiers are
   turned off. Solidify is turned off for the skin only, so the skin is a single layer surface.
3. Curves: converted to tube meshes. Thin tubes use 4 sides, medium ones 6, large ones 8, with a
   lower resolution along the curve. Tubes thinner than 0.55 mm are widened to a 0.55 mm radius so
   that small vessels and nerves stay visible at full body zoom.
4. Transforms applied in world space. Mirrored objects (negative scale) get their face winding
   reversed so normals point outward.
5. Join: all source objects of a structure become one mesh named with the structure id.
6. Cleanup: vertices welded (0.02 mm, 0.3 mm for the skin), loose vertices removed, faces
   triangulated, sharp edge marks cleared, smooth shading.
7. Skin: region patches joined into one surface, face normals recalculated outward and vertex
   normals blended across the seams between regions (border vertices within 1.2 mm share one
   normal), because the patch borders do not always share vertices.
   Neutral groin surface: the faces of the external genital region are deleted. That region met
   the rest of the skin along two closed loops (one on the pubic surface, one under it between
   the thighs). Each loop is closed with a new patch of concentric rings, the small opening left
   between the two loops is filled, and every new vertex is relaxed to the average of its
   neighbours with the loops held in place (the smooth membrane that spans the border). A final
   smoothing pass over the patches and three rings of surrounding skin blends the result into the
   lower abdomen, the perineum and the inner thighs. The skin stays one single surface, with no
   open edge in that area.
8. Decimation: Decimate modifier in collapse mode. Each system has a triangle budget that is
   shared between its structures in proportion to `weight * rawTriangles^0.6`, never above the
   raw count. The cerebral cortex has a fixed budget (66,000 triangles) because the gyri need
   density; limb bones are kept almost intact because they are already low poly upstream.
9. Frame: the model is translated so the skin bounding box has its feet on the ground and is
   centered, then exported with Y up (section 7).
10. Materials: the 188 upstream materials are replaced by one neutral material per tissue class.
    The viewer assigns its own materials from the `tissue` field.
11. Export: one GLB per system, node name equal to the structure id, normals included, no UVs,
    tangents, vertex colors, cameras, lights, animations or skins.

Then `scripts/anatomy/optimize.mjs` (Node, glTF Transform and meshoptimizer): adds the kidneys,
dedup, weld, prune, snaps positions to a 1/16384 m grid (0.06 mm), stores normals as normalized
8 bit integers (`KHR_mesh_quantization`), reorders for size and compresses every buffer with
`EXT_meshopt_compression`. Mesh nodes keep an identity transform (positions stay float32), so the
viewer can move or scale a node freely.

## 5. Kidneys (AHI procedural geometry)

`scripts/anatomy/build-kidneys.ts` builds both kidneys with the signed distance field toolkit of
the procedural viewer (`src/features/anatomy/procedural/geometry`: `sdf.ts`, `simplify.ts`,
`vec.ts`) and the same definition as `kidneyPrims` in `organs.ts`: a tilted ellipsoid with a smooth
hilum notch on the medial side. The adrenal cap of the procedural model is left out because the
atlas has the adrenal glands as separate structures.

`optimize.mjs` then fits each kidney to the bounding box (center and size) of the corresponding
Z-Anatomy kidney. Only those six numbers per kidney are read from the atlas; no upstream kidney
geometry is used. The structures are `kidney-left` and `kidney-right`, system `urinary`, tissue
`kidney`, `origin: "ahi-procedural"`.

## 6. Structures, systems and naming

`manifest.json` follows the `AtlasManifest` type in
`frontend/web/src/features/anatomy/atlas/types.ts`. Every structure is one mesh node in the GLB of
its system and the node name is the structure id.

Naming rules:

- Ids are kebab-case English anatomical names and are meant to stay stable between builds.
- A single paired structure ends with the side: `femur-left`, `lung-right`, `kidney-left`.
- A merged group of small structures names the side inside: `bones-of-left-hand`,
  `muscles-of-right-foot`, `arteries-of-left-upper-limb`.
- Midline or merged structures have no side: `skull`, `heart`, `rectus-abdominis`, `aorta`.
- `side` is `L`, `R` or `null`. Left structures are at x > 0.
- `parent` is used for three structures: `coronary-arteries` and `cardiac-veins` (parent `heart`)
  and `cerebrum-deep-structures` (parent `brain`).
- Required ids (the application relies on them): `skin`, `heart`, `lung-left`, `lung-right`,
  `brain`, `kidney-left`, `kidney-right`.

Systems and what they hold (250 structures):

| System | Structures | Content |
| --- | --- | --- |
| integumentary | 1 | `skin`: the whole body surface |
| skeletal | 41 | skull, mandible, upper and lower teeth, hyoid, cervical, thoracic and lumbar vertebrae, sacrum, coccyx, intervertebral discs, sternum, ribs and costal cartilages per side, nasal cartilages, and per side: clavicle, scapula, humerus, radius, ulna, bones of hand, hip bone, femur, patella, tibia, fibula, bones of foot |
| muscular | 133 | 64 structures per side (individual large muscles such as deltoid, biceps brachii, pectoralis major, gluteus maximus, quadriceps femoris, and merged groups such as flexor muscles of forearm, muscles of hand, deep back muscles) plus rectus abdominis, pelvic floor, muscles of larynx, pharynx and tongue; the calcaneal tendons use tissue `tendon` |
| cardiovascular | 29 | heart (chambers, valves, papillary muscles), coronary arteries, cardiac veins, aorta, venae cavae, pulmonary arteries and veins, hepatic portal vein, arteries and veins by region (brain, head and neck, thorax, abdomen, pelvis, upper limb, lower limb) |
| respiratory | 6 | lungs, trachea, bronchi, larynx (cartilages and epiglottis), diaphragm |
| nervous | 17 | brain (cerebral cortex), deep structures of cerebrum, cerebellum, brainstem, spinal cord, and per side: cranial nerves, spinal nerve roots, intercostal nerves, sympathetic trunk, nerves of upper limb, nerves of lower limb |
| digestive | 10 | tongue, salivary glands, pharynx, esophagus, stomach, small intestine, large intestine, liver, gallbladder, pancreas |
| urinary | 4 | kidneys (procedural), ureters, urinary bladder |
| other | 9 | eyes, thyroid, pituitary, pineal, adrenal glands, thymus, spleen |

Tissue classes used: skin, bone, cartilage, tooth, muscle, tendon, heart, artery, vein, lung,
airway, brain, nerve, liver, kidney, gut, gland, eye, organ.

## 7. Coordinate frame

Meters, Y up, body facing +Z, feet on y = 0, centered on x = 0 and z = 0 (the center of the skin
bounding box). Anatomical left is +X, so the heart sits at x > 0. Bounds of the published model:
x from -0.340 to 0.340, y from 0 to 1.710, z from -0.147 to 0.147. All mesh nodes have an identity
transform.

## 8. Budgets and final numbers

Budget: at most about 12 MB in total (hard ceiling 16 MB), no file above about 4 MB, about 600,000
to 900,000 triangles in total.

Build of 2026-11-14:

| System | File | Structures | Triangles | Bytes | MB |
| --- | --- | --- | --- | --- | --- |
| integumentary | integumentary.glb | 1 | 48,503 | 256,684 | 0.24 |
| skeletal | skeletal.glb | 41 | 184,971 | 995,640 | 0.95 |
| muscular | muscular.glb | 133 | 299,818 | 1,737,700 | 1.66 |
| cardiovascular | cardiovascular.glb | 29 | 89,893 | 527,100 | 0.50 |
| respiratory | respiratory.glb | 6 | 44,991 | 235,056 | 0.22 |
| nervous | nervous.glb | 17 | 133,356 | 694,596 | 0.66 |
| digestive | digestive.glb | 10 | 41,990 | 228,016 | 0.22 |
| urinary | urinary.glb | 4 | 10,826 | 57,676 | 0.06 |
| other | other.glb | 9 | 26,008 | 135,708 | 0.13 |
| **Total** | 9 files | **250** | **880,356** | **4,868,176** | **4.64** |

The 2,232 selected source objects have about 4.0 million triangles after modifiers; the published
model keeps about 22 percent of them. The nervous system is slightly above the 130,000 guide on purpose (the
cortex needs the density) and the total stays inside the range.

## 9. How to rebuild

Prerequisites:

- Blender 4.5 LTS (the build was made with 4.5.16). Any install or portable build works.
- Node 20 or newer, with the dependencies of `frontend/web` installed (`npm ci`). The pipeline
  uses the pinned dev dependencies `@gltf-transform/core`, `@gltf-transform/extensions`,
  `@gltf-transform/functions` (4.5.1), `meshoptimizer` (1.3.0) and `tsx`.
- About 500 MB of free disk for the cache and about 5 minutes.

Steps (run inside `frontend/web`):

```sh
# 1. tell the pipeline where Blender is (PowerShell: $env:BLENDER_BIN = "C:\path\to\blender.exe")
export BLENDER_BIN="/path/to/blender"

# 2. run the whole chain
npm run anatomy:build
```

`npm run anatomy:build` runs `scripts/anatomy/build.mjs`, which does:

1. `fetch-source.mjs`: downloads `Z-Anatomy.zip` from raw.githubusercontent.com (the only host
   allowed) into `frontend/web/.cache/anatomy/source/` (ignored by git), verifies the SHA-256 and
   extracts `Startup.blend` alone into its own folder.
2. `export_atlas.py` in Blender: writes raw GLBs and `atlas-meta.json` to `.cache/anatomy/raw/`.
3. `build-kidneys.ts`: writes `.cache/anatomy/raw/kidneys.json`.
4. `optimize.mjs`: writes the final GLBs and `manifest.json` to `public/anatomy/` and prints the
   size and triangle report.
5. `validate.mjs`: checks the published files against the contract (also `npm run anatomy:validate`).

Options:

| Option | Environment variable | Meaning |
| --- | --- | --- |
| `--blender <path>` | `BLENDER_BIN` | Blender executable (required) |
| `--blend <path>` | `ANATOMY_SOURCE_BLEND` | use an already extracted `Startup.blend`, skips the download |
| `--cache <dir>` | `ANATOMY_CACHE_DIR` | work folder, default `frontend/web/.cache/anatomy` |
| `--out <dir>` |  | output folder, default `frontend/web/public/anatomy` |
| `--skip-blender` |  | reuse the raw GLBs of the previous run (only steps 3 to 5) |
| `--previews` |  | also render preview sheets of the published files into `.cache/anatomy/previews` |

Example: `npm run anatomy:build -- --blend D:/models/Startup.blend --previews`

Useful when changing the rules: `export_atlas.py` accepts `--only skeletal,nervous` (partial
export, frame offset not applied) and `--scale 1.5` (multiplies every triangle budget).

### Validation

- `validate.mjs` parses each GLB container directly (JSON chunk) and fails when: a manifest
  structure has no mesh node with its id in the file of its system, an id is duplicated, a required
  id is missing, a left structure is not at x > 0 (or a right one at x < 0), a node has a
  transform, the triangle counts or bounds disagree with the manifest, an excluded source object
  slipped in, a reproductive structure is exported or its exclusion is not recorded, Draco, textures, cameras, lights or animations are present, or the size ceiling is
  exceeded.
- Visual check: `--previews` decodes the published files (`decode-for-preview.mjs`), imports them
  into an empty Blender scene and renders front, left and back sheets of the skin, of the full body
  and of each system (`render_previews.py`, Workbench). `render_previews.py` also takes
  `--cull` (backface culling, shows flipped faces) and `--focus name@systems:cx,cy,cz,size` for
  close ups (front, left, back and from below).
- `src/features/anatomy/atlas/manifest.contract.test.ts` checks the manifest in the unit tests.

## 10. Updating when Z-Anatomy releases a new version

1. Download the new `Z-Anatomy.zip`, compute its SHA-256 and size, and read the upstream
   `License.txt` again: check the license, the attribution text and the list of third party models
   (new non commercial content must be added to the exclusion rules).
2. Update `SOURCE_SHA256` and `SOURCE_BYTES` in `scripts/anatomy/fetch-source.mjs`, and `SOURCE`
   (`sha256`, `retrievedAt`) in `scripts/anatomy/optimize.mjs`.
3. Run `npm run anatomy:build -- --previews`. Look at the log: lines starting with
   `[atlas] UNMATCHED` list objects that no rule recognized (renamed or new structures), and
   `WARN empty structure dropped` lists structures that lost all their source objects. Adjust the
   rule functions in `export_atlas.py` (`rule_skeletal`, `rule_muscular`, `rule_cardio`,
   `rule_nervous`, `rule_visceral`, ...). The script stops with a clear message when a top level
   collection was renamed.
4. Keep the structure ids stable. When an id has to change, bump `version` in the manifest writer
   and tell the viewer and health mapping owners.
5. Check the preview sheets, the report (sizes and triangles) and the validation, then update the
   numbers and the date in this page and in `public/anatomy/LICENSE.md`.

## 11. Known limitations

- **Single reference model, made neutral.** The source is one adult male model. It is used as
  reference anatomy for every crew member, so the reproductive structures are not exported and the
  groin of the skin is a smooth neutral surface. The build, the proportions and the chest remain
  those of the source model. It is not a scan of any astronaut and it does not adapt to sex, height
  or body composition.
- **Neutral groin surface.** It is a generated membrane, not anatomy. The urethra is not exported,
  so the urinary bladder has no outlet in the model.
- **Procedural kidneys.** The kidneys are simple bean shaped surfaces placed where the atlas
  kidneys are. They have no internal anatomy (no renal pelvis, no intrarenal vessels).
- **No ear structures** and no lymph nodes, fasciae, ligaments or meninges (section 3).
- **No textures upstream.** The source has flat material colors only, so all surface detail comes
  from geometry and from the viewer materials.
- **Decimation.** Almost four fifths of the source triangles are removed. Thin sheets (intercostal
  muscles, pharynx, iliotibial tract) and long tubes are the most simplified. Vessel and nerve tubes
  have 4 to 8 sides and a minimum radius of 0.55 mm, so the smallest ones are drawn thicker than in
  reality.
- **Skin.** Built from region patches without thickness. A few faint shading seams remain around the
  jaw and the ears. The eyelids are open and the eyes are separate structures (`eye-left`,
  `eye-right`, system `other`) with a single material (no colored iris).
- **Grouping is a design choice.** Small muscles, hand and foot bones, vessels and nerves are merged
  by region to keep about 250 selectable structures; individual vertebrae, ribs and teeth are not
  selectable one by one.
- This is decision support and education material, not a medical device.
