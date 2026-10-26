(function () {
  'use strict';
  var Q = window.Iq, el = Q.el, say = Q.say, S = Q.store('iqtina:v1:');
  var app = document.getElementById('app');
  var W = S.get('admin', null), tab = 'stores', editS = null, editP = null, dirty = S.get('dirty', {});
  function save(k) { S.set('admin', W); if (k) { dirty[k] = 1; S.set('dirty', dirty); } }
  function download(name, obj) {
    var a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })), download: name });
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
  }
  function storeName(id) { var s = W.stores.filter(function (x) { return x.id === id; })[0]; return s ? s.name : '—'; }
  function slug(s) { var o = String(s).toLowerCase().trim().replace(/[^a-z0-9ء-ي]+/g, '-').replace(/^-|-$/g, ''); return o || Q.uid('s'); }
  function field(label, node, hint) { return el('div', null, el('label', { text: label }), node, hint ? el('p', { class: 'hint', text: hint }) : null); }
  function sel(opts, val) { var s = el('select', null, opts.map(function (o) { return el('option', { value: o[0], text: o[1] }); })); s.value = val; return s; }
  function tabs() {
    return el('nav', { class: 'row', style: 'margin:12px 0' }, [['stores', 'المتاجر والمحلات'], ['products', 'المنتجات'], ['ship', 'الشحن'], ['site', 'الإعدادات']].map(function (t) {
      return el('button', { class: 'btn' + (tab === t[0] ? ' primary' : ''), type: 'button', text: t[1], onclick: function () { tab = t[0]; build(); } });
    }));
  }
  function exportBar(file, key, obj) {
    return el('div', { class: 'panel' },
      el('p', { class: 'hint', text: 'بعد التعديل نزّل الملف وارفعه في المستودع باسمه نفسه (تأكد أنه بلا (1)).' }),
      dirty[key] ? el('p', { class: 'err', text: 'فيه تعديلات لم تُنزَّل بعد.' }) : null,
      el('button', { class: 'btn primary', type: 'button', text: 'تنزيل ' + file, onclick: function () { download(file, obj()); delete dirty[key]; S.set('dirty', dirty); build(); } }));
  }

  /* ----- المتاجر ----- */
  function storesTab() {
    var x = editS || { id: '', name: '', desc: '', parent: 'iqtina', kind: 'shop', owner: 'own', verified: true, status: 'soon', emoji: '🏬', color: '#b8893b', order: W.stores.length };
    var isNew = !editS, f = {}, err = el('p', { class: 'err' });
    f.name = el('input', { type: 'text', value: x.name }); f.desc = el('input', { type: 'text', value: x.desc || '' });
    f.emoji = el('input', { type: 'text', value: x.emoji || '', style: 'max-width:100px' }); f.color = el('input', { type: 'text', value: x.color || '', dir: 'ltr', placeholder: '#b8893b' });
    f.parent = sel([['', '— بلا أب (جذر)']].concat(W.stores.filter(function (s) { return s.kind === 'store' && s.id !== x.id; }).map(function (s) { return [s.id, s.name]; })), x.parent || '');
    f.kind = sel([['store', 'متجر (يحتوي متاجر أو محلات)'], ['shop', 'محل (وحدة بيع واحدة)']], x.kind);
    f.owner = sel([['own', 'ملك اقتناء/مؤمن'], ['partner', 'شريك'], ['external', 'بائع خارجي']], x.owner);
    f.ver = sel([['1', 'معتمد'], ['0', 'غير معتمد']], x.verified ? '1' : '0');
    f.status = sel([['open', 'مفتوح'], ['soon', 'قريباً'], ['order', 'على الطلب']], x.status);
    f.order = el('input', { type: 'number', value: x.order || 0, style: 'max-width:100px' });
    var box = el('section', { class: 'panel' }, el('h2', { text: isNew ? 'إضافة متجر أو محل' : 'تعديل: ' + x.name }),
      field('الاسم', f.name), field('الوصف', f.desc), field('الرمز', f.emoji), field('اللون (hex)', f.color),
      field('يقع تحت', f.parent), field('النوع', f.kind), field('المالك', f.owner), field('الاعتماد', f.ver, 'العلامة الزرقاء ✓ تظهر فقط للشريك المعتمد.'), field('الحالة', f.status), field('الترتيب', f.order), err,
      el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { class: 'btn primary', type: 'button', text: isNew ? 'إضافة' : 'حفظ', onclick: function () {
        if (!f.name.value.trim()) { err.textContent = 'اكتب الاسم.'; return; }
        var col = f.color.value.trim(); if (col && !/^#[0-9a-f]{3,8}$/i.test(col)) { err.textContent = 'اللون يجب أن يكون hex مثل #b8893b.'; return; }
        var o = { id: isNew ? slug(f.name.value) : x.id, name: f.name.value.trim(), desc: f.desc.value.trim(), parent: f.parent.value, kind: f.kind.value, owner: f.owner.value, verified: f.ver.value === '1', status: f.status.value, emoji: f.emoji.value.trim(), color: col, order: Number(f.order.value) || 0 };
        if (isNew && W.stores.some(function (s) { return s.id === o.id; })) o.id = Q.uid('s');
        if (o.parent === o.id) { err.textContent = 'لا يمكن أن يكون المتجر تحت نفسه.'; return; }
        if (isNew) W.stores.push(o); else W.stores[W.stores.indexOf(x)] = o;
        // الأبناء يتبعون الأب لو تغير معرفه: (المعرف ثابت عند التعديل)
        save('stores'); editS = null; build(); say('تم.');
      } }), isNew ? null : el('button', { class: 'btn', type: 'button', text: 'إلغاء', onclick: function () { editS = null; build(); } })));
    var list = el('section', { class: 'panel' }, el('h2', { text: 'المتاجر والمحلات (' + W.stores.length + ')' }));
    (function walk(pid, d) {
      W.stores.filter(function (s) { return (s.parent || '') === pid; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).forEach(function (s) {
        var b = Q.badge(s.owner, s.verified);
        list.appendChild(el('div', { class: 'line', style: 'padding-inline-start:' + d * 16 + 'px' },
          el('div', { style: 'flex:1' }, el('b', { text: (s.emoji || '') + ' ' + s.name }), el('div', { class: 'hint', text: (s.kind === 'store' ? 'متجر' : 'محل') + ' · ' + b.text + ' · ' + ({ open: 'مفتوح', soon: 'قريباً', order: 'على الطلب' })[s.status] })),
          el('button', { class: 'btn', type: 'button', text: 'تعديل', onclick: function () { editS = s; build(); window.scrollTo(0, 0); } }),
          el('button', { class: 'btn danger', type: 'button', text: 'حذف', onclick: function () {
            var kidsN = W.stores.filter(function (k) { return k.parent === s.id; }).length, pn = W.products.filter(function (p) { return p.store === s.id; }).length;
            if (kidsN || pn) { say('لا يمكن الحذف: تحته ' + kidsN + ' متجر/محل و' + pn + ' منتج. انقلها أو احذفها أولاً.', true); return; }
            if (!confirm('حذف «' + s.name + '»؟')) return;
            W.stores = W.stores.filter(function (k) { return k !== s; }); save('stores'); build();
          } })));
        walk(s.id, d + 1);
      });
    })('', 0);
    return el('div', null, box, list, exportBar('stores.json', 'stores', function () { return { version: 1, stores: W.stores }; }));
  }

  /* ----- المنتجات ----- */
  function optsToText(o) { return (o || []).map(function (x) { return x.label + ': ' + x.values.join('، '); }).join('\n'); }
  function textToOpts(t) {
    var out = [], bad = 0;
    t.split(/\r?\n/).forEach(function (ln) {
      if (!ln.trim()) return; var i = ln.indexOf(':'); if (i < 0) { bad++; return; }
      var vals = ln.slice(i + 1).split(/[،,]/).map(function (v) { return v.trim(); }).filter(Boolean);
      if (!ln.slice(0, i).trim() || !vals.length) { bad++; return; }
      out.push({ label: ln.slice(0, i).trim(), values: vals });
    });
    return bad ? null : out;
  }
  function productsTab() {
    var x = editP || { id: '', store: (W.stores[1] || W.stores[0] || {}).id || '', name: '', desc: '', price: '', old: '', img: '', stock: 'in', options: [], hidden: false };
    var isNew = !editP, f = {}, err = el('p', { class: 'err' });
    f.store = sel(W.stores.map(function (s) { return [s.id, s.name]; }), x.store);
    f.name = el('input', { type: 'text', value: x.name }); f.price = el('input', { type: 'number', min: '0', step: 'any', value: x.price }); f.old = el('input', { type: 'number', min: '0', step: 'any', value: x.old || '' });
    f.img = el('input', { type: 'text', dir: 'ltr', value: x.img || '', placeholder: 'img/اسم-الصورة.jpg أو https://…' });
    f.desc = el('textarea'); f.desc.value = x.desc || '';
    f.stock = sel([['in', 'متوفر'], ['order', 'يُجهَّز عند الطلب'], ['out', 'نفد']], x.stock);
    f.opts = el('textarea', { dir: 'rtl', placeholder: 'اللون: أسود، أبيض\nالمقاس: صغير، كبير' }); f.opts.value = optsToText(x.options);
    f.hidden = sel([['0', 'ظاهر'], ['1', 'مخفي']], x.hidden ? '1' : '0');
    var box = el('section', { class: 'panel' }, el('h2', { text: isNew ? 'إضافة منتج' : 'تعديل: ' + x.name }),
      field('المتجر/المحل', f.store), field('الاسم', f.name), field('السعر (ج.م)', f.price), field('السعر قبل الخصم (اختياري)', f.old),
      field('الصورة', f.img, 'ارفع الصورة في مجلد img بالمستودع واكتب مساره، أو ضع رابطاً كاملاً.'), field('الوصف', f.desc), field('التوفر', f.stock),
      field('خيارات (سطر لكل خيار: الاسم: القيم مفصولة بفاصلة)', f.opts), field('الظهور', f.hidden), err,
      el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { class: 'btn primary', type: 'button', text: isNew ? 'إضافة' : 'حفظ', onclick: function () {
        if (!f.name.value.trim()) { err.textContent = 'اكتب الاسم.'; return; }
        var pr = parseFloat(f.price.value); if (!(pr >= 0)) { err.textContent = 'السعر غير صحيح.'; return; }
        var old = f.old.value ? parseFloat(f.old.value) : 0; if (f.old.value && !(old > pr)) { err.textContent = 'السعر قبل الخصم يجب أن يكون أكبر من السعر.'; return; }
        var img = f.img.value.trim(); if (img && !Q.safeUrl(img)) { err.textContent = 'مسار الصورة غير صحيح.'; return; }
        var os = textToOpts(f.opts.value); if (os === null) { err.textContent = 'صيغة الخيارات: «الاسم: قيمة1، قيمة2» في كل سطر.'; return; }
        var o = { id: isNew ? Q.uid('p') : x.id, store: f.store.value, name: f.name.value.trim(), desc: f.desc.value.trim(), price: pr, old: old || 0, img: img, stock: f.stock.value, options: os, hidden: f.hidden.value === '1' };
        if (isNew) W.products.push(o); else W.products[W.products.indexOf(x)] = o;
        save('products'); editP = null; build(); say('تم.');
      } }), isNew ? null : el('button', { class: 'btn', type: 'button', text: 'إلغاء', onclick: function () { editP = null; build(); } })));
    var list = el('section', { class: 'panel' }, el('h2', { text: 'المنتجات (' + W.products.length + ')' }));
    if (!W.products.length) list.appendChild(el('p', { class: 'hint', text: 'لا منتجات بعد.' }));
    W.products.forEach(function (p) {
      list.appendChild(el('div', { class: 'line' }, el('div', { style: 'flex:1' }, el('b', { text: p.name }), el('div', { class: 'hint', text: storeName(p.store) + ' · ' + Q.price(p.price) + (p.hidden ? ' · مخفي' : '') })),
        el('button', { class: 'btn', type: 'button', text: 'تعديل', onclick: function () { editP = p; build(); window.scrollTo(0, 0); } }),
        el('button', { class: 'btn danger', type: 'button', text: 'حذف', onclick: function () { if (!confirm('حذف المنتج؟')) return; W.products = W.products.filter(function (k) { return k !== p; }); save('products'); build(); } })));
    });
    return el('div', null, box, list, exportBar('products.json', 'products', function () { return { version: 1, products: W.products }; }));
  }

  /* ----- الشحن ----- */
  function shipTab() {
    var box = el('section', { class: 'panel' }, el('h2', { text: 'مناطق الشحن (' + W.zones.length + ')' }),
      el('p', { class: 'hint', text: 'اترك السعر فارغاً ليظهر «يُحدَّد عند التأكيد». الأسعار والمدد تُحفظ كما تكتبها.' }));
    var bulk = el('input', { type: 'number', min: '0', placeholder: 'سعر موحّد لكل المحافظات الفارغة' });
    box.appendChild(el('div', { class: 'row' }, bulk, el('button', { class: 'btn', type: 'button', text: 'طبّق على الفارغ', onclick: function () {
      var v = parseFloat(bulk.value); if (!(v >= 0)) { say('اكتب سعراً صحيحاً.', true); return; }
      W.zones.forEach(function (z) { if (z.price == null || z.price === '') z.price = v; }); save('ship'); build();
    } })));
    W.zones.forEach(function (z, i) {
      var p = el('input', { type: 'number', min: '0', step: 'any', value: z.price == null ? '' : z.price, 'aria-label': 'سعر ' + z.name, style: 'max-width:110px' });
      var d = el('input', { type: 'text', value: z.days || '', placeholder: 'المدة', 'aria-label': 'مدة ' + z.name, style: 'max-width:140px' });
      p.addEventListener('change', function () { z.price = p.value === '' ? null : parseFloat(p.value); save('ship'); });
      d.addEventListener('change', function () { z.days = d.value.trim(); save('ship'); });
      box.appendChild(el('div', { class: 'line' }, el('span', { style: 'flex:1', text: z.name }), p, d,
        el('button', { class: 'btn danger', type: 'button', 'aria-label': 'حذف', text: '✕', onclick: function () { W.zones.splice(i, 1); save('ship'); build(); } })));
    });
    var nn = el('input', { type: 'text', placeholder: 'منطقة جديدة (مثل: القاهرة الجديدة)' });
    box.appendChild(el('div', { class: 'row', style: 'margin-top:10px' }, nn, el('button', { class: 'btn primary', type: 'button', text: 'إضافة منطقة', onclick: function () {
      if (!nn.value.trim()) return; W.zones.push({ id: Q.uid('z'), name: nn.value.trim(), price: null, days: '' }); save('ship'); build();
    } })));
    return el('div', null, box, exportBar('shipping.json', 'ship', function () { return { version: 1, zones: W.zones }; }));
  }

  /* ----- الإعدادات ----- */
  function siteTab() {
    var f = {}, T = W.site;
    f.wa = el('input', { type: 'tel', dir: 'ltr', value: T.whatsapp || '', placeholder: '2010xxxxxxxx' });
    f.wl = el('input', { type: 'text', value: (T.wallet || {}).label || '' }); f.wn = el('input', { type: 'tel', dir: 'ltr', value: (T.wallet || {}).number || '' });
    f.pol = el('textarea'); f.pol.value = (T.policy || []).join('\n');
    var err = el('p', { class: 'err' });
    return el('div', null, el('section', { class: 'panel' }, el('h2', { text: 'إعدادات المتجر' }),
      field('رقم واتساب لاستقبال الطلبات', f.wa, 'بصيغة دولية بلا + ولا أصفار: مثال 201012345678 لرقم مصري يبدأ بـ 010.'),
      field('اسم المحفظة الإلكترونية (اختياري)', f.wl), field('رقم المحفظة (اختياري)', f.wn, 'إن تركته فارغاً لا يظهر خيار المحفظة. الرقم يظهر للزبون بعد الطلب فقط في رسالتك أنت، ولا يُنشر في الموقع.'),
      field('الشروط (سطر لكل بند)', f.pol, 'عدّلها بما يناسبك. هذه صيغة أولية، ولم تُراجَع قانونياً.'), err,
      el('button', { class: 'btn primary', type: 'button', style: 'margin-top:12px', text: 'حفظ', onclick: function () {
        var wa = f.wa.value.replace(/\D/g, ''); if (f.wa.value.trim() && !/^20\d{10}$/.test(wa)) { err.textContent = 'الرقم المصري الدولي: 20 ثم 10 أرقام (مثل 201012345678).'; return; }
        T.whatsapp = wa; T.wallet = { label: f.wl.value.trim(), number: f.wn.value.replace(/\D/g, '') }; T.policy = f.pol.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        save('site'); err.textContent = ''; build(); say('تم.');
      } })), exportBar('site.json', 'site', function () { return W.site; }));
  }

  function build() {
    app.textContent = ''; app.appendChild(tabs());
    app.appendChild(tab === 'stores' ? storesTab() : tab === 'products' ? productsTab() : tab === 'ship' ? shipTab() : siteTab());
    app.appendChild(el('section', { class: 'panel' }, el('p', { class: 'hint', text: 'المسودة محفوظة في متصفحك فقط. لو بدّلت الجهاز فاسحب الملفات المنشورة من جديد.' }),
      el('button', { class: 'btn danger', type: 'button', text: 'استبدال المسودة بالمنشور', onclick: function () { if (!confirm('ستُمحى مسودتك. متأكد؟')) return; W = null; S.del('admin'); S.set('dirty', {}); dirty = {}; seed(); } })));
  }
  function seed() {
    Promise.all([Q.load('stores.json', { stores: [] }), Q.load('products.json', { products: [] }), Q.load('shipping.json', { zones: [] }), Q.load('site.json', {})]).then(function (r) {
      W = { stores: r[0].stores || [], products: r[1].products || [], zones: r[2].zones || [], site: r[3] || {} }; S.set('admin', W); build();
    });
  }
  if (W && W.stores) build(); else seed();
})();
