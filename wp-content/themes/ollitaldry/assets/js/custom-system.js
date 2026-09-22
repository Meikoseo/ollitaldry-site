(function () {
	'use strict';

	var form = document.querySelector('[data-custom-brief-form]');
	if (!form || !window.ollitalCustomSystem) {
		return;
	}

	var status = form.querySelector('[data-custom-brief-status]');
	var submit = form.querySelector('[type="submit"]');

	function setStatus(type, message) {
		status.className = 'cs-brief__status is-' + type;
		status.textContent = message;
		status.hidden = false;
	}

	function refreshToken() {
		var request = new URLSearchParams();
		request.set('action', 'ollital_refresh_inquiry_token');
		return fetch(window.ollitalCustomSystem.ajaxUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
			body: request.toString()
		}).then(function (response) {
			return response.json();
		}).then(function (payload) {
			if (!payload.success || !payload.data) {
				throw new Error(window.ollitalCustomSystem.error);
			}
			form.elements.ollital_inquiry_nonce.value = payload.data.nonce;
			form.elements.form_started.value = payload.data.started;
		});
	}

	function buildSummary() {
		var material = form.elements.material_name.value.trim();
		var capacity = form.elements.target_capacity.value.trim();
		var feed = form.elements.feed_form.value || 'Not specified';
		var stage = form.elements.project_stage.value || 'Not specified';
		return 'Custom spray drying system inquiry. Target product: ' + material + '. Expected capacity: ' + capacity + '. Feed form: ' + feed + '. Project stage: ' + stage + '.';
	}

	form.addEventListener('submit', function (event) {
		var originalLabel = submit.innerHTML;
		event.preventDefault();
		if (!form.reportValidity()) {
			return;
		}

		form.elements.message.value = buildSummary();
		submit.disabled = true;
		submit.textContent = window.ollitalCustomSystem.sending;
		setStatus('sending', window.ollitalCustomSystem.sending);

		refreshToken().then(function () {
			var data = new FormData(form);
			data.set('series', 'custom-spray-drying-systems');
			return fetch(window.ollitalCustomSystem.ajaxUrl, {
				method: 'POST',
				credentials: 'same-origin',
				body: data
			});
		}).then(function (response) {
			return response.json();
		}).then(function (payload) {
			if (!payload.success) {
				throw new Error(payload.data && payload.data.message ? payload.data.message : window.ollitalCustomSystem.error);
			}
			setStatus('success', payload.data.message + (payload.data.reference ? ' Reference: ' + payload.data.reference + '.' : ''));
			form.reset();
		}).catch(function (error) {
			setStatus('error', error.message || window.ollitalCustomSystem.error);
		}).finally(function () {
			submit.disabled = false;
			submit.innerHTML = originalLabel;
		});
	});
}());
