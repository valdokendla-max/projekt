// Adult / 18+ content variants — ComfyUI txt2img on local GPU (no paid AI).
// All grouped into categories for the UI sub-icon picker.
// Behind a hard age gate ("Olen 18+") on the frontend.

import type { ActionLabels, Language } from './image-prompts'

export type AdultCategory = 'portrait' | 'glamour' | 'atmosphere' | 'beach' | 'group' | 'tattoo' | 'explicit'

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
  | 'beach-club-mixed'
  // tattoo
  | 'tattoo-reference'
  // explicit — hardcore sex acts (CyberRealistic Pony)
  | 'explicit-solo-spread'
  | 'explicit-couple-missionary'
  | 'explicit-couple-cowgirl'
  | 'explicit-couple-doggy'
  | 'explicit-oral-female'
  | 'explicit-lesbian-couple'
  | 'explicit-shower-couple'
  | 'explicit-cumshot-finish'

export interface AdultLoraEntry {
  name: string
  strengthModel?: number
  strengthClip?: number
}

export interface AdultVariantConfig {
  category: AdultCategory
  checkpoint:
    | 'ponyDiffusionV6XL.safetensors'
    | 'juggernautXI.safetensors'
    | 'cyberrealisticPony_v18.safetensors'
    | 'ponyRealism_v21MainVAE.safetensors'
  steps: number
  cfg: number
  width: number
  height: number
  promptTemplate: string
  negativePrompt: string
  labels: ActionLabels
  // Explicit content on Pony-based photoreal merges tends to "smooth over"
  // genital anatomy. These LoRAs push it back in.
  loras?: AdultLoraEntry[]
  // Many SD1.5/Pony photoreal merges are trained/tagged expecting "Clip skip: 2"
  // (A1111 convention) — maps to CLIPSetLastLayer stop_at_clip_layer: -2.
  clipSkip?: number
  samplerName?: string
  scheduler?: string
}

// Pony Detail Tweaker — general anatomy/detail booster (civitai.com/models/383086).
const DETAIL_TWEAKER: AdultLoraEntry = { name: 'pony_detail_tweaker_v2.safetensors', strengthModel: 0.6, strengthClip: 0.6 }
// Penis Size Slider, Pony version — author notes it's inverted (negative = bigger/more present) (civitai.com/models/465379).
const PENIS_SLIDER: AdultLoraEntry = { name: 'penis_size_slider_pony.safetensors', strengthModel: -1.0, strengthClip: -1.0 }

// Kvaliteet + vanuseturve — kehtib kõigile variantidele, sh tattoo (lähivõtted lubatud).
const SAFETY_QUALITY_NEGATIVE =
  'low quality, blurry, bad anatomy, extra fingers, extra limbs, deformed hands, ' +
  'crossed eyes, duplicate body parts, watermark, text, logo, out of frame, ' +
  'child, underage, kid, minor, hands out of frame, partial body'

// Anti-crop blokk: sunnib kogu keha nähtavaks. EI sobi tattoo-referentsile,
// mis vajab just lähivõtet (nahk/motiiv), mitte kaugvõtet täiskehast.
const FULL_BODY_NEGATIVE =
  '((cropped:1.5)), ((close-up:1.4)), ((head shot:1.4)), ((portrait crop:1.4)), ' +
  '((bust shot:1.4)), ((upper body only:1.5)), ((waist crop:1.4)), ' +
  '(cut off legs:1.4), (feet out of frame:1.4), (legs not shown:1.4), ' +
  'torso only, 85mm lens, telephoto'

const COMMON_NEGATIVE = SAFETY_QUALITY_NEGATIVE + ', ' + FULL_BODY_NEGATIVE

const FULL_BODY_TAG =
  // Tugev rõhk, et KOGU keha oleks kaadris/nähtav — aga ILMA kaugele/wide-angle kaamerale
  // sundimata, mis muutis kompositsiooni distantseks "moe-editorial" stiiliks, mitte intiimseks.
  '((full body visible:1.5)), ((head to toe in frame:1.4)), ((entire nude body shown:1.4)), ' +
  '(no cropping, complete figure visible:1.3), '

// Sunnib päris alastust — ilma selleta kaldub checkpoint "safe" moepildi poole isegi
// kui promptis on "topless"/"nude" sõna, eriti kui l'ähedal on "fashion"/"editorial" sõnu.
const NUDE_ENFORCE_TAG = '(completely naked:1.3), (no clothing whatsoever:1.3), fully exposed bare skin, '

// Kasutaja soov: poosid peavad olema selgelt ahvatlevad, mitte lihtsalt "atmosfäärikad".
const SEDUCTIVE_POSE_TAG = '(seductive alluring pose:1.3), sultry inviting expression, confident sensual body language, '

const FLUX_QUALITY_BOOST =
  ', ultra realistic, natural skin pores, subsurface scattering, realistic eyes, ' +
  'detailed eyelashes, fine hair details, cinematic color grading, professional DSLR photo, ' +
  'volumetric lighting, global illumination, 8k detail, masterpiece'

const PONY_QUALITY = 'score_9, score_8_up, score_7_up, '

export const ADULT_VARIANTS: Record<AdultVariant, AdultVariantConfig> = {
  // ============== PORTRAIT (18+) ==============
  'boudoir-elegant': {
    category: 'portrait',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (nude:1.2), (bare breasts:1.1), lying on luxurious bed with white silk sheets, ' +
      'professional boudoir photography, soft natural light, intimate atmosphere, ' +
      'realistic anatomy, detailed skin texture, cinematic shadows, highly detailed, photorealistic, magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', clothed, dressed, covered',
    labels: { est: { name: 'Boudoir alasti', description: 'Alasti naine luksusvoodis, pehme valgus' }, eng: { name: 'Boudoir nude', description: 'Nude on luxury bed, soft light' } },
  },
  'boudoir-sensual': {
    category: 'portrait',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (topless:1.2), bare breasts, sheer panties only, ' +
      'sitting on the edge of a luxury bed, soft morning light through large windows, ' +
      'confident gaze, natural skin texture, cinematic photography, ultra realistic, 85mm lens, ' +
      'shallow depth of field, highly detailed, sensual atmosphere' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bra, top, shirt, covered chest',
    labels: { est: { name: 'Boudoir topless', description: 'Topless voodi serval, hommikuvalgus' }, eng: { name: 'Boudoir topless', description: 'Topless on bed edge, morning light' } },
  },
  'boudoir-luxury': {
    category: 'portrait',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (nude:1.2), (full nudity:1.1), lying provocatively on luxury hotel bed, ' +
      'tousled sheets, soft golden morning sunlight, confident expression, ' +
      'cinematic photography, shallow depth of field, 85mm lens, ultra realistic, ' +
      'masterpiece, high detail, magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', clothed, lingerie, robe, covered',
    labels: { est: { name: 'Luksuslik akt', description: 'Täisalasti hotellivoodis, kuldne valgus' }, eng: { name: 'Luxury nude', description: 'Full nude in hotel bed, golden light' } },
  },
  'artistic-nude': {
    category: 'portrait',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (full body nude:1.2), classical artistic nude portrait, ' +
      'dramatic studio lighting with strong shadows, sculptural pose, ' +
      'classical fine art photography, realistic anatomy, soft skin highlights, ' +
      'high detail, elegant and refined aesthetic, gallery quality, Helmut Newton style' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', clothing, covering',
    labels: { est: { name: 'Kunstiline akt', description: 'Klassikaline täisalasti, studio dramaatiline valgus' }, eng: { name: 'Artistic nude', description: 'Classical full nude, dramatic studio' } },
  },
  'bw-studio': {
    category: 'portrait',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (nude:1.2), (bare body:1.1), classic black and white photography, ' +
      'dramatic studio lighting, elegant artistic pose, luxury fashion aesthetic, ' +
      'ultra realistic, sharp focus, high contrast deep shadows, timeless nude portrait' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', color, colorful, clothing',
    labels: { est: { name: 'Must-valge akt', description: 'B&W studio akt, dramaatiline valgus' }, eng: { name: 'B&W nude', description: 'B&W studio nude, dramatic light' } },
  },

  // ============== GLAMOUR (18+) ==============
  'hotel-suite': {
    category: 'glamour',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (open silk robe revealing nude body:1.2), ' +
      '(bare breasts:1.1), luxury hotel suite, city lights through window, ' +
      'cinematic lighting, realistic skin texture, 85mm photography, ' +
      'ultra realistic, masterpiece, high detail, sensual atmosphere' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', closed robe, covered chest',
    labels: { est: { name: 'Hotellisviit avatud mantel', description: 'Avatud hommikumantel, alasti keha, linnatuled' }, eng: { name: 'Hotel open robe', description: 'Open robe, nude body, city lights' } },
  },
  'hotel-satin': {
    category: 'glamour',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (slipping off satin dress:1.2), (bare shoulders:1.1), ' +
      '(exposed cleavage:1.1), luxury hotel suite, city skyline at night, ' +
      'cinematic lighting, photorealistic, 85mm lens, ultra detailed, sensual elegance' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', fully clothed, covered',
    labels: { est: { name: 'Satiinkleit libisemas', description: 'Satiinkleit libiseb maha, paljad õlad' }, eng: { name: 'Slipping satin', description: 'Satin dress slipping, bare shoulders' } },
  },
  'silk-robe-penthouse': {
    category: 'glamour',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (silk robe wide open exposing nude body:1.3), ' +
      'bare breasts, luxury penthouse interior, city lights at night, ' +
      'warm cinematic lighting, photorealistic, highly detailed skin texture, sensual pose' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', closed robe',
    labels: { est: { name: 'Siid mantel lahti', description: 'Penthouse, lahtine mantel, alasti keha' }, eng: { name: 'Open silk robe', description: 'Penthouse, open robe, nude body' } },
  },
  'red-dress': {
    category: 'glamour',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (extremely low cut red evening gown:1.2), ' +
      '(deep cleavage:1.2), high thigh slit revealing legs, standing on grand staircase, ' +
      'dramatic lighting, luxury atmosphere, ultra realistic photography, ' +
      'highly detailed, award-winning fashion photo' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', conservative dress, high neck',
    labels: { est: { name: 'Punane sügav-dekoltee', description: 'Madala dekolteega õhtukleit, dramaatiline valgus' }, eng: { name: 'Plunging red gown', description: 'Low cut red gown, dramatic light' } },
  },
  'leather-jacket': {
    category: 'glamour',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (leather jacket open:1.2), (nothing underneath jacket:1.3), ' +
      '(bare chest visible:1.1), urban night city background, neon reflections, ' +
      'confident expression, cinematic mood, photorealistic, sharp focus' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', shirt, bra, top',
    labels: { est: { name: 'Nahktagi ilma särgita', description: 'Avatud nahktagi paljas keha all, neoon' }, eng: { name: 'Bare under jacket', description: 'Open jacket, nothing under, neon' } },
  },
  'glamour-fashion': {
    category: 'glamour',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful nude adult woman, (fully nude:1.3), (bare breasts:1.2), ' +
      'standing in luxury penthouse, evening city lights through window, cinematic mood, ' +
      'photorealistic, high detail, magazine quality' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', covered chest, bra, dress, gown, clothed, fashion editorial',
    labels: { est: { name: 'Vogue topless editorial', description: 'Penthouse topless mood, kõrgmood' }, eng: { name: 'Vogue topless', description: 'Penthouse topless editorial, high fashion' } },
  },

  // ============== ATMOSPHERE (18+) ==============
  'rainy-city': {
    category: 'atmosphere',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (wet transparent clothing:1.3), ' +
      '(see-through wet shirt:1.2), nipples visible through fabric, ' +
      'walking through rainy city streets, reflections on wet pavement, ' +
      'cinematic night lighting, realistic hair and skin, professional photography' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', dry clothing, opaque',
    labels: { est: { name: 'Vihm: läbi paistev särk', description: 'Märg läbipaistev särk vihmases linnas' }, eng: { name: 'Wet see-through', description: 'Wet transparent shirt in rainy city' } },
  },
  'poolside': {
    category: 'atmosphere',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (topless:1.2), (bare breasts:1.1), bikini bottom only, ' +
      'relaxing beside infinity pool, golden sunset, wet hair, water droplets on skin, ' +
      'luxury resort, realistic skin texture, cinematic photography, vacation glamour' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bikini top, swimsuit top',
    labels: { est: { name: 'Topless basseini ääres', description: 'Topless päevitusraamatuga, infinity pool' }, eng: { name: 'Topless poolside', description: 'Topless sunbathing, infinity pool' } },
  },
  'wet-shirt-beach': {
    category: 'atmosphere',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful adult woman, (wet white shirt completely transparent:1.4), ' +
      '(see-through wet fabric:1.3), nipples and breasts visible through translucent shirt, ' +
      'no bra, standing near beach at sunset, soft ocean breeze, ' +
      'realistic skin details, cinematic lighting, professional photography' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bra, opaque shirt, dry',
    labels: { est: { name: 'Märg läbipaistev särk', description: 'Loojang, märg läbipaistev valge särk' }, eng: { name: 'Sheer wet shirt', description: 'Sunset, sheer wet white shirt' } },
  },

  // ============== BEACH (18+) ==============
  'beach-fashion': {
    category: 'beach',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 832, height: 1216,
    promptTemplate:
      '{SUBJECT}, beautiful nude adult woman, (fully nude:1.3), (bare breasts:1.2), (bare hips and legs:1.2), ' +
      'standing on tropical beach, sunset lighting, wind in hair, cinematic composition, ' +
      'realistic anatomy, photorealistic' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bikini top, swimsuit, dressed, (fabric wrap:1.3), (sarong:1.3), (sheer wrap around hips:1.3), clothing, covered, fashion editorial',
    labels: { est: { name: 'Alasti rannas tuules', description: 'Troopiline rand, täisalasti, loojang' }, eng: { name: 'Nude beach', description: 'Tropical beach fully nude, sunset' } },
  },
  // NB: rannateemaline, aga category on 'explicit' (hardcore), mitte 'beach' — vt EXPLICIT sektsiooni allpool.
  'couple-beach': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 35, cfg: 7.5, width: 1216, height: 832,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, ' +
      '(sex on beach:1.4), (outdoor sex:1.4), (doggystyle:1.3), ' +
      '(man fucking woman from behind:1.4), (vaginal penetration:1.3), ' +
      '(nude couple:1.3), (bare breasts:1.2), (erect penis:1.2), ' +
      'tropical beach, golden sunset, ocean waves, sand, warm light, ' +
      'photorealistic, medium shot, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, solo, anime, cartoon, deformed, bad hands, (fused fingers:1.3)',
    labels: { est: { name: 'Seks rannas', description: 'Paar seksib rannas loojangul' }, eng: { name: 'Sex on beach', description: 'Couple sex on beach at sunset' } },
  },
  // NB: rannateemaline, aga category on 'explicit' (hardcore), mitte 'beach' — vt EXPLICIT sektsiooni allpool.
  'couple-shoreline': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 35, cfg: 7.5, width: 1216, height: 832,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, ' +
      '(standing sex on shoreline:1.4), (sex from behind:1.3), (vaginal penetration:1.3), ' +
      '(man behind woman:1.3), (nude couple:1.2), (bare breasts:1.2), (erect penis:1.2), ' +
      'ocean shoreline, waves touching feet, golden hour sunset, wet sand, ' +
      'photorealistic, medium shot, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, solo, anime, cartoon, deformed, bad hands',
    labels: { est: { name: 'Seks kaldal', description: 'Seistes seks lainerannas, loojang' }, eng: { name: 'Shoreline sex', description: 'Standing sex on shoreline, sunset' } },
  },
  'romantic-couple': {
    category: 'beach',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, (nude adult couple in intimate embrace:1.2) near large window, ' +
      'soft sunset light, (bare skin against skin:1.1), emotional intense connection, ' +
      'sensual body language, cinematic atmosphere, realistic faces, ' +
      'ultra realistic photography, high detail' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', clothed',
    labels: { est: { name: 'Alasti intiimne paar', description: 'Alasti paar akna ees, intiimne hetk' }, eng: { name: 'Nude intimate couple', description: 'Nude couple by window, intimate' } },
  },

  // ============== GROUP (18+) ==============
  'friends-group': {
    category: 'group',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, group of (topless adult women:1.2), (bare breasts:1.1), skinny dipping in tropical ocean, ' +
      'laughing together, sunset lighting, luxury vacation atmosphere, natural intimate poses, ' +
      'realistic faces, cinematic photography, ultra realistic, lifestyle editorial' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', swimwear, bikini, clothed',
    labels: { est: { name: 'Topless sõpruskond', description: 'Topless naised troopilises ookeanis, loojang' }, eng: { name: 'Topless friends', description: 'Topless friends in tropical ocean' } },
  },
  'beach-club': {
    category: 'group',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 6.5, width: 1216, height: 832,
    promptTemplate:
      '{SUBJECT}, group of (topless adult women:1.3), (bare breasts:1.2), ' +
      'lounging at luxury beach club, tiny bikini bottoms only, ' +
      'ocean backdrop, golden hour lighting, ' +
      'natural sensual interactions, photorealistic' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bikini top, fully clothed',
    labels: { est: { name: 'Topless beach club', description: 'Stiilne topless grupp luksusrannas' }, eng: { name: 'Topless beach club', description: 'Stylish topless group luxury beach' } },
  },

  // NB: grupiteemaline, aga category on 'explicit' (hardcore), mitte 'group' — vt EXPLICIT sektsiooni allpool.
  'beach-club-mixed': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 35, cfg: 7.5, width: 1216, height: 832,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '2boys, 3girls, {SUBJECT}, ' +
      '(group sex:1.4), (orgy:1.4), (outdoor sex:1.3), ' +
      '(male penetrating female:1.4), (vaginal sex:1.3), (sex from behind:1.3), ' +
      '(erect penis visible:1.3), (bare breasts:1.3), (nude bodies:1.3), ' +
      '(multiple sex acts simultaneously:1.3), ' +
      'tropical beach background, warm golden light, sand, ocean, ' +
      'photorealistic, medium shot, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', (all female:1.5), (no males:1.5), (women only:1.5), clothed, swimwear, anime, cartoon, deformed, bad hands, (fused fingers:1.3)',
    labels: { est: { name: 'Beach orgia', description: 'Grupiseks rannas loojangul, eksplitsiitne' }, eng: { name: 'Beach orgy', description: 'Group sex on beach, sunset, explicit' } },
  },

  // ============== EXPLICIT (CyberRealistic Pony — hardcore sex acts) ==============
  'explicit-solo-spread': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
    loras: [DETAIL_TWEAKER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1girl, {SUBJECT}, (nude:1.2), (spread legs:1.3), (pussy:1.2), exposed body, ' +
      'lying on luxury bed with white sheets, sensual pose, inviting expression, ' +
      'soft warm lighting, photorealistic, 85mm lens, shallow depth of field, ' +
      '(perfect anatomy:1.2), detailed skin texture, masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, censored, anime, cartoon, drawing, deformed, (fused fingers:1.3), bad hands',
    labels: { est: { name: 'Solo: laiali jalad', description: 'Üksinda voodis, laiali jalad, eksplitsiitne' }, eng: { name: 'Solo spread', description: 'Solo on bed, spread legs, explicit' } },
  },
  'explicit-couple-missionary': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 24, cfg: 6.0, width: 1216, height: 832,
    clipSkip: -2,
    samplerName: 'dpmpp_sde',
    scheduler: 'karras',
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, (uncensored:1.3), ' +
      '1boy, 1girl, (from_above:1.2), (visible penetration:1.4), (sex:1.3), (vaginal:1.2), (missionary position:1.3), ' +
      '{SUBJECT}, man on top of woman, legs spread, luxury bedroom, soft warm lighting, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), detailed skin, masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands, (fused fingers:1.3), (censored:1.3), (bar censor:1.3), (mosaic censor:1.3), (blur censor:1.3)',
    labels: { est: { name: 'Paar: missionaarse-asend', description: 'Heteropaar voodis, missionaarse-asend' }, eng: { name: 'Missionary', description: 'Couple in missionary position' } },
  },
  'explicit-couple-cowgirl': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, (cowgirl position:1.3), (sex:1.2), (vaginal:1.2), ' +
      'woman on top straddling man, woman riding, hands on chest, ' +
      'man lying on back, luxury bedroom, soft warm lighting, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands',
    labels: { est: { name: 'Paar: cowgirl-asend', description: 'Naine peal, mees all, cowgirl' }, eng: { name: 'Cowgirl', description: 'Woman on top, cowgirl position' } },
  },
  'explicit-couple-doggy': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 1216, height: 832,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, (doggystyle position:1.3), (sex:1.2), (vaginal from behind:1.2), ' +
      'woman on hands and knees, man behind, intimate moment, ' +
      'luxury bedroom or rustic setting, warm lighting, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands',
    labels: { est: { name: 'Paar: koeraasend', description: 'Naine põlvedel, mees taga' }, eng: { name: 'Doggystyle', description: 'Woman on knees, doggystyle' } },
  },
  'explicit-oral-female': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, (oral sex on female:1.3), (cunnilingus:1.2), ' +
      'woman lying on bed, head back, man between her legs, ' +
      'intimate moment, luxury bedroom, soft warm lighting, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands',
    labels: { est: { name: 'Oraal naisele', description: 'Oraalseks naisele, intiimne' }, eng: { name: 'Female oral', description: 'Oral on female, intimate' } },
  },
  'explicit-lesbian-couple': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 1216, height: 832,
    loras: [DETAIL_TWEAKER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '2girls, {SUBJECT}, (lesbian couple:1.3), (yuri:1.2), intimate, ' +
      '(both nude:1.2), kissing, embracing, bare breasts touching, ' +
      'luxury bedroom, soft warm lighting, sensual romantic atmosphere, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands',
    labels: { est: { name: '2 naist intiimne', description: 'Naiste paar, kallistus, suudlemine' }, eng: { name: 'Lesbian couple', description: 'Two women intimate, kissing' } },
  },
  'explicit-shower-couple': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, (sex in shower:1.2), (standing sex:1.2), (penetration:1.1), ' +
      'wet bodies, water streams, steam, glass shower, ' +
      'modern luxury bathroom, soft lighting, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands',
    labels: { est: { name: 'Duši all paar', description: 'Paar duši all, märjad kehad' }, eng: { name: 'Shower couple', description: 'Couple in shower, wet' } },
  },
  'explicit-cumshot-finish': {
    category: 'explicit',
    checkpoint: 'ponyRealism_v21MainVAE.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
    loras: [DETAIL_TWEAKER, PENIS_SLIDER],
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, (cumshot:1.3), (facial:1.2), (cum on body:1.2), ' +
      'satisfied expression, climax moment, sensual aftermath, ' +
      'luxury bedroom, soft warm lighting, ' +
      'photorealistic, 85mm lens, (perfect anatomy:1.2), masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands',
    labels: { est: { name: 'Lõpetus / cumshot', description: 'Climax moment, valgusepritsemed' }, eng: { name: 'Cumshot finish', description: 'Climax moment with finish' } },
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
      'frame, border, scenery, environment, ' + SAFETY_QUALITY_NEGATIVE,
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
  explicit: 'explicit-couple-missionary',
}

export const ADULT_CATEGORY_LABELS: Record<AdultCategory, ActionLabels> = {
  portrait:   { est: { name: 'Portree',     description: 'Boudoir, akt, studio'           }, eng: { name: 'Portrait',   description: 'Boudoir, nude, studio'     } },
  glamour:    { est: { name: 'Glamuur',     description: 'Hotellid, kleidid, mood'        }, eng: { name: 'Glamour',    description: 'Hotels, gowns, fashion'    } },
  atmosphere: { est: { name: 'Atmosfäär',   description: 'Linn, basseinid, vihm'          }, eng: { name: 'Atmosphere', description: 'City, pools, rain'         } },
  beach:      { est: { name: 'Rand',        description: 'Üksi või paar, loojang'         }, eng: { name: 'Beach',      description: 'Solo or couple, sunset'    } },
  group:      { est: { name: 'Grupp',       description: 'Sõbrad, beach club'             }, eng: { name: 'Group',      description: 'Friends, beach club'       } },
  tattoo:     { est: { name: 'Tattoo',      description: 'Realism eskiis, valge taust'    }, eng: { name: 'Tattoo',     description: 'Realism sketch, white bg'  } },
  explicit:   { est: { name: 'Eksplitsiitne', description: 'Sex aktid, hardcore (CyberRealistic Pony)' }, eng: { name: 'Explicit',   description: 'Sex acts, hardcore (CyberRealistic Pony)' } },
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
  // Pony-baasi mudelid vajavad score_* tag'e — lisame automaatselt.
  const usesPony =
    cfg.checkpoint === 'ponyDiffusionV6XL.safetensors' ||
    cfg.checkpoint === 'cyberrealisticPony_v18.safetensors' ||
    cfg.checkpoint === 'ponyRealism_v21MainVAE.safetensors'
  const ponyTags = usesPony && !cfg.promptTemplate.startsWith('score_')
    ? 'score_9, score_8_up, score_7_up, source_photo, '
    : ''
  // Pony-baasi mudelid blokeerime ka score_4/5 negative'is (kui veel pole)
  const negExtra = usesPony && !cfg.negativePrompt.includes('score_4')
    ? 'score_4, score_5, score_6, '
    : ''
  // Eksplitsiitsele sisule EI lisa FULL_BODY_TAG — kaamera liiga kaugel, seks ei paista.
  // Tattoo-referentsile samuti mitte — see vajab lähivõtet motiivist, mitte täiskeha kaugvõtet.
  const isExplicitOrTattoo = cfg.category === 'explicit' || cfg.category === 'tattoo'
  const bodyTag = isExplicitOrTattoo ? '' : FULL_BODY_TAG + NUDE_ENFORCE_TAG + SEDUCTIVE_POSE_TAG
  const prompt = ponyTags + bodyTag + cfg.promptTemplate.replace('{SUBJECT}', cleanSubject)
  const negativePrompt = negExtra + cfg.negativePrompt
  return { prompt, negativePrompt }
}

export function getAdultLabel(variant: AdultVariant, lang: Language) {
  return ADULT_VARIANTS[variant].labels[lang]
}

// ============== FREEFORM (single "18+" entry, user writes the scene) ==============
// Kõva piir, mida vaba tekst EI TOHI sisaldada, olenemata kasutaja soovist "teeb mida kirjutad".
// Perekondlikud rollid + eksplitsiitne sisu koos, ja igasugune alaealisele viitav sõnastus.
const BLOCKED_TERMS = [
  // family-relation roles (blocked outright in this explicit-content mode)
  'mom', 'mommy', 'mother', 'dad', 'daddy', 'father', 'son', 'daughter',
  'sister', 'sis', 'brother', 'bro', 'stepmom', 'stepdad', 'stepson',
  'stepdaughter', 'stepsister', 'stepbrother', 'aunt', 'uncle', 'cousin',
  'grandma', 'grandpa', 'grandmother', 'grandfather', 'niece', 'nephew',
  'incest', 'family',
  // minor-coding terms
  'teen', 'teenager', 'minor', 'child', 'children', 'kid', 'kids',
  'schoolgirl', 'school girl', 'schoolboy', 'school boy', 'loli', 'lolita',
  'shota', 'preteen', 'underage', 'adolescent', 'little girl', 'little boy',
  'toddler', 'infant', 'baby', 'young girl', 'young boy',
]

const BLOCKED_TERMS_REGEX = new RegExp(
  '\\b(' + BLOCKED_TERMS.map((t) => t.replace(/ /g, '\\s+')).join('|') + ')\\b',
  'i',
)

export function checkFreeformSafety(text: string): string | null {
  const match = text.match(BLOCKED_TERMS_REGEX)
  if (match) {
    return `Sõna "${match[0]}" ei ole lubatud (pere-rollid ja alaealisele viitav sõnastus on keelatud).`
  }
  return null
}

// Pony-baasi mudelid ei loe inimeste arvu/sugu vabast lausest (nt "2 man") —
// need vajavad Danbooru-stiilis arvu-tag'e eraldi ("2boys"), nagu kureeritud
// variandid juba kasutavad ("1boy, 1girl, ..."). Ilma nendeta kipub mudel
// tegelasi juurde/vähemaks genereerima või mõne soo lihtsalt ära unustama.
const FEMALE_WORD = /\b(\d+)?\s*(women|woman|females?|girls?|ladies|lady)\b/i
const MALE_WORD = /\b(\d+)?\s*(men|man|males?|boys?|guys?)\b/i

function extractPersonCountTags(text: string): { tags: string; totalCount: number } {
  const femaleMatch = text.match(FEMALE_WORD)
  const maleMatch = text.match(MALE_WORD)
  if (!femaleMatch && !maleMatch) return { tags: '', totalCount: 0 }
  const girls = femaleMatch ? Math.min(parseInt(femaleMatch[1] || '1', 10) || 1, 9) : 0
  const boys = maleMatch ? Math.min(parseInt(maleMatch[1] || '1', 10) || 1, 9) : 0
  const tags: string[] = []
  if (girls > 0) tags.push(`${girls}girl${girls > 1 ? 's' : ''}`)
  if (boys > 0) tags.push(`${boys}boy${boys > 1 ? 's' : ''}`)
  return { tags: tags.join(', ') + ', ', totalCount: girls + boys }
}

// Sama probleem tegevuse kirjeldusega kui tegelaste arvuga: vaba lause sees
// jäävad tegevussõnad (nt "fuck", "doggystyle") CLIP-i jaoks nõrgaks ja kipuvad
// tekitama valesid assotsiatsioone — nt "doggystyle" ilma struktuurita tõi pildile
// päris koera, sest mudel haaras kirja seest sõnaosa "dog" kirja. Kureeritud
// variandid (vt "explicit-couple-doggy" jt) väldivad seda, pannes tegevuse alati
// eraldi kaalutud tag'idena ("(doggystyle position:1.3)") ja lisades konteksti
// (vaginal/penetration jne), mitte lootes üksikule sõnale lauses.
// NB: üldsõnad nagu "(sex:1.3)" või "(group sex:1.4)" üksi ei piisa — Pony kipub
// neist tegema kallistava/embrace poosi, mitte päris penetratsiooni. Kureeritud
// variandid, mis PÄRISELT toimivad (explicit-couple-doggy, beach-club-mixed jne),
// kirjeldavad alati ka konkreetset kehaasendit ("woman on hands and knees, man
// behind", "man on top, legs spread") — see kopeerib sama mustrit.
// Piling on many kaalutud tag'e sama mõiste kohta (nt 4x "penetration" erinevas
// sõnastuses) lahjendab CLIP-i tähelepanu ja annab HALVEMA tulemuse kui üks
// täpne fraas — testitud: 20+ tag'iga prompt andis lihtsalt embrace-poosi, kaotas
// ühe tegelase ära. Nii et: üks tuvastatud tegevus = üks kindel, juba TÕESTATULT
// toimiv fraas (kopeeritud otse töötavast kureeritud variandist, mitte leiutatud).
// Prioriteetjärjekorras, valime AINULT ühe (esimese matchiva) tegevuse.
const ACTION_PATTERNS: Array<{ pattern: RegExp; actionPhrase: string; replacement: string }> = [
  {
    pattern: /doggy\s*-?style/gi,
    actionPhrase: '(doggystyle position:1.3), (sex:1.2), (vaginal from behind:1.2), woman on hands and knees, man behind',
    replacement: 'rear entry position',
  },
  {
    pattern: /group\s*sex|orgy|threesome/gi,
    actionPhrase: '(group sex:1.4), (orgy:1.4), (outdoor sex:1.3), (male penetrating female:1.4), (vaginal sex:1.3), (sex from behind:1.3), (erect penis visible:1.3), (multiple sex acts simultaneously:1.3)',
    replacement: 'group sex',
  },
  {
    pattern: /oral(\s*sex)?/gi,
    actionPhrase: '(oral sex on female:1.3), (cunnilingus:1.2), woman lying on bed, head back, man between her legs',
    replacement: 'oral sex',
  },
  {
    pattern: /cowgirl/gi,
    actionPhrase: '(cowgirl position:1.3), (sex:1.2), (vaginal:1.2), woman on top straddling man, woman riding',
    replacement: 'cowgirl position',
  },
  {
    pattern: /missionary/gi,
    actionPhrase: '(visible penetration:1.4), (sex:1.3), (vaginal:1.2), (missionary position:1.3), man on top of woman, legs spread',
    replacement: 'missionary position',
  },
  {
    // f[au]ck kaetab levinud kirjavead nagu "fack" — nõrk alastuse-sund ei
    // tohi kunagi sõltuda ainult sellest matchist (vt nudeTag allpool), aga
    // täpsem "sex on beach" fraas on ikka parem, kui match õnnestub.
    pattern: /\bf[au]ck(ing)?\b|\bsex\b/gi,
    actionPhrase: '(sex on beach:1.4), (outdoor sex:1.4), (man fucking woman from behind:1.4), (vaginal penetration:1.3)',
    replacement: 'having sex',
  },
]

function extractActionTag(text: string): { tag: string; sanitized: string; hasExplicitAction: boolean } {
  for (const rule of ACTION_PATTERNS) {
    // NB: rule.pattern on 'g' lipuga (vajalik .replace all-jaoks) — .test() peab
    // muidu lastIndex-i mäletama päringute vahel (regex objektid luuakse üks kord
    // mooduli laadimisel), mis annaks valesid tulemusi teisel-kolmandal päringul.
    rule.pattern.lastIndex = 0
    if (rule.pattern.test(text)) {
      const sanitized = text.replace(rule.pattern, rule.replacement)
      return { tag: rule.actionPhrase + ', ', sanitized, hasExplicitAction: true }
    }
  }
  return { tag: '', sanitized: text, hasExplicitAction: false }
}

// Kui tekstis on selge, üheselt mõistetav asendi-sõna (ka eesti keeles), suunatakse
// otse juba TÕESTATULT toimivale kureeritud mallile (buildAdultPrompt) selle enda
// steps/cfg/sampler/LoRA seadetega — see on usaldusväärsem kui vaba teksti oma
// kaalutud-tag'ide loogika, sest need mallid on 1boy+1girl stseenide jaoks juba
// peenhäälestatud ja testitud. Prioriteetjärjekorras, esimene matchiv võidab.
const POSITION_VARIANT_MAP: Array<{ pattern: RegExp; variant: AdultVariant }> = [
  { pattern: /\btagant\s*pidi\b|\btagant\b|doggy\s*-?style/gi, variant: 'explicit-couple-doggy' },
  { pattern: /\beest\s*pidi\b|\beest\b|missionary/gi, variant: 'explicit-couple-missionary' },
  { pattern: /\bsuhu\b|\bsuus\b|oral(\s*sex)?|blowjob|cunnilingus/gi, variant: 'explicit-oral-female' },
  { pattern: /cowgirl|naine\s*peal/gi, variant: 'explicit-couple-cowgirl' },
  { pattern: /lesbian|2\s*girls/gi, variant: 'explicit-lesbian-couple' },
  { pattern: /shower|duš/gi, variant: 'explicit-shower-couple' },
]

export function buildFreeformAdultPrompt(text: string): { prompt: string; negativePrompt: string; matchedVariant?: AdultVariant; personCount?: number } {
  const cleanText = text.trim()
  for (const rule of POSITION_VARIANT_MAP) {
    rule.pattern.lastIndex = 0
    if (rule.pattern.test(cleanText)) {
      rule.pattern.lastIndex = 0
      const remaining = cleanText.replace(rule.pattern, '').replace(/\s{2,}/g, ' ').trim()
      const { prompt, negativePrompt } = buildAdultPrompt(rule.variant, remaining)
      return { prompt, negativePrompt, matchedVariant: rule.variant }
    }
  }
  const { tags: countTags, totalCount: personCount } = extractPersonCountTags(cleanText)
  const { tag: actionTag, sanitized, hasExplicitAction } = extractActionTag(cleanText)
  // NB: alastus EI TOHI sõltuda sellest, kas mõni tegevussõna täpselt matchis —
  // see endpoint on juba vanuse-kinnitatud 18+ eksplitsiitne generaator (vt
  // checkFreeformSafety/ageConfirmed POST route'is), nii et kirjaviga nagu
  // "fack" (mitte "fuck") ei tohi kukutada kogu prompti tagasi riietatud
  // "safe" kompositsiooniks. Tegevuse-spetsiifiline tag (doggystyle jne) on
  // LISAKS, alastus on alati baas.
  const nudeTag = '(nude:1.3), (bare breasts:1.2), (erect penis:1.2), '
  // 3+ tegelast kipuvad ruudukujulises 1024x1024 kaadris üksteist katma või
  // servast välja jääma (üks tegelane lõigatakse kaadri äärest ära) — lisame
  // tugeva "kõik nähtavad" rõhutuse ainult siis, kui seda tegelikult vaja on,
  // et mitte lahjendada 1-2 tegelasega stseenide prompti asjatult.
  const groupFramingTag = personCount >= 3 ? '(full body shot from head to toe:1.4), (all heads and feet visible:1.4), (standing at distance from camera:1.3), (nobody cropped out:1.3), wide angle, full scene visible, ' : ''
  // Kirjeldus (vanused, koht, meeleolu) läheb kirja TAVALISE kaaluga, kuna
  // tegevuse ja alastuse juba katab eraldi tugev tag ülal — dubleerimine lahjendab.
  const prompt =
    PONY_QUALITY + 'source_photo, rating_explicit, ' +
    countTags + sanitized + ', ' + actionTag + nudeTag + groupFramingTag +
    'photorealistic, medium shot, (perfect anatomy:1.2), masterpiece'
  const negativePrompt =
    'score_4, score_5, score_6, ' + COMMON_NEGATIVE +
    ', anime, cartoon, drawing, deformed, bad hands, (fused fingers:1.3), ' +
    '(censored:1.3), (bar censor:1.3), (mosaic censor:1.3), (blur censor:1.3)' +
    ', clothed, dressed, shorts, swimwear, underwear, bikini, board shorts, (dog:1.3), (animal:1.2), (pet:1.2), (leash:1.2)' +
    (hasExplicitAction ? ', solo' : '') +
    (personCount >= 3 ? ', (cropped person:1.4), (partially visible person:1.3), (person cut off by frame edge:1.4), (head cut off:1.5), (cropped head:1.5), (head out of frame:1.5), (close-up:1.3), zoomed in, tight crop, missing limbs, incomplete figure' : '')
  return { prompt, negativePrompt, personCount }
}

export const FREEFORM_ADULT_CONFIG = {
  // ponyRealism_v21MainVAE annab testides usaldusväärselt õige penetratsiooni-
  // kompositsiooni (kinnitatud 2/2 testseemet); cyberrealisticPony_v18 ja
  // ponyDiffusionV6XL jäid mõlemad kallistuse/embrace poosi juurde, isegi
  // kureeritud mallide ja kõrge CFG-ga.
  checkpoint: 'ponyRealism_v21MainVAE.safetensors' as const,
  steps: 30,
  cfg: 7.0,
  width: 1024,
  height: 1024,
  clipSkip: -2,
  samplerName: 'dpmpp_sde',
  scheduler: 'karras',
  loras: [DETAIL_TWEAKER, PENIS_SLIDER],
}

// Sama kiirus/kvaliteet trade-off kontseptsioon, mis image-transformis
// (resolveVariantConfig) — "fast" kiirendab seda aeglast AMD/ZLUDA GPU-d
// hinnaga vähem detaili, "high" vastupidi.
export type AdultQualityTier = 'fast' | 'balanced' | 'high'

const ADULT_QUALITY_STEP_MULTIPLIER: Record<AdultQualityTier, number> = {
  fast: 0.6,
  balanced: 1.0,
  high: 1.3,
}
const ADULT_QUALITY_CFG_DELTA: Record<AdultQualityTier, number> = {
  fast: -0.5,
  balanced: 0,
  high: 0.5,
}

export function resolveFreeformAdultConfig(quality: AdultQualityTier, personCount?: number) {
  // 3+ seisvat tegelast vajavad KÕRGUST (pead jäävad muidu kaadrist välja), mitte
  // laiust — laiem 1344x896 kaader testiti ja tegi asja hullemaks (pead kadusid
  // ülevalt ära). Suurem ruudukujuline kaader annab ruumi igas suunas.
  const dims = personCount && personCount >= 3 ? { width: 1152, height: 1152 } : {}
  if (quality === 'balanced') return { ...FREEFORM_ADULT_CONFIG, ...dims }
  return {
    ...FREEFORM_ADULT_CONFIG,
    ...dims,
    steps: Math.max(4, Math.round(FREEFORM_ADULT_CONFIG.steps * ADULT_QUALITY_STEP_MULTIPLIER[quality])),
    cfg: Math.max(1, Math.round((FREEFORM_ADULT_CONFIG.cfg + ADULT_QUALITY_CFG_DELTA[quality]) * 10) / 10),
  }
}

// Kui buildFreeformAdultPrompt tuvastas asendi-sõna ja suunas kureeritud mallile,
// kasutame SELLE malli enda steps/cfg/sampler/LoRA seadeid (mitte freeform'i
// vaikeseadeid) — need on 1boy+1girl stseenide jaoks juba spetsiifiliselt häälestatud.
export function resolveAdultGenerationConfig(matchedVariant: AdultVariant | undefined, quality: AdultQualityTier, personCount?: number) {
  if (!matchedVariant) return resolveFreeformAdultConfig(quality, personCount)
  const v = ADULT_VARIANTS[matchedVariant]
  const stepMult = ADULT_QUALITY_STEP_MULTIPLIER[quality]
  const cfgDelta = ADULT_QUALITY_CFG_DELTA[quality]
  return {
    checkpoint: v.checkpoint,
    steps: Math.max(4, Math.round(v.steps * stepMult)),
    cfg: Math.max(1, Math.round((v.cfg + cfgDelta) * 10) / 10),
    width: v.width,
    height: v.height,
    clipSkip: v.clipSkip ?? FREEFORM_ADULT_CONFIG.clipSkip,
    samplerName: v.samplerName ?? FREEFORM_ADULT_CONFIG.samplerName,
    scheduler: v.scheduler ?? FREEFORM_ADULT_CONFIG.scheduler,
    loras: v.loras ?? FREEFORM_ADULT_CONFIG.loras,
  }
}
