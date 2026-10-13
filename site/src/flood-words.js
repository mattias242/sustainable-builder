// How a high water is put into words, by the kind of water the place lies on (FLOOD.kind in its model.js):
// the sea (the default – a storm, a flood wall, quays: Kalmar, Venice), a lake ('lake' – a high water, raised
// shores, beaches and jetties: Rättvik) or a river ('river' – a high flow, the river's banks and its channel:
// Mölndal). Every wording is [Swedish, English, Italian], as i18n's t() takes them; levels and protection
// arrive already formatted. `inland`: a lake or a river, whose edge lies half a metre below the streets
// unless the place says where (FLOOD.quay).
const SEA={
  inland:false,
  hide:['Klicka för att dölja stormen','Click to hide the storm',"Clicca per nascondere l'acqua alta"],
  show:['Klicka för att se en 100-årsstorm i 3D just det här året','Click to see a 100-year storm in 3D in this very year',"Clicca per vedere in 3D un'acqua alta centenaria proprio in quest'anno"],
  head:year=>[`100-årsstorm år ${year}`,`100-year storm in ${year}`,`Acqua alta centenaria nel ${year}`],
  holds:(lvl,prot)=>[`vattnet når ${lvl} m – vallen på ${prot} m håller.`,`the water reaches ${lvl} m – the ${prot} m flood wall holds.`,`l'acqua raggiunge ${lvl} m – l'argine di ${prot} m tiene.`],
  over:lvl=>[`vattnet når ${lvl} m – kajerna spolas över, men gatorna klarar sig.`,`the water reaches ${lvl} m – the quays are washed over, but the streets stay dry.`,`l'acqua raggiunge ${lvl} m – le banchine vengono sommerse, ma le strade restano all'asciutto.`],
  below:lvl=>[`vattnet når ${lvl} m – under kajkanten.`,`the water reaches ${lvl} m – below the quay edge.`,`l'acqua raggiunge ${lvl} m – sotto il bordo delle banchine.`],
};
const LAKE={
  inland:true,
  hide:['Klicka för att dölja högvattnet','Click to hide the high water','Clicca per nascondere la piena'],
  show:['Klicka för att se ett 100-årshögvatten i 3D just det här året','Click to see a 100-year high water in 3D in this very year',"Clicca per vedere in 3D una piena centenaria proprio in quest'anno"],
  head:year=>[`100-årshögvatten år ${year}`,`100-year high water in ${year}`,`Piena centenaria nel ${year}`],
  holds:(lvl,prot)=>[`vattnet når ${lvl} m – det höjda strandskyddet på ${prot} m håller.`,`the water reaches ${lvl} m – the raised shore protection at ${prot} m holds.`,`l'acqua raggiunge ${lvl} m – la difesa delle rive, rialzata a ${prot} m, tiene.`],
  over:lvl=>[`vattnet når ${lvl} m – stränder och bryggor står under vatten, men gatorna klarar sig.`,`the water reaches ${lvl} m – beaches and jetties are under water, but the streets stay dry.`,`l'acqua raggiunge ${lvl} m – spiagge e pontili sono sott'acqua, ma le strade restano all'asciutto.`],
  below:lvl=>[`vattnet når ${lvl} m – under strandkanten.`,`the water reaches ${lvl} m – below the shoreline.`,`l'acqua raggiunge ${lvl} m – sotto il livello della riva.`],
};
const RIVER={
  inland:true,
  hide:['Klicka för att dölja högflödet','Click to hide the high flow','Clicca per nascondere la piena'],
  show:['Klicka för att se ett 100-årsflöde i 3D just det här året','Click to see a 100-year flow in 3D in this very year',"Clicca per vedere in 3D una piena centenaria proprio in quest'anno"],
  head:year=>[`100-årsflöde år ${year}`,`100-year flow in ${year}`,`Piena centenaria nel ${year}`],
  holds:(lvl,prot)=>[`vattnet når ${lvl} m – åns utrymme och skydd klarar ${prot} m.`,`the water reaches ${lvl} m – the river’s room and protection hold to ${prot} m.`,`l'acqua raggiunge ${lvl} m – lo spazio e le difese del fiume reggono fino a ${prot} m.`],
  over:lvl=>[`vattnet når ${lvl} m – ån går över sina kanter, men gatorna klarar sig.`,`the water reaches ${lvl} m – the river tops its banks, but the streets stay dry.`,`l'acqua raggiunge ${lvl} m – il fiume supera le sponde, ma le strade restano all'asciutto.`],
  below:lvl=>[`vattnet når ${lvl} m – inom åns fåra.`,`the water reaches ${lvl} m – within the river’s channel.`,`l'acqua raggiunge ${lvl} m – entro l'alveo del fiume.`],
};
export const floodWords=kind=>kind==='lake'?LAKE:kind==='river'?RIVER:SEA;
