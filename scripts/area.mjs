import {plainRules} from './tooltips.mjs?v=0.3.15';
export function techniqueArea(item){
 const s=item.system,rule=plainRules(s.rangeText||s.range||''),shape=s.template||(/\bSpread\b/i.test(s.qualities||'')?'Cone':'')||(/\b(Explosion|Burst|Blast|Ray|Cone)\b/i.exec(rule)?.[1]??'');
 if(!shape)return null;
 const type=shape.toLowerCase(),circle=['burst','blast','explosion'].includes(type);
 const diameter=Number(rule.match(/(\d+)\s*[- ]?paces?\s*(?:diameter|wide)/i)?.[1]);
 const rangeMax=Number(rule.match(/\d+\s*[-–]\s*(\d+)\s*paces?/i)?.[1]);
 return {type:circle?'circle':type,length:s.areaLength>0?s.areaLength:circle?(diameter?diameter/2:type==='explosion'?5:3):rangeMax|| (type==='ray'?10:16),
  width:s.areaWidth>0?s.areaWidth:type==='ray'?2:5,startWidth:s.areaStartWidth>0?s.areaStartWidth:1};
}
export function areaContains(area,origin,point,angle=0){
 const dx=point.x-origin.x,dy=point.y-origin.y,c=Math.cos(angle),s=Math.sin(angle),x=dx*c+dy*s,y=-dx*s+dy*c;
 if(area.type==='circle')return dx*dx+dy*dy<=area.length**2+1e-8;
 if(x<0||x>area.length)return false;
 const width=area.type==='ray'?area.width:area.startWidth+(area.width-area.startWidth)*x/area.length;
 return Math.abs(y)<=width/2+1e-8;
}
let cancelPreview;
export async function placeTechniqueArea(actor,item){
 const area=techniqueArea(item);if(!area)return true;
 if(!canvas.ready)throw Error('Open a Scene to place this Technique’s area.');
 cancelPreview?.();
 const token=actor.getActiveTokens().find(t=>t.controlled)||actor.getActiveTokens()[0];
 if(area.type!=='circle'&&!token)throw Error('Place this character’s token on the Scene first.');
 const scale=canvas.grid.size/canvas.grid.distance;
 const a=Object.fromEntries(Object.entries(area).map(([k,v])=>[k,typeof v==='number'?v*scale:v]));
 const graphic=new PIXI.Graphics();canvas.stage.addChild(graphic);
 const view=canvas.app.view;
 let origin=token?{...token.center}:{...canvas.mousePosition},angle=0,done=false;
 const draw=()=>{
  graphic.clear().lineStyle(2,0xf0c76a,0.95).beginFill(0xf0c76a,0.2);
  if(a.type==='circle')graphic.drawCircle(origin.x,origin.y,a.length);
  else{const w=a.type==='ray'?a.width:a.startWidth;const points=[[0,-w/2],[a.length,-a.width/2],[a.length,a.width/2],[0,w/2]].flatMap(([x,y])=>[origin.x+x*Math.cos(angle)-y*Math.sin(angle),origin.y+x*Math.sin(angle)+y*Math.cos(angle)]);graphic.drawPolygon(points);}
  graphic.endFill();
 };
 draw();ui.notifications.info('Place area: move to position / aim, left-click to target, Escape or right-click to cancel. Token centers determine coverage.');
 return new Promise(resolve=>{
  const finish=value=>{if(done)return;done=true;view.removeEventListener('pointermove',move,true);view.removeEventListener('pointerdown',click,true);document.removeEventListener('keydown',key,true);view.removeEventListener('contextmenu',context,true);graphic.destroy();cancelPreview=null;resolve(value);};
  const move=e=>{e.stopImmediatePropagation();const global=new PIXI.Point();canvas.app.renderer.events.mapPositionToPoint(global,e.clientX,e.clientY);const p=canvas.stage.toLocal(global);if(a.type==='circle')origin={x:p.x,y:p.y};else angle=Math.atan2(p.y-origin.y,p.x-origin.x);draw();};
  const click=e=>{e.preventDefault();e.stopImmediatePropagation();if(e.button===2){view.addEventListener('contextmenu',event=>event.preventDefault(),{capture:true,once:true});return finish(false);}if(e.button!==0)return;
   const ids=canvas.tokens.placeables.filter(t=>t.actor&&t.isVisible&&(a.type==='circle'||t.id!==token?.id)&&areaContains(a,origin,t.center,angle)).map(t=>t.id);
   try{canvas.tokens.setTargets(ids,{mode:'replace'});finish(true);}catch(error){ui.notifications.error(error.message);finish(false);}
  };
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);}};
  const context=e=>{e.preventDefault();e.stopPropagation();finish(false);};
  // Capture DOM input before token/placeable listeners can select, move, or consume it.
  view.addEventListener('pointermove',move,true);view.addEventListener('pointerdown',click,true);document.addEventListener('keydown',key,true);view.addEventListener('contextmenu',context,true);cancelPreview=()=>finish(false);
 });
}
