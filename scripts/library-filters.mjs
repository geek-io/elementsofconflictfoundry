export function recordFacets(record){
 const s=record.system??{};
 const tags=String(s.tags??'').split(/[,;]+/).map(t=>t.trim()).filter(Boolean);
 const style=record.type==='weapon'?(s.weaponStyle||(/melee/i.test(s.category??'')?'Melee':/ranged|thrown/i.test(s.category??'')?'Ranged':/ranged|thrown|short|medium|long|PB|\bcone|\bray/i.test(s.range??'')?'Ranged':'Melee')):'';
 return {techniqueType:s.jutsuType??'',rank:s.jutsuRank??'',nature:s.nature??'',weaponStyle:style,tags:[...tags,...String(s.qualities??'').split(/[,;]+/).map(t=>t.trim()).filter(Boolean)]};
}
export function matchesLibrary(record,filters={},query=''){
 const f=recordFacets(record);
 for(const key of ['techniqueType','rank','nature','weaponStyle'])if(filters[key]&&f[key].toLowerCase()!==filters[key].toLowerCase())return false;
 if(filters.tag&&!f.tags.some(t=>t.toLowerCase()===filters.tag.toLowerCase()))return false;
 return `${record.name} ${record.source} ${Object.values(f).flat().join(' ')} ${record.system?.category??''}`.toLowerCase().includes(query.toLowerCase());
}
export function libraryFacets(records){
 return ['techniqueType','rank','nature','weaponStyle','tag'].map(key=>({key,label:{techniqueType:'Technique Type',rank:'Rank',nature:'Nature',weaponStyle:'Weapon Style',tag:'Tag / Quality'}[key],choices:[...new Set(records.flatMap(r=>{const f=recordFacets(r);return key==='tag'?f.tags:[f[key]];}).filter(Boolean))].sort().map(value=>({value,label:value}))}));
}
