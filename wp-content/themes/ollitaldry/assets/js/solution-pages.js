(function () {
	'use strict';

	var activeTrigger = null;

	function closeDialog(dialog) {
		if (!dialog || !dialog.open) {
			return;
		}
		dialog.close();
	}

	document.querySelectorAll('[data-sticky-result-open]').forEach(function (trigger) {
		trigger.addEventListener('click', function () {
			var dialog = document.getElementById(trigger.getAttribute('data-sticky-result-open'));
			if (!dialog) {
				return;
			}
			activeTrigger = trigger;
			document.body.classList.add('sticky-result-dialog-open');
			if (typeof dialog.showModal === 'function') {
				dialog.showModal();
			} else {
				dialog.setAttribute('open', '');
			}
			var closeButton = dialog.querySelector('[data-sticky-result-close]');
			if (closeButton) {
				closeButton.focus();
			}
		});
	});

	document.querySelectorAll('.sticky-result-dialog').forEach(function (dialog) {
		dialog.querySelectorAll('[data-sticky-result-close]').forEach(function (button) {
			button.addEventListener('click', function () {
				closeDialog(dialog);
			});
		});
		dialog.addEventListener('click', function (event) {
			if (event.target === dialog) {
				closeDialog(dialog);
			}
		});
		dialog.addEventListener('close', function () {
			document.body.classList.remove('sticky-result-dialog-open');
			if (activeTrigger) {
				activeTrigger.focus();
			}
			activeTrigger = null;
		});
		dialog.addEventListener('cancel', function () {
			document.body.classList.remove('sticky-result-dialog-open');
		});
	});

	var solventCaseTrigger = null;
	var solventCaseDialogs = {};

	document.querySelectorAll('.solvent-case-dialog[id]').forEach(function (dialog) {
		solventCaseDialogs[dialog.id] = dialog;

		dialog.querySelectorAll('[data-solvent-case-close]').forEach(function (button) {
			button.addEventListener('click', function () {
				closeDialog(dialog);
			});
		});

		dialog.addEventListener('click', function (event) {
			if (event.target !== dialog) {
				return;
			}
			var bounds = dialog.getBoundingClientRect();
			var isOutside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
			if (isOutside) {
				closeDialog(dialog);
			}
		});

		dialog.addEventListener('close', function () {
			document.body.classList.remove('solvent-case-dialog-open');
			if (solventCaseTrigger) {
				solventCaseTrigger.focus();
			}
			solventCaseTrigger = null;
		});

		dialog.addEventListener('cancel', function () {
			document.body.classList.remove('solvent-case-dialog-open');
		});
	});

	document.querySelectorAll('[data-solvent-case-open]').forEach(function (trigger) {
		trigger.addEventListener('click', function (event) {
			var dialog = solventCaseDialogs[trigger.getAttribute('data-solvent-case-open')];
			if (!dialog) {
				return;
			}
			event.preventDefault();
			solventCaseTrigger = trigger;
			document.body.classList.add('solvent-case-dialog-open');
			if (typeof dialog.showModal === 'function') {
				dialog.showModal();
			} else {
				dialog.setAttribute('open', '');
			}
			var closeButton = dialog.querySelector('[data-solvent-case-close]');
			if (closeButton) {
				closeButton.focus();
			}
		});
	});

	var particleAtomizerTrigger = null;
	var particleAtomizerDialogs = {};

	document.querySelectorAll('.particle-atomizer-dialog[id]').forEach(function (dialog) {
		particleAtomizerDialogs[dialog.id] = dialog;

		dialog.querySelectorAll('[data-particle-atomizer-close]').forEach(function (button) {
			button.addEventListener('click', function () {
				closeDialog(dialog);
			});
		});

		dialog.addEventListener('click', function (event) {
			if (event.target !== dialog) {
				return;
			}
			var bounds = dialog.getBoundingClientRect();
			var isOutside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
			if (isOutside) {
				closeDialog(dialog);
			}
		});

		dialog.addEventListener('close', function () {
			document.body.classList.remove('particle-atomizer-dialog-open');
			if (particleAtomizerTrigger) {
				particleAtomizerTrigger.focus();
			}
			particleAtomizerTrigger = null;
		});

		dialog.addEventListener('cancel', function () {
			document.body.classList.remove('particle-atomizer-dialog-open');
		});
	});

	document.querySelectorAll('[data-particle-atomizer-open]').forEach(function (trigger) {
		trigger.addEventListener('click', function () {
			var dialog = particleAtomizerDialogs[trigger.getAttribute('data-particle-atomizer-open')];
			if (!dialog) {
				return;
			}
			particleAtomizerTrigger = trigger;
			document.body.classList.add('particle-atomizer-dialog-open');
			if (typeof dialog.showModal === 'function') {
				dialog.showModal();
			} else {
				dialog.setAttribute('open', '');
			}
			var closeButton = dialog.querySelector('[data-particle-atomizer-close]');
			if (closeButton) {
				closeButton.focus();
			}
		});
	});
}());
