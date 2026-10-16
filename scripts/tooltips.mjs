export function plainRules(html='') {
 return String(html).replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g,'$1').replace(/<\s*(?:br|\/p|\/div|\/li|\/h[1-6])\s*[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,entity=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity])).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
export function abilityTooltip(item){
 if(!['talent','trait','technique'].includes(item.type))return '';
 const s=item.system;
 const details=item.type==='trait'?`${s.audience==='antagonist'?'Antagonist':'Player'} Trait · ${s.actionType||'Special'}\n${s.actionCost??0} AP · ${s.spendMisfortune?s.misfortuneCost??0:0} Misfortune`:item.type==='talent'?'Talent':`${s.jutsuType??'Technique'} · ${s.jutsuRank??''}-Rank · ${s.chakraCostText||s.chakraCost||0} Chakra · ${s.actionCostText||s.actionCost||0} AP\n${s.durationText||s.duration||''} · ${s.rangeText||s.range||''}`;
 return `${item.name}\n${details}\n${plainRules(s.description)||'No rules description entered.'}${s.source?'\n'+s.source:''}`;
}
const htmlEscape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function formatRulesTooltip(text){
 const lines=String(text).split('\n').map(line=>line.trim()).filter(Boolean),title=lines.shift()??'';
 const source=lines.at(-1)?.match(/^(EoC|PDF|Source:)/)?lines.pop():'';
 return `<div class="eoc-tooltip-title">${htmlEscape(title)}</div><div class="eoc-tooltip-body">${lines.map(line=>`<p>${htmlEscape(line)}</p>`).join('')}</div>${source?`<footer class="eoc-tooltip-source">${htmlEscape(source)}</footer>`:''}`;
}
export function techniqueRules(item){
 const html=String(item.system.description??'');
 const effect=html.match(/<h[1-6][^>]*>\s*(?:Effect|Description)\s*<\/h[1-6]>([\s\S]*?)(?=<h[1-6]|$)/i);
 return plainRules(effect?.[1]??html);
}
export function abilityTooltipHtml(item){
 if(!['talent','trait','technique'].includes(item.type))return '';
 if(item.type==='trait')return formatRulesTooltip(abilityTooltip(item));
 if(item.type==='talent')return formatRulesTooltip(`${item.name}\n${plainRules(item.system.description)}\n${item.system.source??''}`);
 const s=item.system;
 return formatRulesTooltip(`${item.name}\n${s.jutsuType} · ${s.jutsuRank}-Rank · ${s.nature||'Neutral'}\n${s.chakraCostText||s.chakraCost||0} Chakra · ${s.actionCostText||s.actionCost||0} AP · ${s.duration}\nRange: ${s.rangeText||s.range}\n${techniqueRules(item)}\n${s.source||''}`);
}
