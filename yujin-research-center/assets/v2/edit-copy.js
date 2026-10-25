/* 문구 편집 모드 — 화면 왼쪽 아래 "문구 편집" 버튼으로 켭니다.
   - 점선으로 표시된 문구를 클릭해 바로 수정 (Enter = 줄바꿈)
   - 수정 내용은 이 브라우저(localStorage)에 저장되어 새로고침해도 유지
   - "변경 내용 복사"로 JSON을 복사해 전달하면 HTML 원본에 반영할 수 있음
   데이터로 채워지는 숫자·리스트(실시간 시황, 리포트 카드 등)는 편집 대상에서 제외합니다. */
(function () {
  'use strict';
  var KEY = 'insightlab-v2-copy';
  var TARGETS = [
    '.blue-signal .hero-overline', '.blue-signal h1', '.blue-signal .hero-description', '.blue-signal .hero-intro .blue-button',
    '.blue-signal .hero-bottom a', '.blue-signal .experience-panel .section-kicker', '.blue-signal .experience-panel h2',
    '.blue-signal .experience-panel > p', '.blue-signal .experience-panel .blue-button', '.blue-signal .panel-link',
    '.v2 h2', '.v2 h3', '.v2 h4', '.v2 p', '.v2 li', '.v2 dt', '.v2 .section-kicker', '.v2 .cn-tag-stack span',
    '.v2 .cn-cursor span', '.v2 .qg-chip', '.v2 .anc-lineup span', '.v2 .anc-badge', '.v2 .pulse-more b', '.v2 .blue-button',
    '.v2 .cnc-keys span', '.v2 .qg-stats span',
    '.sec-title', '.sec-sub', '.cta-band h2', '.cta-band > p'
  ];
  var ALLOWED = { BR: 1, EM: 1, B: 1, STRONG: 1, SPAN: 1, SMALL: 1 };
  var store = {}, base = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; base = JSON.parse(localStorage.getItem(KEY + '-base') || '{}') || {}; } catch (e) { store = {}; base = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); localStorage.setItem(KEY + '-base', JSON.stringify(base)); } catch (e) {} updateCount(); }

  function clean(html) {
    var t = document.createElement('template'); t.innerHTML = html;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 1) {
          if (!ALLOWED[c.tagName]) { walk(c); while (c.firstChild) n.insertBefore(c.firstChild, c); n.removeChild(c); return; }
          Array.prototype.slice.call(c.attributes).forEach(function (a) { if (a.name !== 'class') c.removeAttribute(a.name); });
          walk(c);
        } else if (c.nodeType !== 3) n.removeChild(c);
      });
    })(t.content);
    return t.innerHTML.trim();
  }

  // 편집 대상 수집: 데이터가 채워지는 요소([id], [data-live])와, 다른 대상을 품은 바깥 요소는 제외
  var cand = [];
  TARGETS.forEach(function (sel) { document.querySelectorAll(sel).forEach(function (el) { if (cand.indexOf(el) < 0) cand.push(el); }); });
  cand = cand.filter(function (el) {
    if (el.closest('[data-live], .vanchor, #themePanel, #bubbleWrap, .copyedit-bar')) return false;
    if (el.querySelector('[id], [data-live], input, select, textarea')) return false;
    return !cand.some(function (o) { return o !== el && el.contains(o); });
  });
  var counters = {}, defaults = {}, staleDropped = false;
  cand.forEach(function (el) {
    var host = el.closest('section[id], .blue-signal'), scope = host ? (host.id || 'hero') : 'page';
    counters[scope] = (counters[scope] || 0) + 1;
    var key = el.getAttribute('data-edit') || (scope + ':' + counters[scope]);
    el.setAttribute('data-edit', key);
    defaults[key] = el.innerHTML.trim();
    // 원본 문구가 바뀌었으면(또는 기준을 모르면) 예전 편집본은 버림
    if (store[key] != null && base[key] !== clean(defaults[key])) { delete store[key]; delete base[key]; staleDropped = true; }
    if (store[key] != null) { el.innerHTML = clean(store[key]); el.classList.add('is-changed'); }
  });

  // UI — 로컬 주소이거나 ?edit=1 일 때만 편집 버튼 노출 (공개 사이트 방문자에게는 숨김)
  var allowUI = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]edit=1(&|$)/.test(location.search);
  if (!allowUI) return;
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'copyedit-btn'; btn.innerHTML = '✎ 문구 편집';
  var bar = document.createElement('div');
  bar.className = 'copyedit-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', '문구 편집');
  bar.innerHTML = '<span class="ce-count"></span><button type="button" class="ce-file">파일로 저장</button><button type="button" class="ce-copy">변경 내용 복사</button><button type="button" class="ce-reset">전체 되돌리기</button><button type="button" class="primary ce-done">편집 완료</button>';
  document.body.appendChild(btn); document.body.appendChild(bar);
  function updateCount() { var n = Object.keys(store).length; bar.querySelector('.ce-count').textContent = n ? '변경 ' + n + '곳' : '점선 문구를 클릭해 수정'; }
  updateCount();
  if (staleDropped) save();

  var relayoutT;
  function relayout() { clearTimeout(relayoutT); relayoutT = setTimeout(function () { dispatchEvent(new Event('v2:relayout')); }, 200); }
  function onInput(e) {
    var el = e.currentTarget, key = el.getAttribute('data-edit'), html = clean(el.innerHTML);
    if (html === clean(defaults[key])) { delete store[key]; delete base[key]; el.classList.remove('is-changed'); }
    else { store[key] = html; base[key] = clean(defaults[key]); el.classList.add('is-changed'); }
    save(); relayout();
  }
  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
    if (e.key === 'Escape') { e.currentTarget.blur(); }
  }
  function onPaste(e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t); }
  function blockNav(e) { if (e.target.closest('[data-edit]') && !e.target.closest('.copyedit-bar')) e.preventDefault(); }

  function setEditing(on) {
    document.documentElement.classList.toggle('is-copyedit', on);
    cand.forEach(function (el) {
      if (on) { el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false'); el.addEventListener('input', onInput); el.addEventListener('keydown', onKey); el.addEventListener('paste', onPaste); }
      else { el.removeAttribute('contenteditable'); el.removeEventListener('input', onInput); el.removeEventListener('keydown', onKey); el.removeEventListener('paste', onPaste); }
    });
    if (on) document.addEventListener('click', blockNav, true); else document.removeEventListener('click', blockNav, true);
    if (on) bar.querySelector('.ce-done').focus(); else btn.focus();
  }
  btn.addEventListener('click', function () { setEditing(true); });
  bar.querySelector('.ce-done').addEventListener('click', function () { setEditing(false); });
  bar.querySelector('.ce-copy').addEventListener('click', function (e) {
    var b = e.currentTarget, txt = JSON.stringify(store, null, 2);
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { b.textContent = '복사됨 ✓'; }, function () { prompt('아래 내용을 복사하세요', txt); })
      .finally(function () { setTimeout(function () { b.textContent = '변경 내용 복사'; }, 1600); });
  });
  bar.querySelector('.ce-file').addEventListener('click', function (e) {
    var b = e.currentTarget, blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'insightlab-copy-edits.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    b.textContent = '저장됨 ✓'; setTimeout(function () { b.textContent = '파일로 저장'; }, 1600);
  });
  var resetArmed = false;
  bar.querySelector('.ce-reset').addEventListener('click', function (e) {
    var b = e.currentTarget;
    if (!resetArmed) { resetArmed = true; b.textContent = '한 번 더 누르면 되돌림'; setTimeout(function () { resetArmed = false; b.textContent = '전체 되돌리기'; }, 2500); return; }
    resetArmed = false; b.textContent = '전체 되돌리기';
    cand.forEach(function (el) { var k = el.getAttribute('data-edit'); el.innerHTML = defaults[k]; el.classList.remove('is-changed'); });
    store = {}; base = {}; save(); relayout();
  });
})();
