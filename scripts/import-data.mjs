import {RETIRED_ITEM_TYPES,migrateItemSource} from './item-migration.mjs?v=0.3.15';
import {heritageFromFields} from './import-heritage.mjs?v=0.3.15';
import {ATTRIBUTES,SKILLS,ITEM_TYPES,ITEM_ICONS,JUTSU_TYPES} from './config.mjs?v=0.3.15';
import {secondary,professionAdvances} from './rules.mjs?v=0.3.15';
const key=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const textHtml=value=>String(value??'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${escape(p).replaceAll('\n','<br>')}</p>`).join('');
const attributeKeys=Object.keys(ATTRIBUTES);
export const NPC_STAT_LABELS=['Parry','Damage Threshold','Movement','Dodge','Initiative','Size','Peril Threshold','Chakra Pool','Threat Rating'];
const empty=value=>!String(value??'').trim()||/^(?:n\/?a|none|-+)$/i.test(String(value).trim());
function number(value,label,min=0,max=100000){const n=Number(value);if(empty(value)||!Number.isFinite(n)||n<min||n>max)throw Error(`${label}: enter a number from ${min} to ${max}.`);return n;}
function integer(value,label,min=0,max=100000){const n=number(value,label,min,max);if(!Number.isInteger(n))throw Error(`${label}: enter a whole number.`);return n;}
function stat(value,label,max=100){const m=String(value).trim().match(/^(\d+(?:\.\d+)?)\s*%?(?:\s*\[(\d+)\])?/);if(!m)throw Error(`${label}: missing or invalid value.`);return {value:integer(m[1],label,0,max),bonus:m[2]===undefined?null:integer(m[2],`${label} Bonus`,0,30)};}
export function damageFormula(text){
 const aliases={CB:'combat',BB:'brawn',AB:'agility',PB:'perception',IB:'intelligence',WB:'willpower',FB:'fellowship'};
 let value=String(text??'').trim().replace(/\[([A-Z]B)\]/g,(all,k)=>aliases[k]?`@bonuses.${aliases[k]}`:all);
 if(!value)return '';
 if(!/^[\d\s+dDxX*\-()/@.a-z]+$/.test(value))throw Error('Damage must be a dice formula, for example 2d6+5 or 1d6x6 + @bonuses.combat.');
 value=value.replace(/(\d+)d(\d+)(?!\d|x)/gi,(all,count,faces)=>`${count}d${faces}x${faces}`);
 return value;
}
function lines(text){return String(text).replace(/\r/g,'').replace(/\u00a0/g,' ').replaceAll('\t','\n').split('\n');}
function labelFields(text){
 const result={};let current=null;
 for(const raw of lines(text)){const line=raw.replace(/^\s*[*•]\s*/,'').trim(),match=line.match(/^([^:]{1,45}):\s*(.*)$/);
  if(match&&(['name','type','skillranks','skilladvances','bonusadvances','talents','modifiers','bonusmodifiers','boons','banes'].includes(key(match[1]))||Object.hasOwn(FIELD_MAP,key(match[1])))){current=key(match[1]);result[current]=match[2];}else if(current)result[current]+='\n'+line;
 }
 return result;
}
function entries(text){
 const source=lines(text).filter(line=>line.trim()&&!/^\s*(?:Name|NPC Template)\s*$/i.test(line));
 const bullets=source.map(line=>line.match(/^(\s*)[*•-]\s+/)).filter(Boolean),indent=bullets.length?Math.min(...bullets.map(m=>m[1].length)):0;
 const result=[];
 for(const raw of source){const match=raw.match(/^(\s*)[*•-]\s+(.*)$/),line=(match?.[2]??raw).trim();if(empty(line))continue;
  if(match&&match[1].length>indent&&result.length)result[result.length-1]+='\n'+line;
  else if(match||!result.length||/^\S[^:]*:\s*/.test(line))result.push(line);
  else result[result.length-1]+='\n'+line;
 }
 return result;
}
function skillKey(value){return SKILLS.find(s=>key(s.label)===key(value)||key(s.key)===key(value))?.key;}
export function parseSkills(text,warnings=[]){
 const skills={};
 for(const line of String(text??'').split(/[\n;,]+/).map(s=>s.replace(/^\s*[*•-]\s*/,'').trim()).filter(Boolean)){
  const match=line.match(/^(.+?)\s*(?:\+|:\s*)(\d+)\s*$/);if(!match){warnings.push(`Skill not assigned: ${line}`);continue;}
  const alternatives=match[1].split('/').map(s=>s.trim()),name=alternatives[0],id=skillKey(name),value=Number(match[2]);
  if(!id){warnings.push(`Unknown skill: ${name}`);continue;}
  const rank=line.includes('+')?value/10:value;if(!Number.isInteger(rank)||rank<0||rank>3){warnings.push(`Skill ranks must be 0–3 or +10/+20/+30: ${line}`);continue;}
  skills[id]=rank;if(alternatives.length>1)warnings.push(`Skill choice ${match[1]}: selected ${name}. Edit Skill Ranks to choose differently.`);
 }
 return skills;
}
export function parseAttack(text,warnings=[]){
 const match=text.match(/^([^:\n]+):\s*(\d+)%([\s\S]*)$/);if(!match){warnings.push(`Attack needs Name: chance% - Distance (...) - Damage (...): ${text}`);return null;}
 const name=match[1].trim(),tail=match[3],damage=tail.match(/\bDamage\s*\(([^)]+)\)/i),range=tail.match(/\bDistance\s*\(([^)]+)\)/i);
 let formula='';try{formula=damageFormula(damage?.[1]??'');}catch(error){warnings.push(`${name}: ${error.message}`);}
 const qualities=damage?tail.slice(damage.index+damage[0].length).replace(/^\s*[-–—]\s*/,'').trim():'';
 return {name,type:'weapon',img:ITEM_ICONS.weapon,system:{quantity:1,equipped:true,skill:/^(bite|claw|unarmed|kick|fist)$/i.test(name)?'taijutsu':'bukijutsu',testChance:stat(match[2],'Attack chance',200).value,damageFormula:formula,range:range?.[1]??'',qualities,description:textHtml(text)}};
}
export function parseTrait(text){
 const separator=text.indexOf(':');if(separator<0)return {name:text.trim(),type:'trait',img:ITEM_ICONS.trait,system:{audience:'antagonist',active:true,actionCost:0,misfortuneCost:0,spendMisfortune:false,actionType:'Special',description:''}};
 const heading=text.slice(0,separator).trim(),cost=heading.match(/\(([^)]*(?:Misfortune|\bAP\b|Action)[^)]*)\)/i),metadata=cost?.[1]??'';
 const ap=metadata.match(/(\d+)\s*AP\b/i),misfortune=metadata.match(/(\d+)\s*Misfortune\b/i),actionType=/non[- ]combat/i.test(metadata)?'Non-Combat':/\bCombat\b/i.test(metadata)?'Combat':'Special';
 return {name:(cost?heading.replace(cost[0],''):heading).trim(),type:'trait',img:ITEM_ICONS.trait,system:{audience:'antagonist',active:!ap&&!misfortune,actionCost:ap?integer(ap[1],'Trait AP',0,3):0,misfortuneCost:misfortune?integer(misfortune[1],'Misfortune Cost'):0,spendMisfortune:Boolean(misfortune&&Number(misfortune[1])),actionType,description:textHtml(text.slice(separator+1).trim())}};
}
function parseTechnique(text,warnings){
 const first=text.split('\n')[0],match=first.match(/^(.*?)\s*\((\d+)\s*AP\)\s*:\s*(\d+)%\s*[-–—]\s*(\d+)\s*Chakra([\s\S]*)$/i);
 if(!match){warnings.push(`Technique retained as an unconfigured draft: ${first}`);return {name:first.split(':')[0],type:'technique',img:ITEM_ICONS.technique,system:{configured:false,description:textHtml(text),source:'NPC import'}};}
 const maintained=/Maintained/i.test(text),system={configured:true,skill:'ninjutsu',jutsuType:'Ninjutsu',jutsuRank:'E',testChance:integer(match[3],'Technique chance',0,200),chakraCost:integer(match[4],'Chakra Cost'),actionCost:integer(match[2],'Technique AP',0,3),chakraCostMode:'current',duration:maintained?'Maintained':'Instantaneous',durationText:maintained?match[5].replace(/^\s*[-–—]\s*/,'').trim():'',range:'Self',description:textHtml(text.split('\n').slice(1).join('\n')),source:'NPC import',upstream:{npcImportReference:true}};
 const template=['Ray','Cone','Explosion'].find(shape=>new RegExp(`\\b${shape}\\b`,'i').test(match[5]));if(template)system.template=template;
 return {name:match[1].trim(),type:'technique',img:ITEM_ICONS.technique,system};
}
export function npcFromFields(fields){
 const name=String(fields.name??'').trim();if(!name||/^Name$/i.test(name))throw Error('Enter an NPC name.');
 const warnings=[],attributes={},bonusAdjustments={};
 for(const id of attributeKeys){const parsed=stat(fields[id],ATTRIBUTES[id]);attributes[id]=parsed.value;bonusAdjustments[id]=parsed.bonus===null?0:parsed.bonus-Math.floor(parsed.value/10);}
 const threat=String(fields.threatrating??''),tier=/jonin/i.test(threat)?3:/chunin/i.test(threat)?2:1;
 const skills=parseSkills(fields.skills,warnings),system={attributes,bonusAdjustments,skills,tier,damageState:0,perilState:0,actions:3,chakra:{value:0,max:0},npcSize:fields.size??'',npcThreatRating:threat,npcDefenses:{},dodgeSkill:'coordination',parrySkill:skills.bukijutsu?'bukijutsu':skills.taijutsu?'taijutsu':'bukijutsu',secondaryAdjustments:{},background:String(fields.description??''),notes:'',upstream:{npcImport:{...fields}}};
 const base=secondary(system,[]);
 for(const [field,target] of [['damagethreshold','damage'],['perilthreshold','peril'],['movement','movement'],['initiative','initiative']])if(!empty(fields[field]))system.secondaryAdjustments[target]=stat(fields[field],field,200).value-base[target];
 for(const defense of ['parry','dodge'])if(!empty(fields[defense]))system.npcDefenses[defense]=stat(fields[defense],defense,200).value;
 if(!empty(fields.chakrapool)){const chakra=stat(fields.chakrapool,'Chakra Pool',100000).value;system.chakraBonus=chakra-base.chakra;system.chakra.value=chakra;}else system.chakra.value=base.chakra;
 const items=[...entries(fields.attacks??'').map(text=>parseAttack(text,warnings)),...entries(fields.techniques??'').map(text=>parseTechnique(text,warnings)),...entries(fields.traits??'').map(parseTrait)].filter(Boolean);
 if(warnings.length)system.notes=`Import notes\n${warnings.join('\n')}`;
 return {data:{name,type:'npc',system,items},warnings};
}
function nameBefore(source,index){
 for(let i=index-1;i>=0;i--){const text=source[i].trim();if(!text||/^(?:Name|NPC Template|Animals|Beasts|Constructs|Monks|Shinobi|Traits|Techniques|Attacks|Skill Ranks)$/i.test(text)||/^[*•]|^[\d\t]|[:.!?]$/.test(text)||text.length>100||Object.values(ATTRIBUTES).includes(text)||NPC_STAT_LABELS.includes(text))continue;return {name:text.replace(/^Name:\s*/i,''),index:i};}
 return null;
}
export function parseNPCText(text){
 if(!String(text).trim())throw Error('Paste an NPC stat block.');
 const source=lines(text),compact=source.map((line,index)=>({text:line.trim(),index})).filter(line=>line.text),tables=[];
 for(let i=0;i<compact.length;i++)if(attributeKeys.every((id,n)=>key(compact[i+n]?.text)===id))tables.push(i);
 const results=[];
 for(let ti=0;ti<tables.length;ti++){
  const pos=tables[ti],values=compact.slice(pos+7,pos+14);if(values.length!==7||!values.every(line=>/^\d+\s*%?(?:\s*\[\d+\])?$/.test(line.text)))continue;
  const name=nameBefore(source,compact[pos].index);if(!name)throw Error('Could not identify the NPC name above the attribute table.');
  const fields={name:name.name,description:source.slice(name.index+1,compact[pos].index).join('\n').trim()};attributeKeys.forEach((id,n)=>fields[id]=compact[pos+7+n].text);
  let next=pos+14;const headers=[];while(next<compact.length&&NPC_STAT_LABELS.some(label=>key(label)===key(compact[next].text))){headers.push(key(compact[next].text));next++;}
  headers.forEach((id,n)=>fields[id]=compact[next+n]?.text??'');next+=headers.length;
  const end=tables[ti+1]===undefined?source.length:compact[tables[ti+1]].index;
  let section=null;const parts={skills:[],attacks:[],techniques:[],traits:[]};
  for(const raw of source.slice(compact[next]?.index??end,end)){
   const clean=raw.replace(/^\s*[*•]\s*/,'').trim();if(/^Name$/i.test(clean))break;
   const sections={skillranks:'skills',skills:'skills',attacks:'attacks',techniques:'techniques',traits:'traits'},heading=Object.hasOwn(sections,key(clean))?sections[key(clean)]:null;if(heading){section=heading;continue;}
   if(section)parts[section].push(raw);
  }
  for(const [id,value] of Object.entries(parts))fields[id]=value.join('\n');results.push(npcFromFields(fields));
 }
 if(results.length)return results;
 return String(text).split(/^\s*---+\s*$/m).filter(block=>block.trim()).map(block=>{
  const fields={},parts={skills:[],attacks:[],techniques:[],traits:[]},sections={skills:'skills',skillranks:'skills',attacks:'attacks',techniques:'techniques',traits:'traits'};let current=null,section=null;
  for(const raw of lines(block)){
   const clean=raw.trim(),heading=key(clean.replace(/:$/,''));if(Object.hasOwn(sections,heading)){section=sections[heading];current=null;continue;}
   if(section){parts[section].push(raw);continue;}
   const match=clean.match(/^([^:]{1,45}):\s*(.*)$/);if(match){current=key(match[1]);fields[current]=match[2];}else if(current)fields[current]+='\n'+clean;
  }
  for(const [id,value] of Object.entries(parts))if(value.length)fields[id]=value.join('\n');fields.name??=block.trim().split('\n')[0];fields.skills??=fields.skillranks;return npcFromFields(fields);
 });
}
const FIELD_MAP={quantity:'quantity',price:'price',encumbrance:'encumbrance',armorbonus:'armorBonus',damage:'damageFormula',damageformula:'damageFormula',range:'range',qualities:'qualities',skill:'skill',description:'description',source:'source',requirements:'requirements',category:'category',chakracost:'chakraCost',actioncost:'actionCost',apcost:'actionCost',actionpointcost:'actionCost',misfortunecost:'misfortuneCost',duration:'duration',actiontype:'actionType',techniquetype:'jutsuType',jutsutype:'jutsuType',rank:'jutsuRank',techniquerank:'jutsuRank',nature:'nature',element:'nature',audience:'audience',traittype:'audience',criticalsuccess:'criticalSuccess',criticalfailure:'criticalFailure',sublimesuccess:'sublimeSuccess',sublimefailure:'sublimeFailure',supremesuccess:'sublimeSuccess',supremefailure:'sublimeFailure'};
export function importedProfessionAdvances(fields){
 const advances=professionAdvances();
 for(const [group,prefix,label,count] of [['skills','skill','skillranks',10],['bonuses','bonus','bonusadvances',7],['talents','talent','talents',3]]){
  const explicit=Array.from({length:count},(_,i)=>fields[`${prefix}${i}`]??'');
  const values=explicit.some(value=>String(value).trim())?explicit:String(fields[label]??(group==='skills'?fields.skilladvances:'')??'').split(/[\n;,]+/).map(value=>value.replace(/^\s*[*•-]\s*/,'').trim()).filter(Boolean);
  if(values.length>count)throw Error(`A Profession can have at most ${count} ${group==='skills'?'Skill Ranks':group==='bonuses'?'Bonus Advances':'Talents'}.`);
  for(let i=0;i<count;i++){
   let name=String(values[i]??'').trim();
   if(name&&group==='skills'){const skill=skillKey(name.replace(/\s*\+\d+$/,''));if(!skill)throw Error(`Unknown profession Skill: ${name}`);name=SKILLS.find(s=>s.key===skill).label;}
   if(name&&group==='bonuses'){const attribute=Object.entries(ATTRIBUTES).find(([id,label])=>key(name.replace(/\s+Bonus$/i,''))===key(label)||key(name)===id);if(!attribute)throw Error(`Unknown Bonus Advance: ${name}`);name=attribute[1];}
   advances[group][i].name=name;
  }
 }
 return advances;
}
export function itemFromFields(fields){
 const name=String(fields.name??'').trim();if(!name)throw Error('Enter an Item name.');
 const rawType=key(fields.type??'gear'),type=ITEM_TYPES.find(type=>key(type)===rawType)??Object.entries(RETIRED_ITEM_TYPES).find(([old])=>key(old)===rawType)?.[1]??(/^(bukijutsu|genjutsu|ninjutsu|taijutsu|fuinjutsu)$/.test(rawType)?'technique':rawType==='antagonisttrait'?'trait':null);
 if(!type)throw Error(`Unknown Item type: ${fields.type}`);
 const system={},warnings=[];
 for(const [label,value] of Object.entries(fields)){if(empty(value)||!Object.hasOwn(FIELD_MAP,label))continue;const field=FIELD_MAP[label];
  if(['quantity','armorBonus','chakraCost','actionCost','misfortuneCost'].includes(field))system[field]=integer(value,label,0,field==='actionCost'?3:100000);
  else if(field==='encumbrance')system[field]=number(value,label);
  else if(field==='skill'){const id=skillKey(value);if(!id)throw Error(`Unknown Skill: ${value}`);system.skill=id;}
  else if(field==='damageFormula')system[field]=damageFormula(value);
  else system[field]=field==='description'?textHtml(value):String(value).trim();
 }
 if(JUTSU_TYPES.includes(type)){
  if(!system.jutsuType&&rawType!=='technique'&&rawType!=='jutsu'&&rawType!=='spell'&&rawType!=='ritual')system.jutsuType=rawType[0].toUpperCase()+rawType.slice(1);
  system.skill??=system.jutsuType?.toLowerCase()??'ninjutsu';system.configured=!empty(fields.chakracost)&&!empty(fields.actioncost??fields.apcost??fields.actionpointcost);
  if(!system.configured)warnings.push(`${name}: missing Chakra or AP cost; imported as a draft Technique.`);
 }
 if(type==='trait'){
  system.audience=rawType==='antagonisttrait'?'antagonist':key(system.audience)==='antagonist'?'antagonist':'player';
  system.actionType=/non[- ]combat/i.test(system.actionType??'')?'Non-Combat':/combat/i.test(system.actionType??'')?'Combat':'Special';system.active=false;system.spendMisfortune=(system.misfortuneCost??0)>0;
 }
 if(type==='heritage'){const parsed=heritageFromFields(fields);Object.assign(system,parsed.system);warnings.push(...parsed.warnings);}
 if(type==='profession')system.advances=importedProfessionAdvances(fields);
 return {data:{name,type,img:ITEM_ICONS[type],system},warnings};
}
export function parseItemText(text,{defaultType=null}={}){
 if(!String(text).trim())throw Error('Paste Item text or an Item JSON export.');
 if(/^[\[{]/.test(String(text).trim())){
  let json;try{json=JSON.parse(text);}catch{throw Error('Invalid Item JSON.');}
  return (Array.isArray(json)?json:[json]).map(record=>{migrateItemSource(record);if(!record.name||!ITEM_TYPES.includes(record.type))throw Error('Each JSON Item needs a name and supported Item type.');return {data:{name:record.name,type:record.type,img:record.img??ITEM_ICONS[record.type],system:record.system??{},effects:record.effects??[],flags:record.flags??{}},warnings:[]};});
 }
 return String(text).split(/^\s*---+\s*$/m).filter(block=>block.trim()).map(block=>{const fields=labelFields(block);fields.name??=block.trim().split('\n')[0];fields.type??=defaultType;if(!fields.type)throw Error('Item text needs a Type, for example Type: weapon.');return itemFromFields(fields);});
}
export function techniqueAliases(name){const aliases=[name,...String(name).matchAll(/\(([^)]+)\)/g)].map(value=>key(Array.isArray(value)?value[1]:value));return [...new Set(aliases.filter(Boolean))];}
