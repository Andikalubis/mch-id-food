/* =========================================================
   RENDER — satu fungsi per section dashboard.
   Hanya menulis ke DOM; tidak menyimpan state (state ada di filter.js).
   ========================================================= */
window.CM = window.CM || {};

(function (CM) {
  'use strict';

  /* ---------- Helper ---------- */
  var nf = new Intl.NumberFormat('id-ID');
  var pf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  var DONUT_C = 2 * Math.PI * 78; // keliling lingkaran r=78

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var fmt = function (n) { return nf.format(Math.round(n)); };
  var pct = function (n) { return pf.format(n); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  var icon = function (id, cls) { return '<svg class="' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  /** Set teks; bila berubah, beri animasi kilat agar perubahan realtime terlihat. */
  function setText(el, text, flash) {
    if (!el || el.textContent === text) return;
    el.textContent = text;
    if (flash) {
      el.classList.remove('is-flash');
      void el.offsetWidth; // restart animasi
      el.classList.add('is-flash');
    }
  }

  CM.util = { $: $, fmt: fmt, pct: pct, esc: esc, icon: icon };

  /* ---------- Status chip per tahap ---------- */
  var STEP_CHIP = { bongkar: 'st-bongkar', tumpuk: 'st-tumpuk', keluar: 'st-keluar', masuk: 'st-proses', muat: 'st-bongkar' };

  CM.stageChip = function (c, lay) {
    var steps = CM.LAYANAN[lay].steps;
    if (c.stage <= 0) return { text: 'Menunggu', cls: 'st-menunggu' };
    if (c.stage >= 4) return { text: 'Selesai', cls: 'st-selesai' };
    var s = steps[c.stage - 1];
    return { text: s.name, cls: STEP_CHIP[s.key] };
  };

  /* =========================================================
     DROPDOWN — membangun ulang opsi hanya jika daftar berubah
     options: [{ value, label, meta?, chip?: {text, cls} }]
     ========================================================= */
  CM.renderDropdown = function (dd, name, options, selected, emptyText) {
    var sig = JSON.stringify(options);
    if (dd.dataset.sig !== sig) {
      dd.dataset.sig = sig;
      $('.dd__value', dd).innerHTML = options.length
        ? options.map(function (o) { return '<span>' + esc(o.label) + '</span>'; }).join('')
        : '<span class="dd__placeholder">' + esc(emptyText || 'Tidak ada data') + '</span>';
      $('.dd__menu', dd).innerHTML = options.map(function (o) {
        return '<li><label class="dd__opt">' +
          '<input type="radio" name="' + name + '" value="' + esc(o.value) + '"' + (name === 'kom' ? ' id="kom-' + esc(o.value) + '"' : '') + '>' +
          '<span>' + esc(o.label) + (o.meta ? ' <small class="dd__meta">' + esc(o.meta) + '</small>' : '') + '</span>' +
          (o.chip ? '<span class="chip chip--xs ' + o.chip.cls + '">' + esc(o.chip.text) + '</span>' : icon('i-check', 'dd__check')) +
          '</label></li>';
      }).join('');
    }
    dd.classList.toggle('is-empty', !options.length);
    dd.querySelectorAll('input').forEach(function (inp) { inp.checked = inp.value === selected; });
  };

  /* =========================================================
     SECTION: INFORMASI KAPAL
     ========================================================= */
  CM.renderVessel = function (v) {
    var pill = $('#vessel-status');
    pill.className = 'status-pill status-pill--' + v.status.type;
    pill.innerHTML = '<span class="status-pill__dot"></span>' + esc(v.status.label);

    var info = function (ic, label, val, cls) {
      return '<div class="info">' + icon(ic, 'info__icon') +
        '<div><dt class="lbl">' + label + '</dt><dd class="val ' + (cls || '') + '">' + esc(val) + '</dd></div></div>';
    };
    $('#vessel-grid').innerHTML =
      info('i-ship', 'Nama Kapal', v.name, 'val--strong') +
      info('i-file-play', 'Voyage In / Voyage Out', v.voyage) +
      '<div class="info">' + icon('i-pin', 'info__icon') +
        '<div class="info__route">' +
          '<div><dt class="lbl">Pelabuhan Asal</dt><dd class="val">' + esc(v.asal) + '</dd></div>' +
          icon('i-arrow', 'info__route-arrow') +
          '<div><dt class="lbl">Pelabuhan Tujuan</dt><dd class="val">' + esc(v.tujuan) + '</dd></div>' +
        '</div></div>' +
      info('i-building', 'Pelayaran', v.pelayaran) +
      info('i-file', 'Nomor PKK', v.pkk, 'val--mono') +
      info('i-berth', 'Berth Position', v.berth);

    var tl = [
      ['arrival', 'Arrival', 'i-anchor'],
      ['berthing', 'Berthing', 'i-berth'],
      ['departure', 'Departure', 'i-ship']
    ];
    $('#vessel-timeline').innerHTML = tl.map(function (t) {
      var d = v.timeline[t[0]];
      return '<li class="timeline__item ' + (d.akt ? 'is-done' : 'is-pending') + '">' + icon(t[2], 'timeline__icon') +
        '<div class="timeline__text"><div class="timeline__name">' + t[1] + '</div>' +
        '<div><span class="timeline__k">Est.</span>' + esc(d.est) + '</div>' +
        '<div class="' + (d.akt ? 'timeline__actual' : '') + '"><span class="timeline__k">Akt.</span>' + esc(d.akt || '-') + '</div>' +
        '</div></li>';
    }).join('');
  };

  /* =========================================================
     SECTION: PROGRES OPERASI KAPAL
     ========================================================= */
  CM.renderProgress = function (v, lay, flash) {
    var ops = v.ops[lay];
    var verb = CM.LAYANAN[lay].verb;
    var done = Math.min(ops.realisasi, ops.rencana);
    var rest = ops.rencana - done;
    var p = ops.rencana ? (done / ops.rencana) * 100 : 0;

    setText($('#pg-lbl-plan'), 'Rencana ' + verb);
    setText($('#pg-lbl-done'), 'Realisasi ' + verb);
    setText($('#pg-plan'), fmt(ops.rencana) + ' ton', flash);
    setText($('#pg-done'), fmt(done) + ' ton', flash);
    setText($('#pg-rest'), fmt(rest) + ' ton', flash);

    var bar = $('#pg-bar');
    bar.setAttribute('aria-label', 'Realisasi ' + pct(p) + ' persen, sisa ' + pct(100 - p) + ' persen');
    var segDone = $('.pbar__seg--done', bar);
    segDone.style.setProperty('--w', p + '%');
    segDone.dataset.tip = 'Realisasi ' + fmt(done) + ' ton · ' + pct(p) + '%';
    $('.pbar__seg--rest', bar).dataset.tip = 'Sisa ' + fmt(rest) + ' ton · ' + pct(100 - p) + '%';
    bar.classList.toggle('is-complete', p >= 100);

    setText($('#pg-legend-done'), 'Realisasi ' + pct(p) + '%', flash);
    setText($('#pg-legend-rest'), 'Sisa ' + pct(100 - p) + '%', flash);

    setText($('#pg-lbl-start'), 'Mulai ' + verb);
    setText($('#pg-lbl-end'), 'Estimasi Selesai ' + verb);
    $('#pg-start').innerHTML = splitDate(ops.mulai);
    $('#pg-end').innerHTML = splitDate(ops.selesai);
  };

  function splitDate(s) {
    if (!s) return 'Belum dimulai';
    var i = s.lastIndexOf(' ');
    return esc(s.slice(0, i)) + '<br>' + esc(s.slice(i + 1));
  }

  /* =========================================================
     SECTION: KOMPOSISI TONASE
     ========================================================= */
  CM.renderTonnage = function (total, owner) {
    var share = total ? Math.min(owner / total, 1) : 0;
    var other = Math.max(total - owner, 0);
    var lenOwner = DONUT_C * share;

    var segOwner = $('.donut__seg--owner');
    var segOther = $('.donut__seg--other');
    segOwner.setAttribute('stroke-dasharray', lenOwner.toFixed(1) + ' ' + DONUT_C.toFixed(1));
    segOther.setAttribute('stroke-dasharray', (DONUT_C - lenOwner).toFixed(1) + ' ' + DONUT_C.toFixed(1));
    segOther.setAttribute('stroke-dashoffset', (-lenOwner).toFixed(1));
    $('.donut__svg').setAttribute('aria-label', 'Tonase cargo owner ' + pct(share * 100) + ' persen dari total ' + fmt(total) + ' ton');

    setText($('#tn-total'), fmt(total) + ' ton', true);
    setText($('#tn-owner'), fmt(owner) + ' ton', true);
    setText($('#tn-owner-sub'), 'Cargo Owner · ' + pct(share * 100) + '%');
    setText($('#tn-other'), fmt(other) + ' ton', true);
    setText($('#tn-other-sub'), 'Lainnya · ' + pct((1 - share) * 100) + '%');
    setText($('#tn-leg-owner'), fmt(owner) + ' ton (' + pct(share * 100) + '%)');
    setText($('#tn-leg-other'), fmt(other) + ' ton (' + pct((1 - share) * 100) + '%)');
  };

  /* =========================================================
     SECTION: DAFTAR KOMODITAS
     ========================================================= */
  CM.renderCommodities = function (list, lay, selectedId) {
    var total = list.reduce(function (s, c) { return s + c.ton; }, 0);
    var max = list.reduce(function (m, c) { return Math.max(m, c.ton); }, 0);

    setText($('#ct-total'), fmt(total) + ' ton', true);
    setText($('#ct-count'), list.length + ' Komoditas', true);

    $('#ct-body').innerHTML = list.length ? list.map(function (c, i) {
      var chip = CM.stageChip(c, lay);
      var share = total ? (c.ton / total) * 100 : 0;
      return '<tr class="ct__row' + (c.id === selectedId ? ' is-selected' : '') + '" data-id="' + esc(c.id) + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="ct__left"><label class="ct__name" for="kom-' + esc(c.id) + '">' + esc(c.nama) + icon('i-arrow') + '</label></td>' +
        '<td>' + esc(c.pbm) + '</td>' +
        '<td>' + esc(c.owner) + '</td>' +
        '<td>' + fmt(c.ton) + ' ton</td>' +
        '<td><span class="ct__pct"><span class="ct__pct-bar" style="--w:' + (max ? (c.ton / max) * 100 : 0) + '%"></span>' + Math.round(share) + '%</span></td>' +
        '<td><span class="chip ' + chip.cls + '">' + chip.text + '</span></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7" class="ct__empty">Tidak ada komoditas untuk filter ini.</td></tr>';

    $('#ct-foot').innerHTML = '<tr><td colspan="4" class="ct__left">Total Keseluruhan</td>' +
      '<td>' + fmt(total) + ' ton</td><td>' + (list.length ? '100%' : '-') + '</td><td>-</td></tr>';
  };

  /** Hanya pindahkan sorotan baris, tanpa render ulang tabel. */
  CM.selectCommodityRow = function (id) {
    document.querySelectorAll('#ct-body .ct__row').forEach(function (tr) {
      tr.classList.toggle('is-selected', tr.dataset.id === id);
    });
  };

  /* =========================================================
     SECTION: MILESTONE + DOKUMEN
     ========================================================= */
  CM.renderMilestonePicker = function (list, lay, selectedId) {
    CM.renderDropdown($('#dd-kom'), 'kom', list.map(function (c) {
      return { value: c.id, label: c.nama + ' (' + fmt(c.ton) + ' ton)', chip: CM.stageChip(c, lay) };
    }), selectedId, 'Tidak ada komoditas');
  };

  CM.renderMilestone = function (c, lay) {
    var L = CM.LAYANAN[lay];
    var flow = $('#ms-flow');
    var docsBox = $('#ms-docs');

    if (!c) {
      flow.innerHTML = '<li class="milestone__empty">Pilih komoditas untuk melihat milestone.</li>';
      docsBox.hidden = true;
      return;
    }
    docsBox.hidden = false;

    var html = [];
    L.steps.forEach(function (s, i) {
      var n = i + 1;
      var state = c.stage > n ? 'done' : c.stage === n ? 'active' : 'pending';
      var chip = { done: ['Selesai', 'st-selesai'], active: ['Berjalan', 'st-berjalan'], pending: ['Menunggu', 'st-menunggu'] }[state];
      var tip = { done: s.name + ' selesai', active: s.name + ' berjalan · ' + fmt(c.ton) + ' ton', pending: 'Menunggu tahap sebelumnya' }[state];
      if (i > 0) html.push('<li class="step__line' + (c.stage > i ? ' is-done' : '') + '" aria-hidden="true"></li>');
      html.push('<li class="step is-' + state + '">' +
        '<div class="step__icon" data-tip="' + esc(tip) + '">' + icon(state === 'done' ? 'i-check' : s.icon) + '</div>' +
        '<div class="step__name">' + s.name + '</div>' +
        '<span class="chip ' + chip[1] + '">' + chip[0] + '</span></li>');
    });
    flow.innerHTML = html.join('');
    // restart animasi masuk
    flow.classList.remove('is-entering'); void flow.offsetWidth; flow.classList.add('is-entering');

    /* Dokumen */
    var MAP = { S: ['Selesai', 'st-selesai'], P: ['Proses', 'st-proses'], M: ['Menunggu', 'st-menunggu'] };
    var docs = L.docs.map(function (name, i) { return { name: name, st: MAP[c.docs.charAt(i)] || MAP.M }; });
    var doneCount = docs.filter(function (d) { return d.st[0] === 'Selesai'; }).length;
    var half = Math.ceil(docs.length / 2);
    var li = function (d) {
      return '<li class="doc">' + icon('i-file', 'doc__icon') + '<span class="doc__name">' + esc(d.name) + '</span>' +
        '<span class="chip ' + d.st[1] + '">' + d.st[0] + '</span></li>';
    };

    setText($('#ms-docs-title'), 'Dokumen ' + L.verb + ' · ' + c.nama);
    $('#ms-docs-count').innerHTML = '<b>' + doneCount + '</b>/' + docs.length + ' selesai';
    $('#ms-docs-a').innerHTML = docs.slice(0, half).map(li).join('');
    $('#ms-docs-b').innerHTML = docs.slice(half).map(li).join('');
  };

  /* =========================================================
     EMPTY STATE
     ========================================================= */
  CM.renderEmpty = function (show, message, suggestion) {
    $('#dashboard').hidden = show;
    $('#empty-state').hidden = !show;
    if (!show) return;
    setText($('#empty-msg'), message);
    var sug = $('#empty-suggest');
    sug.hidden = !suggestion;
    if (suggestion) {
      sug.textContent = suggestion.text;
      sug.dataset.lay = suggestion.lay;
    }
  };
})(window.CM);
