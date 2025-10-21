class TypeFilter {
	constructor() {
		this.selectedTypes = new Set();
		this.lunchOnly = false;
		this.busOnly = false;
		this.currentKeyword = '';
		this.allRows = null;
		this.autoDisabledByIndoor = new Set();
		this.autoDisabledByOutdoor = new Set();
	}

	initTypeFilterUI() {
		const container = document.getElementById('type-filter');
		if (!container) return;

		const allInput = container.querySelector('input[data-type="all"]');
		const typeInputs = Array.from(container.querySelectorAll('input[type="checkbox"][data-type]'))
			.filter(i => String(i.getAttribute('data-type')) !== 'all');

		if (allInput && allInput.checked) {
			typeInputs.forEach(cb => cb.checked = true);
		}

		this.selectedTypes.clear();
		typeInputs.forEach(cb => { 
			if (cb.checked) this.selectedTypes.add(String(cb.getAttribute('data-type'))); 
		});

		if (allInput) {
			allInput.addEventListener('change', () => {
				const checked = !!allInput.checked;
				typeInputs.forEach(cb => cb.checked = checked);
				this.selectedTypes.clear();
				if (checked) typeInputs.forEach(cb => this.selectedTypes.add(String(cb.getAttribute('data-type'))));
				this.autoDisabledByIndoor.clear();
				this.autoDisabledByOutdoor.clear();
				this.triggerFilterChange();
			});
		}

		typeInputs.forEach(cb => {
			cb.addEventListener('change', () => {
				const dataType = String(cb.getAttribute('data-type'));

				if ((dataType === '0' || dataType === '1') && !cb.checked) {
					this.handleIndoorOutdoorOff(dataType, typeInputs);
				}

				if ((dataType === '0' || dataType === '1') && cb.checked) {
					this.handleIndoorOutdoorOn(dataType, typeInputs);
				}

				this.selectedTypes.clear();
				typeInputs.forEach(c => { 
					if (c.checked) this.selectedTypes.add(String(c.getAttribute('data-type'))); 
				});

				if (allInput) {
					const allCheckedNow = typeInputs.every(c => c.checked);
					allInput.checked = allCheckedNow;
				}

				this.triggerFilterChange();
			});
		});
	}

	handleIndoorOutdoorOff(offType, typeInputs) {
		if (!this.allRows) return;

		const fineTypes = ['2', '3', '4', '5', '6', '7'];
		const otherMainType = offType === '0' ? '1' : '0';
		const otherMainInput = typeInputs.find(input => 
			String(input.getAttribute('data-type')) === otherMainType
		);
		const isOtherMainChecked = otherMainInput ? otherMainInput.checked : false;

		const currentAutoDisabled = offType === '0' ? this.autoDisabledByIndoor : this.autoDisabledByOutdoor;
		currentAutoDisabled.clear();

		fineTypes.forEach(fineType => {
			const fineInput = typeInputs.find(input => 
				String(input.getAttribute('data-type')) === fineType
			);
			if (!fineInput || !fineInput.checked) return;

			const hasVisibleFields = this.allRows.some(row => {
				if (!row || !Array.isArray(row)) return false;
				const raw = String(row[2] || '');
				const types = raw.split(/[^0-9]+/).filter(Boolean);
				if (!types.includes(fineType)) return false;
				const has0 = types.includes('0');
				const has1 = types.includes('1');
				if (offType === '0' && has0 && !has1) return false;
				if (offType === '1' && has1 && !has0) return false;
				if (isOtherMainChecked) {
					if (otherMainType === '0' && has0) return true;
					if (otherMainType === '1' && has1) return true;
				}
				if (!isOtherMainChecked) {
					return !has0 && !has1;
				}
				return false;
			});
			if (!hasVisibleFields && fineInput.checked) {
				fineInput.checked = false;
				currentAutoDisabled.add(fineType);
			}
		});
	}

	handleIndoorOutdoorOn(onType, typeInputs) {
		const autoDisabledSet = onType === '0' ? this.autoDisabledByIndoor : this.autoDisabledByOutdoor;

		autoDisabledSet.forEach(fineType => {
			const fineInput = typeInputs.find(input => 
				String(input.getAttribute('data-type')) === fineType
			);
			if (fineInput && !fineInput.checked) {
				fineInput.checked = true;
			}
		});
		autoDisabledSet.clear();
	}

	initLunchFilterUI() {
		const lunchToggle = document.getElementById('lunch-toggle');
		if (!lunchToggle) return;
		this.lunchOnly = !!lunchToggle.checked;
		lunchToggle.addEventListener('change', () => {
			this.lunchOnly = !!lunchToggle.checked;
			this.triggerFilterChange();
		});
	}

	initBusFilterUI() {
		const busToggle = document.getElementById('bus-toggle');
		if (!busToggle) return;
		this.busOnly = !!busToggle.checked;
		busToggle.addEventListener('change', () => {
			this.busOnly = !!busToggle.checked;
			this.triggerFilterChange();
		});
	}

	initSearchUI() {
		const markerSearch = document.getElementById('marker-search');
		if (markerSearch) {
			markerSearch.addEventListener('input', (e) => {
				this.currentKeyword = e.target.value;
				this.triggerFilterChange();
			});
		}
	}

	setupFilterToggle() {
		const filterBtn = document.getElementById('filter-toggle-btn');
		const typeFilter = document.getElementById('type-filter');
		if (!filterBtn || !typeFilter) return;

		filterBtn.addEventListener('click', () => {
			const isCollapsed = typeFilter.classList.toggle('collapsed');
			filterBtn.setAttribute('aria-expanded', String(!isCollapsed));
		});

		function updateFilterByWidth() {
			if (window.innerWidth <= 767) {
				if (!typeFilter.classList.contains('collapsed')) {
					typeFilter.classList.add('collapsed');
					filterBtn.setAttribute('aria-expanded', 'false');
				}
				filterBtn.style.display = 'block';
			} else {
				typeFilter.classList.remove('collapsed');
				filterBtn.style.display = 'none';
				filterBtn.setAttribute('aria-expanded', 'true');
				typeFilter.style.display = '';
			}
		}

		updateFilterByWidth();
		window.addEventListener('resize', updateFilterByWidth);

		const applyCollapsedVisibility = () => {
			if (typeFilter.classList.contains('collapsed')) {
				typeFilter.style.display = 'none';
			} else {
				typeFilter.style.display = '';
			}
		};
		applyCollapsedVisibility();
		const observer = new MutationObserver(mutations => {
			for (const m of mutations) {
				if (m.attributeName === 'class') {
					applyCollapsedVisibility();
				}
			}
		});
		observer.observe(typeFilter, { attributes: true });
	}

	setupOptionsMobileToggle() {
		const btn = document.getElementById('options-toggle-mobile');
		const panel = document.getElementById('options-filter');
		if (!btn || !panel) return;
		btn.addEventListener('click', () => {
			const isCollapsed = panel.classList.toggle('collapsed');
			btn.setAttribute('aria-expanded', String(!isCollapsed));
		});
		function updateByWidth() {
			if (window.innerWidth <= 767) {
				if (!panel.classList.contains('collapsed')) panel.classList.add('collapsed');
				btn.style.display = 'block';
				btn.setAttribute('aria-expanded', 'false');
			} else {
				panel.classList.remove('collapsed');
				btn.style.display = 'none';
				btn.setAttribute('aria-expanded', 'true');
				panel.style.display = '';
			}
		}
		updateByWidth();
		window.addEventListener('resize', updateByWidth);
		const applyCollapsedVisibility = () => {
			if (panel.classList.contains('collapsed')) panel.style.display = 'none';
			else panel.style.display = '';
		};
		applyCollapsedVisibility();
		const mo = new MutationObserver(() => applyCollapsedVisibility());
		mo.observe(panel, { attributes: true });
	}

	applyFilters(allRows, toHiragana, toKatakana, toRomaji, toKatakanaFromAlphabet, normalizeText) {
		// 全データを保存（初回のみ）
		if (!this.allRows) {
			this.allRows = allRows;
		}

		const keyword = this.currentKeyword.trim().toLowerCase();

		const typeContainer = document.getElementById('type-filter');
		let selectedTypesLive = null;
		let allChecked = true;
		if (typeContainer) {
			const allInput = typeContainer.querySelector('input[data-type="all"]');
			const typeInputs = Array.from(typeContainer.querySelectorAll('input[type="checkbox"][data-type]'))
				.filter(i => String(i.getAttribute('data-type')) !== 'all');
			selectedTypesLive = new Set(typeInputs.filter(i => i.checked).map(i => String(i.getAttribute('data-type'))));
			allChecked = !!(allInput && allInput.checked);
		}

		let filteredRows = allRows;

		if (keyword) {
			const keywordHira = toHiragana(keyword);
			const keywordKana = toKatakana(keyword);
			const keywordRoma = toRomaji(toHiragana(keyword));
			const isKana = /^[\u3041-\u3096]+$/.test(keyword);
			const isKatakana = /^[\u30a1-\u30f6]+$/.test(keyword);
			const keywordNorm = normalizeText(keyword);
			const keywordHiraNorm = normalizeText(keywordHira);
			const keywordKanaNorm = normalizeText(keywordKana);
			const keywordAlphaKana = toKatakanaFromAlphabet(keyword);
			const keywordAlphaKanaNorm = normalizeText(keywordAlphaKana);

			filteredRows = filteredRows.filter(row => {
				if (!row || !Array.isArray(row)) return false;
				
				const fieldName = (row[3] || '');
				const reading = (row[11] || '');
				const fieldNameLower = fieldName.toLowerCase();
				const readingLower = reading.toLowerCase();
				const fieldNameHira = toHiragana(fieldNameLower);
				const fieldNameKana = toKatakana(fieldNameLower);
				const fieldNameRoma = toRomaji(toHiragana(fieldNameLower));
				const fieldNameAlphaKana = toKatakanaFromAlphabet(fieldNameLower);
				const readingHira = toHiragana(readingLower);
				const readingKana = toKatakana(readingLower);
				const readingRoma = toRomaji(toHiragana(readingLower));
				const readingAlphaKana = toKatakanaFromAlphabet(readingLower);

				let jNameConverted = fieldNameLower;
				if (isKana) jNameConverted = toHiragana(fieldNameLower);
				else if (isKatakana) jNameConverted = toKatakana(fieldNameLower);

				let readingConverted = readingLower;
				if (isKana) readingConverted = toHiragana(readingLower);
				else if (isKatakana) readingConverted = toKatakana(readingLower);

				const readingNorm = normalizeText(readingLower);
				const readingHiraNorm = normalizeText(readingHira);
				const readingKanaNorm = normalizeText(readingKana);

				return (
					fieldNameLower.includes(keyword) ||
					fieldNameHira.includes(keywordHira) ||
					fieldNameKana.includes(keywordKana) ||
					fieldNameRoma.includes(keywordRoma) ||
					fieldNameAlphaKana.includes(keywordKana) ||
					jNameConverted.includes(keywordHira) ||
					jNameConverted.includes(keywordKana) ||
					readingLower.includes(keyword) ||
					readingHira.includes(keywordHira) ||
					readingKana.includes(keywordKana) ||
					readingRoma.includes(keywordRoma) ||
					readingAlphaKana.includes(keywordKana) ||
					readingConverted.includes(keywordHira) ||
					readingConverted.includes(keywordKana) ||
					readingNorm.includes(keywordNorm) ||
					readingHiraNorm.includes(keywordHiraNorm) ||
					readingKanaNorm.includes(keywordKanaNorm) ||
					normalizeText(fieldNameAlphaKana).includes(keywordAlphaKanaNorm) ||
					normalizeText(readingAlphaKana).includes(keywordAlphaKanaNorm)
				);
			});
		}

		if (selectedTypesLive && !allChecked) {
			const fineKeys = ['2','3','4','5','6','7'];
			const selectedFine = fineKeys.filter(k => selectedTypesLive.has(k));
			const has0Selected = selectedTypesLive.has('0');
			const has1Selected = selectedTypesLive.has('1');

			filteredRows = filteredRows.filter(row => {
				if (!row || !Array.isArray(row)) return false;
				const raw = String(row[2] || '');
				const types = raw.split(/[^0-9]+/).filter(Boolean);
				const has0 = types.includes('0');
				const has1 = types.includes('1');
				if (selectedFine.length > 0 && !has0Selected && !has1Selected) {
					return types.some(t => selectedFine.includes(t));
				}
				if (!has0Selected && !has1Selected) {
					if (has0 || has1) return false;
					return types.some(t => selectedTypesLive.has(t));
				}合
				if (has0Selected && !has1Selected) {
					if (!has0) return false;
					if (selectedFine.length > 0) {
						return types.some(t => selectedFine.includes(t) || t === '0');
					}
					return true;
				}
				if (!has0Selected && has1Selected) {
					if (!has1) return false;
					if (selectedFine.length > 0) {
						return types.some(t => selectedFine.includes(t) || t === '1');
					}
					return true;
				}
				if (has0Selected && has1Selected) {
					if (selectedFine.length > 0) {
						return types.some(t => selectedTypesLive.has(t));
					}
					return has0 || has1;
				}

				return false;
			});
		}

		if (this.lunchOnly) {
			filteredRows = filteredRows.filter(row => {
				if (!row || !Array.isArray(row)) return false;
				const lunchVal = String(row[14] || '').trim();
				return lunchVal !== '';
			});
		}
		if (this.busOnly) {
			filteredRows = filteredRows.filter(row => {
				if (!row || !Array.isArray(row)) return false;
				const candidates = [17, 18, 19, 20];
				for (const idx of candidates) {
					if (typeof row[idx] !== 'undefined') {
						const v = String(row[idx] || '').trim().toLowerCase();
						if (v === '1' || v === 'true' || v === 'yes' || v === '有' || v === 'あり') return true;
						if (v !== '') return false;
					}
				}
				return false;
			});
		}

		return filteredRows;
	}

	initAll() {
		this.initTypeFilterUI();
		this.initLunchFilterUI();
		this.initBusFilterUI();
		this.initSearchUI();
		this.setupFilterToggle();
		this.setupOptionsMobileToggle();
	}

	triggerFilterChange() {
		if (this.onFilterChange) {
			this.onFilterChange();
		}
	}
}