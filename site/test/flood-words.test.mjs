import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { floodWords } from '../src/flood-words.js';
// The words of the flood box – the title of the "100-year storm" tile and the sentence the box shows in a storm's year (src/ui/app.js, showStorm) – for the kind of
// water a town lies on (FLOOD.kind: 'sea', which is also what a place that names no kind means, 'lake' or 'river'). Every formulation is a triple [sv, en, it];
// levels and protection arrive already formatted ('3,80'), so the module counts nothing. The sea and the lake say what the engine has always said, word for word;
// the river is new: it has a flow, banks and a channel – and no wall, quay, beach or jetty. Plain values only: no city, no map, no browser.
const LANGS=['Swedish','English','Italian'];
const PARTS=['hide','show','head','holds','over','below'];
const WHAT={hide:'the tile title while the 3D preview is on',show:'the tile title while it is off',head:'the headline of the year',holds:'the sentence when the protection holds',over:'the sentence when the water passes the edge but the streets stay dry',below:'the sentence when the water stays below the edge'};
const SAMPLES=[{year:2090,lvl:'2,10',prot:'2,6'},{year:2126,lvl:'1,60',prot:'4,2'}];   // as the box formats them (decimal comma); two samples, so no number can be hard-coded
const TOKENS={year:2077,lvl:'7,77',prot:'8,88'};                                     // in no fixed phrase: finding them in a text proves they were passed through
const say={hide:w=>w.hide,show:w=>w.show,head:(w,{year})=>w.head(year),holds:(w,{lvl,prot})=>w.holds(lvl,prot),over:(w,{lvl})=>w.over(lvl),below:(w,{lvl})=>w.below(lvl)};

// What each kind says, character by character. The sea's and the lake's are today's (app.js 300–403); the river's English has the typographic apostrophe ’ (code point U+2019), the Italian everywhere the plain one (U+0027).
const SEA=({year,lvl,prot})=>({
  hide:['Klicka för att dölja stormen','Click to hide the storm',"Clicca per nascondere l'acqua alta"],
  show:['Klicka för att se en 100-årsstorm i 3D just det här året','Click to see a 100-year storm in 3D in this very year',"Clicca per vedere in 3D un'acqua alta centenaria proprio in quest'anno"],
  head:[`100-årsstorm år ${year}`,`100-year storm in ${year}`,`Acqua alta centenaria nel ${year}`],
  holds:[`vattnet når ${lvl} m – vallen på ${prot} m håller.`,`the water reaches ${lvl} m – the ${prot} m flood wall holds.`,`l'acqua raggiunge ${lvl} m – l'argine di ${prot} m tiene.`],
  over:[`vattnet når ${lvl} m – kajerna spolas över, men gatorna klarar sig.`,`the water reaches ${lvl} m – the quays are washed over, but the streets stay dry.`,`l'acqua raggiunge ${lvl} m – le banchine vengono sommerse, ma le strade restano all'asciutto.`],
  below:[`vattnet når ${lvl} m – under kajkanten.`,`the water reaches ${lvl} m – below the quay edge.`,`l'acqua raggiunge ${lvl} m – sotto il bordo delle banchine.`]
});
const LAKE=({year,lvl,prot})=>({
  hide:['Klicka för att dölja högvattnet','Click to hide the high water','Clicca per nascondere la piena'],
  show:['Klicka för att se ett 100-årshögvatten i 3D just det här året','Click to see a 100-year high water in 3D in this very year',"Clicca per vedere in 3D una piena centenaria proprio in quest'anno"],
  head:[`100-årshögvatten år ${year}`,`100-year high water in ${year}`,`Piena centenaria nel ${year}`],
  holds:[`vattnet når ${lvl} m – det höjda strandskyddet på ${prot} m håller.`,`the water reaches ${lvl} m – the raised shore protection at ${prot} m holds.`,`l'acqua raggiunge ${lvl} m – la difesa delle rive, rialzata a ${prot} m, tiene.`],
  over:[`vattnet når ${lvl} m – stränder och bryggor står under vatten, men gatorna klarar sig.`,`the water reaches ${lvl} m – beaches and jetties are under water, but the streets stay dry.`,`l'acqua raggiunge ${lvl} m – spiagge e pontili sono sott'acqua, ma le strade restano all'asciutto.`],
  below:[`vattnet når ${lvl} m – under strandkanten.`,`the water reaches ${lvl} m – below the shoreline.`,`l'acqua raggiunge ${lvl} m – sotto il livello della riva.`]
});
const RIVER=({year,lvl,prot})=>({
  hide:['Klicka för att dölja högflödet','Click to hide the high flow','Clicca per nascondere la piena'],
  show:['Klicka för att se ett 100-årsflöde i 3D just det här året','Click to see a 100-year flow in 3D in this very year',"Clicca per vedere in 3D una piena centenaria proprio in quest'anno"],
  head:[`100-årsflöde år ${year}`,`100-year flow in ${year}`,`Piena centenaria nel ${year}`],
  holds:[`vattnet når ${lvl} m – åns utrymme och skydd klarar ${prot} m.`,`the water reaches ${lvl} m – the river’s room and protection hold to ${prot} m.`,`l'acqua raggiunge ${lvl} m – lo spazio e le difese del fiume reggono fino a ${prot} m.`],
  over:[`vattnet når ${lvl} m – ån går över sina kanter, men gatorna klarar sig.`,`the water reaches ${lvl} m – the river tops its banks, but the streets stay dry.`,`l'acqua raggiunge ${lvl} m – il fiume supera le sponde, ma le strade restano all'asciutto.`],
  below:[`vattnet når ${lvl} m – inom åns fåra.`,`the water reaches ${lvl} m – within the river’s channel.`,`l'acqua raggiunge ${lvl} m – entro l'alveo del fiume.`]
});

// 1–3. Given a kind of water · then the box speaks its words: the sea's (also for a place that names no kind) and the lake's exactly as before, the river's new
const KINDS=[['a town by the sea','sea',SEA],['a town that names no kind of water (the sea, as before)',undefined,SEA],['a town by a lake','lake',LAKE],['a town on a river','river',RIVER]];
for(const [who,kind,expected] of KINDS){
  for(const part of PARTS){
    test(`${who}: ${WHAT[part]}, word for word`,()=>{
      assert.deepEqual(SAMPLES.map(s=>say[part](floodWords(kind),s)),SAMPLES.map(s=>expected(s)[part]));
    });
  }
}

// 3. A river has a flow, banks and a channel – and no wall, quay, beach or jetty. Stems are checked, not whole words: there is no 'strand' in 'stränder', no 'jetty' in 'jetties'.
const SEA_AND_LAKE_WORDS=[/vall|kaj|strand|stränd|brygg/i,/wall|quay|beach|jett|shore/i,/argin|banchin|spiagg|pontil|\briv[ae]\b/i];
for(const [i,lang] of LANGS.entries()){
  test(`a town on a river names no wall, quay, beach, jetty or shore in ${lang}`,()=>{
    const texts=PARTS.flatMap(part=>SAMPLES.map(s=>say[part](floodWords('river'),s)[i]));
    assert.deepEqual(texts.filter(text=>SEA_AND_LAKE_WORDS[i].test(text)),[]);
  });
}
test('a town on a river calls the event a flow: the titles and the headline say flöde / flow',()=>{
  const w=floodWords('river');
  for(const triple of [w.hide,w.show,w.head(2090)]){assert.match(triple[0],/flöde/);assert.match(triple[1],/flow/);}
});
test('a town on a river says the river tops its banks when the water passes the edge',()=>{
  const [sv,en]=floodWords('river').over('1,60');assert.match(sv,/kanter/);assert.match(en,/banks/);
});
test('a town on a river says the water is within the channel when it stays below the edge',()=>{
  const [sv,en]=floodWords('river').below('1,20');assert.match(sv,/fåra/);assert.match(en,/channel/);
});

// 4. Inland water is a lake or a river, never the sea
for(const [who,kind,inland] of [['by the sea','sea',false],['that names no kind of water',undefined,false],['by a lake','lake',true],['on a river','river',true]]){
  test(`a town ${who} ${inland?'lies':'does not lie'} on inland water`,()=>assert.equal(floodWords(kind).inland,inland));
}

// 5. Every formulation is a triple [sv, en, it], and the year, the level and the protection that are passed in stand in all three
const isTriple=x=>Array.isArray(x)&&x.length===3&&x.every(s=>typeof s==='string'&&s.trim()!=='');
for(const [who,kind] of KINDS){
  test(`${who}: every formulation is a triple of Swedish, English and Italian text`,()=>{
    const w=floodWords(kind);
    for(const part of PARTS){const got=say[part](w,SAMPLES[0]);assert.ok(isTriple(got),`${part} is not [sv, en, it]: ${JSON.stringify(got)}`);}
  });
  test(`${who}: the year, the water level and the protection stand in Swedish, English and Italian alike`,()=>{
    const w=floodWords(kind),{year,lvl,prot}=TOKENS;
    for(const [what,triple,tokens] of [['headline',w.head(year),[year]],['holds',w.holds(lvl,prot),[lvl,prot]],['over',w.over(lvl),[lvl]],['below',w.below(lvl),[lvl]]]){
      for(const [i,lang] of LANGS.entries())for(const token of tokens)assert.ok(triple[i]?.includes(String(token)),`${what} in ${lang} lacks ${token}: ${triple[i]}`);
    }
  });
}

// 6. A pure module: it imports nothing, so the engine and these tests use it with no city, no map and no browser
test('the module imports nothing',()=>{
  const code=readFileSync(new URL('../src/flood-words.js',import.meta.url),'utf8');
  assert.doesNotMatch(code,/^\s*import[\s{*'"]|\bimport\s*\(/m);
});

// 7. The move loses no phrase: the Swedish words of the sea and of the lake stand in src/ui/app.js today and in src/flood-words.js once they have moved there
const SOURCE=['../src/ui/app.js','../src/flood-words.js'].map(f=>readFileSync(new URL(f,import.meta.url),'utf8')).join('\n');
const lost=phrases=>phrases.filter(p=>!SOURCE.includes(p));
test('the Swedish phrases of the sea are in app.js or flood-words.js',()=>assert.deepEqual(lost(['Klicka för att dölja stormen','Klicka för att se en 100-årsstorm i 3D just det här året','100-årsstorm år','vallen på','kajerna spolas över, men gatorna klarar sig.','under kajkanten.']),[]));
test('the Swedish phrases of the lake are in app.js or flood-words.js',()=>assert.deepEqual(lost(['Klicka för att dölja högvattnet','Klicka för att se ett 100-årshögvatten i 3D just det här året','100-årshögvatten år','det höjda strandskyddet på','stränder och bryggor står under vatten, men gatorna klarar sig.','under strandkanten.']),[]));
