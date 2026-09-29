import base64
import io
import os
from typing import Any

import cv2
import numpy as np
import runpod
import torch
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline

MODEL_ID = os.getenv("MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32
_pipe = None
_img2img = None


def load_pipelines():
    global _pipe, _img2img
    if _pipe is not None:
        return

    if DEVICE != "cuda":
        raise RuntimeError("RunPod worker requires a CUDA GPU.")

    common = dict(
        torch_dtype=DTYPE,
        use_safetensors=True,
        variant="fp16",
    )
    _pipe = StableDiffusionXLPipeline.from_pretrained(MODEL_ID, **common)
    _pipe = _pipe.to("cuda")
    _pipe.enable_attention_slicing()

    _img2img = StableDiffusionXLImg2ImgPipeline.from_pretrained(MODEL_ID, **common)
    _img2img = _img2img.to("cuda")
    _img2img.enable_attention_slicing()


def decode_image(value: str) -> Image.Image:
    if not value:
        raise ValueError("image_base64 is required")
    raw = base64.b64decode(value.split(",", 1)[-1])
    return Image.open(io.BytesIO(raw)).convert("RGB")


def image_b64(image: Image.Image, fmt="PNG") -> str:
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def generate_text_image(prompt: str, negative: str, job: dict) -> Image.Image:
    load_pipelines()
    width = int(job.get("width", 1024))
    height = int(job.get("height", 1024))
    steps = int(job.get("steps", 30))
    guidance = float(job.get("guidance", 7.0))
    seed = int(job.get("seed", -1))
    generator = None
    if seed >= 0:
        generator = torch.Generator(device="cuda").manual_seed(seed)

    result = _pipe(
        prompt=prompt,
        negative_prompt=negative,
        width=width,
        height=height,
        num_inference_steps=steps,
        guidance_scale=guidance,
        generator=generator,
    )
    return result.images[0]


def generate_img2img(source: Image.Image, prompt: str, negative: str, job: dict) -> Image.Image:
    load_pipelines()
    max_side = int(job.get("max_side", 1024))
    source.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    w, h = source.size
    w = max(64, (w // 8) * 8)
    h = max(64, (h // 8) * 8)
    source = source.resize((w, h), Image.Resampling.LANCZOS)

    steps = int(job.get("steps", 30))
    guidance = float(job.get("guidance", 7.0))
    strength = float(job.get("strength", 0.65))
    seed = int(job.get("seed", -1))
    generator = None
    if seed >= 0:
        generator = torch.Generator(device="cuda").manual_seed(seed)

    result = _img2img(
        prompt=prompt,
        negative_prompt=negative,
        image=source,
        strength=max(0.05, min(0.95, strength)),
        num_inference_steps=steps,
        guidance_scale=guidance,
        generator=generator,
    )
    return result.images[0]


def make_stencil(image: Image.Image) -> Image.Image:
    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    edges = cv2.Canny(gray, 55, 145)
    kernel = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)

    # White background + clean black tattoo lines.
    out = np.full_like(gray, 255)
    out[edges > 0] = 0

    # Remove tiny specks.
    n, labels, stats, _ = cv2.connectedComponentsWithStats((out == 0).astype(np.uint8), 8)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 10:
            out[labels == i] = 255

    return Image.fromarray(out, mode="L").convert("RGB")


def contour_paths(stencil: Image.Image):
    arr = np.array(stencil.convert("L"))
    binary = (arr < 128).astype(np.uint8) * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    paths = []
    for contour in contours:
        if len(contour) < 2:
            continue
        points = contour[:, 0, :]
        paths.append(points)
    return paths


def make_svg(stencil: Image.Image) -> bytes:
    w, h = stencil.size
    paths = []
    for points in contour_paths(stencil):
        d = "M " + " ".join(f"{int(x)},{int(y)}" for x, y in points) + " Z"
        paths.append(f'<path d="{d}" fill="none" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="white"/>'
        + "".join(paths)
        + "</svg>"
    )
    return svg.encode("utf-8")


def make_pdf(stencil: Image.Image) -> bytes:
    w, h = stencil.size
    page_w, page_h = A4
    margin = 28
    scale = min((page_w - 2 * margin) / w, (page_h - 2 * margin) / h)
    ox = (page_w - w * scale) / 2
    oy = (page_h - h * scale) / 2

    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    pdf.setTitle("InkForge Stencil")

    for points in contour_paths(stencil):
        if len(points) < 2:
            continue
        p = pdf.beginPath()
        x0, y0 = points[0]
        p.moveTo(ox + x0 * scale, oy + (h - y0) * scale)
        for x, y in points[1:]:
            p.lineTo(ox + x * scale, oy + (h - y) * scale)
        pdf.drawPath(p, stroke=1, fill=0)

    pdf.showPage()
    pdf.save()
    return buf.getvalue()


def build_outputs(stencil: Image.Image) -> dict:
    return {
        "stencil_png_base64": image_b64(stencil),
        "svg_base64": base64.b64encode(make_svg(stencil)).decode("ascii"),
        "pdf_base64": base64.b64encode(make_pdf(stencil)).decode("ascii"),
        "width": stencil.width,
        "height": stencil.height,
    }


def handler(job: dict) -> dict:
    inp: dict[str, Any] = job.get("input", job)

    mode = inp.get("mode", "text_to_image")
    prompt = str(inp.get("prompt", "")).strip()
    negative = str(
        inp.get(
            "negative_prompt",
            "blurry, low quality, text, watermark, logo, deformed anatomy, duplicate lines",
        )
    )

    if mode == "text_to_image":
        image = generate_text_image(prompt, negative, inp)
        return {
            "image_base64": image_b64(image),
            "png_base64": image_b64(image),
            "width": image.width,
            "height": image.height,
        }

    source = decode_image(inp.get("image_base64", ""))

    if mode == "image_to_image":
        image = generate_img2img(source, prompt, negative, inp)
        return {"image_base64": image_b64(image), "png_base64": image_b64(image)}

    if mode in ("image_to_stencil", "image_to_image_stencil"):
        image = source
        if mode == "image_to_image_stencil":
            image = generate_img2img(source, prompt, negative, inp)
        stencil = make_stencil(image)
        out = build_outputs(stencil)
        out["image_base64"] = out["stencil_png_base64"]
        out["generated_png_base64"] = out["stencil_png_base64"]
        return out

    raise ValueError(f"Unsupported mode: {mode}")


runpod.serverless.start({"handler": handler})
