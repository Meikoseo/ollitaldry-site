(function () {
  'use strict';

  var header = document.querySelector('[data-site-header]');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var navigation = document.querySelector('[data-navigation]');
  var menuCloseButtons = Array.from(document.querySelectorAll('[data-menu-close]'));
  var menuOverlay = document.querySelector('.mobile-navigation-overlay');
  var footerMenuToggle = document.querySelector('[data-footer-menu-toggle]');

  function updateHeader() {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 80);
    }
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setMenuState(isOpen) {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    navigation.classList.toggle('is-open', isOpen);
    if (menuOverlay) menuOverlay.classList.toggle('is-open', isOpen);
    if (footerMenuToggle) footerMenuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
	if (!isOpen && navigation) {
	  navigation.querySelectorAll('.has-children.is-open').forEach(function (item) {
		item.classList.remove('is-open');
		var parentLink = item.querySelector(':scope > a');
		if (parentLink) parentLink.setAttribute('aria-expanded', 'false');
	  });
	}
  }

  if (menuToggle && navigation) {
    menuToggle.addEventListener('click', function () {
      setMenuState(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    if (footerMenuToggle) {
      footerMenuToggle.addEventListener('click', function () {
        setMenuState(footerMenuToggle.getAttribute('aria-expanded') !== 'true');
      });
    }

    menuCloseButtons.forEach(function (button) {
      button.addEventListener('click', function () { setMenuState(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (navigation.classList.contains('is-open')) {
        setMenuState(false);
        return;
      }
      navigation.querySelectorAll('.has-children.is-open').forEach(function (item) {
        item.classList.remove('is-open');
        var parentLink = item.querySelector(':scope > a');
        if (parentLink) parentLink.setAttribute('aria-expanded', 'false');
      });
    });

    window.addEventListener('resize', function () {
      if (!window.matchMedia('(max-width: 960px)').matches) setMenuState(false);
    });

    navigation.querySelectorAll('.has-children > a').forEach(function (link) {
	  link.setAttribute('aria-expanded', 'false');
      link.addEventListener('click', function (event) {
        var isMobile = window.matchMedia('(max-width: 960px)').matches;
        var isToggleOnly = link.hasAttribute('data-nav-parent-toggle');
        if (isToggleOnly && !isMobile) {
          event.preventDefault();
          link.blur();
          return;
        }
        if (isMobile) {
          var item = link.closest('.has-children');
		  var willOpen = !item.classList.contains('is-open');
		  event.preventDefault();
		  navigation.querySelectorAll('.has-children.is-open').forEach(function (openItem) {
			if (openItem !== item) {
			  openItem.classList.remove('is-open');
			  var openLink = openItem.querySelector(':scope > a');
			  if (openLink) openLink.setAttribute('aria-expanded', 'false');
			}
		  });
		  item.classList.toggle('is-open', willOpen);
		  link.setAttribute('aria-expanded', String(willOpen));
        }
      });
    });

    navigation.querySelectorAll(':scope > ul > .nav-item').forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        if (window.matchMedia('(max-width: 960px)').matches) return;
        navigation.querySelectorAll('.has-children.is-open').forEach(function (openItem) {
          if (openItem === item) return;
          openItem.classList.remove('is-open');
          var openLink = openItem.querySelector(':scope > a');
          if (openLink) openLink.setAttribute('aria-expanded', 'false');
        });
      });
    });

    document.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 960px)').matches || navigation.contains(event.target)) return;
      navigation.querySelectorAll('.has-children.is-open').forEach(function (item) {
        item.classList.remove('is-open');
        var parentLink = item.querySelector(':scope > a');
        if (parentLink) parentLink.setAttribute('aria-expanded', 'false');
      });
    });

    navigation.querySelectorAll('a:not(.has-children > a)').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.matchMedia('(max-width: 960px)').matches) setMenuState(false);
      });
    });
  }

  document.querySelectorAll('[data-hero-slider]').forEach(function (slider) {
    var slides = Array.from(slider.querySelectorAll('[data-hero-slide]'));
    var dots = Array.from(slider.querySelectorAll('[data-hero-dot]'));
    var previous = slider.querySelector('[data-hero-previous]');
    var next = slider.querySelector('[data-hero-next]');
    var index = 0;
    var timer = null;
    var interval = Math.max(3500, Number(slider.dataset.interval) || 6500);
    var autoplay = slider.dataset.autoplay === 'true' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (slides.length < 2) return;

    function showSlide(newIndex, userInitiated) {
      index = (newIndex + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach(function (dot, dotIndex) {
        dot.setAttribute('aria-selected', String(dotIndex === index));
      });
      if (userInitiated) restart();
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (autoplay && !document.hidden) timer = window.setInterval(function () { showSlide(index + 1, false); }, interval);
    }

    function restart() {
      stop();
      start();
    }

    if (previous) previous.addEventListener('click', function () { showSlide(index - 1, true); });
    if (next) next.addEventListener('click', function () { showSlide(index + 1, true); });
    dots.forEach(function (dot, dotIndex) {
      dot.addEventListener('click', function () { showSlide(dotIndex, true); });
    });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', function (event) {
      if (!slider.contains(event.relatedTarget)) start();
    });
    slider.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') showSlide(index - 1, true);
      if (event.key === 'ArrowRight') showSlide(index + 1, true);
    });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  });

  document.querySelectorAll('[data-project-carousel]').forEach(function (carousel) {
    var viewport = carousel.querySelector('[data-project-viewport]');
    var track = carousel.querySelector('[data-project-track]');
    var previous = carousel.querySelector('[data-project-previous]');
    var next = carousel.querySelector('[data-project-next]');
    var templates = Array.from(track.querySelectorAll('[data-project-card]')).map(function (card) { return card.cloneNode(true); });
    var sequenceWidth = 0;
    var stepWidth = 220;
    var offset = 0;
    var dragging = false;
    var dragStartX = 0;
    var dragStartOffset = 0;
    var dragMoved = false;
    var suppressClick = false;
    var resizeTimer;
    var transitionTimer;

    if (!viewport || !track || templates.length < 2) return;

    function makeCard(index, accessible) {
      var card = templates[index % templates.length].cloneNode(true);
      if (!accessible) {
        card.setAttribute('aria-hidden', 'true');
        card.querySelectorAll('a,button,input,select,textarea').forEach(function (control) {
          control.setAttribute('tabindex', '-1');
        });
      }
      return card;
    }

    function visibleCardCount(width) {
      if (width >= 1200) return Math.max(1, Number(carousel.dataset.cardsWide) || 6);
      if (width >= 900) return Math.max(1, Number(carousel.dataset.cardsDesktop) || 4);
      if (width >= 640) return Math.max(1, Number(carousel.dataset.cardsTablet) || 3);
      if (width >= 440) return Math.max(1, Number(carousel.dataset.cardsSmall) || 2);
      return Math.max(1, Number(carousel.dataset.cardsMobile) || 1);
    }

    function buildTrack() {
      var logicalIndex = stepWidth ? Math.round(offset / stepWidth) : 0;
      var firstGroup = document.createElement('div');
      var secondGroup;
      var gap = 14;
      var visible = visibleCardCount(viewport.clientWidth);
      var cardWidth = (viewport.clientWidth - gap * (visible - 1)) / visible;
      var required;

      carousel.style.setProperty('--project-card-width', cardWidth + 'px');
      firstGroup.className = 'project-carousel__group';
      track.innerHTML = '';
      track.appendChild(firstGroup);

      required = Math.ceil(Math.max(templates.length, visible + 1) / templates.length) * templates.length;
      while (firstGroup.children.length < required) {
        firstGroup.appendChild(makeCard(firstGroup.children.length, firstGroup.children.length < templates.length));
      }

      secondGroup = firstGroup.cloneNode(true);
      secondGroup.querySelectorAll('[data-project-card]').forEach(function (card) {
        card.setAttribute('aria-hidden', 'true');
        card.querySelectorAll('a,button,input,select,textarea').forEach(function (control) {
          control.setAttribute('tabindex', '-1');
        });
      });
      track.appendChild(secondGroup);

      sequenceWidth = firstGroup.getBoundingClientRect().width;
      stepWidth = cardWidth + gap;
      offset = (logicalIndex * stepWidth) % sequenceWidth;
      track.style.transition = 'none';
      track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
    }

    function normalized(value) {
      if (!sequenceWidth) return 0;
      value %= sequenceWidth;
      return value < 0 ? value + sequenceWidth : value;
    }

    function renderedOffset() {
      var transform = window.getComputedStyle(track).transform;
      var values;
      if (!transform || 'none' === transform) return offset;
      values = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!values) return offset;
      values = values[1].split(',').map(Number);
      return -(values.length === 16 ? values[12] : values[4]);
    }

    function stopTransition() {
      window.clearTimeout(transitionTimer);
      offset = normalized(renderedOffset());
      track.style.transition = 'none';
      track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
    }

    function animateTo(target) {
      window.clearTimeout(transitionTimer);
      offset = target;
      track.style.transition = 'transform .34s cubic-bezier(.22,.72,.25,1)';
      track.style.transform = 'translate3d(' + (-target) + 'px,0,0)';
      transitionTimer = window.setTimeout(function () {
        offset = normalized(target);
        track.style.transition = 'none';
        track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
      }, 370);
    }

    function slideBy(direction) {
      var base;
      var target;
      stopTransition();
      base = Math.round(offset / stepWidth) * stepWidth;
      if (direction < 0 && base <= 0) {
        offset = sequenceWidth;
        track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
        target = sequenceWidth - stepWidth;
      } else {
        target = base + direction * stepWidth;
      }
      animateTo(target);
    }

    function snapToClosest() {
      var target = Math.round(offset / stepWidth) * stepWidth;
      animateTo(target);
    }

    if (previous) previous.addEventListener('click', function () { slideBy(-1); });
    if (next) next.addEventListener('click', function () { slideBy(1); });

    viewport.addEventListener('pointerdown', function (event) {
      if ('mouse' === event.pointerType && 0 !== event.button) return;
      stopTransition();
      dragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartOffset = offset;
      viewport.classList.add('is-dragging');
    });

    viewport.addEventListener('pointermove', function (event) {
      var distance;
      if (!dragging) return;
      distance = event.clientX - dragStartX;
      if (Math.abs(distance) > 4 && !dragMoved) {
        dragMoved = true;
        viewport.setPointerCapture(event.pointerId);
      }
      offset = normalized(dragStartOffset - distance);
      track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
      if (dragMoved) event.preventDefault();
    });

    function finishDrag(event) {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (dragMoved) {
        suppressClick = true;
        window.setTimeout(function () { suppressClick = false; }, 50);
      }
      snapToClosest();
    }

    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('dragstart', function (event) { event.preventDefault(); });
    viewport.addEventListener('click', function (event) {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildTrack, 180);
    });

    buildTrack();
  });

  var revealItems = document.querySelectorAll('.reveal:not(.is-visible)');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = String(Math.min(index % 5, 4) * 70) + 'ms';
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  document.querySelectorAll('[data-application-tabs]').forEach(function (component) {
    var tabs = Array.from(component.querySelectorAll('[data-app-tab]'));
    var panels = Array.from(component.querySelectorAll('.application-panel'));
    tabs.forEach(function (tab, tabIndex) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (item) { item.setAttribute('aria-selected', 'false'); });
        panels.forEach(function (panel) { panel.hidden = true; panel.classList.remove('is-active'); });
        tab.setAttribute('aria-selected', 'true');
        panels[tabIndex].hidden = false;
        panels[tabIndex].classList.add('is-active');
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search + '#application-' + tabIndex);
        }
      });
      tab.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          var direction = event.key === 'ArrowRight' ? 1 : -1;
          tabs[(tabIndex + direction + tabs.length) % tabs.length].focus();
        }
      });
    });
  });

  var processDialog = document.querySelector('[data-process-dialog]');
  if (processDialog && typeof processDialog.showModal === 'function') {
    document.querySelectorAll('[data-process-step]').forEach(function (step) {
      step.addEventListener('click', function () {
        processDialog.querySelector('[data-dialog-title]').textContent = step.dataset.title;
        processDialog.querySelector('[data-dialog-text]').textContent = step.dataset.text;
        processDialog.showModal();
      });
    });
    processDialog.querySelector('[data-dialog-close]').addEventListener('click', function () { processDialog.close(); });
    processDialog.addEventListener('click', function (event) {
      if (event.target === processDialog) processDialog.close();
    });
  }

  var footerDetails = document.querySelectorAll('.footer-group');
  function setFooterDetails() {
    footerDetails.forEach(function (detail) {
      if (window.matchMedia('(max-width: 767px)').matches) detail.removeAttribute('open');
      else detail.setAttribute('open', '');
    });
  }
  setFooterDetails();
  var resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(setFooterDetails, 180);
  });

  var mobileCta = document.querySelector('[data-mobile-cta]');
  var inquirySection = document.querySelector('[data-inquiry-section]');
  if (mobileCta && inquirySection && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      mobileCta.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.08 }).observe(inquirySection);
  }

  document.querySelectorAll('.ollital-faq__grid').forEach(function (group) {
    group.querySelectorAll('details').forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;
        group.querySelectorAll('details[open]').forEach(function (openItem) {
          if (openItem !== item) openItem.removeAttribute('open');
        });
      });
    });
  });

  var backToTop = document.querySelector('[data-back-to-top]');
  if (backToTop) {
    function updateBackToTop() {
      var visible = window.scrollY > 500;
      var maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      var progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      backToTop.classList.toggle('is-visible', visible);
      backToTop.setAttribute('aria-hidden', visible ? 'false' : 'true');
      backToTop.style.setProperty('--scroll-progress', String(progress * 360) + 'deg');
    }
    backToTop.addEventListener('click', function () {
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    window.addEventListener('resize', updateBackToTop);
    updateBackToTop();
  }

}());
