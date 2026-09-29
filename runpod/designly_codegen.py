"""Deterministic Designly Next.js project generator."""
from __future__ import annotations
import json, re

def _slug(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v).lower()).strip("-") or "designly-site"

def _json(v):
    return json.dumps(v, ensure_ascii=False, indent=2)

def generate_project(artifacts, project=None):
    project = project or {}
    plan = artifacts["website_plan"]
    ds = artifacts["design_system"]
    graph = artifacts["site_graph"]
    name = _slug(project.get("name") or plan.get("website_type") or "designly-site")
    title = (plan.get("brand") or {}).get("name") or plan.get("website_type", "Premium Website").replace("_", " ").title()
    colors = ds["colors"]
    components = [s["component"] for s in graph["pages"][0]["sections"] if s["component"] not in ("Hero", "Footer")]
    files = {}
    files["package.json"] = _json({"name": name, "private": True, "version": "0.1.0", "scripts": {"dev": "next dev", "build": "next build", "start": "next start"}, "dependencies": {"next": "latest", "react": "latest", "react-dom": "latest"}})
    files["next.config.mjs"] = """const nextConfig = { reactStrictMode: true };
export default nextConfig;
"""
    files["app/layout.jsx"] = """import "./globals.css";
export const metadata = { title: "Designly Website", description: "Generated with Designly Studio" };
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
"""
    files["app/globals.css"] = f""":root {{ --bg:{colors["background"]}; --text:{colors["text"]}; --primary:{colors["primary"]}; --accent:{colors["accent"]}; --surface:{colors["surface"]}; --border:{colors["border"]}; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--text); font-family:Inter,system-ui,sans-serif; }}
a {{ color:inherit; text-decoration:none; }}
.wrap {{ max-width:1280px; margin:auto; padding:0 24px; }}
.section {{ padding:96px 0; }}
.grid {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }}
@media(max-width:800px) {{ .grid {{ grid-template-columns:1fr; }} .section {{ padding:64px 0; }} }}
"""
    component_list = "".join(f"<li>{c}</li>" for c in components)
    files["app/page.jsx"] = f"""export default function Home() {{
  return (
    <main>
      <nav className="wrap nav"><strong>{title}</strong><a href="#contact">Contact</a></nav>
      <section className="section"><div className="wrap">
        <p className="accent">DESIGNLY STUDIO</p>
        <h1>{title}</h1>
        <p className="lead">A premium responsive website generated from your Designly project specification.</p>
        <a className="button" href="#contact">Get started</a>
      </div></section>
      <section className="section"><div className="wrap"><h2>Sections</h2><ul>{component_list}</ul></div></section>
      <section id="contact" className="section"><div className="wrap"><h2>Contact</h2><p>Connect your form, booking and CMS integrations in Designly.</p></div></section>
    </main>
  );
}}
"""
    files["app/globals.css"] += """.nav{display:flex;justify-content:space-between;padding-top:24px;padding-bottom:24px}.accent{color:var(--accent);font-weight:700;letter-spacing:.12em}.lead{font-size:22px;max-width:720px;line-height:1.6}.button{display:inline-block;margin-top:24px;padding:14px 22px;background:var(--primary);color:var(--bg);border-radius:12px}h1{font-size:clamp(48px,8vw,96px);line-height:1;margin:16px 0}"""
    files["README.md"] = "# Designly generated project\n\nRun `npm install && npm run dev`.\n"
    return {"project_name": name, "files": [{"path": k, "content": v} for k, v in files.items()], "entry": "app/page.jsx", "build": {"command": "npm run build", "output": "Next.js production build"}}