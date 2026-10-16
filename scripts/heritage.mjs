import { ATTRIBUTES } from "./config.mjs?v=0.3.15";
export const HERITAGE_LISTS=["modifiers","boons","banes"];
const pending=new WeakMap();
function enqueue(item,task) {
  const next=(pending.get(item) ?? Promise.resolve()).then(task);
  pending.set(item,next.catch(()=>{}));return next;
}
export function migrateHeritageData(source) {
  const result={...source};
  if(result.modifiers===undefined) result.modifiers=Object.keys(ATTRIBUTES).filter(key=>Number(source.bonusModifiers?.[key])).map(attribute=>({attribute,value:Number(source.bonusModifiers[attribute])}));
  for(const [list,field,name] of [["boons","boon","boonName"],["banes","bane","baneName"]]) {
    if(result[list]===undefined) result[list]=["genin","chunin","jonin"].flatMap((tier,index)=>{
      const description=source.tiers?.[tier]?.[field] ?? "";
      return description ? [{name:source[name] || `${tier[0].toUpperCase()+tier.slice(1)} ${field}`,tier:index+1,description}] : [];
    });
  }
  for(const field of ["bonusModifiers","attributeModifiers","skillModifiers","bonusChoices","untrainedBonus","boonName","baneName","tiers"])delete result[field];
  return result;
}
export function heritageBonusValues(system) {
  const values=Object.fromEntries(Object.keys(ATTRIBUTES).map(key=>[key,0]));
  for(const row of system?.modifiers ?? [])if(Object.hasOwn(values,row.attribute))values[row.attribute]+=row.value;
  return values;
}
export async function updateHeritageList(item,list,index,field,value) {
  if(!item?.isOwner || item.type!=="heritage" || !HERITAGE_LISTS.includes(list))return false;
  return enqueue(item,async()=>{
  const rows=Array.from(item.system[list] ?? [],row=>({...row}));
  if(!Number.isInteger(index) || !rows[index])return false;
  if(list==="modifiers") {
    if(field==="attribute" && Object.hasOwn(ATTRIBUTES,value))rows[index].attribute=value;
    else if(field==="value" && Number.isInteger(value) && value>=-100 && value<=100)rows[index].value=value;
    else return false;
  } else {
    if(field==="tier" && [1,2,3].includes(value))rows[index].tier=value;
    else if(["name","description"].includes(field) && typeof value==="string")rows[index][field]=value;
    else return false;
  }
  await item.update({[`system.${list}`]:rows});return true;
  });
}
export async function changeHeritageList(item,list,index=null) {
  if(!item?.isOwner || item.type!=="heritage" || !HERITAGE_LISTS.includes(list))return false;
  return enqueue(item,async()=>{
  const rows=Array.from(item.system[list] ?? [],row=>({...row}));
  if(index===null)rows.push(list==="modifiers"?{attribute:"combat",value:0}:{name:list==="boons"?"New Boon":"New Bane",tier:1,description:""});
  else {if(!Number.isInteger(index) || !rows[index])return false;rows.splice(index,1);}
  await item.update({[`system.${list}`]:rows});return true;
  });
}
