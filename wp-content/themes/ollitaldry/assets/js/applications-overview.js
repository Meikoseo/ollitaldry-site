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

	document.querySelectorAll('.applications-faq details').forEach((item) => {
		item.addEventListener('toggle', () => {
			if (!item.open) return;
			document.querySelectorAll('.applications-faq details[open]').forEach((other) => {
				if (other !== item) other.removeAttribute('open');
			});
		});
	});
})();
