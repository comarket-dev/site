# Texture and warmth: warm stock

The site reads as one printed piece: Wada No. 295 inks on uncoated cream stock, in late-afternoon window light. The
photos are printed on the same paper, in the same light, so they belong to the page instead of sitting on it.
Board: `design/texture/board.png` (render with `python3 scripts/render-texture-board.py`).

## 1. Paper (texture)

- Every section surface carries one grain: `public/assets/texture/grain.webp` (warm specks on cream) and
  `grain-ink.webp` (Cream Yellow specks on the ink bands), built by `scripts/texture.py`. Fine tooth, a soft mottle and
  a few fibres, at low alpha over the section's own colour, so the palette doesn't shift. Dialed down on 2026-10-27
  (cream 0.2 to 0.13, ink 0.1 to 0.07).
- Creases: the sheet was folded a few times and smoothed flat again (`creases.webp`, `creases-ink.webp`, 1800px tiles).
  A few long folds and some short crinkles, lit from the page's light: one facet a touch darker, the other a touch
  lighter, a fine ridge at the fold. They sit under the grain in `--grain` and `--grain-ink`, so every surface has them.
- One scale everywhere: the grain is a 384px tile at 1x (on a 2x screen a speck is two device pixels, which is how paper
  tooth reads), the creases an 1800px tile. Both scroll with the page and never animate.
- Photos get the grain on top (`--tooth` in `Person.astro`), at the same scale, but not the creases: a fold through a
  face reads as damage, not paper.
- Never on product UI: the phone, storefronts, posts, forms and cards stay clean, like screens laid on the paper.

## 2. Light (warmth)

- One warm source, upper right, like a window. Where a photo meets the paper, a soft wash of `--sun` (Wada's Cream
  Yellow, `#fdbf68`) at 12 to 22% spills from the photo onto the page, so the photo's light carries into the layout.
- `--sun` is light, not a fill: radial washes only, never a flat block of colour behind text. Yellow (`#fff200`)
  still belongs only to the sale moment.

## 3. Photos (grade)

- One grade for every photo (`grade: warm` in `design/people/people.json`, baked by `scripts/people.py`): black
  lifts to the palette's ink, white settles on the page's paper, mids catch a little sun, colour eases back 12%.
  Shadows go violet and highlights go cream, so the photos share the page's two ends.
- Large and to an edge: a photo bleeds off at least one side of the viewport or fills its column. Square corners
  where it meets the viewport; no rounded thumbnails, no frames, no drop shadows.
- The 3D phone stands across a photo's edge, half on the photo and half on the paper, so the product and the people
  share one composition.

## Not this

Torn paper edges, deep or dark creases, tape, stickers, stamps, halftone dots, film borders, vignettes, light leaks, moving grain. Nothing
that reads as a filter or a costume. The texture should only be noticed when it's taken away.
