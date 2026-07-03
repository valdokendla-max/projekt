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

export interface AdultVariantConfig {
  category: AdultCategory
  checkpoint:
    | 'ponyDiffusionV6XL.safetensors'
    | 'juggernautXI.safetensors'
    | 'cyberrealisticPony_v18.safetensors'
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
  'crossed eyes, duplicate body parts, watermark, text, logo, out of frame, ' +
  'child, teen, underage, young, kid, minor, ' +
  // Käsk: kogu keha peab nähtav olema. Tugevdame kärpimise blokki.
  '((cropped:1.5)), ((close-up:1.4)), ((head shot:1.4)), ((portrait crop:1.4)), ' +
  '((bust shot:1.4)), ((upper body only:1.5)), ((waist crop:1.4)), ' +
  '(cut off legs:1.4), (feet out of frame:1.4), (legs not shown:1.4), ' +
  'hands out of frame, partial body, torso only, 85mm lens, telephoto'

const FULL_BODY_TAG =
  // Tugev rõhk kogu kehale: kaalud 1.4-1.5, wide-angle lens, zoom out, kaugem kaamera.
  '((full body shot:1.5)), ((head to toe visible:1.4)), ((entire body in frame:1.4)), ' +
  '(showing full body length from head to feet:1.3), (zoomed out:1.3), ' +
  '(wide angle 35mm lens:1.2), (camera far from subject:1.2), ' +
  '(full figure in frame:1.3), '

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
      '{SUBJECT}, beautiful adult model, (topless editorial:1.2), (bare breasts artistic:1.1), ' +
      'luxury penthouse, evening city lights, cinematic mood, photorealistic, ' +
      'high-fashion magazine editorial, high detail, Vogue topless editorial style' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', covered chest, bra',
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
      '{SUBJECT}, beautiful adult woman, (topless:1.2), (nude:1.1), (bare breasts:1.1), ' +
      'flowing transparent white fabric draped artistically, ' +
      'on tropical beach, sunset lighting, wind in hair, cinematic composition, ' +
      'realistic anatomy, professional fashion photography' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bikini top, swimsuit, dressed',
    labels: { est: { name: 'Topless rannas tuules', description: 'Troopiline rand, topless, lendlev valge kangas' }, eng: { name: 'Topless beach', description: 'Tropical beach topless, flowing fabric' } },
  },
  'couple-beach': {
    category: 'explicit',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 35, cfg: 7.5, width: 1216, height: 832,
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
  'couple-shoreline': {
    category: 'explicit',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 35, cfg: 7.5, width: 1216, height: 832,
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
      '{SUBJECT}, group of (stylish topless adult women:1.2), (bare breasts artistic:1.1), ' +
      'lounging at luxury beach club, tiny bikini bottoms only, ' +
      'ocean backdrop, golden hour lighting, fashion editorial photography, ' +
      'natural sensual interactions, photorealistic, premium magazine' + FLUX_QUALITY_BOOST,
    negativePrompt: COMMON_NEGATIVE + ', bikini top, fully clothed',
    labels: { est: { name: 'Topless beach club', description: 'Stiilne topless grupp luksusrannas' }, eng: { name: 'Topless beach club', description: 'Stylish topless group luxury beach' } },
  },

  'beach-club-mixed': {
    category: 'explicit',
    checkpoint: 'ponyDiffusionV6XL.safetensors',
    steps: 35, cfg: 7.5, width: 1216, height: 832,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 1216, height: 832,
    promptTemplate:
      PONY_QUALITY + 'source_photo, rating_explicit, ' +
      '1boy, 1girl, {SUBJECT}, (sex:1.3), (vaginal:1.2), (missionary position:1.3), (penetration:1.2), ' +
      'man on top of woman, woman legs around man, intimate moment, ' +
      'luxury bedroom, soft warm lighting, photorealistic, 85mm lens, ' +
      '(perfect anatomy:1.2), detailed skin, masterpiece',
    negativePrompt: 'score_4, score_5, score_6, ' + COMMON_NEGATIVE + ', clothed, anime, cartoon, deformed, bad hands, (fused fingers:1.3)',
    labels: { est: { name: 'Paar: missionaarse-asend', description: 'Heteropaar voodis, missionaarse-asend' }, eng: { name: 'Missionary', description: 'Couple in missionary position' } },
  },
  'explicit-couple-cowgirl': {
    category: 'explicit',
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 1216, height: 832,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 1216, height: 832,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
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
    checkpoint: 'cyberrealisticPony_v18.safetensors',
    steps: 30, cfg: 7.0, width: 832, height: 1216,
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
    cfg.checkpoint === 'cyberrealisticPony_v18.safetensors'
  const ponyTags = usesPony && !cfg.promptTemplate.startsWith('score_')
    ? 'score_9, score_8_up, score_7_up, source_photo, '
    : ''
  // Pony-baasi mudelid blokeerime ka score_4/5 negative'is (kui veel pole)
  const negExtra = usesPony && !cfg.negativePrompt.includes('score_4')
    ? 'score_4, score_5, score_6, '
    : ''
  // Eksplitsiitsele sisule EI lisa FULL_BODY_TAG — kaamera liiga kaugel, seks ei paista
  const bodyTag = cfg.category === 'explicit' ? '' : FULL_BODY_TAG
  const prompt = ponyTags + bodyTag + cfg.promptTemplate.replace('{SUBJECT}', cleanSubject)
  const negativePrompt = negExtra + cfg.negativePrompt
  return { prompt, negativePrompt }
}

export function getAdultLabel(variant: AdultVariant, lang: Language) {
  return ADULT_VARIANTS[variant].labels[lang]
}
