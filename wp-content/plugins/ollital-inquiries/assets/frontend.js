(function () {
  'use strict';

  if (!window.ollitalInquiries) return;

  preparePublicIp();

  document.addEventListener('ollitaldry:material-evaluation-submit', function (event) {
    var detail = event.detail || {};
    var form = detail.form;
    if (!form) return;

    event.preventDefault();
    detail.handled = true;

    var status = form.querySelector('[data-me-status]');
    var button = form.querySelector('[data-me-submit]');
    var original = button ? button.innerHTML : '';
    var data = detail.data || new FormData(form);
    data.set('source_url', window.location.href);

    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    if (status) {
      status.className = 'me-form-status is-sending';
      status.textContent = window.ollitalInquiries.sending;
    }

    publicIpReady().then(function () {
      var ipField = form.querySelector('[data-ollital-client-ip]');
      if (ipField && ipField.value) data.set('client_public_ip', ipField.value);
      return refreshSecurityToken(form, data);
    }).then(function () {
      return fetch(window.ollitalInquiries.ajaxUrl, {
      method: 'POST',
      credentials: 'same-origin',
      body: data
      });
    }).then(function (response) {
      return response.json().then(function (json) {
        if (!response.ok || !json.success) throw json;
        return json.data;
      });
    }).then(function (result) {
      if (status) {
        status.className = 'me-form-status is-success';
        status.innerHTML = '<strong>' + escapeHtml(result.message) + '</strong><br>Reference: ' + escapeHtml(result.reference);
      }
      try { sessionStorage.removeItem('ollitaldryMaterialEvaluation'); } catch (error) { /* Storage may be disabled. */ }
      form.reset();
      form.querySelectorAll('input, select, textarea, button').forEach(function (field) {
        if (!field.matches('[data-me-step-trigger]')) field.disabled = true;
      });
      if (window.dataLayer) window.dataLayer.push({ event: 'material_evaluation_submitted', inquiry_reference: result.reference });
    }).catch(function (error) {
      var result = error && error.data ? error.data : {};
      if (result.fields) {
        Object.keys(result.fields).forEach(function (name) {
          var field = form.querySelector('[name="' + cssEscape(name) + '"], [name="' + cssEscape(name) + '[]"]');
          if (!field) return;
          var holder = field.closest('.me-field, .me-consent, fieldset, .me-upload');
          if (holder) {
            holder.classList.add('is-invalid');
            var message = holder.querySelector('.me-error');
            if (message) message.textContent = result.fields[name];
          }
        });
      }
      if (status) {
        status.className = 'me-form-status is-error';
        status.textContent = result.message || window.ollitalInquiries.error;
      }
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = original;
      }
    });
  });

  document.querySelectorAll('[data-resource-subscription-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('[data-resource-subscription-status]');
      var button = form.querySelector('button[type="submit"]');
      var email = form.querySelector('[name="business_email"]');
      var data = new FormData(form);
      data.set('source_url', window.location.href);
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      if (status) {
        status.hidden = false;
        status.className = 'resources-newsletter-status is-sending';
        status.textContent = 'Submitting your subscription...';
      }

      publicIpReady().then(function () {
        var ipField = form.querySelector('[data-ollital-client-ip]');
        if (ipField && ipField.value) data.set('client_public_ip', ipField.value);
        return refreshSecurityToken(form, data);
      }).then(function () {
        return fetch(window.ollitalInquiries.ajaxUrl, {
          method: 'POST',
          credentials: 'same-origin',
          body: data
        });
      }).then(function (response) {
        return response.json().then(function (json) {
          if (!response.ok || !json.success) throw json;
          return json.data;
        });
      }).then(function (result) {
        if (status) {
          status.className = 'resources-newsletter-status is-success';
          status.textContent = result.message;
        }
        if (email) email.value = '';
        if (window.dataLayer) window.dataLayer.push({ event: 'resource_subscription_submitted', inquiry_reference: result.reference });
      }).catch(function (error) {
        var result = error && error.data ? error.data : {};
        if (status) {
          status.className = 'resources-newsletter-status is-error';
          status.textContent = result.message || 'The subscription could not be submitted. Please try again.';
        }
      }).finally(function () {
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      });
    });
  });

  function preparePublicIp() {
    var fields = document.querySelectorAll('[data-ollital-client-ip]');
    if (!fields.length) return;
    if (window.ollitalPublicIpPromise) return;

    function requestIp(url) {
      return fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      }).then(function (response) {
        if (!response.ok) throw new Error('Public IP lookup failed.');
        return response.json();
      }).then(function (result) {
        var ip = result && typeof result.ip === 'string' ? result.ip.trim() : '';
        if (!ip || (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) && ip.indexOf(':') === -1)) {
          throw new Error('Public IP response was invalid.');
        }
        return ip;
      });
    }

    window.ollitalPublicIpPromise = requestIp('https://api64.ipify.org?format=json')
      .catch(function () { return requestIp('https://api.ipify.org?format=json'); })
      .then(function (ip) {
        fields.forEach(function (field) { field.value = ip; });
        return ip;
      })
      .catch(function () { return ''; });
  }

  function publicIpReady() {
    return window.ollitalPublicIpPromise || Promise.resolve('');
  }

  function refreshSecurityToken(form, submissionData) {
    var request = new FormData();
    request.set('action', 'ollital_refresh_inquiry_token');

    return fetch(window.ollitalInquiries.ajaxUrl, {
      method: 'POST',
      credentials: 'same-origin',
      body: request
    }).then(function (response) {
      if (!response.ok) throw new Error('Unable to refresh the form security token.');
      return response.json();
    }).then(function (json) {
      if (!json.success || !json.data) throw new Error('Unable to refresh the form security token.');
      var nonce = form.querySelector('[name="ollital_inquiry_nonce"]');
      var started = form.querySelector('[name="form_started"]');
      if (nonce) nonce.value = json.data.nonce;
      if (started) started.value = json.data.started;
      if (submissionData) {
        submissionData.set('ollital_inquiry_nonce', json.data.nonce);
        submissionData.set('form_started', json.data.started);
      }
    });
  }

  function escapeHtml(value) {
    var element = document.createElement('div');
    element.textContent = value || '';
    return element.innerHTML;
  }

  function cssEscape(value) {
    return window.CSS && window.CSS.escape ? window.CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }
}());
