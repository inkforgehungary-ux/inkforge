# ============================================================
# INKFORGE STENCIL AI ENGINE — Runpod GPU
# FastAPI: foto -> vonalas stencil (lineart)
#
# MERESI TANULSAGOK (valodi fotokon):
#  - A fix XDoG kuszob (1/255 = 0.0039) HASZNALHATATLAN:
#    a keppontok 99%-at vonalnak veszi -> 100% vagy 46% fedettseg.
#  - A helyes megoldas: a VALASZ ELOSZLASABOL szamolt AUTO-KUSZOB.
#    Valodi fotón a 94. percentilis: 0.1154 -> 5% fedettseg.
#  - Cel-fedettseg 4-10%, ez a nyomtathato stencil tartomany.
# ============================================================

import base64
import time
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

api = FastAPI(title="InkForge Stencil AI", version="2.0.0")

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE_VERSION = "2.0.0"
CUDA_AVAILABLE = False
GPU_NAME = None
try:
    import torch
    CUDA_AVAILABLE = torch.cuda.is_available()
    if CUDA_AVAILABLE:
        GPU_NAME = torch.cuda.get_device_name(0)
except Exception:
    torch = None


# ------------------------------------------------------------
# Segedfuggvenyek
# ------------------------------------------------------------

def decode_image(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise HTTPException(400, "A kep nem olvashato.")
    if img.ndim == 3 and img.shape[2] == 4:
        alpha = img[:, :, 3:4].astype(np.float32) / 255.0
        rgb = img[:, :, :3].astype(np.float32)
        img = (rgb * alpha + 255.0 * (1.0 - alpha)).astype(np.uint8)
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    return img


def encode_png(mask: np.ndarray, transparent: bool = True) -> bytes:
    h, w = mask.shape
    rgba = np.zeros((h, w, 4), np.uint8)
    ink = mask > 0
    rgba[ink] = [0, 0, 0, 255]
    rgba[~ink] = [255, 255, 255, 0] if transparent else [255, 255, 255, 255]
    ok, buf = cv2.imencode(".png", rgba)
    if not ok:
        raise HTTPException(500, "PNG kodolas sikertelen.")
    return buf.tobytes()


def to_gray(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def resize_cap(img, max_dim):
    h, w = img.shape[:2]
    s = min(1.0, max_dim / max(w, h))
    if s >= 1.0:
        return img
    return cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)


def remove_small(mask, min_area):
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    for i in range(1, num):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            out[labels == i] = 255
    return out


# ------------------------------------------------------------
# 1. VONALRAJZ — AUTO-KUSZOB (ez a lenyeg)
# ------------------------------------------------------------

def lineart_engine(gray: np.ndarray, opts: dict):
    """
    Foto -> vonalas rajz.
    A kuszob a VALASZ ELOSZLASABOL szamol — nem fix ertek.
    """
    sigma = float(opts.get("sigma", 1.2))
    k = float(opts.get("k", 2.0))
    target = float(opts.get("targetCoverage", 0.06))
    min_area = int(opts.get("minArea", 6))

    # Lokalis kontraszt a halvany reszletekhez
    if opts.get("clahe", True):
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)

    g = gray.astype(np.float32) / 255.0
    g1 = cv2.GaussianBlur(g, (0, 0), sigma)
    g2 = cv2.GaussianBlur(g, (0, 0), sigma * k)

    # A vonal-JEL: mennyivel masabb a ket blur.
    # Ez robusztus — nem a nyers XDoG kuszob, hanem az elteres nagysaga.
    response = np.abs(g1 - g2)

    # AUTO-KUSZOB a valasz-eloszlasbol
    flat = response.ravel()
    n = len(flat)
    idx = int(n * target)
    idx = max(0, min(n - 1, idx))
    if idx > 0:
        thr = float(np.partition(flat, n - idx - 1)[n - idx - 1])
    else:
        thr = float(flat.max())

    mask = np.where(response >= thr, 255, 0).astype(np.uint8)
    mask = remove_small(mask, min_area)
    return mask, thr


# ------------------------------------------------------------
# 2. KONTUR — tiszta korvonal
# ------------------------------------------------------------

def contour_engine(gray: np.ndarray, opts: dict):
    lo = int(opts.get("cannyLow", 60))
    hi = int(opts.get("cannyHigh", 160))
    thick = int(opts.get("thick", 1))
    bg_sigma = float(opts.get("bgSigma", 24))

    bg = cv2.GaussianBlur(gray, (0, 0), bg_sigma)
    flat = cv2.divide(gray, bg, scale=128)
    edges = cv2.Canny(flat, lo, hi)
    if thick > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=thick)
    return remove_small(edges, 8), float(hi)


# ------------------------------------------------------------
# 3. TOMEG — sziluett
# ------------------------------------------------------------

def mass_engine(gray: np.ndarray, opts: dict):
    gamma = float(opts.get("gamma", 1.0))
    g = np.power(gray.astype(np.float32) / 255.0, gamma)
    g = (g * 255).astype(np.uint8)
    blur = cv2.medianBlur(g, 5)
    _, mask = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    return remove_small(mask, int(opts.get("minArea", 40))), 0.0


# ------------------------------------------------------------
# 4. HIDAK — a sablon egyben marad
# ------------------------------------------------------------

def add_bridges(mask: np.ndarray, thickness: int = 2, max_len_ratio: float = 0.10):
    h, w = mask.shape
    max_len = int(max(w, h) * max_len_ratio)
    num, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num <= 2:
        return mask, 0

    areas = [(stats[i, cv2.CC_STAT_AREA], i) for i in range(1, num)]
    areas.sort(reverse=True)
    main_label = areas[0][1]
    main_pts = np.column_stack(np.where(labels == main_label))
    if len(main_pts) > 4000:
        main_pts = main_pts[:: len(main_pts) // 4000]

    out = mask.copy()
    bridges = 0
    for area, lbl in areas[1:]:
        if area < 30:
            continue
        cx, cy = centroids[lbl]
        d = (main_pts[:, 0] - cy) ** 2 + (main_pts[:, 1] - cx) ** 2
        i = int(np.argmin(d))
        if float(np.sqrt(d[i])) > max_len:
            continue
        ty, tx = int(main_pts[i, 0]), int(main_pts[i, 1])
        cv2.line(out, (int(cx), int(cy)), (tx, ty), 255, thickness, cv2.LINE_AA)
        bridges += 1
    return out, bridges


# ------------------------------------------------------------
# Vegpontok
# ------------------------------------------------------------

@api.get("/")
def root():
    return {"ok": True, "service": "InkForge Stencil AI", "engine": ENGINE_VERSION}


@api.get("/health")
def health():
    return {
        "ok": True, "engine": ENGINE_VERSION,
        "cuda": CUDA_AVAILABLE, "gpu": GPU_NAME,
        "torch": getattr(torch, "__version__", None) if torch else None,
    }


@api.post("/stencil")
async def stencil(
    image: UploadFile = File(...),
    mode: str = Form("lineart"),
    max_dim: int = Form(2000),
    target_coverage: float = Form(0.06),
    bridges: bool = Form(True),
    bridge_width: int = Form(2),
    transparency: bool = Form(True),
):
    t0 = time.time()
    raw = await image.read()
    if not raw:
        raise HTTPException(400, "Ures fajl.")

    img = resize_cap(decode_image(raw), max(256, min(4096, max_dim)))
    gray = to_gray(img)

    opts = {"targetCoverage": target_coverage, "minArea": 6}
    if mode == "contour":
        mask, thr = contour_engine(gray, opts)
    elif mode == "mass":
        mask, thr = mass_engine(gray, opts)
    else:
        mask, thr = lineart_engine(gray, opts)

    bridges_n = 0
    if bridges:
        mask, bridges_n = add_bridges(mask, thickness=max(1, bridge_width))

    h, w = mask.shape
    coverage = float(np.count_nonzero(mask)) / float(w * h) * 100.0
    num, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    islands = sum(1 for i in range(1, num) if stats[i, cv2.CC_STAT_AREA] >= 30)

    quality = ("tul ritka" if coverage < 2 else
               "tul fedett" if coverage > 40 else
               "hidakkal javithato" if islands > 1 else "hasznalhato")

    return JSONResponse({
        "ok": True, "mode": mode, "engine": ENGINE_VERSION,
        "cuda": CUDA_AVAILABLE,
        "width": w, "height": h,
        "coverage": round(coverage, 2),
        "threshold": round(thr, 5),
        "bridges": bridges_n, "islands": islands,
        "quality": quality,
        "ms": int((time.time() - t0) * 1000),
        "png_base64": base64.b64encode(encode_png(mask, transparency)).decode("ascii"),
    })


@api.post("/stencil/svg")
async def stencil_svg(
    image: UploadFile = File(...),
    mode: str = Form("lineart"),
    width_mm: float = Form(100.0),
    max_dim: int = Form(2000),
    target_coverage: float = Form(0.06),
):
    """Foto -> SVG, mm-pontos meretben."""
    raw = await image.read()
    img = resize_cap(decode_image(raw), max(256, min(4096, max_dim)))
    gray = to_gray(img)

    if mode == "contour":
        mask, _ = contour_engine(gray, {})
    elif mode == "mass":
        mask, _ = mass_engine(gray, {})
    else:
        mask, _ = lineart_engine(gray, {"targetCoverage": target_coverage})

    h, w = mask.shape
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    scale = width_mm / float(w)
    height_mm = h * scale

    parts = []
    for c in contours:
        if cv2.contourArea(c) < 3:
            continue
        pts = c.reshape(-1, 2).astype(np.float64) * scale
        d = "M " + " L ".join("%0.3f,%0.3f" % (p[0], p[1]) for p in pts) + " Z"
        parts.append(d)

    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" width="%0.3fmm" '
        'height="%0.3fmm" viewBox="0 0 %0.3f %0.3f">\n'
        '<rect width="100%%" height="100%%" fill="#ffffff"/>\n'
        '<path fill="#000000" stroke="none" d="%s"/>\n</svg>\n'
    ) % (width_mm, height_mm, width_mm, height_mm, " ".join(parts))

    return JSONResponse({
        "ok": True, "width_mm": round(width_mm, 3),
        "height_mm": round(height_mm, 3), "paths": len(parts), "svg": svg,
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:api", host="0.0.0.0", port=8000)
