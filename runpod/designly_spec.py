"""Structured Designly website artifacts."""
import re

SECTION_LIBRARY = {"hero":"Hero","services":"ServicesGrid","gallery":"Gallery","artists":"TeamGrid","pricing":"PricingTable","testimonials":"Testimonials","faq":"FAQ","booking":"BookingForm","contact":"ContactForm","cta":"CTA","footer":"Footer"}

def _slug(value):
    value = re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")
    return value or "page"

def plan_website(prompt, inp):
    p = str(prompt or "").lower()
    brand = inp.get("brand") or {}
    website_type = "custom"
    for key, label in [("tattoo","tattoo_studio"),("restaurant","restaurant"),("saas","saas"),("portfolio","portfolio"),("ecommerce","ecommerce"),("gaming","gaming"),("agency","agency")]:
        if key in p: website_type = label; break
    pages = ["home"]
    if any(x in p for x in ("gallery","portfolio","tattoo")): pages.append("gallery")
    if any(x in p for x in ("pricing","price","árlista","árak")): pages.append("pricing")
    if any(x in p for x in ("booking","appointment","foglal","időpont")): pages.append("booking")
    if any(x in p for x in ("contact","kapcsolat")): pages.append("contact")
    return {"website_type":website_type,"audience":inp.get("audience") or "general","tone":inp.get("tone") or "premium","brand":brand,"responsive":True,"pages":[{"id":_slug(x),"route":"/" if x=="home" else "/"+x,"goal":x} for x in pages],"global_sections":["navbar","footer"],"asset_requests":[],"constraints":inp.get("constraints") or {}}

def design_system(inp):
    brand = inp.get("brand") or {}
    colors = brand.get("colors") or ["#050505","#FFFFFF","#D4AF37","#00AEEF"]
    return {"version":1,"colors":{"background":colors[0],"text":colors[1],"primary":colors[2] if len(colors)>2 else colors[0],"accent":colors[3] if len(colors)>3 else colors[2],"surface":"#101010","border":"#2A2A2A"},"typography":brand.get("fonts") or {"heading":"Inter","body":"Inter"},"spacing":{"unit":4,"section":96},"radius":{"sm":8,"md":16,"lg":28},"animation":{"enabled":True,"intensity":"subtle"}}

def site_graph(plan, inp):
    p = str(inp.get("prompt") or "").lower()
    sections = ["hero"]
    mapping = [(("service","szolgáltatás"),"services"),(("gallery","portfolio","galéria"),"gallery"),(("artist","artists","művész"),"artists"),(("price","pricing","árlista","árak"),"pricing"),(("testimonial","review","vélemény"),"testimonials"),(("faq",),"faq"),(("booking","appointment","foglal","időpont"),"booking"),(("contact","kapcsolat"),"contact")]
    for needles, section in mapping:
        if any(n in p for n in needles): sections.append(section)
    sections += ["cta","footer"]
    return {"version":1,"pages":[{"route":page["route"],"sections":[{"id":f"{section}-{i+1}","component":SECTION_LIBRARY.get(section,"Section"),"props":{}} for i,section in enumerate(sections)]} for page in plan["pages"]],"responsive":{"mobile":{"stack_grids":True,"collapse_nav":True},"tablet":{"stack_grids":True},"desktop":{"max_width":1280}}}