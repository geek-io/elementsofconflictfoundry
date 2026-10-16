// Import only the five professions in the EoC playtest, PDF pp.24–28.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {professionAdvances} from '../scripts/rules.mjs';
const names=['Deceiver','Demolition','Infiltrator','Saboteur','Support'];
const bonus={AB:'Agility',BB:'Brawn',CB:'Combat',PB:'Perception',IB:'Intelligence',WB:'Willpower',FB:'Fellowship'};
const id=(type,name)=>createHash('sha256').update(type+':'+name).digest('hex').slice(0,16);
const records=[];
const lore=[
 'Allure and Wit are the tools of any good shinobi, and yet there are some to which the Velvet glove comes as second-nature. Deceivers are Shinobi for whom Illusions are painted with every breath and word, with or without the use of Chakra.',
 'There are times when subtlety is not an option. Those are the moments when you shine. Quick on your feet, quick to assess the situation, and quick to create an Alternative means of escape when necessary.',
 'There can be no secrets when you are on the hunt. Your web is wide and your preparations are many. You have a thousand faces, some friendly and others foreign, but all are deadly. You are the whisper in the wind, the sign that the desperate look to when at the end of their rope. And you Always provide.',
 "Stealth and Power, the two pillars of any Shinobi's Arsenal. You contain them and more, for you are the line that separates Peace and War. When you are called to action it is to secure intel, erase the traces of lesser-nin, redirect the focuses of those more likely to suspect external actors, and more.",
 'Man over mission, pen over sword. You exist not solely as a blade in the dark or a shining nova, but more than anything as a scholar, a healer, and an advisor. You may not be the mightiest of warriors, but when others spend their time sharpening their skill for ending lives, you are hard at work saving them. But let it never be forgotten that all roses have thorns and you are just as liable to show your displeasure as any other when things get out of hand.'
];
const equipment=[
 'A Brace of 20 Shuriken, 10 Kunai, 1 Set of Elegant Clothing, 1 disguise kit, 1 soldier pill, 2 weapons with the Light or Finesse Quality, and 50,000 両.',
 'A Brace of 20 Shuriken, 10 Kunai, 1 Set of Sturdy Clothing, 2 soldier pills, 2 Bloodclotting Pills, 1 weapon without the Slow or Reach Quality, and 50,000 両.',
 'A Brace of 20 Shuriken, 10 Kunai, 1 Set of Dark Clothing, 1 soldier pill, 1 Bloodclotting Pill, 1 weapon with the Light or Finesse Quality, 1 Weapon with the Breaker Quality, and 50,000 両.',
 'A Brace of 20 Shuriken, 10 Kunai, 1 Set of Dark Clothing, 1 Survival Kit, 1 soldier pill, 2 Bloodclotting Pills, 1 weapon with the Finesse Quality, 1 Weapon with the Vicious Quality, and 50,000 両.',
 'A Brace of 20 Shuriken, 10 Kunai, 1 Set of Sturdy Clothing, 4 soldier pills, 4 Bloodclotting Pills, 1 weapon with the Light or Finesse Quality, 1 Weapon or Shield with the Protective Quality, and 50,000 両.'
];
for(let i=0;i<names.length;i++){
 const name=names[i],page=24+i,text=await readFile(`tmp/book-pages/${String(page).padStart(3,'0')}.txt`,'utf8').then(text=>text.replaceAll('\r',''));
 const rows=[...text.matchAll(/Skill Advances (.*?) (Bonus Advances|Talents) (.*)/g)];
 const skills=rows.map(row=>({name:row[1].trim()}));
 const bonuses=rows.filter(row=>row[2]==='Bonus Advances').map(row=>({name:bonus[row[3].trim()]+' Bonus'}));
 const talents=rows.filter(row=>row[2]==='Talents').map(row=>({name:row[3].trim()}));
 if(skills.length!==10 || bonuses.length!==7 || talents.length!==3)throw Error('Incomplete profession '+name);
 const specialist=text.match(/Specialist Trait: (.*?)\nEffect: ([\s\S]*?)\n\w+ Advances/);
 const source=`EoC Shinobi Playtest v1.0, PDF p.${page}`;
 const traitName=specialist[1].replace('Weaponzied','Weaponized');
 const trait={_id:id('trait',traitName),name:traitName,type:'trait',system:{audience:'player',active:true,description:specialist[2].replace(/\n/g,' '),source,category:name}};
 records.push(trait);
 const explicit={
  'Polymath':'When counting or cheating, you gain a +10 Base Chance to Skill Tests.',
  'Underneath the Underneath':'Assuming you are properly attired, not in an incongruous position, or doing something outwardly suspicious; those classified as [Noble] and [Samurai] roll at Disadvantage when attempting Scrutinize tests to discern you from any other servant.',
  'Tourniquet':'You may choose to roll any Heal tests made while in Combat at Advantage, however doing so pushes you 1 step down the Peril Track regardless of your success or Failure.'
 };
 for(let j=0;j<talents.length;j++){
  const talent=talents[j],start=text.indexOf(talent.name+':'),next=j<2?text.indexOf(talents[j+1].name+':',start):text.length;
  const description=explicit[talent.name]??text.slice(start+talent.name.length+1,next).replace(/\n/g,' ').replace(/\s*22\d\d[\s\S]*$/,'').trim();
  if(!description || start<0 && !explicit[talent.name])throw Error('Missing talent '+talent.name);
  const talentId=id('talent',talent.name);talent.uuid=`Compendium.elementsofconflictfoundry.eoc-talents.Item.${talentId}`;
  records.push({_id:talentId,name:talent.name,type:'talent',system:{description,source,category:name}});
 }
 const advances=professionAdvances({talents,skillRanks:skills,bonusAdvances:bonuses});
 records.push({_id:id('profession',name),name,type:'profession',system:{category:'Genin',source,advances,description:`<h2>${name}</h2><p>${lore[i]}</p><p>Genin profession.</p><h3>Specialist Trait: ${trait.name}</h3><p>${trait.system.description}</p><p>@UUID[Compendium.elementsofconflictfoundry.eoc-specialist-traits.Item.${trait._id}]{${trait.name}}</p><h3>Talents</h3>${talents.map(t=>`<p>@UUID[${t.uuid}]{${t.name}}</p>`).join('')}<h3>Starting Equipment</h3><p>${equipment[i]}</p>`}});
}
await writeFile('data/book-professions.json',JSON.stringify(records,null,2)+'\n');
console.log('Imported 5 EoC professions, 15 Talents, and 5 Specialist Traits.');
