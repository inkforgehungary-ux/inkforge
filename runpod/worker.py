# ============================================================
# INKFORGE — RUNPOD SERVERLESS AI WORKER
# Text -> Image
# Image -> Image
# Image/Text -> sharp tattoo stencil line art
# ============================================================

import base64
import io
import os
import time
import threading
from typing import Any

import cv2
import numpy as np
import torch
import runpod
from PIL import Image, ImageOps
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline
from dexined_model import DexiNed

ENGINE_VERSION = "3.2.0"
MODEL_ID = os.getenv("RUNPOD_MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0")
DEFAULT_SIZE = int(os.getenv("RUNPOD_DEFAULT_SIZE", "768"))
DEFAULT_STEPS = int(os.getenv("RUNPOD_DEFAULT_STEPS", "22"))
MODEL_CACHE = os.getenv("HF_HOME", "/workspace/huggingface")

_PIPE_LOCK = threading.Lock()
_TEXT_PIPE = None
_IMG2IMG_PIPE = None
_HED_NET = None
_DEXINED_NET = None

LINEART_NEGATIVE = (
    "photorealistic, photograph, grey shading, grayscale shading, gradients, "
    "color, skin texture, background, scenery, text, letters, watermark, "
    "noise, blur, soft focus, 3d render, realistic lighting, shadows"
)

def _free_pipes():
    global _TEXT_PIPE, _IMG2IMG_PIPE, _HED_NET, _DEXINED_NET
    _TEXT_PIPE = None
    _IMG2IMG_PIPE = None
    _HED_NET = None
    _DEXINED_NET = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def _configure_pipe(pipe):
    try:
        pipe.enable_vae_slicing()
    except Exception:
        pass
    try:
        pipe.enable_vae_tiling()
    except Exception:
        pass
    try:
        pipe.set_progress_bar_config(disable=True)
    except Exception:
        pass
    pipe.enable_model_cpu_offload()
    return pipe

def _load_text_pipe():
    global _TEXT_PIPE
    if _TEXT_PIPE is not None:
        return _TEXT_PIPE
    with _PIPE_LOCK:
        if _TEXT_PIPE is None:
            _free_pipes()
            print(f"[InkForge] Loading text-to-image model: {MODEL_ID}")
            _TEXT_PIPE = StableDiffusionXLPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.float16,
                variant="fp16",
                use_safetensors=True,
                cache_dir=MODEL_CACHE,
            )
            _TEXT_PIPE = _configure_pipe(_TEXT_PIPE)
            print("[InkForge] Text pipeline ready")
    return _TEXT_PIPE

def _load_img2img_pipe():
    global _IMG2IMG_PIPE
    if _IMG2IMG_PIPE is not None:
        return _IMG2IMG_PIPE
    with _PIPE_LOCK:
        if _IMG2IMG_PIPE is None:
            _free_pipes()
            print(f"[InkForge] Loading image-to-image model: {MODEL_ID}")
            _IMG2IMG_PIPE = StableDiffusionXLImg2ImgPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.float16,
                variant="fp16",
                use_safetensors=True,
                cache_dir=MODEL_CACHE,
            )
            _IMG2IMG_PIPE = _configure_pipe(_IMG2IMG_PIPE)
            print("[InkForge] Image-to-image pipeline ready")
    return _IMG2IMG_PIPE

def _decode_b64_image(value: str) -> Image.Image:
    if not value:
        raise ValueError("Hiányzik a forráskép.")
    if "," in value and value.lstrip().startswith("data:"):
        value = value.split(",", 1)[1]
    raw = base64.b64decode(value)
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img).convert("RGB")
    return img

def _encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")

def _fit_size(img: Image.Image, max_side: int) -> tuple[int, int]:
    w, h = img.size
    scale = min(1.0, float(max_side) / float(max(w, h)))
    nw = max(64, int(round((w * scale) / 64.0) * 64))
    nh = max(64, int(round((h * scale) / 64.0) * 64))
    return nw, nh

def _prepare_image(img: Image.Image, max_side: int) -> Image.Image:
    w, h = _fit_size(img, max_side)
    return img.resize((w, h), Image.Resampling.LANCZOS)

def _lineart_prompt(user_prompt: str) -> str:
    clean = " ".join(str(user_prompt or "").split()).strip()
    if not clean:
        clean = "tattoo design"
    return (
        f"{clean}, SINGLE SUBJECT ONLY, one centered tattoo design, "
        "professional tattoo flash, clean black ink line art, "
        "strong recognizable silhouette, crisp continuous outer contour, "
        "controlled interior contour lines, isolated on pure white, "
        "no scene, no collage, no multiple objects, no duplicated subject, "
        "no decorative background, no frame, no border, no shading, "
        "no grey, no color, no texture, print-ready tattoo transfer artwork"
    )

def _thin_mask(mask: np.ndarray) -> np.ndarray:
    """Skeletonize binary edges to approximately one-pixel lines."""
    try:
        thinning = cv2.ximgproc.thinning
        return thinning(mask, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
    except Exception:
        # Small, dependency-free Zhang-Suen fallback.
        img = (mask > 0).astype(np.uint8)
        changed = True
        while changed:
            changed = False
            for step in (0, 1):
                p = np.pad(img, 1, mode="constant")
                P2,P3,P4,P5,P6,P7,P8,P9 = [p[1+d[0]:1+d[0]+img.shape[0], 1+d[1]:1+d[1]+img.shape[1]]
                    for d in [(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]]
                n = P2+P3+P4+P5+P6+P7+P8+P9
                transitions = ((P2==0)&(P3==1)).astype(np.uint8)+((P3==0)&(P4==1)).astype(np.uint8)+((P4==0)&(P5==1)).astype(np.uint8)+((P5==0)&(P6==1)).astype(np.uint8)+((P6==0)&(P7==1)).astype(np.uint8)+((P7==0)&(P8==1)).astype(np.uint8)+((P8==0)&(P9==1)).astype(np.uint8)+((P9==0)&(P2==1)).astype(np.uint8)
                if step == 0:
                    remove = (img==1)&(n>=2)&(n<=6)&(transitions==1)&((P2*P4*P6)==0)&((P4*P6*P8)==0)
                else:
                    remove = (img==1)&(n>=2)&(n<=6)&(transitions==1)&((P2*P4*P8)==0)&((P2*P6*P8)==0)
                if np.any(remove):
                    img[remove] = 0
                    changed = True
        return (img*255).astype(np.uint8)

def _stencil_mask(pil: Image.Image, source_mode: str) -> np.ndarray:
    rgb = np.array(pil.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # Strong blur suppresses photographic micro-texture before edge detection.
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    if source_mode in ("text_to_stencil", "image_to_image_stencil"):
        # Only contours. Never threshold the image into filled black areas.
        edges = cv2.Canny(gray, 110, 220, apertureSize=3, L2gradient=True)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        mask = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    else:
        # Direct photo/reference tracing: conservative edge extraction.
        edges = cv2.Canny(gray, 90, 200, apertureSize=3, L2gradient=True)
        mask = cv2.morphologyEx(
            edges,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        )

    # Thin every surviving contour to a single clean stroke.
    mask = _thin_mask(mask)

    # Remove speckles, but keep meaningful tattoo contours.
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    min_area = max(6, int(mask.shape[0] * mask.shape[1] * 0.000008))
    max_area = int(mask.shape[0] * mask.shape[1] * 0.08)
    for idx in range(1, num):
        area = stats[idx, cv2.CC_STAT_AREA]
        if min_area <= area <= max_area:
            out[labels == idx] = 255

    # Never dilate: output is intentionally a one-pixel line stencil.
    return out

def _load_hed():
    global _HED_NET
    if _HED_NET is not None:
        return _HED_NET
    proto = os.getenv("HED_PROTOTXT", "/app/hed/deploy.prototxt")
    weights = os.getenv("HED_WEIGHTS", "/app/hed/hed_pretrained_bsds.caffemodel")
    if not (os.path.exists(proto) and os.path.exists(weights)):
        raise RuntimeError("A HED modell fajljai nem találhatók.")
    print("[InkForge] Loading HED edge model")
    net = cv2.dnn.readNetFromCaffe(proto, weights)
    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    _HED_NET = net
    print("[InkForge] HED ready")
    return _HED_NET


def _load_dexined():
    global _DEXINED_NET
    if _DEXINED_NET is not None:
        return _DEXINED_NET
    checkpoint = os.getenv("DEXINED_CHECKPOINT", "/app/dexined/10_model.pth")
    if not os.path.exists(checkpoint):
        raise RuntimeError("A DexiNed checkpoint nem található.")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _free_pipes()
    print("[InkForge] Loading DexiNed edge model")
    model = DexiNed().to(device)
    state = torch.load(checkpoint, map_location=device)
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]
    if isinstance(state, dict):
        state = {k.replace("module.", "", 1): v for k, v in state.items()}
    model.load_state_dict(state, strict=True)
    model.eval()
    _DEXINED_NET = model
    print("[InkForge] DexiNed ready")
    return _DEXINED_NET


def _dexined_edges(pil: Image.Image) -> np.ndarray:
    """Official DexiNed architecture/checkpoint inference, restored to source size."""
    rgb = np.array(pil.convert("RGB"))
    h, w = rgb.shape[:2]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR).astype(np.float32)
    bgr -= np.array([103.939, 116.779, 123.68], dtype=np.float32)
    tensor = torch.from_numpy(bgr.transpose(2, 0, 1)).unsqueeze(0).float()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tensor = tensor.to(device)
    model = _load_dexined()
    with torch.inference_mode():
        outputs = model(tensor)
        logits = outputs[-1]
        edge = torch.sigmoid(logits)[0, 0].detach().float().cpu().numpy()
    edge = cv2.resize(edge, (w, h), interpolation=cv2.INTER_CUBIC)
    return np.clip(edge, 0.0, 1.0).astype(np.float32)


def _hed_edges(pil: Image.Image) -> np.ndarray:
    bgr = cv2.cvtColor(np.array(pil.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(
        bgr, scalefactor=1.0, size=(500, 500),
        mean=(104.00698793, 116.66876762, 122.67891434),
        swapRB=False, crop=False
    )
    net = _load_hed()
    net.setInput(blob)
    out = net.forward()
    edge = cv2.resize(out[0, 0], (w, h), interpolation=cv2.INTER_CUBIC)
    return np.clip(edge, 0.0, 1.0).astype(np.float32)


def _remove_border_components(mask: np.ndarray) -> np.ndarray:
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    h, w = mask.shape
    out = np.zeros_like(mask)
    for idx in range(1, num):
        x = int(stats[idx, cv2.CC_STAT_LEFT])
        y = int(stats[idx, cv2.CC_STAT_TOP])
        bw = int(stats[idx, cv2.CC_STAT_WIDTH])
        bh = int(stats[idx, cv2.CC_STAT_HEIGHT])
        if x <= 0 or y <= 0 or x + bw >= w or y + bh >= h:
            continue
        out[labels == idx] = 255
    return out


def _professional_line_drawing(pil: Image.Image) -> np.ndarray:
    """Professional tattoo line art: DexiNed + HED fusion + adaptive thinning."""
    rgb = np.array(pil.convert("RGB"))
    h, w = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8)).apply(gray)
    gray = cv2.bilateralFilter(gray, 7, 28, 28)

    # Two independent learned edge maps: DexiNed carries fine structure;
    # HED contributes stable multi-scale object boundaries.
    dexi = _dexined_edges(pil)
    hed = _hed_edges(pil)
    score = (0.68 * dexi) + (0.32 * hed)

    # Adaptive threshold keeps the strongest structural contours without
    # turning tonal regions into solid black shapes.
    q = float(np.percentile(score, 72.0))
    threshold = float(np.clip(q, 0.22, 0.46))
    strong = (score >= threshold).astype(np.uint8) * 255

    # Recover only high-confidence fine detail that is also supported by a
    # local gradient. This is deliberately conservative for tattoo transfer.
    grad = cv2.Canny(gray, 65, 145, apertureSize=3, L2gradient=True)
    detail = ((score >= max(0.42, threshold + 0.06)).astype(np.uint8) * 255)
    supported_detail = cv2.bitwise_and(detail, grad)
    mask = cv2.bitwise_or(strong, supported_detail)

    mask = cv2.morphologyEx(
        mask, cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    )
    mask = _thin_mask(mask)
    mask = _remove_border_components(mask)

    # Connected-component filtering: remove isolated photographic noise while
    # preserving long contours and meaningful facial/animal features.
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    min_area = max(10, int(h * w * 0.000008))
    max_area = int(h * w * 0.12)
    for idx in range(1, num):
        area = int(stats[idx, cv2.CC_STAT_AREA])
        bw = int(stats[idx, cv2.CC_STAT_WIDTH])
        bh = int(stats[idx, cv2.CC_STAT_HEIGHT])
        if min_area <= area <= max_area and (max(bw, bh) >= 18 or area >= 22):
            out[labels == idx] = 255

    return out


def _pencil_line_drawing(pil: Image.Image) -> np.ndarray:
    """Deterministic pencil/contour drawing: only essential thin black lines, no filled regions."""
    rgb = np.array(pil.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # Flatten lighting and suppress photo texture before extracting contours.
    clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    gray = cv2.bilateralFilter(gray, 7, 35, 35)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # Conservative Canny: keeps strong structure while rejecting fine photographic noise.
    edges = cv2.Canny(gray, 80, 170, apertureSize=3, L2gradient=True)
    edges = cv2.morphologyEx(
        edges,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    )
    edges = cv2.morphologyEx(
        edges,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    )

    # One-pixel skeleton — never thicken the result.
    thin = _thin_mask(edges)

    # Remove isolated speckles and very large photographic regions.
    num, labels, stats, _ = cv2.connectedComponentsWithStats(thin, connectivity=8)
    out = np.zeros_like(thin)
    h, w = thin.shape
    min_area = max(10, int(h * w * 0.000012))
    max_area = int(h * w * 0.12)
    for idx in range(1, num):
        area = int(stats[idx, cv2.CC_STAT_AREA])
        bw = int(stats[idx, cv2.CC_STAT_WIDTH])
        bh = int(stats[idx, cv2.CC_STAT_HEIGHT])
        if area < min_area or area > max_area:
            continue
        # Preserve long contours but reject tiny isolated dots/noise.
        if max(bw, bh) >= 18 or area >= 18:
            out[labels == idx] = 255

    return out

def _mask_png(mask: np.ndarray) -> str:
    h, w = mask.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    ink = mask > 0
    rgba[ink] = [0, 0, 0, 255]
    rgba[~ink] = [255, 255, 255, 0]
    ok, buf = cv2.imencode(".png", rgba)
    if not ok:
        raise RuntimeError("A stencil PNG kódolása sikertelen.")
    return base64.b64encode(buf.tobytes()).decode("ascii")

def _metrics(mask: np.ndarray):
    h, w = mask.shape
    coverage = float(np.count_nonzero(mask)) / float(max(1, w * h)) * 100.0
    num, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    islands = sum(
        1 for i in range(1, num)
        if stats[i, cv2.CC_STAT_AREA] >= 30
    )
    if coverage < 0.7:
        quality = "tul ritka"
        verdict = "Túl kevés vonal maradt. Erősebb kontraszt vagy másik forráskép kell."
    elif coverage > 18:
        quality = "tul fedett"
        verdict = "Túl sok vonal maradt. Erősebb egyszerűsítés javasolt."
    elif islands > 8:
        quality = "hidakkal javithato"
        verdict = "Több különálló rész maradt; finom tisztítás vagy bridge segíthet."
    else:
        quality = "hasznalhato"
        verdict = "Éles, nyomtatható stencil-vonalrajz."
    return round(coverage, 2), islands, quality, verdict

def _target_dimensions(inp: dict, max_side: int) -> tuple[int, int]:
    # Text generation keeps the requested physical aspect ratio.
    tw = max(1.0, float(inp.get("target_width_mm") or 100))
    th = max(1.0, float(inp.get("target_height_mm") or tw))
    aspect = th / tw
    if aspect >= 1.0:
        height = max_side
        width = int(round((max_side / aspect) / 64.0) * 64)
    else:
        width = max_side
        height = int(round((max_side * aspect) / 64.0) * 64)
    width = max(64, min(max_side, width))
    height = max(64, min(max_side, height))
    return width, height

def _generate_text(prompt: str, negative: str, width: int, height: int, steps: int, guidance: float, seed: int):
    pipe = _load_text_pipe()
    generator = torch.Generator(device="cpu").manual_seed(seed)
    with torch.inference_mode():
        image = pipe(
            prompt=_lineart_prompt(prompt),
            negative_prompt=negative or LINEART_NEGATIVE,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
        ).images[0]
    return image

def _generate_img2img(source: Image.Image, prompt: str, negative: str, width: int, height: int, steps: int, guidance: float, strength: float, seed: int):
    pipe = _load_img2img_pipe()
    source = source.resize((width, height), Image.Resampling.LANCZOS)
    generator = torch.Generator(device="cpu").manual_seed(seed)
    with torch.inference_mode():
        image = pipe(
            prompt=_lineart_prompt(prompt),
            negative_prompt=negative or LINEART_NEGATIVE,
            image=source,
            strength=max(0.15, min(0.85, strength)),
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
        ).images[0]
    return image

def handler(job: dict):
    started = time.time()
    inp: dict[str, Any] = job.get("input") or {}
    mode = str(inp.get("mode") or "image_to_stencil").strip().lower()

    if mode not in {
        "text_to_image",
        "image_to_image",
        "image_to_stencil",
        "image_to_drawing",
        "text_to_stencil",
        "image_to_image_stencil",
    }:
        raise ValueError("Ismeretlen mód: " + mode)

    if not torch.cuda.is_available():
        raise RuntimeError("RunPod workerben nem érhető el CUDA GPU.")

    seed = int(inp.get("seed") or int(time.time() * 1000) % 2147483647)
    max_side = int(inp.get("max_side") or DEFAULT_SIZE)
    max_side = max(512, min(1024, max_side))
    steps = max(8, min(40, int(inp.get("steps") or DEFAULT_STEPS)))
    guidance = max(1.0, min(8.0, float(inp.get("guidance") or 5.5)))
    strength = max(0.15, min(0.85, float(inp.get("strength") or 0.28)))
    prompt = str(inp.get("prompt") or "tattoo design").strip()
    negative = str(inp.get("negative") or LINEART_NEGATIVE).strip()
    return_generated = bool(inp.get("return_generated", True))

    source = None
    generated = None

    if mode in ("image_to_stencil", "image_to_image", "image_to_image_stencil", "image_to_drawing"):
        source = _prepare_image(
            _decode_b64_image(str(inp.get("image_base64") or "")),
            max_side,
        )

    if mode == "image_to_drawing":
        mask = _professional_line_drawing(source)
        coverage, islands, quality, verdict = _metrics(mask)
        stencil_b64 = _mask_png(mask)
        return {
            "ok": True,
            "engine": ENGINE_VERSION,
            "mode": mode,
            "width": int(mask.shape[1]),
            "height": int(mask.shape[0]),
            "generated_png_base64": stencil_b64,
            "png_base64": stencil_b64,
            "stencil_png_base64": stencil_b64,
            "coverage": coverage,
            "bridges": 0,
            "islands": islands,
            "quality": quality,
            "verdictText": verdict,
            "seed": seed,
            "model": "DexiNed + HED + adaptive contour thinning",
            "gpu_ms": int((time.time() - started) * 1000),
        }

    if mode == "text_to_image":
        tw, th = _target_dimensions(inp, max_side)
        generated = _generate_text(prompt, negative, tw, th, steps, guidance, seed)
        return {
            "ok": True,
            "engine": ENGINE_VERSION,
            "mode": mode,
            "generated_png_base64": _encode_png(generated),
            "seed": seed,
            "model": MODEL_ID,
            "gpu_ms": int((time.time() - started) * 1000),
        }

    if mode == "image_to_image":
        generated = _generate_img2img(
            source, prompt, negative,
            source.size[0], source.size[1],
            steps, guidance, strength, seed
        )
        return {
            "ok": True,
            "engine": ENGINE_VERSION,
            "mode": mode,
            "generated_png_base64": _encode_png(generated),
            "seed": seed,
            "model": MODEL_ID,
            "gpu_ms": int((time.time() - started) * 1000),
        }

    if mode == "text_to_stencil":
        tw, th = _target_dimensions(inp, max_side)
        generated = _generate_text(prompt, negative, tw, th, steps, guidance, seed)
        stencil_source = generated
    elif mode == "image_to_image_stencil":
        generated = _generate_img2img(
            source, prompt, negative,
            source.size[0], source.size[1],
            steps, guidance, strength, seed
        )
        stencil_source = generated
    else:
        stencil_source = source

    mask = _stencil_mask(stencil_source, mode)
    coverage, islands, quality, verdict = _metrics(mask)
    stencil_b64 = _mask_png(mask)

    result = {
        "ok": True,
        "engine": ENGINE_VERSION,
        "mode": mode,
        "width": int(mask.shape[1]),
        "height": int(mask.shape[0]),
        "png_base64": stencil_b64,
        "stencil_png_base64": stencil_b64,
        "coverage": coverage,
        "bridges": 0,
        "islands": islands,
        "quality": quality,
        "verdictText": verdict,
        "seed": seed,
        "model": MODEL_ID,
        "gpu_ms": int((time.time() - started) * 1000),
    }
    if generated is not None and return_generated:
        result["generated_png_base64"] = _encode_png(generated)
    return result

@runpod.serverless.register_fitness_check
def check_gpu():
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU nem érhető el.")
    props = torch.cuda.get_device_properties(0)
    print(f"[InkForge] GPU: {props.name}, VRAM: {props.total_memory / (1024**3):.1f} GB")

if __name__ == "__main__":
    runpod.serverless.start({
        "handler": handler,
        "concurrency_modifier": lambda current: 1,
    })
