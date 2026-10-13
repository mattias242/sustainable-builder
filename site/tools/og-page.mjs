// The link preview (Open Graph / Twitter card, 1200×630) of any place: its title and its taglines over a
// picture of its city. What needs no browser is here – which taglines a place has, the page itself, where the
// picture is written; tools/og-image.mjs puts the page in a browser and takes the picture.
import { join } from 'node:path';

export const OG_SIZE={width:1200,height:630};
// The place's taglines (vision/config.js: sv.tagline, it.tagline, en.tagline): its own languages first,
// English last. A language the place lacks is skipped, and a tagline two languages share is said once.
export const ogLines=city=>[...new Set(['sv','it','en'].map(lang=>city?.[lang]?.tagline).filter(Boolean))];
// Text shown as text: the ampersand first, or the others would be escaped twice.
const text=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// The page: the picture (a URL, usually a data URL) fills it under a shade from the top, the splash screen's
// title and a line per tagline stand in white on the shade.
export function ogPage({title,lines=[],image}){
  const {width,height}=OG_SIZE;
  return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.bg{position:absolute;inset:0;background:url(${image}) center 62%/cover}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,22,36,.7) 0%,rgba(8,22,36,.36) 32%,rgba(8,22,36,0) 50%)}
.t{position:absolute;left:64px;top:52px;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.4)}
h1{margin:0;font-size:76px;letter-spacing:.14em;font-weight:800;line-height:1}
p{margin:14px 0 0;font-size:30px;color:rgba(255,255,255,.92)}
p+p{margin-top:6px;font-size:24px;color:rgba(255,255,255,.7)}
</style><div class="bg"></div><div class="shade"></div>
<div class="t"><h1>${text(title)}</h1>${lines.map(line=>`<p>${text(line)}</p>`).join('')}</div>`;
}
// Where the picture is written, in the place's folder (cities/<slug>): media/og.jpg is the source, pack/og.jpg
// what the page links to (city/og.jpg).
export const ogTargets=cityDir=>[join(cityDir,'media','og.jpg'),join(cityDir,'pack','og.jpg')];
