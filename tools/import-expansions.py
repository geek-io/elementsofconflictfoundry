"""Convert the user-supplied EoC expansion exports to reviewable source records."""
import html, json, pathlib, re
root=pathlib.Path(__file__).resolve().parents[1]
output=root/'data'/'expansions'
output.mkdir(parents=True,exist_ok=True)
lines=(root/'tmp/jutsu-expansion.txt').read_text('utf-8-sig').splitlines()
starts=[]
for i,line in enumerate(lines):
    if re.match(r'^\s*\*\s*Type:',line):
        previous=i-1
        while previous>=0 and not lines[previous].strip(): previous-=1
        starts.append((previous,i))
keys=['Type','Nature','Rank','Chakra Cost','Duration','Action Cost','Action Type','Range','Description','Critical Success','Critical Failure','Supreme Success','Supreme Failure','Sublime Success','Sublime Failure']
records=[]
for index,(start,type_start) in enumerate(starts):
    name=re.sub(r'^\s*\*?\s*Name:\s*','',lines[start]).strip()
    if not name or name.startswith(('Template','Bukijutsu ','Genjutsu ','*','Name of Technique.')): continue
    end=starts[index+1][0] if index+1<len(starts) else len(lines)
    raw='\n'.join(lines[type_start:end]).strip()
    fields={}
    matches=list(re.finditer(r'^\s*\*\s*('+'|'.join(keys)+r'):[ \t]*(.*)',raw,re.M))
    for j,match in enumerate(matches):
        value=raw[match.start(2):matches[j+1].start() if j+1<len(matches) else len(raw)].strip()
        fields[match[1]]=value
    if not fields.get('Type') or len(name)>110: continue
    # Exclude rank/section headings which follow the record's final field.
    for key,value in fields.items():
        fields[key]=re.split(r'\n\s*(?:[E-S]-Rank|Taijutsu [E-S]-Rank)\b',value)[0].strip()
    def first_number(value,default=0):
        match=re.search(r'\d+',value)
        return int(match[0]) if match else default
    cost=fields.get('Chakra Cost','')
    ap=fields.get('Action Cost','')
    ready=bool(fields.get('Description') and cost and ap and ap!='1/2/3' and not fields.get('Duration','').startswith('Instantaneous/Maintained'))
    skill=next((key for key in ['ninjutsu','genjutsu','bukijutsu','taijutsu','fuinjutsu'] if key in fields['Type'].lower()),'ninjutsu')
    description=''.join('<h3>'+html.escape(key)+'</h3><p>'+html.escape(value).replace('\n','<br>')+'</p>' for key,value in fields.items() if value and key not in keys[9:])
    system={'description':description,'source':'EoC Jutsu Expansion','jutsuType':fields['Type'],'nature':fields.get('Nature','Neutral'),'jutsuRank':fields.get('Rank','E').strip(),'skill':skill,'chakraCost':first_number(cost),'chakraCostText':cost,'actionCost':min(3,first_number(ap,1)),'actionCostText':ap,'actionType':fields.get('Action Type',''),'duration':fields.get('Duration',''),'range':fields.get('Range',''),'configured':ready,'variableCost':not bool(re.fullmatch(r'\d+',cost)),'contentStatus':'ready' if ready else 'draft'}
    system.update({key:fields.get(label,fields.get(label.replace('Sublime','Supreme'),'')) for key,label in [('criticalSuccess','Critical Success'),('criticalFailure','Critical Failure'),('sublimeSuccess','Sublime Success'),('sublimeFailure','Sublime Failure')]})
    damage=re.search(r'\((\d+d\d+)\s*\+\s*\[([A-Z]B)\]\)\s*(?:Peril\s+)?damage',fields.get('Description',''))
    if damage:
        bonus={'CB':'combat','BB':'brawn','AB':'agility','PB':'perception','IB':'intelligence','WB':'willpower','FB':'fellowship'}[damage[2]]
        faces=damage[1].split('d')[1]
        system['damageFormula']=damage[1]+'x'+faces+' + @bonuses.'+bonus
    records.append({'name':name,'type':'jutsu','system':system})
(output/'jutsu.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Jutsu:',len(records),'ready:',sum(r['system']['configured'] for r in records))

# Delegate Heritage parsing to the tier-aware importer.
import runpy
runpy.run_path(str(root/'tools/import-heritages.py'),run_name='__main__')
