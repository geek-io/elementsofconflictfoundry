"""Extract the supplied playtest's two-column Technique cards (shadow text deduplicated)."""
import html, json, pathlib, re, sys
import pdfplumber

root = pathlib.Path(__file__).resolve().parents[1]
pdf = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('C:/Users/drago/Downloads/EoC-Shinobi-Playtest_v1.0[nolink] (1).pdf')
cards = []
current = None
with pdfplumber.open(pdf) as book:
    for index in range(75, 100):
        page = book.pages[index].dedupe_chars(tolerance=1)
        for left, right in [(0, page.width/2), (page.width/2, page.width)]:
            for line in page.crop((left, 0, right, 740)).extract_text_lines():
                sizes = [char['size'] for char in line['chars']]
                text = line['text'].strip()
                heading = any(12.5 <= size <= 13.5 for size in sizes)
                if heading:
                    if current and not current['lines']:
                        current['name'] += ' ' + text
                    else:
                        current = {'name':text, 'page':index+1, 'lines':[]}
                        cards.append(current)
                elif max(sizes, default=0) < 12 and current:
                    current['lines'].append(text)

keys = ['Type', 'Nature', 'Rank', 'Chakra Cost', 'Duration', 'Action Cost', 'Action Type', 'Range']
outcome_labels=['Critical Success','Critical Failure','Sublime Success','Sublime Failure','Supreme Success','Supreme Failure']
records = []
for card in cards:
    fields, description, field, outcomes, outcome = {}, [], None, {}, None
    for line in card['lines']:
        special=re.match(r'^('+'|'.join(outcome_labels)+r'):\s*(.*)',line)
        if special:
            outcome=special[1];outcomes[outcome]=special[2];continue
        if outcome:
            outcomes[outcome]+=' '+line;continue
        match = re.match(r'^('+'|'.join(keys)+r')(?::\s*|\s+)(.*)', line)
        if match and not description:
            field = match[1]
            fields[field] = match[2]
        elif field == 'Range' or description:
            description.append(line)
        elif field:
            fields[field] += ' ' + line
    if not fields.get('Type'):
        raise ValueError('Missing Type on '+card['name'])
    def number(value, default=0):
        match = re.search(r'\d+',value)
        return int(match[0]) if match else default
    type_name = next((name for name in ['Bukijutsu','Genjutsu','Ninjutsu','Taijutsu','Fuinjutsu'] if fields['Type'].lower().startswith(name.lower()[:6])), None)
    if not type_name:
        raise ValueError('Unknown Type '+str(fields))
    chakra, actions = fields.get('Chakra Cost',''), fields.get('Action Cost','')
    duration = next((name for name in ['Instantaneous','Maintained','Passive','Internalized'] if name.lower() in fields.get('Duration','').lower()), 'Instantaneous')
    range_text = fields.get('Range','')
    range_value = next((name for name in ['Super Long','Long','Medium','Short','Touch','Self'] if range_text.lower().startswith(name.lower())), 'Custom')
    shape = next((name for name in ['Ray','Cone','Explosion'] if name.lower() in range_text.lower()), '')
    desc = ' '.join(description).strip().strip('"')
    if not desc:
        print('Source card has no Effect:',card['name'])
    rules = ''.join('<h3>'+html.escape(key)+'</h3><p>'+html.escape(value)+'</p>' for key,value in fields.items()) + '<h3>Effect</h3><p>'+html.escape(desc)+'</p>'
    variable = not bool(re.fullmatch(r'\d+',chakra)) or not bool(re.fullmatch(r'\d+',actions))
    ready = bool(desc) and not chakra.startswith('1-2 /')
    records.append({'name':card['name'],'type':'technique','system':{
        'description':rules,'source':f'EoC Shinobi Playtest v1.0, PDF p.{card["page"]}',
        'jutsuType':type_name,'nature':fields.get('Nature','Neutral'),'jutsuRank':fields['Rank'].strip()[0],'jutsuRankText':fields['Rank'].strip(),
        'skill':type_name.lower(),'chakraCost':number(chakra),'chakraCostText':chakra,'chakraCostMode':'pool' if 'Max Chakra Pool' in chakra else 'current',
        'actionCost':number(actions,1),'actionCostText':actions,'duration':duration,'durationText':fields.get('Duration',''),
        'actionType':fields.get('Action Type','Special').strip(),'range':range_value,'rangeText':range_text,'template':shape,
        'configured':ready,'variableCost':variable and 'Max Chakra Pool' not in chakra,'contentStatus':'ready' if ready else 'draft',
        **{key:outcomes.get(label,outcomes.get(label.replace('Sublime','Supreme'),'')) for key,label in [('criticalSuccess','Critical Success'),('criticalFailure','Critical Failure'),('sublimeSuccess','Sublime Success'),('sublimeFailure','Sublime Failure')]}
    }})
output = root/'data/book-techniques.json'
output.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(root/'tmp/book-technique-cards.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2),encoding='utf8')
print('Imported',len(records),'complete Technique cards:')
for type_name in ['Bukijutsu','Genjutsu','Ninjutsu','Taijutsu','Fuinjutsu']:
    selected = [record for record in records if record['system']['jutsuType']==type_name]
    print(type_name,len(selected))
print('Variable-cost entries:',sum(record['system']['variableCost'] for record in records))
