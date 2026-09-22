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
