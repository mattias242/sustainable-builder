import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { sep } from 'node:path';
import { OG_SIZE, ogLines, ogPage, ogTargets } from '../tools/og-page.mjs';
// The link preview (Open Graph / Twitter card, 1200×630) of any place: its title and its taglines laid over a picture of the place. tools/og-image.mjs puts the page in a browser and takes the picture;
// what needs no browser lives in tools/og-page.mjs – which taglines a place has (ogLines), the page itself (ogPage), where the picture is written (ogTargets) – and is tested here on plain values.
// The places are small objects made for the test, in the shape of a place's vision/config.js ({title, sv:{tagline,…}, en:{tagline,…}}, and it:{tagline,…} for a place with Italian, like Venice): the real configs
// are not imported, as this suite runs for several places. The page is read the way a browser shows it (the readers below), without starting one.

const SV='Ett sekel framåt',IT='Un secolo avanti',EN='A century ahead';
const IMAGE='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ+/Zm9vYmFy==';          // a picture as the tool hands it over – a data URL, here with all three marks of base64: / + =
const OTHER_IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const MOLNDAL={title:'MÖLNDAL 2126',sv:{name:'Mölndal',centre:'Mölndals innerstad',tagline:'Ett sekel framåt – en hållbar vision'},en:{name:'Mölndal',centre:'central Mölndal',tagline:'A century ahead – a sustainable vision'}};
const KALMAR={title:'KALMAR 2126',sv:{name:'Kalmar',centre:'Kvarnholmen',tagline:'Ett sekel framåt – en hållbar vision'},en:{name:'Kalmar',centre:'Kvarnholmen',tagline:'A century ahead – a sustainable vision'}};
const NORRBY={title:'NORRBY 2126',sv:{name:'Norrby',centre:'Norrby torg',tagline:'Hundra år vid älven'},en:{name:'Norrby',centre:'Norrby square',tagline:'A hundred years by the river'}};   // a place that does not exist: nothing about it is in the engine
const VENEZIA={title:'VENEZIA 2126',                                                                                  // the keys in the file's own order, sv, en, it – while the page says sv, it, en
  sv:{name:'Venedig',centre:'Rialto',tagline:'Ett sekel framåt i lagunen – en hållbar vision'},
  en:{name:'Venice',centre:'Rialto',tagline:'A century ahead in the lagoon – a sustainable vision'},
  it:{name:'Venezia',centre:'Rialto',tagline:'Un secolo avanti nella laguna – una visione sostenibile'}};
const PLACES=[MOLNDAL,KALMAR,NORRBY,VENEZIA];
const nameOf=city=>city.title.replace(/\s*\d+$/,'');                                                               // 'MÖLNDAL 2126' → 'MÖLNDAL'
const pageOf=city=>ogPage({title:city.title,lines:ogLines(city),image:IMAGE});                                    // what og-image.mjs does with a place's config

// Reading a page as a browser shows it: the text of an element, its entities decoded and its whitespace collapsed – and no markup allowed where there should be text
const ENTITY={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const decode=text=>text.replace(/&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi,(_,hex,dec,name)=>name?ENTITY[name.toLowerCase()]:String.fromCodePoint(hex?parseInt(hex,16):Number(dec)));
const shown=inner=>{assert.doesNotMatch(inner,/[<>]/,`markup where there should be text: ${inner}`);return decode(inner.replace(/\s+/g,' ').trim());};
const textsIn=(html,tag)=>[...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`,'gi'))].map(match=>shown(match[1]));
const titleOf=html=>{const titles=textsIn(html,'h1');assert.equal(titles.length,1,`${titles.length} titles (h1) on the page, not one`);return titles[0];};
const linesOf=html=>textsIn(html,'p');
const elementsIn=html=>[...html.matchAll(/<([a-z][\w-]*)/gi)].map(match=>match[1].toLowerCase());
const backgrounds=html=>[...html.matchAll(/background(?:-image)?\s*:[^;{}]*?url\(\s*(['"]?)(.*?)\1\s*\)/gi)].map(match=>match[2]);

// 1. Given a place's config · then its page carries the place's own title and its taglines, Swedish first – and no other place's name
for(const city of [MOLNDAL,KALMAR,NORRBY]){
  test(`${city.title}: the page carries the title and the Swedish and English taglines, Swedish first`,()=>{
    const html=pageOf(city);
    assert.equal(titleOf(html),city.title);
    assert.deepEqual(linesOf(html),[city.sv.tagline,city.en.tagline]);
  });
}
for(const city of [MOLNDAL,NORRBY,VENEZIA]){
  test(`${city.title}: the page names no other place – nothing is left of the old Kalmar image`,()=>{
    const page=pageOf(city).toLowerCase();
    assert.deepEqual(PLACES.filter(other=>other!==city).map(nameOf).filter(name=>page.includes(name.toLowerCase())),[]);
  });
}

// 2. Given a place with a third language · then its tagline stands there too, in the order Swedish, Italian, English; a language the place lacks is skipped, and a tagline two languages share is said once
test('a place with Italian too (Venice): the page carries three taglines – Swedish, Italian, English – though its config lists English before Italian',()=>{
  const html=pageOf(VENEZIA);
  assert.equal(titleOf(html),'VENEZIA 2126');
  assert.deepEqual(linesOf(html),[VENEZIA.sv.tagline,VENEZIA.it.tagline,VENEZIA.en.tagline]);
});
const lang=tagline=>({name:'Namn',centre:'Torget',tagline});                  // one language of a place: its tagline among other texts that must not be taken for it
const TAGLINES=[
  ['a place with Swedish and English says Swedish first, then English',                          {sv:lang(SV),en:lang(EN)},                         [SV,EN]],
  ['a place says Swedish, Italian, English whatever order its config lists the languages in',    {en:lang(EN),it:lang(IT),sv:lang(SV)},               [SV,IT,EN]],
  ['a place without a Swedish tagline starts with the next language',                            {it:lang(IT),en:lang(EN)},                         [IT,EN]],
  ['a place without an English tagline ends with the language before',                           {sv:lang(SV),it:lang(IT)},                         [SV,IT]],
  ['a place with English only says English only',                                                {en:lang(EN)},                                     [EN]],
  ['a language the place has but without a tagline is skipped',                                  {sv:lang(SV),it:{name:'Venezia'},en:lang(EN)},     [SV,EN]],
  ['a language with an empty tagline is skipped',                                                {sv:lang(SV),it:lang(''),en:lang(EN)},             [SV,EN]],
  ['a place with no tagline in any language has no lines',                                       {title:'TOMT 2126'},                               []],
  ['two languages with the same tagline say it once',                                            {sv:lang('Venezia 2126'),en:lang('Venezia 2126')}, ['Venezia 2126']],
  ['Swedish and Italian with the same tagline say it once, then English',                        {sv:lang('Venezia'),it:lang('Venezia'),en:lang(EN)}, ['Venezia',EN]],
  ['Italian and English with the same tagline say it once, after Swedish',                       {sv:lang(SV),it:lang('Venice'),en:lang('Venice')}, [SV,'Venice']],
  ['Swedish and English with the same tagline say it once, even with Italian between them',      {sv:lang('Venezia'),it:lang(IT),en:lang('Venezia')}, ['Venezia',IT]],
];
for(const [what,city,expected] of TAGLINES)test(what,()=>assert.deepEqual(ogLines(city),expected));
test('the page has one line under the title for each tagline, in the order they are given',()=>{
  const lines=['Tvåan','Ettan','Trean'];                                       // neither sorted nor reversed
  assert.deepEqual(linesOf(ogPage({title:'NORRBY 2126',lines,image:IMAGE})),lines);
});
test('a page without taglines has the title and no empty line',()=>{
  const html=ogPage({title:'NORRBY 2126',lines:[],image:IMAGE});
  assert.equal(titleOf(html),'NORRBY 2126');
  assert.deepEqual(linesOf(html),[]);
});

// 3. Given a title or a tagline with characters HTML reserves · then they are shown as text, never taken for markup
const RESERVED=[['an ampersand','&'],['a less-than sign','<'],['a greater-than sign','>'],['a double quote','"']];
for(const [what,mark] of RESERVED){
  test(`a title and a tagline with ${what} are shown as typed`,()=>{
    const title=`NORD ${mark} SYD 2126`,lines=[`Hundra ${mark} år`,`A hundred ${mark} years`];
    const html=ogPage({title,lines,image:IMAGE});
    assert.equal(titleOf(html),title);
    assert.deepEqual(linesOf(html),lines);
  });
}
test('a title and a tagline that look like markup are shown as text: not one element is added to the page',()=>{
  const plain=ogPage({title:'NORD SYD 2126',lines:['Hundra år'],image:IMAGE});
  const title='NORD <b>SYD</b></h1><h1>FALSK</h1> 2126',lines=['Hundra </p><p>år <img src=x>'];
  const html=ogPage({title,lines,image:IMAGE});
  assert.deepEqual(elementsIn(html),elementsIn(plain),'the text turned into elements');
  assert.equal(titleOf(html),title);
  assert.deepEqual(linesOf(html),lines);
});
test('text that already looks like an entity is shown as typed: "&amp;" stays five characters',()=>{
  const title='TORG &amp; HAMN &lt;3 2126',lines=['Fisk &gt; kött &quot;allt&quot;'];
  const html=ogPage({title,lines,image:IMAGE});
  assert.equal(titleOf(html),title);
  assert.deepEqual(linesOf(html),lines);
});

// 4. The page is 1200 × 630 and has the picture it is given as its background
test('a link preview is 1200 × 630',()=>assert.deepEqual(OG_SIZE,{width:1200,height:630}));
test('the page is 1200 pixels wide and 630 high',()=>{
  const html=pageOf(MOLNDAL);
  assert.match(html,/width:\s*1200px/,'the page is not 1200px wide');
  assert.match(html,/height:\s*630px/,'the page is not 630px high');
});
test('the picture it is given is the background of the page, whichever picture it is',()=>{
  for(const image of [IMAGE,OTHER_IMAGE])assert.ok(backgrounds(ogPage({title:'NORRBY 2126',lines:[SV],image})).includes(image),`${image} is not the url(…) of a background`);
});
test('the page says it is UTF-8, so the Ö, Å and Ä of a place name come out right',()=>{
  assert.match(pageOf(MOLNDAL),/<meta[^>]*charset\s*=\s*["']?utf-8/i);
});

// 5. Given the place's folder · then the picture is written to media/og.jpg (the source) and pack/og.jpg (what the site serves), in that order
const slashes=path=>path.split(sep).join('/');                                // the same on every system
for(const dir of ['cities/molndal','/work/places/norrby']){
  test(`the picture of ${dir} goes to media/og.jpg first, then to pack/og.jpg`,()=>{
    assert.deepEqual(ogTargets(dir).map(slashes),[`${dir}/media/og.jpg`,`${dir}/pack/og.jpg`]);
  });
}

// 6. Plain values in, plain values out: nothing the functions are given is changed, the same place gives the same page, and the module imports only what comes with Node – no browser, no engine, no city
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
test('reading a place and laying out its page change nothing they are given, and give the same again',()=>{
  const city=deepFreeze(structuredClone(VENEZIA)),lines=deepFreeze([...ogLines(city)]);
  assert.deepEqual(ogLines(city),ogLines(city));
  assert.equal(ogPage({title:city.title,lines,image:IMAGE}),ogPage({title:city.title,lines,image:IMAGE}));
});
test('the module imports only modules that come with Node',()=>{
  const code=readFileSync(new URL('../tools/og-page.mjs',import.meta.url),'utf8');
  const imported=[...code.matchAll(/(?:^|[;}])\s*(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;}])\s*import\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/gm)].map(match=>match[1]??match[2]??match[3]);   // import … from 'x' · import 'x' · import('x'), at the start of a line or of a statement
  assert.deepEqual(imported.filter(name=>!builtinModules.includes(name.replace(/^node:/,''))),[]);
});
