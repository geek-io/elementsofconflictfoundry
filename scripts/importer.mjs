import {ATTRIBUTES,SKILLS,ITEM_TYPES,JUTSU_TYPES,PHYSICAL_TYPES,SYSTEM_ID} from './config.mjs?v=0.3.15';
import {NPC_STAT_LABELS} from './import-data.mjs?v=0.3.15';
import {canImport,prepareImport,createImport,talentOptions} from './import-service.mjs?v=0.3.15';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const id=label=>label.toLowerCase().replace(/[^a-z0-9]/g,'');
const common=[['source','Source'],['requirements','Requirements']];
const physical=[['quantity','Quantity'],['encumbrance','Encumbrance'],['price','Price'],['damageformula','Damage Formula'],['skill','Test Skill'],['range','Range'],['qualities','Qualities'],['armorbonus','Armor / Shield Bonus']];
const technique=[['techniquetype','Technique Type'],['rank','Rank'],['nature','Element / Nature'],['chakracost','Chakra Cost'],['actioncost','Action Point Cost'],['duration','Duration'],['actiontype','Action Type'],['range','Range'],['skill','Test Skill'],['damageformula','Damage Formula']];
export class EocImporter extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={classes:['eoc','eoc-importer'],position:{width:850,height:850},window:{title:'EoC NPC & Item Importer',resizable:true},actions:{mode:EocImporter.setMode,preview:EocImporter.preview,create:EocImporter.create,openCreated:EocImporter.openCreated}};
 static PARTS={main:{template:`systems/${SYSTEM_ID}/templates/importer.hbs`,scrollable:['','.eoc-import-preview']}};
 constructor(kind='npc'){super();this.kind=canImport(kind)?kind:kind==='npc'?'item':'npc';this.mode='fields';this.fields={type:'gear',audience:'antagonist',actiontype:'Special'};this.text='';this.folder='';this.plan=null;this.created=[];this.busy=false;this.error='';}
 async _prepareContext(options){
  const itemType=this.fields.type,labels=[...common,...(PHYSICAL_TYPES.includes(itemType)?physical:[]),...(JUTSU_TYPES.includes(itemType)?technique:[]),...(itemType==='trait'?[['audience','Trait Audience (player / antagonist)'],['actioncost','Action Point Cost'],['misfortunecost','Misfortune Cost']]:[])];
  const field=([key,label])=>({key,label,value:this.fields[key]??''});
  if(itemType==='profession'&&!this.talentChoices)this.talentChoices=await talentOptions();
  return {...await super._prepareContext(options),npc:this.kind==='npc',kind:this.kind,mode:this.mode,fieldMode:this.mode==='fields',fields:this.fields,text:this.text,folder:this.folder,
   attributes:Object.entries(ATTRIBUTES).map(field),stats:NPC_STAT_LABELS.map(label=>field([id(label),label])),itemFields:labels.map(field),trait:itemType==='trait',traitActions:['Combat','Non-Combat','Special'],technique:JUTSU_TYPES.includes(itemType),itemTypes:Object.fromEntries(ITEM_TYPES.map(type=>[type,game.i18n.localize(`TYPES.Item.${type}`)])),
   sections:[['skills','Skill Ranks'],['attacks','Attacks'],['techniques','Techniques'],['traits','Traits']].map(pair=>({...field(pair),placeholder:{skills:'* Athletics +10\n* Awareness +10',attacks:'* Bite: 55% - Distance (Melee Engaged) - Damage (2d6+5) - Vicious',techniques:'* Wind Scythe (3 AP): 55% - 4 Chakra - Ray\n   * Describe the effect here.',traits:'* Maul (3 Misfortune, 3 AP, Combat Action): Make three attacks.'}[pair[0]]})),outcomes:[['criticalsuccess','Critical Success'],['criticalfailure','Critical Failure'],['sublimesuccess','Sublime Success'],['sublimefailure','Sublime Failure']].map(field),
   folders:(game.folders?.contents??[]).filter(f=>f.type===(this.kind==='npc'?'Actor':'Item')).map(f=>({id:f.id,label:f.name})),canNPC:canImport('npc'),canItem:canImport('item'),busy:this.busy,canCreate:!this.busy&&Boolean(this.plan),error:this.error,
   heritage:itemType==='heritage',heritageModifiers:Object.entries(ATTRIBUTES).map(([attribute,label])=>field([`heritage${attribute}`,`${label} Bonus`])),heritageGroups:[['boon','Boons'],['bane','Banes']].map(([prefix,label])=>({label,rows:[1,2,3].map(tier=>({tierLabel:{1:'Genin',2:'Chunin',3:'Jonin'}[tier],name:field([`${prefix}${tier}name`,'Name']),description:field([`${prefix}${tier}description`,'Description'])}))})),profession:itemType==='profession',talentChoices:this.talentChoices??[],skillChoices:Object.fromEntries(SKILLS.map(skill=>[skill.label,skill.label])),bonusChoices:ATTRIBUTES,
   professionGroups:[['skill','10 Skill Ranks',10],['bonus','7 Bonus Advances',7],['talent','3 Talents',3]].map(([prefix,label,count])=>({label,skill:prefix==='skill',bonus:prefix==='bonus',slots:Array.from({length:count},(_,i)=>({...field([`${prefix}${i}`,`${prefix==='skill'?'Skill':prefix==='bonus'?'Bonus':'Talent'} ${i+1}`])}))})),
   preview:this.plan?.map(({data,warnings})=>({name:data.name,type:data.type,attributes:data.type==='npc'?Object.entries(data.system.attributes).map(([key,value])=>`${ATTRIBUTES[key]} ${value}`).join(' · '):'',details:JSON.stringify(data,null,2),items:data.items?.map(item=>`${item.name} (${item.type})`).join(', '),warnings})),created:this.created.map((doc,index)=>({name:doc.name,index}))};
 }
 async _onRender(context,options){
  await super._onRender(context,options);
  for(const input of this.element.querySelectorAll('[data-import-field]'))input.addEventListener('input',()=>{this.fields[input.dataset.importField]=input.value;this.invalidate();});
  this.element.querySelector('[data-import-field="type"]')?.addEventListener('change',()=>this.render());
  this.element.querySelector('[data-import-text]')?.addEventListener('input',event=>{this.text=event.target.value;this.invalidate();});
  this.element.querySelector('[data-import-kind]')?.addEventListener('change',event=>{this.kind=event.target.value;this.folder='';this.invalidate();this.render();});
  this.element.querySelector('[data-import-folder]')?.addEventListener('change',event=>{this.folder=event.target.value;});
 }
 invalidate(){this.plan=null;this.error='';this.element.querySelector('[data-action="create"]')?.setAttribute('disabled','');for(const node of this.element.querySelectorAll('.eoc-import-preview'))node.remove();}
 static setMode(event,target){if(this.busy)return;this.mode=target.dataset.mode;this.invalidate();this.render();}
 static async preview(){
  if(this.busy)return;this.busy=true;this.plan=null;this.error='';this.render();
  try{this.plan=await prepareImport({kind:this.kind,mode:this.mode,fields:{...this.fields},text:this.text});}catch(error){this.error=error.message;}
  finally{this.busy=false;this.render();}
 }
 static async create(){
  if(this.busy||!this.plan)return;this.busy=true;const plan=this.plan;this.plan=null;this.render();
  try{this.created=await createImport(plan,this.kind,this.folder);ui.notifications.info(`Imported ${this.created.length} ${this.kind==='npc'?'NPC(s)':'Item(s)'}.`);}catch(error){this.error=error.message;}
  finally{this.busy=false;this.render();}
 }
 static openCreated(event,target){this.created[Number(target.dataset.index)]?.sheet?.render(true);}
}
export function addImportButton(kind,app,html){
 if(!canImport(kind))return;const root=html instanceof HTMLElement?html:app.element;if(!root||root.querySelector('.eoc-import-button'))return;
 const button=document.createElement('button');button.type='button';button.className='eoc-import-button';button.textContent=kind==='npc'?'Import NPCs':'Import Items';button.addEventListener('click',()=>new EocImporter(kind).render(true));
 (root.querySelector('.directory-header')??root.querySelector('header')??root).append(button);
}
