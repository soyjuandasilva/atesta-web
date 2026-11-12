// Atesta web: lo poco que necesita JavaScript. Sin él, todo se lee igual.
(function () {
  'use strict';

  // Selector de distrito y combustible: enseña la lista que toca (todas están ya en el HTML).
  document.querySelectorAll('[data-picker]').forEach(function (box) {
    var sel = box.querySelector('select');
    var chips = box.querySelectorAll('.chips button');
    var lists = box.querySelectorAll('[data-d]');
    var nearList = box.querySelector('[data-near-list]');
    var status = box.querySelector('.status');
    var fuel = box.getAttribute('data-fuel');
    var link = box.querySelector('[data-more]');
    function show() {
      var d = sel ? sel.value : '';
      if (nearList) nearList.hidden = true;
      lists.forEach(function (l) { l.hidden = !(l.getAttribute('data-d') === d && (!l.hasAttribute('data-f') || l.getAttribute('data-f') === fuel)); });
      if (link && sel) {
        var o = sel.options[sel.selectedIndex];
        link.href = o.getAttribute('data-url') || link.href;
        link.textContent = o.getAttribute('data-more') || link.textContent;
      }
      if (status) status.textContent = '';
    }
    if (sel) sel.addEventListener('change', show);
    chips.forEach(function (b) {
      b.addEventListener('click', function () {
        fuel = b.getAttribute('data-f');
        chips.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        if (nearList && !nearList.hidden && box._near) renderNear(box._near); else show();
      });
    });

    var nearBtn = box.querySelector('[data-near]');
    function renderNear(pos) {
      box._near = pos;
      var src = box._data;
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      var rows = src.map(function (s) {
        var p = s.p[fuel];
        if (!p) return null;
        var dx = (s.lon - lon) * 111.32 * Math.cos(lat * Math.PI / 180), dy = (s.lat - lat) * 110.57;
        return { s: s, p: p, km: Math.sqrt(dx * dx + dy * dy) };
      }).filter(function (r) { return r && r.km <= 15; }).sort(function (a, b) { return a.p - b.p || a.km - b.km; }).slice(0, 5);
      lists.forEach(function (l) { l.hidden = true; });
      if (!rows.length) { status.textContent = 'Não encontrámos postos com este combustível a menos de 15 km.'; return; }
      var tpl = box.querySelector('template');
      nearList.innerHTML = rows.map(function (r, i) {
        return tpl.innerHTML
          .replace('{url}', r.s.u)
          .replace('{tile}', r.s.g
            ? '<span class="tile logo" aria-hidden="true"><img src="/assets/logos/' + r.s.g + '.webp" alt="" width="36" height="36"></span>'
            : '<span class="tile" aria-hidden="true">' + esc(r.s.t) + '</span>').replace('{name}', esc(r.s.n) + (i === 0 ? '<span class="best">Mais barato</span>' : ''))
          .replace('{addr}', esc(r.s.l)).replace('{km}', r.km.toFixed(1).replace('.', ',') + ' km').replace('{seg}', window.atestaSeg(r.p, fuel));
      }).join('');
      nearList.hidden = false;
      status.textContent = 'Os mais baratos a menos de 15 km de ti.';
    }
    if (nearBtn) nearBtn.addEventListener('click', function () {
      if (!navigator.geolocation) { status.textContent = 'O teu browser não deixa saber a localização. Escolhe o distrito.'; return; }
      status.textContent = 'A procurar a tua localização…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (box._data) return renderNear(pos);
        fetch('/dados/postos.json').then(function (r) { return r.json(); }).then(function (data) { box._data = data; renderNear(pos); })
          .catch(function () { status.textContent = 'Não foi possível carregar os postos. Tenta de novo.'; });
      }, function () { status.textContent = 'Sem acesso à localização. Escolhe o distrito na lista.'; }, { timeout: 10000, maximumAge: 300000 });
    });
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

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
})();
