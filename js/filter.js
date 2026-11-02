/* =========================================================
   FILTER + REALTIME
   - Dua state:
       draft   → pilihan di bar filter (berubah saat dropdown dipilih)
       applied → yang ditampilkan dashboard (berubah saat "Terapkan Filter")
   - Filter berjenjang (pada draft): Pelabuhan → Terminal → Kapal → FF/PBM
   - Field yang belum diterapkan ditandai, tombol Terapkan menampilkan badge
   - State yang diterapkan disimpan di URL (?pel=..&ter=..)
   - Data realtime (simulasi) tetap berjalan untuk filter yang diterapkan
   ========================================================= */
(function (CM) {
  'use strict';

  var $ = CM.util.$;
  var fmt = CM.util.fmt;
  var KEYS = ['pel', 'ter', 'kap', 'lay', 'ff'];
  var LIVE_INTERVAL = 4000;

  var data = null;
  var applied = readUrl();
  var draft = pickKeys(applied);
  var dview = null; // turunan dari draft  (untuk bar filter)
  var aview = null; // turunan dari applied (untuk dashboard)

  /* ---------- Helper state ---------- */
  function pickKeys(s) {
    var o = {};
    KEYS.forEach(function (k) { o[k] = s[k]; });
    return o;
  }
  function isPending() {
    return KEYS.some(function (k) { return draft[k] !== applied[k]; });
  }

  /* ---------- URL <-> applied ---------- */
  function readUrl() {
    var q = new URLSearchParams(location.search);
    var s = Object.assign({}, CM.DEFAULT_FILTER);
    KEYS.forEach(function (k) { if (q.get(k)) s[k] = q.get(k); });
    if (q.get('kom')) s.kom = q.get('kom');
    return s;
  }
  function writeUrl() {
    var q = new URLSearchParams();
    KEYS.forEach(function (k) { q.set(k, applied[k]); });
    if (applied.kom) q.set('kom', applied.kom);
    if (currentMode() === '2') q.set('mode', '2');
    history.replaceState(null, '', '?' + q.toString());
  }

  /* ---------- Mode dashboard (1 = lengkap, 2 = tanpa tonase & cargo owner) ----------
     Tampilan diatur CSS (body:has(#mode-2:checked)); JS hanya menyimpan pilihan di URL. */
  function currentMode() {
    var m = document.querySelector('input[name="mode"]:checked');
    return m ? m.value : '1';
  }
  function initMode() {
    var mode = new URLSearchParams(location.search).get('mode') === '2' ? '2' : '1';
    $('#mode-' + mode).checked = true;
    $('#mode-switch').addEventListener('change', function () {
      var dash = $('#dashboard');
      dash.classList.remove('is-applied'); void dash.offsetWidth; dash.classList.add('is-applied');
      writeUrl();
    });
  }

  /* ---------- Turunan data (cascade) ---------- */
  function vesselsFor(pel, ter, lay) {
    return data.vessels.filter(function (v) {
      return v.port === pel && (ter === 'all' || v.terminal === ter) && v.ops[lay];
    });
  }
  function unique(arr) { return arr.filter(function (x, i) { return arr.indexOf(x) === i; }); }

  /** Normalisasi state s (in-place) agar konsisten, lalu kembalikan data turunannya. */
  function resolveFor(s) {
    if (!CM.LAYANAN[s.lay]) s.lay = CM.DEFAULT_FILTER.lay;
    if (!data.ports.some(function (p) { return p.id === s.pel; })) s.pel = data.ports[0].id;

    var terminals = data.terminals.filter(function (t) { return t.port === s.pel; });
    if (s.ter !== 'all' && !terminals.some(function (t) { return t.id === s.ter; })) s.ter = 'all';

    var vessels = vesselsFor(s.pel, s.ter, s.lay);
    if (!vessels.some(function (v) { return v.id === s.kap; })) s.kap = vessels.length ? vessels[0].id : '';
    var vessel = vessels.filter(function (v) { return v.id === s.kap; })[0] || null;

    var byLay = vessel ? vessel.commodities.filter(function (c) { return c.layanan === s.lay; }) : [];
    var pbms = unique(byLay.map(function (c) { return c.pbm; }));
    if (s.ff !== 'all' && pbms.indexOf(s.ff) < 0) s.ff = 'all';

    var list = byLay.filter(function (c) { return s.ff === 'all' || c.pbm === s.ff; });
    var kom = list.some(function (c) { return c.id === s.kom; }) ? s.kom : (list[0] ? list[0].id : null);

    return { vessel: vessel, commodities: list, kom: kom, terminals: terminals, vessels: vessels, byLay: byLay, pbms: pbms };
  }

  function sumTon(list) { return list.reduce(function (s, c) { return s + c.ton; }, 0); }

  /* =========================================================
     BAR FILTER (mengikuti draft)
     ========================================================= */
  function refreshFilters() {
    dview = resolveFor(draft);
    var lay = draft.lay;

    CM.renderDropdown($('#dd-pel'), 'pel', data.ports.map(function (p) {
      return { value: p.id, label: p.name, meta: vesselsFor(p.id, 'all', lay).length + ' kapal' };
    }), draft.pel);

    CM.renderDropdown($('#dd-ter'), 'ter', [{
      value: 'all', label: 'Semua Terminal', meta: vesselsFor(draft.pel, 'all', lay).length + ' kapal'
    }].concat(dview.terminals.map(function (t) {
      return { value: t.id, label: t.name, meta: vesselsFor(draft.pel, t.id, lay).length + ' kapal' };
    })), draft.ter);

    CM.renderDropdown($('#dd-kap'), 'kap', dview.vessels.map(function (v) {
      return { value: v.id, label: v.name, meta: v.status.label.split(' - ')[0] };
    }), draft.kap, 'Tidak ada kapal');

    CM.renderDropdown($('#dd-ff'), 'ff', [{
      value: 'all', label: 'Semua FF / PBM', meta: dview.byLay.length + ' komoditas'
    }].concat(dview.pbms.map(function (p) {
      var n = dview.byLay.filter(function (c) { return c.pbm === p; }).length;
      return { value: p, label: p, meta: n + ' komoditas' };
    })), draft.ff);

    document.querySelectorAll('#filter input[name="lay"]').forEach(function (inp) { inp.checked = inp.value === lay; });

    // Penanda: aktif (≠ default) & belum diterapkan (≠ applied)
    var changed = false;
    KEYS.forEach(function (k) {
      var f = document.querySelector('.field[data-field="' + k + '"]');
      if (!f) return;
      f.classList.toggle('is-changed', draft[k] !== CM.DEFAULT_FILTER[k]);
      f.classList.toggle('is-pending', draft[k] !== applied[k]);
      changed = changed || applied[k] !== CM.DEFAULT_FILTER[k] || draft[k] !== CM.DEFAULT_FILTER[k];
    });

    var pending = isPending();
    var form = $('#filter');
    form.classList.toggle('has-pending', pending);
    form.classList.toggle('has-changes', changed);
    $('#btn-apply').disabled = !pending;
  }

  /* =========================================================
     DASHBOARD (mengikuti applied)
     ========================================================= */
  function renderDashboard() {
    aview = resolveFor(applied);
    applied.kom = aview.kom;
    writeUrl();

    var v = aview.vessel;
    var lay = applied.lay;

    if (!v) {
      var port = data.ports.filter(function (p) { return p.id === applied.pel; })[0];
      var other = lay === 'import' ? 'export' : 'import';
      var alt = vesselsFor(applied.pel, applied.ter, other).length;
      CM.renderEmpty(true,
        'Tidak ada kapal dengan layanan ' + CM.LAYANAN[lay].label + ' di ' + (applied.ter === 'all' ? 'Pelabuhan ' + port.name : 'terminal ini') + '.',
        alt ? { text: 'Lihat layanan ' + CM.LAYANAN[other].label + ' (' + alt + ' kapal)', lay: other } : null);
      return;
    }

    CM.renderEmpty(false);
    CM.renderVessel(v);
    CM.renderProgress(v, lay, false);
    CM.renderTonnage(v.ops[lay].rencana, sumTon(aview.commodities));
    CM.renderCommodities(aview.commodities, lay, aview.kom);
    CM.renderMilestonePicker(aview.commodities, lay, aview.kom);
    CM.renderMilestone(currentCommodity(), lay);
  }

  function currentCommodity() {
    return aview.commodities.filter(function (c) { return c.id === aview.kom; })[0] || null;
  }

  /* ---------- Terapkan ---------- */
  function apply() {
    var kom = applied.kom;
    applied = pickKeys(draft);
    applied.kom = kom;

    // Efek singkat agar pengguna melihat dashboard diperbarui
    var dash = $('#dashboard');
    dash.classList.remove('is-applied'); void dash.offsetWidth; dash.classList.add('is-applied');

    renderDashboard();
    refreshFilters();
  }

  function reset() {
    draft = pickKeys(CM.DEFAULT_FILTER);
    apply();
  }

  /* ---------- Event ---------- */
  function onFilterChange(e) {
    var t = e.target;
    if (!t || t.type !== 'radio' || KEYS.indexOf(t.name) < 0) return;
    draft[t.name] = t.value;
    refreshFilters();          // dashboard belum berubah sampai "Terapkan Filter"
  }

  function onCommodityChange(e) {
    var t = e.target;
    if (!t || t.name !== 'kom') return;
    // Memilih komoditas bukan filter → langsung tampil
    applied.kom = aview.kom = t.value;
    CM.selectCommodityRow(aview.kom);
    CM.renderMilestonePicker(aview.commodities, applied.lay, aview.kom);
    CM.renderMilestone(currentCommodity(), applied.lay);
    writeUrl();
  }

  /** Tutup dropdown setelah opsi diklik dengan mouse (hover tidak membukanya lagi sampai kursor keluar). */
  function bindDropdownClose() {
    document.querySelectorAll('.dd').forEach(function (dd) {
      dd.addEventListener('click', function (e) {
        if (e.detail > 0 && e.target.closest('.dd__opt')) dd.classList.add('is-closed');
      });
      dd.addEventListener('pointerleave', function () { dd.classList.remove('is-closed'); });
    });
  }

  /* ---------- Jam realtime (WIB) ---------- */
  var dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
  var timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
  function tickClock() {
    var now = new Date();
    $('#clock-date').textContent = dateFmt.format(now);
    $('#clock-time').textContent = timeFmt.format(now) + ' WIB';
  }

  /* ---------- Simulasi data realtime ----------
     Ganti dengan WebSocket / polling API: update data lalu panggil CM.liveUpdate(). */
  function simulateTick() {
    if (document.hidden || !data) return;
    var changed = false;
    data.vessels.forEach(function (v) {
      if (v.status.type !== 'berthing') return;
      Object.keys(v.ops).forEach(function (k) {
        var o = v.ops[k];
        if (!o.mulai || o.realisasi >= o.rencana) return;
        o.realisasi = Math.min(o.rencana, o.realisasi + 20 + Math.round(Math.random() * 140));
        changed = true;
      });
    });
    if (changed) liveUpdate();
  }

  function liveUpdate() {
    if (aview && aview.vessel) CM.renderProgress(aview.vessel, applied.lay, true);
  }
  CM.liveUpdate = liveUpdate;

  /* ---------- Init ---------- */
  function init() {
    var form = $('#filter');
    form.addEventListener('change', onFilterChange);
    form.addEventListener('submit', function (e) { e.preventDefault(); if (isPending()) apply(); });
    $('#ms-picker').addEventListener('change', onCommodityChange);
    $('#btn-reset').addEventListener('click', reset);
    $('#empty-reset').addEventListener('click', reset);
    $('#empty-suggest').addEventListener('click', function () { draft.lay = this.dataset.lay; apply(); });
    bindDropdownClose();
    initMode();

    tickClock();
    setInterval(tickClock, 1000);

    CM.fetchData().then(function (d) {
      data = d;
      document.body.classList.remove('is-loading');
      renderDashboard();
      draft = pickKeys(applied);   // draft mulai sama dengan yang diterapkan
      refreshFilters();
      setInterval(simulateTick, LIVE_INTERVAL);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.CM);
