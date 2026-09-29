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
from router import route as route_request

ENGINE_VERSION = "3.4.1"
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
    return ImageOps.exif_transpose(img).convert("RGB")

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
    try:
        return cv2.ximgproc.thinning(
            mask, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN
        )
    except Exception:
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

def _load_hed():
    global _HED_NET
    if _HED_NET is not None:
        return None if _HED_NET is False else _HED_NET
    proto = os.getenv("HED_PROTOTXT", "/app/hed/deploy.prototxt")
    weights = os.getenv("HED_WEIGHTS", "/app/hed/hed_pretrained_bsds.caffemodel")
    if not (os.path.exists(proto) and os.path.exists(weights)):
        print("[InkForge] HED assets missing; HED disabled.")
        _HED_NET = False
        return None
    print("[InkForge] Loading HED edge model")
    net = cv2.dnn.readNetFromCaffe(proto, weights)
    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    _HED_NET = net
    print("[InkForge] HED ready")
    return net

def _load_dexined():
    global _DEXINED_NET
    if _DEXINED_NET is not None:
        return _DEXINED_NET
    checkpoint = os.getenv("DEXINED_CHECKPOINT", "/app/dexined/10_model.pth")
    if not os.path.exists(checkpoint):
        raise RuntimeError("A DexiNed checkpoint nem található.")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
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
    return model

def _dexined_edges(pil: Image.Image) -> np.ndarray:
    rgb = np.array(pil.convert("RGB"))
    h, w = rgb.shape[:2]
    work_w = max(16, int(round(w / 16.0) * 16))
    work_h = max(16, int(round(h / 16.0) * 16))
    work_w = min(2048, work_w)
    work_h = min(2048, work_h)
    rgb_work = cv2.resize(rgb, (work_w, work_h), interpolation=cv2.INTER_AREA) if (work_w != w or work_h != h) else rgb
    bgr = cv2.cvtColor(rgb_work, cv2.COLOR_RGB2BGR).astype(np.float32)
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
    net = _load_hed()
    if net is None:
        return np.zeros((h, w), dtype=np.float32)
    blob = cv2.dnn.blobFromImage(
        bgr, scalefactor=1.0, size=(500, 500),
        mean=(104.00698793, 116.66876762, 122.67891434),
        swapRB=False, crop=False
    )
    net.setInput(blob)
    out = net.forward()
    edge = cv2.resize(out[0, 0], (w, h), interpolation=cv2.INTER_CUBIC)
    return np.clip(edge, 0.0, 1.0).astype(np.float32)

def _clean_photo_stencil(pil: Image.Image) -> np.ndarray:
    """Conservative tattoo stencil extraction for uploaded references."""
    rgb = np.array(pil.convert("RGB"))
    h, w = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.createCLAHE(clipLimit=1.1, tileGridSize=(8, 8)).apply(gray)
    gray = cv2.bilateralFilter(gray, 9, 18, 18)
    score = 0.85 * _dexined_edges(pil) + 0.15 * _hed_edges(pil)

    # Supress high-frequency texture by requiring broad structural support.
    broad = cv2.GaussianBlur(score, (0, 0), 5.0)
    detail = cv2.GaussianBlur(score, (0, 0), 1.2)
    structural = np.clip(broad * 0.65 + detail * 0.35, 0.0, 1.0)

    # Keep only high learned-edge confidence. This is deliberately stricter
    # than the old 84th-percentile/Canny OR path that produced line soup.
    threshold = float(max(0.38, np.percentile(structural, 92.5)))
    learned = (structural >= threshold).astype(np.uint8) * 255

    # A conservative Canny confirmation band prevents weak internal texture
    # from turning into thousands of tiny contours.
    canny = cv2.Canny(gray, 100, 210, apertureSize=3, L2gradient=True)
    canny = cv2.morphologyEx(
        canny, cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    )
    canny = _thin_mask(canny)
    mask = cv2.bitwise_and(learned, cv2.dilate(canny, np.ones((2,2), np.uint8)))

    mask = _thin_mask(mask)
    mask = _remove_border_components(mask)

    # Remove tiny components but preserve long anatomical/structural contours.
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    min_area = max(28, int(h * w * 0.00006))
    min_length = max(28, int(min(h, w) * 0.045))
    max_area = int(h * w * 0.08)
    for idx in range(1, num):
        area = int(stats[idx, cv2.CC_STAT_AREA])
        bw = int(stats[idx, cv2.CC_STAT_WIDTH])
        bh = int(stats[idx, cv2.CC_STAT_HEIGHT])
        span = max(bw, bh)
        if area > max_area:
            continue
        if area >= min_area and span >= min_length:
            out[labels == idx] = 255

    # Final open + thinning removes single-pixel speckle clusters.
    out = cv2.morphologyEx(
        out,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    )
    return _thin_mask(out)

def _stencil_mask(pil: Image.Image, source_mode: str) -> np.ndarray:
    if source_mode == "image_to_stencil":
        return _clean_photo_stencil(pil)

    rgb = np.array(pil.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 110 if source_mode in ("text_to_stencil", "image_to_image_stencil") else 90,
                      220 if source_mode in ("text_to_stencil", "image_to_image_stencil") else 200,
                      apertureSize=3, L2gradient=True)
    mask = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2,2)))
    mask = _thin_mask(mask)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    min_area = max(12, int(mask.shape[0] * mask.shape[1] * 0.00001))
    for idx in range(1, num):
        area = int(stats[idx, cv2.CC_STAT_AREA])
        bw = int(stats[idx, cv2.CC_STAT_WIDTH])
        bh = int(stats[idx, cv2.CC_STAT_HEIGHT])
        if area >= min_area and max(bw, bh) >= 18:
            out[labels == idx] = 255
    return _remove_border_components(out)

def _profile_style(style: str) -> str:
    s = str(style or "stencil").strip().lower()
    aliases = {
        "linework": "line", "fineline": "line", "fine_line": "line",
        "blackwork": "bold", "traditional": "stencil", "dotwork": "stencil",
        "ornamental": "line", "geometric": "line", "tribal": "bold",
        "japanese": "stencil", "realism": "soft",
    }
    return aliases.get(s, s if s in {"line","stencil","hatching","bold","soft"} else "stencil")

def _professional_line_drawing(pil: Image.Image, style: str = "line") -> np.ndarray:
    """Professional tattoo line/stencil extraction with conservative detail preservation."""
    style = _profile_style(style)
    rgb = np.array(pil.convert("RGB"))
    h, w = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.createCLAHE(clipLimit=1.15 if style in ("line", "soft") else 1.3,
                           tileGridSize=(8,8)).apply(gray)
    gray = cv2.bilateralFilter(gray, 9, 20, 20)

    dexi = _dexined_edges(pil)
    hed = _hed_edges(pil)
    score = 0.78 * dexi + 0.22 * hed

    broad = cv2.GaussianBlur(score, (0,0), 4.0)
    detail = cv2.GaussianBlur(score, (0,0), 1.2)
    support = np.clip(0.68 * broad + 0.32 * detail, 0.0, 1.0)

    params = {
        "line": (93.0, 0.46, 0.055, (88,170)),
        "soft": (94.0, 0.50, 0.065, (92,175)),
        "stencil": (91.0, 0.40, 0.045, (92,182)),
        "hatching": (90.0, 0.37, 0.04, (88,175)),
        "bold": (90.0, 0.38, 0.045, (86,165)),
    }
    pct, floor, delta, canny_pair = params[style]
    threshold = max(floor, float(np.percentile(support, pct)))
    learned = (support >= threshold).astype(np.uint8) * 255

    canny = cv2.Canny(gray, canny_pair[0], canny_pair[1], apertureSize=3, L2gradient=True)
    local = (support >= threshold + delta).astype(np.uint8) * 255
    local = cv2.bitwise_and(local, canny)
    mask = cv2.bitwise_or(learned, local)

    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2,2)))
    mask = _thin_mask(mask)
    mask = _remove_border_components(mask)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    min_area = max(24, int(h*w*0.000045))
    min_span = max(24, int(min(h,w)*0.035))
    max_area = int(h*w*0.07)
    for idx in range(1, num):
        area = int(stats[idx, cv2.CC_STAT_AREA])
        bw = int(stats[idx, cv2.CC_STAT_WIDTH])
        bh = int(stats[idx, cv2.CC_STAT_HEIGHT)
        span = max(bw, bh)
        if min_area <= area <= max_area and span >= min_span:
            out[labels == idx] = 255

    return _thin_mask(out)

def _mask_png(mask: np.ndarray) -> str:
    rgba = np.zeros((mask.shape[0], mask.shape[1], 4), dtype=np.uint8)
    ink = mask > 0
    rgba[ink] = [0,0,0,255]
    rgba[~ink] = [255,255,255,0]
    ok, buf = cv2.imencode(".png", rgba)
    if not ok:
        raise RuntimeError("A stencil PNG kódolása sikertelen.")
    return base64.b64encode(buf.tobytes()).decode("ascii")

def _qc_metrics(mask: np.ndarray):
    h,w = mask.shape
    area = float(max(1,h*w))
    black = int(np.count_nonzero(mask))
    coverage = black/area*100.0
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    components = max(0,num-1)
    lengths=[]; small=0; border=0
    border_px=max(2,int(round(min(h,w)*0.003)))
    for i in range(1,num):
        a=int(stats[i,cv2.CC_STAT_AREA]); bw=int(stats[i,cv2.CC_STAT_WIDTH]); bh=int(stats[i,cv2.CC_STAT_HEIGHT])
        if a<30 or max(bw,bh)<18: small+=1
        x=int(stats[i,cv2.CC_STAT_LEFT]); y=int(stats[i,cv2.CC_STAT_TOP])
        if x<=border_px or y<=border_px or x+bw>=w-border_px or y+bh>=h-border_px: border+=a
        ys,xs=np.where(labels==i)
        if len(xs)>1: lengths.append(float(max(xs.max()-xs.min(),ys.max()-ys.min())))
    isolated=float(small/max(1,components))
    avg=float(np.mean(lengths)) if lengths else 0.0
    short=float(sum(1 for x in lengths if x<max(18,min(h,w)*0.025))/max(1,len(lengths)))
    border_ratio=border/max(1,black)
    if coverage>16: verdict="OVERFILLED"
    elif isolated>0.52 or short>0.48: verdict="TOO_MUCH_NOISE"
    elif coverage<0.30: verdict="TOO_FEW_LINES"
    elif border_ratio>0.05: verdict="BROKEN_LINES"
    elif coverage>10.0: verdict="TOO_MANY_LINES"
    else: verdict="GOOD" if coverage>=0.7 and components>0 else "ACCEPTABLE"
    return {
        "coverage":round(coverage,3),"components":components,"islands":components,
        "isolated_ratio":round(isolated,4),"avg_line_length":round(avg,2),
        "short_line_ratio":round(short,4),"border_contamination":round(border_ratio,4),
        "line_density":round(sum(lengths)/max(1.0,area)*1000.0,5),"verdict":verdict
    }

def _repair_stencil(mask: np.ndarray, style: str="stencil", max_passes: int=3):
    best=mask.copy(); history=[]
    for pass_index in range(max(1,min(4,int(max_passes)))):
        metrics=_qc_metrics(best); history.append({"pass":pass_index+1,**metrics})
        if metrics["verdict"] in ("GOOD","ACCEPTABLE"): return best,history
        work=best.copy(); verdict=metrics["verdict"]
        if verdict in ("TOO_MUCH_NOISE","TOO_MANY_LINES","OVERFILLED"):
            work=cv2.morphologyEx(work,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
            num,labels,stats,_=cv2.connectedComponentsWithStats(work,8)
            clean=np.zeros_like(work)
            min_area=max(24,int(work.shape[0]*work.shape[1]*0.00005))
            min_span=max(24,int(min(work.shape)*0.04))
            for i in range(1,num):
                a=int(stats[i,cv2.CC_STAT_AREA]); bw=int(stats[i,cv2.CC_STAT_WIDTH]); bh=int(stats[i,cv2.CC_STAT_HEIGHT])
                if a>=min_area and max(bw,bh)>=min_span:
                    clean[labels==i]=255
            work=_thin_mask(clean)
        elif verdict=="TOO_FEW_LINES":
            work=_thin_mask(cv2.morphologyEx(best,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2,2))))
        elif verdict=="BROKEN_LINES":
            work=_thin_mask(cv2.morphologyEx(best,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2,2))))
        cand=_qc_metrics(work)
        if _qc_score(cand)>_qc_score(metrics): best=work
    return best,history

def _qc_score(metrics:dict)->float:
    coverage=float(metrics.get("coverage",0.0)); target=3.5
    coverage_score=max(0.0,1.0-abs(coverage-target)/8.0)
    noise_score=max(0.0,1.0-float(metrics.get("isolated_ratio",1.0)))
    short_score=max(0.0,1.0-float(metrics.get("short_line_ratio",1.0)))
    border_score=max(0.0,1.0-float(metrics.get("border_contamination",1.0)))
    return coverage_score*0.50+noise_score*0.25+short_score*0.20+border_score*0.05

def _metrics(mask:np.ndarray):
    m=_qc_metrics(mask)
    q={
        "GOOD":("hasznalhato","Éles, nyomtatható stencil-vonalrajz."),
        "ACCEPTABLE":("hasznalhato","Elfogadható, nyomtatható stencil-vonalrajz."),
        "TOO_MANY_LINES":("tul fedett","Túl sok vonal maradt; egyszerűsítés lefutott."),
        "TOO_MUCH_NOISE":("tul zajos","Túl sok apró zaj maradt; tisztítás lefutott."),
        "TOO_FEW_LINES":("tul ritka","Túl kevés vonal maradt."),
        "BROKEN_LINES":("toredezett","Töredezett vonalak maradtak."),
        "OVERFILLED":("tul fedett","A stencil túl sűrű; egyszerűsítés szükséges.")
    }[m["verdict"]]
    return m["coverage"],m["islands"],q[0],q[1],m

def _target_dimensions(inp:dict,max_side:int)->tuple[int,int]:
    tw=max(1.0,float(inp.get("target_width_mm") or 100)); th=max(1.0,float(inp.get("target_height_mm") or tw))
    aspect=th/tw
    if aspect>=1: height=max_side; width=int(round((max_side/aspect)/64.0)*64)
    else: width=max_side; height=int(round((max_side*aspect)/64.0)*64)
    return max(64,min(max_side,width)),max(64,min(max_side,height))

def _generate_text(prompt,negative,width,height,steps,guidance,seed):
    pipe=_load_text_pipe(); generator=torch.Generator(device="cpu").manual_seed(seed)
    with torch.inference_mode():
        return pipe(prompt=_lineart_prompt(prompt),negative_prompt=negative or LINEART_NEGATIVE,width=width,height=height,num_inference_steps=steps,guidance_scale=guidance,generator=generator).images[0]

def _generate_img2img(source,prompt,negative,width,height,steps,guidance,strength,seed):
    pipe=_load_img2img_pipe(); source=source.resize((width,height),Image.Resampling.LANCZOS); generator=torch.Generator(device="cpu").manual_seed(seed)
    with torch.inference_mode():
        return pipe(prompt=_lineart_prompt(prompt),negative_prompt=negative or LINEART_NEGATIVE,image=source,strength=max(.15,min(.85,strength)),num_inference_steps=steps,guidance_scale=guidance,generator=generator).images[0]

def _generate_text_raw(prompt,negative,width,height,steps,guidance,seed):
    pipe=_load_text_pipe(); generator=torch.Generator(device="cpu").manual_seed(seed)
    with torch.inference_mode():
        return pipe(prompt=prompt,negative_prompt=negative or "",width=width,height=height,num_inference_steps=steps,guidance_scale=guidance,generator=generator).images[0]

def _generate_img2img_raw(source,prompt,negative,width,height,steps,guidance,strength,seed):
    pipe=_load_img2img_pipe(); source=source.resize((width,height),Image.Resampling.LANCZOS); generator=torch.Generator(device="cpu").manual_seed(seed)
    with torch.inference_mode():
        return pipe(prompt=prompt,negative_prompt=negative or "",image=source,strength=max(.15,min(.85,strength)),num_inference_steps=steps,guidance_scale=guidance,generator=generator).images[0]

def handler(job:dict):
    started=time.time(); inp:dict[str,Any]=job.get("input") or {}; mode=str(inp.get("mode") or "image_to_stencil").strip().lower()
    if mode.startswith("designly.") or mode in {"designly","poster","business_card","flyer","menu","social_post","logo","merch","streamer","vector","web_design","image_edit","upscale","template"}:
        if not torch.cuda.is_available(): raise RuntimeError("RunPod workerben nem érhető el CUDA GPU.")
        designly_result=route_request(inp,generate_text=_generate_text_raw,generate_img2img=_generate_img2img_raw,decode_image=_decode_b64_image,prepare_image=_prepare_image,encode_png=_encode_png)
        if designly_result is not None: return designly_result

    if mode not in {"text_to_image","image_to_image","image_to_stencil","image_to_drawing","text_to_stencil","image_to_image_stencil"}:
        raise ValueError("Ismeretlen mód: "+mode)
    if not torch.cuda.is_available(): raise RuntimeError("RunPod workerben nem érhető el CUDA GPU.")

    seed=int(inp.get("seed") or int(time.time()*1000)%2147483647)
    max_side=max(512,min(1024,int(inp.get("max_side") or DEFAULT_SIZE)))
    steps=max(8,min(40,int(inp.get("steps") or DEFAULT_STEPS)))
    guidance=max(1.0,min(8.0,float(inp.get("guidance") or 5.5)))
    strength=max(.15,min(.85,float(inp.get("strength") or .28)))
    prompt=str(inp.get("prompt") or "tattoo design").strip()
    negative=str(inp.get("negative") or LINEART_NEGATIVE).strip()
    return_generated=bool(inp.get("return_generated",True))

    source=None; generated=None
    if mode in ("image_to_stencil","image_to_image","image_to_image_stencil","image_to_drawing"):
        source=_prepare_image(_decode_b64_image(str(inp.get("image_base64") or "")),max_side)

    if mode=="image_to_drawing":
        drawing_style=_profile_style(inp.get("style") or "line")
        mask=_professional_line_drawing(source,drawing_style)
        output_max_side=max(512,min(4096,int(inp.get("output_max_side") or max(mask.shape))))
        if output_max_side>max(mask.shape):
            scale=output_max_side/float(max(mask.shape)); mask=cv2.resize(mask,(max(64,int(round(mask.shape[1]*scale))),max(64,int(round(mask.shape[0]*scale)))),interpolation=cv2.INTER_NEAREST)
        mask,qc_history=_repair_stencil(mask,drawing_style,3)
        coverage,islands,quality,verdict,qc=_metrics(mask); stencil_b64=_mask_png(mask)
        return {"ok":True,"engine":ENGINE_VERSION,"mode":mode,"style":drawing_style,"width":int(mask.shape[1]),"height":int(mask.shape[0]),"generated_png_base64":stencil_b64,"png_base64":stencil_b64,"stencil_png_base64":stencil_b64,"coverage":coverage,"bridges":0,"islands":islands,"quality":quality,"verdictText":verdict,"qc":qc,"qc_history":qc_history,"seed":seed,"model":"DexiNed + HED + conservative contour thinning","gpu_ms":int((time.time()-started)*1000)}

    if mode=="text_to_image":
        tw,th=_target_dimensions(inp,max_side); generated=_generate_text(prompt,negative,tw,th,steps,guidance,seed)
        return {"ok":True,"engine":ENGINE_VERSION,"mode":mode,"generated_png_base64":_encode_png(generated),"seed":seed,"model":MODEL_ID,"gpu_ms":int((time.time()-started)*1000)}

    if mode=="image_to_image":
        generated=_generate_img2img(source,prompt,negative,source.size[0],source.size[1],steps,guidance,strength,seed)
        return {"ok":True,"engine":ENGINE_VERSION,"mode":mode,"generated_png_base64":_encode_png(generated),"seed":seed,"model":MODEL_ID,"gpu_ms":int((time.time()-started)*1000)}

    if mode=="text_to_stencil":
        tw,th=_target_dimensions(inp,max_side); generated=_generate_text(prompt,negative,tw,th,steps,guidance,seed); stencil_source=generated
        stencil_style=_profile_style(inp.get("style") or "stencil")
        mask=_professional_line_drawing(stencil_source,stencil_style)
    elif mode=="image_to_image_stencil":
        generated=_generate_img2img(source,prompt,negative,source.size[0],source.size[1],steps,guidance,strength,seed)
        mask=_stencil_mask(generated,mode)
    else:
        mask=_stencil_mask(source,mode)

    mask,qc_history=_repair_stencil(mask,_profile_style(inp.get("style") or "stencil"),3)
    coverage,islands,quality,verdict,qc=_metrics(mask); stencil_b64=_mask_png(mask)
    result={"ok":True,"engine":ENGINE_VERSION,"mode":mode,"width":int(mask.shape[1]),"height":int(mask.shape[0]),"png_base64":stencil_b64,"stencil_png_base64":stencil_b64,"coverage":coverage,"bridges":0,"islands":islands,"quality":quality,"verdictText":verdict,"qc":qc,"qc_history":qc_history,"seed":seed,"model":MODEL_ID,"gpu_ms":int((time.time()-started)*1000)}
    if generated is not None and return_generated: result["generated_png_base64"]=_encode_png(generated)
    return result

@runpod.serverless.register_fitness_check
def check_gpu():
    if not torch.cuda.is_available(): raise RuntimeError("CUDA GPU nem érhető el.")
    props=torch.cuda.get_device_properties(0)
    print(f"[InkForge] GPU: {props.name}, VRAM: {props.total_memory/(1024**3):.1f} GB")

if __name__=="__main__":
    runpod.serverless.start({"handler":handler,"concurrency_modifier":lambda current:1})
