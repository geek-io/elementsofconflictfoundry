"""Vendor licensed RPG-Awesome UI glyphs and selected Game-icons.net document images."""
import json, pathlib, re, urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'EoC-icon-import'}),timeout=45).read()
assets=root/'assets/rpg-awesome'
(assets/'fonts').mkdir(parents=True,exist_ok=True)
(assets/'css').mkdir(exist_ok=True)
base='https://raw.githubusercontent.com/nagoshiashumari/Rpg-Awesome/master/'
css=fetch(base+'css/rpg-awesome.css').decode('utf8')
# Only bundle the modern browser WOFF asset; keep the upstream glyph definitions.
css=re.sub(r'  src:.*?\n  font-weight:', '  src: url("../fonts/rpgawesome-webfont.woff") format("woff");\n  font-weight:',css,flags=re.S)
(assets/'css/rpg-awesome.css').write_text(css,encoding='utf8')
(assets/'fonts/rpgawesome-webfont.woff').write_bytes(fetch(base+'fonts/rpgawesome-webfont.woff'))
(root/'licenses/RPG-Awesome-BSD-2-Clause.txt').write_bytes(fetch(base+'LICENSE.md'))
(root/'licenses/Game-icons-CC-BY-3.0.txt').write_bytes(fetch('https://creativecommons.org/licenses/by/3.0/legalcode.txt'))
ofl=fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/abel/OFL.txt').decode('utf8')
ofl=ofl[ofl.index('SIL OPEN FONT LICENSE'):]
(root/'licenses/RPG-Awesome-OFL-1.1.txt').write_text('RPG Awesome font by Daniela Howe and Ivan Montiel.\n'+ofl,encoding='utf8')
mit='''RPG Awesome CSS and Sass by Daniela Howe and Ivan Montiel.

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
'''
(root/'licenses/RPG-Awesome-MIT.txt').write_text(mit,encoding='utf8')
mapping={
 'gear':'delapouite/backpack','weapon':'lorc/broadsword','armor':'delapouite/leather-armor',
 'medicine':'delapouite/health-potion','tool':'lorc/hammer-nails','trapping':'delapouite/backpack',
 'technique':'lorc/scroll-unfurled','jutsu':'lorc/scroll-unfurled','heritage':'lorc/dna1','ancestry':'lorc/dna1',
 'profession':'lorc/book-aura','talent':'lorc/star-swirl','trait':'lorc/meditation','skill':'delapouite/skills',
 'condition':'lorc/broken-heart','disease':'lorc/poison-bottle','disorder':'lorc/brain',
 'drawback':'lorc/broken-heart','injury':'lorc/sword-wound','quality':'lorc/star-swirl',
 'ritual':'lorc/tied-scroll','spell':'lorc/magic-swirl','taint':'lorc/skull-crack','uniqueAdvance':'delapouite/skills',
 'bukijutsu':'lorc/daggers','genjutsu':'lorc/eye-shield','ninjutsu':'lorc/fireball','taijutsu':'lorc/fist','fuinjutsu':'delapouite/knot'
}
cache={}
credits=[]
for target,path in mapping.items():
    if path not in cache:
        cache[path]=fetch('https://raw.githubusercontent.com/game-icons/icons/master/'+path+'.svg')
    (root/'icons'/f'{target}.svg').write_bytes(cache[path])
    author,icon=path.split('/')
    credits.append({'file':f'icons/{target}.svg','author':'Lorc' if author=='lorc' else 'Delapouite','title':icon,'url':f'https://game-icons.net/1x1/{author}/{icon}.html','license':'CC-BY-3.0','modified':False})
(root/'data/icon-attribution.json').write_text(json.dumps(credits,indent=2)+'\n',encoding='utf8')
notice='''# Icon credits and licenses

[RPG-Awesome](https://github.com/nagoshiashumari/Rpg-Awesome) by Daniela Howe and Ivan Montiel supplies the sheet UI glyphs. The upstream repository includes the [BSD 2-Clause Simplified license](licenses/RPG-Awesome-BSD-2-Clause.txt); its font and CSS additionally specify [SIL OFL 1.1](licenses/RPG-Awesome-OFL-1.1.txt) and [MIT](licenses/RPG-Awesome-MIT.txt), respectively. All these notices ship with the system. The CSS font loader was reduced to the bundled WOFF asset; glyph designs are unchanged.

Document and Technique discipline images are made by Lorc and Delapouite, available on [Game-icons.net](https://game-icons.net), under [Creative Commons Attribution 3.0 Unported](licenses/Game-icons-CC-BY-3.0.txt) ([license page](https://creativecommons.org/licenses/by/3.0/)). The SVG artwork is unmodified; filenames are adapted for the system's item types.

| System image | Original icon | Author |
| --- | --- | --- |
'''
notice+='\n'.join(f'| `{row["file"]}` | [{row["title"]}]({row["url"]}) | {row["author"]} |' for row in credits)+'\n'
(root/'ICON-CREDITS.md').write_text(notice,encoding='utf8')
print('Installed RPG-Awesome UI font and',len(mapping),'Game-icons.net images with licenses and attribution.')
