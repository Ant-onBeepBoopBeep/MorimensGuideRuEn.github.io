import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import ru_guides as R
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]
chars = json.load(open(os.path.join(S, 'data.json')))
items = json.load(open(os.path.join(S, 'items.json')))
tier_of = {s: t for t, l in R.TIERS.items() for s in l}
wheel_by_name = {w['name']: w for w in items['wheels']}
res = []
for c in chars:
    g = R.G[c['slug']]
    ens = []
    for e in c['enlightens']:
        m = re.match(r'^(E\d)\s+(.*)$', e['text'])
        if m: ens.append({'lv': m.group(1), 'name': e['name'], 'text': m.group(2)})
        else:
            t = e['text']
            ens.append({'lv': 'OE', 'name': e['name'], 'text': t})
    tal = []
    for t in c['talents']:
        m = re.match(r'^(Max Lv\. \d+)\s+(.*)$', t['text'])
        tal.append({'name': t['name'], 'max': m.group(1) if m else '', 'text': m.group(2) if m else t['text']})
    sigw = [w['name'] for w in items['wheels'] if w['sig'] == c['name']]
    wl = sigw + [w for w in c.get('wheels', []) if w not in sigw]
    def card(x):
        cost = next((b.replace('Cost ', '') for b in x['badges'] if b.startswith('Cost ')), '')
        al = next((b for b in x['badges'] if 'Aliemus' in b), '')
        kinds = [b for b in x['badges'] if not b.startswith('Cost ') and 'Aliemus' not in b]
        return {'n': x['name'], 'c': cost, 'a': al, 'k': kinds, 't': (x['texts'] or [''])[0]}
    res.append(dict(
        s=c['slug'], n=c['name'], ru=g['ru'], ep=c['epithet'], r=c['rarity'], rl=c['realm'], ro=c['role'],
        tg=c['tags'], d=c['desc'], ps=c['playstyle'], w=wl[:6], cv=c.get('covenants', [])[:3], po=c.get('posse', []),
        pr=c['profile'], st=c['stats'], di=c['dimimage'], cards=[card(x) for x in c['cards']], ex=[card(x) for x in c['exalts']],
        en=ens, ta=tal, ar=c['archive'], tier=tier_of.get(c['slug'], ''),
        g=dict(sum=g['sum'], play=g['play'], pros=g['pros'], cons=g['cons'], syn=g['syn'], f=g['f'], inv=g['inv'])))
wheels = [dict(s=w['slug'], n=w['name'], r=w['rarity'], st=w['stat'], v=w['val'], rl=w['realm'], sig=w['sig'], e=w['eff']) for w in items['wheels']]
covs = [dict(s=c['slug'], n=c['name'], r=c['rarity'], p3=c['p3'], p6=c['p6'], rec=c['rec']) for c in items['covs']]
DB = dict(chars=res, wheels=wheels, covs=covs, updated='13.11.2026', version='V2.6.2')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    f.write('/* Данные: kaiden.gg (EN-описания навыков, лор, предметы) + авторские русские гайды. Собрано 13.11.2026 */\n')
    f.write('window.DB=' + json.dumps(DB, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(out, os.path.getsize(out))
