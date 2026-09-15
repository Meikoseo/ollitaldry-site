(function () {
	'use strict';

	var modal = document.querySelector('[data-custom-plant-viewer]');
	var trigger = document.querySelector('[data-custom-plant-viewer-open]');
	if (!modal || !trigger) return;

	var closeButton = modal.querySelector('[data-custom-plant-viewer-close]');
	var retryButton = modal.querySelector('[data-custom-plant-viewer-retry]');
	var loading = modal.querySelector('[data-custom-plant-viewer-loading]');
	var error = modal.querySelector('[data-custom-plant-viewer-error]');
	var runtimePromise = null;
	var activeTrigger = null;

	function loadRuntime() {
		if (window.OllitalCustomPlantViewer) return Promise.resolve(window.OllitalCustomPlantViewer);
		if (runtimePromise) return runtimePromise;
		runtimePromise = new Promise(function (resolve, reject) {
			var script = document.createElement('script');
			script.src = modal.dataset.runtimeUrl;
			script.async = true;
			script.onload = function () {
				if (window.OllitalCustomPlantViewer) resolve(window.OllitalCustomPlantViewer);
				else reject(new Error('3D viewer runtime did not initialize.'));
			};
			script.onerror = function () { reject(new Error('3D viewer runtime could not be downloaded.')); };
			document.head.appendChild(script);
		}).catch(function (runtimeError) {
			runtimePromise = null;
			throw runtimeError;
		});
		return runtimePromise;
	}

	function showError() {
		loading.hidden = true;
		error.hidden = false;
	}

	function startViewer() {
		loading.hidden = false;
		error.hidden = true;
		loadRuntime().then(function (viewer) {
			if (!modal.hidden) viewer.open(modal);
		}).catch(showError);
	}

	function openModal() {
		activeTrigger = trigger;
		modal.hidden = false;
		modal.setAttribute('aria-hidden', 'false');
		document.body.classList.add('custom-plant-viewer-open');
		window.requestAnimationFrame(function () { modal.classList.add('is-open'); });
		closeButton.focus({ preventScroll: true });
		startViewer();
	}

	function closeModal() {
		if (modal.hidden) return;
		modal.classList.remove('is-open');
		modal.setAttribute('aria-hidden', 'true');
		document.body.classList.remove('custom-plant-viewer-open');
		modal.dispatchEvent(new CustomEvent('custom-plant-viewer:close'));
		window.setTimeout(function () {
			modal.hidden = true;
			if (activeTrigger) activeTrigger.focus({ preventScroll: true });
		}, 180);
	}

	trigger.addEventListener('click', openModal);
	closeButton.addEventListener('click', closeModal);
	retryButton.addEventListener('click', startViewer);
	modal.addEventListener('click', function (event) {
		if (event.target === modal) closeModal();
	});
	modal.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') {
			closeModal();
			return;
		}
		if (event.key !== 'Tab') return;
		var focusable = Array.prototype.slice.call(modal.querySelectorAll('button:not([hidden]), [tabindex="0"]')).filter(function (item) {
			return item.offsetParent !== null;
		});
		if (!focusable.length) return;
		var first = focusable[0];
		var last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	});
}());
