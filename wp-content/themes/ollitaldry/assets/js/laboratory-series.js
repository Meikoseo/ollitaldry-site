document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-lab-gallery]').forEach((gallery) => {
    const variantRoot = gallery.closest('[data-lab-variants]');
    const stage = gallery.querySelector('.lab-gallery__stage');
    const image = gallery.querySelector('[data-lab-gallery-image]');
    const thumbs = [...gallery.querySelectorAll('[data-lab-gallery-thumb]')];
    const zoomButton = gallery.querySelector('[data-lab-gallery-zoom]');
    const lightbox = gallery.querySelector('[data-lab-gallery-lightbox]');
    const lightboxImage = gallery.querySelector('[data-lab-gallery-lightbox-image]');
    const lightboxClose = gallery.querySelector('[data-lab-gallery-lightbox-close]');
    if (!image || !thumbs.length) return;

    let activeVariant = variantRoot?.dataset.activeVariant || thumbs[0].dataset.variant;
    let active = 0;
    let isAnimating = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    thumbs.forEach((thumb) => {
      const preload = new Image();
      preload.src = thumb.dataset.src;
    });

    const activeThumbs = () => thumbs.filter((thumb) => thumb.dataset.variant === activeVariant);

    const setImage = (target, src, alt) => {
      if (!target) return;
      target.src = src;
      target.alt = alt || '';
      target.style.transition = '';
      target.style.transform = '';
    };

    const animateSwap = (target, src, alt, direction, fromDrag = 0) => {
      if (!target || reducedMotion) {
        setImage(target, src, alt);
        return;
      }

      const container = target.parentElement;
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const travel = Math.max(container.clientWidth, targetRect.width);
      const clone = target.cloneNode(false);

      clone.removeAttribute('data-lab-gallery-image');
      clone.removeAttribute('data-lab-gallery-lightbox-image');
      clone.className = 'lab-gallery__slide-clone';
      clone.style.left = `${targetRect.left - containerRect.left}px`;
      clone.style.top = `${targetRect.top - containerRect.top}px`;
      clone.style.width = `${targetRect.width}px`;
      clone.style.height = `${targetRect.height}px`;
      clone.style.transition = 'none';
      clone.style.transform = `translateX(${fromDrag}px)`;
      container.appendChild(clone);

      target.src = src;
      target.alt = alt || '';
      target.style.transition = 'none';
      target.style.transform = `translateX(${direction > 0 ? travel + fromDrag : -travel + fromDrag}px)`;

      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        const transition = 'transform .36s cubic-bezier(.22,.61,.36,1)';
        clone.style.transition = transition;
        target.style.transition = transition;
        clone.style.transform = `translateX(${direction > 0 ? -travel : travel}px)`;
        target.style.transform = 'translateX(0)';
      }));

      window.setTimeout(() => {
        clone.remove();
        target.style.transition = '';
        target.style.transform = '';
      }, 390);
    };

    const show = (next, options = {}) => {
      const available = activeThumbs();
      if (!available.length || isAnimating) return;

      const nextIndex = (next + available.length) % available.length;
      const thumb = available[nextIndex];
      const currentSrc = image.currentSrc || image.src;
      if (nextIndex === active && currentSrc === thumb.dataset.src) return;

      const direction = options.direction || (nextIndex >= active ? 1 : -1);
      const fromDrag = options.fromDrag || 0;
      const source = options.source || 'stage';
      active = nextIndex;
      isAnimating = !reducedMotion;

      animateSwap(image, thumb.dataset.src, thumb.dataset.alt, direction, source === 'stage' ? fromDrag : 0);
      if (lightboxImage) {
        if (lightbox && !lightbox.hidden) {
          animateSwap(lightboxImage, thumb.dataset.src, thumb.dataset.alt, direction, source === 'lightbox' ? fromDrag : 0);
        } else {
          setImage(lightboxImage, thumb.dataset.src, thumb.dataset.alt);
        }
      }

      thumbs.forEach((item) => {
        const selected = item === thumb;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });

      if (isAnimating) window.setTimeout(() => { isAnimating = false; }, 400);
    };

    thumbs.forEach((thumb) => thumb.addEventListener('click', () => {
      const nextIndex = activeThumbs().indexOf(thumb);
      show(nextIndex, { direction: nextIndex >= active ? 1 : -1 });
    }));
    gallery.querySelector('[data-lab-gallery-prev]')?.addEventListener('click', () => show(active - 1, { direction: -1 }));
    gallery.querySelector('[data-lab-gallery-next]')?.addEventListener('click', () => show(active + 1, { direction: 1 }));

    const enableDrag = (surface, target, source) => {
      if (!surface || !target) return;
      let pointer = null;
      let start = 0;
      let distance = 0;
      let resetTimer;

      const finish = (event) => {
        if (pointer === null || (event.pointerId !== undefined && event.pointerId !== pointer)) return;
        const shouldChange = Math.abs(distance) >= 56;
        const direction = distance < 0 ? 1 : -1;
        pointer = null;
        surface.classList.remove('is-dragging');
        window.clearTimeout(resetTimer);

        if (shouldChange) {
          show(active + direction, { direction, fromDrag: distance, source });
          return;
        }

        target.style.transition = 'transform .24s cubic-bezier(.22,.61,.36,1)';
        target.style.transform = 'translateX(0)';
        resetTimer = window.setTimeout(() => {
          target.style.transition = '';
          target.style.transform = '';
        }, 260);
      };

      surface.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || isAnimating || event.target.closest('button')) return;
        pointer = event.pointerId;
        start = event.clientX;
        distance = 0;
        surface.setPointerCapture?.(event.pointerId);
        surface.classList.add('is-dragging');
        target.style.transition = 'none';
      });
      surface.addEventListener('pointermove', (event) => {
        if (event.pointerId !== pointer) return;
        distance = Math.max(-180, Math.min(180, event.clientX - start));
        target.style.transform = `translateX(${distance}px)`;
      });
      surface.addEventListener('pointerup', finish);
      surface.addEventListener('pointercancel', finish);
    };

    enableDrag(stage, image, 'stage');
    enableDrag(lightboxImage, lightboxImage, 'lightbox');

    const closeLightbox = () => {
      if (!lightbox || lightbox.hidden) return;
      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lab-gallery-lightbox-open');
      zoomButton?.focus();
    };

    zoomButton?.addEventListener('click', () => {
      if (!lightbox || !lightboxImage) return;
      setImage(lightboxImage, image.currentSrc || image.src, image.alt);
      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lab-gallery-lightbox-open');
      lightboxClose?.focus();
    });
    lightboxClose?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
    });

    variantRoot?.querySelectorAll('[data-lab-variant-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextVariant = button.dataset.labVariantButton;
        if (!nextVariant || nextVariant === activeVariant) return;
        activeVariant = nextVariant;
        variantRoot.dataset.activeVariant = activeVariant;
        variantRoot.querySelectorAll('[data-lab-variant-button]').forEach((item) => {
          const selected = item.dataset.labVariantButton === activeVariant;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        variantRoot.querySelectorAll('[data-lab-variant-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.labVariantPanel !== activeVariant;
        });
        thumbs.forEach((thumb) => {
          thumb.hidden = thumb.dataset.variant !== activeVariant;
        });
        active = -1;
        show(0, { direction: 1 });
      });
    });
  });

  document.querySelectorAll('[data-pilot-powder-carousel]').forEach((carousel) => {
    const viewport = carousel.querySelector('[data-pilot-powder-viewport]');
    const track = carousel.querySelector('[data-pilot-powder-track]');
    const originalCards = [...carousel.querySelectorAll('[data-pilot-powder-card]')];
    const previous = carousel.parentElement?.querySelector('[data-pilot-powder-previous]');
    const next = carousel.parentElement?.querySelector('[data-pilot-powder-next]');
    if (!viewport || !track || originalCards.length < 2) return;

    const cloneCard = (card) => {
      const clone = card.cloneNode(true);
      clone.removeAttribute('data-pilot-powder-card');
      clone.setAttribute('aria-hidden', 'true');
      return clone;
    };
    const before = originalCards.map(cloneCard);
    const after = originalCards.map(cloneCard);
    track.prepend(...before);
    track.append(...after);
    const cards = [...track.children];
    const realCount = originalCards.length;

    let pointerId = null;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let settleTimer = null;

    const step = () => {
      const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    };
    const currentIndex = () => Math.round(viewport.scrollLeft / step());
    const jumpTo = (index) => {
      const behavior = viewport.style.scrollBehavior;
      viewport.style.scrollBehavior = 'auto';
      viewport.scrollLeft = index * step();
      viewport.style.scrollBehavior = behavior;
    };
    const normalize = () => {
      const index = currentIndex();
      if (index < realCount) jumpTo(index + realCount);
      if (index >= realCount * 2) jumpTo(index - realCount);
    };
    const moveTo = (index) => {
      window.clearTimeout(settleTimer);
      viewport.scrollTo({ left: index * step(), behavior: 'smooth' });
      settleTimer = window.setTimeout(normalize, 430);
    };

    previous?.addEventListener('click', () => moveTo(currentIndex() - 1));
    next?.addEventListener('click', () => moveTo(currentIndex() + 1));
    viewport.addEventListener('dragstart', (event) => event.preventDefault());

    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = viewport.scrollLeft;
      moved = false;
      viewport.setPointerCapture?.(event.pointerId);
      viewport.classList.add('is-dragging');
    });
    viewport.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const distance = event.clientX - startX;
      moved = moved || Math.abs(distance) > 4;
      viewport.scrollLeft = startScroll - distance;
      if (moved) event.preventDefault();
    });
    const finishDrag = (event) => {
      if (pointerId === null || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
      pointerId = null;
      viewport.classList.remove('is-dragging');
      moveTo(currentIndex());
    };
    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', () => jumpTo(realCount), { passive: true });
    window.requestAnimationFrame(() => jumpTo(realCount));
  });

  const directionModal = document.querySelector('[data-lab-direction-modal]');
  if (directionModal) {
    const directionPanels = [...directionModal.querySelectorAll('[data-lab-direction-panel]')];
    const directionClose = directionModal.querySelector('[data-lab-direction-close]');
    let directionTrigger = null;
    let closeTimer = null;

    const closeDirectionModal = () => {
      if (directionModal.hidden) return;
      directionModal.classList.remove('is-open');
      directionModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lab-direction-modal-open');
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        directionModal.hidden = true;
        directionPanels.forEach((panel) => { panel.hidden = true; });
        directionTrigger?.focus();
      }, 220);
    };

    document.querySelectorAll('[data-lab-direction-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.labDirectionOpen;
        const panel = directionPanels.find((item) => item.dataset.labDirectionPanel === key);
        if (!panel) return;
        window.clearTimeout(closeTimer);
        directionPanels.forEach((item) => { item.hidden = item !== panel; });
        directionTrigger = button;
        directionModal.hidden = false;
        directionModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lab-direction-modal-open');
        window.requestAnimationFrame(() => directionModal.classList.add('is-open'));
        directionClose?.focus();
      });
    });

    directionClose?.addEventListener('click', closeDirectionModal);
    directionModal.addEventListener('click', (event) => {
      if (event.target === directionModal) closeDirectionModal();
    });
    directionModal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDirectionModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...directionModal.querySelectorAll('button:not([hidden]),a[href]:not([hidden])')].filter((item) => item.offsetParent !== null);
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
  }

});
