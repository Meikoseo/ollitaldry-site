(function () {
  'use strict';

  var form = document.querySelector('[data-me-form]');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('[data-me-step]'));
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-me-step-trigger]'));
  var nextButton = form.querySelector('[data-me-next]');
  var backButton = form.querySelector('[data-me-back]');
  var submitButton = form.querySelector('[data-me-submit]');
  var status = form.querySelector('[data-me-status]');
  var review = form.querySelector('[data-me-review]');
  var fileInput = form.querySelector('input[type="file"]');
  var currentStep = 1;
  var completedStep = 0;
  var storageKey = 'ollitaldryMaterialEvaluation';

  function fieldLabel(field) {
    var label = field.closest('label');
    return label ? label.childNodes[0].textContent.trim() : field.name;
  }

  function setError(field, message) {
    var holder = field.closest('.me-field, .me-consent') || field.closest('fieldset');
    if (!holder) return;
    holder.classList.toggle('is-invalid', Boolean(message));
    var error = holder.querySelector('.me-error');
    if (error) error.textContent = message || '';
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validateStep(number) {
    var step = steps[number - 1];
    var valid = true;
    step.querySelectorAll('[required]').forEach(function (field) {
      var fieldValid = field.type === 'checkbox' ? field.checked : field.checkValidity();
      if (field.type === 'radio') {
        fieldValid = Boolean(step.querySelector('input[name="' + field.name + '"]:checked'));
      }
      if (!fieldValid) {
        valid = false;
        setError(field, field.type === 'email' && field.value ? 'Please enter a valid business email.' : 'Please complete this required field.');
      } else {
        setError(field, '');
      }
    });
    if (!valid) {
      var first = step.querySelector('.is-invalid input, .is-invalid select, .is-invalid textarea');
      if (first) first.focus();
    }
    return valid;
  }

  function showStep(number) {
    currentStep = Math.max(1, Math.min(4, number));
    steps.forEach(function (step, index) {
      var active = index + 1 === currentStep;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
    });
    triggers.forEach(function (trigger, index) {
      var numberValue = index + 1;
      trigger.classList.toggle('is-current', numberValue === currentStep);
      trigger.classList.toggle('is-complete', numberValue <= completedStep);
      if (numberValue === currentStep) trigger.setAttribute('aria-current', 'step');
      else trigger.removeAttribute('aria-current');
    });
    backButton.hidden = currentStep === 1;
    nextButton.hidden = currentStep === 4;
    submitButton.hidden = currentStep !== 4;
    if (currentStep === 4) updateReview();
    saveForm();
  }

  function serializableData() {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (['action', 'ollital_inquiry_nonce', 'form_started', 'website'].indexOf(key) !== -1) return;
      if (value instanceof File) return;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else data[key] = value;
    });
    return data;
  }

  function saveForm() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ values: serializableData(), step: currentStep, completed: completedStep })); } catch (error) { /* Storage may be disabled. */ }
  }

  function restoreForm() {
    var saved;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch (error) { return; }
    if (!saved || !saved.values) return;
    Object.keys(saved.values).forEach(function (name) {
      if (['action', 'ollital_inquiry_nonce', 'form_started', 'website'].indexOf(name) !== -1) return;
      var values = Array.isArray(saved.values[name]) ? saved.values[name] : [saved.values[name]];
      form.querySelectorAll('[name="' + name + '"]').forEach(function (field) {
        if (field.type === 'checkbox' || field.type === 'radio') field.checked = values.indexOf(field.value) !== -1;
        else field.value = saved.values[name];
      });
    });
    completedStep = Math.min(Number(saved.completed) || 0, 3);
    currentStep = Math.min(Number(saved.step) || 1, completedStep + 1);
  }

  function updateReview() {
    var data = serializableData();
    var items = [
      ['Product Interest', data.product_interest || 'Not specified'],
      ['Material', data.material_name || 'Not provided'],
      ['Feed Form', data.feed_form || 'Not sure'],
      ['Project Stage', data.project_stage || 'Not provided'],
      ['Target Capacity', data.target_capacity || 'Not sure'],
      ['Target Particle Size', data.particle_size || 'Not sure']
    ];
    review.innerHTML = items.map(function (item) { return '<div><dt>' + escapeHtml(item[0]) + '</dt><dd>' + escapeHtml(item[1]) + '</dd></div>'; }).join('');
  }

  function escapeHtml(value) {
    var element = document.createElement('div');
    element.textContent = value;
    return element.innerHTML;
  }

  nextButton.addEventListener('click', function () {
    if (!validateStep(currentStep)) return;
    completedStep = Math.max(completedStep, currentStep);
    showStep(currentStep + 1);
    document.querySelector('.me-form-shell').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  backButton.addEventListener('click', function () { showStep(currentStep - 1); });

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var requested = Number(trigger.getAttribute('data-me-step-trigger'));
      if (requested <= completedStep + 1) showStep(requested);
    });
  });

  form.addEventListener('input', function (event) {
    if (event.target.matches('[required]')) setError(event.target, '');
    saveForm();
  });
  form.addEventListener('change', saveForm);

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      var nameHolder = fileInput.closest('.me-upload').querySelector('.me-file-name');
      if (!file) { nameHolder.textContent = 'No file selected'; return; }
      var allowed = /\.(pdf|docx|xlsx|jpe?g|png)$/i.test(file.name);
      var acceptable = allowed && file.size <= 20 * 1024 * 1024;
      setError(fileInput, acceptable ? '' : 'Choose a PDF, DOCX, XLSX, JPG or PNG file no larger than 20 MB.');
      if (!acceptable) { fileInput.value = ''; nameHolder.textContent = 'No file selected'; return; }
      nameHolder.textContent = file.name;
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validateStep(4)) return;
    var detail = { form: form, data: new FormData(form), handled: false };
    var integrationEvent = new CustomEvent('ollitaldry:material-evaluation-submit', { bubbles: true, cancelable: true, detail: detail });
    form.dispatchEvent(integrationEvent);
    if (integrationEvent.defaultPrevented || detail.handled) return;
    status.innerHTML = 'Your evaluation details are ready. Please use <a href="#alternative-contact">Business Email or WhatsApp below</a> to send them to our application team.';
    document.getElementById('alternative-contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.dataLayer) window.dataLayer.push({ event: 'material_evaluation_prepared', form_step: 4 });
  });

  var helpDetails = document.querySelector('.me-help details');
  if (helpDetails && window.matchMedia('(max-width: 767px)').matches) helpDetails.open = false;

  restoreForm();
  var resourceParams = new URLSearchParams(window.location.search);
  if (resourceParams.get('request') === 'resource-updates') {
    var resourceEmail = form.querySelector('[name="business_email"]');
    var emailValue = resourceParams.get('email') || '';
    var emailCheck = document.createElement('input');
    emailCheck.type = 'email';
    emailCheck.value = emailValue;
    if (resourceEmail && emailValue && emailCheck.validity.valid) resourceEmail.value = emailValue;
    var resourceMessage = form.querySelector('[name="message"]');
    if (resourceMessage && !resourceMessage.value) resourceMessage.value = 'Please send me new resources and technical updates from OLLITAL.';
  }
  showStep(currentStep);
}());
