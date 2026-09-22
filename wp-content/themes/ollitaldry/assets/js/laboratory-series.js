document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-lab-gallery]').forEach((gallery) => {
    const variantRoot = gallery.closest('[data-lab-variants]');
    const stage = gallery.querySelector('.lab-gallery__stage');
    const image = gallery.querySelector('[data-lab-gallery-image]');
    const video = gallery.querySelector('[data-lab-gallery-video]');
    const playButton = gallery.querySelector('[data-lab-gallery-play]');
    const thumbViewport = gallery.querySelector('.lab-gallery__thumbs');
    const thumbs = [...gallery.querySelectorAll('[data-lab-gallery-thumb]')];
    const zoomButton = gallery.querySelector('[data-lab-gallery-zoom]');
    const lightbox = gallery.querySelector('[data-lab-gallery-lightbox]');
    const lightboxStage = gallery.querySelector('[data-lab-gallery-lightbox-stage]');
    const lightboxImage = gallery.querySelector('[data-lab-gallery-lightbox-image]');
    const lightboxVideo = gallery.querySelector('[data-lab-gallery-lightbox-video]');
    const lightboxPlayButton = gallery.querySelector('[data-lab-gallery-lightbox-play]');
    const lightboxClose = gallery.querySelector('[data-lab-gallery-lightbox-close]');
    if (!image || !thumbs.length) return;

    let activeVariant = variantRoot?.dataset.activeVariant || thumbs[0].dataset.variant;
    let active = 0;
    let isAnimating = false;
    let suppressThumbClickUntil = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hoverZoomPointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    const resetHoverZoom = () => {
      if (!stage) return;
      stage.classList.remove('is-hover-zoom');
      stage.style.removeProperty('--lab-zoom-x');
      stage.style.removeProperty('--lab-zoom-y');
    };

    thumbs.forEach((thumb) => {
      const preload = new Image();
      preload.src = thumb.dataset.src;
    });

    const activeThumbs = () => thumbs.filter((thumb) => thumb.dataset.variant === activeVariant);

    const activeVideoSource = () => activeThumbs()[active]?.dataset.videoSrc || '';

    const setImage = (target, src, alt) => {
      if (!target) return;
      target.src = src;
      target.alt = alt || '';
      target.style.transition = '';
      target.style.transform = '';
    };

    const stopPlayer = (player, container, button) => {
      if (!player) return;
      player.pause();
      try { player.currentTime = 0; } catch (error) { /* Media may not have loaded metadata yet. */ }
      player.hidden = true;
      player.removeAttribute('src');
      player.style.transition = '';
      player.style.transform = '';
      delete player.dataset.source;
      player.load();
      container?.classList.remove('is-playing-video', 'is-paused-video');
      button?.setAttribute('aria-label', 'Play product video');
    };

    const stopAllVideos = () => {
      stopPlayer(video, stage, playButton);
      stopPlayer(lightboxVideo, lightboxStage, lightboxPlayButton);
    };

    gallery.ollitaldryStopMedia = stopAllVideos;

    const togglePlayer = (player, container, button, source) => {
      if (!player || !container || !button || !source) return;

      if (player === video) resetHoverZoom();

      if (player.paused) {
        document.querySelectorAll('[data-lab-gallery]').forEach((otherGallery) => {
          if (otherGallery !== gallery) otherGallery.ollitaldryStopMedia?.();
        });
        if (player === video) stopPlayer(lightboxVideo, lightboxStage, lightboxPlayButton);
        if (player === lightboxVideo) stopPlayer(video, stage, playButton);
      }

      if (player.dataset.source !== source) {
        player.src = source;
        player.dataset.source = source;
      }
      player.muted = false;
      player.loop = true;
      player.playsInline = true;
      player.hidden = false;

      if (!player.paused) {
        player.pause();
        container.classList.remove('is-playing-video');
        container.classList.add('is-paused-video');
        button.setAttribute('aria-label', 'Resume product video');
        return;
      }

      player.play().then(() => {
        container.classList.add('is-playing-video');
        container.classList.remove('is-paused-video');
        button.setAttribute('aria-label', 'Pause product video');
      }).catch(() => {
        stopPlayer(player, container, button);
        button.hidden = false;
      });
    };

    const thumbStep = () => {
      const first = activeThumbs()[0];
      if (!first || !thumbViewport) return 0;
      const styles = window.getComputedStyle(thumbViewport);
      const horizontal = styles.flexDirection === 'row';
      const gap = parseFloat(horizontal ? styles.columnGap : styles.rowGap) || parseFloat(styles.gap) || 0;
      return (horizontal ? first.getBoundingClientRect().width : first.getBoundingClientRect().height) + gap;
    };

    const setThumbWindow = (start, behavior = 'smooth') => {
      if (!thumbViewport) return;
      const available = activeThumbs();
      const step = thumbStep();
      if (!step) return;
      const horizontal = window.getComputedStyle(thumbViewport).flexDirection === 'row';
      const maxStart = Math.max(0, available.length - 5);
      const target = Math.max(0, Math.min(maxStart, start)) * step;
      thumbViewport.scrollTo(horizontal ? { left: target, behavior } : { top: target, behavior });
    };

    const syncThumbWindow = (index, instant = false) => {
      if (!thumbViewport) return;
      const available = activeThumbs();
      if (available.length <= 5) {
        setThumbWindow(0, instant ? 'auto' : 'smooth');
        return;
      }
      const step = thumbStep();
      if (!step) return;
      const horizontal = window.getComputedStyle(thumbViewport).flexDirection === 'row';
      const currentStart = Math.round((horizontal ? thumbViewport.scrollLeft : thumbViewport.scrollTop) / step);
      let nextStart = currentStart;
      if (index >= currentStart + 3) nextStart = index - 2;
      if (index <= currentStart) nextStart = index - 1;
      if (nextStart !== currentStart) setThumbWindow(nextStart, instant ? 'auto' : 'smooth');
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

      resetHoverZoom();

      const nextIndex = (next + available.length) % available.length;
      const thumb = available[nextIndex];
      if (nextIndex === active && gallery.dataset.activeMediaSrc === thumb.dataset.src) return;

      const direction = options.direction || (nextIndex >= active ? 1 : -1);
      const fromDrag = options.fromDrag || 0;
      const source = options.source || 'stage';
      const videoSrc = thumb.dataset.videoSrc || '';
      active = nextIndex;
      isAnimating = !reducedMotion && !options.instant;

      stopAllVideos();
      gallery.dataset.activeMediaSrc = thumb.dataset.src;
      stage.dataset.productVideo = videoSrc;
      if (lightboxStage) lightboxStage.dataset.productVideo = videoSrc;
      playButton?.toggleAttribute('hidden', !videoSrc);
      lightboxPlayButton?.toggleAttribute('hidden', !videoSrc);

      if (options.instant) {
        setImage(image, thumb.dataset.src, thumb.dataset.alt);
      } else {
        animateSwap(image, thumb.dataset.src, thumb.dataset.alt, direction, source === 'stage' ? fromDrag : 0);
      }
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
      syncThumbWindow(nextIndex, options.instant);

      if (isAnimating) window.setTimeout(() => { isAnimating = false; }, 400);
    };

    show(0, { instant: true });

    playButton?.addEventListener('click', () => togglePlayer(video, stage, playButton, activeVideoSource()));
    lightboxPlayButton?.addEventListener('click', () => togglePlayer(lightboxVideo, lightboxStage, lightboxPlayButton, activeVideoSource()));
    video?.addEventListener('error', () => {
      stopPlayer(video, stage, playButton);
      if (stage.dataset.productVideo) playButton.hidden = false;
    });
    lightboxVideo?.addEventListener('error', () => {
      stopPlayer(lightboxVideo, lightboxStage, lightboxPlayButton);
      if (lightboxStage?.dataset.productVideo) lightboxPlayButton.hidden = false;
    });

    thumbs.forEach((thumb) => thumb.addEventListener('click', () => {
      if (Date.now() < suppressThumbClickUntil) return;
      const nextIndex = activeThumbs().indexOf(thumb);
      show(nextIndex, { direction: nextIndex >= active ? 1 : -1 });
    }));
    gallery.querySelector('[data-lab-gallery-prev]')?.addEventListener('click', () => show(active - 1, { direction: -1 }));
    gallery.querySelector('[data-lab-gallery-next]')?.addEventListener('click', () => show(active + 1, { direction: 1 }));

    stage?.addEventListener('pointermove', (event) => {
      if (!hoverZoomPointer.matches || event.pointerType === 'touch' || isAnimating || stage.classList.contains('is-dragging') || (video && !video.hidden) || event.target.closest('button')) {
        resetHoverZoom();
        return;
      }

      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
      stage.style.setProperty('--lab-zoom-x', `${x}%`);
      stage.style.setProperty('--lab-zoom-y', `${y}%`);
      stage.classList.add('is-hover-zoom');
    });
    stage?.addEventListener('pointerleave', resetHoverZoom);

    const enableMediaDrag = (surface, imageTarget, videoTarget, source) => {
      if (!surface || !imageTarget) return;
      let pointer = null;
      let start = 0;
      let distance = 0;
      let resetTimer;
      let dragTarget = imageTarget;

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

        dragTarget.style.transition = 'transform .24s cubic-bezier(.22,.61,.36,1)';
        dragTarget.style.transform = 'translateX(0)';
        resetTimer = window.setTimeout(() => {
          dragTarget.style.transition = '';
          dragTarget.style.transform = '';
        }, 260);
      };

      surface.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || isAnimating || event.target.closest('button')) return;
        if (surface === stage) resetHoverZoom();
        pointer = event.pointerId;
        start = event.clientX;
        distance = 0;
        dragTarget = videoTarget && !videoTarget.hidden ? videoTarget : imageTarget;
        surface.setPointerCapture?.(event.pointerId);
        surface.classList.add('is-dragging');
        dragTarget.style.transition = 'none';
      });
      surface.addEventListener('pointermove', (event) => {
        if (event.pointerId !== pointer) return;
        distance = Math.max(-180, Math.min(180, event.clientX - start));
        dragTarget.style.transform = `translateX(${distance}px)`;
      });
      surface.addEventListener('pointerup', finish);
      surface.addEventListener('pointercancel', finish);
    };

    enableMediaDrag(stage, image, video, 'stage');
    enableMediaDrag(lightboxStage, lightboxImage, lightboxVideo, 'lightbox');

    if (thumbViewport) {
      let thumbPointer = null;
      let thumbStart = 0;
      let thumbScrollStart = 0;
      let thumbMoved = false;

      thumbViewport.addEventListener('dragstart', (event) => event.preventDefault());
      thumbViewport.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const horizontal = window.getComputedStyle(thumbViewport).flexDirection === 'row';
        thumbPointer = event.pointerId;
        thumbStart = horizontal ? event.clientX : event.clientY;
        thumbScrollStart = horizontal ? thumbViewport.scrollLeft : thumbViewport.scrollTop;
        thumbMoved = false;
        event.target.setPointerCapture?.(event.pointerId);
        thumbViewport.classList.add('is-dragging');
      });
      thumbViewport.addEventListener('pointermove', (event) => {
        if (event.pointerId !== thumbPointer) return;
        const horizontal = window.getComputedStyle(thumbViewport).flexDirection === 'row';
        const distance = (horizontal ? event.clientX : event.clientY) - thumbStart;
        thumbMoved = thumbMoved || Math.abs(distance) > 5;
        if (horizontal) thumbViewport.scrollLeft = thumbScrollStart - distance;
        else thumbViewport.scrollTop = thumbScrollStart - distance;
        if (thumbMoved) event.preventDefault();
      });
      const finishThumbDrag = (event) => {
        if (thumbPointer === null || (event.pointerId !== undefined && event.pointerId !== thumbPointer)) return;
        thumbPointer = null;
        thumbViewport.classList.remove('is-dragging');
        const step = thumbStep();
        const horizontal = window.getComputedStyle(thumbViewport).flexDirection === 'row';
        if (thumbMoved) suppressThumbClickUntil = Date.now() + 260;
        if (step) setThumbWindow(Math.round((horizontal ? thumbViewport.scrollLeft : thumbViewport.scrollTop) / step));
      };
      thumbViewport.addEventListener('pointerup', finishThumbDrag);
      thumbViewport.addEventListener('pointercancel', finishThumbDrag);
    }

    const closeLightbox = () => {
      if (!lightbox || lightbox.hidden) return;
      stopPlayer(lightboxVideo, lightboxStage, lightboxPlayButton);
      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lab-gallery-lightbox-open');
      zoomButton?.focus();
    };

    zoomButton?.addEventListener('click', () => {
      if (!lightbox || !lightboxImage || !lightboxStage) return;
      stopPlayer(video, stage, playButton);
      setImage(lightboxImage, image.currentSrc || image.src, image.alt);
      lightboxStage.dataset.productVideo = activeVideoSource();
      lightboxPlayButton?.toggleAttribute('hidden', !activeVideoSource());
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

    const activateVariant = (nextVariant) => {
        const targetButton = variantRoot?.querySelector(`[data-lab-variant-button="${nextVariant}"]`);
        if (!nextVariant || !targetButton || nextVariant === activeVariant) return Boolean(targetButton);
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
        setThumbWindow(0, 'auto');
        active = -1;
        show(0, { direction: 1 });
        return true;
    };

    variantRoot?.querySelectorAll('[data-lab-variant-button]').forEach((button) => {
      button.addEventListener('click', () => {
        activateVariant(button.dataset.labVariantButton);
      });
    });

    const requestedVariant = new URLSearchParams(window.location.search).get('variant');
    if (requestedVariant) activateVariant(requestedVariant);
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
      directionModal.querySelectorAll('[data-lab-gallery]').forEach((gallery) => gallery.ollitaldryStopMedia?.());
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
        document.querySelectorAll('[data-lab-gallery]').forEach((gallery) => gallery.ollitaldryStopMedia?.());
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
