# AI Engraving Optimizer Technical Specification

This specification defines the working meaning of points 1-13 for the project.

## 1. Input Acquisition

Purpose:
- accept raw text prompt or uploaded source image

Inputs:
- `textPrompt?: string`
- `imageFile?: File`
- `savedSettingsSummary?: string`

Outputs:
- normalized pipeline request

Rules:
- at least one of text or image must exist
- uploaded image must be validated before entering the pipeline

## 2. Preset Engine

Purpose:
- convert saved settings into a normalized preset object

Inputs:
- saved settings summary text

Outputs:
- `EngravingPreset`

Rules:
- machine label, laser type, material, mode, and settings must be extracted
- missing values must produce warnings instead of crashing the pipeline

## 3. Prompt Optimizer

Purpose:
- rewrite user prompt into engraving-ready generation instructions

Inputs:
- raw user prompt
- optional `EngravingPreset`

Outputs:
- `OptimizedPrompt`

Rules:
- must push the model toward monochrome, strong silhouette, clean edge structure, low background noise, and limited micro-detail
- must include negative prompt terms for gradients, clutter, haze, and weak edge definition

## 4. Image Generation API

Purpose:
- central API boundary for text-to-image or image-edit generation

Inputs:
- optimized prompt
- preset context

Outputs:
- generation request plan or generated image reference

Rules:
- provider-specific details must remain inside this layer
- generation should request PNG output and square-safe working dimensions by default

## 5. AI Engraving Image Generator

Purpose:
- produce the first draft image for engraving from text input

Inputs:
- user text prompt
- optimized prompt
- preset context

Outputs:
- generated image asset

Rules:
- generated image is a draft that still enters the optimizer pipeline
- this module should not skip simulation or export planning

## 6. Image Analyzer

Purpose:
- classify image type and estimate engraving readiness

Inputs:
- normalized image metadata or processed analysis data

Outputs:
- `ImageAnalysisReport`

Rules:
- classify into photo, logo, line-art, text-mark, or mixed
- score contrast, edge clarity, noise, and background complexity

## 7. Image Normalization

Purpose:
- standardize the image before analysis

Inputs:
- source asset metadata
- preset context

Outputs:
- `ImageNormalizationPlan`

Rules:
- standardize orientation, alpha strategy, target size, grayscale handling, and working format

## 8. Engraving Mode Selection

Purpose:
- choose the downstream rendering strategy

Inputs:
- preset
- analysis report

Outputs:
- `ModeDecision`

Rules:
- photo assets default toward dithering
- logos, text marks, and line art default toward threshold or vector
- material and laser type may override the default choice

## 9. Threshold / Dithering / Vector Processing

Purpose:
- define the final visual treatment branch

Inputs:
- mode decision
- preset
- analysis report

Outputs:
- branch-specific processing plan

Rules:
- threshold should prefer clean binary engraving
- dithering should preserve tonal suggestion with bounded density
- vector should be allowed only for suitable source classes

## 10. Line Density Calculation

Purpose:
- match the image detail budget to laser behavior

Inputs:
- preset
- mode decision
- target output size

Outputs:
- `LineDensityPlan`

Rules:
- DPI and line interval must stay compatible with machine and material constraints
- density must be low enough to avoid muddy fills and overburn

## 11. Laser Simulation

Purpose:
- predict whether the chosen plan is engraveable

Inputs:
- preset
- analysis report
- mode decision
- line density plan

Outputs:
- `LaserSimulationReport`

Rules:
- simulation must produce pass, warn, or fail
- fail or high-risk warn results should trigger a retry path in the orchestrator

## 12. Export Layer

Purpose:
- package outputs for the user and downstream software

Inputs:
- final processing plan
- preset
- asset references

Outputs:
- raster export plan
- vector export plan
- LightBurn project manifest
- ZIP export plan

Rules:
- export should describe PNG, SVG, DXF, settings JSON, preview image, and later `.lbrn2`

## 13. Python Worker

Purpose:
- handle deterministic pixel-heavy processing outside the chat route

Inputs:
- worker job payload

Outputs:
- processed image artifacts and analysis metadata

Rules:
- worker should be used for denoise, threshold, dithering, sharpening, and preview generation
- worker should remain stateless and job-driven

## Cross-Cutting Constraints

- Presets are mandatory context for optimization decisions.
- AI may choose strategy, but final image optimization should stay deterministic.
- Simulation is a quality gate.
- Export must remain reproducible.
- The pipeline should support both text-to-image and upload-to-engraving flows.
