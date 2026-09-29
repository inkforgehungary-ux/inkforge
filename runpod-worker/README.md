# InkForge RunPod Worker

This is the dedicated RunPod Serverless worker for InkForge.

## Supported modes

- text_to_image
- image_to_image
- image_to_stencil
- image_to_image_stencil

Stencil jobs return:

- stencil_png_base64
- svg_base64
- pdf_base64
- width / height

The SVG is generated from OpenCV contours and the PDF is generated as vector paths with ReportLab.

## Build

The GitHub Actions workflow publishes:

ghcr.io/inkforgehungary-ux/inkforge-runpod-worker:latest

and version tags such as:

ghcr.io/inkforgehungary-ux/inkforge-runpod-worker:1.0.0

## RunPod

Create a Serverless endpoint from the published image. The worker expects a CUDA GPU.

Optional environment variable:

MODEL_ID=stabilityai/stable-diffusion-xl-base-1.0

For private Hugging Face models, configure the appropriate HF token in RunPod rather than committing it to GitHub.

## Request example

{
  "input": {
    "mode": "text_to_image",
    "prompt": "professional blackwork tattoo design of a raven and nordic runes, clean white background",
    "negative_prompt": "blurry, text, watermark",
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "guidance": 7
  }
}

Stencil request:

{
  "input": {
    "mode": "image_to_stencil",
    "image_base64": "<base64>"
  }
}
