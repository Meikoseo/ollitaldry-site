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
		form.querySelectorAll('[aria-invalid="true"]').forEach(function (field) {
			field.removeAttribute('aria-invalid');
		});
		form.querySelectorAll('[data-field-error]').forEach(function (error) {
			error.textContent = '';
		});
	}

	function showFieldErrors(form, errors) {
		Object.keys(errors || {}).forEach(function (name) {
			var field = Array.prototype.find.call(form.querySelectorAll('[name]'), function (candidate) {
				return candidate.name === name && !candidate.disabled;
			});
			var label;
			var output;
			if (!field) {
				return;
			}
			label = field.closest('label');
			if (label) {
				label.classList.add('is-invalid');
				field.setAttribute('aria-invalid', 'true');
				output = label.querySelector('[data-field-error]');
				if (output) {
					output.textContent = errors[name];
				}
			}
		});
	}

	function validateRequiredFields(form) {
		var errors = {};
		var firstInvalid = null;
		form.querySelectorAll('[required]').forEach(function (field) {
			var empty;
			if (field.disabled) {
				return;
			}
			empty = ('checkbox' === field.type || 'radio' === field.type) ? !field.checked : !field.value.trim();
			if (empty) {
				errors[field.name] = 'privacy_consent' === field.name
					? 'Please confirm that we may use your information to review this inquiry.'
					: 'Please complete this required field.';
				firstInvalid = firstInvalid || field;
			} else if ('email' === field.type && field.validity.typeMismatch) {
				errors[field.name] = 'Please enter a valid business email.';
				firstInvalid = firstInvalid || field;
			}
		});
		if (Object.keys(errors).length) {
			showFieldErrors(form, errors);
			if (firstInvalid) {
				firstInvalid.focus({preventScroll: true});
				firstInvalid.scrollIntoView({behavior: 'smooth', block: 'center'});
			}
			return false;
		}
		return true;
	}

	var inquiryTypes = {
		recommendation: {
			copy: 'Share a few details and our spray drying experts will recommend the ideal OLLITAL solution.',
			submit: 'Request a Model Recommendation',
			upload: 'Upload Material Data (SDS / TDS / Lab Report)'
		},
		price: {
			copy: 'Share the model, capacity and destination so our team can prepare a focused commercial response.',
			submit: 'Request a Price Quote',
			upload: 'Upload Specification Sheet or Quotation Reference (Optional)'
		},
		test: {
			copy: 'Tell us about your material and test goal so our engineers can define a practical test plan.',
			submit: 'Request a Test Spray',
			upload: 'Upload Material Data (SDS / TDS / Lab Report)'
		},
		custom: {
			copy: 'Share your process, space and performance goals so our engineers can shape a tailored system direction.',
			submit: 'Request Custom Design',
			upload: 'Upload Process Flow Diagram, Layout, or Technical Drawing (Optional)'
		},
		accessories: {
			copy: 'Provide the machine model and required part so our team can review compatibility and availability.',
			submit: 'Request Accessories',
			upload: 'Upload Machine Photos, Part Photos, or Drawings (Optional)'
		}
	};

	function activateInquiryType(form, type) {
		var config = inquiryTypes[type] || inquiryTypes.recommendation;
		var consultation = form.closest('.company-contact-consultation');
		var copy = consultation ? consultation.querySelector('[data-consult-copy]') : null;
		var submit = form.querySelector('[data-submit-label]');
		var upload = form.querySelector('[data-upload-title]');
		form.querySelectorAll('[data-inquiry-panel]').forEach(function (panel) {
			var active = panel.getAttribute('data-inquiry-panel') === type;
			panel.hidden = !active;
			panel.querySelectorAll('input, select, textarea, button').forEach(function (control) {
				control.disabled = !active;
			});
		});
		if (copy) {
			copy.textContent = config.copy;
		}
		if (submit) {
			submit.innerHTML = config.submit + '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>';
		}
		if (upload) {
			upload.textContent = config.upload;
		}
		clearFormErrors(form);
	}

	function requestedInquiryType(form) {
		var params = new URLSearchParams(window.location.search);
		var requested = params.get('inquiry') || '';
		var input;
		if (!Object.prototype.hasOwnProperty.call(inquiryTypes, requested)) {
			return '';
		}
		input = form.querySelector('input[name="product_interest"][data-inquiry-type="' + requested + '"]');
		if (input) {
			input.checked = true;
			return requested;
		}
		return '';
	}

	function toggleAdvanced(button) {
		var section = button.closest('[data-advanced-section]');
		var label = button.querySelector('[data-advanced-label]');
		var expanded;
		if (!section) {
			return;
		}
		expanded = button.getAttribute('aria-expanded') === 'true';
		button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
		if (label) {
			label.textContent = expanded ? 'Show Advanced' : 'Hide Advanced';
		}
		section.classList.toggle('is-collapsed', expanded);
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

		if (!validateRequiredFields(form)) {
			return;
		}

		if (submit) {
			submit.disabled = true;
			submit.textContent = ollitalCompanyPages.sending;
		}

		Promise.resolve(window.ollitalPublicIpPromise || '').catch(function () { return ''; }).then(function () {
			return requestToken();
		}).then(function (token) {
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
			activateInquiryType(form, 'recommendation');
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

	function initLocationMap() {
		var root = document.querySelector('[data-company-location-map]');
		var frame = root ? root.querySelector('[data-company-google-map]') : null;
		var mapLabel = root ? root.querySelector('[data-company-map-label]') : null;
		var mapCity = root ? root.querySelector('[data-company-map-city]') : null;
		var locationButtons = document.querySelectorAll('[data-company-map-location]');

		if (!root || !frame || !locationButtons.length) {
			return;
		}

		function activateLocation(button) {
			var source = button.getAttribute('data-map-src');
			var label = button.getAttribute('data-map-label');
			var city = button.getAttribute('data-map-city');

			locationButtons.forEach(function (item) {
				var active = item === button;
				item.classList.toggle('is-active', active);
				item.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
			if (source && frame.getAttribute('src') !== source) {
				root.classList.add('is-loading');
				frame.setAttribute('src', source);
			}
			if (label && mapLabel) {
				mapLabel.textContent = label;
			}
			if (city && mapCity) {
				mapCity.textContent = city;
			}
			frame.setAttribute('title', 'Google map showing ' + label + ' in ' + city);
			root.setAttribute('aria-label', 'Google map showing ' + label + ' in ' + city);
		}

		frame.addEventListener('load', function () { root.classList.remove('is-loading'); });
		locationButtons.forEach(function (button) {
			button.addEventListener('click', function () { activateLocation(button); });
		});
	}

	function initCompanyCounters() {
		var counters = document.querySelectorAll('[data-company-counter]');
		var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		var numberPattern = /^([^0-9]*)([0-9][0-9,]*)([^0-9]*)$/;

		function prepare(counter) {
			var finalText = counter.textContent.trim();
			var match = finalText.match(numberPattern);
			var target;

			if (!match || finalText.indexOf('/') !== -1) {
				return null;
			}
			target = parseInt(match[2].replace(/,/g, ''), 10);
			if (!Number.isFinite(target) || target < 1) {
				return null;
			}

			counter.setAttribute('aria-label', finalText);
			return {
				element: counter,
				target: target,
				prefix: match[1],
				suffix: match[3],
				grouped: match[2].indexOf(',') !== -1,
				finalText: finalText
			};
		}

		function format(item, value) {
			var number = item.grouped ? value.toLocaleString('en-US') : String(value);
			return item.prefix + number + item.suffix;
		}

		function animate(item) {
			var started = performance.now();
			var duration = 2600;
			item.element.textContent = format(item, 0);

			function frame(now) {
				var progress = Math.min((now - started) / duration, 1);
				var eased = 1 - Math.pow(1 - progress, 2);
				item.element.textContent = format(item, Math.round(item.target * eased));
				if (progress < 1) {
					window.requestAnimationFrame(frame);
				} else {
					item.element.textContent = item.finalText;
				}
			}

			window.requestAnimationFrame(frame);
		}

		counters.forEach(function (counter) {
			var item = prepare(counter);
			var observer;
			if (!item || reduceMotion || !('IntersectionObserver' in window)) {
				return;
			}
			counter.textContent = format(item, 0);
			observer = new IntersectionObserver(function (entries) {
				if (entries[0].isIntersecting) {
					observer.disconnect();
					animate(item);
				}
			}, {threshold: 0.35});
			observer.observe(counter.closest('article') || counter);
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

	document.querySelectorAll('[data-company-contact-form]').forEach(function (inquiryForm) {
		if (!window.ollitalCompanyPages) {
			return;
		}
		var initialInquiryType = requestedInquiryType(inquiryForm);
		var checkedType = inquiryForm.querySelector('input[name="product_interest"]:checked');
		inquiryForm.querySelectorAll('input[name="product_interest"]').forEach(function (input) {
			input.addEventListener('change', function () {
				if (input.checked) {
					activateInquiryType(inquiryForm, input.getAttribute('data-inquiry-type'));
				}
			});
		});
		inquiryForm.querySelectorAll('[data-advanced-toggle]').forEach(function (button) {
			button.addEventListener('click', function () { toggleAdvanced(button); });
		});
		activateInquiryType(inquiryForm, initialInquiryType || (checkedType ? checkedType.getAttribute('data-inquiry-type') : 'recommendation'));
		inquiryForm.addEventListener('submit', submitInquiry);
	});

	initLocationMap();
	initCompanyCounters();
}());
