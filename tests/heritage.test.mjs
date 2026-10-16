import test from "node:test";
import assert from "node:assert/strict";
import {migrateHeritageData,heritageBonusValues,updateHeritageList,changeHeritageList} from "../scripts/heritage.mjs";
test("legacy Heritage bonuses and tier descriptions become editable rows",()=>{
 const converted=migrateHeritageData({bonusModifiers:{combat:1,brawn:-1},bonusChoices:"Old field",attributeModifiers:{agility:10},skillModifiers:{athletics:10},boonName:"Blood & Fire",baneName:"Fire & Ash",tiers:{genin:{boon:"Genin benefit",bane:"Genin drawback"},chunin:{boon:"Chunin benefit"},jonin:{bane:"Jonin drawback"}}});
 assert.deepEqual(converted.modifiers,[{attribute:"combat",value:1},{attribute:"brawn",value:-1}]);assert.equal(converted.boons[1].tier,2);assert.equal(converted.banes[1].description,"Jonin drawback");
 for(const key of ["bonusChoices","attributeModifiers","skillModifiers","tiers"])assert.equal(key in converted,false);
 assert.deepEqual(migrateHeritageData({...converted,modifiers:[],boons:[],banes:[]}).boons,[]);
});
test("signed modifier edits, rapid changes, and add/remove controls preserve rows",async()=>{
 const item={type:"heritage",isOwner:true,system:{modifiers:[{attribute:"combat",value:1}],boons:[],banes:[]},update:async change=>{await Promise.resolve();for(const [key,value] of Object.entries(change))item.system[key.split('.').at(-1)]=value;}};
 await Promise.all([updateHeritageList(item,"modifiers",0,"attribute","brawn"),updateHeritageList(item,"modifiers",0,"value",-2)]);
 assert.deepEqual(item.system.modifiers,[{attribute:"brawn",value:-2}]);assert.equal(heritageBonusValues(item.system).brawn,-2);
 await changeHeritageList(item,"modifiers");assert.equal(item.system.modifiers.length,2);await changeHeritageList(item,"modifiers",0);assert.equal(item.system.modifiers[0].value,0);
 for(const list of ["boons","banes"]){await changeHeritageList(item,list);await updateHeritageList(item,list,0,"tier",3);await updateHeritageList(item,list,0,"description","Tier rule");assert.equal(item.system[list][0].tier,3);await changeHeritageList(item,list,0);assert.equal(item.system[list].length,0);}
 assert.equal(await updateHeritageList(item,"modifiers",0,"attribute","unknown"),false);assert.equal(await updateHeritageList(item,"modifiers",0,"value",2.5),false);
 item.isOwner=false;assert.equal(await changeHeritageList(item,"boons"),false);
});
