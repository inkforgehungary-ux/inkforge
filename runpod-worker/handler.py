import base64
import io
from typing import Any

import cv2
import numpy as np
import runpod
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def decode_image(value: str) -> Image.Image:
    if not value:
        raise ValueError("image_base64 is required")
    raw = base64.b64decode(value.split(",", 1)[-1])
    return Image.open(io.BytesIO(raw)).convert("RGB")


def image_b64(image: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def make_stencil(image: Image.Image, threshold_low: int = 55, threshold_high: int = 145,
                 min_component_area: int = 10) -> Image.Image:
    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    edges = cv2.Canny(gray, threshold_low, threshold_high)
    kernel = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)

    out = np.full_like(gray, 255)
    out[edges > 0] = 0

    n, labels, stats, _ = cv2.connectedComponentsWithStats(
        (out == 0).astype(np.uint8), 8
    )
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < min_component_area:
            out[labels == i] = 255

    return Image.fromarray(out, mode="L").convert("RGB")


def contour_paths(stencil: Image.Image, simplify: float = 0.8):
    arr = np.array(stencil.convert("L"))
    binary = (arr < 128).astype(np.uint8) * 255
    contours, _ = cv2.findContours(
        binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE
    )

    paths = []
    for contour in contours:
        if len(contour) < 2:
            continue
        epsilon = max(0.1, float(simplify))
        contour = cv2.approxPolyDP(contour, epsilon, False)
        points = contour[:, 0, :]
        if len(points) >= 2:
            paths.append(points)
    return paths


def make_svg(stencil: Image.Image, stroke_width: float = 1.2) -> bytes:
    w, h = stencil.size
    path_xml = []

    for points in contour_paths(stencil):
        d = f"M {int(points[0][0])},{int(points[0][1])}"
        for x, y in points[1:]:
            d += f" L {int(x)},{int(y)}"
        path_xml.append(
            f'<path d="{d}" fill="none" stroke="#000" '
            f'stroke-width="{stroke_width}" stroke-linecap="round" '
            f'stroke-linejoin="round"/>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}">'
        f'<rect width="100%" height="100%" fill="white"/>'
        + "".join(path_xml)
        + "</svg>"
    )
    return svg.encode("utf-8")


def make_pdf(stencil: Image.Image, stroke_width: float = 0.7) -> bytes:
    w, h = stencil.size
    page_w, page_h = A4
    margin = 28
    scale = min((page_w - 2 * margin) / w, (page_h - 2 * margin) / h)
    ox = (page_w - w * scale) / 2
    oy = (page_h - h * scale) / 2

    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    pdf.setTitle("InkForge Stencil")

    pdf.setLineWidth(stroke_width)

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


def build_outputs(stencil: Image.Image, stroke_width: float = 1.2,
                  simplify: float = 0.8) -> dict:
    return {
        "stencil_png_base64": image_b64(stencil),
        "svg_base64": base64.b64encode(
            make_svg(stencil, stroke_width)
        ).decode("ascii"),
        "pdf_base64": base64.b64encode(
            make_pdf(stencil, max(0.1, stroke_width * 0.6))
        ).decode("ascii"),
        "width": stencil.width,
        "height": stencil.height,
        "format": "png+svg+pdf",
    }


def handler(job: dict) -> dict:
    inp: dict[str, Any] = job.get("input", job)

    mode = str(inp.get("mode", "image_to_stencil"))
    if mode not in ("image_to_stencil", "stencil", "export"):
        raise ValueError(
            "Stencil worker accepts image_to_stencil, stencil or export mode."
        )

    source = decode_image(inp.get("image_base64", ""))

    max_side = int(inp.get("max_side", 2048))
    if max(source.size) > max_side:
        source.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    threshold_low = int(inp.get("threshold_low", 55))
    threshold_high = int(inp.get("threshold_high", 145))
    min_area = int(inp.get("min_component_area", 10))
    stroke_width = float(inp.get("stroke_width", 1.2))
    simplify = float(inp.get("simplify", 0.8))

    stencil = make_stencil(
        source,
        threshold_low=threshold_low,
        threshold_high=threshold_high,
        min_component_area=min_area,
    )

    out = build_outputs(stencil, stroke_width, simplify)
    out["image_base64"] = out["stencil_png_base64"]
    out["generated_png_base64"] = out["stencil_png_base64"]
    return out


runpod.serverless.start({"handler": handler})
