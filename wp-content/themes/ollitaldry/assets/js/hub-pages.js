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
		var section = group.closest('.hub-section');
		var items = section ? section.querySelectorAll('[data-filter-item]') : [];
		var isResources = group.getAttribute('data-hub-filter') === 'resources';
		var resourceSearch = isResources && section ? section.querySelector('[data-resource-search]') : null;
		var updateItems = function () {
			var active = group.querySelector('button.is-active[data-filter]');
			var filter = active ? active.getAttribute('data-filter') : 'all';
			var query = resourceSearch ? resourceSearch.value.trim().toLowerCase() : '';
			items.forEach(function (item) {
				var matchesFilter = filter === 'all' || item.getAttribute('data-filter-item') === filter;
				var matchesQuery = !query || (item.getAttribute('data-search-text') || '').indexOf(query) !== -1;
				item.hidden = !matchesFilter || !matchesQuery;
			});
		};
		group.addEventListener('click', function (event) {
			var button = event.target.closest('button[data-filter]');
			if (!button) return;
			group.querySelectorAll('button').forEach(function (item) { item.classList.remove('is-active'); });
			button.classList.add('is-active');
			updateItems();
		});
		if (resourceSearch) resourceSearch.addEventListener('input', updateItems);
	});

	var search = document.querySelector('[data-resource-search]');
	if (search) search.setAttribute('autocomplete', 'off');

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
