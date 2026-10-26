(function () {
  'use strict';
  function add(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(n, x); });
    else n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function store(prefix) {
    return {
      get: function (k, d) { try { var v = localStorage.getItem(prefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { try { localStorage.setItem(prefix + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
      del: function (k) { try { localStorage.removeItem(prefix + k); } catch (e) {} }
    };
  }
  function safeUrl(u) { try { var x = new URL(String(u).trim(), location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } }
  function price(n) { return (Number(n) || 0).toLocaleString('ar-EG') + ' ج.م'; }
  function load(u, d) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : d; }).catch(function () { return d; }); }
  function uid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
  var toast, tt;
  function say(t, bad) {
    toast = toast || document.getElementById('toast'); if (!toast) return;
    clearTimeout(tt); toast.textContent = t; toast.className = 'toast show' + (bad ? ' bad' : ''); tt = setTimeout(function () { toast.className = 'toast'; }, bad ? 7000 : 3500);
  }
  // علامة الملكية: نص ورمز معاً، لا لون فقط
  function badge(owner, verified) {
    if (owner === 'own') return { cls: 'b-own', text: '◈ من اقتناء' };
    if (owner === 'partner' && verified) return { cls: 'b-ver', text: '✓ شريك معتمد' };
    if (owner === 'partner') return { cls: 'b-ext', text: 'شريك' };
    return { cls: 'b-ext', text: 'بائع خارجي' };
  }
  window.Iq = { el: el, store: store, safeUrl: safeUrl, price: price, load: load, uid: uid, say: say, badge: badge };
})();
