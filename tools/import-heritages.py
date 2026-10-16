"""Import every named Heritage, preserving supplied tier boons/banes and unfinished rules."""
import html, json, pathlib, re
root=pathlib.Path(__file__).resolve().parents[1]
lines=(root/'tmp/heritage-expansion.txt').read_text('utf-8-sig').splitlines()
codes={'CB':'combat','BB':'brawn','AB':'agility','PB':'perception','IB':'intelligence','WB':'willpower','FB':'fellowship'}
headings=[]
for index,line in enumerate(lines):
    name=line.strip()
    if not name or name.startswith('*'):continue
    if (' -' in name and len(name)<95) or '✅' in name or name in ['Inuzuka','Kurama','Yamanaka']:
        headings.append((index,name.replace('✅','').strip().rstrip(' -')))
records=[]
for offset,(start,name) in enumerate(headings):
    if name.startswith('Heritage Template'):continue
    end=headings[offset+1][0] if offset+1<len(headings) else len(lines)
    body='\n'.join(lines[start+1:end]).strip()
    body=re.split(r'\n\s*(?:Hidden Leaf Expansion|Konoha Animal Companions|Inuzuka Ninken|Doujutsu Rules|Boons\n)',body)[0].strip()
    modifiers=[]
    for sign,count,attributes in re.findall(r'^\s*\*\s*([+-])(\d+)\s+([^\n]+)',body,re.M):
        for code in re.findall(r'\[([A-Z]B)\]',attributes):
            if code in codes:modifiers.append({'attribute':codes[code],'value':int(count)*(1 if sign=='+' else -1)})
    benefits={'boons':[],'banes':[]}
    side=None
    benefit_name=''
    for part in re.split(r'(?m)(?=^\s*\*\s*(?:\*\s*)?(?:Boons|Banes):|^\s*\*\s*(?:Genin|Chunin|Jonin) Tier\s*-)',body):
        header=re.match(r'\s*\*\s*(?:\*\s*)?(Boons|Banes):\s*([^\n]*)',part)
        if header:
            side=header[1].lower()
            benefit_name=header[2].strip()
            continue
        tier=re.match(r'\s*\*\s*(Genin|Chunin|Jonin) Tier\s*-\s*(.*)',part,re.S)
        if tier and side:
            value=tier[2].strip()
            benefits[side].append({'name':benefit_name,'tier':['Genin','Chunin','Jonin'].index(tier[1])+1,'description':value})
    group='Core' if start < next(i for i,line in enumerate(lines) if line.strip()=='Hidden Leaf Expansion') else ('Hidden Leaf' if start < next(i for i,line in enumerate(lines) if line.startswith('Hozuki -')) else 'Other Heritages')
    ready=not ('???' in body or '[?B]' in body)
    records.append({'name':name,'type':'heritage','system':{'description':'<p>'+html.escape(body).replace('\n','<br>')+'</p>','source':'EoC Core Heritage Expansion','category':group,'modifiers':modifiers,**benefits,'contentStatus':'ready' if ready else 'draft','heritageEnabled':True}})
output=root/'data/expansions/heritages.json'
output.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Heritages:',len(records),'Boons:',sum(len(r['system']['boons']) for r in records),'Banes:',sum(len(r['system']['banes']) for r in records))
for record in records:
    for side in ['boons','banes']:
        assert len({row['tier'] for row in record['system'][side]})==len(record['system'][side]),record['name']
