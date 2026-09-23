(function () {
	'use strict';

	var grid = document.querySelector('[data-product-grid]');
	var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-series-layout]'));
	var storageKey = 'ollitaldryProductLayout';
	var layouts = ['one', 'two', 'three'];

	document.querySelectorAll('[data-product-clean-search]').forEach(function (form) {
		form.addEventListener('submit', function (event) {
			event.preventDefault();
			var search = form.querySelector('[name="search"]');
			var sort = form.querySelector('[name="sort"]');
			var slug = function (value) {
				return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
			};
			var url = form.action.replace(/\/+$/, '') + '/';
			if (search && search.value.trim()) url += 'search/' + encodeURIComponent(slug(search.value)) + '/';
			if (sort && sort.value && sort.value !== 'recommended') url += 'sort/' + encodeURIComponent(sort.value) + '/';
			window.location.assign(url);
		});
	});

	if (!grid || !buttons.length) {
		return;
	}

	function applyLayout(layout) {
		if (layouts.indexOf(layout) === -1) {
			layout = 'two';
		}
		layouts.forEach(function (name) {
			grid.classList.toggle('series-grid--' + name, name === layout);
		});
		grid.setAttribute('data-layout', layout);
		buttons.forEach(function (button) {
			button.setAttribute('aria-pressed', button.getAttribute('data-series-layout') === layout ? 'true' : 'false');
		});
	}

	var savedLayout = 'two';
	try {
		savedLayout = window.localStorage.getItem(storageKey) || 'two';
	} catch (error) {
		savedLayout = 'two';
	}
	applyLayout(savedLayout);

	buttons.forEach(function (button) {
		button.addEventListener('click', function () {
			var layout = button.getAttribute('data-series-layout');
			applyLayout(layout);
			try {
				window.localStorage.setItem(storageKey, layout);
			} catch (error) {
				// The selected layout still applies when browser storage is unavailable.
			}
		});
	});

	var categoryLinks = Array.prototype.slice.call(document.querySelectorAll('[data-series-category-filter]'));
	var resultsCount = document.querySelector('[data-series-results-count]');
	var pagination = document.querySelector('[data-pagination]');

	function syncCategoryLinks(activeCategory) {
		categoryLinks.forEach(function (link) {
			var isActive = link.getAttribute('data-series-category') === activeCategory;
			link.href = isActive ? link.getAttribute('data-series-all-url') : link.getAttribute('data-series-filter-url');
			if (isActive) {
				link.setAttribute('aria-current', 'page');
				link.title = 'Show all spray dryers';
			} else {
				link.removeAttribute('aria-current');
				link.removeAttribute('title');
			}
		});
	}

	function loadCategoryResults(url, updateHistory) {
		grid.classList.add('is-loading');
		grid.setAttribute('aria-busy', 'true');
		return window.fetch(url, { credentials: 'same-origin' })
			.then(function (response) {
				if (!response.ok) throw new Error('Product filter request failed');
				return response.text();
			})
			.then(function (html) {
				var parsed = new window.DOMParser().parseFromString(html, 'text/html');
				var nextGrid = parsed.querySelector('[data-product-grid]');
				if (!nextGrid) throw new Error('Product filter response is incomplete');
				grid.innerHTML = nextGrid.innerHTML;
				var nextCount = parsed.querySelector('[data-series-results-count]');
				if (resultsCount && nextCount) resultsCount.textContent = nextCount.textContent;
				var nextPagination = parsed.querySelector('[data-pagination]');
				if (pagination && nextPagination) pagination.innerHTML = nextPagination.innerHTML;
				var nextActive = parsed.querySelector('[data-series-category-filter][aria-current]');
				syncCategoryLinks(nextActive ? nextActive.getAttribute('data-series-category') : '');
				if (updateHistory) window.history.pushState({ productFilter: true }, '', url);
				setMobileFilterState(false);
			})
			.catch(function () {
				window.location.assign(url);
			})
			.finally(function () {
				grid.classList.remove('is-loading');
				grid.setAttribute('aria-busy', 'false');
			});
	}

	categoryLinks.forEach(function (link) {
		link.addEventListener('click', function (event) {
			if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			loadCategoryResults(link.href, true);
		});
	});

	window.addEventListener('popstate', function () {
		loadCategoryResults(window.location.href, false);
	});

	function syncComparisonCardHeight() {
		var card = document.querySelector('.series-comparison-intro');
		var tableBody = document.querySelector('.series-comparison__scroll tbody');
		if (!card || !tableBody) {
			return;
		}
		if (window.matchMedia('(max-width: 960px)').matches) {
			card.style.height = '';
			return;
		}
		card.style.height = Math.ceil(tableBody.getBoundingClientRect().height) + 'px';
	}

	window.addEventListener('load', syncComparisonCardHeight);
	window.addEventListener('resize', syncComparisonCardHeight);
	syncComparisonCardHeight();

	var expansionCards = Array.prototype.slice.call(document.querySelectorAll('.series-expansion-card'));
	var expansionMobile = window.matchMedia('(max-width: 767px)');
	var expansionWasMobile = null;

	function setExpansionState(card, isOpen) {
		var toggle = card ? card.querySelector('.series-expansion-toggle') : null;
		if (!card || !toggle) {
			return;
		}
		card.classList.toggle('is-open', isOpen);
		toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
		var stateIcon = toggle.querySelector('.series-expansion-toggle__icon');
		if (stateIcon) {
			stateIcon.textContent = isOpen ? '−' : '+';
		}
	}

	function syncExpansionMode() {
		if (!expansionCards.length || expansionWasMobile === expansionMobile.matches) {
			return;
		}
		expansionWasMobile = expansionMobile.matches;
		expansionCards.forEach(function (card) {
			setExpansionState(card, !expansionMobile.matches);
		});
	}

	if (expansionCards.length) {
		expansionCards.forEach(function (card) {
			var toggle = card.querySelector('.series-expansion-toggle');
			if (!toggle) {
				return;
			}
			toggle.addEventListener('click', function () {
				if (!expansionMobile.matches) {
					return;
				}
				setExpansionState(card, toggle.getAttribute('aria-expanded') !== 'true');
			});
		});
		window.addEventListener('resize', syncExpansionMode);
		syncExpansionMode();
	}

	var mobileFilter = document.querySelector('[data-series-mobile-filter]');
	var mobileFilterOpen = document.querySelector('[data-series-filter-open]');
	var mobileFilterClose = mobileFilter ? Array.prototype.slice.call(mobileFilter.querySelectorAll('[data-series-filter-close]')) : [];
	var mobileFilterDrawer = mobileFilter ? mobileFilter.querySelector('.series-mobile-filter__drawer') : null;

	function setMobileFilterState(isOpen) {
		if (!mobileFilter || !mobileFilterOpen) {
			return;
		}
		mobileFilter.classList.toggle('is-open', isOpen);
		mobileFilter.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
		mobileFilterOpen.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
		document.body.classList.toggle('series-filter-drawer-open', isOpen);
		if (isOpen && mobileFilterDrawer) {
			mobileFilterDrawer.focus();
		} else if (!isOpen) {
			mobileFilterOpen.focus();
		}
	}

	if (mobileFilter && mobileFilterOpen) {
		mobileFilterOpen.addEventListener('click', function () {
			var headerMenuToggle = document.querySelector('[data-menu-toggle]');
			if (headerMenuToggle && headerMenuToggle.getAttribute('aria-expanded') === 'true') {
				headerMenuToggle.click();
			}
			setMobileFilterState(true);
		});
		mobileFilterClose.forEach(function (button) {
			button.addEventListener('click', function () {
				setMobileFilterState(false);
			});
		});
		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && mobileFilter.classList.contains('is-open')) {
				setMobileFilterState(false);
			}
		});
		window.addEventListener('resize', function () {
			if (!expansionMobile.matches) {
				setMobileFilterState(false);
			}
		});
	}

}());
