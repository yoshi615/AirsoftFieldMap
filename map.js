let map; // グローバル変数として定義

// ひらがな・カタカナ・ローマ字変換用関数
function toHiragana(str) {
	// カタカナ→ひらがな
	return str.replace(/[\u30a1-\u30f6]/g, ch =>
		String.fromCharCode(ch.charCodeAt(0) - 0x60)
	);
}
function toKatakana(str) {
	// ひらがな→カタカナ
	return str.replace(/[\u3041-\u3096]/g, ch =>
		String.fromCharCode(ch.charCodeAt(0) + 0x60)
	);
}
// ローマ字変換（簡易版: 日本語→ローマ字。外部ライブラリ利用推奨だがここでは簡易変換）
function toRomaji(str) {
	// ここでは最小限の変換例のみ（本格的にはライブラリ利用推奨）
	const hira = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっ';
	const roma = ['a','i','u','e','o','ka','ki','ku','ke','ko','sa','shi','su','se','so','ta','chi','tsu','te','to','na','ni','nu','ne','no','ha','hi','fu','he','ho','ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa','wo','n','ga','gi','gu','ge','go','za','ji','zu','ze','zo','da','ji','zu','de','do','ba','bi','bu','be','bo','pa','pi','pu','pe','po','a','i','u','e','o','ya','yu','yo','tsu'];
	let result = '';
	for (let ch of str) {
		const idx = hira.indexOf(ch);
		result += idx >= 0 ? roma[idx] : ch;
	}
	return result;
}

// 英字→カタカナ変換（簡易版）
function toKatakanaFromAlphabet(str) {
	return str.replace(/[A-Za-z]+/g, function(s) {
		const alphabetToKana = {
			a:'エー', b:'ビー', c:'シー', d:'ディー', e:'イー', f:'エフ', g:'ジー', h:'エイチ', i:'アイ', j:'ジェイ', k:'ケイ', l:'エル', m:'エム', n:'エヌ', o:'オー', p:'ピー', q:'キュー', r:'アール', s:'エス', t:'ティー', u:'ユー', v:'ブイ', w:'ダブリュー', x:'エックス', y:'ワイ', z:'ズィー'
		};
		return s.split('').map(ch => alphabetToKana[ch.toLowerCase()] || ch).join('');
	});
}

// Remove the DOMContentLoaded wrapper and let getdata.js handle initialization
function init() {

	let lastClickedMarker = null; // 最後にクリックしたマーカーを追跡
	let markerClicked = false; // マーカーがクリックされたかどうか

	// 初期メッセージを設定
	document.getElementById('info').innerHTML = 'ピンをクリックまたはタップして詳細を表示';
		const element = document.getElementById('info');

		// 要素の位置を少し下げる
		element.style.marginTop = '20px';

	// すべてのマーカーの平均緯度と経度を計算
	let latSum = 0;
	let lonSum = 0;

	// データを取得
	let rows = data.FieldList;
	let allRows = data.FieldList; // 全データを保持

	let markers = [];
	let markerDataList = []; // マーカーとrowデータの対応リスト

	// マップとマーカー初期化
	initMap();

	// current marker idの変数
	let currentMarkerId = null;

	function initMap() {
		// Calculate initial center coordinates regardless of preservePosition
		latSum = 0;
		lonSum = 0;
		let validPoints = 0;

		let bounds = new maplibregl.LngLatBounds();

		rows.forEach(row => {
			const [, , , , lat, lon] = row;
			// 緯度・経度が有効な数値かつ範囲内の場合のみ加算・extend
			const latNum = parseFloat(lat);
			const lonNum = parseFloat(lon);
			if (
				lat && lon &&
				!isNaN(latNum) && !isNaN(lonNum) &&
				latNum >= -90 && latNum <= 90 &&
				lonNum >= -180 && lonNum <= 180
			) {
				latSum += latNum;
				lonSum += lonNum;
				validPoints++;
				bounds.extend([lonNum, latNum]);
			}
		});

		// Default center coordinates if no valid points
		let centerLat = 35.7575124203246;
		let centerLon = 139.8567308145714;

		// マップ初期化
		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
			center: [centerLon, centerLat],
			zoom: 8.7,
		});

		// マーカー生成
		allRows.forEach((row, index) => {
			const [id,category,field_name,RegularMeetingCharge,CharterCharge,lat,lon,SiteLink,BookLink,BusBookLink,Reading,NearestStation] = row;
			const latNum = parseFloat(lat);
			const lonNum = parseFloat(lon);
			if (
				!lat || !lon ||
				isNaN(latNum) || isNaN(lonNum) ||
				latNum < -90 || latNum > 90 ||
				lonNum < -180 || lonNum > 180
			) {
				markers.push(null);
				markerDataList.push(null);
				return;
			}

			const customMarker = document.createElement('img');
			customMarker.src = 'images/pin.png';
			customMarker.className = 'custom-marker';
			customMarker.title = field_name;

			const marker = new maplibregl.Marker({ element: customMarker, anchor: 'bottom' })
				.setLngLat([lonNum, latNum])
				.addTo(map);

			markers.push(marker);
			markerDataList.push(row);

			marker.getElement().addEventListener('click', (event) => {
				event.stopPropagation();
				markerClicked = true; // マーカーがクリックされた
				// If same marker is clicked again, do nothing
				const infoPanel = document.getElementById('info');
				if (lastClickedMarker === marker) {
					if (infoPanel) infoPanel.innerHTML = 'マーカーをクリックまたはタップして詳細を表示';
					lastClickedMarker = null;
				} else {
					if (infoPanel) {
						let linksHtml = '';
						if (SiteLink && String(SiteLink).trim() !== '') {
							linksHtml += `<a href="${SiteLink}" target="_blank">サイトリンク</a><br>`;
						}
						if (BookLink && String(BookLink).trim() !== '') {
							linksHtml += `<a href="${BookLink}" target="_blank">予約リンク</a><br>`;
						}
						if (BusBookLink && String(BusBookLink).trim() !== '') {
							linksHtml += `<a href="${BusBookLink}" target="_blank">バス予約リンク</a><br>`;
						}
						infoPanel.innerHTML = `
							<h2>${field_name}</h2>
							${linksHtml}
							<p>最寄り駅: ${NearestStation}</p>
							<p>定期会料金: ${RegularMeetingCharge}円</p>
							<p>貸し切り料金: ${CharterCharge}円</p>
						`;
					}
					lastClickedMarker = marker;
				}

				currentMarkerId = id;
				const leftPanel = document.getElementById('left-panel');
				if (leftPanel) {
					leftPanel.classList.remove('closed');
					document.body.classList.add('panel-open');
					let linksHtml = '';
					if (SiteLink && String(SiteLink).trim() !== '') {
						linksHtml += `<a href="${SiteLink}" target="_blank">サイトリンク</a><br>`;
					}
					if (BookLink && String(BookLink).trim() !== '') {
						linksHtml += `<a href="${BookLink}" target="_blank">予約リンク</a><br>`;
					}
					if (BusBookLink && String(BusBookLink).trim() !== '') {
						linksHtml += `<a href="${BusBookLink}" target="_blank">バス予約リンク</a><br>`;
					}
					leftPanel.innerHTML = `
						<h2>${field_name}</h2>
						${linksHtml}
						<p>最寄り駅: ${NearestStation}</p>
						<p>定期会料金: ${RegularMeetingCharge}円</p>
						<p>貸し切り料金: ${CharterCharge}円</p>
					`;
				}

				// Remove closed class to show panel
				if (leftPanel) {
					leftPanel.classList.remove('closed');
					document.body.classList.add('panel-open');
				}
				
				// Adjust map height for mobile
				if (window.innerWidth <= 767) {
					setTimeout(() => {
						map.resize();
					}, 300);
				}
			});
		});

		// 初回のみ一覧を表示
		showMarkerList(allRows);
	}

	// マーカーの表示/非表示を切り替える関数
	function updateMarkerVisibility(filteredRows) {
		const filteredIds = new Set(filteredRows.map(row => row[0]));
		markers.forEach((marker, idx) => {
			if (!marker) return;
			const row = markerDataList[idx];
			if (row && filteredIds.has(row[0])) {
				marker.getElement().style.display = '';
			} else {
				marker.getElement().style.display = 'none';
			}
		});
	}

	// left-panelにマーカー一覧を表示する関数
	function showMarkerList(rowsToShow) {
		const leftPanel = document.getElementById('left-panel');
		if (!leftPanel) return;
		let html = '<ul class="marker-list">';
		rowsToShow.forEach(row => {
			const [id, , field_name] = row;
			// フィールド名が空・null・undefinedの場合はスキップ
			if (!field_name || String(field_name).trim() === '') return;
			html += `<li><button class="marker-list-btn" data-marker-id="${id}">${field_name}</button></li>`;
		});
		html += '</ul>';
		leftPanel.innerHTML = html;

		// ボタンにクリックイベントを付与（マーカーと同じ機能）
		leftPanel.querySelectorAll('button[data-marker-id]').forEach(btn => {
			btn.addEventListener('click', function() {
				const markerId = this.getAttribute('data-marker-id');
				const idx = allRows.findIndex(row => row[0] == markerId);
				if (markers[idx] && markers[idx].getElement()) {
					markers[idx].getElement().dispatchEvent(new Event('click', {bubbles: true}));
				}
			});
		});
	}

	// 記号・スペース除去＋小文字化
	function normalizeText(str) {
		return (str || '')
			.toLowerCase()
			.replace(/[\s\.\-＿‐―－ー・,，、!！?？"“”'’‘`´:：;；\[\]\(\)\{\}\/\\]/g, '');
	}

	// --- ここから追加 ---
	let currentKeyword = '';
	let currentCategories = null; // nullなら全カテゴリ

	function applyFilters() {
		const keyword = currentKeyword.trim().toLowerCase();
		const checkedCategories = currentCategories;

		let filteredRows = allRows;

		// カテゴリフィルタ
		if (checkedCategories && checkedCategories.length > 0) {
			filteredRows = filteredRows.filter(row => checkedCategories.includes(parseInt(row[1])));
		}

		// 検索フィルタ
		if (keyword) {
			const keywordHira = toHiragana(keyword);
			const keywordKana = toKatakana(keyword);
			const keywordRoma = toRomaji(toHiragana(keyword));
			const isKana = /^[\u3041-\u3096]+$/.test(keyword);
			const isKatakana = /^[\u30a1-\u30f6]+$/.test(keyword);

			const keywordNorm = normalizeText(keyword);
			const keywordHiraNorm = normalizeText(keywordHira);
			const keywordKanaNorm = normalizeText(keywordKana);

			filteredRows = filteredRows.filter(row => {
				const fieldName = (row[2] || '');
				const jName = fieldName;
				const reading = (row[11] || '');

				// すべて小文字化して比較
				const fieldNameLower = fieldName.toLowerCase();
				const jNameLower = jName.toLowerCase();
				const readingLower = reading.toLowerCase();

				const fieldNameHira = toHiragana(fieldNameLower);
				const fieldNameKana = toKatakana(fieldNameLower);
				const fieldNameRoma = toRomaji(toHiragana(fieldNameLower));
				const fieldNameAlphaKana = toKatakanaFromAlphabet(fieldNameLower);
				const fieldNameAlphaHira = toHiragana(fieldNameAlphaKana);
				const fieldNameAlphaRoma = toRomaji(toHiragana(fieldNameAlphaKana));

				const jNameHira = toHiragana(jNameLower);
				const jNameKana = toKatakana(jNameLower);
				const jNameRoma = toRomaji(toHiragana(jNameLower));
				const jNameAlphaKana = toKatakanaFromAlphabet(jNameLower);
				const jNameAlphaHira = toHiragana(jNameAlphaKana);
				const jNameAlphaRoma = toRomaji(toHiragana(jNameAlphaKana));

				const readingHira = toHiragana(readingLower);
				const readingKana = toKatakana(readingLower);
				const readingRoma = toRomaji(toHiragana(readingLower));
				const readingAlphaKana = toKatakanaFromAlphabet(readingLower);
				const readingAlphaHira = toHiragana(readingAlphaKana);
				const readingAlphaRoma = toRomaji(toHiragana(readingAlphaKana));

				let jNameConverted = jNameLower;
				if (isKana) {
					jNameConverted = toHiragana(jNameLower);
				} else if (isKatakana) {
					jNameConverted = toKatakana(jNameLower);
				}

				let readingConverted = readingLower;
				if (isKana) {
					readingConverted = toHiragana(readingLower);
				} else if (isKatakana) {
					readingConverted = toKatakana(readingLower);
				}

				const readingNorm = normalizeText(readingLower);
				const readingHiraNorm = normalizeText(readingHira);
				const readingKanaNorm = normalizeText(readingKana);

				return (
					// フィールド名
					fieldNameLower.includes(keyword) ||
					fieldNameHira.includes(keywordHira) ||
					fieldNameKana.includes(keywordKana) ||
					fieldNameRoma.includes(keywordRoma) ||
					fieldNameAlphaKana.includes(keywordKana) ||
					fieldNameAlphaHira.includes(keywordHira) ||
					fieldNameAlphaRoma.includes(keywordRoma) ||
					// jName
					jNameLower.includes(keyword) ||
					jNameHira.includes(keywordHira) ||
					jNameKana.includes(keywordKana) ||
					jNameRoma.includes(keywordRoma) ||
					jNameAlphaKana.includes(keywordKana) ||
					jNameAlphaHira.includes(keywordHira) ||
					jNameAlphaRoma.includes(keywordRoma) ||
					jNameConverted.includes(keywordHira) ||
					jNameConverted.includes(keywordKana) ||
					// Reading
					readingLower.includes(keyword) ||
					readingHira.includes(keywordHira) ||
					readingKana.includes(keywordKana) ||
					readingRoma.includes(keywordRoma) ||
					readingAlphaKana.includes(keywordKana) ||
					readingAlphaHira.includes(keywordHira) ||
					readingAlphaRoma.includes(keywordRoma) ||
					readingConverted.includes(keywordHira) ||
					readingConverted.includes(keywordKana) ||
					// normalizeTextでの比較
					readingNorm.includes(keywordNorm) ||
					readingHiraNorm.includes(keywordHiraNorm) ||
					readingKanaNorm.includes(keywordKanaNorm)
				);
			});
		}

		rows = filteredRows;
		updateMarkerVisibility(rows);
	}
	// --- ここまで追加 ---

	function updateListIfNeeded() {
    	console.log('update!');
	}

	// 検索ボックスのイベントリスナーを追加
	const markerSearch = document.getElementById('marker-search');
	if (markerSearch) {
		markerSearch.addEventListener('input', function(e) {
			currentKeyword = e.target.value;
			applyFilters();
			updateListIfNeeded();
		});
	}

	// マーカーフィルターのイベントリスナー
	const markerFilter = document.getElementById('marker-filter');
	if (markerFilter) {
		markerFilter.addEventListener('change', function(e) {
			if (!e.target.matches('input[type="checkbox"]')) return;
			const checkedCategories = Array.from(markerFilter.querySelectorAll('input[type="checkbox"]:checked'))
				.map(checkbox => parseInt(checkbox.value));
			currentCategories = checkedCategories.length > 0 ? checkedCategories : null;
			applyFilters();
			updateListIfNeeded();
		});
	}

	// Add check all/uncheck all functionality
	const checkAll = document.getElementById('check-all');
	const uncheckAll = document.getElementById('uncheck-all');
	if (checkAll && markerFilter) {
		checkAll.addEventListener('click', (e) => {
			e.preventDefault();
			markerFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
				checkbox.checked = true;
			});
			currentCategories = null;
			applyFilters();
			updateListIfNeeded();
		});
	}
	if (uncheckAll && markerFilter) {
		uncheckAll.addEventListener('click', (e) => {
			e.preventDefault();
			markerFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
				checkbox.checked = false;
			});
			currentCategories = [];
			applyFilters();
			updateListIfNeeded();
		});
	}

	// Add tools panel toggle functionality
	const toolsToggle = document.getElementById('tools-toggle');
	const mapTools = document.getElementById('map-tools');
	
	if (toolsToggle && mapTools) {
		toolsToggle.addEventListener('click', () => {
			const isVisible = mapTools.classList.contains('visible');
			mapTools.classList.toggle('visible');
			toolsToggle.textContent = isVisible ? 'ツールを表示' : 'ツールを非表示';
		});
	}
}