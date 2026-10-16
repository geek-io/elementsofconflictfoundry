import {PHYSICAL_TYPES,ITEM_ICONS,SYSTEM_ID} from './config.mjs?v=0.3.15';
const edits=new WeakMap(),grants=new WeakMap();
const clone=value=>JSON.parse(JSON.stringify(value));
function enqueue(map,key,task){const next=(map.get(key)??Promise.resolve()).catch(()=>{}).then(task);map.set(key,next);return next;}
export function equipmentRecord(item){
 const data=item.toObject?.()??item;
 if(!PHYSICAL_TYPES.includes(data.type))throw Error('Profession equipment must be an Inventory Item.');
 return {id:foundry.utils.randomID(),name:data.name,type:data.type,img:data.img||ITEM_ICONS[data.type],system:{quantity:1,encumbrance:0,armorBonus:0,carried:true,equipped:false,skill:'bukijutsu',price:'',range:'',description:'',damageFormula:'',qualities:'',...clone(data.system??{})},effects:clone(data.effects??[])};
}
export async function changeEquipment(profession,{add=null,remove=null,index=null,field=null,value=null}={}){
 if(!profession?.isOwner||profession.type!=='profession')return false;
 return enqueue(edits,profession,async()=>{
  const rows=clone(profession.system.equipment??[]);
  if(add)rows.push(equipmentRecord(add));
  else if(remove!==null){if(!Number.isInteger(remove)||!rows[remove])return false;rows.splice(remove,1);}
  else{
   const row=rows[index];if(!row)return false;
   if(field==='name'&&typeof value==='string')row.name=value;
   else if(field==='type'&&PHYSICAL_TYPES.includes(value)){row.type=value;row.img=ITEM_ICONS[value];}
   else if(['quantity','encumbrance','armorBonus'].includes(field)){
    if(!Number.isFinite(value)||value<0||field!=='encumbrance'&&!Number.isInteger(value))throw Error('Enter a valid non-negative equipment value.');
    row.system[field]=value;
   }else if(['price','description','damageFormula','qualities','range','skill'].includes(field)&&typeof value==='string')row.system[field]=value;
   else return false;
  }
  await profession.update({'system.equipment':rows});return true;
 });
}
export async function grantProfessionEquipment(profession){
 const actor=profession.parent;
 if(profession.type!=='profession'||actor?.documentName!=='Actor'||!actor.isOwner)return [];
 return enqueue(grants,actor,async()=>{
  const already=new Set(actor.items.map(item=>item.flags?.[SYSTEM_ID]?.professionEquipment).filter(Boolean));
  const data=(profession.system.equipment??[]).flatMap((row,index)=>{
   if(!PHYSICAL_TYPES.includes(row.type)||!row.name?.trim())return [];
   const key=`${profession.id}:${row.id??index}`;if(already.has(key))return [];
   return [{name:row.name,type:row.type,img:row.img||ITEM_ICONS[row.type],system:clone(row.system??{}),effects:clone(row.effects??[]).map(effect=>{delete effect._id;return effect;}),flags:{[SYSTEM_ID]:{professionEquipment:key}}}];
  });
  return data.length?actor.createEmbeddedDocuments('Item',data):[];
 });
}
export async function onProfessionCreated(item,options,userId){
 if(userId!==game.user.id)return;
 try{await grantProfessionEquipment(item);}catch(error){ui.notifications.warn(`Profession equipment could not be added: ${error.message}`);}
}
