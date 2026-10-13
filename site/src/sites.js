import { CITY } from './city-config.js';
import { LAND } from './landuse.js';
import { pointInPolygon } from './planning.js';

// Building land a place points out itself (CITY.housingSites: polygons [[x,z],…] in model metres – Mölndal's
// Forsåker, a closed paper mill that becomes a district): its open ground counts as plots, the way car parks
// do (districts.js lays the new blocks on them, features.js the yards between). Water, lawns, car parks,
// car streets and the houses that already stand there stay as they are; a footway may be built over.
export function siteCells(land,planning,sites=CITY.housingSites||[]){
  if(!sites.length)return [];
  const seen=new Set(),out=[];
  for(const c of [...land.cells(LAND.LAND),...land.cells(LAND.PAVED)]){
    const k=c.x+','+c.z;
    if(seen.has(k)||!sites.some(p=>pointInPolygon(c.x,c.z,p)))continue;
    if(planning.buildingAt(c.x,c.z,2)||planning.roadAt(c.x,c.z,0)?.car)continue;
    seen.add(k);out.push({x:c.x,z:c.z,y:c.y,site:true});
  }
  return out;
}
// Car parks north of this line (z, metres south of the centre) get no blocks: Kalmar's large lots lie south
// and west of its centre (40, the default); a place whose car parks lie elsewhere sets its own.
export const housingMinZ=()=>CITY.housingMinZ??40;
// When a lot is built (its turn, 0–1, in the vision's `housing`; h is the lot's own random number 0–1). A
// place with building land builds there first – Mölndal's Forsåker is three eighths of the homes its inner
// city can hold – and then on its car parks; a place without takes its car parks in the order it always did.
export const lotTurn=(h,site,anySite)=>site?.02+h*.33:anySite?.4+h*.55:.05+h*.85;
