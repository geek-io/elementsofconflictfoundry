import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { SKILLS, SYSTEM_ID, ITEM_ICONS } from "../scripts/config.mjs";
import trappings from "../data/basic-trappings.mjs";
import { createHash } from "node:crypto";
import { migrateHeritageData } from "../scripts/heritage.mjs";
import { migrateTechniqueData, TECHNIQUE_TYPES } from "../scripts/techniques.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(await readFile(resolve(root,"system.json"),"utf8"));
const jutsu=JSON.parse(await readFile(resolve(root,"data/expansions/jutsu.json"),"utf8"));
const heritages=JSON.parse(await readFile(resolve(root,"data/expansions/heritages.json"),"utf8"));
const book=JSON.parse(await readFile(resolve(root,"data/book-techniques.json"),"utf8"));
const professions=JSON.parse(await readFile(resolve(root,"data/book-professions.json"),"utf8"));
const skills=SKILLS.map((skill,index)=>({_id:"eocskill"+String(index).padStart(8,"0"),name:skill.label,type:"skill",system:{skill:skill.key,description:skill.label+" is based on "+skill.attribute+". "+(skill.special?"Special":"Common")+" skill.",source:"EoC Shinobi Playtest v1.0, p.10"}}));
const specs=[...Object.entries({skill:"Skills",weapon:"Weapons",armor:"Armor",medicine:"Medicine",tool:"Tools",gear:"Gear & Poisons"}).map(([type,label])=>({name:"eoc-"+({skill:"skills",weapon:"weapons",tool:"tools"}[type]??type),label,records:[...skills,...trappings].filter(record=>record.type===type)})),
 {name:"eoc-book-techniques",label:"Techniques",records:[...book,...jutsu],techniques:true},
 {name:"eoc-heritages",label:"Heritage Expansion",records:heritages,heritages:true},
 ...['profession','talent','trait'].map(type=>({name:{profession:'eoc-professions',talent:'eoc-talents',trait:'eoc-specialist-traits'}[type],label:{profession:'Professions',talent:'Talents',trait:'Specialist Traits'}[type],records:professions.filter(record=>record.type===type),professions:true}))];
await mkdir(resolve(root,"tmp"),{recursive:true});
const build=await mkdtemp(resolve(root,"tmp/pack-build-"));
const idFor=value=>createHash("sha256").update(value).digest("hex").slice(0,16);
const packs=[];
for(const spec of specs) {
 const source=resolve(build,spec.name);
 await mkdir(source,{recursive:true});
 const folders=new Map();
 async function folder(path){
  if(folders.has(path))return folders.get(path);
  const parts=path.split("/"),name=parts.pop(),parent=parts.length?await folder(parts.join("/")):null;
  const id=idFor(`folder:${spec.name}:${path}`);
  await writeFile(resolve(source,`folder-${id}.json`),JSON.stringify({_id:id,_key:`!folders!${id}`,name,type:"Item",folder:parent,sorting:"a",sort:0,color:null},null,2));
  folders.set(path,id);return id;
 }
 if(spec.techniques)for(const type of TECHNIQUE_TYPES)await folder(type);
 for(const record of spec.records) {
  const id=record._id??idFor(record.type+":"+record.name);
  const system=record.type==="heritage"?migrateHeritageData(record.system):spec.techniques?migrateTechniqueData(structuredClone(record.system)):record.system;
  const path=spec.techniques?`${system.jutsuType}/${system.nature || "Neutral"}/${system.jutsuRank}-Rank`:spec.heritages || spec.professions?system.category:null;
  const img=spec.techniques?`systems/${SYSTEM_ID}/icons/${system.jutsuType.toLowerCase()}.svg`:ITEM_ICONS[record.type];
  const doc={...record,system,_id:id,_key:"!items!"+id,img,effects:[],folder:path?await folder(path):null};
  await writeFile(resolve(source,id+".json"),JSON.stringify(doc,null,2));
 }
 await compilePack(source,resolve(root,"packs",spec.name),{yaml:false});
 packs.push({name:spec.name,label:"EoC · "+spec.label,system:SYSTEM_ID,path:"packs/"+spec.name,type:"Item",ownership:{PLAYER:"OBSERVER",ASSISTANT:"OWNER"}});
}
manifest.packs=packs;
manifest.packFolders=[{name:"Elements of Conflict",packs:[],folders:[...packs.filter(pack=>!["eoc-book-techniques","eoc-heritages"].includes(pack.name)).map(pack=>({name:pack.label.replace("EoC · ",""),packs:[pack.name]})),{name:"Techniques",packs:["eoc-book-techniques"]},{name:"Heritages",packs:["eoc-heritages"]}]}];
await writeFile(resolve(root,"system.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(`Built ${specs.reduce((total,spec)=>total+spec.records.length,0)} EoC Items in ${packs.length} packs; Technique folders use Type → Element → Rank.`);
