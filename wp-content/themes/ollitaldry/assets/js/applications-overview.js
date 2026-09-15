(() => {
	'use strict';

	const dialogs = new Map();
	let lastTrigger = null;

	document.querySelectorAll('.applications-industry-dialog[id]').forEach((dialog) => {
		dialogs.set(dialog.id, dialog);

		const closeDialog = () => {
			if (dialog.open && typeof dialog.close === 'function') {
				dialog.close();
			} else {
				dialog.removeAttribute('open');
				document.body.classList.remove('applications-dialog-open');
			}
		};

		dialog.querySelectorAll('[data-application-industry-close]').forEach((button) => {
			button.addEventListener('click', closeDialog);
		});

		dialog.addEventListener('click', (event) => {
			if (event.target !== dialog) return;
			const bounds = dialog.getBoundingClientRect();
			const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
			if (!inside) closeDialog();
		});

		dialog.addEventListener('close', () => {
			document.body.classList.remove('applications-dialog-open');
			if (lastTrigger) lastTrigger.focus();
			lastTrigger = null;
		});
	});

	document.querySelectorAll('[data-application-industry-open]').forEach((button) => {
		button.addEventListener('click', () => {
			const dialog = dialogs.get(button.dataset.applicationIndustryOpen);
			if (!dialog) return;
			lastTrigger = button;
			document.body.classList.add('applications-dialog-open');
			if (typeof dialog.showModal === 'function') {
				dialog.showModal();
			} else {
				dialog.setAttribute('open', '');
			}
		});
	});

	document.querySelectorAll('[data-home-industry-carousel]').forEach((carousel) => {
		const viewport = carousel.querySelector('[data-home-industry-viewport]');
		const previous = carousel.querySelector('[data-home-industry-previous]');
		const next = carousel.querySelector('[data-home-industry-next]');
		let pointerId = null;
		let startX = 0;
		let startScroll = 0;
		let moved = false;
		let suppressClick = false;

		if (!viewport || !previous || !next) return;

		const scrollStep = () => {
			const firstCard = viewport.querySelector('.applications-industry-card');
			if (!firstCard) return viewport.clientWidth;
			const grid = firstCard.parentElement;
			const gap = Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0;
			return firstCard.getBoundingClientRect().width + gap;
		};

		const move = (direction) => {
			const maximum = viewport.scrollWidth - viewport.clientWidth;
			if (direction < 0 && viewport.scrollLeft <= 1) {
				viewport.scrollTo({ left: maximum, behavior: 'smooth' });
				return;
			}
			if (direction > 0 && viewport.scrollLeft >= maximum - 1) {
				viewport.scrollTo({ left: 0, behavior: 'smooth' });
				return;
			}
			viewport.scrollBy({ left: direction * scrollStep(), behavior: 'smooth' });
		};

		previous.addEventListener('click', () => move(-1));
		next.addEventListener('click', () => move(1));

		viewport.addEventListener('pointerdown', (event) => {
			if (event.pointerType === 'touch' || event.button !== 0 || window.innerWidth > 1500) return;
			pointerId = event.pointerId;
			startX = event.clientX;
			startScroll = viewport.scrollLeft;
			moved = false;
			viewport.setPointerCapture(pointerId);
			viewport.classList.add('is-dragging');
		});

		viewport.addEventListener('pointermove', (event) => {
			if (event.pointerId !== pointerId) return;
			const distance = event.clientX - startX;
			if (Math.abs(distance) > 5) moved = true;
			viewport.scrollLeft = startScroll - distance;
		});

		const finishDrag = (event) => {
			if (event.pointerId !== pointerId) return;
			if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
			pointerId = null;
			viewport.classList.remove('is-dragging');
			if (moved) {
				suppressClick = true;
				window.setTimeout(() => { suppressClick = false; }, 0);
			}
		};

		viewport.addEventListener('pointerup', finishDrag);
		viewport.addEventListener('pointercancel', finishDrag);
		viewport.addEventListener('click', (event) => {
			if (!suppressClick) return;
			event.preventDefault();
			event.stopPropagation();
		}, true);
		window.addEventListener('resize', () => {
			if (window.innerWidth > 1500) viewport.scrollLeft = 0;
		});
	});

	document.querySelectorAll('.applications-faq details').forEach((item) => {
		item.addEventListener('toggle', () => {
			if (!item.open) return;
			document.querySelectorAll('.applications-faq details[open]').forEach((other) => {
				if (other !== item) other.removeAttribute('open');
			});
		});
	});
})();
