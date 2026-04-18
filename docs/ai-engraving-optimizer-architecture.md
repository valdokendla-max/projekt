# AI Engraving Optimizer Architecture

## Purpose

This document defines a repository-ready architecture for turning user text or uploaded images into laser-engraving-ready assets.

The target output is not a generic AI image pipeline. It is a preset-aware engraving pipeline that optimizes for:

- very high contrast
- monochrome output
- clear edge separation
- low background noise
- predictable behavior against machine and material presets

## Current Project Integration

The existing project already provides three foundations:

- machine and material recommendation logic in `backend/laser-data.js`
- settings capture UI in `frontend/components/laser-settings-panel.tsx`
- hidden settings context and multimodal chat routing in `frontend/app/api/chat/route.ts`

The optimizer architecture should build on those pieces instead of replacing them.

## Proposed File Layout

```text
frontend/
  app/
    api/
      chat/route.ts
      engraving-export/route.ts
      engraving-optimize/route.ts
      image-generation/route.ts
  lib/
    engraving/
      engraving-mode.ts
      image-analyzer.ts
      image-generation.ts
      image-normalization.ts
      index.ts
      laser-simulation.ts
      lightburn-project.ts
      optimizer-pipeline.ts
      preset-engine.ts
      prompt-optimizer.ts
      types.ts
      vector-engraving.ts
      zip-export.ts
workers/
  image_optimizer/
    requirements.txt
    worker.py
docs/
  ai-engraving-optimizer-architecture.md
  ai-engraving-optimizer-spec.md
```

## End-to-End Flow

### Text-to-engraving flow

1. User enters a text request.
2. Prompt optimizer converts the raw text into engraving-safe generation instructions.
3. Image generation API builds a provider request using the optimized prompt and saved preset.
4. Generated image enters the optimizer pipeline.
5. Optimizer pipeline normalizes, analyzes, selects mode, estimates line density, simulates the result, and prepares exports.

### Image-to-engraving flow

1. User uploads an image.
2. Optimizer pipeline normalizes the image.
3. Image analyzer classifies the asset.
4. Preset-aware mode selector chooses threshold, dither, or vector.
5. Line density and simulation score the result.
6. Export plan prepares raster, vector, LightBurn, and ZIP outputs.

## Module Responsibilities

### `preset-engine.ts`

- parse the saved settings summary into a normalized preset object
- expose one shared preset shape for every downstream module
- resolve preset defaults when some values are missing

### `prompt-optimizer.ts`

- convert user requests into engraving-safe prompts
- inject hard constraints for contrast, monochrome output, edge clarity, and background cleanup
- emit positive prompt, negative prompt, and safety constraints

### `image-generation.ts`

- build generation job requests from optimized prompts
- centralize provider configuration and output size policy
- keep image generation independent from chat streaming logic

### `image-normalization.ts`

- define the standard image preprocessing plan
- unify orientation, format, alpha handling, grayscale policy, and target working size

### `image-analyzer.ts`

- classify an image as photo, logo, line art, text mark, or mixed
- score contrast, noise, edges, and background complexity
- emit risks that downstream stages can use

### `engraving-mode.ts`

- choose threshold, dither, or vector mode
- compute target DPI and line density from preset + analysis
- decide when vector output is allowed

### `laser-simulation.ts`

- estimate whether the result is likely to engrave cleanly
- produce a pass, warn, or fail verdict
- drive a feedback loop when detail density is too high

### `vector-engraving.ts`

- describe when raster-to-vector conversion is safe
- emit vectorization plans for logo, text, and line-art assets

### `lightburn-project.ts`

- generate a LightBurn-oriented manifest that can later become `.lbrn2`
- define layers, passes, line interval, and export references

### `zip-export.ts`

- define export package layout
- gather raster, vector, LightBurn, preview, and settings artifacts into one manifest

### `optimizer-pipeline.ts`

- orchestrate all modules in order
- remain deterministic where possible
- expose one pipeline result object for APIs and UI

## API Routes

### `app/api/image-generation/route.ts`

Purpose:
- accept text prompt + saved preset
- return a generation plan or generated asset metadata

### `app/api/engraving-optimize/route.ts`

Purpose:
- accept preset + source metadata
- return the optimizer pipeline result

### `app/api/engraving-export/route.ts`

Purpose:
- accept optimized asset references + preset
- return export manifest and LightBurn plan

## Python Worker

The Python worker should own deterministic pixel operations that are awkward or expensive to maintain in a chat route.

Primary responsibilities:

- grayscale conversion
- denoising
- thresholding
- dithering
- optional vector-prep cleanup
- preview generation for simulation/export

This worker should be triggered by an API job, not directly by the UI.

## Design Rules

- AI decides strategy. Deterministic code performs image processing.
- Presets affect every stage after prompt ingestion.
- Simulation is a quality gate, not just a preview.
- Export is a bundle of artifacts, not a single file.
- Chat remains advisory. Image generation and optimization live in dedicated routes.

## Recommended Build Order

1. `preset-engine.ts`
2. `prompt-optimizer.ts`
3. `image-generation.ts` + `app/api/image-generation/route.ts`
4. `optimizer-pipeline.ts`
5. `image-analyzer.ts`
6. `engraving-mode.ts`
7. `laser-simulation.ts`
8. Python worker
9. `vector-engraving.ts`
10. `lightburn-project.ts`
11. `zip-export.ts`
12. `app/api/engraving-export/route.ts`
