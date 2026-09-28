"""Deterministic Designly Next.js project generator."""
from __future__ import annotations
import json, re

def _slug(v): return re.sub(r"[^a-z0-9]+","-",str(v).lower()).strip("-") or "designly-site"

def _json(v): return json.dumps(v, ensure_ascii=False, indent=2)

def generate_project(artifacts, project=None):
    plan=artifacts["website_plan"]; ds=artifacts["design_system"]; graph=artifacts["site_graph"]
    name=_slug((project or {}).get("name") or plan.get("website_type") or "designly-site")
    files={}
    files["package.json"]=_json({"name":name,"private":True,"version":"0.1.0","scripts":{"dev":"next dev","build":"next build","start":"next start"},"dependencies":{"next":"latest","react":"latest","react-dom":"latest"}})
    files["next.config.mjs"]="/** @type {import("next").NextConfig} */\nconst nextConfig={reactStrictMode:true};\nexport default nextConfig;\n"
    files["app/layout.jsx"]="import "./globals.css";\nexport const metadata={title:"Designly Website",description:"Generated with Designly Studio"};\nexport default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}\n"
    files["app/globals.css"]=f"@import url(https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap);\n:root{{--bg:{ds["colors"]["background"]};--text:{ds["colors"]["text"]};--primary:{ds["colors"]["primary"]};--accent:{ds["colors"]["accent"]};--surface:{ds["colors"]["surface"]};--border:{ds["colors"]["border"]};}}\n*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif}} a{{color:inherit;text-decoration:none}} .wrap{{max-width:1280px;margin:auto;padding:0 24px}} .section{{padding:96px 0}} .grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}} @media(max-width:800px){{.grid{{grid-template-columns:1fr}}.section{{padding:64px 0}}}}\n"
    hero=next(s for s in graph["pages"][0]["sections"] if s["component"]=="Hero")
    title=(plan.get("brand") or {}).get("name") or plan.get("website_type","Premium Website").replace("_"," ").title()
    body=f"""export default function Home(){{return <main><nav className="wrap" style={{{{paddingTop:24,paddingBottom:24,display:"flex",justifyContent:"space-between"}}}}><strong>{title}</strong><a href="#contact">Contact</a></nav><section className="section"><div className="wrap"><p style={{{{color:"var(--accent)",fontWeight:700}}}}>DESIGNLY STUDIO</p><h1 style={{{{fontSize:"clamp(48px,8vw,96px)",lineHeight:1,margin:"16px 0"}}}}> {title}</h1><p style={{{{fontSize:22,maxWidth:720,lineHeight:1.6}}}}>A premium responsive website generated from your Designly project specification.</p><a href="#contact" style={{{{display:"inline-block",marginTop:24,padding:"14px 22px",background:"var(--primary)",borderRadius:12}}}}>Get started</a></div></section><section className="section"><div className="wrap grid">{json.dumps([s["component"] for s in graph["pages"][0]["sections"] if s["component"] not in ("Hero","Footer")])}</div></section><section id="contact" className="section"><div className="wrap"><h2>Contact</h2><p>Connect your form, booking and CMS integrations in Designly.</p></div></section></main>}}\n"""
    files["app/page.jsx"]=body
    files["README.md"]="# Designly generated project\n\nGenerated from structured Designly artifacts. Run `npm install && npm run dev`.\n"
    return {"project_name":name,"files":[{"path":k,"content":v} for k,v in files.items()],"entry":"app/page.jsx","build":{"command":"npm run build","output":"Next.js production build"}}