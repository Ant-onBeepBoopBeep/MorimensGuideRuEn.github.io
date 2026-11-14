import glob, os, json, re, sys
from bs4 import BeautifulSoup
base = sys.argv[1]
def lines(f):
    s = BeautifulSoup(open(f).read(), 'html.parser'); m = s.find('main')
    for x in m(['script','style','svg','nav']): x.decompose()
    for br in m.find_all(['p','div','li','h1','h2','h3','h4','dt','dd','span']): pass
    return [l for l in m.get_text('\n', strip=True).split('\n')]
def join(ls):
    t = ' '.join(ls)
    t = re.sub(r'\s+([,.;:!?)])', r'\1', t); return re.sub(r'\s+', ' ', t).strip()
wheels = []
for f in sorted(glob.glob(base + '/wheels/*.html')):
    L = lines(f)
    try:
        i = L.index('Last updated:')
        name = L[i+3] if False else None
    except ValueError: continue
    # header block after description line
    j = next(k for k in range(len(L)) if L[k].startswith('Effect') and k > 3)
    head = L[i+3:j]
    # head like: [desc2, name, rarity, stat, val, (realm), 'Signature wheel of', who]
    head = head + ['']*6
    name = head[0]; rar = head[1]
    if head[2] in ('Chaos','Aequor','Caro','Ultra','Signature wheel of',''): stat=''; val=''; rest=head[2:]
    else: stat = head[2]; val = head[3]; rest = head[4:]
    realm = ''; sig = ''
    if rest and rest[0] in ('Chaos','Aequor','Caro','Ultra'): realm = rest[0]; rest = rest[1:]
    if 'Signature wheel of' in rest: sig = rest[rest.index('Signature wheel of')+1]
    k = L.index('Main Stat') if 'Main Stat' in L else len(L)
    eff = L[j+2:k]
    # split into sentences on lines ending with '.' or ')'
    effs, cur = [], []
    for x in eff:
        cur.append(x)
        if x.endswith('.') or x.endswith(')'):
            effs.append(join(cur)); cur = []
    if cur: effs.append(join(cur))
    effs = [e for e in effs if e]
    cut = next((i for i, e in enumerate(effs) if e.startswith('Lore') or e.startswith('If this page') or e == 'Support on Ko-fi'), None)
    if cut is not None: effs = effs[:cut]
    lore = ''
    if 'Lore' in L:
        li = L.index('Lore'); le = next((k for k in range(li, len(L)) if L[k].startswith('If this page')), len(L))
        lore = '\n'.join(L[li+1:le])
    wheels.append(dict(slug=os.path.basename(f)[:-5], name=name, rarity=rar, stat=stat, val=val, realm=realm, sig=sig, eff=effs, lore=lore))
covs = []
for f in sorted(glob.glob(base + '/covs/*.html')):
    L = lines(f)
    i = L.index('Last updated:')
    name = L[i+3]; rar = L[i+4]
    p3 = L[L.index('3 pieces')+1]
    p6i = L.index('6 pieces', L.index('Set Bonuses'))
    p6e = L.index('Pieces', p6i)
    p6 = join(L[p6i+1:p6e])
    rec = []
    if 'Recommended For' in L:
        ri = L.index('Recommended For') + 2
        while ri < len(L) and L[ri] != 'Lore' and not L[ri].startswith('If this page'):
            rec.append(L[ri]); ri += 1
    covs.append(dict(slug=os.path.basename(f)[:-5], name=name, rarity=rar, p3=p3, p6=p6, rec=rec))
json.dump(dict(wheels=wheels, covs=covs), open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(wheels), len(covs))
