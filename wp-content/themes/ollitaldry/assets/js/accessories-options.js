document.addEventListener('DOMContentLoaded', () => {
  const filterTabs = document.querySelector('[data-ao-filter-tabs]');
  const browser = document.querySelector('[data-ao-accessory-browser]');

  if (filterTabs && browser) {
    const buttons = [...filterTabs.querySelectorAll('[data-ao-filter]')];
    const cards = [...browser.querySelectorAll('[data-ao-family]')];
    const status = browser.querySelector('[data-ao-filter-status]');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.aoFilter || 'all';
        let visible = 0;

        buttons.forEach((item) => {
          const selected = item === button;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });

        cards.forEach((card) => {
          const show = filter === 'all' || card.dataset.aoFamily === filter;
          card.hidden = !show;
          if (show) visible += 1;
        });

        if (status) status.textContent = `${visible} ${visible === 1 ? 'option' : 'options'} shown`;
      });
    });
  }

  const modal = document.querySelector('[data-ao-option-modal]');
  if (!modal) return;

  const panels = [...modal.querySelectorAll('[data-ao-option-panel]')];
  const closeButton = modal.querySelector('[data-ao-option-close]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeTrigger = null;
  let closeTimer = null;

  const galleries = new Map();
  modal.querySelectorAll('[data-ao-option-gallery]').forEach((gallery) => {
    const stage = gallery.querySelector('.ao-option-gallery__stage');
    const image = gallery.querySelector('[data-ao-option-image]');
    const thumbs = [...gallery.querySelectorAll('[data-ao-option-thumb]')];
    const previous = gallery.querySelector('[data-ao-option-prev]');
    const next = gallery.querySelector('[data-ao-option-next]');
    if (!stage || !image || !thumbs.length) return;

    let active = 0;
    let animating = false;
    let pointerId = null;
    let startX = 0;
    let distance = 0;

    thumbs.forEach((thumb) => {
      const preload = new Image();
      preload.src = thumb.dataset.src;
    });

    const setSelected = (index) => {
      thumbs.forEach((thumb, thumbIndex) => {
        const selected = thumbIndex === index;
        thumb.classList.toggle('is-active', selected);
        thumb.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
    };

    const show = (requested, direction = 1, fromDrag = 0) => {
      if (animating) return;
      const index = (requested + thumbs.length) % thumbs.length;
      const thumb = thumbs[index];
      if (index === active && !fromDrag) return;

      const oldImage = image.cloneNode(false);
      oldImage.removeAttribute('data-ao-option-image');
      oldImage.className = 'ao-option-gallery__slide';
      oldImage.style.transform = `translateX(${fromDrag}px)`;
      stage.appendChild(oldImage);

      const travel = stage.clientWidth;
      image.src = thumb.dataset.src;
      image.alt = thumb.dataset.alt || '';
      image.style.transition = 'none';
      image.style.transform = `translateX(${direction > 0 ? travel + fromDrag : -travel + fromDrag}px)`;
      active = index;
      setSelected(active);

      if (reducedMotion) {
        oldImage.remove();
        image.style.transform = '';
        return;
      }

      animating = true;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        const transition = 'transform .36s cubic-bezier(.22,.61,.36,1)';
        oldImage.style.transition = transition;
        image.style.transition = transition;
        oldImage.style.transform = `translateX(${direction > 0 ? -travel : travel}px)`;
        image.style.transform = 'translateX(0)';
      }));

      window.setTimeout(() => {
        oldImage.remove();
        image.style.transition = '';
        image.style.transform = '';
        animating = false;
      }, 390);
    };

    thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => show(index, index >= active ? 1 : -1)));
    previous?.addEventListener('click', () => show(active - 1, -1));
    next?.addEventListener('click', () => show(active + 1, 1));

    stage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button') || animating) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      distance = 0;
      stage.setPointerCapture?.(pointerId);
      image.style.transition = 'none';
    });
    stage.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      distance = Math.max(-180, Math.min(180, event.clientX - startX));
      image.style.transform = `translateX(${distance}px)`;
    });
    const finishDrag = (event) => {
      if (pointerId === null || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
      const shouldChange = Math.abs(distance) >= 56;
      const direction = distance < 0 ? 1 : -1;
      pointerId = null;
      if (shouldChange) {
        show(active + direction, direction, distance);
        return;
      }
      image.style.transition = 'transform .24s cubic-bezier(.22,.61,.36,1)';
      image.style.transform = 'translateX(0)';
      window.setTimeout(() => { image.style.transition = ''; }, 260);
    };
    stage.addEventListener('pointerup', finishDrag);
    stage.addEventListener('pointercancel', finishDrag);

    galleries.set(gallery.closest('[data-ao-option-panel]'), { image, thumbs, setSelected });
  });

  const closeModal = () => {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ao-option-modal-open');
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      modal.hidden = true;
      panels.forEach((panel) => { panel.hidden = true; });
      activeTrigger?.focus();
    }, 220);
  };

  document.querySelectorAll('[data-ao-option-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = panels.find((item) => item.dataset.aoOptionPanel === button.dataset.aoOptionOpen);
      if (!panel) return;
      window.clearTimeout(closeTimer);
      panels.forEach((item) => { item.hidden = item !== panel; });
      activeTrigger = button;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('ao-option-modal-open');
      window.requestAnimationFrame(() => modal.classList.add('is-open'));
      closeButton?.focus();
    });
  });

  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([hidden]),a[href]:not([hidden])')].filter((item) => item.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
});
