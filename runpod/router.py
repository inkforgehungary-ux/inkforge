"""Unified RunPod router for InkForge + Designly."""
from designly_engine import DESIGNLY_MODES, handle_designly


def route(
    inp,
    *,
    generate_text,
    generate_img2img,
    decode_image,
    prepare_image,
    encode_png,
):
    mode = str((inp or {}).get("mode") or "").strip().lower()
    if mode in DESIGNLY_MODES or mode.startswith("designly."):
        return handle_designly(
            inp,
            generate_text=generate_text,
            generate_img2img=generate_img2img,
            decode_image=decode_image,
            prepare_image=prepare_image,
            encode_png=encode_png,
        )
    return None
