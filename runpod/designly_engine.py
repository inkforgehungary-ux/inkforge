"""
Designly Creative Engine for InkForge RunPod Serverless.

This module is intentionally independent from the InkForge tattoo stencil
pipeline. It uses callbacks supplied by worker.py for model inference so
existing model loading/caching remains untouched.
"""
from __future__ import annotations

import base64
import io
import math
import os
import re
from typing import Any, Callable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance, ImageFilter
from designly_spec import plan_website, design_system, site_graph


DESIGNLY_MODES = {
    "designly",
    "poster",
    "business_card",
    "flyer",
    "menu",
    "social_post",
    "logo",
    "merch",
    "streamer",
    "vector",
    "web_design",
    "image_edit",
    "upscale",
    "template",
}

CATEGORY_ALIASES = {
    "business-card": "business_card",
    "businesscard": "business_card",
    "social": "social_post",
    "social-media": "social_post",
    "gamer": "streamer",
    "gaming": "streamer",
    "web": "web_design",
}

# Logical preview sizes. The export layer may later scale to the requested
# physical dimensions; diffusion itself should remain within GPU limits.
CATEGORY_SIZES = {
    "poster": (768, 1024),
    "business_card": (1024, 640),
    "flyer": (768, 1024),
    "menu": (768, 1024),
    "social_post": (1024, 1024),
    "logo": (1024, 1024),
    "merch": (1024, 1024),
    "streamer": (1280, 720),
    "vector": (1024, 1024),
    "web_design": (1280, 720),
    "template": (1024, 1024),
    "designly": (1024, 1024),
}

QUALITY = {
    "fast": {"steps": 12, "guidance": 5.0, "max_side": 768},
    "standard": {"steps": 22, "guidance": 5.5, "max_side": 1024},
    "pro": {"steps": 30, "guidance": 6.5, "max_side": 1024},
}


def _clean(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def _category(inp: dict) -> str:
    raw = _clean(inp.get("category") or inp.get("mode") or "designly").lower()
    return CATEGORY_ALIASES.get(raw, raw)


def _quality(inp: dict) -> str:
    value = _clean(inp.get("quality_level") or "standard").lower()
    return value if value in QUALITY else "standard"


def _seed(project: dict, base: int, index: int) -> int:
    pid = _clean(project.get("project_id") or "designly")
    # Stable, deterministic seed derivation without Python's randomized hash.
    n = sum((i + 1) * ord(ch) for i, ch in enumerate(pid))
    return (int(base) + n * 1009 + index * 9176) % 2147483647


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        ]
    else:
        candidates += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size=max(8, int(size)))
    return ImageFont.load_default()


def _brand(inp: dict) -> dict:
    inputs = inp.get("inputs") or {}
    return inputs.get("brand") or inp.get("brand") or {}


def _copy(inp: dict) -> dict:
    inputs = inp.get("inputs") or {}
    return inputs.get("copy") or inp.get("copy") or {}


def _prompt(inp: dict, category: str) -> str:
    inputs = inp.get("inputs") or {}
    p = _clean(inputs.get("prompt") or inp.get("prompt") or "premium professional design")
    styles = {
        "poster": "professional poster composition, strong visual hierarchy, advertising art, clean negative space",
        "business_card": "premium business card artwork, elegant brand composition, clean geometry, print design",
        "flyer": "high-conversion promotional flyer, strong hierarchy, clean advertising composition",
        "menu": "premium restaurant menu background, elegant food photography/art direction, clean negative space",
        "social_post": "premium social media advertising creative, mobile-first composition, bold focal point",
        "logo": "professional logo mark, vector-like geometry, clean silhouette, non-photographic branding",
        "merch": "professional apparel graphic, screen-print friendly artwork, isolated central composition",
        "streamer": "premium gaming esports branding, dynamic futuristic composition, strong central identity",
        "vector": "clean vector-style icon/graphic, geometric shapes, crisp edges, minimal noise",
        "web_design": "premium website hero visual, modern UI-adjacent art direction, clean composition",
        "template": "editable graphic design template, clean professional layout",
        "designly": "premium graphic design composition",
    }
    return f"{p}, {styles.get(category, styles['designly'])}"


def _negative(inp: dict, category: str) -> str:
    inputs = inp.get("inputs") or {}
    n = _clean(inputs.get("negative_prompt") or inp.get("negative_prompt") or "")
    base = "blurry, low quality, distorted, duplicate objects, watermark, illegible typography"
    if category == "logo":
        base += ", photorealistic, photograph, complex background, mockup"
    return f"{base}, {n}" if n else base


def _dimensions(inp: dict, category: str) -> tuple[int, int]:
    gen = inp.get("generation") or {}
    w = int(gen.get("width") or 0)
    h = int(gen.get("height") or 0)
    if w and h:
        return max(64, min(4096, w)), max(64, min(4096, h))
    return CATEGORY_SIZES.get(category, CATEGORY_SIZES["designly"])


def _load_reference(inp: dict, decode_image: Callable[[str], Image.Image]) -> Image.Image | None:
    inputs = inp.get("inputs") or {}
    refs = inputs.get("reference_images") or inp.get("reference_images") or []
    if not refs:
        value = inputs.get("image_base64") or inp.get("image_base64")
        return decode_image(value) if value else None
    ref = refs[0] if isinstance(refs[0], dict) else {"data": refs[0], "type": "base64"}
    if ref.get("type") == "base64" and ref.get("data"):
        return decode_image(ref["data"])
    # URL fetching belongs in the application/storage layer. Do not make the
    # GPU worker depend on arbitrary network access.
    return None


def _draw_copy(image: Image.Image, copy: dict, category: str, brand: dict) -> Image.Image:
    """Deterministic typography layer. User-supplied copy is never diffused."""
    if not copy:
        return image
    img = image.convert("RGBA")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    colors = brand.get("colors") or ["#FFFFFF", "#111111"]
    fg = colors[0] if isinstance(colors[0], str) else "#FFFFFF"

    headline = str(copy.get("headline") or "")
    subtitle = str(copy.get("subtitle") or "")
    cta = str(copy.get("cta") or "")
    lines = [x for x in (headline, subtitle, cta) if x]
    if not lines:
        return img

    # Use a translucent backing for readability rather than trusting generated
    # pixels. Layout is category-aware and intentionally conservative.
    pad = max(16, int(min(w, h) * 0.035))
    box_h = int(h * (0.22 if category in ("poster", "flyer", "menu") else 0.18))
    y0 = pad
    draw.rounded_rectangle(
        (pad, y0, w - pad, y0 + box_h),
        radius=max(8, pad // 2),
        fill=(0, 0, 0, 135),
    )
    y = y0 + pad // 2
    max_text_w = w - 2 * pad
    sizes = [max(24, int(h * 0.055)), max(16, int(h * 0.027)), max(14, int(h * 0.022))]
    for text, size, bold in zip(lines, sizes, (True, False, True)):
        font = _font(size, bold)
        # Shrink long lines until they fit.
        while size > 10 and draw.textbbox((0, 0), text, font=font)[2] > max_text_w:
            size -= 2
            font = _font(size, bold)
        draw.text((pad, y), text, font=font, fill=fg, stroke_width=0)
        y += int(size * 1.25)
    return img


def _qc(image: Image.Image, category: str, copy: dict) -> dict:
    img = image.convert("RGB")
    arr = np.asarray(img)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    contrast = float(gray.std())
    # A simple deterministic QC layer; category-specific validators can be
    # expanded without changing the public response contract.
    warnings = []
    errors = []
    if min(img.size) < 256:
        warnings.append("preview_resolution_low")
    if contrast < 12:
        warnings.append("low_contrast")
    if copy and any(len(str(v)) > 180 for v in copy.values() if isinstance(v, str)):
        warnings.append("long_text")
    score = 100.0
    score -= min(30.0, max(0.0, 18.0 - contrast))
    score -= 10.0 if min(img.size) < 256 else 0.0
    score = max(0.0, min(100.0, score))
    quality = "GOOD" if score >= 80 else "ACCEPTABLE" if score >= 60 else "NEEDS_REVIEW"
    return {
        "quality": quality,
        "score": round(score, 1),
        "warnings": warnings,
        "errors": errors,
    }


def _encode_svg(image: Image.Image) -> str:
    """Raster-to-SVG fallback is explicitly a vectorization placeholder.
    It embeds traced paths, not a bitmap with an .svg extension."""
    gray = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    for c in contours:
        if cv2.contourArea(c) < 8:
            continue
        eps = max(0.5, 0.002 * cv2.arcLength(c, True))
        approx = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(approx) < 2:
            continue
        d = "M " + " L ".join(f"{int(x)},{int(y)}" for x, y in approx) + " Z"
        paths.append(d)
    w, h = image.size
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}"><g fill="none" stroke="#000" stroke-width="2">'
        + "".join(f'<path d="{p}"/>' for p in paths)
        + "</g></svg>"
    )


def handle_designly(
    inp: dict,
    *,
    generate_text: Callable,
    generate_img2img: Callable,
    decode_image: Callable,
    prepare_image: Callable,
    encode_png: Callable,
) -> dict:
    mode = _category(inp)
    if mode.startswith("designly."):
        operation = mode.split(".", 1)[1]
        if operation in {"website_generate", "website_edit", "website_redesign", "image_to_website", "website_variation"}:
            prompt = _clean(inp.get("prompt") or "Create a premium professional website")
            plan = plan_website(prompt, inp)
            ds = design_system(inp)
            graph = site_graph(plan, inp)
            return {
                "ok": True,
                "engine": "designly",
                "mode": mode,
                "project_id": (inp.get("project") or {}).get("id"),
                "base_version": (inp.get("project") or {}).get("version", 1),
                "new_version": (inp.get("project") or {}).get("version", 1) + 1,
                "artifacts": {
                    "website_plan": plan,
                    "design_system": ds,
                    "site_graph": graph,
                    "page_specs": graph["pages"],
                    "asset_requests": plan["asset_requests"],
                },
                "patch": {"files_added": [], "files_modified": [], "files_deleted": []},
                "warnings": ["Code execution is intentionally outside the GPU worker."],
                "errors": [],
            }
        if operation in {"section_generate", "component_generate"}:
            return {
                "ok": True,
                "engine": "designly",
                "mode": mode,
                "artifact": {
                    "type": operation.replace("_generate", ""),
                    "name": _clean(inp.get("name") or "GeneratedComponent"),
                    "prompt": _clean(inp.get("prompt")),
                    "props": inp.get("props") or {},
                },
                "warnings": [],
                "errors": [],
            }
    category = mode
    if category == "designly":
        category = _category({"category": (inp.get("inputs") or {}).get("category") or "poster"})
    if category not in CATEGORY_SIZES and category not in {"image_edit", "upscale", "template"}:
        category = "poster"

    quality_level = _quality(inp)
    q = QUALITY[quality_level]
    generation = inp.get("generation") or {}
    base_seed = int(generation.get("seed") or inp.get("seed") or 123456)
    variants = inp.get("variants") or {}
    count = max(1, min(8, int(variants.get("count") or 1)))
    project = inp.get("project") or {}
    copy = _copy(inp)
    brand = _brand(inp)
    w, h = _dimensions(inp, category)
    w = min(w, q["max_side"] if max(w, h) > q["max_side"] else w)
    h = min(h, q["max_side"] if max(w, h) > q["max_side"] else h)

    outputs = []
    for i in range(count):
        seed = _seed(project, base_seed, i)
        ref = _load_reference(inp, decode_image)
        if mode in {"image_edit", "upscale"} and ref is None:
            raise ValueError("image_edit/upscale módhoz image_base64 vagy reference image szükséges.")

        if mode == "upscale":
            image = prepare_image(ref, min(4096, max(w, h)))
            target = int(generation.get("upscale_to") or min(4096, max(image.size) * 2))
            scale = target / float(max(image.size))
            image = image.resize(
                (max(64, int(image.width * scale)), max(64, int(image.height * scale))),
                Image.Resampling.LANCZOS,
            ).filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=3))
        elif mode == "image_edit":
            image = generate_img2img(
                prepare_image(ref, q["max_side"]),
                _prompt(inp, category),
                _negative(inp, category),
                min(w, q["max_side"]),
                min(h, q["max_side"]),
                q["steps"],
                q["guidance"],
                float(generation.get("strength") or 0.45),
                seed,
            )
        else:
            image = generate_text(
                _prompt(inp, category),
                _negative(inp, category),
                w,
                h,
                q["steps"],
                q["guidance"],
                seed,
            )

        # Typography is deterministic and occurs after artwork generation.
        image = _draw_copy(image, copy, category, brand)

        svg = None
        if category == "vector":
            svg = _encode_svg(image)

        qc = _qc(image, category, copy)
        png = encode_png(image)

        files = [{
            "type": "preview_png",
            "mime": "image/png",
            "data_base64": png,
        }]
        if category == "vector" and svg:
            files.append({"type": "vector_svg", "mime": "image/svg+xml", "data": svg})

        outputs.append({
            "variant": i + 1,
            "seed": seed,
            "files": files,
            "metadata": {
                "category": category,
                "quality_level": quality_level,
                "layout_id": f"{category}_default_v1",
                "width": image.width,
                "height": image.height,
                "dpi": int((inp.get("export") or {}).get("dpi") or 150),
                "preserve_exact_text": bool(copy.get("preserve_exact_text", False)),
            },
            "qc": qc,
        })

    best = outputs[0]
    return {
        "ok": True,
        "engine": "designly",
        "mode": mode,
        "category": category.upper(),
        "model": os.getenv("RUNPOD_MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0"),
        "seed": best["seed"],
        "width": best["metadata"]["width"],
        "height": best["metadata"]["height"],
        "format": "png",
        "quality": best["qc"]["quality"],
        "quality_score": best["qc"]["score"],
        "warnings": best["qc"]["warnings"],
        "errors": best["qc"]["errors"],
        "outputs": outputs,
    }
