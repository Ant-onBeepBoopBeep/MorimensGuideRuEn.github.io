import sys, os, json, re, glob
from bs4 import BeautifulSoup, NavigableString
src = sys.argv[1]; out = sys.argv[2]

def txt(el):
    if el is None: return ''
    t = el.get_text(' ', strip=True)
    t = re.sub(r'\s+([,.;:!?)])', r'\1', t)
    t = re.sub(r'\(\s+', '(', t)
    return re.sub(r'\s+', ' ', t).strip()

def block(info, title):
    for h in info.find_all('h3'):
        if h.get_text(strip=True) == title:
            return h.find_parent('div')
    return None

def articles(blk):
    res = []
    if not blk: return res
    for a in blk.find_all('article'):
        h4 = a.find('h4')
        badges = []
        hdr = h4.find_parent('div').find_parent('div') if h4 else None
        if hdr:
            badges = [txt(b) for b in hdr.find_all('span') if txt(b)]
        body = a.find('div', class_='space-y-3') or a
        texts = []
        for d in body.find_all('div', recursive=False):
            if d.find('details') and not d.get_text(strip=True).startswith('Scaling') : pass
            if d.name=='div' and 'text-sm' in (d.get('class') or []):
                texts.append(txt(d))
        if not texts:
            # fallback: first text-sm div anywhere not inside details
            for d in a.find_all('div', class_='text-sm'):
                if not d.find_parent('details'): texts.append(txt(d))
        res.append({'name': txt(h4), 'badges': badges, 'texts': texts})
    return res

chars = []
for f in sorted(glob.glob(os.path.join(src, '*.html'))):
    slug = os.path.basename(f)[:-5]
    s = BeautifulSoup(open(f).read(), 'html.parser')
    main = s.find('main')
    h2 = main.find('h2')
    hero = h2.find_parent('div')
    sub = hero.find('p')
    badges = [txt(b) for b in hero.select('div.flex > span')][:6]
    tagrow = hero.find('div', class_='mt-3')
    tags = [txt(b) for b in tagrow.find_all('span')] if tagrow else []
    ps = hero.find_all('p')
    desc = txt(ps[-1]) if ps else ''
    epithet = txt(ps[0]) if len(ps) > 1 else ''
    rar = next((b for b in badges if b in ('UR','SSR','SR','R','Genesis')), '')
    realm = next((b for b in badges if b in ('Chaos','Aequor','Caro','Ultra')), '')
    role = next((b for b in badges if b not in (rar, realm)), '')
    c = {'slug': slug, 'name': txt(h2), 'epithet': epithet, 'rarity': rar, 'realm': realm, 'role': role, 'tags': tags, 'desc': desc}
    build = main.find('section', id='section-build')
    c['playstyle'] = []
    if build:
        pb = block(build, 'Playstyle')
        if pb:
            d = pb.find('div', class_='text-sm')
            if d:
                for br in d.find_all('br'): br.replace_with('\u2029')
                raw = d.get_text(' ')
                c['playstyle'] = [re.sub(r'\s+([,.;:!?)])', r'\1', re.sub(r'\s+', ' ', x)).strip() for x in raw.split('\u2029') if x.strip()]
            else: c['playstyle'] = []
        def links(kind):
            return [txt(a) for a in build.select(f'a[href*="/{kind}/"]')]
        c['wheels'] = links('wheels'); c['covenants'] = links('covenants'); c['posse'] = links('posses')
    info = main.find('section', id='section-info')
    prof = {}
    pb = block(info, 'Profile')
    if pb:
        for d in pb.find_all('div'):
            dt, dd = d.find('dt'), d.find('dd')
            if dt and dd: prof[txt(dt)] = txt(dd)
    c['profile'] = prof
    st = {}
    sb = block(info, 'Stats')
    if sb is not None and sb.find_parent('div') is not None: sb = sb.find_parent('div')
    if sb:
        t = [x.strip() for x in sb.get_text('\n').split('\n') if x.strip()]
        for k in ['CON','ATK','DEF','Base Aliemus','Crit. Rate','Crit. DMG','Realm Mastery','Aliemus Regen Lv.','Keyflare Regen Lv.','DMG Amplification','Death Resistance','Sigil Yield']:
            if k in t:
                v = t[t.index(k)+1]
                try:
                    fv = float(v); v = str(round(fv,1)).rstrip('0').rstrip('.') if '.' in v else v
                except: pass
                st[k] = v
    c['stats'] = st
    di = block(info, 'Dimensional Image')
    c['dimimage'] = [{'name': x['name'], 'text': (x['texts'] or [''])[0]} for x in articles(di)]
    c['cards'] = articles(block(info, 'Cards'))
    c['exalts'] = articles(block(info, 'Exalts'))
    # Enlightens: parse as text lines
    eb = block(info, 'Enlightens')
    ens = []
    if eb:
        for a in eb.find_all(['article','li']):
            h = a.find(['h4','h5'])
            if h: ens.append({'name': txt(h), 'text': txt(a).replace(txt(h),'',1).strip()})
        if not ens:
            ens = [{'name':'', 'text': txt(eb).replace('Enlightens','',1).strip()}]
    c['enlightens'] = ens
    tb = block(info, 'Talents')
    tal = []
    if tb:
        for a in tb.find_all(['article','li']):
            h = a.find(['h4','h5'])
            if h: tal.append({'name': txt(h), 'text': txt(a).replace(txt(h),'',1).strip()})
    c['talents'] = tal
    lore = main.find('section', id='section-lore')
    arch = []
    if lore:
        ab = block(lore, 'Archive')
        if ab:
            for a in ab.find_all(['article','details']):
                h = a.find(['h4','h5','summary'])
                if h:
                    body = a.get_text('\n', strip=True).split('\n')
                    arch.append({'title': txt(h), 'text': '\n'.join(body[1:])})
    c['archive'] = arch
    chars.append(c)
json.dump(chars, open(out,'w'), ensure_ascii=False, indent=1)
print(len(chars))
