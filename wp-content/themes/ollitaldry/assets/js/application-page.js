(function () {
  'use strict';

  function initIndustryExplorer() {
    var root = document.querySelector('[data-industry-explorer]');
    if (!root) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-industry-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-industry-panel]'));

    function activate(key, focus) {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-industry-tab') === key;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
        if (active && focus) tab.focus({ preventScroll: true });
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-industry-panel') !== key;
      });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#industry-' + key);
      }
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-industry-tab'), false); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        var next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        activate(tabs[next].getAttribute('data-industry-tab'), true);
      });
    });

    var hash = window.location.hash.replace('#industry-', '');
    if (tabs.some(function (tab) { return tab.getAttribute('data-industry-tab') === hash; })) activate(hash, false);
  }

  function initPrefill() {
    var field = document.querySelector('[data-inquiry-material]');
    if (!field) return;
    document.querySelectorAll('[data-prefill-equipment]').forEach(function (link) {
      link.addEventListener('click', function () {
        field.value = link.getAttribute('data-prefill-equipment');
      });
    });
  }

  initIndustryExplorer();
  initPrefill();
}());
