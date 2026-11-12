// Atesta web: lo poco que necesita JavaScript. Sin él, todo se lee igual.
(function () {
  'use strict';

  var dataPromise = null;
  function loadData() {
    if (!dataPromise) dataPromise = fetch('/dados/postos.json').then(function (r) { if (!r.ok) throw new Error(); return r.json(); });
    return dataPromise;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function km(a, b) {
    var dx = (a.lon - b.lon) * 111.32 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110.57;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function fmtKm(k) { return (k < 10 ? k.toFixed(1) : Math.round(k).toString()).replace('.', ',') + ' km'; }

  // Selector de postos: combustible, distrito y «perto de ti» (aproximado por la conexión o exacto con el GPS).
  document.querySelectorAll('[data-picker]').forEach(function (box) {
    var sel = box.querySelector('select');
    var fuelBtns = box.querySelectorAll('[data-fuels] button');
    var sortBox = box.querySelector('[data-sort]');
    var sortBtns = sortBox ? sortBox.querySelectorAll('button') : [];
    var staticLists = box.querySelectorAll('.list[data-d]');
    var dyn = box.querySelector('[data-dyn-list]');
    var status = box.querySelector('.status');
    var more = box.querySelector('[data-more]');
    var tpl = box.querySelector('template').innerHTML;
    var staticFuel = box.getAttribute('data-fuel');
    var state = { fuel: staticFuel, district: '', origin: null, sort: 'price' };

    function row(s, i, dist) {
      var tile = s.g
        ? '<span class="tile logo" aria-hidden="true"><img src="/assets/logos/' + s.g + '.webp" alt="" width="36" height="36"></span>'
        : '<span class="tile" aria-hidden="true">' + esc(s.t) + '</span>';
      return tpl.replace('{url}', s.u).replace('{tile}', tile)
        .replace('{name}', esc(s.n) + (i ? '' : '<span class="best">' + (state.origin && state.sort === 'dist' ? 'Mais perto' : 'Mais barato') + '</span>'))
        .replace('{addr}', esc(s.l)).replace('{km}', dist != null ? fmtKm(dist) : esc(s.m))
        .replace('{seg}', window.atestaSeg(s.p[state.fuel], state.fuel));
    }
    function showStatic() {
      var found = false;
      staticLists.forEach(function (l) {
        var on = l.getAttribute('data-d') === state.district && l.getAttribute('data-f') === state.fuel;
        l.hidden = !on; if (on) found = true;
      });
      return found;
    }
    function setMore() {
      if (!more || !sel) return;
      var o = sel.options[sel.selectedIndex];
      more.href = o.getAttribute('data-url'); more.textContent = o.getAttribute('data-more');
    }
    function setStatus(html) { status.innerHTML = html || ''; bindExact(); }

    function render() {
      setMore();
      if (sortBox) sortBox.hidden = !state.origin;
      if (!state.origin && state.fuel === staticFuel && showStatic()) { dyn.hidden = true; return; }
      loadData().then(function (data) {
        var f = state.fuel, list;
        staticLists.forEach(function (l) { l.hidden = true; });
        if (state.origin) {
          var o = state.origin, radius = 10;
          var withKm = data.filter(function (s) { return s.p[f]; }).map(function (s) { return { s: s, k: km(o, s) }; });
          var near = withKm.filter(function (r) { return r.k <= radius; });
          if (near.length < 3) { radius = 25; near = withKm.filter(function (r) { return r.k <= radius; }); }
          near.sort(state.sort === 'dist' ? function (a, b) { return a.k - b.k; } : function (a, b) { return a.s.p[f] - b.s.p[f] || a.k - b.k; });
          list = near.slice(0, 8);
          if (!list.length) { dyn.hidden = true; setStatus('Não há postos com este combustível a menos de 25 km de ' + esc(o.label) + '.'); return; }
          dyn.innerHTML = list.map(function (r, i) { return row(r.s, i, r.k); }).join('');
          setStatus((o.approx ? 'Postos a menos de ' + radius + ' km de <b>' + esc(o.label) + '</b>, a tua zona aproximada. <button type="button" class="linkish" data-exact>Usar a localização exata</button>'
            : 'Postos a menos de ' + radius + ' km de ti.'));
        } else {
          list = data.filter(function (s) { return s.p[f] && (!state.district || s.d === state.district); })
            .sort(function (a, b) { return a.p[f] - b.p[f]; }).slice(0, 8);
          dyn.innerHTML = list.map(function (s, i) { return row(s, i, null); }).join('');
          setStatus(list.length ? '' : 'Não há postos com este combustível neste distrito.');
        }
        dyn.hidden = !list.length;
      }).catch(function () { setStatus('Não foi possível carregar os postos. Tenta de novo.'); });
    }

    function exact() {
      if (!navigator.geolocation) { setStatus('O teu browser não deixa saber a localização. Escolhe o distrito.'); return; }
      setStatus('A pedir a tua localização…');
      navigator.geolocation.getCurrentPosition(function (pos) {
        state.origin = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'ti', approx: false };
        state.district = ''; if (sel) sel.value = '';
        render();
      }, function () { setStatus('Sem acesso à localização. Escolhe o distrito na lista.'); }, { timeout: 10000, maximumAge: 300000 });
    }
    function bindExact() { var b = status.querySelector('[data-exact]'); if (b) b.addEventListener('click', exact); }

    fuelBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        state.fuel = b.getAttribute('data-f');
        fuelBtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        render();
      });
    });
    sortBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        state.sort = b.getAttribute('data-s');
        sortBtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        render();
      });
    });
    if (sel) sel.addEventListener('change', function () { state.district = sel.value; state.origin = null; render(); });
    var nearBtn = box.querySelector('[data-near]');
    if (nearBtn) nearBtn.addEventListener('click', exact);

    // Zona aproximada al entrar: Cloudflare la deduce de la conexión; no se pide permiso ni se guarda nada.
    if (box.hasAttribute('data-auto-locate')) {
      fetch('/api/onde', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (z) {
        if (!z || z.country !== 'PT' || typeof z.lat !== 'number' || state.origin || state.district) return;
        state.origin = { lat: z.lat, lon: z.lon, label: z.city || 'ti', approx: true };
        render();
      }).catch(function () {});
    }
  });

  // Periodo de los gráficos (cada periodo ya viene dibujado).
  document.querySelectorAll('[data-periods]').forEach(function (box) {
    var btns = box.querySelectorAll('.chips button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-p');
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        box.querySelectorAll('[data-period]').forEach(function (c) { c.hidden = c.getAttribute('data-period') !== p; });
      });
    });
  });
})();
