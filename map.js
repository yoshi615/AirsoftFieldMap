let map;

// ひらがな・カタカナ・ローマ字変換
function toHiragana(str) {
	return str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function toKatakana(str) {
	return str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
function toRomaji(str) {
	const hira = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっ';
	const roma = ['a','i','u','e','o','ka','ki','ku','ke','ko','sa','shi','su','se','so','ta','chi','tsu','te','to','na','ni','nu','ne','no','ha','hi','fu','he','ho','ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa','wo','n','ga','gi','gu','ge','go','za','ji','zu','ze','zo','da','ji','zu','de','do','ba','bi','bu','be','bo','pa','pi','pu','pe','po','a','i','u','e','o','ya','yu','yo','tsu'];
	let result = '';
	for (let ch of str) {
		const idx = hira.indexOf(ch);
		result += idx >= 0 ? roma[idx] : ch;
	}
	return result;
}
function toKatakanaFromAlphabet(str) {
	return str.replace(/[A-Za-z]+/g, s => {
		const a2k = {a:'エー',b:'ビー',c:'シー',d:'ディー',e:'イー',f:'エフ',g:'ジー',h:'エイチ',i:'アイ',j:'ジェイ',k:'ケイ',l:'エル',m:'エム',n:'エヌ',o:'オー',p:'ピー',q:'キュー',r:'アール',s:'エス',t:'ティー',u:'ユー',v:'ブイ',w:'ダブリュー',x:'エックス',y:'ワイ',z:'ズィー'};
		return s.split('').map(ch => a2k[ch.toLowerCase()] || ch).join('');
	});
}
function normalizeText(str) {
	return (str || '').toLowerCase().replace(/[\s\.\-＿‐―－ー・,，、!！?？"“”'’‘`´:：;；\[\]\(\)\{\}\/\\]/g, '');
}

function init() {
	let lastClickedMarker = null;
	let markers = [], markerDataList = [];
	let rows = data.FieldList, allRows = data.FieldList;
	let currentKeyword = '';
	let lastActiveMarkerIndex = null;

	initMap();

	function initMap() {
		let latSum = 0, lonSum = 0, validPoints = 0;
		let bounds = new maplibregl.LngLatBounds();

		rows.forEach(row => {
			const [, , , , lat, lon] = row;
			const latNum = parseFloat(lat), lonNum = parseFloat(lon);
			if (lat && lon && !isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
				latSum += latNum; lonSum += lonNum; validPoints++; bounds.extend([lonNum, latNum]);
			}
		});

		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
			center: [139.98886293394258, 35.853556991089334],
			zoom: 8.7,
		});

		// --- NearestStation.csvのマーカー追加（map生成後に追加） ---
		map.on('load', function() {
			if (data.NearestStation && Array.isArray(data.NearestStation)) {
				data.NearestStation.forEach(row => {
					// 4列未満や緯度経度が空の場合はスキップ
					if (!row[3] || !row[4]) return;
					const latNum = parseFloat(row[3]);
					const lonNum = parseFloat((row[4] || '').replace(/\r?\n/g, '').trim());
					if (isNaN(latNum) || isNaN(lonNum)) return;
					const nearestStationName = row[2] || '';

					const markerDiv = document.createElement('div');
					markerDiv.className = 'nearest-station-marker';
					markerDiv.title = '';

					// ポップアップ要素を作成
					const popupDiv = document.createElement('div');
					popupDiv.className = 'nearest-station-popup';
					popupDiv.textContent = nearestStationName;
					popupDiv.style.display = 'none';
					popupDiv.style.position = 'absolute';
					popupDiv.style.left = '50%';
					popupDiv.style.transform = 'translate(-50%, -100%)';
					popupDiv.style.whiteSpace = 'nowrap';
					popupDiv.style.pointerEvents = 'none';
					markerDiv.appendChild(popupDiv);

					// クリックで表示/非表示
					markerDiv.addEventListener('click', function(e) {
						e.stopPropagation();
						popupDiv.style.display = (popupDiv.style.display === 'block') ? 'none' : 'block';
					});
					// 地図クリックで非表示
					map.on('click', function() {
						popupDiv.style.display = 'none';
					});

					new maplibregl.Marker({ element: markerDiv, anchor: 'center' })
						.setLngLat([lonNum, latNum])
						.addTo(map);
				});
			}
		});
		console.log('NearestStation markers to add:', data.NearestStation);

		allRows.forEach((row, index) => {
			const [id,category,field_name,RegularMeetingCharge,CharterCharge,lat,lon,SiteLink,BookLink,BusBookLink,Reading,NearestStation,OtherInfo,lunch] = row;
			const latNum = parseFloat(lat), lonNum = parseFloat(lon);
			if (!lat || !lon || isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
				markers.push(null); markerDataList.push(null); return;
			}
			const customMarker = document.createElement('img');
			customMarker.src = 'images/pin_blue.png';
			customMarker.className = 'custom-marker';
			customMarker.title = field_name;
			const marker = new maplibregl.Marker({ element: customMarker, anchor: 'bottom' })
				.setLngLat([lonNum, latNum])
				.addTo(map);
			markers.push(marker);
			markerDataList.push(row);

			marker.getElement().addEventListener('click', (event) => {
				event.stopPropagation();
				const infoPanel = document.getElementById('info');
				// 画像リセット
				if (lastActiveMarkerIndex !== null && markers[lastActiveMarkerIndex]) {
					const prevImg = markers[lastActiveMarkerIndex].getElement();
					if (prevImg && prevImg.tagName === 'IMG') prevImg.src = 'images/pin_blue.png';
				}
				// 現在のマーカー画像をmagentaに
				const thisImg = marker.getElement();
				if (thisImg && thisImg.tagName === 'IMG') thisImg.src = 'images/pin_magenta.png';
				lastActiveMarkerIndex = index;

				if (lastClickedMarker === marker) {
					if (infoPanel) infoPanel.innerHTML = '';
					lastClickedMarker = null;
				} else {
					if (infoPanel) infoPanel.innerHTML = markerInfoHtml(field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch);
					lastClickedMarker = marker;
				}
				const leftPanel = document.getElementById('left-panel');
				if (leftPanel) {
					leftPanel.classList.remove('closed');
					document.body.classList.add('panel-open');
					leftPanel.innerHTML = markerInfoHtml(field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch);
					const backBtn = document.getElementById('back-to-list-btn');
					if (backBtn) {
						backBtn.addEventListener('click', function() {
							// 一覧に戻る時にマーカー画像を元に戻す
							if (lastActiveMarkerIndex !== null && markers[lastActiveMarkerIndex]) {
								const prevImg = markers[lastActiveMarkerIndex].getElement();
								if (prevImg && prevImg.tagName === 'IMG') prevImg.src = 'images/pin_blue.png';
								lastActiveMarkerIndex = null;
							}
							showMarkerList(allRows);
							map.flyTo({
								center: [139.98886293394258, 35.853556991089334],
								zoom: 8.7
							});
						});
					}
				}
				// 追加: マーカークリック時にその位置を中心にズーム20
				map.flyTo({ center: [lonNum, latNum], zoom: 17 });
				if (window.innerWidth <= 767) setTimeout(() => map.resize(), 300);
			});
		});
		showMarkerList(allRows);
	}

	function markerInfoHtml(field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch) {
		let linksHtml = '';
		if (SiteLink && String(SiteLink).trim() !== '') linksHtml += `<a href="${SiteLink}" target="_blank">公式サイト</a><br>`;
		if (BookLink && String(BookLink).trim() !== '') linksHtml += `<a href="${BookLink}" target="_blank">定例会・貸し切りの予約はここから</a><br>`;
		if (BusBookLink && String(BusBookLink).trim() !== '') linksHtml += `<a href="${BusBookLink}" target="_blank">送迎バス予約はここから</a><br>`;
		if (OtherInfo && String(OtherInfo).trim() !== '') linksHtml += `<p>${OtherInfo}</p><br>`;
		if (lunch && String(lunch).trim() !== '') linksHtml += `<p>${lunch}</p><br>`;
		// 「一覧に戻る」ボタンを先頭に追加
		return `
			<button id="back-to-list-btn" class="back-to-list-btn">一覧に戻る</button>
			<h2>${field_name}</h2>
			${linksHtml}
			<p>最寄り駅: ${NearestStation}</p>
			<p>定期会料金: ${RegularMeetingCharge}円</p>
			<p>貸し切り料金: ${CharterCharge}円</p>
		`;
	}

	function updateMarkerVisibility(filteredRows) {
		const filteredIds = new Set(filteredRows.map(row => row[0]));
		markers.forEach((marker, idx) => {
			if (!marker) return;
			const row = markerDataList[idx];
			marker.getElement().style.display = (row && filteredIds.has(row[0])) ? '' : 'none';
		});
	}

	function showMarkerList(rowsToShow) {
		const leftPanel = document.getElementById('left-panel');
		if (!leftPanel) return;
		// 50音順に並べ替え（濁点・半濁点・小文字も正規化して比較）
		const sortedRows = [...rowsToShow].sort((a, b) => {
			const hiraA = toHiragana((a[10] || a[2] || '').toString().normalize('NFKC'));
			const hiraB = toHiragana((b[10] || b[2] || '').toString().normalize('NFKC'));
			return hiraA.localeCompare(hiraB, 'ja', { sensitivity: 'base' });
		});
		let html = '<ul class="marker-list">';
		sortedRows.forEach( row => {
			const [id, , field_name] = row;
			if (!field_name || String(field_name).trim() === '') return;
			html += `<li><button class="marker-list-btn" data-marker-id="${id}">${field_name}</button></li>`;
		});
		html += '</ul>';
		leftPanel.innerHTML = html;
		leftPanel.querySelectorAll('button[data-marker-id]').forEach(btn => {
			btn.addEventListener('click', function() {
				const markerId = this.getAttribute('data-marker-id');
				const idx = allRows.findIndex(row => row[0] == markerId);
				if (markers[idx] && markers[idx].getElement()) {
					// 画像リセット
					if (lastActiveMarkerIndex !== null && markers[lastActiveMarkerIndex]) {
						const prevImg = markers[lastActiveMarkerIndex].getElement();
						if (prevImg && prevImg.tagName === 'IMG') prevImg.src = 'images/pin_blue.png';
					}
					// 現在のマーカー画像をmagentaに
					const thisImg = markers[idx].getElement();
					if (thisImg && thisImg.tagName === 'IMG') thisImg.src = 'images/pin_magenta.png';
					lastActiveMarkerIndex = idx;

					markers[idx].getElement().dispatchEvent(new Event('click', {bubbles: true}));
				}
			});
		});
	}

	function applyFilters() {
		const keyword = currentKeyword.trim().toLowerCase();
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
				const fieldName = (row[2] || '');
				const reading = (row[10] || '');
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
		rows = filteredRows;
		updateMarkerVisibility(rows);
	}

	const markerSearch = document.getElementById('marker-search');
	if (markerSearch) {
		markerSearch.addEventListener('input', function(e) {
			currentKeyword = e.target.value;
			applyFilters();
		});
	}

	const element = document.getElementById('info');
	if (element) {
		element.innerHTML = '';
		element.style.marginTop = '20px';
	}
}