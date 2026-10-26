(function () {
  'use strict';
  var Q = window.Iq, el = Q.el, say = Q.say, P = Q.price;
  var app = document.getElementById('app'), cn = document.getElementById('cn');
  var S = Q.store('iqtina:v1:');
  var stores = [], products = [], zones = [], site = { whatsapp: '', policy: [], wallet: {} };
  var cart = S.get('cart', []); // [{pid, opt:{label:value}, q}]
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {} }

  function store(id) { return stores.filter(function (s) { return s.id === id; })[0]; }
  function prod(id) { return products.filter(function (p) { return p.id === id; })[0]; }
  function kids(pid) { return stores.filter(function (s) { return (s.parent || '') === (pid || ''); }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function desc(id) { var o = [id]; kids(id).forEach(function (k) { o = o.concat(desc(k.id)); }); return o; }
  function pcount(id) { var ids = desc(id); return products.filter(function (p) { return !p.hidden && ids.indexOf(p.store) >= 0; }).length; }
  function crumbs(s) { var o = [], g = 0; while (s && g++ < 8) { o.unshift(s); s = s.parent ? store(s.parent) : null; } return o; }
  function saveCart() { S.set('cart', cart); count(); }
  function count() { var n = cart.reduce(function (a, l) { return a + l.q; }, 0); cn.textContent = n.toLocaleString('ar-EG'); cn.style.display = n ? '' : 'none'; }
  function ownerOf(p) { var s = store(p.store); return s ? Q.badge(s.owner, s.verified) : Q.badge('external'); }
  function statusBadge(s) { return s.status === 'soon' ? el('span', { class: 'badge b-soon', text: 'قريباً' }) : s.status === 'order' ? el('span', { class: 'badge b-ext', text: 'على الطلب' }) : null; }

  /* ---------- الصفحات ---------- */
  function home() {
    var root = kids('')[0];
    var box = el('div', null, el('div', { class: 'panel', style: 'text-align:center' }, el('h2', { text: root ? root.name : 'اقتناء' }), el('p', { class: 'hint', text: root ? root.desc : '' })));
    var list = root ? kids(root.id) : kids('');
    box.appendChild(el('div', { class: 'grid' }, list.map(storeTile)));
    box.appendChild(searchBox());
    return box;
  }
  function searchBox() {
    var q = el('input', { type: 'text', placeholder: 'ابحث عن منتج', 'aria-label': 'بحث' });
    q.addEventListener('change', function () { if (q.value.trim()) go('#/search/' + encodeURIComponent(q.value.trim())); });
    return el('div', { style: 'margin:12px 0' }, q);
  }
  function storeTile(s) {
    var b = Q.badge(s.owner, s.verified), n = pcount(s.id);
    return el('a', { class: 'tile' + (s.status === 'soon' ? ' soon' : ''), href: '#/store/' + s.id, style: '--c:' + (/^#[0-9a-f]{3,8}$/i.test(s.color || '') ? s.color : '#b8893b') },
      el('span', { class: 'e', text: s.emoji || '◈' }), el('b', { text: s.name }), el('span', { class: 'd', text: s.desc || '' }),
      el('div', null, el('span', { class: 'badge ' + b.cls, text: b.text }), ' ', statusBadge(s), n ? el('span', { class: 'hint', text: ' · ' + n.toLocaleString('ar-EG') + ' منتج' }) : null));
  }
  function prodTile(p) {
    var u = p.img ? Q.safeUrl(p.img) : '', b = ownerOf(p);
    return el('a', { class: 'prod', href: '#/p/' + p.id },
      el('div', { class: 'im' }, u ? el('img', { src: u, alt: p.name, loading: 'lazy' }) : '🛍️'),
      el('div', { class: 'pb' }, el('b', { text: p.name }),
        el('div', null, el('span', { class: 'pr', text: P(p.price) }), p.old ? el('span', { class: 'old', text: P(p.old) }) : null),
        el('span', { class: 'badge ' + b.cls, text: b.text }),
        p.stock === 'out' ? el('div', { class: 'err', text: 'نفد' }) : p.stock === 'order' ? el('div', { class: 'hint', text: 'يُجهَّز عند الطلب' }) : null));
  }
  function storePage(id) {
    var s = store(id); if (!s) return notFound();
    var cr = crumbs(s), box = el('div', null,
      el('div', { class: 'crumbs' }, [el('a', { href: '#/', text: 'اقتناء' })].concat(cr.slice(1).reduce(function (a, c) { a.push(' › '); a.push(el('a', { href: '#/store/' + c.id, text: c.name })); return a; }, []))),
      el('h2', { text: (s.emoji || '') + ' ' + s.name }), el('p', { class: 'hint', text: s.desc || '' }));
    var b = Q.badge(s.owner, s.verified); box.appendChild(el('span', { class: 'badge ' + b.cls, text: b.text }));
    var ch = kids(s.id); if (ch.length) box.appendChild(el('div', { class: 'grid' }, ch.map(storeTile)));
    var ps = products.filter(function (p) { return p.store === s.id && !p.hidden; });
    if (ps.length) box.appendChild(el('div', { class: 'grid' }, ps.map(prodTile)));
    else if (!ch.length && s.status !== 'order') box.appendChild(el('div', { class: 'soonbox', text: s.status === 'soon' ? 'قريباً. لم تُضَف منتجات بعد.' : 'لا منتجات حالياً.' }));
    if (s.status === 'order') box.appendChild(requestBox(s));
    return box;
  }
  function waLink(text) {
    var n = String(site.whatsapp || '').replace(/\D/g, ''); if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text);
  }
  function requestBox(s) {
    var t = el('textarea', { placeholder: 'اكتب ما تريده (مثال: اسم الكتاب والمؤلف)' }), err = el('p', { class: 'err' });
    return el('div', { class: 'panel' }, el('h3', { text: 'اطلب من ' + s.name }), el('p', { class: 'hint', text: 'هذا المتجر يعمل بالطلب: تخبرنا بما تريد ونرد عليك بالتوفر والسعر.' }), t, err,
      el('button', { class: 'btn wa', type: 'button', text: 'أرسل الطلب عبر واتساب', onclick: function () {
        if (!t.value.trim()) { err.textContent = 'اكتب ما تريده أولاً.'; return; }
        var l = waLink('طلب خاص من ' + s.name + ':\n' + t.value.trim());
        if (!l) { err.textContent = 'رقم واتساب المتجر غير مضبوط بعد.'; return; }
        window.open(l, '_blank', 'noopener');
      } }));
  }
  function prodPage(id) {
    var p = prod(id); if (!p || p.hidden) return notFound();
    var s = store(p.store), b = ownerOf(p), sel = {}, q = 1;
    var u = p.img ? Q.safeUrl(p.img) : '';
    var box = el('div', null, el('div', { class: 'crumbs' }, el('a', { href: '#/', text: 'اقتناء' }), ' › ', s ? el('a', { href: '#/store/' + s.id, text: s.name }) : ''),
      el('div', { class: 'panel' }, u ? el('img', { src: u, alt: p.name, style: 'width:100%;max-height:360px;object-fit:contain;border-radius:10px' }) : null,
        el('h2', { text: p.name }), el('div', null, el('span', { class: 'pr', text: P(p.price), style: 'font-size:1.3rem' }), p.old ? el('span', { class: 'old', text: P(p.old) }) : null),
        el('span', { class: 'badge ' + b.cls, text: b.text }), p.desc ? el('p', { text: p.desc, style: 'white-space:pre-wrap' }) : null));
    var panel = box.lastChild;
    (p.options || []).forEach(function (o) {
      var sl = el('select', { 'aria-label': o.label }, o.values.map(function (v) { return el('option', { value: v, text: v }); }));
      sel[o.label] = o.values[0]; sl.addEventListener('change', function () { sel[o.label] = sl.value; });
      panel.appendChild(el('label', { text: o.label })); panel.appendChild(sl);
    });
    if (p.stock === 'out') panel.appendChild(el('p', { class: 'err', text: 'نفد المنتج حالياً.' }));
    else {
      var qi = el('input', { type: 'number', min: '1', max: '99', value: '1', 'aria-label': 'الكمية', style: 'max-width:100px' });
      qi.addEventListener('change', function () { q = Math.max(1, Math.min(99, parseInt(qi.value, 10) || 1)); qi.value = q; });
      panel.appendChild(el('label', { text: 'الكمية' })); panel.appendChild(qi);
      panel.appendChild(el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { class: 'btn primary', type: 'button', text: 'أضف إلى السلة', onclick: function () {
        q = Math.max(1, Math.min(99, parseInt(qi.value, 10) || 1));
        var key = JSON.stringify(sel), ex = cart.filter(function (l) { return l.pid === p.id && JSON.stringify(l.opt) === key; })[0];
        if (ex) ex.q = Math.min(99, ex.q + q); else cart.push({ pid: p.id, opt: Object.assign({}, sel), q: q });
        saveCart(); say('أُضيف إلى السلة.');
      } }), el('a', { class: 'btn', href: '#/cart', text: 'السلة' })));
    }
    panel.appendChild(el('p', { class: 'hint', text: 'التقييمات والتعليقات: غير متاحة بعد، تحتاج خادماً.' }));
    return box;
  }
  function searchPage(q) {
    var w = q.toLowerCase().split(/\s+/);
    var res = products.filter(function (p) { var h = (p.name + ' ' + (p.desc || '')).toLowerCase(); return !p.hidden && w.every(function (x) { return h.indexOf(x) >= 0; }); });
    return el('div', null, el('h2', { text: 'نتائج «' + q + '» (' + res.length.toLocaleString('ar-EG') + ')' }), res.length ? el('div', { class: 'grid' }, res.map(prodTile)) : el('p', { class: 'hint', text: 'لا نتائج.' }));
  }

  /* ---------- السلة والطلب ---------- */
  function lineTotal(l) { var p = prod(l.pid); return p ? p.price * l.q : 0; }
  function optText(o) { return Object.keys(o || {}).map(function (k) { return k + ': ' + o[k]; }).join('، '); }
  function zoneOf(id) { return zones.filter(function (z) { return z.id === id; })[0]; }
  var form = Object.assign({ name: '', phone: '', zone: '', addr: '', note: '', pay: 'cod' }, S.get('cust', {}));
  function cartPage() {
    cart = cart.filter(function (l) { return prod(l.pid); });
    var box = el('div', null, el('h2', { text: 'السلة' }));
    if (!cart.length) { box.appendChild(el('div', { class: 'soonbox', text: 'السلة فارغة.' }), el('a', { class: 'btn', href: '#/', text: 'تصفّح المتاجر' })); return box; }
    var pan = el('div', { class: 'panel' });
    cart.forEach(function (l, i) {
      var p = prod(l.pid);
      pan.appendChild(el('div', { class: 'line' }, el('div', { style: 'flex:1' }, el('b', { text: p.name }), el('div', { class: 'hint', text: optText(l.opt) }), el('div', { class: 'pr', text: P(p.price * l.q) })),
        el('div', { class: 'qty' },
          el('button', { type: 'button', 'aria-label': 'أنقص', text: '−', onclick: function () { if (l.q > 1) l.q--; else cart.splice(i, 1); saveCart(); render(); } }),
          el('span', { text: l.q.toLocaleString('ar-EG') }),
          el('button', { type: 'button', 'aria-label': 'زد', text: '+', onclick: function () { l.q = Math.min(99, l.q + 1); saveCart(); render(); } })),
        el('button', { class: 'btn danger', type: 'button', 'aria-label': 'حذف', text: '✕', onclick: function () { cart.splice(i, 1); saveCart(); render(); } })));
    });
    box.appendChild(pan);
    // نموذج الطلب
    var err = el('p', { class: 'err' });
    var fn = el('input', { type: 'text', value: form.name, autocomplete: 'name' }), ph = el('input', { type: 'tel', value: form.phone, placeholder: '01xxxxxxxxx', dir: 'ltr', inputmode: 'numeric', autocomplete: 'tel' });
    var zs = el('select', null, el('option', { value: '', text: 'اختر المحافظة' }), zones.map(function (z) { return el('option', { value: z.id, text: z.name }); }));
    zs.value = form.zone;
    var ad = el('textarea', { placeholder: 'المدينة/الحي، الشارع، رقم المبنى، علامة مميزة' }); ad.value = form.addr;
    var nt = el('textarea', { placeholder: 'ملاحظات (اختياري)', style: 'min-height:60px' }); nt.value = form.note;
    var pay = el('select', null, el('option', { value: 'cod', text: 'الدفع عند الاستلام' }), (site.wallet && site.wallet.number) ? el('option', { value: 'wallet', text: (site.wallet.label || 'محفظة إلكترونية') + ' (تحويل قبل التوصيل)' }) : null);
    pay.value = form.pay;
    var remember = el('input', { type: 'checkbox', id: 'rm' }); remember.checked = !!S.get('cust', null);
    var sub = cart.reduce(function (a, l) { return a + lineTotal(l); }, 0);
    var tots = el('div', { class: 'panel' });
    function recalc() {
      var z = zoneOf(zs.value); tots.textContent = '';
      tots.appendChild(el('div', { class: 'tot' }, el('span', { text: 'المنتجات' }), el('span', { text: P(sub) })));
      var shipTxt = !z ? 'اختر المحافظة' : (z.price == null || z.price === '') ? 'يُحدَّد عند التأكيد' : P(z.price);
      tots.appendChild(el('div', { class: 'tot' }, el('span', { text: 'الشحن' + (z && z.days ? ' (' + z.days + ')' : '') }), el('span', { text: shipTxt })));
      var known = z && z.price != null && z.price !== '';
      tots.appendChild(el('div', { class: 'tot g' }, el('span', { text: 'الإجمالي' }), el('span', { text: known ? P(sub + Number(z.price)) : P(sub) + (z ? ' + الشحن' : '') })));
    }
    zs.addEventListener('change', recalc); recalc();
    box.appendChild(el('div', { class: 'panel' }, el('h3', { text: 'بيانات التوصيل' }),
      el('label', { text: 'الاسم' }), fn, el('label', { text: 'رقم الموبايل' }), ph, el('label', { text: 'المحافظة' }), zs, el('label', { text: 'العنوان' }), ad, el('label', { text: 'ملاحظات' }), nt, el('label', { text: 'طريقة الدفع' }), pay,
      el('label', { for: 'rm', style: 'display:flex;gap:8px;align-items:center;margin-top:12px' }, remember, 'تذكّر بياناتي على هذا الجهاز'),
      el('p', { class: 'hint', text: 'بياناتك لا تُرسل لأي خادم. تذهب فقط في رسالة واتساب التي تضغط إرسالها بنفسك.' })));
    box.appendChild(tots); box.appendChild(err);
    box.appendChild(el('button', { class: 'btn wa', type: 'button', style: 'width:100%', text: 'أرسل الطلب عبر واتساب', onclick: function () {
      var phone = ph.value.replace(/[\s\-]/g, '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
      if (!fn.value.trim()) { err.textContent = 'اكتب اسمك.'; return; }
      if (!/^01[0125]\d{8}$/.test(phone)) { err.textContent = 'رقم الموبايل يجب أن يكون 11 رقماً ويبدأ بـ 01.'; return; }
      var z = zoneOf(zs.value); if (!z) { err.textContent = 'اختر المحافظة.'; return; }
      if (!ad.value.trim()) { err.textContent = 'اكتب العنوان.'; return; }
      form = { name: fn.value.trim(), phone: phone, zone: zs.value, addr: ad.value.trim(), note: nt.value.trim(), pay: pay.value };
      if (remember.checked) S.set('cust', form); else S.del('cust');
      var byStore = {};
      cart.forEach(function (l) { var p = prod(l.pid), s = store(p.store); var k = s ? s.name : 'أخرى'; (byStore[k] = byStore[k] || []).push(l); });
      var msg = ['طلب جديد من اقتناء', ''];
      Object.keys(byStore).forEach(function (k) {
        msg.push('• ' + k);
        byStore[k].forEach(function (l) { var p = prod(l.pid); msg.push('  - ' + p.name + (optText(l.opt) ? ' (' + optText(l.opt) + ')' : '') + ' × ' + l.q + ' = ' + P(p.price * l.q)); });
      });
      var known = z.price != null && z.price !== '';
      msg.push('', 'المنتجات: ' + P(sub), 'الشحن إلى ' + z.name + ': ' + (known ? P(z.price) : 'يُحدَّد عند التأكيد'), 'الإجمالي: ' + (known ? P(sub + Number(z.price)) : P(sub) + ' + الشحن'), '',
        'الدفع: ' + (form.pay === 'wallet' ? ((site.wallet && site.wallet.label) || 'محفظة') : 'عند الاستلام'), '',
        'الاسم: ' + form.name, 'الموبايل: ' + form.phone, 'المحافظة: ' + z.name, 'العنوان: ' + form.addr);
      if (form.note) msg.push('ملاحظات: ' + form.note);
      var l = waLink(msg.join('\n'));
      if (!l) { err.textContent = 'رقم واتساب المتجر غير مضبوط بعد، فلا يمكن الإرسال حالياً.'; return; }
      err.textContent = ''; window.open(l, '_blank', 'noopener');
      say('فُتح واتساب. اضغط إرسال هناك لإتمام الطلب. السلة باقية حتى تتأكد.');
    } }));
    box.appendChild(el('button', { class: 'btn', type: 'button', style: 'margin-top:8px', text: 'تفريغ السلة', onclick: function () { if (confirm('تفريغ السلة؟')) { cart = []; saveCart(); render(); } } }));
    return box;
  }
  function shippingPage() {
    var rows = zones.map(function (z) { return el('tr', null, el('td', { text: z.name }), el('td', { text: z.price == null || z.price === '' ? 'يُحدَّد عند التأكيد' : P(z.price) }), el('td', { text: z.days || '—' })); });
    return el('div', null, el('h2', { text: 'الشحن والتوصيل' }), el('div', { class: 'panel' }, el('table', null, el('thead', null, el('tr', null, el('th', { text: 'المحافظة' }), el('th', { text: 'سعر الشحن' }), el('th', { text: 'المدة' }))), el('tbody', null, rows))));
  }
  function aboutPage() {
    var c = site.contact || {};
    return el('div', null, el('h2', { text: 'عن اقتناء' }),
      el('div', { class: 'panel' }, el('h3', { text: 'كيف تطلب' }), el('ol', null, el('li', { text: 'اختر منتجاتك وأضفها للسلة.' }), el('li', { text: 'اكتب بيانات التوصيل واختر المحافظة.' }), el('li', { text: 'اضغط «أرسل الطلب عبر واتساب» ثم أرسل الرسالة.' }), el('li', { text: 'نؤكد معك ونوصّل.' }))),
      el('div', { class: 'panel' }, el('h3', { text: 'الشروط' }), el('ul', null, (site.policy || []).map(function (t) { return el('li', { text: t }); }))),
      el('div', { class: 'panel' }, el('h3', { text: 'معنى العلامات' }),
        el('ul', null, el('li', null, el('span', { class: 'badge b-own', text: '◈ من اقتناء' }), ' متجر يملكه ويديره اقتناء.'), el('li', null, el('span', { class: 'badge b-ver', text: '✓ شريك معتمد' }), ' متجر لشريك راجعناه واعتمدناه.'), el('li', null, el('span', { class: 'badge b-ext', text: 'بائع خارجي' }), ' بائع غير مراجَع من اقتناء.'))),
      el('div', { class: 'panel' }, el('h3', { text: 'الخصوصية' }), el('p', { text: 'لا حسابات ولا خادم: سلتك وبياناتك (إن طلبت تذكّرها) تُحفظ في متصفحك فقط. بيانات الطلب تذهب إلى واتساب عند إرسالك الرسالة. الخطوط تُحمَّل من Google Fonts.' }), el('p', { class: 'hint', text: 'صيغة كتبها مساعد ذكاء اصطناعي وليست استشارة قانونية.' })),
      c.email ? el('p', null, el('a', { href: 'mailto:' + c.email, text: c.email })) : null);
  }
  function notFound() { return el('div', null, el('p', { text: 'لم أجد هذه الصفحة.' }), el('a', { class: 'btn', href: '#/', text: 'الرئيسية' })); }

  function go(h) { location.hash = h; }
  function render() {
    var p = location.hash.replace(/^#\/?/, '').split('/'), a = p[1] ? decodeURIComponent(p.slice(1).join('/')) : '', v;
    if (p[0] === 'store') v = storePage(a); else if (p[0] === 'p') v = prodPage(a); else if (p[0] === 'cart') v = cartPage();
    else if (p[0] === 'search') v = searchPage(a); else if (p[0] === 'shipping') v = shippingPage(); else if (p[0] === 'about') v = aboutPage(); else v = home();
    app.textContent = ''; app.appendChild(v);
    var ir = Q.safeUrl(site.irtikaz || '');
    app.appendChild(el('footer', null,
      el('div', { class: 'row', style: 'justify-content:center;gap:16px;margin-bottom:8px' }, el('a', { href: '#/shipping', text: 'الشحن' }), el('a', { href: '#/about', text: 'عن اقتناء والشروط' })),
      'أُنشئ بواسطة ', ir ? el('a', { href: ir, target: '_blank', rel: 'noopener', text: 'ارتكاز' }) : 'ارتكاز'));
    count();
  }
  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });
  Promise.all([Q.load('stores.json', { stores: [] }), Q.load('products.json', { products: [] }), Q.load('shipping.json', { zones: [] }), Q.load('site.json', site)]).then(function (r) {
    stores = r[0].stores || []; products = r[1].products || []; zones = r[2].zones || []; site = r[3] || site; render();
  });
})();
