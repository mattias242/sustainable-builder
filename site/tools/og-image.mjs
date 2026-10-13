// The link preview (Open Graph / Twitter card) of the place: 1200×630, a picture of its city with the splash
// screen's title and taglines (the place's vision/config.js) – written to cities/<slug>/media/og.jpg (the
// source) and cities/<slug>/pack/og.jpg (what the page links to as city/og.jpg).
//   CITY=<slug> node --import ./test/register.mjs tools/og-image.mjs [picture.jpg]
// The picture: any frame of the place's city – one of `python3 sustainable.py look <slug>`'s, or a frame of
// its film. Without an argument it is the film's poster (pack/film/poster.jpg).
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { CITY } from '@city/config.js';
import { cityOf } from '../city.config.mjs';
import { OG_SIZE, ogLines, ogPage, ogTargets } from './og-page.mjs';

const place=cityOf();
const frame=process.argv[2]?resolve(process.argv[2]):resolve(place.pack,'film','poster.jpg');
if(!existsSync(frame)){
  console.error(`No picture at ${frame}: give one (a frame from "python3 sustainable.py look ${place.slug}") or render the film first.`);
  process.exit(1);
}
const mime={'.png':'image/png','.webp':'image/webp'}[extname(frame).toLowerCase()]||'image/jpeg';
const image=`data:${mime};base64,${readFileSync(frame).toString('base64')}`;
const browser=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`}).catch(()=>chromium.launch());
const page=await browser.newPage({viewport:OG_SIZE});
await page.setContent(ogPage({title:CITY.title,lines:ogLines(CITY),image}));await page.waitForLoadState('load');
for(const path of ogTargets(dirname(place.pack))){
  mkdirSync(dirname(path),{recursive:true});
  await page.screenshot({path,type:'jpeg',quality:86});
  console.log(path);
}
await browser.close();
