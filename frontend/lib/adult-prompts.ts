// Adult / 18+ content variants — ComfyUI txt2img on local GPU (no paid AI).
// All grouped into categories for the UI sub-icon picker.
// Behind a hard age gate ("Olen 18+") on the frontend.

import type { ActionLabels, Language } from './image-prompts'

export type AdultCategory = 'portrait' | 'glamour' | 'atmosphere' | 'beach' | 'group' | 'tattoo'

export type AdultVariant =
  // portrait — single subject, intimate
  | 'boudoir-elegant'
  | 'boudoir-sensual'
  | 'boudoir-luxury'
  | 'artistic-nude'
  | 'bw-studio'
  // glamour — single subject, fashion
  | 'hotel-suite'
  | 'hotel-satin'
  | 'silk-robe-penthouse'
  | 'red-dress'
  | 'leather-jacket'
  | 'glamour-fashion'
  // atmosphere — single subject, mood
  | 'rainy-city'
  | 'poolside'
  | 'wet-shirt-beach'
  // beach — single or couple, outdoors
  | 'beach-fashion'
  | 'couple-beach'
  | 'couple-shoreline'
  | 'romantic-couple'
  // group
  | 'friends-group'
  | 'beach-club'
  // tattoo
  | 'tattoo-reference'

export interface AdultVariantConfig {
  category: AdultCategory
  checkpoint: 'ponyDiffusionV6XL.safetensors' | 'juggernautXI.safetensors'
  steps: number
  cfg: number
  width: number
  height: number
  promptTemplate: string
  negativePrompt: string
  labels: ActionLabels
}

const COMMON_NEGATIVE =
  'low quality, blurry, bad anatomy, extra fingers, extra limbs, deformed hands, ' +
  'crossed eyes, duplicate body parts, watermark, text, logo, cropped, out of frame, ' +
  'child, teen, underage, young, kid, minor'

const FLUX_QUALITY_BOOST =
  ', ultra realistic, natural skin pores, subsurface scattering, realistic eyes, ' +
  'detailed eyelashes, fine hair details, cinematic color grading, professional DSLR photo, ' +
  'volumetric lighting, global illumination, 8k detail, masterpiece'

const PONY_QUALITY = 'score_9, score_8_up, score_7_up, '

export const ADULT_VARIANTS: Record<AdultVariant, AdultVariantConfig> = {
  // ============== PORTRAIT ==============
  'boudoir-elegant': {
    category: 'portrait',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1024, height: 1024,
    promptTemplate:
      '{SUBJECT}, professional boudoir photography, soft natural light, luxurious bedroom, ' +
      'elegant atmosphere, realistic anatomy, detailed skin texture, cinematic shadows, ' +
      'highly detailed, photorealistic, magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Boudoir elegantne', description: 'Pehme valgus, luksuslik magamistuba' }, eng: { name: 'Boudoir elegant', description: 'Soft light, luxury bedroom' } },
  },
  'boudoir-sensual': {
    category: 'portrait',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, elegant black lingerie, sitting on the edge of a luxury bed, ' +
      'soft morning light through large windows, confident gaze, natural skin texture, ' +
      'cinematic photography, ultra realistic, 85mm lens, shallow depth of field, ' +
      'highly detailed, sophisticated and sensual atmosphere' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Boudoir sensuaalne', description: 'Hommikune valgus, elegantne pesu' }, eng: { name: 'Boudoir sensual', description: 'Morning light, elegant lingerie' } },
  },
  'boudoir-luxury': {
    category: 'portrait',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, elegant black lace lingerie, sitting on a luxury hotel bed, ' +
      'soft golden morning sunlight, natural skin texture, confident expression, ' +
      'cinematic photography, shallow depth of field, 85mm lens, ultra realistic, ' +
      'masterpiece, high detail, magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Luksuslik boudoir', description: 'Pits-pesu, kuldne hommikupäike' }, eng: { name: 'Luxury boudoir', description: 'Lace lingerie, golden morning sun' } },
  },
  'artistic-nude': {
    category: 'portrait',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, artistic nude portrait, dramatic studio lighting, tasteful composition, ' +
      'classical fine art photography, realistic anatomy, soft shadows, ' +
      'high detail, elegant and refined aesthetic, gallery quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Kunstiline akt', description: 'Klassikaline fine art, studio valgus' }, eng: { name: 'Artistic nude', description: 'Classical fine art, studio light' } },
  },
  'bw-studio': {
    category: 'portrait',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, classic black and white photography, dramatic studio lighting, ' +
      'elegant pose, luxury fashion aesthetic, ultra realistic, sharp focus, ' +
      'high contrast shadows, timeless portrait' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', color, colorful',
    labels: { est: { name: 'Must-valge glamuur', description: 'Klassikaline B&W studio portree' }, eng: { name: 'B&W glamour', description: 'Classic B&W studio portrait' } },
  },

  // ============== GLAMOUR ==============
  'hotel-suite': {
    category: 'glamour',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, elegant silk robe, luxury hotel suite, city lights through window, ' +
      'cinematic lighting, realistic skin texture, 85mm photography, shallow depth of field, ' +
      'ultra realistic, masterpiece, high detail, professional photography' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Hotellisviit', description: 'Luksusviit, linnatuled aknast' }, eng: { name: 'Hotel suite', description: 'Luxury suite, city lights' } },
  },
  'hotel-satin': {
    category: 'glamour',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, luxury hotel suite, wearing an elegant satin dress, ' +
      'city skyline at night, cinematic lighting, photorealistic, 85mm lens, ' +
      'ultra detailed, fashion magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Hotell + satiin', description: 'Satiinkleit, linnasiluett öös' }, eng: { name: 'Hotel + satin', description: 'Satin dress, night skyline' } },
  },
  'silk-robe-penthouse': {
    category: 'glamour',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, silk robe slightly draped over shoulders, luxury penthouse interior, ' +
      'city lights at night, warm cinematic lighting, photorealistic, ' +
      'highly detailed skin texture, professional photography' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Siid hommikumantel', description: 'Penthouse interjöör, öine linn' }, eng: { name: 'Silk robe', description: 'Penthouse interior, night city' } },
  },
  'red-dress': {
    category: 'glamour',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, red evening gown, standing on a grand staircase, ' +
      'dramatic lighting, luxury atmosphere, ultra realistic photography, ' +
      'highly detailed, award-winning fashion photo' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Punane õhtukleit', description: 'Grandtrepp, dramaatiline valgus' }, eng: { name: 'Red gown', description: 'Grand staircase, dramatic light' } },
  },
  'leather-jacket': {
    category: 'glamour',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, wearing a leather jacket, urban night city background, ' +
      'neon reflections, confident expression, cinematic mood, ' +
      'photorealistic, sharp focus, high detail' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Nahktagi linnas', description: 'Öine linn, neoonpeegeldused' }, eng: { name: 'Leather jacket', description: 'Night city, neon reflections' } },
  },
  'glamour-fashion': {
    category: 'glamour',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, adult model in luxury penthouse, silk robe, evening city lights, ' +
      'cinematic mood, photorealistic, professional fashion photography, ' +
      'high detail, magazine quality, Vogue style' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Vogue glamuur', description: 'Penthouse moefoto, õhtune linn' }, eng: { name: 'Vogue glamour', description: 'Penthouse fashion photo' } },
  },

  // ============== ATMOSPHERE ==============
  'rainy-city': {
    category: 'atmosphere',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, walking through rainy city streets, reflections on wet pavement, ' +
      'cinematic night lighting, realistic hair and skin, ' +
      'professional photography, ultra realistic, movie scene aesthetic' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Vihmane linn', description: 'Märjad tänavad, kino-valgus' }, eng: { name: 'Rainy city', description: 'Wet streets, cinematic lighting' } },
  },
  'poolside': {
    category: 'atmosphere',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, relaxing beside an infinity pool, golden sunset, wet hair, ' +
      'luxury resort, realistic skin texture, cinematic photography, ' +
      'high detail, vacation glamour aesthetic' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Basseini ääres', description: 'Infinity pool, kuldne loojang' }, eng: { name: 'Poolside', description: 'Infinity pool, golden sunset' } },
  },
  'wet-shirt-beach': {
    category: 'atmosphere',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, wearing a wet white shirt, standing near a beach at sunset, ' +
      'soft ocean breeze, realistic skin details, cinematic lighting, ' +
      'professional fashion photography, ultra realistic, highly detailed' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Märg särk rannas', description: 'Loojang, ookean, valge särk' }, eng: { name: 'Wet shirt beach', description: 'Sunset, ocean, white shirt' } },
  },

  // ============== BEACH ==============
  'beach-fashion': {
    category: 'beach',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, on a tropical beach, flowing white fabric, sunset lighting, ' +
      'wind in hair, cinematic composition, realistic anatomy, ' +
      'professional fashion photography, high detail' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Rannafotosessioon', description: 'Troopiline rand, valge kangas, tuul' }, eng: { name: 'Beach fashion', description: 'Tropical beach, white fabric, wind' } },
  },
  'couple-beach': {
    category: 'beach',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, adult couple walking barefoot along a tropical beach, holding hands, ' +
      'golden sunset lighting, gentle ocean waves, natural smiles, wind blowing through hair, ' +
      'cinematic photography, ultra realistic, 85mm lens, shallow depth of field, ' +
      'high detail, luxury travel magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Paar rannal', description: 'Käsi-käes, kuldne loojang' }, eng: { name: 'Couple on beach', description: 'Hand in hand, golden sunset' } },
  },
  'couple-shoreline': {
    category: 'beach',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, adult couple embracing on the shoreline, warm sunset glow, ' +
      'soft ocean breeze, romantic atmosphere, natural body language, ' +
      'realistic skin texture, cinematic composition, professional photography, ultra detailed' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Kallistus rannas', description: 'Päikeseloojang, romantiline meeleolu' }, eng: { name: 'Shoreline hug', description: 'Sunset, romantic mood' } },
  },
  'romantic-couple': {
    category: 'beach',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, adult couple embracing near a large window, soft sunset light, ' +
      'emotional connection, natural body language, cinematic atmosphere, ' +
      'realistic faces, ultra realistic photography, high detail' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Romantiline paar', description: 'Aknast loojangu valgus, emotsionaalne side' }, eng: { name: 'Romantic couple', description: 'Sunset window light, emotional bond' } },
  },

  // ============== GROUP ==============
  'friends-group': {
    category: 'group',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, group of adult friends enjoying a tropical beach, laughing together, ' +
      'sunset lighting, luxury vacation atmosphere, natural poses, realistic faces, ' +
      'cinematic photography, ultra realistic, high detail, travel lifestyle editorial' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Sõpruskond rannas', description: 'Grupp naerab koos, troopiline rand' }, eng: { name: 'Friends on beach', description: 'Group laughing, tropical beach' } },
  },
  'beach-club': {
    category: 'group',
    checkpoint: 'juggernautXI.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, group of stylish adults at a luxury beach club, elegant summer clothing, ' +
      'ocean backdrop, golden hour lighting, fashion photography, natural interactions, ' +
      'photorealistic, high detail, premium lifestyle magazine' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE,
    labels: { est: { name: 'Beach club', description: 'Stiilne grupp, kuldne tund, ookean' }, eng: { name: 'Beach club', description: 'Stylish group, golden hour, ocean' } },
  },

  // ============== TATTOO ==============
  'tattoo-reference': {
    category: 'tattoo',
    checkpoint: 'ponyDiffusionV6XL.safetensors',
    steps: 28, cfg: 7.0, width: 832, height: 1216,
    promptTemplate:
      PONY_QUALITY +
      '{SUBJECT}, black and grey realism tattoo design, dramatic lighting, ' +
      'high contrast shadows, realistic facial features, detailed textures, ' +
      'professional tattoo reference, clean composition, white background, ' +
      'pencil shading aesthetic, sharp linework',
    negativePrompt:
      'color, watercolor, cartoon, anime, flat shading, low detail, ' +
      'frame, border, scenery, environment, ' + COMMON_NEGATIVE,
    labels: { est: { name: 'Tattoo referents', description: 'Must-hall realism eskiis, valge taust' }, eng: { name: 'Tattoo reference', description: 'Black & grey realism, white background' } },
  },
}

// One "representative" variant per category — used when UI skips the variant picker.
export const CATEGORY_DEFAULT_VARIANT: Record<AdultCategory, AdultVariant> = {
  portrait: 'boudoir-elegant',
  glamour: 'glamour-fashion',
  atmosphere: 'poolside',
  beach: 'beach-fashion',
  group: 'friends-group',
  tattoo: 'tattoo-reference',
}

export const ADULT_CATEGORY_LABELS: Record<AdultCategory, ActionLabels> = {
  portrait:   { est: { name: 'Portree',    description: 'Boudoir, akt, studio'           }, eng: { name: 'Portrait',   description: 'Boudoir, nude, studio'     } },
  glamour:    { est: { name: 'Glamuur',    description: 'Hotellid, kleidid, mood'        }, eng: { name: 'Glamour',    description: 'Hotels, gowns, fashion'    } },
  atmosphere: { est: { name: 'Atmosfäär',  description: 'Linn, basseinid, vihm'          }, eng: { name: 'Atmosphere', description: 'City, pools, rain'         } },
  beach:      { est: { name: 'Rand',       description: 'Üksi või paar, loojang'         }, eng: { name: 'Beach',      description: 'Solo or couple, sunset'    } },
  group:      { est: { name: 'Grupp',      description: 'Sõbrad, beach club'             }, eng: { name: 'Group',      description: 'Friends, beach club'       } },
  tattoo:     { est: { name: 'Tattoo',     description: 'Realism eskiis, valge taust'    }, eng: { name: 'Tattoo',     description: 'Realism sketch, white bg'  } },
}

export const ADULT_TOP_LEVEL_LABELS: ActionLabels = {
  est: { name: 'Täiskasvanutele', description: '18+ kunst — boudoir, glamuur, rand, akt' },
  eng: { name: 'Adult', description: '18+ art — boudoir, glamour, beach, nude' },
}

export const ADULT_VARIANTS_LIST: AdultVariant[] = Object.keys(ADULT_VARIANTS) as AdultVariant[]

export function getAdultVariantsByCategory(cat: AdultCategory): AdultVariant[] {
  return ADULT_VARIANTS_LIST.filter((v) => ADULT_VARIANTS[v].category === cat)
}

export function buildAdultPrompt(
  variant: AdultVariant,
  subject: string,
): { prompt: string; negativePrompt: string } {
  const cfg = ADULT_VARIANTS[variant]
  const cleanSubject = subject.trim() || 'beautiful adult'
  return {
    prompt: cfg.promptTemplate.replace('{SUBJECT}', cleanSubject),
    negativePrompt: cfg.negativePrompt,
  }
}

export function getAdultLabel(variant: AdultVariant, lang: Language) {
  return ADULT_VARIANTS[variant].labels[lang]
}
