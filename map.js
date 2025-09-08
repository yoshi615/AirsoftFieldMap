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
	let currentLocationMarker = null; // 現在地マーカーを保持する変数
	let currentLocationPrefecture = null; // 現在地の都道府県を保持
	let expandedPrefectures = new Set(); // 展開中の都道府県を管理

	initMap();

	function initMap() {
		let latSum = 0, lonSum = 0, validPoints = 0;
		let bounds = new maplibregl.LngLatBounds();

		// allRowsを使用して全データから座標を取得
		allRows.forEach(row => {
			const [, , , , lat, lon] = row;
			const latNum = parseFloat(lat), lonNum = parseFloat(lon);
			if (lat && lon && !isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
				latSum += latNum; lonSum += lonNum; validPoints++; bounds.extend([lonNum, latNum]);
			}
		});

		// 座標データの平均値をcenter座標として設定
		let center = [139.98886293394258, 35.853556991089334]; // フォールバック座標
		let zoom = 8.7;

		// 有効なポイントがある場合は平均値を計算
		if (validPoints > 0) {
			center = [lonSum / validPoints, latSum / validPoints];
		}

		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
			center: center,
			zoom: zoom,
		});

		// 現在地から都道府県を判定する関数
		function getCurrentLocationPrefecture(lat, lon) {
			// 簡易的な座標による都道府県判定			
			if (lat >= 35.5 && lat <= 35.8 && lon >= 139.3 && lon <= 139.9) {
				return '東京';
			} else if (lat >= 35.2 && lat <= 36.1 && lon >= 139.8 && lon <= 140.9) {
				return '千葉';
			} else if (lat >= 35.7 && lat <= 36.9 && lon >= 140.0 && lon <= 140.9) {
				return '茨城';
			} else if (lat >= 35.6 && lat <= 36.3 && lon >= 139.0 && lon <= 139.9) {
				return '埼玉';
			}
			return null;
		}

		// 現在地を取得して表示する関数
		function showCurrentLocation() {
			if (!navigator.geolocation) {
				console.log('このブラウザは位置情報サービスをサポートしていません。');
				return;
			}

			navigator.geolocation.getCurrentPosition(
				function(position) {
					const lat = position.coords.latitude;
					const lon = position.coords.longitude;
					
					// 現在地の都道府県を判定
					currentLocationPrefecture = getCurrentLocationPrefecture(lat, lon);
					
					// 既存の現在地マーカーがあれば削除
					if (currentLocationMarker) {
						currentLocationMarker.remove();
					}

					// 現在地マーカーを作成
					const currentLocationImg = document.createElement('img');
					currentLocationImg.src = 'images/cp_blue2.png';
					currentLocationImg.className = 'current-location-marker';
					currentLocationImg.style.cursor = 'pointer';
					currentLocationImg.title = '現在地';

					// 現在地マーカーを地図に追加
					currentLocationMarker = new maplibregl.Marker({ 
						element: currentLocationImg, 
						anchor: 'center' 
					})
						.setLngLat([lon, lat])
						.addTo(map);

					console.log('現在地を表示しました:', lat, lon, '都道府県:', currentLocationPrefecture);
					
					// 現在地取得後にマーカーリストを再表示
					showMarkerList(allRows);
				},
				function(error) {
					console.log('位置情報の取得に失敗しました:', error.message);
					showMarkerList(allRows); // 位置情報取得失敗時も通常表示
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 300000
				}
			);
		}

		// マップ読み込み完了時に現在地を自動取得
		map.on('load', function() {
			// 有効な境界がある場合は地図をその範囲にフィット
			if (validPoints > 0 && !bounds.isEmpty()) {
				map.fitBounds(bounds, {
					padding: { top: 50, bottom: 50, left: 50, right: 50 },
					maxZoom: 15
				});
			}

			showCurrentLocation();
			
			// --- NearestStation.csvのマーカー追加 ---
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
			// より安全な配列アクセス
			const id = row[0] || '';
			const category = row[1] || '';
			const field_name = row[2] || '';
			const RegularMeetingCharge = row[3] || '';
			const CharterCharge = row[4] || '';
			const lat = row[5] || '';
			const lon = row[6] || '';
			const SiteLink = row[7] || '';
			const BookLink = row[8] || '';
			const BusBookLink = row[9] || '';
			const Reading = row[10] || '';
			const NearestStation = row[11] || '';
			const OtherInfo = row[12] || '';
			const lunch = row[13] || '';
			const num = row[14] || '';
			const where = row[15] || '';
			
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
					if (infoPanel) infoPanel.innerHTML = markerInfoHtml(id, field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch, num, where);
					lastClickedMarker = marker;
				}
				const leftPanel = document.getElementById('left-panel');
				if (leftPanel) {
					leftPanel.classList.remove('closed');
					document.body.classList.add('panel-open');
					leftPanel.innerHTML = markerInfoHtml(id, field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch, num, where);
					
					// スライドショーのイベントリスナーを設定
					setupSlideshowListeners();
					
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
								zoom: 10
							});
						});
					}
				}
				// 追加: マーカークリック時にその位置を中心にズーム20
				map.flyTo({ center: [lonNum, latNum], zoom: 17 });
				if (window.innerWidth <= 767) setTimeout(() => map.resize(), 300);
			});
		});
	}

	function markerInfoHtml(id, field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch, num, where) {
		let linksHtml = '';
		if (SiteLink && String(SiteLink).trim() !== '') linksHtml += `<a href="${SiteLink}" target="_blank">公式サイト</a><br>`;
		if (BookLink && String(BookLink).trim() !== '') linksHtml += `<a href="${BookLink}" target="_blank">定例会・貸し切りの予約はここから</a><br>`;
		if (BusBookLink && String(BusBookLink).trim() !== '') linksHtml += `<a href="${BusBookLink}" target="_blank">送迎バス予約はここから</a><br>`;
		if (OtherInfo && String(OtherInfo).trim() !== '') linksHtml += `<p>${OtherInfo}</p><br>`;
		if (lunch && String(lunch).trim() !== '') linksHtml += `<p>昼食代は別途${lunch}円</p><br>`;
		
		// 画像のHTMLを条件付きで追加（スライドショー機能付き）
		let imageHtml = '';
		if (num && String(num).trim() !== '') {
			const numValue = parseInt(String(num).trim());
			if (numValue >= 2) {
				// 複数枚の画像がある場合はスライドショー形式
				imageHtml = `
					<div class="image-slideshow" data-field-id="${id}" data-total-slides="${numValue}">
						<div class="slideshow-container">
							<button class="prev-btn" data-field-id="${id}">&lt;</button>
							<img id="slideshow-img-${id}" src="images/${id}-1.jpg" 
								alt="Airsoft field named ${field_name} showing main play area and surroundings. The environment includes outdoor terrain and field structures. Any visible signage reads ${field_name}. The atmosphere is energetic and inviting." 
								class="field-photos slideshow-image expandable-image" 
								data-field-id="${id}"
								onerror="this.style.display='none'; console.log('Image not found: ${id}-1.jpg');" />
							<button class="next-btn" data-field-id="${id}">&gt;</button>
						</div>
						<div class="slide-counter">
							<span id="slide-current-${id}">1</span> / <span id="slide-total-${id}">${numValue}</span>
						</div>
					</div>
				`;
			} else {
				// 1枚の場合は従来通り
				imageHtml = `<img src="images/${id}-1.jpg" 
					alt="Airsoft field named ${field_name} showing main play area and surroundings. The environment includes outdoor terrain and field structures. Any visible signage reads ${field_name}. The atmosphere is energetic and inviting." 
					class="field-photos expandable-image" 
					data-field-id="${id}"
					onerror="this.style.display='none'; console.log('Image not found: ${id}-1.jpg');" />`;
			}
		}
		
		// 所在地の安全な表示
		let whereHtml = '';
		if (where !== undefined && where !== null && String(where).trim() !== '' && String(where).trim() !== 'undefined') {
			whereHtml = `<p>所在地: ${String(where).trim()}</p>`;
		}
		
		// 「一覧に戻る」ボタンを先頭に追加
		return `
			<button id="back-to-list-btn" class="back-to-list-btn">一覧に戻る</button>
			<h2>${field_name}</h2>
			${linksHtml}
			<p>最寄り駅: ${NearestStation}</p>
			${whereHtml}
			<p>定期会料金: ${RegularMeetingCharge}円</p>
			<p>貸し切り料金: ${CharterCharge}円</p>
			${imageHtml}
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

	// 都道府県を抽出する関数を追加
	function extractPrefecture(fieldName, nearestStation, category) {
		// categoryの数字から都道府県を判定（READMEの仕様に基づく）
		const prefectureMap = {
			'0': '東京',
			'1': '千葉', 
			'2': '茨城',
			'3': '埼玉'
		};
		
		// categoryから都道府県を判定
		if (category !== undefined && category !== null) {
			const categoryStr = String(category).trim();
			const prefecture = prefectureMap[categoryStr];
			if (prefecture) {
				return prefecture;
			}
		}
		
		// categoryから判定できない場合は'その他'として扱う
		return 'その他';
	}

	// トグル状態に基づいてマーカーの表示/非表示を更新する関数
	function updateMarkerVisibilityByToggle() {
		markers.forEach((marker, idx) => {
			if (!marker) return;
			const row = markerDataList[idx];
			if (!row) return;

			const [, category, field_name, , , , , , , , , nearestStation] = row;
			const prefecture = extractPrefecture(field_name, nearestStation, category);
			
			// 展開されている都道府県のマーカーのみ表示
			const isVisible = expandedPrefectures.has(prefecture);
			marker.getElement().style.display = isVisible ? '' : 'none';
		});
	}

	function showMarkerList(rowsToShow) {
		const leftPanel = document.getElementById('left-panel');
		if (!leftPanel) return;
		
		// 50音順に並べ替え
		const sortedRows = [...rowsToShow].sort((a, b) => {
			const hiraA = toHiragana(((a && a[10]) || (a && a[2]) || '').toString().normalize('NFKC'));
			const hiraB = toHiragana(((b && b[10]) || (b && b[2]) || '').toString().normalize('NFKC'));
			return hiraA.localeCompare(hiraB, 'ja', { sensitivity: 'base' });
		});
		
		// 都道府県別にグループ化
		const prefectureGroups = {};
		sortedRows.forEach(row => {
			if (!row || !Array.isArray(row)) return;
			
			const id = row[0] || '';
			const category = row[1] || '';
			const field_name = row[2] || '';
			const nearestStation = row[11] || '';
			
			if (!field_name || String(field_name).trim() === '') return;
			
			const prefecture = extractPrefecture(field_name, nearestStation, category);
			if (!prefectureGroups[prefecture]) {
				prefectureGroups[prefecture] = [];
			}
			prefectureGroups[prefecture].push(row);
		});
		// 各都道府県グループ内でも50音順に並び替え
		Object.keys(prefectureGroups).forEach(prefecture => {
			prefectureGroups[prefecture].sort((a, b) => {
				const hiraA = toHiragana((a[10] || a[2] || '').toString().normalize('NFKC'));
				const hiraB = toHiragana((b[10] || b[2] || '').toString().normalize('NFKC'));
				return hiraA.localeCompare(hiraB, 'ja', { sensitivity: 'base' });
			});
		});
		
		// 都道府県順に並べ替え（categoryで定義された都道府県のみ）
		const prefectureOrder = [
			'東京', '千葉', '茨城', '埼玉', 'その他'
		];
		
		let html = '<div class="prefecture-list">';
		
		prefectureOrder.forEach(prefecture => {
			if (!prefectureGroups[prefecture]) return;
			
			const fieldsCount = prefectureGroups[prefecture].length;
			
			// 展開状態を確認（expandedPrefecturesセットに基づく）
			let isExpanded = expandedPrefectures.has(prefecture);
			// 現在地の都道府県の場合は初回のみ展開状態に追加
			if (!expandedPrefectures.size && prefecture === currentLocationPrefecture) {
				expandedPrefectures.add(prefecture);
				isExpanded = true;
			}
			
			const displayStyle = isExpanded ? 'block' : 'none';
			const iconText = isExpanded ? '-' : '+';
			
			html += `
				<div class="prefecture-group">
					<button class="prefecture-toggle" data-prefecture="${prefecture}">
						<span class="toggle-icon">${iconText}</span>
						${prefecture} (${fieldsCount})
					</button>
					<ul class="marker-list prefecture-fields" data-prefecture="${prefecture}" style="display: ${displayStyle};">
			`;
			
			prefectureGroups[prefecture].forEach(row => {
				const [id, , field_name] = row;
				html += `<li><button class="marker-list-btn" data-marker-id="${id}">${field_name}</button></li>`;
			});
			
			html += `
					</ul>
				</div>
			`;
		});
		
		html += '</div>';
		leftPanel.innerHTML = html;
		
		// トグルボタンのイベントリスナー
		leftPanel.querySelectorAll('.prefecture-toggle').forEach(toggleBtn => {
			toggleBtn.addEventListener('click', function() {
				const prefecture = this.getAttribute('data-prefecture');
				const fieldsList = leftPanel.querySelector(`.prefecture-fields[data-prefecture="${prefecture}"]`);
				const toggleIcon = this.querySelector('.toggle-icon');
				
				if (fieldsList.style.display === 'none') {
					fieldsList.style.display = 'block';
					toggleIcon.textContent = '-';
					expandedPrefectures.add(prefecture);
				} else {
					fieldsList.style.display = 'none';
					toggleIcon.textContent = '+';
					expandedPrefectures.delete(prefecture);
				}
				
				// トグル状態変更時にマーカーの表示を更新
				updateMarkerVisibilityByToggle();
			});
		});
		
		// マーカーリストボタンのイベントリスナー
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

					leftPanel.scrollTop = 0;

					markers[idx].getElement().dispatchEvent(new Event('click', {bubbles: true}));
				}
			});
		});
		
		// 初期状態での現在地都道府県を展開（一度だけ）
		if (!expandedPrefectures.size && currentLocationPrefecture) {
			expandedPrefectures.add(currentLocationPrefecture);
		}
		
		// マーカーの表示を更新
		updateMarkerVisibilityByToggle();
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
				if (!row || !Array.isArray(row)) return false;
				
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
		
		// フィルタ適用時もトグル状態を考慮
		const filteredIds = new Set(filteredRows.map(row => row && row[0]).filter(id => id));
		markers.forEach((marker, idx) => {
			if (!marker) return;
			const row = markerDataList[idx];
			if (!row || !Array.isArray(row)) return;

			const category = row[1] || '';
			const field_name = row[2] || '';
			const nearestStation = row[11] || '';
			const prefecture = extractPrefecture(field_name, nearestStation, category);
			
			// フィルタ条件とトグル状態の両方を満たす場合のみ表示
			const matchesFilter = filteredIds.has(row[0]);
			const isToggleExpanded = expandedPrefectures.has(prefecture);
			const isVisible = matchesFilter && isToggleExpanded;
			
			marker.getElement().style.display = isVisible ? '' : 'none';
		});
	}

	// スライドショーのイベントリスナーを設定する関数
	function setupSlideshowListeners() {
		// 既存のリスナーを削除（重複防止）
		document.querySelectorAll('.prev-btn, .next-btn').forEach(btn => {
			const newBtn = btn.cloneNode(true);
			btn.parentNode.replaceChild(newBtn, btn);
		});
		
		// 新しいリスナーを設定
		document.querySelectorAll('.prev-btn').forEach(btn => {
			btn.addEventListener('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				const fieldId = this.getAttribute('data-field-id');
				changeSlide(fieldId, -1);
			});
		});
		
		document.querySelectorAll('.next-btn').forEach(btn => {
			btn.addEventListener('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				const fieldId = this.getAttribute('data-field-id');
				changeSlide(fieldId, 1);
			});
		});

		// 画像クリック/タップで全画面表示のリスナーを設定
		setupImageExpandListeners();
	}

	// スライドショー機能を修正
	function changeSlide(id, direction) {
		// スライドショーコンテナから情報を取得
		const slideshowContainer = document.querySelector(`.image-slideshow[data-field-id="${id}"]`);
		if (!slideshowContainer) return;
		
		const totalSlides = parseInt(slideshowContainer.getAttribute('data-total-slides')) || 1;
		const currentSpan = document.getElementById(`slide-current-${id}`);
		const imgElement = document.getElementById(`slideshow-img-${id}`);
		
		if (!currentSpan || !imgElement) return;
		
		let currentIndex = parseInt(currentSpan.textContent) || 1;
		let newIndex = currentIndex + direction;
		
		// ループ処理
		if (newIndex > totalSlides) {
			newIndex = 1;
		} else if (newIndex < 1) {
			newIndex = totalSlides;
		}
		
		// 画像を切り替え
		imgElement.src = `images/${id}-${newIndex}.jpg`;
		currentSpan.textContent = newIndex;
		
		// 画像拡大機能のリスナーを再設定
		setupImageExpandListeners();
		
		console.log(`Slide changed for ${id}: ${currentIndex} -> ${newIndex}`);
	}

	// 画像拡大表示のイベントリスナーを設定する関数
	function setupImageExpandListeners() {
		// 既存のリスナーを削除（重複防止）
		document.querySelectorAll('.expandable-image').forEach(img => {
			const newImg = img.cloneNode(true);
			img.parentNode.replaceChild(newImg, img);
		});
		
		// 新しいリスナーを設定
		document.querySelectorAll('.expandable-image').forEach(img => {
			img.addEventListener('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				expandImage(this.src, this.alt);
			});
		});
	}

	// 画像を全画面表示する関数
	function expandImage(src, alt) {
		// 既存のモーダルがあれば削除
		const existingModal = document.getElementById('image-modal');
		if (existingModal) {
			existingModal.remove();
		}

		// field-idと現在のスライド番号を取得
		const fieldId = extractFieldIdFromSrc(src);
		const currentSlide = extractSlideNumberFromSrc(src);
		const slideshowContainer = document.querySelector(`.image-slideshow[data-field-id="${fieldId}"]`);
		const totalSlides = slideshowContainer ? parseInt(slideshowContainer.getAttribute('data-total-slides')) : 1;

		// モーダル要素を作成
		const modal = document.createElement('div');
		modal.id = 'image-modal';
		modal.className = 'image-modal';
		
		const modalContent = document.createElement('div');
		modalContent.className = 'modal-content';
		
		const closeBtn = document.createElement('span');
		closeBtn.className = 'close-modal';
		closeBtn.innerHTML = '&times;';
		
		const expandedImg = document.createElement('img');
		expandedImg.src = src;
		expandedImg.alt = alt;
		expandedImg.className = 'expanded-image';
		expandedImg.id = 'expanded-img';
		
		modalContent.appendChild(closeBtn);
		modalContent.appendChild(expandedImg);
		modal.appendChild(modalContent);
		document.body.appendChild(modal);
		
		// タッチイベント用の変数
		let startX = 0;
		let endX = 0;
		let currentSlideNumber = currentSlide;
		
		// スワイプ処理関数
		function changeExpandedSlide(direction) {
			if (totalSlides <= 1) return;
			
			let newSlideNumber = currentSlideNumber + direction;
			
			// ループ処理
			if (newSlideNumber > totalSlides) {
				newSlideNumber = 1;
			} else if (newSlideNumber < 1) {
				newSlideNumber = totalSlides;
			}
			
			currentSlideNumber = newSlideNumber;
			expandedImg.src = `images/${fieldId}-${newSlideNumber}.jpg`;
			
			// 元のスライドショーも同期
			const originalImg = document.getElementById(`slideshow-img-${fieldId}`);
			const currentSpan = document.getElementById(`slide-current-${fieldId}`);
			if (originalImg) originalImg.src = `images/${fieldId}-${newSlideNumber}.jpg`;
			if (currentSpan) currentSpan.textContent = newSlideNumber;
		}
		
		// タッチイベントリスナー
		modal.addEventListener('touchstart', function(e) {
			startX = e.touches[0].clientX;
		}, { passive: true });
		
		modal.addEventListener('touchend', function(e) {
			endX = e.changedTouches[0].clientX;
			const diffX = startX - endX;
			
			// 50px以上のスワイプで反応
			if (Math.abs(diffX) > 50) {
				if (diffX > 0) {
					// 左スワイプ（次の画像）
					changeExpandedSlide(1);
				} else {
					// 右スワイプ（前の画像）
					changeExpandedSlide(-1);
				}
			}
		}, { passive: true });
		
		// マウスイベント（デスクトップ用）
		let isDragging = false;
		let startMouseX = 0;
		
		modal.addEventListener('mousedown', function(e) {
			isDragging = true;
			startMouseX = e.clientX;
		});
		
		modal.addEventListener('mousemove', function(e) {
			if (!isDragging) return;
			e.preventDefault();
		});
		
		modal.addEventListener('mouseup', function(e) {
			if (!isDragging) return;
			isDragging = false;
			
			const diffX = startMouseX - e.clientX;
			
			// 50px以上のドラッグで反応
			if (Math.abs(diffX) > 50) {
				if (diffX > 0) {
					// 左ドラッグ（次の画像）
					changeExpandedSlide(1);
				} else {
					// 右ドラッグ（前の画像）
					changeExpandedSlide(-1);
				}
			}
		});
		
		// キーボードイベント（矢印キー）
		const handleKeyPress = (e) => {
			if (e.key === 'Escape') {
				closeModal();
				document.removeEventListener('keydown', handleKeyPress);
			} else if (e.key === 'ArrowLeft') {
				changeExpandedSlide(-1);
			} else if (e.key === 'ArrowRight') {
				changeExpandedSlide(1);
			}
		};
		document.addEventListener('keydown', handleKeyPress);
		
		// モーダルを表示
		setTimeout(() => {
			modal.classList.add('show');
		}, 10);
		
		// 閉じるイベントリスナー
		const closeModal = () => {
			modal.classList.remove('show');
			setTimeout(() => {
				if (modal.parentNode) {
					modal.parentNode.removeChild(modal);
				}
			}, 300);
			document.removeEventListener('keydown', handleKeyPress);
		};
		
		closeBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', function(e) {
			if (e.target === modal) {
				closeModal();
			}
		});
	}
	
	// srcからfield-idを抽出する関数
	function extractFieldIdFromSrc(src) {
		const match = src.match(/images\/(.+)-\d+\.jpg/);
		return match ? match[1] : null;
	}
	
	// srcからスライド番号を抽出する関数
	function extractSlideNumberFromSrc(src) {
		const match = src.match(/images\/.+-(\d+)\.jpg/);
		return match ? parseInt(match[1]) : 1;
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