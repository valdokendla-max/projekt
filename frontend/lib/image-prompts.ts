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

export interface ImageTransformPromptSet {
  prompt: string
  negativePrompt: string
}

export const IMAGE_TRANSFORM_PROMPTS: Record<ImageTransformVariant, ImageTransformPromptSet> = {
  'tattoo-realistic': {
    prompt:
      'monochrome black and grey realistic tattoo design, greyscale ink drawing on skin, ' +
      'fine detailed pencil linework, engraved tattoo stencil texture overlaid on the entire body and face, ' +
      'smooth whip shading, strong contrast between deep black shadows and soft grey highlights, ' +
      'sharp clean linework, professional tattoo flash artwork, pencil drawing aesthetic, ' +
      'desaturated, no skin color, centered composition, highly detailed, masterpiece',
    negativePrompt:
      'added faces, added people, new characters, extra subjects, child, ' +
      'colored, color photo, skin tone, watercolor, cartoon, anime, flat shading, low detail, blurry, ' +
      'distorted anatomy, extra limbs, added animals, added objects, scenery, environment, ' +
      'photo background, frame, border, text, watermark, low quality',
  },
  'tattoo-portrait': {
    prompt:
      'monochrome black and grey realistic portrait tattoo design, greyscale ink drawing on skin, ' +
      'fine detailed pencil linework, engraved tattoo stencil texture overlaid on the entire body and face, ' +
      'soft natural shading, smooth gradient shading on hair and clothing, ' +
      'strong contrast between deep black shadows and soft grey highlights, ' +
      'professional tattoo flash artwork, desaturated, no skin color, centered composition, ' +
      'highly detailed, masterpiece',
    negativePrompt:
      'added faces, added people, new characters, aged face, wrinkles, distorted facial features, ' +
      'changed identity, unrecognizable face, colored, color photo, skin tone, watercolor, cartoon, anime, ' +
      'flat shading, low detail, blurry, distorted anatomy, scenery, environment, photo background, ' +
      'frame, border, text, watermark, low quality',
  },
  enhance: {
    prompt:
      'high resolution clean sharp version of the same image, crisp edges, improved contrast, ' +
      'clean unified background, balanced exposure, professional quality, ready for laser engraving',
    negativePrompt:
      'changed composition, added elements, removed elements, different style, distorted subjects, ' +
      'low quality, blurry, noisy, dark, washed out, oversaturated, cartoon, anime, ' +
      'photo background, frame, border, watermark, text',
  },
  'line-art': {
    prompt:
      'clean minimalist line art drawing, pure black outlines on pure white background, ' +
      'uniform line weight throughout, bold simple continuous lines, strong silhouette, ' +
      'clear contours, vector-ready, centered composition',
    negativePrompt:
      'shading, gradients, grey tones, dotwork, stippling, crosshatching, sketchy lines, ' +
      'broken strokes, varying line weight, fill colors, watercolor, realistic style, photo, ' +
      '3D, depth, shadows, highlights, texture, background, frame, border, watermark',
  },
  'text-logo': {
    prompt:
      'high contrast pure black on pure white engraving-ready version, sharp clean letter edges, ' +
      'uniform stroke weight, crisp typography, solid black fills, clean outlines, ' +
      'sharp vector-ready edges, centered composition',
    negativePrompt:
      'gradients, grey tones, soft edges, blur, anti-aliasing artifacts, changed text, misspellings, ' +
      'changed letters, added decoration, frame, border, background, drop shadow, 3D effect, glow, ' +
      'colored, watercolor, sketchy, distorted letterforms, illegible text',
  },
  'relief-3d': {
    prompt:
      'high-relief 3D sculptural relief, carved marble or stone aesthetic, pure white surface with ' +
      'deep dramatic shadows, smooth volumetric shading, cinematic directional lighting from above-left, ' +
      'sharp crisp shadows in recessed areas, bright highlights on raised surfaces, polished marble surface, ' +
      'classical sculpture aesthetic, isolated on solid black background, photo-realistic, masterpiece',
    negativePrompt:
      'flat shading, line art, outlines only, sketchy, pencil drawing, tattoo style, watercolor, ' +
      'cartoon, anime, colored, low contrast, grey background, white background, washed out, ' +
      'no shadows, no depth, 2D, illustration style, added subjects, changed pose, distorted anatomy, ' +
      'frame, border, text, watermark',
  },
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
