/* Wise Partners — shared script (vanilla, no dependencies) */
var CONFIG = {
  platformName: 'Wise Partners',
  domain: 'wisepartners-eg.com',
  phone: '201014935943',    // الرقم الافتراضي (الرئيسية والخصوصية والشكر). كل صفحة مشروع ليها رقمها في data-phone على الـ body
  whatsapp: '201225558122', // نفس المبدأ: data-whatsapp على الـ body بيغلب القيمة دي
  leadsDestination: 'whatsapp', // 'whatsapp' | 'sheet'
  sheetEndpoint: '',  // رابط Google Apps Script (Web app URL) لفورم تسجيل البيانات اللي بيسجل في الشيت
  cookieBannerSeconds: 8
};

(function () {
  'use strict';
  var body = document.body;
  if (body.getAttribute('data-phone')) CONFIG.phone = body.getAttribute('data-phone');
  if (body.getAttribute('data-whatsapp')) CONFIG.whatsapp = body.getAttribute('data-whatsapp');
  var PAGE = {
    type: body.getAttribute('data-page-type') || 'home',
    project: body.getAttribute('data-project') || '',
    waText: body.getAttribute('data-wa-text') || ('مرحبًا، أريد الاستفسار من ' + CONFIG.platformName)
  };
  window.dataLayer = window.dataLayer || [];

  function track(eventName, extra) {
    var payload = { event: eventName, page_type: PAGE.type, project: PAGE.project };
    if (extra) for (var k in extra) payload[k] = extra[k];
    window.dataLayer.push(payload);
  }
  function waUrl(text) {
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
  }

  /* ---------- 1. Capture ad parameters ---------- */
  var PARAMS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  try {
    var qs = new URLSearchParams(location.search);
    PARAMS.forEach(function (p) { var v = qs.get(p); if (v) sessionStorage.setItem('lp_' + p, v); });
  } catch (e) {}
  function getParam(p) { try { return sessionStorage.getItem('lp_' + p) || ''; } catch (e) { return ''; } }

  /* ---------- 2. WhatsApp + call links ---------- */
  document.querySelectorAll('[data-wa]').forEach(function (el) {
    var text = el.getAttribute('data-wa-msg') || PAGE.waText;
    el.setAttribute('href', waUrl(text));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });
  document.querySelectorAll('[data-call]').forEach(function (el) {
    el.setAttribute('href', 'tel:+' + CONFIG.phone);
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) track('call_click');
    else if (href.indexOf('wa.me') !== -1 && !a.hasAttribute('data-form-wa')) track('whatsapp_click');
  });

  /* ---------- 3. Card CTA → preselect project in form ---------- */
  document.querySelectorAll('[data-pick-project]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sel = document.getElementById('lp-project');
      if (sel) sel.value = btn.getAttribute('data-pick-project');
    });
  });

  /* ---------- 4. Lead form ---------- */
  var COUNTRIES = [
    ['EG', '20', '🇪🇬'], ['SA', '966', '🇸🇦'], ['AE', '971', '🇦🇪'], ['KW', '965', '🇰🇼'], ['QA', '974', '🇶🇦'],
    ['BH', '973', '🇧🇭'], ['OM', '968', '🇴🇲'], ['JO', '962', '🇯🇴'], ['LB', '961', '🇱🇧'], ['IQ', '964', '🇮🇶'],
    ['LY', '218', '🇱🇾'], ['SD', '249', '🇸🇩'], ['MA', '212', '🇲🇦'], ['DZ', '213', '🇩🇿'], ['TN', '216', '🇹🇳'],
    ['US', '1', '🇺🇸'], ['GB', '44', '🇬🇧'], ['CA', '1', '🇨🇦'], ['DE', '49', '🇩🇪'], ['FR', '33', '🇫🇷'],
    ['IT', '39', '🇮🇹'], ['NL', '31', '🇳🇱'], ['TR', '90', '🇹🇷'], ['AU', '61', '🇦🇺']
  ];
  function fillCC(sel) {
    COUNTRIES.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c[1]; o.textContent = c[2] + ' +' + c[1]; o.setAttribute('data-iso', c[0]);
      sel.appendChild(o);
    });
    sel.value = '20';
  }
  function normalize(cc, raw) {
    var n = String(raw).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[^\d]/g, '');
    n = n.replace(/^00/, '');
    if (n.indexOf(cc) === 0 && n.length > cc.length + 6) n = n.slice(cc.length);
    n = n.replace(/^0+/, '');
    return n;
  }
  function validPhone(cc, n) {
    if (cc === '20') return /^(10|11|12|15)\d{8}$/.test(n);
    return /^\d{7,12}$/.test(n);
  }
  function setInvalid(field, bad) { field.classList.toggle('is-invalid', bad); }

  var form = document.getElementById('lp-form');
  if (form) {
    var cc = form.querySelector('#lp-cc');
    fillCC(cc);

    // money inputs: digits only, thousands separators
    function toDigits(v) { return String(v).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[^\d]/g, ''); }
    function fmt(n) { return n ? Number(n).toLocaleString('en-US') : ''; }
    form.querySelectorAll('.lp-money').forEach(function (inp) {
      inp.addEventListener('input', function () { inp.value = fmt(toDigits(inp.value)); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('.lp-hp input').value) return; // honeypot
      var nameF = form.querySelector('[data-field="name"]');
      var phoneF = form.querySelector('[data-field="phone"]');
      var name = form.name_full.value.trim();
      var code = cc.value;
      var num = normalize(code, form.phone_local.value);
      var dpF = form.querySelector('[data-field="dp"]');
      var instF = form.querySelector('[data-field="inst"]');
      var dp = toDigits(form.down_payment.value), inst = toDigits(form.monthly.value);
      var okName = name.length >= 2;
      var okPhone = validPhone(code, num);
      var okDp = dp.length > 0, okInst = inst.length > 0;
      setInvalid(nameF, !okName); setInvalid(phoneF, !okPhone); setInvalid(dpF, !okDp); setInvalid(instF, !okInst);
      if (!okName || !okPhone || !okDp || !okInst) return;

      var intl = '+' + code + num;
      var projSel = form.querySelector('#lp-project');
      var project = projSel ? projSel.value : PAGE.project;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.setAttribute('data-label', btn.textContent); btn.textContent = 'جارٍ الإرسال…';

      var data = { name: name, phone: intl, project: project, down_payment: dp, monthly: inst, page: location.href.split('?')[0], time: new Date().toISOString() };
      PARAMS.forEach(function (p) { data[p] = getParam(p); });

      function onceLead() {
        try { if (sessionStorage.getItem('lp_lead_sent')) return; sessionStorage.setItem('lp_lead_sent', '1'); } catch (e) {}
        track('generate_lead', { lead_project: project, lead_source: 'whatsapp_form' });
      }

      if (CONFIG.leadsDestination === 'whatsapp') {
        onceLead();
        var msg = 'ميزانيتي — ' + CONFIG.platformName + '\nالمقدم المتاح: ' + fmt(dp) + ' جنيه\nالقسط الشهري: ' + fmt(inst) + ' جنيه\nالمشروع المفضل: ' + (project || '—') + '\nالاسم: ' + name + '\nالموبايل: ' + intl;
        window.open(waUrl(msg), '_blank', 'noopener');
        btn.disabled = false; btn.textContent = btn.getAttribute('data-label');
        form.reset(); cc.value = '20';
        return;
      }
      var fd = new FormData(); for (var k in data) fd.append(k, data[k]);
      fetch(CONFIG.sheetEndpoint, { method: 'POST', body: fd })
        .then(function (r) { if (!r.ok) throw new Error(r.status); location.href = '/thank-you.html'; })
        .catch(function () {
          btn.disabled = false; btn.textContent = btn.getAttribute('data-label');
          var err = form.querySelector('.lp-form__fail');
          if (err) { err.hidden = false; err.querySelector('a').setAttribute('href', waUrl(PAGE.waText)); }
        });
    });
  }

  /* ---------- 4b. Registration form → Google Sheet ---------- */
  var sform = document.getElementById('lp-sheet-form');
  if (sform) {
    var scc = sform.querySelector('.lp-cc');
    fillCC(scc);
    sform.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sform.querySelector('.lp-hp input').value) return; // honeypot
      var nameF = sform.querySelector('[data-field="name"]');
      var phoneF = sform.querySelector('[data-field="phone"]');
      var name = sform.name_full.value.trim();
      var code = scc.value;
      var num = normalize(code, sform.phone_local.value);
      var okName = name.length >= 2, okPhone = validPhone(code, num);
      setInvalid(nameF, !okName); setInvalid(phoneF, !okPhone);
      if (!okName || !okPhone) return;

      var fail = sform.querySelector('.lp-form__fail');
      var btn = sform.querySelector('button[type="submit"]');
      function showFail() {
        btn.disabled = false; btn.textContent = btn.getAttribute('data-label');
        if (fail) { fail.hidden = false; fail.querySelector('a').setAttribute('href', waUrl(PAGE.waText)); }
      }
      if (!CONFIG.sheetEndpoint) { btn.setAttribute('data-label', btn.textContent); showFail(); return; }
      btn.disabled = true; btn.setAttribute('data-label', btn.textContent); btn.textContent = 'جارٍ الإرسال…';
      if (fail) fail.hidden = true;

      var projSel = sform.querySelector('select[name="project"]');
      var data = {
        time: new Date().toISOString(), name: name, phone: '+' + code + num,
        project: projSel ? projSel.value : PAGE.project, page: location.href.split('?')[0], page_type: PAGE.type
      };
      PARAMS.forEach(function (p) { data[p] = getParam(p); });
      var fd = new FormData(); for (var k in data) fd.append(k, data[k]);
      // no-cors: Apps Script لا يرجّع CORS headers ثابتة؛ أي فشل شبكة بيروح للـ catch
      fetch(CONFIG.sheetEndpoint, { method: 'POST', body: fd, mode: 'no-cors' })
        .then(function () {
          try { sessionStorage.setItem('lp_lead_project', data.project); } catch (e) {}
          location.href = '/thank-you.html';
        })
        .catch(showFail);
    });
  }

  /* ---------- 5. Thank-you page (sheet destination) ---------- */
  if (PAGE.type === 'thank-you') {
    try { if (!sessionStorage.getItem('lp_lead_sent')) { sessionStorage.setItem('lp_lead_sent', '1'); track('generate_lead', { lead_project: sessionStorage.getItem('lp_lead_project') || '', lead_source: 'sheet_form' }); } } catch (e) {}
  }

  /* ---------- 6. Cookie banner ---------- */
  var cookie = document.getElementById('lp-cookie');
  if (cookie) {
    var seen = false;
    try { seen = !!sessionStorage.getItem('lp_cookie_seen'); } catch (e) {}
    if (!seen) {
      cookie.hidden = false;
      try { sessionStorage.setItem('lp_cookie_seen', '1'); } catch (e) {}
      var hide = function () { cookie.classList.add('is-out'); setTimeout(function () { cookie.hidden = true; }, 300); };
      cookie.querySelector('.lp-cookie__close').addEventListener('click', hide);
      setTimeout(hide, CONFIG.cookieBannerSeconds * 1000);
    }
  }

  /* ---------- 7. Gallery carousel ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (track) {
    var section = track.closest('section');
    var rtl = getComputedStyle(track).direction === 'rtl';
    function step() { var s = track.querySelector('.lp-carousel__slide'); return s ? s.getBoundingClientRect().width + 12 : 300; }
    section.querySelectorAll('.lp-carousel__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = btn.getAttribute('data-dir') === 'next' ? 1 : -1;
        track.scrollBy({ left: dir * step() * (rtl ? -1 : 1), behavior: 'smooth' });
      });
    });
  });

  /* ---------- 8. Header: hide on scroll down after hero, show on scroll up ---------- */
  var hdr = document.querySelector('.lp-header');
  if (hdr) {
    var hero = document.querySelector('.lp-hero, .lp-legal-hero');
    var lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        var limit = hero ? hero.offsetTop + hero.offsetHeight : 120;
        if (y > limit && y > lastY + 4) hdr.classList.add('is-hidden');
        else if (y < lastY - 4 || y <= limit) hdr.classList.remove('is-hidden');
        lastY = y; ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- 9. Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
