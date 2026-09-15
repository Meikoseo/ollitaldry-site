(function () {
	'use strict';

	var lazyImages = Array.prototype.slice.call(document.querySelectorAll('.hub-page img[loading="lazy"]'));
	if ('IntersectionObserver' in window) {
		var imageObserver = new IntersectionObserver(function (entries, observer) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				entry.target.loading = 'eager';
				observer.unobserve(entry.target);
			});
		}, { rootMargin: '900px 0px' });
		lazyImages.forEach(function (image) { imageObserver.observe(image); });
	}

	document.querySelectorAll('[data-hub-filter]').forEach(function (group) {
		if (group.getAttribute('data-hub-filter') === 'resources' || group.getAttribute('data-hub-filter') === 'projects') return;
		var section = group.closest('.hub-section');
		var items = section ? section.querySelectorAll('[data-filter-item]') : [];
		var updateItems = function () {
			var active = group.querySelector('button.is-active[data-filter]');
			var filter = active ? active.getAttribute('data-filter') : 'all';
			items.forEach(function (item) {
				var matchesFilter = filter === 'all' || item.getAttribute('data-filter-item') === filter;
				item.hidden = !matchesFilter;
			});
		};
		group.addEventListener('click', function (event) {
			var button = event.target.closest('button[data-filter]');
			if (!button) return;
			group.querySelectorAll('button').forEach(function (item) {
				item.classList.remove('is-active');
				item.setAttribute('aria-pressed', 'false');
			});
			button.classList.add('is-active');
			button.setAttribute('aria-pressed', 'true');
			updateItems();
		});
	});

	document.querySelectorAll('[data-project-browser]').forEach(function (browser) {
		var group = document.querySelector('[data-hub-filter="projects"]');
		var items = Array.prototype.slice.call(browser.querySelectorAll('[data-filter-item]'));
		var more = browser.querySelector('[data-project-more]');
		var pageSize = 4;
		var visibleLimit = pageSize;
		if (!group || !items.length || !more) return;

		var updateProjects = function () {
			var active = group.querySelector('button.is-active[data-filter]');
			var filter = active ? active.getAttribute('data-filter') : 'all';
			var matches = items.filter(function (item) {
				return filter === 'all' || item.getAttribute('data-filter-item') === filter;
			});
			items.forEach(function (item) { item.hidden = true; });
			matches.slice(0, visibleLimit).forEach(function (item) { item.hidden = false; });
			more.hidden = matches.length <= visibleLimit;
			more.parentElement.hidden = more.hidden;
		};

		group.addEventListener('click', function (event) {
			var button = event.target.closest('button[data-filter]');
			if (!button) return;
			group.querySelectorAll('button[data-filter]').forEach(function (item) {
				item.classList.remove('is-active');
				item.setAttribute('aria-pressed', 'false');
			});
			button.classList.add('is-active');
			button.setAttribute('aria-pressed', 'true');
			visibleLimit = pageSize;
			updateProjects();
		});
		more.addEventListener('click', function () {
			visibleLimit += pageSize;
			updateProjects();
		});
		updateProjects();
	});

	(function initProjectCounters() {
		var counters = Array.prototype.slice.call(document.querySelectorAll('[data-project-counter]'));
		var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!counters.length || reduceMotion || !('IntersectionObserver' in window)) return;

		var prepared = counters.map(function (counter) {
			var finalText = counter.textContent.trim();
			var targets = (finalText.match(/[0-9][0-9,]*/g) || []).map(function (value) {
				return parseInt(value.replace(/,/g, ''), 10);
			});
			counter.setAttribute('aria-label', finalText);
			return { element: counter, finalText: finalText, targets: targets };
		}).filter(function (item) { return item.targets.length; });

		var format = function (item, progress) {
			var index = 0;
			return item.finalText.replace(/[0-9][0-9,]*/g, function (original) {
				var value = Math.round(item.targets[index++] * progress);
				return original.indexOf(',') !== -1 ? value.toLocaleString('en-US') : String(value);
			});
		};
		prepared.forEach(function (item) { item.element.textContent = format(item, 0); });

		var observer = new IntersectionObserver(function (entries) {
			if (!entries[0].isIntersecting) return;
			observer.disconnect();
			var started = performance.now();
			var frame = function (now) {
				var progress = Math.min((now - started) / 2600, 1);
				var eased = 1 - Math.pow(1 - progress, 2);
				prepared.forEach(function (item) { item.element.textContent = format(item, eased); });
				if (progress < 1) {
					window.requestAnimationFrame(frame);
				} else {
					prepared.forEach(function (item) { item.element.textContent = item.finalText; });
				}
			};
			window.requestAnimationFrame(frame);
		}, { threshold: 0.3 });
		observer.observe(prepared[0].element.closest('.hub-band') || prepared[0].element);
	}());

	document.querySelectorAll('.project-region-dialog').forEach(function (dialog) {
		var trigger = null;
		document.querySelectorAll('[data-project-region-open="' + dialog.id + '"]').forEach(function (button) {
			button.addEventListener('click', function () {
				trigger = button;
				dialog.showModal();
				document.body.classList.add('resources-media-modal-open');
				dialog.querySelector('[data-project-region-close]').focus();
			});
		});
		dialog.querySelector('[data-project-region-close]').addEventListener('click', function () { dialog.close(); });
		dialog.addEventListener('click', function (event) {
			var rect = dialog.getBoundingClientRect();
			if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
		});
		dialog.addEventListener('close', function () {
			document.body.classList.remove('resources-media-modal-open');
			if (trigger) trigger.focus({ preventScroll: true });
		});
	});

	document.querySelectorAll('[data-resources-page]').forEach(function (page) {
		var group = page.querySelector('[data-hub-filter="resources"]');
		var grid = page.querySelector('#resource-results');
		var items = Array.prototype.slice.call(grid.querySelectorAll('[data-filter-item]'));
		var search = page.querySelector('[data-resource-search]');
		var sort = page.querySelector('[data-resource-sort]');
		var count = page.querySelector('[data-resource-count]');
		var reset = page.querySelector('[data-resource-reset]');
		var more = page.querySelector('[data-resource-more]');
		var empty = page.querySelector('[data-resource-empty]');
		var filter = 'all';
		var initialType = new URLSearchParams(window.location.search).get('type');
		if (['brochure', 'article', 'video', 'case', 'webinar'].indexOf(initialType) !== -1) filter = initialType;
		var visibleLimit = 8;
		search.setAttribute('autocomplete', 'off');

		function update() {
			var query = search.value.trim().toLowerCase();
			var ordered = items.slice();
			if (sort.value !== 'featured') {
				ordered.sort(function (a, b) {
					var key = sort.value === 'type' ? 'data-filter-item' : 'data-title';
					return a.getAttribute(key).localeCompare(b.getAttribute(key), 'en', { sensitivity: 'base' }) || a.getAttribute('data-title').localeCompare(b.getAttribute('data-title'));
				});
			}
			var matches = ordered.filter(function (item) {
				var type = item.getAttribute('data-filter-item');
				return (filter === 'all' || type === filter || (filter === 'media' && (type === 'video' || type === 'webinar'))) && (!query || item.getAttribute('data-search-text').toLowerCase().indexOf(query) !== -1);
			});
			var limit = visibleLimit;
			ordered.forEach(function (item) {
				var position = matches.indexOf(item);
				item.hidden = position < 0 || position >= limit;
				grid.appendChild(item);
			});
			group.querySelectorAll('button[data-filter]').forEach(function (button) {
				var active = button.getAttribute('data-filter') === filter;
				button.classList.toggle('is-active', active);
				button.setAttribute('aria-pressed', String(active));
			});
			var visible = Math.min(limit, matches.length);
			count.textContent = (visible < matches.length ? 'Showing ' + visible + ' of ' : '') + matches.length + (matches.length === 1 ? ' resource' : ' resources');
			empty.hidden = matches.length !== 0;
			reset.hidden = filter === 'all' && !query && sort.value === 'featured';
			more.hidden = visible >= matches.length;
			more.parentElement.hidden = more.hidden;
		}
		group.addEventListener('click', function (event) {
			var button = event.target.closest('button[data-filter]');
			if (!button) return;
			filter = button.getAttribute('data-filter');
			visibleLimit = 8;
			update();
		});
		search.addEventListener('input', function () { visibleLimit = 8; update(); });
		sort.addEventListener('change', function () { visibleLimit = 8; update(); });
		more.addEventListener('click', function () {
			var previouslyVisible = items.filter(function (item) { return !item.hidden; });
			visibleLimit += 8;
			update();
			var firstNew = Array.prototype.find.call(grid.children, function (item) { return !item.hidden && previouslyVisible.indexOf(item) === -1; });
			if (firstNew) {
				var link = firstNew.querySelector('a,button');
				if (link) link.focus({ preventScroll: true });
			}
		});
		reset.addEventListener('click', function () {
			filter = 'all'; search.value = ''; sort.value = 'featured'; visibleLimit = 8;
			update(); search.focus();
		});
		page.querySelectorAll('[data-resource-shortcut]').forEach(function (button) {
			button.addEventListener('click', function () {
				filter = button.getAttribute('data-resource-shortcut'); search.value = ''; visibleLimit = 8;
				update();
				page.querySelector('.hub-resources-browser').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
				search.focus({ preventScroll: true });
			});
		});
		update();

		page.querySelectorAll('.resources-media-dialog').forEach(function (dialog) {
			var trigger = null;
			var video = dialog.querySelector('video');
			var error = dialog.querySelector('.resources-media-error');
			page.querySelectorAll('[data-resource-media-open="' + dialog.id + '"]').forEach(function (button) {
				button.addEventListener('click', function () {
					trigger = button;
					if (video) {
						error.hidden = true;
						video.src = video.getAttribute('data-resource-video-src');
						video.load();
					}
					dialog.showModal();
					document.body.classList.add('resources-media-modal-open');
					dialog.querySelector('[data-resource-media-close]').focus();
				});
			});
			if (video) video.addEventListener('error', function () { if (dialog.open && video.hasAttribute('src')) error.hidden = false; });
			dialog.querySelector('[data-resource-media-close]').addEventListener('click', function () { dialog.close(); });
			dialog.addEventListener('click', function (event) {
				var rect = dialog.getBoundingClientRect();
				if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
			});
			dialog.addEventListener('close', function () {
				if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
				document.body.classList.remove('resources-media-modal-open');
				if (trigger) trigger.focus({ preventScroll: true });
			});
		});
	});

	document.querySelectorAll('.hub-faq details').forEach(function (detail) {
		var summary = detail.querySelector('summary');
		if (summary) {
			summary.addEventListener('click', function () {
				detail.closest('.hub-faq').querySelectorAll('details[open]').forEach(function (other) {
					if (other !== detail) other.removeAttribute('open');
				});
			});
		}
		detail.addEventListener('toggle', function () {
			if (!detail.open) return;
			detail.closest('.hub-faq').querySelectorAll('details[open]').forEach(function (other) {
				if (other !== detail) other.removeAttribute('open');
			});
		});
	});
}());
