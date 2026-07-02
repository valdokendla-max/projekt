// Single source of truth for the 7 homepage image-action prompts.
// Edit a prompt here -> commit -> Pages auto-rebuild propagates it.

export type ImageTransformVariant =
  | 'tattoo-realistic'
  | 'tattoo-portrait'
  | 'enhance'
  | 'line-art'
  | 'text-logo'
  | 'relief-3d'

export type Language = 'est' | 'eng'

export interface ActionLabels {
  est: { name: string; description: string }
  eng: { name: string; description: string }
}

// -------------------------------------------------------------------------
// Image edit prompts (POST /api/image-transform — uses /v1/images/edits)
// -------------------------------------------------------------------------

export const IMAGE_TRANSFORM_PROMPTS: Record<ImageTransformVariant, string> = {
  'tattoo-realistic': `Transform this exact reference image into a highly detailed black and grey realistic pencil-style tattoo design.

CRITICAL RULES:
- Preserve the EXACT composition of the reference
- Keep ALL original subjects in their exact positions
- DO NOT add any new subjects, faces, people, characters, or objects that are NOT in the reference
- DO NOT change the layout or arrangement
- Only enhance what is already there

Enhance with:
- Smooth gradient shading and depth on all existing elements
- Realistic fur texture on animal manes (if animal present)
- Detailed metallic shading on mechanical objects (clocks, gears, keys)
- Soft petal shading on flowers
- Layered leaf textures
- Strong contrast between deep black shadows and soft grey highlights
- Pencil/charcoal drawing aesthetic with smooth whip shading
- Sharp clean linework preserved underneath

Output: professional black and grey realistic tattoo flash artwork, pencil drawing aesthetic, centered composition, pure clean white background, no frame, no border, no added decoration outside the original subjects.

Negative prompt: added faces, added people, added humans, new characters not in reference, woman, man, child, additional subjects, different composition, colored, watercolor, cartoon, anime, flat shading, low detail, blurry, distorted anatomy, added animals, added objects, scenery, environment, photo background, frame, border.`,

  'tattoo-portrait': `Transform this exact reference image into a highly detailed black and grey realistic pencil-style tattoo design featuring the people from the reference.

CRITICAL RULES:
- Preserve the EXACT composition of the reference
- Keep ALL original subjects in their exact positions
- DO NOT add any new subjects, faces, or people that are NOT in the reference
- DO NOT change the layout or arrangement

For HUMAN subjects (faces, portraits):
- Preserve the EXACT identity, age, and facial features of every person
- Keep skin smooth and clean — do NOT add wrinkles
- Do NOT age the subjects — children stay children, young people stay young, elderly stay elderly
- Soft natural shading on faces only, no heavy stippling on facial skin
- Faces remain instantly recognizable and identical to the reference
- Eyes, nose, mouth proportions stay exactly as in reference

For ornamental/background/clothing elements:
- Add smooth gradient shading and depth
- Add realistic textures (fabric folds, hair strands, leaves, flowers)
- Strong contrast between deep black shadows and soft grey highlights
- Pencil/charcoal drawing style with refined detail

Output: professional black and grey realistic portrait tattoo flash artwork, pencil drawing aesthetic, centered composition, pure clean white background, no frame, no border.

Negative prompt: added faces, added people not in reference, new characters, aged faces, wrinkled skin on young people, added age, distorted facial features, changed identity, unrecognizable faces, colored, watercolor, cartoon, anime, flat shading, low detail, blurry, distorted anatomy, scenery, environment, photo background, frame, border.`,

  enhance: `Enhance and clean up this exact reference image. Make it visually crisp, sharp, and highly detailed while preserving 100% of the original composition.

CRITICAL RULES:
- Preserve the EXACT composition, subjects, and layout
- DO NOT add, remove, or change any elements
- DO NOT alter the style — keep it as the reference
- Only IMPROVE clarity and detail

Enhancements:
- Sharpen all edges and linework
- Improve contrast — deeper blacks, cleaner whites
- Remove any noise, blur, compression artifacts, or background distractions
- Enhance fine details (textures, small elements)
- Clean and unify the background (pure white or as in reference)
- Balanced exposure across the image
- Professional high-resolution quality
- Crisp, clean, gallery-ready finish

For human subjects (if present):
- Preserve exact identity and age
- Smooth skin clean-up only, no aging, no wrinkles added

Output: high-resolution clean version of the same image, sharper and more detailed, ready for laser engraving or printing.

Negative prompt: changed composition, added elements, removed elements, different style, distorted subjects, colored if original is black and white, low quality, blurry, noisy, dark, washed out, oversaturated, cartoon, anime, photo background, frame, border, watermark, text.`,

  'line-art': `Convert this exact reference image into a clean simple line art drawing suitable for laser engraving and vector tracing in LightBurn.

CRITICAL RULES:
- Preserve the EXACT composition and all subjects from the reference
- DO NOT add or remove any elements
- Keep the same layout and proportions

Style requirements:
- Pure black outlines on pure white background
- Simple clean continuous lines, no broken or sketchy strokes
- Uniform line weight throughout — clean and consistent
- NO shading, NO gradients, NO grey tones, NO dotwork, NO stippling, NO crosshatching
- ONLY outlines — bold and minimal
- Connected closed shapes where possible (better for vector tracing)
- Strong silhouette and clear contours
- Minimal interior detail — only essential lines that define the shape
- Suitable for single-pass laser cutting OR LightBurn Trace-to-Vector conversion

Output: clean minimalist line drawing, pure black on pure white, vector-ready, centered composition, no frame, no border, no shading whatsoever.

Negative prompt: shading, gradients, grey tones, dotwork, stippling, crosshatching, sketchy lines, broken strokes, varying line weight, fill colors, watercolor, realistic style, photo, 3D, depth, shadows, highlights, texture, background, frame, border, watermark.`,

  'text-logo': `Convert this exact reference (text or logo) into a clean professional engraving-ready version optimized for laser engraving.

CRITICAL RULES:
- Preserve the EXACT text content, letters, words, symbols, and logo elements
- DO NOT change letterforms, font style, or proportions
- DO NOT add new elements or decorations not in the reference
- Keep the same layout and composition

For TEXT:
- Sharp clean letter edges
- Uniform stroke weight
- Pure black on pure white
- Crisp typography ready for engraving
- Preserve original font characteristics

For LOGO:
- Bold clean shapes
- Solid black fills where appropriate, clean outlines elsewhere
- Remove any gradients or shading — convert to solid black and white
- Sharp vector-ready edges
- Preserve symbol proportions and details

Output: high-contrast pure black on pure white version, optimized for laser engraving, sharp edges, no gradients, no grey tones, centered composition, no frame, no border.

Negative prompt: gradients, grey tones, soft edges, blur, anti-aliasing artifacts, changed text, misspellings, changed letters, added decoration, frame, border, background, drop shadow, 3D effect, glow, colored, watercolor, sketchy, distorted letterforms, illegible text.`,

  'relief-3d': `Transform this exact reference image into a highly detailed 3D sculptural relief style suitable for deep laser engraving on wood, stone, or metal.

CRITICAL RULES:
- Preserve the EXACT composition, pose, and all subjects from the reference
- Keep ALL original elements in their exact positions
- DO NOT add new subjects, faces, characters, or objects
- DO NOT change the layout, anatomy, or proportions

Style requirements:
- High-relief 3D sculpture aesthetic, like carved marble or stone
- Pure white surface with deep dramatic shadows defining the form
- Smooth volumetric shading — soft gradient transitions from highlight to shadow
- Cinematic directional lighting from above-left creating clear depth
- Sharp crisp shadows in recessed areas, bright highlights on raised surfaces
- Realistic anatomy and musculature (if figures present)
- Intricate sculpted detail on textured elements (hair curls, feathers, fabric folds, chains, ornamental work)
- Polished marble or fine stone surface quality
- Clean monochrome white-to-grey-to-black tonal range
- Strong sense of three-dimensional depth and volume
- Classical sculpture aesthetic — Renaissance/Baroque inspired

Background:
- Pure black background isolating the sculpted subject
- Subject fully lit, background completely dark for maximum contrast

Output: photo-realistic 3D sculptural relief rendering, white marble or carved stone aesthetic, dramatic chiaroscuro lighting, centered composition, isolated on solid black background, ready for depth-map laser engraving.

Negative prompt: flat shading, line art, outlines only, sketchy, pencil drawing, tattoo style, watercolor, cartoon, anime, colored, low contrast, grey background, white background, washed out, no shadows, no depth, 2D, illustration style, added subjects, changed pose, distorted anatomy, frame, border, text, watermark.`,
}

// User-facing labels for each variant (i18n)
export const IMAGE_TRANSFORM_LABELS: Record<ImageTransformVariant, ActionLabels> = {
  'tattoo-realistic': {
    est: { name: 'Tattoo realistlik', description: 'Muuda line art realistlikuks eskiisiks sügavuse ja varjudega' },
    eng: { name: 'Tattoo realistic', description: 'Turn line art into a realistic sketch with depth and shadows' },
  },
  'tattoo-portrait': {
    est: { name: 'Tattoo portree', description: 'Inimese foto → realistlik portree-tattoo, näod säilivad' },
    eng: { name: 'Tattoo portrait', description: 'Person photo → realistic portrait tattoo, faces preserved' },
  },
  enhance: {
    est: { name: 'Pildi puhastus', description: 'Tee pilt selgemaks, puhtamaks ja detailsemaks' },
    eng: { name: 'Image cleanup', description: 'Make the image sharper, cleaner, more detailed' },
  },
  'line-art': {
    est: { name: 'Vector fail', description: 'Foto → puhas vektor SVG (lõikefail LightBurni jaoks)' },
    eng: { name: 'Vector file', description: 'Photo → clean vector SVG (cut file for LightBurn)' },
  },
  'text-logo': {
    est: { name: 'Tekst / Logo', description: 'Tekst või logo → graveeritav versioon' },
    eng: { name: 'Text / Logo', description: 'Text or logo → engraving-ready version' },
  },
  'relief-3d': {
    est: { name: '3D reljeef', description: 'Skulpturaalne 3D efekt sügav-graveerimisele puidule/kivile' },
    eng: { name: '3D relief', description: 'Sculptural 3D effect for deep engraving on wood/stone' },
  },
}

// Done message shown in chat after successful generation
export const IMAGE_TRANSFORM_DONE_MESSAGES: Record<ImageTransformVariant, ActionLabels> = {
  'tattoo-realistic': {
    est: { name: 'Tattoo eskiis on loodud.', description: '' },
    eng: { name: 'Realistic tattoo sketch created.', description: '' },
  },
  'tattoo-portrait': {
    est: { name: 'Portree-tattoo on loodud.', description: '' },
    eng: { name: 'Portrait tattoo created.', description: '' },
  },
  enhance: {
    est: { name: 'Pilt on puhastatud.', description: '' },
    eng: { name: 'Image cleaned up.', description: '' },
  },
  'line-art': {
    est: { name: 'Vector fail on loodud.', description: '' },
    eng: { name: 'Vector file created.', description: '' },
  },
  'text-logo': {
    est: { name: 'Tekst / logo on graveerimisvalmis.', description: '' },
    eng: { name: 'Text / logo is engraving-ready.', description: '' },
  },
  'relief-3d': {
    est: { name: '3D reljeef on loodud.', description: '' },
    eng: { name: '3D relief created.', description: '' },
  },
}

// Output filename suffix per variant
export const IMAGE_TRANSFORM_FILENAMES: Record<ImageTransformVariant, string> = {
  'tattoo-realistic': 'tattoo-realistlik.png',
  'tattoo-portrait': 'tattoo-portree.png',
  enhance: 'puhastatud.png',
  'line-art': 'vector-fail.svg',
  'text-logo': 'tekst-logo.png',
  'relief-3d': '3d-reljeef.png',
}

// -------------------------------------------------------------------------
// Birth card (POST /api/birth-card — uses /v1/images/generations)
// -------------------------------------------------------------------------

export const ZODIAC_SIGNS = [
  'Jäär', 'Sõnn', 'Kaksikud', 'Vähk', 'Lõvi', 'Neitsi',
  'Kaalud', 'Skorpion', 'Ambur', 'Kaljukits', 'Veevalaja', 'Kalad',
] as const
export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]

export const CHINESE_ZODIAC_ANIMALS = [
  'Rott', 'Härg', 'Tiiger', 'Jänes', 'Draakon', 'Madu',
  'Hobune', 'Kits', 'Ahv', 'Kukk', 'Koer', 'Siga',
] as const
export type ChineseZodiacAnimal = (typeof CHINESE_ZODIAC_ANIMALS)[number]

export const ZODIAC_SIGN_EN: Record<ZodiacSign, string> = {
  'Jäär': 'Aries',
  'Sõnn': 'Taurus',
  'Kaksikud': 'Gemini',
  'Vähk': 'Cancer',
  'Lõvi': 'Leo',
  'Neitsi': 'Virgo',
  'Kaalud': 'Libra',
  'Skorpion': 'Scorpio',
  'Ambur': 'Sagittarius',
  'Kaljukits': 'Capricorn',
  'Veevalaja': 'Aquarius',
  'Kalad': 'Pisces',
}

export const CHINESE_ZODIAC_EN: Record<ChineseZodiacAnimal, string> = {
  'Rott': 'Rat',
  'Härg': 'Ox',
  'Tiiger': 'Tiger',
  'Jänes': 'Rabbit',
  'Draakon': 'Dragon',
  'Madu': 'Snake',
  'Hobune': 'Horse',
  'Kits': 'Goat',
  'Ahv': 'Monkey',
  'Kukk': 'Rooster',
  'Koer': 'Dog',
  'Siga': 'Pig',
}

export const BIRTH_CARD_LABELS: ActionLabels = {
  est: { name: 'Sünnikaart', description: 'Tähtkuju + sünniaasta loom + hingeloom — kombineeritud kaart' },
  eng: { name: 'Birth card', description: 'Zodiac + year animal + spirit animal — combined card' },
}

export interface BirthCardInputs {
  tahtkuju: ZodiacSign
  sunniaasta_loom: ChineseZodiacAnimal
  hingeloom: string
}

export function buildBirthCardPrompt(inputs: BirthCardInputs): string {
  const zodiac = ZODIAC_SIGN_EN[inputs.tahtkuju]
  const yearAnimal = CHINESE_ZODIAC_EN[inputs.sunniaasta_loom]
  const spiritAnimal = inputs.hingeloom.trim()

  return `Create a mystical vintage zodiac tarot card style illustration combining three symbolic elements in one harmonious composition.

ELEMENTS TO INCLUDE (use ONLY these three subjects — no others):
1. Zodiac sign: ${zodiac} — represented as the central traditional zodiac symbol or figure
2. Chinese zodiac animal: ${yearAnimal} — represented as a large mythical creature flowing around or alongside the central figure
3. Spirit animal: ${spiritAnimal} — represented at the bottom of the composition, sitting or standing on clouds, grounded and watchful

COMPOSITION:
- Vertical portrait orientation (tall card format)
- Oval decorative frame border around the entire scene
- Zodiac symbol of ${zodiac} at the top inside the frame
- Constellation star pattern of ${zodiac} visible in the upper background
- Central zodiac figure in the middle of the card
- Chinese zodiac animal ${yearAnimal} curving along one side, large and dynamic
- Spirit animal ${spiritAnimal} at the bottom, sitting on soft clouds
- Decorative cloud patterns filling the lower corners

STYLE:
- Vintage tarot card aesthetic
- Black ink linework on aged parchment / cream-colored background
- Fine detailed engraving style — like classical book illustration
- Soft shading and subtle textures
- Mystical and symbolic atmosphere
- Balanced symmetrical composition
- Decorative oval frame with thin double-line border
- Star constellation lines and dots in background

TECHNICAL:
- Highly detailed pen-and-ink illustration
- Sharp clean linework
- Soft cross-hatching for shading where needed
- Centered composition
- Output is the FULL card design only, no external background, no hands, no plants, no real objects, no photo elements
- Clean parchment/cream colored background only

Negative prompt: photo, photorealistic, 3D rendering, modern art, cartoon, anime, watercolor, colorful, neon, glowing effects, added subjects not in the three specified, extra animals, extra people, modern clothing, technology, vehicles, buildings, text other than zodiac symbol, watermark, signature, hands holding the card, real plants, real flowers, pots, decorations outside the card frame.`
}
