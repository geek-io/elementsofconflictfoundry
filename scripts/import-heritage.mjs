import {ATTRIBUTES} from './config.mjs?v=0.3.15';
const tiers={genin:1,chunin:2,jonin:3};
export function heritageFromFields(fields){
 const modifiers=[],warnings=[];
 for(const [attribute,label] of Object.entries(ATTRIBUTES)){
  const raw=fields[`heritage${attribute}`];if(raw===undefined||String(raw).trim()==='')continue;
  const value=Number(raw);if(!Number.isInteger(value)||value< -100||value>100)throw Error(`${label} Bonus must be a whole number from -100 to 100.`);
  if(value)modifiers.push({attribute,value});
 }
 const text=String(fields.modifiers??fields.bonusmodifiers??'');
 for(const line of text.split(/[\n;,]+/).map(t=>t.replace(/^\s*(?:[*•]\s*|-\s+)/, '').trim()).filter(Boolean)){
  const match=line.match(/^(?:([+-]?\d+)\s+)?(Combat|Brawn|Agility|Perception|Intelligence|Willpower|Fellowship)(?:\s+Bonus)?\s*[:=]?\s*([+-]?\d+)?$/i);
  if(!match||match[1]===undefined&&match[3]===undefined){warnings.push(`Choose the attribute bonuses manually: ${line}`);continue;}
  const value=Number(match[1]??match[3]);if(value< -100||value>100)throw Error('Heritage bonus must be from -100 to 100.');
  modifiers.push({attribute:match[2].toLowerCase(),value});
 }
 const system={modifiers,boons:[],banes:[]};
 for(const [list,prefix] of [['boons','boon'],['banes','bane']]){
  for(let tier=1;tier<=3;tier++){
   const name=String(fields[`${prefix}${tier}name`]??''),description=String(fields[`${prefix}${tier}description`]??'');
   if(name||description)system[list].push({name:name||`${prefix==='boon'?'Boon':'Bane'} ${tier}`,description,tier});
  }
  let name=prefix==='boon'?'Boon':'Bane',row;
  for(const raw of String(fields[list]??'').split('\n')){
   const line=raw.replace(/^\s*(?:[*•]\s*|-\s+)/,'').trim();if(!line)continue;
   const pipe=line.match(/^(Genin|Chunin|Jonin|[123])(?:\s+Tier)?\s*\|\s*([^|]+)\|\s*(.*)$/i);
   const match=pipe??line.match(/^(Genin|Chunin|Jonin|[123])(?:\s+Tier)?\s*[-–—:]\s*(.*)$/i);
   if(match){const tier=tiers[match[1].toLowerCase()]??Number(match[1]);row={name:pipe?match[2].trim():name,tier,description:pipe?match[3]:match[2]};system[list].push(row);}
   else if(row)row.description+='\n'+line;
   else name=line;
  }
 }
 return {system,warnings};
}
