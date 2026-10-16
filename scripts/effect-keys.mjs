import {ATTRIBUTES,SKILLS} from './config.mjs?v=0.3.15';
export function systemEffectKeys(){
 const groups=[{label:'Attributes',keys:Object.entries(ATTRIBUTES).map(([key,label])=>({key:`system.attributes.${key}`,label}))},{label:'Attribute Bonuses',keys:Object.entries(ATTRIBUTES).map(([key,label])=>({key:`system.bonusAdjustments.${key}`,label:`${label} Bonus`}))},{label:'Skill Ranks',keys:SKILLS.map(skill=>({key:`system.skills.${skill.key}`,label:skill.label}))},{label:'Secondary Bonuses',keys:['initiative','movement','encumbrance','techniqueLimit','peril','damage'].map(key=>({key:`system.secondaryAdjustments.${key}`,label:{initiative:'Initiative',movement:'Movement',encumbrance:'Encumbrance',techniqueLimit:'Technique Limit',peril:'Peril Threshold',damage:'Damage Threshold'}[key]}))},{label:'Resources',keys:[{key:'system.chakraBonus',label:'Chakra Capacity Bonus'},{key:'system.chakra.value',label:'Current Chakra'},{key:'system.actions',label:'Action Points'},{key:'system.shonen',label:'Plot Armor'}]}];
 const schema=CONFIG.Actor.dataModels.character.schema;
 return groups.map(group=>({...group,keys:group.keys.filter(({key})=>{
  let field=schema;for(const part of key.split('.').slice(1))field=field?.fields?.[part];return Boolean(field);
 })})).filter(group=>group.keys.length);
}
export function addEffectKeyDropdowns(app,html){
 if(app.document?.documentName!=='ActiveEffect')return;
 const root=html instanceof HTMLElement?html:app.element;if(!root)return;
 const groups=systemEffectKeys();
 for(const input of root.querySelectorAll('input[name$=".key"]')){
  if(input.parentElement.querySelector('.eoc-effect-key'))continue;
  const select=document.createElement('select');select.className='eoc-effect-key';select.setAttribute('aria-label','System effect key');select.disabled=!app.document.isOwner;
  select.add(new Option('Choose system key / custom key',''));
  for(const group of groups){const options=document.createElement('optgroup');options.label=group.label;for(const entry of group.keys)options.append(new Option(entry.label,entry.key));select.append(options);}
  select.value=[...select.options].some(option=>option.value===input.value)?input.value:'';
  select.addEventListener('change',()=>{
   if(!select.value)return;
   input.value=select.value;
   const phase=input.closest('li')?.querySelector('input[name$=".phase"]');if(phase)phase.value='initial';
   input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  input.addEventListener('input',()=>{select.value=input.value;});
  input.parentElement.prepend(select);
 }
}
