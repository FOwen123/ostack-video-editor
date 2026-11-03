# Animation styles

The style is chosen fresh for each video, from its subject. Every style uses the house palette, type and standing notes (SKILL.md, step 3); only the drawing changes. Kits are in `video-editor/projects/0926/remotion/src/`.

## Library

The three we have built, with kits to start from:

| Style | Suits | Built for | Kit |
|---|---|---|---|
| **Isometric diorama**: solid SVG objects with four-tone shading on a dark floor, a camera moving between front, isometric and top-down views | a world the story happens in: places, systems, machines, money, an attack spreading | Korea bank hack, self-replicating AI, Black October, software is dead, gold, Rust | `iso26/kit.tsx` (solid blocks, upright walls), `gold-iso/kit.tsx` (built on it), `dj3/kit.tsx` (booth props, camera keys); layers over the speaker: `HeadIso` and `Headroom` in `sw/common.tsx` |
| **Flat 2D**: front-on shapes, thin lines, black ground, one accent, depth from overlap and scale | how something works: diagrams, charts, sequences, comparisons, rows of tokens | evil neuron, monkey breeding, the NCM paper figures, the Rust logos | `en-neuron/kit.tsx`, `mk/kit.tsx` |
| **3D** (three.js): lit objects with real depth, a camera that keeps moving through the space | scale, a hero object, a place to travel through | Korea face-cam backgrounds, 1020's first version | `korea3d-6/three-canvas.tsx` and `finish.tsx`, `box3d/kit.tsx` (`Stage3D`) |

Style frames made but not yet built into a video, each a real option: editorial collage and luminous 3D (gold), doodle mascots, cartoon and kinetic type (1019), neon and terminal (self-replicating AI), lab schematic and glowing neuron (evil neuron). Any other style the subject points to (a map, a product's real UI, paper cut-outs, pixel art) is open too.

## Choosing

- **Look at what the subject is made of.** A story about a product suits its real interface; a place suits its map; a system suits a diorama; a mechanism suits a flat diagram. With no native material, choose by feeling: wonder or scale (3D), a world to follow (isometric), clarity (flat 2D), humour (doodle, kinetic type).
- **Three that genuinely differ.** If two frames differ only in colour or lighting, replace one.
- **Past picks inform, they don't decide.** Recommend from this video's subject, and say when the recommendation repeats the last video's style.
- **One lead style per video**, and a shot may borrow another when its line needs it, in the lead's palette, type and accent, so the cut reads as one video.
- **Explanations face the camera.** Whatever the lead style, a diagram, chart, sentence or step-by-step is drawn flat and upright ("show it directly horizontally in 2D", evil neuron).
- **Mascots act.** A mascot lives inside the style's camera and does what the line says (1019's took about 12 rounds: "on top of the board, not doing anything").

## Each style's failures

- **Isometric:** text on a diagonal surface, a far camera that makes the subject tiny (1019: "the animation doesn't express the word"), a floor grid over the face (1020 I20).
- **Flat 2D:** slides that sit still while the voice talks. Things build, travel and connect on their words.
- **3D:** technical steps shown at an angle (the 3D Rust blocks: "better shown vertically instead of 3d"; 1020's 3D version, rebuilt isometric: "this part of the animation is so bad"), a parked camera, an empty first frame while the canvas mounts, and long renders. Check the first and last frame of every 3D shot.
- **Any style:** too busy to read (1019's cartoon and kinetic tests). Motion layers around one clear subject.

Add a row or a failure here when a video teaches a new one.
