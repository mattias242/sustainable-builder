import test from 'node:test';
import assert from 'node:assert/strict';
import { LAND } from '../src/landuse.js';
import { siteCells, lotTurn } from '../src/sites.js';
// Building land a place points out itself (CITY.housingSites: polygons [[x,z],…] in model metres – Mölndal's Forsåker, the closed
// paper mill that becomes a district): its open and paved ground is where new blocks may rise, unless something already stands there.
// Stand-ins for the land scan and the planning are plain objects – no map on disk, no 3D scene.
const cellsOf=(kind,...xz)=>xz.map(([x,z])=>({kind,x,z,y:2}));
const landOf=(...groups)=>{const all=groups.flat();return {cells:kind=>all.filter(c=>c.kind===kind).map(({x,z,y})=>({x,z,y}))};};
const within=(r,x,z,margin)=>x>=r.minX-margin&&x<=r.maxX+margin&&z>=r.minZ-margin&&z<=r.maxZ+margin;
const planningOf=({houses=[],roads=[]}={})=>({
  buildingAt:(x,z,margin=0)=>houses.find(h=>within(h,x,z,margin))??null,
  roadAt:(x,z,margin=1)=>roads.find(r=>within(r,x,z,margin))??null
});
const footprint=(x,z)=>({minX:x-2,maxX:x+2,minZ:z-2,maxZ:z+2});   // a house on the 4 m cell centred at (x,z)
const box=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const site=()=>box(-20,-20,20,20);                                // 40 × 40 m round the origin; a fresh polygon for every test
const spots=cells=>cells.map(c=>[c.x,c.z]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
const plotsOf=(land,planning,sites)=>spots(siteCells(land,planning,sites));

// 1. Building land the place points out becomes plots
for(const [what,kind] of [['open ground',LAND.LAND],['paved ground or gravel',LAND.PAVED]]){
  test(`${what} inside a site becomes a plot, ${what} outside does not`,()=>{
    const inside=cellsOf(kind,[-10,-10],[-10,10],[10,-10],[10,10]),outside=cellsOf(kind,[30,0],[-30,0],[0,30],[0,-30]);
    assert.deepEqual(plotsOf(landOf(inside,outside),planningOf(),[site()]),spots(inside));
  });
}
test('every plot is marked site:true and keeps its position and height',()=>{
  const land=landOf([{kind:LAND.LAND,x:10,z:-10,y:2.4},{kind:LAND.PAVED,x:-10,z:10,y:3.1}]);
  const plots=siteCells(land,planningOf(),[site()]).sort((a,b)=>a.x-b.x);
  assert.deepEqual(plots,[{x:-10,z:10,y:3.1,site:true},{x:10,z:-10,y:2.4,site:true}]);
});
test('only ground inside the outline counts: the notch of an L-shaped site is left out',()=>{
  const ell=[[0,0],[24,0],[24,8],[8,8],[8,24],[0,24]];            // two 8 m bars; x > 8 together with z > 8 is outside
  const land=landOf(cellsOf(LAND.LAND,[2,2],[22,2],[2,22],[14,14],[22,22]));
  assert.deepEqual(plotsOf(land,planningOf(),[ell]),[[2,2],[2,22],[22,2]],'the notch of the L is not a plot');
});

// 2. What already stands there stays
for(const [what,kind] of [['water',LAND.WATER],['park or lawn',LAND.GREEN],['street',LAND.ROAD],['car park',LAND.PARKING],['no-ground',LAND.NONE]]){
  test(`a ${what} cell inside a site stays as it is, not a plot`,()=>{
    const land=landOf(cellsOf(kind,[-10,-10]),cellsOf(LAND.LAND,[10,10]));   // the free cell shows that the site is read at all
    assert.deepEqual(plotsOf(land,planningOf(),[site()]),[[10,10]]);
  });
}
test('a house that already stands on open ground inside a site is not built over',()=>{
  const planning=planningOf({houses:[footprint(-10,-10)]});
  assert.deepEqual(plotsOf(landOf(cellsOf(LAND.LAND,[-10,-10],[10,10])),planning,[site()]),[[10,10]]);
});
test('a car street across a site is not a plot, even where its surface is paved ground or gravel',()=>{
  const street={car:true,kind:'residential',minX:-100,maxX:100,minZ:-2,maxZ:2};   // 4 m wide along x through the origin
  const land=landOf(cellsOf(LAND.PAVED,[-10,0],[10,0]),cellsOf(LAND.LAND,[-10,12],[10,-12]));
  assert.deepEqual(plotsOf(land,planningOf({roads:[street]}),[site()]),[[-10,12],[10,-12]]);
});
test('a footway across a site may be built over',()=>{
  const footway={car:false,kind:'footway',minX:-100,maxX:100,minZ:-1,maxZ:1};
  const land=landOf(cellsOf(LAND.PAVED,[-10,0],[10,0]));
  assert.deepEqual(plotsOf(land,planningOf({roads:[footway]}),[site()]),[[-10,0],[10,0]],'a footway does not stop building');
});

// 3. No building land pointed out: the engine builds on the car parks only, as before
test('no site pointed out means no plots, however much open ground there is',()=>{
  const land=landOf(cellsOf(LAND.LAND,[0,0],[10,10]),cellsOf(LAND.PAVED,[-10,10]));
  assert.deepEqual(siteCells(land,planningOf(),[]),[]);
});

// 4. Several sites
test('ground in any of several sites is a plot, ground between them is not',()=>{
  const west=box(-60,-20,-20,20),east=box(20,-20,60,20);          // 40 m of nothing between the two
  const land=landOf(cellsOf(LAND.LAND,[-40,0],[40,0],[0,0],[100,0]));
  assert.deepEqual(plotsOf(land,planningOf(),[west,east]),[[-40,0],[40,0]]);
});
test('a cell lying in two overlapping sites is a plot once',()=>{
  const a=box(0,0,24,24),b=box(12,0,36,24);                       // they share x = 12…24
  const land=landOf(cellsOf(LAND.LAND,[6,10],[18,10],[30,10]));
  assert.deepEqual(plotsOf(land,planningOf(),[a,b]),[[6,10],[18,10],[30,10]],'the shared cell (18, 10) appears once');
});

// When the blocks rise (lotTurn: a lot's turn 0–1 in the vision's `housing`, from a random h in 0–1).
test('a place with building land builds there first, then on its car parks',()=>{
  for(const h of [0,.25,.5,.75,1]){
    assert.ok(lotTurn(h,true,true)<lotTurn(0,false,true),`building land (h ${h}) comes before every car park`);
    assert.ok(lotTurn(h,true,true)>0&&lotTurn(h,false,true)<1);
  }
  assert.ok(lotTurn(.2,false,true)<lotTurn(.8,false,true)&&lotTurn(.2,true,true)<lotTurn(.8,true,true),'a higher h is a later turn');
});
test('building land is all built when the vision has built three eighths of its homes',()=>{
  // Mölndal: Forsåker's 3 000 homes of the inner city's 8 000.
  assert.ok(lotTurn(1,true,true)<=.375);
});
test('a place without building land takes its car parks in the order it always did',()=>{
  for(const h of [0,.3,.7,1])assert.equal(lotTurn(h,false,false),.05+h*.85);
});
