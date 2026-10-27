class TypeFilter {
	constructor() {
		this.selectedTypes = new Set();
		this.lunchOnly = false;
		this.busOnly = false;
		this.currentKeyword = '';
		this.allRows = null;
		this.autoDisabledByIndoor = new Set();
		this.autoDisabledByOutdoor = new Set();
		this.minDistance = 0;
		this.maxDistance = 200;
		this.currentMaxDistance = 200;
		// all トグル時に切り替え前の選択を一時的に保持する
		this._prevSelectedBeforeAllToggle = null;
	}

	getTypeInputs(container) {
		return Array.from(container.querySelectorAll('input[type="checkbox"][data-type]'))
			.filter(input => input.getAttribute('data-type') !== 'all');
	}

	getRowTypes(row) {
		return row && Array.isArray(row)
			? String(row[2] || '').split(/[^0-9]+/).filter(Boolean)
			: [];
	}

	syncSelectedTypes(typeInputs) {
		this.selectedTypes = new Set(
			typeInputs.filter(input => input.checked).map(input => String(input.getAttribute('data-type')))
		);
	}

	disableMainTypesWhenNoFineType(typeInputs) {
		const fineTypesSelected = typeInputs.some(input => {
			const type = String(input.getAttribute('data-type'));
			return type !== '0' && type !== '1' && input.checked;
		});
		if (fineTypesSelected) return;

		typeInputs.forEach(input => {
			const type = String(input.getAttribute('data-type'));
			if (type === '0' || type === '1') input.checked = false;
		});
	}

	enableMatchingMainTypes(typeInputs, fineType) {
		if (!this.allRows) return;

		const matchingMainTypes = new Set();
		this.allRows.forEach(row => {
			const types = this.getRowTypes(row);
			if (!types.includes(fineType)) return;
			['0', '1'].forEach(mainType => {
				if (types.includes(mainType)) matchingMainTypes.add(mainType);
			});
		});

		typeInputs.forEach(input => {
			const type = String(input.getAttribute('data-type'));
			if (matchingMainTypes.has(type)) input.checked = true;
		});
	}

	disableUnavailableMainTypes(typeInputs) {
		if (!this.allRows) return;

		const selectedFineTypes = new Set(
			typeInputs
				.filter(input => {
					const type = String(input.getAttribute('data-type'));
					return type !== '0' && type !== '1' && input.checked;
				})
				.map(input => String(input.getAttribute('data-type')))
		);

		typeInputs.forEach(input => {
			const mainType = String(input.getAttribute('data-type'));
			if ((mainType !== '0' && mainType !== '1') || !input.checked) return;

			const hasMatchingField = this.allRows.some(row => {
				const types = this.getRowTypes(row);
				return types.includes(mainType) &&
					types.some(type => selectedFineTypes.has(type));
			});
			if (!hasMatchingField) input.checked = false;
		});
	}

	initTypeFilterUI() {
		const container = document.getElementById('type-filter');
		if (!container) return;

		const allInput = container.querySelector('input[data-type="all"]');
		const typeInputs = this.getTypeInputs(container);

		if (allInput && allInput.checked) {
			typeInputs.forEach(cb => cb.checked = true);
		}

		this.syncSelectedTypes(typeInputs);

		if (allInput) {
			allInput.addEventListener('change', () => {
				const checked = !!allInput.checked;
				// 変更前の選択を保存（復元に使う）
				this._prevSelectedBeforeAllToggle = new Set(this.selectedTypes);
				// チェック状態が変わる要素に対してのみ change イベントを発火して、
				// 個別ハンドラ（handleIndoorOutdoorOff/On 等）を確実に実行させる。
				typeInputs.forEach(cb => {
					const prev = !!cb.checked;
					if (prev === checked) return; // 状態変化なしならスキップ
					cb.checked = checked;
					try {
						cb.dispatchEvent(new Event('change', { bubbles: true }));
					} catch (e) {
						// 互換性のためのフォールバック
						const ev = document.createEvent('HTMLEvents');
						ev.initEvent('change', true, false);
						cb.dispatchEvent(ev);
					}
				});

				this.syncSelectedTypes(typeInputs);
				// autoDisabled はここで消さない（個別処理で適切に管理されるべき）
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

				if (dataType !== '0' && dataType !== '1' && !cb.checked) {
					this.disableMainTypesWhenNoFineType(typeInputs);
					this.disableUnavailableMainTypes(typeInputs);
				}

				if (dataType !== '0' && dataType !== '1' && cb.checked) {
					this.enableMatchingMainTypes(typeInputs, dataType);
				}

				this.syncSelectedTypes(typeInputs);

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
				const types = this.getRowTypes(row);
				if (!types.length) return false;
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

		// autoDisabled が空で、かつ all トグル前に細分類が選択されていた記録があれば
		// その記録から現在の onType に関連する細分類を復元する。
		if (this._prevSelectedBeforeAllToggle && this._prevSelectedBeforeAllToggle.size > 0) {
			const fineKeys = new Set(['2','3','4','5','6','7']);
			this._prevSelectedBeforeAllToggle.forEach(fineType => {
				if (!fineKeys.has(fineType)) return;
				const fineInput = typeInputs.find(input => String(input.getAttribute('data-type')) === fineType);
				if (!fineInput || fineInput.checked) return;

				// 復元するかは allRows を見て、該当細分類が onType に関連するフィールドを持つか判断する
				let shouldRestore = false;
				if (this.allRows && Array.isArray(this.allRows)) {
					shouldRestore = this.allRows.some(row => {
						const types = this.getRowTypes(row);
						if (!types.length) return false;
						if (!types.includes(fineType)) return false;
						// onType（'0' or '1'）がそのフィールドのタイプに含まれる場合、復元対象とする
						if (types.includes(onType)) return true;
						// メインタイプが付与されていない（0/1 が無い）フィールドも復元対象とする
						if (!types.includes('0') && !types.includes('1')) return true;
						return false;
					});
				} else {
					// allRows が無ければ安全側で復元する
					shouldRestore = true;
				}

				if (shouldRestore) {
					fineInput.checked = true;
				}
			});
			// 一度だけ使うのでクリア
			this._prevSelectedBeforeAllToggle = null;
		}
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
		this.setupResponsiveToggle('filter-toggle-btn', 'type-filter');
	}

	setupOptionsMobileToggle() {
		this.setupResponsiveToggle('options-toggle-mobile', 'options-filter');
	}

	setupResponsiveToggle(buttonId, panelId) {
		const btn = document.getElementById(buttonId);
		const panel = document.getElementById(panelId);
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
		new MutationObserver(() => applyCollapsedVisibility())
			.observe(panel, { attributes: true });
	}

	applyFilters(allRows, toHiragana, toKatakana, toRomaji, toKatakanaFromAlphabet, normalizeText) {
		if (!this.allRows) {
			this.allRows = allRows;
		}

		const keyword = this.currentKeyword.trim().toLowerCase();

		const typeContainer = document.getElementById('type-filter');
		let selectedTypesLive = null;
		if (typeContainer) {
			const typeInputs = this.getTypeInputs(typeContainer);
			selectedTypesLive = new Set(typeInputs.filter(i => i.checked).map(i => String(i.getAttribute('data-type'))));
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

		if (selectedTypesLive) {
			const typeInputs = this.getTypeInputs(typeContainer);
			const mainTypes = new Set(['0', '1']);
			const selectedMainTypes = new Set(
				[...selectedTypesLive].filter(type => mainTypes.has(type))
			);
			const selectedFineTypes = new Set(
				[...selectedTypesLive].filter(type => !mainTypes.has(type))
			);
			const allMainTypesSelected = selectedMainTypes.size === mainTypes.size;
			const allFineTypesSelected = typeInputs
				.filter(input => !mainTypes.has(input.getAttribute('data-type')))
				.every(input => input.checked);

			filteredRows = filteredRows.filter(row => {
				const types = this.getRowTypes(row);
				if (!types.length) return false;

				const rowMainTypes = types.filter(type => mainTypes.has(type));
				const matchesMain = allMainTypesSelected ||
					!rowMainTypes.length ||
					rowMainTypes.some(type => selectedMainTypes.has(type));
				const matchesFine = allFineTypesSelected ||
					types.some(type => selectedFineTypes.has(type));

				return matchesMain && matchesFine;
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