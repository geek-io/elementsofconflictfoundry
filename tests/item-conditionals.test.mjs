import test from 'node:test';
import assert from 'node:assert/strict';
import {itemConditionalRows,editConditionalBonus,conditionalBonus} from '../scripts/conditional-bonuses.mjs';
test('owned item conditionals include only supported types and selected Heritage, without changing their source',()=>{
 const row={id:'same',name:'When hidden',target:'all',value:10,enabled:true};
 const items=['talent','technique','heritage','heritage','weapon'].map((type,i)=>({id:String(i),name:`Source ${i}`,type,system:{conditionalBonuses:[{...row}]}}));
 const rows=itemConditionalRows(items,items[2]);
 assert.equal(rows.length,3);assert.equal(new Set(rows.map(r=>r.id)).size,3);
 assert.equal(conditionalBonus({conditionalBonuses:rows},'athletics'),30);
 assert.equal(items[0].system.conditionalBonuses[0].id,'same');
 assert.equal(itemConditionalRows(items,null).length,2);
});
test('character toggle edits source item; character edits never persist derived item rows',async()=>{
 const row={id:'row',name:'Bonus',target:'all',value:10,enabled:false};
 const item={documentName:'Item',id:'talent',type:'talent',isOwner:true,system:{conditionalBonuses:[row]},async update(data){this.system.conditionalBonuses=data['system.conditionalBonuses'];}};
 const actor={isOwner:true,items:new Map([[item.id,item]]),system:{conditionalBonuses:[{...row,id:'manual'},...itemConditionalRows([item])]},async update(data){this.system.conditionalBonuses=data['system.conditionalBonuses'];}};
 await editConditionalBonus(actor,{id:'item:talent:row',field:'enabled',value:true});
 assert.equal(item.system.conditionalBonuses[0].enabled,true);
 await editConditionalBonus(actor,{id:'manual',field:'value',value:-5});
 assert.equal(actor.system.conditionalBonuses.length,1);assert.equal(actor.system.conditionalBonuses[0].value,-5);
 await editConditionalBonus(actor,{id:'item:talent:row',remove:true});assert.equal(item.system.conditionalBonuses.length,0);
});
