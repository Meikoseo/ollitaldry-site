(function () {
	'use strict';

	function prepareFaq(event) {
		var opened = event.currentTarget.closest('details');
		if (!opened || opened.open) {
			return;
		}
		document.querySelectorAll('.company-faq details[open]').forEach(function (item) {
			if (item !== opened) {
				item.removeAttribute('open');
			}
		});
	}

	function updateFileName(input) {
		var output = input.closest('.company-upload').querySelector('[data-company-file-name]');
		if (!output) {
			return;
		}
		output.textContent = input.files && input.files[0] ? input.files[0].name : 'No file selected';
	}

	function clearFormErrors(form) {
		form.querySelectorAll('.is-invalid').forEach(function (field) {
			field.classList.remove('is-invalid');
		});
		form.querySelectorAll('[data-field-error]').forEach(function (error) {
			error.textContent = '';
		});
	}

	function showFieldErrors(form, errors) {
		Object.keys(errors || {}).forEach(function (name) {
			var field = form.elements[name];
			var label;
			var output;
			if (!field) {
				return;
			}
			label = field.closest('label');
			if (label) {
				label.classList.add('is-invalid');
				output = label.querySelector('[data-field-error]');
				if (output) {
					output.textContent = errors[name];
				}
			}
		});
	}

	function requestToken() {
		var body = new URLSearchParams();
		body.set('action', 'ollital_refresh_inquiry_token');
		return fetch(ollitalCompanyPages.ajaxUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
			body: body.toString()
		}).then(function (response) {
			return response.json();
		}).then(function (payload) {
			if (!payload.success || !payload.data) {
				throw new Error('Unable to refresh the security token.');
			}
			return payload.data;
		});
	}

	function setNotice(form, type, message) {
		var notice = form.querySelector('[data-company-form-status]');
		if (!notice) {
			return;
		}
		notice.className = 'company-form-status is-' + type;
		notice.textContent = message;
		notice.hidden = false;
		notice.scrollIntoView({behavior: 'smooth', block: 'nearest'});
	}

	function submitInquiry(event) {
		var form = event.currentTarget;
		var submit = form.querySelector('[type="submit"]');
		var originalLabel = submit ? submit.innerHTML : '';
		event.preventDefault();
		clearFormErrors(form);

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		if (submit) {
			submit.disabled = true;
			submit.textContent = ollitalCompanyPages.sending;
		}

		requestToken().then(function (token) {
			var formData;
			if (form.elements.ollital_inquiry_nonce) {
				form.elements.ollital_inquiry_nonce.value = token.nonce;
			}
			if (form.elements.form_started) {
				form.elements.form_started.value = token.started;
			}
			formData = new FormData(form);
			return fetch(ollitalCompanyPages.ajaxUrl, {
				method: 'POST',
				credentials: 'same-origin',
				body: formData
			});
		}).then(function (response) {
			return response.json();
		}).then(function (payload) {
			if (!payload.success) {
				showFieldErrors(form, payload.data && payload.data.fields);
				throw new Error(payload.data && payload.data.message ? payload.data.message : ollitalCompanyPages.error);
			}
			setNotice(form, 'success', payload.data.message + (payload.data.reference ? ' Reference: ' + payload.data.reference + '.' : ''));
			form.reset();
			var file = form.querySelector('input[type="file"]');
			if (file) {
				updateFileName(file);
			}
		}).catch(function (error) {
			setNotice(form, 'error', error.message || ollitalCompanyPages.error);
		}).finally(function () {
			if (submit) {
				submit.disabled = false;
				submit.innerHTML = originalLabel;
			}
		});
	}

	document.querySelectorAll('.company-faq summary').forEach(function (item) {
		item.addEventListener('click', prepareFaq);
	});

	document.querySelectorAll('.company-upload input[type="file"]').forEach(function (input) {
		input.addEventListener('change', function () { updateFileName(input); });
	});

	document.querySelectorAll('a[href="#contact-form"]').forEach(function (link) {
		link.addEventListener('click', function (event) {
			var target = document.getElementById('contact-form');
			if (target) {
				event.preventDefault();
				target.scrollIntoView({behavior: 'smooth', block: 'start'});
			}
		});
	});

	var inquiryForm = document.querySelector('[data-company-contact-form]');
	if (inquiryForm && window.ollitalCompanyPages) {
		inquiryForm.addEventListener('submit', submitInquiry);
	}
}());
