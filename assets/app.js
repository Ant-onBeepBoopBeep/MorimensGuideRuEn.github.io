/* Morimens — русский гайд. Одностраничное приложение на hash-маршрутах, без зависимостей. */
(function () {
  'use strict';
  const DB = window.DB, T = window.TXT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BY = Object.fromEntries(DB.chars.map(c => [c.s, c]));
  const BYNAME = Object.fromEntries(DB.chars.map(c => [c.n, c]));
  const WHEEL = Object.fromEntries(DB.wheels.map(w => [w.n, w]));
  const COV = Object.fromEntries(DB.covs.map(c => [c.n, c]));
  const REALMS = ['Chaos', 'Aequor', 'Caro', 'Ultra'];
  const ROLES = ['Attack', 'Defense', 'Assist'];
  const TIERS = ['S', 'A', 'B', 'C', 'D'];
  const view = $('#view');

  /* ---------- Мелкие помощники ---------- */
  const realmRu = r => (T.realms[r] || {}).ru || r;
  const roleRu = r => T.roles[r] || r;
  const tagRu = t => T.tags[t] || t;
  const initials = c => {
    const base = c.ru.replace(/[«»"]/g, '');
    return base.split(/[:\s]/)[0].slice(0, base.startsWith('24') ? 2 : 1);
  };
  const ava = (c, size = '') => `<span class="ava ${size} realm realm-${c.rl}" style="--c:var(--${c.rl.toLowerCase()})" aria-hidden="true">${esc(initials(c))}${c.r === 'Genesis' ? '<span class="gen">✦</span>' : ''}</span>`;
  const rar = r => r ? `<span class="badge r-${esc(r)}">${esc(r)}</span>` : '';
  const realmB = r => `<span class="badge rbadge realm realm-${r}">${esc((T.realms[r] || {}).glyph || '')} ${esc(realmRu(r).split(' ')[0])}</span>`;
  const roleB = r => `<span class="badge">${esc(roleRu(r))}</span>`;
  const tierB = t => t ? `<span class="tier tier-${t}" title="Тир ${t} по сводному рейтингу">${t}</span>` : `<span class="tier tier-none" title="Нет в сводном рейтинге">—</span>`;
  const featChip = f => T.feat[f] ? `<span class="chip" title="${esc(T.feat[f][0])}">${T.feat[f][1]} ${esc(T.feat[f][0])}</span>` : '';
  const charLink = (c, extra = '') => `<a class="mini realm-${c.rl}" style="--c:var(--${c.rl.toLowerCase()})" href="#/char/${c.s}${extra}">${ava(c, 'sm')}<span>${esc(c.ru)}</span></a>`;
  const norm = s => String(s).toLowerCase().replace(/ё/g, 'е');
  const matches = (c, q) => !q || norm(c.ru + ' ' + c.n + ' ' + c.tg.join(' ') + ' ' + c.tg.map(tagRu).join(' ') + ' ' + c.g.f.map(f => (T.feat[f] || [''])[0]).join(' ')).includes(norm(q));
  const tierRank = t => t ? TIERS.indexOf(t) : 9;

  /* Подсветка терминов в английских описаниях навыков */
  const KW = [
    ['Embryo Fusion', 'Слияние эмбрионов (Каро): при накоплении включает эффект Devour у Exalt'],
    ['Death Resistance', 'Сопротивление смерти: позволяет пережить смертельный удар'],
    ['Realm Mastery', 'Мастерство мира: усиливает мировые эффекты'],
    ['Over Exalt', 'Усиленный Exalt (открывается максимальным Озарением)'],
    ['Arithmetica', 'Арифметика — энергия для розыгрыша карт'],
    ['Aliemus', 'Алиемус — шкала Exalt (обычно 100)'],
    ['Keyflare', 'Ключесвет — общая шкала команды для Посса/Rouse'],
    ['Tentacles?', 'Щупальца (Эквор): атакуют вместе с персонажами'],
    ['Aftershock', 'Отголосок: эффект при сбросе карты'],
    ['Exalt', 'Exalt — ульта персонажа, тратит Алиемус'],
    ['Devour', 'Пожирание (Каро): доп. эффект Exalt при накопленных эмбрионах'],
    ['Rouse', 'Rouse: включает усиленный пассив персонажа'],
    ['Leap', 'Скачок (Ультра): альтернативный усиленный эффект'],
    ['Quasar', 'Квазар (Ультра): аналог Скачка'],
    ['Vulnerable', 'Уязвимость: цель получает больше урона'],
    ['Weakness', 'Слабость: цель наносит меньше урона'],
    ['Fragile', 'Хрупкость: цель получает меньше щитов'],
    ['Pierce', 'Пробивание: игнорирует щиты'],
    ['Exhaust', 'Истощение: карта удаляется после розыгрыша'],
    ['Retain', 'Удержание: карта не сбрасывается в конце хода'],
    ['Discover', 'Открытие: выбор из нескольких вариантов'],
    ['Poison', 'Яд: урон со временем'],
    ['Bleed', 'Кровотечение'],
    ['Counter', 'Контратака: урон атакующему'],
    ['STR', 'Сила: прибавка к урону'],
    ['Alert', 'Бдительность: прибавка к щитам'],
    ['Shield', 'Щит: поглощает урон'],
    ['Sacrifice', 'Жертва: отложенная потеря HP'],
    ['Stagnation', 'Стагнация: негативное состояние карт в руке']
  ];
  const KWRE = new RegExp('\\b(' + KW.map(k => k[0]).join('|') + ')\\b', 'g');
  const kwTitle = w => { for (const [k, t] of KW) { if (new RegExp('^' + k + '$').test(w)) return t; } return ''; };
  const kw = s => esc(s).replace(KWRE, m => `<span class="kw" title="${esc(kwTitle(m))}">${m}</span>`);

  /* ---------- Маршрутизация ---------- */
  const routes = {
    '': home, 'chars': charsPage, 'char': charPage, 'team': teamPage, 'tier': tierPage, 'lore': lorePage,
    'start': startPage, 'wheels': wheelsPage, 'covenants': covsPage, 'glossary': glossaryPage
  };
  function go() {
    const parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').map(decodeURIComponent);
    const key = parts[0] || '';
    const fn = routes[key] || notFound;
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === (key === 'char' ? 'chars' : key)));
    $('.nav').classList.remove('open');
    view.innerHTML = '';
    fn(parts.slice(1));
    if (!go.keepScroll) window.scrollTo(0, 0);
    go.keepScroll = false;
    view.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', go);
  const setHashQuiet = h => { history.replaceState(null, '', h); };

  /* ---------- Главная ---------- */
  function home() {
    const sTier = DB.chars.filter(c => c.tier === 'S');
    view.innerHTML = `
    <section class="hero">
      <div class="eye"></div>
      <div class="eyebrow">Morimens · ${esc(DB.version)} · гайд на русском</div>
      <h1>Путеводитель Хранителя</h1>
      <p class="lead">Подробные гайды по всем пробуждённым, конструктор команды с разбором сильных и слабых сторон, лор вселенной и справочник по механикам. Подходит и новичкам, и тем, кто давно играет.</p>
      <div class="row" style="margin-top:14px">
        <a class="btn pri" href="#/start">Я новичок — с чего начать?</a>
        <a class="btn" href="#/team">Собрать команду</a>
        <a class="btn" href="#/chars">Все персонажи</a>
      </div>
      <div class="stats-row">
        <div class="stat-big"><b>${DB.chars.length}</b><span>пробуждённых</span></div>
        <div class="stat-big"><b>${DB.wheels.length}</b><span>колёс судьбы</span></div>
        <div class="stat-big"><b>${DB.covs.length}</b><span>ковенант</span></div>
        <div class="stat-big"><b>${T.glossary.length}</b><span>терминов в глоссарии</span></div>
      </div>
    </section>

    <div class="section">
      <input class="input" id="qs" placeholder="Быстрый поиск: имя (рус/англ), механика, роль… например «Яд», «лечение», «Tawil»" autocomplete="off">
      <div id="qsr" class="grid g4" style="margin-top:10px"></div>
    </div>

    <section class="section"><h2>Разделы</h2>
      <div class="grid g3">
        ${[
          ['#/start', '🧭 Новичку', 'Основы боя, ресурсы, развитие персонажа, режимы игры, коды, частые ошибки.'],
          ['#/chars', '🃏 Персонажи', 'Каталог с фильтрами по миру, роли, редкости, тиру и механикам. Гайд по каждому.'],
          ['#/team', '⚙️ Конструктор команды', 'Соберите четвёрку и получите анализ: урон, живучесть, ресурсы, синергия, советы.'],
          ['#/tier', '🏆 Тир-лист', 'Сводный рейтинг сообщества с фильтром по миру.'],
          ['#/lore', '📜 Лор вселенной', 'Мифаг, Распад, Эоны, четыре мира и сюжет обеих арок.'],
          ['#/wheels', '☸ Колёса и ковенанты', 'Все колёса судьбы и ковенанты: эффекты, характеристики, кому подходят.']
        ].map(([h, t, d]) => `<a class="panel" href="${h}" style="color:inherit;text-decoration:none"><h3>${t}</h3><p class="muted" style="margin:0">${d}</p></a>`).join('')}
      </div>
    </section>

    <section class="section"><h2>Четыре мира</h2>
      <div class="grid g2">${REALMS.map(r => realmCard(r)).join('')}</div>
    </section>

    <section class="section"><h2>Верх сводного тир-листа</h2>
      <div class="chips" style="gap:8px">${sTier.map(c => charLink(c)).join('')}</div>
      <p class="faint" style="margin-top:8px">Рейтинг — ориентир, а не закон. Смотрите <a href="#/tier">тир-лист</a> и раздел «Сильные/слабые стороны» в гайдах.</p>
    </section>

    <section class="section"><h2>Что нового</h2>
      <div class="grid g3">
        <div class="panel"><span class="chip">V2.6.2 · октябрь 2026</span><h3 style="margin-top:8px">Вивиан и архивы предзаказа</h3><p class="muted">Добавлена пробуждённая Вивиан (в базе источника её пока нет, поэтому на сайте нет её страницы) и код <code>ZKWM-CRBY-ZXCK</code>.</p></div>
        <div class="panel"><span class="chip">V2.6.1 · сентябрь 2026</span><h3 style="margin-top:8px">Ожье: Клятвенный</h3><p class="muted">Генезис-защитник Хаоса копит «Undertow» и превращает его в защиту. <a href="#/char/ogier-oathbound">Гайд →</a></p></div>
        <div class="panel"><span class="chip">Полгода Arc 2</span><h3 style="margin-top:8px">Выбор персонажа Arc 2</h3><p class="muted">Персонажа Arc 2 можно получить бесплатно за 200 использований Posse. Кого брать, подскажут гайды <a href="#/char/doresain">Дорсейна</a>, <a href="#/char/doll-inferno">Долл: Инферно</a>, <a href="#/char/clementine">Клементины</a>.</p></div>
      </div>
    </section>`;
    const qs = $('#qs'), qsr = $('#qsr');
    qs.addEventListener('input', () => {
      const q = qs.value.trim();
      qsr.innerHTML = q ? (DB.chars.filter(c => matches(c, q)).slice(0, 12).map(cardHtml).join('') || '<div class="empty">Ничего не найдено</div>') : '';
    });
  }
  function realmCard(r) {
    const R = T.realms[r], list = DB.chars.filter(c => c.rl === r);
    return `<div class="panel realm realm-${r}" style="border-color:color-mix(in srgb,var(--${r.toLowerCase()}) 40%,var(--line))">
      <div class="row"><h3 style="margin:0;color:var(--${r.toLowerCase()})">${R.glyph} ${esc(R.ru)}</h3><span class="spacer"></span><span class="chip">${list.length} перс.</span></div>
      <p class="muted" style="margin:.4em 0"><b style="color:var(--text)">Механика:</b> ${esc(R.mech)}</p>
      <p style="margin:.4em 0 .8em">${esc(R.text)}</p>
      <div class="row"><a class="btn sm" href="#/chars?realm=${r}">Персонажи мира</a></div></div>`;
  }

  /* ---------- Каталог персонажей ---------- */
  function cardHtml(c) {
    return `<a class="ccard realm-${c.rl}" style="--c:var(--${c.rl.toLowerCase()})" href="#/char/${c.s}">
      ${ava(c)}<div style="min-width:0"><div class="nm">${esc(c.ru)}</div><div class="en">${esc(c.n)}</div>
      <div class="meta">${rar(c.r)}${realmB(c.rl)}${roleB(c.ro)}</div></div>
      <span class="tierpos">${tierB(c.tier)}</span></a>`;
  }
  function charsPage() {
    const qp = new URLSearchParams((location.hash.split('?')[1] || ''));
    const st = { q: qp.get('q') || '', realm: qp.get('realm') || '', role: qp.get('role') || '', rar: '', tier: '', feat: qp.get('feat') || '', sort: 'tier' };
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Персонажи</div>
      <h1>Пробуждённые</h1>
      <p class="lead">Все ${DB.chars.length} персонажей с гайдами. Фильтруйте по миру, роли, редкости, тиру и механикам или ищите по имени на русском и английском.</p>
      <div class="filters">
        <input class="input" id="q" placeholder="Поиск: имя, механика, тег…" value="${esc(st.q)}" autocomplete="off">
        <div class="frow"><span class="lbl">Мир</span><div class="chips" id="f-realm"></div></div>
        <div class="frow"><span class="lbl">Роль</span><div class="chips" id="f-role"></div></div>
        <div class="frow"><span class="lbl">Редкость</span><div class="chips" id="f-rar"></div></div>
        <div class="frow"><span class="lbl">Тир</span><div class="chips" id="f-tier"></div></div>
        <div class="frow"><span class="lbl">Умеет</span><div class="chips" id="f-feat"></div></div>
        <div class="frow"><span class="lbl">Сортировка</span>
          <select class="input" id="sort"><option value="tier">По тиру</option><option value="name">По имени (А–Я)</option><option value="realm">По миру</option><option value="new">Сначала новые</option></select>
          <span class="spacer"></span><span class="faint" id="cnt"></span></div>
      </div>
      <div id="list" class="grid g4"></div>`;
    const mk = (id, opts, key) => {
      const el = $('#' + id);
      el.innerHTML = [['', 'Все'], ...opts].map(([v, l]) => `<button class="chip${st[key] === v ? ' on' : ''}" data-v="${esc(v)}">${l}</button>`).join('');
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st[key] = b.dataset.v; $$('button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    };
    mk('f-realm', REALMS.map(r => [r, T.realms[r].glyph + ' ' + esc(realmRu(r).split(' ')[0])]), 'realm');
    mk('f-role', ROLES.map(r => [r, roleRu(r)]), 'role');
    mk('f-rar', [['Genesis', 'Генезис'], ['SSR', 'SSR'], ['SR', 'SR']], 'rar');
    mk('f-tier', [...TIERS.map(t => [t, t]), ['none', 'Без оценки']], 'tier');
    mk('f-feat', Object.entries(T.feat).map(([k, v]) => [k, v[1] + ' ' + esc(v[0])]), 'feat');
    $('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
    $('#sort').addEventListener('change', e => { st.sort = e.target.value; draw(); });
    function draw() {
      let l = DB.chars.filter(c => matches(c, st.q) && (!st.realm || c.rl === st.realm) && (!st.role || c.ro === st.role) && (!st.rar || c.r === st.rar)
        && (!st.tier || (st.tier === 'none' ? !c.tier : c.tier === st.tier)) && (!st.feat || c.g.f.includes(st.feat)));
      const by = {
        tier: (a, b) => tierRank(a.tier) - tierRank(b.tier) || a.ru.localeCompare(b.ru, 'ru'),
        name: (a, b) => a.ru.localeCompare(b.ru, 'ru'),
        realm: (a, b) => REALMS.indexOf(a.rl) - REALMS.indexOf(b.rl) || a.ru.localeCompare(b.ru, 'ru'),
        new: (a, b) => String(b.pr.Released || '').localeCompare(String(a.pr.Released || ''))
      }[st.sort];
      l.sort(by);
      $('#list').innerHTML = l.map(cardHtml).join('') || '<div class="empty">Никого не нашлось — ослабьте фильтры.</div>';
      $('#cnt').textContent = `Показано: ${l.length} из ${DB.chars.length}`;
    }
    draw();
  }

  /* ---------- Страница персонажа ---------- */
  function charPage([slug, tab]) {
    const c = BY[slug];
    if (!c) return notFound();
    const R = T.realms[c.rl];
    const tabs = [['guide', 'Гайд'], ['kit', 'Навыки'], ['build', 'Сборка'], ['info', 'Профиль и статы'], ['lore', 'Лор']];
    tab = tabs.some(t => t[0] === tab) ? tab : 'guide';
    document.title = `${c.ru} (${c.n}) — гайд Morimens`;
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / <a href="#/chars">Персонажи</a> / ${esc(c.ru)}</div>
      <div class="panel" style="border-color:color-mix(in srgb,var(--${c.rl.toLowerCase()}) 45%,var(--line))">
        <div class="chead">${ava(c, 'lg')}
          <div style="flex:1;min-width:220px">
            <h1>${esc(c.ru)}</h1>
            <div class="sub">${esc(c.n)}${c.ep ? ' · ' + esc(c.ep) : ''} · ${esc(R.ru)} · ${esc(roleRu(c.ro))}</div>
            <div class="row" style="margin-top:8px">${rar(c.r)}${realmB(c.rl)}${roleB(c.ro)} ${tierB(c.tier)} ${c.tg.map(t => `<span class="chip">${esc(tagRu(t))}</span>`).join('')}</div>
          </div>
          <div class="row"><a class="btn pri" href="#/team/${c.s}">＋ В конструктор</a></div>
        </div>
        <p style="margin:14px 0 0">${esc(c.g.sum)}</p>
      </div>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="tab"></div>
      <div class="row" style="margin-top:28px">${neighbors(c)}</div>`;
    $('.tabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      setHashQuiet(`#/char/${c.s}/${b.dataset.t}`);
      drawTab(b.dataset.t);
    });
    drawTab(tab);
    function drawTab(t) {
      const el = $('#tab');
      if (t === 'guide') el.innerHTML = guideTab(c);
      if (t === 'kit') el.innerHTML = kitTab(c);
      if (t === 'build') el.innerHTML = buildTab(c);
      if (t === 'info') el.innerHTML = infoTab(c);
      if (t === 'lore') el.innerHTML = loreTab(c);
    }
  }
  function neighbors(c) {
    const l = DB.chars.slice().sort((a, b) => a.ru.localeCompare(b.ru, 'ru'));
    const i = l.indexOf(c), p = l[(i - 1 + l.length) % l.length], n = l[(i + 1) % l.length];
    return `<a class="btn sm" href="#/char/${p.s}">← ${esc(p.ru)}</a><span class="spacer"></span><a class="btn sm" href="#/char/${n.s}">${esc(n.ru)} →</a>`;
  }
  function guideTab(c) {
    const g = c.g;
    const syn = g.syn.map(s => BY[s]).filter(Boolean);
    return `
      <div class="grid g2">
        <div class="panel"><h3>Как играть</h3><ol style="padding-left:1.2em;margin:0">${g.play.map(x => `<li style="margin:.4em 0">${esc(x)}</li>`).join('')}</ol></div>
        <div class="panel"><h3>Что умеет</h3><div class="chips">${g.f.map(featChip).join('')}</div>
          ${g.inv ? `<div class="note" style="margin-top:14px"><b>Вложения и приоритет:</b> ${esc(g.inv)}</div>` : ''}
          <p class="faint" style="margin:.8em 0 0;font-size:.85rem">Официальное описание: <i>${esc(c.d)}</i></p></div>
      </div>
      <div class="procon" style="margin-top:14px">
        <div class="panel pro"><h3>Сильные стороны</h3><ul class="dots">${g.pros.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="panel con"><h3>Слабые стороны</h3><ul class="dots">${g.cons.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div class="panel" style="margin-top:14px"><h3>Хорошие напарники</h3>
        <div class="chips" style="gap:8px">${syn.map(s => charLink(s)).join('')}</div>
        <div class="row" style="margin-top:12px"><a class="btn sm" href="#/team/${[c.s, ...g.syn].slice(0, 4).join(',')}">Открыть эту четвёрку в конструкторе →</a></div></div>
      ${c.ps.length ? `<details class="acc"><summary>Подсказка из игры (EN)</summary><div>${c.ps.map(p => `<p>${kw(p)}</p>`).join('')}</div></details>` : ''}`;
  }
  function skillCard(x) {
    const kinds = x.k.map(k => `<span class="badge">${esc(T.cardKinds[k] || k)}</span>`).join('');
    const cost = x.c ? `<span class="badge cost">◆ ${esc(x.c)}</span>` : (x.a ? `<span class="badge cost">⚡ ${esc(x.a.replace(' Aliemus', ''))}</span>` : '');
    return `<div class="skill"><h4>${esc(x.n)}</h4><div class="tags">${cost}${kinds}</div><p>${kw(x.t)}</p></div>`;
  }
  function kitTab(c) {
    const basic = c.cards.filter(x => x.n === 'Strike' || x.n === 'Defense');
    const rouse = c.cards.filter(x => x.k.includes('Rouse'));
    const main = c.cards.filter(x => !basic.includes(x) && !rouse.includes(x) && !x.k.includes('Derived Command'));
    const der = c.cards.filter(x => x.k.includes('Derived Command'));
    const sec = (h, list, note = '') => list.length ? `<h3 style="margin-top:22px">${h}</h3>${note ? `<p class="faint">${note}</p>` : ''}<div class="kit">${list.map(skillCard).join('')}</div>` : '';
    return `<div class="note">Тексты навыков приведены на английском, как в глобальной версии игры. Наведите курсор на <span class="kw">подсвеченный термин</span>, чтобы увидеть перевод, или откройте <a href="#/glossary">глоссарий</a>. Значения указаны для максимального уровня навыка.</div>
      ${sec('Rouse — включение пассива', rouse, 'Разыгрывайте как можно раньше: эффект после «Rouse:» действует до конца боя.')}
      ${sec('Exalt', c.ex, 'Over Exalt открывается максимальным Озарением.')}
      ${sec('Командные карты', main)}
      ${sec('Производные карты', der, 'Создаются другими картами персонажа.')}
      ${sec('Базовые карты', basic)}
      ${c.di.length ? `<h3 style="margin-top:22px">Пространственный образ (реликвия)</h3><div class="kit">${c.di.map(d => `<div class="skill"><h4>${esc(d.name)}</h4><p>${kw(d.text)}</p></div>`).join('')}</div>` : ''}
      <h3 style="margin-top:22px">Озарения (Enlighten)</h3>
      <div class="kit">${c.en.map(e => `<div class="skill"><h4><span class="badge" style="margin-right:6px">${esc(e.lv)}</span>${esc(e.name)}</h4><p>${kw(e.text)}</p></div>`).join('')}</div>
      <h3 style="margin-top:22px">Таланты</h3>
      <div class="kit">${c.ta.map(e => `<div class="skill"><h4>${esc(e.name)}</h4><div class="tags"><span class="badge">${esc(e.max.replace('Max Lv.', 'Макс. ур.'))}</span></div><p>${kw(e.text)}</p></div>`).join('')}</div>`;
  }
  function buildTab(c) {
    const ws = c.w.map(n => WHEEL[n]).filter(Boolean);
    const sig = ws.find(w => w.sig === c.n);
    return `<div class="note">Список колёс и ковенантов — рекомендации самой игры (по данным базы). Первое колесо — самое приоритетное; именное колесо персонажа отмечено ★.</div>
      <h3>Колёса судьбы</h3>
      <div class="kit">${ws.map(w => wheelCard(w, w === sig)).join('')}</div>
      <h3 style="margin-top:22px">Ковенанты</h3>
      <div class="kit">${c.cv.map(n => COV[n]).filter(Boolean).map(covCard).join('')}</div>
      ${c.po.length ? `<h3 style="margin-top:22px">Именной Посс</h3><div class="chips">${c.po.map(p => `<span class="chip">${esc(p)}</span>`).join('')}</div>` : ''}
      <div class="panel" style="margin-top:22px"><h3>Общие советы по сборке</h3><ul class="dots">
        <li>${c.ro === 'Attack' ? 'Дамагеру важны шанс и урон крита, Усиление урона и Мастерство мира. Ковенанты April Tribute или Crimson Pulse — частый выбор.' : c.ro === 'Defense' ? 'Защитнику важны щиты и живучесть: Cursed Rabbit (+12% к щитам и лечению на 6 частях) или Burial Ground\'s Sighs.' : 'Поддержке важны регенерация Алиемуса и Ключесвета: Life Drain, Re-evolution, Dream of Medicine.'}</li>
        <li>Эффекты колёс с пометкой «Team Unique» не складываются с такими же эффектами других колёс в команде.</li>
        <li>Пока нет именного колеса, берите колесо с подходящей основной характеристикой.</li></ul></div>`;
  }
  function wheelCard(w, star) {
    const who = w.sig && BYNAME[w.sig] ? ` · <a href="#/char/${BYNAME[w.sig].s}">${esc(BYNAME[w.sig].ru)}</a>` : '';
    return `<div class="skill"><h4>${star ? '★ ' : ''}${esc(w.n)}</h4>
      <div class="tags">${rar(w.r)}${w.st ? `<span class="badge">${esc(T.stats[w.st] || w.st)} ${esc(w.v)}</span>` : ''}${w.rl ? realmB(w.rl) : ''}</div>
      ${w.e.map(e => `<p style="margin:.3em 0">${kw(e)}</p>`).join('')}${who ? `<p class="faint" style="margin-top:6px;font-size:.85rem">Именное${who}</p>` : ''}</div>`;
  }
  function covCard(c) {
    return `<div class="skill"><h4>${esc(c.n)}</h4><div class="tags">${rar(c.r)}<span class="badge">3 шт.: ${esc(c.p3)}</span></div>
      <p><b>6 шт.:</b> ${kw(c.p6)}</p></div>`;
  }
  function infoTab(c) {
    return `<div class="grid g2">
      <div class="panel"><h3>Профиль</h3><div class="kv">${Object.entries(c.pr).map(([k, v]) => `<div><b>${esc(T.profile[k] || k)}</b>${esc(v)}</div>`).join('')}</div></div>
      <div class="panel"><h3>Характеристики (ур. 60)</h3><div class="kv">${Object.entries(c.st).map(([k, v]) => `<div><b>${esc(T.stats[k] || k)}</b>${esc(v)}</div>`).join('')}</div>
      <p class="faint" style="font-size:.85rem;margin-top:10px">Базовые значения без колёс и ковенантов.</p></div></div>
      <div class="panel" style="margin-top:14px"><h3>Мир: ${esc(T.realms[c.rl].ru)}</h3><p>${esc(T.realms[c.rl].text)}</p></div>`;
  }
  function loreTab(c) {
    if (!c.ar.length) return '<div class="empty">Архив пока пуст.</div>';
    return `<div class="note">Архивные записи из игры приведены в оригинале (EN). Записи открываются в игре по мере роста уровня Пробуждённого и Привязанности. Краткий русский пересказ мира — в разделе <a href="#/lore">«Лор вселенной»</a>.</div>
      <div class="lore">${c.ar.map((a, i) => `<details class="acc" ${i === 0 ? 'open' : ''}><summary>${esc(a.title)}</summary><div><p>${esc(a.text.replace(/^(Awakener|Affinity) Level \d+(\s*·[^\n]*)?\n/, ''))}</p></div></details>`).join('')}</div>`;
  }

  /* ---------- Конструктор команды ---------- */
  const EXALT_DPS = ['24', 'doresain', 'uvhash', 'vortice', 'doll-inferno', 'lotan-cetarchon', 'pollux', 'kathigu-ra', 'sorel'];
  function analyze(team) {
    const m = team.map(s => BY[s]).filter(Boolean);
    const F = {}; Object.keys(T.feat).forEach(k => F[k] = 0);
    m.forEach(c => c.g.f.forEach(f => F[f]++));
    const role = { Attack: 0, Defense: 0, Assist: 0 }; m.forEach(c => role[c.ro]++);
    const realm = {}; m.forEach(c => realm[c.rl] = (realm[c.rl] || 0) + 1);
    const mainRealm = Object.entries(realm).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const clamp = v => Math.max(0, Math.min(10, Math.round(v * 10) / 10));
    let pairs = [];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) {
      const a = m[i], b = m[j];
      if (a.g.syn.includes(b.s) || b.g.syn.includes(a.s)) pairs.push([a, b]);
    }
    const arch = [];
    if (F.poison >= 2) arch.push(['Ядовитая команда', 'Несколько источников Яда: урон копится и подрывается.']);
    if (F.tent >= 2) arch.push(['Щупальца Эквора', 'Несколько персонажей усиливают и создают Щупальца.']);
    if (F.counter >= 2) arch.push(['Стена шипов', 'Контратака у нескольких персонажей наказывает атакующих врагов.']);
    if (F.bleed >= 1 && F.embryo >= 2) arch.push(['Кровь и плоть Каро', 'Кровотечение плюс эмбрионы для Devour.']);
    else if (F.embryo >= 2) arch.push(['Пиршество Каро', 'Несколько источников Слияния эмбрионов усиливают Exalt через Devour.']);
    if (F.leap >= 2) arch.push(['Скачки Ультры', 'Карты со Скачком усиливают друг друга в пространстве Ультры.']);
    if (F.strike >= 2) arch.push(['Шквал «Ударов»', 'Несколько персонажей получают бонусы от карт «Strike».']);
    if (F.ali >= 2 && m.some(c => EXALT_DPS.includes(c.s))) arch.push(['Exalt-конвейер', 'Батарейки Алиемуса позволяют дамагеру чаще использовать Exalt.']);
    const realmBonus = mainRealm[1] >= 4 ? 3 : mainRealm[1] === 3 ? 2 : (realm.Chaos && mainRealm[1] >= 2 ? 1.5 : mainRealm[1] >= 2 ? 1 : 0);
    const tierAvg = m.length ? m.reduce((s, c) => s + (c.tier ? 5 - TIERS.indexOf(c.tier) : 2.5), 0) / m.length : 0;
    const sc = {
      boss: clamp(role.Attack * 2.2 + F.st * 1.6 + F.buff * 0.7 + F.debuff * 0.5),
      aoe: clamp(F.aoe * 2.3 + F.poison * 0.6 + role.Attack * 0.8),
      surv: clamp(role.Defense * 2.4 + F.shield * 1.3 + F.heal * 1.8 + F.dres * 1.6 + F.debuff * 0.4 + F.counter * 0.4),
      res: clamp(F.ali * 2.1 + F.ari * 2.1 + F.draw * 1.6 + F.key * 1.2),
      ctrl: clamp(F.debuff * 2.6 + F.counter * 0.6),
      syn: clamp(pairs.length * 1.6 + realmBonus + arch.length * 1.3)
    };
    const good = [], bad = [], tips = [];
    if (sc.boss >= 7) good.push('Высокий урон по одной цели: сильна против боссов.');
    if (sc.aoe >= 7) good.push('Хорошо зачищает группы врагов.');
    if (sc.surv >= 7) good.push('Крепкая: щиты, лечение и защитные эффекты.');
    if (sc.res >= 7) good.push('Отличный «двигатель»: много Алиемуса, Арифметики или добора.');
    if (sc.ctrl >= 6) good.push('Сильно ослабляет врагов (Слабость, Уязвимость, снижение Силы).');
    if (F.heal >= 1 && F.shield >= 1) good.push('Есть и лечение, и щиты: устойчивость в долгих боях.');
    if (mainRealm[1] === 4) good.push(`Моно-команда мира «${realmRu(mainRealm[0])}»: механики мира работают на полную.`);
    pairs.forEach(([a, b]) => good.push(`Связка ${a.ru} + ${b.ru} упоминается в гайдах как удачная.`));
    if (m.length === 4) {
      if (role.Attack === 0 && sc.boss < 5) bad.push('Нет дамагера (роль «Атака»): бои будут затягиваться.');
      if (role.Defense === 0 && F.heal === 0 && F.shield < 2) bad.push('Нет защитника и лечения: команда хрупкая.');
      else if (F.heal === 0 && F.dres === 0) bad.push('Нет лечения и Сопротивления смерти: в долгих боях HP не восстанавливается.');
      if (F.st === 0) bad.push('Мало урона по одной цели: боссы будут долгими.');
      if (F.aoe === 0) bad.push('Нет массового урона: группы врагов опасны.');
      if (sc.res < 3) bad.push('Слабый «двигатель» ресурсов: нет источников Алиемуса, Арифметики или добора.');
      if (role.Attack >= 3) bad.push('Три и больше дамагеров: поддержки и защиты может не хватить.');
      if (Object.keys(realm).length >= 3 && !realm.Chaos) bad.push('Три мира без Хаоса: мировые механики почти не пересекаются.');
    }
    if (F.tent === 1) bad.push('Щупальца только у одного персонажа: механика раскроется слабо.');
    m.filter(c => EXALT_DPS.includes(c.s)).forEach(c => { if (F.ali === 0) bad.push(`${c.ru} живёт от Exalt, а батарейки Алиемуса в команде нет.`); });
    if (m.some(c => c.s === 'kathigu-ra') && !m.some(c => c.s === 'horla')) tips.push('Катигу-Ре лучше всех помогает Орля: она переносит Арифметику на «Hyperflare».');
    if (m.some(c => c.s === 'castor') && !m.some(c => c.s === 'jenkin' || c.s === 'pollux')) tips.push('Кастор лучше всего раскрывается с Дженкин (или Поллуксом).');
    if (m.some(c => c.s === 'doresain') && !m.some(c => c.s === 'pickman')) tips.push('Пикман создан как поддержка Дорсейна: заметно усиливает его Exalt.');
    if (realm.Aequor >= 2 && !m.some(c => c.s === 'murphy-fauxborn')) tips.push('Для Эквора ключевая фигура — Мерфи: Фальшерождённая.');
    if (m.some(c => c.s === 'murphy-fauxborn') && !m.some(c => c.s === 'miryam')) tips.push('Мерфи: Фальшерождённой нужен Алиемус: Мириам — лучшая пара.');
    const overall = m.length ? (sc.boss + sc.aoe + sc.surv * 1.2 + sc.res + sc.ctrl * 0.5 + sc.syn) / 5.7 * 0.8 + tierAvg * 0.4 - bad.length * 0.35 : 0;
    return { m, F, role, realm, mainRealm, pairs, arch, sc, good, bad, tips, overall: Math.max(0, Math.min(10, overall)) };
  }
  function suggest(team, A) {
    const want = [];
    if (A.sc.surv < 5) want.push(['heal', 'shield', 'dres']);
    if (A.sc.res < 4) want.push(['ali', 'ari', 'draw']);
    if (A.sc.boss < 5) want.push(['st']);
    if (A.sc.aoe < 4) want.push(['aoe']);
    if (A.sc.ctrl < 3) want.push(['debuff']);
    const used = new Set(team);
    const scored = DB.chars.filter(c => !used.has(c.s)).map(c => {
      let s = 0;
      want.forEach((ws, i) => { if (c.g.f.some(f => ws.includes(f))) s += 3 - i * 0.3; });
      if (c.rl === A.mainRealm[0]) s += 1.2; if (c.rl === 'Chaos') s += 0.4;
      A.m.forEach(x => { if (x.g.syn.includes(c.s) || c.g.syn.includes(x.s)) s += 1.5; });
      s += (c.tier ? 5 - TIERS.indexOf(c.tier) : 2) * 0.35;
      return [s, c];
    }).sort((a, b) => b[0] - a[0]);
    return scored.slice(0, 6).map(x => x[1]);
  }
  function autofill(team) {
    const t = team.slice();
    for (let i = 0; i < 4; i++) {
      if (t[i]) continue;
      let best = null, bs = -1e9;
      DB.chars.forEach(c => {
        if (t.includes(c.s)) return;
        const tt = t.slice(); tt[i] = c.s;
        const filled = tt.filter(Boolean);
        const A = analyze(filled);
        const s = A.overall + (filled.length < 4 ? 0 : 0);
        if (s > bs) { bs = s; best = c.s; }
      });
      t[i] = best;
    }
    return t;
  }
  function teamPage([list]) {
    let team = (list || '').split(',').filter(s => BY[s]).slice(0, 4);
    while (team.length < 4) team.push('');
    let active = team.indexOf('') === -1 ? 0 : team.indexOf('');
    const pf = { q: '', realm: '' };
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Конструктор команды</div>
      <h1>Конструктор команды</h1>
      <p class="lead">Выберите четырёх пробуждённых. Конструктор оценит урон по боссам и группам, живучесть, ресурсы, контроль и синергию, перечислит сильные и слабые стороны и подскажет, кого добавить.</p>
      <div class="slots" id="slots"></div>
      <div class="row" style="margin:12px 0 4px">
        <button class="btn sm" id="auto">✨ Дополнить автоматически</button>
        <button class="btn sm" id="clear">Очистить</button>
        <button class="btn sm" id="share">🔗 Скопировать ссылку</button>
        <span class="faint" id="msg"></span>
      </div>
      <div class="grid g2" style="margin-top:14px;align-items:start">
        <div class="panel"><h3>Выбор персонажа <span class="faint" style="font-size:.9rem;font-family:var(--sans);font-weight:400">в слот <b id="slotno"></b></span></h3>
          <input class="input" id="pq" placeholder="Поиск…" autocomplete="off" style="margin-bottom:8px">
          <div class="chips" id="pr" style="margin-bottom:10px"></div>
          <div class="picker" id="picker"></div></div>
        <div id="result"></div>
      </div>
      <section class="section"><h2>Готовые примеры составов</h2>
        <p class="faint">Составлены по синергиям из наборов навыков и разборов Kaiden.gg. Это стартовая точка, а не официальная мета.</p>
        <div class="grid g2">${T.presets.map(p => `<div class="panel"><div class="row"><h3 style="margin:0">${esc(p.n)}</h3><span class="spacer"></span><a class="btn sm" href="#/team/${p.t.join(',')}">Открыть</a></div>
          <div class="chips" style="gap:6px;margin:10px 0">${p.t.map(s => BY[s]).filter(Boolean).map(c => charLink(c)).join('')}</div><p class="muted" style="margin:0">${esc(p.d)}</p></div>`).join('')}</div>
      </section>`;
    $('#pr').innerHTML = [['', 'Все'], ...REALMS.map(r => [r, T.realms[r].glyph + ' ' + realmRu(r).split(' ')[0]])].map(([v, l]) => `<button class="chip${v === '' ? ' on' : ''}" data-v="${v}">${esc(l)}</button>`).join('');
    $('#pr').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pf.realm = b.dataset.v; $$('#pr button').forEach(x => x.classList.toggle('on', x === b)); drawPicker(); });
    $('#pq').addEventListener('input', e => { pf.q = e.target.value; drawPicker(); });
    $('#auto').addEventListener('click', () => { team = autofill(team); active = 0; sync(); });
    $('#clear').addEventListener('click', () => { team = ['', '', '', '']; active = 0; sync(); });
    $('#share').addEventListener('click', () => {
      const url = location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => flash('Ссылка скопирована'), () => flash('Скопируйте адрес из строки браузера'));
    });
    const flash = t => { $('#msg').textContent = t; setTimeout(() => { $('#msg').textContent = ''; }, 2500); };
    function sync() {
      setHashQuiet('#/team/' + team.filter(Boolean).join(','));
      drawSlots(); drawPicker(); drawResult();
    }
    function drawSlots() {
      $('#slots').innerHTML = team.map((s, i) => {
        const c = BY[s];
        if (!c) return `<button class="slot${i === active ? ' active' : ''}" data-i="${i}"><span style="font-size:2rem">＋</span><span>Слот ${i + 1}</span></button>`;
        return `<div class="slot fill${i === active ? ' active' : ''}" data-i="${i}" style="--c:var(--${c.rl.toLowerCase()})" role="button" tabindex="0">
          <button class="x" data-x="${i}" title="Убрать">×</button>${ava(c)}<b>${esc(c.ru)}</b>
          <div class="row" style="justify-content:center;gap:4px">${realmB(c.rl)}${roleB(c.ro)}</div>
          <a href="#/char/${c.s}" style="font-size:.8rem">гайд →</a></div>`;
      }).join('');
      $('#slotno').textContent = active + 1;
      $$('#slots [data-i]').forEach(el => el.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        const x = e.target.closest('[data-x]');
        if (x) { team[+x.dataset.x] = ''; active = +x.dataset.x; sync(); e.stopPropagation(); return; }
        active = +el.dataset.i; drawSlots();
      }));
    }
    function drawPicker() {
      const l = DB.chars.filter(c => matches(c, pf.q) && (!pf.realm || c.rl === pf.realm)).sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.ru.localeCompare(b.ru, 'ru'));
      $('#picker').innerHTML = l.map(c => `<button class="pick" data-s="${c.s}" ${team.includes(c.s) ? 'disabled' : ''} title="${esc(c.n)} · ${esc(realmRu(c.rl))} · ${esc(roleRu(c.ro))}">${ava(c, 'sm')}<span>${esc(c.ru)}<br><small class="faint">${esc(roleRu(c.ro))}${c.tier ? ' · ' + c.tier : ''}</small></span></button>`).join('') || '<div class="empty">Никого</div>';
      $$('#picker .pick').forEach(b => b.addEventListener('click', () => {
        team[active] = b.dataset.s;
        const nx = team.indexOf(''); active = nx === -1 ? active : nx;
        sync();
      }));
    }
    function bar(label, v, hint) {
      const cls = v < 4 ? 'low' : v < 6.5 ? 'mid' : '';
      return `<div class="bar" title="${esc(hint)}"><span>${label}</span><div class="tr"><div class="fl ${cls}" style="width:${v * 10}%"></div></div><b>${v.toFixed(1)}</b></div>`;
    }
    function drawResult() {
      const filled = team.filter(Boolean);
      const el = $('#result');
      if (!filled.length) { el.innerHTML = `<div class="panel"><h3>Анализ</h3><p class="muted">Добавьте хотя бы одного персонажа, чтобы увидеть анализ. Нажмите «Дополнить автоматически», и конструктор подберёт команду сам.</p></div>`; return; }
      const A = analyze(filled);
      const verdict = filled.length < 4 ? 'Команда не заполнена' : A.overall >= 7 ? 'Отличная команда' : A.overall >= 5.5 ? 'Хорошая команда' : A.overall >= 4 ? 'Рабочая команда' : 'Есть серьёзные пробелы';
      const sug = filled.length < 4 || A.bad.length ? suggest(filled, A) : [];
      el.innerHTML = `<div class="panel">
        <div class="row"><div><div class="faint" style="font-size:.8rem">Итог</div><div class="verdict">${verdict}</div></div><span class="spacer"></span><div class="stat-big" style="text-align:right"><b>${A.overall.toFixed(1)}</b><span>из 10</span></div></div>
        <div class="row" style="margin:10px 0 14px">${Object.entries(A.realm).map(([r, n]) => `<span class="chip rbadge realm realm-${r}">${T.realms[r].glyph} ${esc(realmRu(r).split(' ')[0])} ×${n}</span>`).join('')}
          ${ROLES.map(r => `<span class="chip">${esc(roleRu(r))}: ${A.role[r]}</span>`).join('')}</div>
        <div class="bars">
          ${bar('Урон по боссу', A.sc.boss, 'Дамагеры, урон по одной цели, усиления')}
          ${bar('Урон по группам', A.sc.aoe, 'Массовые атаки и Яд')}
          ${bar('Живучесть', A.sc.surv, 'Защитники, щиты, лечение, Сопротивление смерти')}
          ${bar('Ресурсы и темп', A.sc.res, 'Алиемус, Арифметика, добор, Ключесвет')}
          ${bar('Ослабление врагов', A.sc.ctrl, 'Слабость, Уязвимость, снижение Силы')}
          ${bar('Синергия', A.sc.syn, 'Общий мир, архетипы, связки из гайдов')}
        </div>
        ${A.arch.length ? `<h3 style="margin-top:18px">Архетип</h3>${A.arch.map(([n, d]) => `<p style="margin:.3em 0"><b>${esc(n)}</b> — <span class="muted">${esc(d)}</span></p>`).join('')}` : ''}
        ${A.good.length ? `<h3 style="margin-top:18px;color:var(--good)">Сильные стороны</h3><ul class="lst good-l">${A.good.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${A.bad.length ? `<h3 style="margin-top:18px;color:var(--bad)">Слабые стороны</h3><ul class="lst bad-l">${A.bad.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${A.tips.length ? `<h3 style="margin-top:18px">Советы</h3><ul class="lst tip-l">${A.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${sug.length ? `<h3 style="margin-top:18px">Кого стоит добавить или заменить</h3><div class="chips" style="gap:6px">${sug.map(c => `<button class="mini" data-add="${c.s}" style="cursor:pointer;--c:var(--${c.rl.toLowerCase()})">${ava(c, 'sm')}<span>${esc(c.ru)}<br><small class="faint">${c.g.f.slice(0, 2).map(f => T.feat[f][0]).join(', ')}</small></span></button>`).join('')}</div>
          <p class="faint" style="font-size:.85rem">Нажмите, чтобы поставить в выбранный слот (${active + 1}).</p>` : ''}
        <h3 style="margin-top:18px">Покрытие механик</h3>
        <div class="chips">${Object.entries(A.F).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([f, n]) => `<span class="chip">${T.feat[f][1]} ${esc(T.feat[f][0])} ×${n}</span>`).join('')}</div>
        <p class="faint" style="font-size:.82rem;margin-top:14px">Оценка эвристическая: она строится на ролях, механиках и связках из гайдов. Реальная сила зависит от прокачки, Озарений и контента.</p></div>`;
      $$('#result [data-add]').forEach(b => b.addEventListener('click', () => {
        team[active] = b.dataset.add; const nx = team.indexOf(''); active = nx === -1 ? active : nx; sync();
      }));
    }
    sync();
  }

  /* ---------- Тир-лист ---------- */
  function tierPage() {
    let realm = '';
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Тир-лист</div>
      <h1>Тир-лист</h1>
      <p class="lead">Сводный рейтинг сообщества (по данным gacha.gg на октябрь 2026; это усреднение нескольких популярных тир-листов). Учитывает сюжет и основной PvE-контент.</p>
      <div class="note warn">Тир-лист — ориентир. Персонажи «без оценки» не обязательно слабые: часто они просто новые (например, Arc 2) или не попали в сводку. Поддержки вроде Орли и Таис сильны в любой команде, а многие дамагеры раскрываются только в «своей» связке.</div>
      <div class="chips" id="tr" style="margin:14px 0"></div>
      <div id="tl"></div>`;
    $('#tr').innerHTML = [['', 'Все миры'], ...REALMS.map(r => [r, T.realms[r].glyph + ' ' + realmRu(r).split(' ')[0]])].map(([v, l]) => `<button class="chip${v === realm ? ' on' : ''}" data-v="${v}">${esc(l)}</button>`).join('');
    $('#tr').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; realm = b.dataset.v; $$('#tr button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    const desc = { S: 'Сильнейшие и самые универсальные', A: 'Очень сильные', B: 'Хорошие, ситуативно отличные', C: 'Нишевые', D: 'Слабые на текущий момент' };
    const color = { S: '#ff6b6b', A: '#ffb347', B: '#ffe066', C: '#8ce99a', D: '#74c0fc' };
    function draw() {
      const l = DB.chars.filter(c => !realm || c.rl === realm);
      $('#tl').innerHTML = TIERS.map(t => {
        const cs = l.filter(c => c.tier === t);
        return `<div class="tierrow"><div class="tl" style="background:${color[t]}" title="${desc[t]}">${t}</div><div class="tc">${cs.map(c => charLink(c)).join('') || '<span class="faint">—</span>'}</div></div>`;
      }).join('') + `<h3 style="margin-top:24px">Без оценки</h3><div class="chips" style="gap:8px">${l.filter(c => !c.tier).map(c => charLink(c)).join('')}</div>`;
    }
    draw();
  }

  /* ---------- Лор ---------- */
  function lorePage() {
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Лор вселенной</div>
      <h1>Лор вселенной</h1>
      <p class="lead">Краткий пересказ мира Morimens по внутриигровым архивам и описаниям глав. Подробные истории персонажей — во вкладке «Лор» на их страницах.</p>
      <div class="grid g2" style="margin-top:18px">${T.lore.map(s => `<div class="panel"><h3>${esc(s.h)}</h3>${s.p.map(p => `<p>${esc(p)}</p>`).join('')}</div>`).join('')}</div>
      <section class="section"><h2>Сюжет: Arc 1 — Faded Legacy</h2>
        <div class="tl-list">${T.arc1.map(([n, t, d]) => `<div class="tl-item"><span class="chip">${esc(n)}</span><h4 style="margin-top:4px">${esc(t)}</h4><p class="muted" style="margin:.2em 0">${esc(d)}</p></div>`).join('')}</div></section>
      <section class="section"><h2>Сюжет: Arc 2 — Astral Reign</h2>
        <p class="muted">Вторая арка (уровни 61+) добавляет новые правила: «Keyflare Rouse», гармонию Арифметики и Алиемуса, «Искажение времени».</p>
        <div class="tl-list">${T.arc2.map(([n, t, d]) => `<div class="tl-item"><span class="chip">${esc(n)}</span><h4 style="margin-top:4px">${esc(t)}</h4><p class="muted" style="margin:.2em 0">${esc(d)}</p></div>`).join('')}</div></section>
      <section class="section"><h2>Кто есть кто</h2>
        ${REALMS.map(r => `<h3 style="color:var(--${r.toLowerCase()})">${T.realms[r].glyph} ${esc(T.realms[r].ru)}</h3>
          <div class="grid g3" style="margin-bottom:18px">${DB.chars.filter(c => c.rl === r).sort((a, b) => a.ru.localeCompare(b.ru, 'ru')).map(c => `<a class="ccard" style="--c:var(--${r.toLowerCase()});align-items:flex-start" href="#/char/${c.s}/lore">${ava(c, 'sm')}<div><div class="nm">${esc(c.ru)}</div><div class="faint" style="font-size:.85rem;line-height:1.4">${esc(c.g.sum.split('. ')[0].replace(/\.$/, ''))}.</div></div></a>`).join('')}</div>`).join('')}
      </section>`;
  }

  /* ---------- Новичку ---------- */
  function startPage() {
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Новичку</div>
      <h1>Новичку: с чего начать</h1>
      <p class="lead">Morimens — пошаговая карточная стратегия (deck-builder) с элементами roguelike и мрачной лавкрафтовской атмосферой. Ниже собрано главное, чтобы быстро разобраться в игре.</p>
      <div class="panel" style="margin:18px 0"><h3>Содержание</h3><div class="chips">
        ${T.basics.map((b, i) => `<a class="chip" href="#/start" data-jump="b${i}">${esc(b.h)}</a>`).join('')}
        <a class="chip" href="#/start" data-jump="modes">Режимы игры</a><a class="chip" href="#/start" data-jump="dng">Подземелья и материалы</a><a class="chip" href="#/start" data-jump="codes">Коды</a></div></div>
      ${T.basics.map((b, i) => `<section class="section" id="b${i}"><h2>${esc(b.h)}</h2><div class="panel"><ul class="dots">${b.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`).join('')}
      <section class="section" id="modes"><h2>Режимы игры</h2><div class="grid g2">${T.modes.map(m => `<div class="panel"><h3>${esc(m.n)}</h3><p style="margin:0">${esc(m.d)}</p></div>`).join('')}</div></section>
      <section class="section" id="dng"><h2>Подземелья и материалы</h2>
        <div class="tbl-wrap"><table><thead><tr><th>Подземелье</th><th>Тип</th><th>Награда</th><th>Уровни</th></tr></thead><tbody>
        ${T.dungeons.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="faint">Каждый забег стоит 20 Менофина.</p></section>
      <section class="section" id="codes"><h2>Коды (по состоянию на ${esc(DB.updated)})</h2>
        <div class="note">Как ввести: шестерёнка (Настройки) слева → вкладка «Account» → «Go to Redeem» → вставьте код → «Confirm». Коды могут истечь в любой момент.</div>
        <div class="tbl-wrap"><table><thead><tr><th>Код</th><th>Награда</th><th></th></tr></thead><tbody>
        ${T.codes.map(([c, r]) => `<tr><td><code>${esc(c)}</code></td><td>${esc(r)}</td><td><button class="btn sm" data-copy="${esc(c)}">Копировать</button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="section"><h2>Дальше</h2><div class="row"><a class="btn pri" href="#/team">Собрать первую команду</a><a class="btn" href="#/glossary">Глоссарий терминов</a><a class="btn" href="#/chars?role=Assist">Поддержки</a></div></section>`;
    $$('[data-jump]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView({ behavior: 'smooth' }); }));
    $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => { b.textContent = 'Скопировано ✓'; setTimeout(() => b.textContent = 'Копировать', 1800); }, () => { b.textContent = 'Не удалось'; });
    }));
  }

  /* ---------- Колёса ---------- */
  function wheelsPage() {
    const st = { q: '', r: '', stat: '', sig: false };
    const stats = [...new Set(DB.wheels.map(w => w.st).filter(Boolean))].sort();
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Колёса судьбы</div>
      <h1>Колёса судьбы</h1>
      <p class="lead">Все ${DB.wheels.length} колёс: редкость, основная характеристика и эффект (значения через «/» — по рангам возвышения). <a href="#/covenants">Ковенанты →</a></p>
      <div class="filters">
        <input class="input" id="q" placeholder="Поиск по названию, эффекту или персонажу…" autocomplete="off">
        <div class="frow"><span class="lbl">Редкость</span><div class="chips" id="fr"></div></div>
        <div class="frow"><span class="lbl">Характеристика</span><select class="input" id="fs"><option value="">Любая</option>${stats.map(s => `<option value="${esc(s)}">${esc(T.stats[s] || s)}</option>`).join('')}</select>
          <label class="chip" style="cursor:pointer"><input type="checkbox" id="fsig" style="margin:0 4px 0 0">Только именные</label><span class="spacer"></span><span class="faint" id="cnt"></span></div>
      </div><div class="kit" id="list"></div>`;
    $('#fr').innerHTML = [['', 'Все'], ['SSR', 'SSR'], ['SR', 'SR'], ['R', 'R'], ['N', 'N']].map(([v, l]) => `<button class="chip${v === '' ? ' on' : ''}" data-v="${v}">${l}</button>`).join('');
    $('#fr').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.r = b.dataset.v; $$('#fr button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
    $('#fs').addEventListener('change', e => { st.stat = e.target.value; draw(); });
    $('#fsig').addEventListener('change', e => { st.sig = e.target.checked; draw(); });
    const ord = { SSR: 0, SR: 1, R: 2, N: 3 };
    function draw() {
      const q = norm(st.q);
      const l = DB.wheels.filter(w => (!st.r || w.r === st.r) && (!st.stat || w.st === st.stat) && (!st.sig || w.sig) &&
        (!q || norm(w.n + ' ' + w.e.join(' ') + ' ' + w.sig + ' ' + (BYNAME[w.sig] ? BYNAME[w.sig].ru : '')).includes(q)))
        .sort((a, b) => (ord[a.r] ?? 9) - (ord[b.r] ?? 9) || a.n.localeCompare(b.n));
      $('#list').innerHTML = l.map(w => wheelCard(w, false)).join('') || '<div class="empty">Ничего не найдено</div>';
      $('#cnt').textContent = `Показано: ${l.length}`;
    }
    draw();
  }
  function covsPage() {
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Ковенанты</div>
      <h1>Ковенанты</h1>
      <p class="lead">Ковенант надевается шестью пронумерованными частями. 3 части дают характеристику, 6 частей — сетовый эффект. Основная характеристика каждой части выпадает случайно из своего набора. <a href="#/wheels">← Колёса судьбы</a></p>
      <div class="tbl-wrap" style="margin:14px 0"><table><thead><tr><th>Часть</th><th>Возможные основные характеристики</th></tr></thead><tbody>
        <tr><td>I</td><td>Шанс крита, Крит. урон, Реген Ключесвета, Реген Алиемуса</td></tr>
        <tr><td>II</td><td>Шанс крита, Крит. урон, Мастерство мира, Добыча печатей</td></tr>
        <tr><td>III</td><td>Шанс крита, Крит. урон, Усиление урона, Сопр. смерти</td></tr>
        <tr><td>IV</td><td>Реген Ключесвета, Реген Алиемуса, Мастерство мира, Добыча печатей</td></tr>
        <tr><td>V</td><td>Реген Ключесвета, Реген Алиемуса, Усиление урона, Сопр. смерти</td></tr>
        <tr><td>VI</td><td>Усиление урона, Сопр. смерти, Мастерство мира, Добыча печатей</td></tr></tbody></table></div>
      <div class="kit">${DB.covs.map(c => `<div class="skill"><h4>${esc(c.n)}</h4><div class="tags">${rar(c.r)}<span class="badge">3 шт.: ${esc(c.p3)}</span></div>
        <p><b>6 шт.:</b> ${kw(c.p6)}</p>${c.rec.length ? `<details style="margin-top:8px"><summary class="faint" style="cursor:pointer">Рекомендован для (${c.rec.length})</summary><div class="chips" style="margin-top:6px">${c.rec.map(n => BYNAME[n] ? `<a class="chip" href="#/char/${BYNAME[n].s}">${esc(BYNAME[n].ru)}</a>` : `<span class="chip">${esc(n)}</span>`).join('')}</div></details>` : ''}</div>`).join('')}</div>`;
  }

  /* ---------- Глоссарий ---------- */
  function glossaryPage() {
    view.innerHTML = `<div class="crumbs"><a href="#/">Главная</a> / Глоссарий</div>
      <h1>Глоссарий</h1>
      <p class="lead">Игра не локализована на русский, поэтому здесь собраны английские термины с переводом и объяснением.</p>
      <input class="input" id="q" placeholder="Найти термин (рус/англ)…" autocomplete="off" style="margin:12px 0">
      <div class="tbl-wrap"><table><thead><tr><th style="width:22%">English</th><th style="width:22%">Русский</th><th>Что это</th></tr></thead><tbody id="gl"></tbody></table></div>`;
    const draw = q => {
      q = norm(q);
      $('#gl').innerHTML = T.glossary.filter(r => !q || norm(r.join(' ')).includes(q)).map(([e, r, d]) => `<tr><td><b>${esc(e)}</b></td><td>${esc(r)}</td><td>${esc(d)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Не найдено</td></tr>';
    };
    $('#q').addEventListener('input', e => draw(e.target.value)); draw('');
  }

  function notFound() {
    view.innerHTML = `<div class="empty"><h1>Страница не найдена</h1><p>Похоже, Распад поглотил эту ссылку.</p><a class="btn pri" href="#/">На главную</a></div>`;
  }

  /* ---------- Оболочка ---------- */
  $('.menu-btn').addEventListener('click', () => $('.nav').classList.toggle('open'));
  const themeBtn = $('#theme');
  const applyTheme = t => { document.documentElement.dataset.theme = t; themeBtn.textContent = t === 'light' ? '☾' : '☀'; themeBtn.title = t === 'light' ? 'Тёмная тема' : 'Светлая тема'; };
  let saved = null; try { saved = localStorage.getItem('mm-theme'); } catch (e) { }
  applyTheme(saved || (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  themeBtn.addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; applyTheme(t); try { localStorage.setItem('mm-theme', t); } catch (e) { } });
  const toTop = $('.toTop');
  window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 600), { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const origGo = go;
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/char/')) document.title = 'Morimens — гайд на русском'; });
  $('#upd').textContent = DB.updated;
  origGo();
})();
