let map;

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
	let lastActiveMarkerIndex = null;
	let currentLocationMarker = null;
	let currentLocationPrefecture = null;
	let expandedPrefectures = new Set();
	
	// TypeFilterクラスのインスタンス作成
	const typeFilter = new TypeFilter();
	
	const prefectureCenterZoom = {
		'北海道': { center: [143.2141, 43.0642], zoom: 5.5 },'青森': { center: [140.7402, 40.8244], zoom: 7.5 },'岩手': { center: [141.1527, 39.7036], zoom: 7.0 },'宮城': { center: [140.8719, 38.2682], zoom: 8.0 },'秋田': { center: [140.1024, 39.7186], zoom: 7.5 },'山形': { center: [140.3633, 38.2404], zoom: 8.0 },'福島': { center: [140.4677, 37.7500], zoom: 7.5 },'茨城': { center: [140.4467, 36.3414], zoom: 8.0 },'栃木': { center: [139.8837, 36.5658], zoom: 8.5 },'群馬': { center: [139.0608, 36.3911], zoom: 8.5 },'埼玉': { center: [139.6489, 35.8617], zoom: 9.0 },'千葉': { center: [140.1233, 35.6049], zoom: 8.5 },'東京': { center: [139.6917, 35.6895], zoom: 9.5 },'神奈川': { center: [139.6425, 35.4478], zoom: 9.0 },'新潟': { center: [139.0235, 37.9026], zoom: 7.0 },'富山': { center: [137.2114, 36.6959], zoom: 8.5 },'石川': { center: [136.6256, 36.5944], zoom: 8.0 },'福井': { center: [136.2217, 35.9432], zoom: 8.5 },'山梨': { center: [138.5684, 35.6642], zoom: 8.5 },'長野': { center: [138.1811, 36.2048], zoom: 7.5 },'岐阜': { center: [137.2110, 35.3912], zoom: 7.5 },'静岡': { center: [138.3833, 34.9769], zoom: 8.0 },'愛知': { center: [137.1805, 35.1803], zoom: 8.5 },'三重': { center: [136.5086, 34.7302], zoom: 8.0 },'滋賀': { center: [136.1018, 35.0045], zoom: 9.0 },'京都': { center: [135.7681, 35.0116], zoom: 8.5 },'大阪': { center: [135.5200, 34.6937], zoom: 9.5 },'兵庫': { center: [134.6900, 34.6913], zoom: 8.0 },'奈良': { center: [135.8327, 34.6851], zoom: 9.0 },'和歌山': { center: [135.1675, 34.2261], zoom: 8.0 },'鳥取': { center: [134.2324, 35.5038], zoom: 8.5 },'島根': { center: [132.5564, 35.4725], zoom: 7.5 },'岡山': { center: [133.9348, 34.6617], zoom: 8.5 },'広島': { center: [132.4596, 34.3963], zoom: 8.0 },'山口': { center: [131.4706, 34.3859], zoom: 7.5 },'徳島': { center: [134.5593, 34.0658], zoom: 8.5 },'香川': { center: [134.0434, 34.3401], zoom: 9.5 },'愛媛': { center: [132.7661, 33.8416], zoom: 8.0 },'高知': { center: [133.5311, 33.5597], zoom: 7.5 },'福岡': { center: [130.4017, 33.6064], zoom: 8.5 },'佐賀': { center: [130.2985, 33.2494], zoom: 9.0 },'長崎': { center: [129.8737, 32.7503], zoom: 7.5 },'熊本': { center: [130.7417, 32.7898], zoom: 8.0 },'大分': { center: [131.6127, 33.2382], zoom: 8.0 },'宮崎': { center: [131.4214, 32.0106], zoom: 8.0 },'鹿児島': { center: [130.5581, 31.5602], zoom: 7.0 },'沖縄': { center: [127.6792, 26.2124], zoom: 7.0 },
		'その他': { center: [139.98886293394258, 35.853556991089334], zoom: 8.7 }
	};

	function showLoading() {
		const loadingContainer = document.getElementById('loading-container');
		if (loadingContainer) {
			loadingContainer.classList.remove('hidden');
		}
	}

	function hideLoading() {
		const loadingContainer = document.getElementById('loading-container');
		if (loadingContainer) {
			loadingContainer.classList.add('hidden');
		}
	}

	showLoading();

	initMap();

	function initMap() {
		let latSum = 0, lonSum = 0, validPoints = 0;
		let bounds = new maplibregl.LngLatBounds();

		allRows.forEach(row => {
			const [, , , , lat, lon] = row;
			const latNum = parseFloat(lat), lonNum = parseFloat(lon);
			if (lat && lon && !isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
				latSum += latNum; lonSum += lonNum; validPoints++; bounds.extend([lonNum, latNum]);
			}
		});

		let center = [139.98886293394258, 35.853556991089334];
		let zoom = 8.7;

		if (validPoints > 0) {
			center = [lonSum / validPoints, latSum / validPoints];
		}

		map = new maplibregl.Map({
			container: 'map',
			style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
			center: center,
			zoom: zoom,
		});

		async function addPrefectureBoundaries() {
			try {
				const response = await fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson');
				const prefectureData = await response.json();
				map.addSource('prefecture-boundaries', {
					'type': 'geojson',
					'data': prefectureData
				});
				map.addLayer({
					'id': 'prefecture-borders',
					'type': 'line',
					'source': 'prefecture-boundaries',
					'layout': {},
					'paint': {
						'line-color': '#666666',
						'line-width': 1,
						'line-opacity': 0.6
					}
				});
				map.addLayer({
					'id': 'prefecture-highlight-fill',
					'type': 'fill',
					'source': 'prefecture-boundaries',
					'layout': {},
					'paint': {
						'fill-color': '#007bff',
						'fill-opacity': 0.1
					},
					'filter': ['==', 'name_ja', '']
				});
				map.addLayer({
					'id': 'prefecture-highlight-border',
					'type': 'line',
					'source': 'prefecture-boundaries',
					'layout': {},
					'paint': {
						'line-color': '#007bff',
						'line-width': 3,
						'line-opacity': 0.8
					},
					'filter': ['==', 'name_ja', '']
				});
			} catch (error) {
				console.error('都道府県境界データの読み込みに失敗しました:', error);
			}
		}
		
		function updatePrefectureHighlight() {
			if (!map.getSource('prefecture-boundaries')) return;
			const expandedPrefectureNames = Array.from(expandedPrefectures);
			if (expandedPrefectureNames.length > 0) {
				let filter;
				if (expandedPrefectureNames.length === 1) {
					filter = ['==', 'name_ja', expandedPrefectureNames[0]];
				} else {
					filter = ['in', 'name_ja', ...expandedPrefectureNames];
				}
				map.setFilter('prefecture-highlight-fill', filter);
				map.setFilter('prefecture-highlight-border', filter);
			} else {
				map.setFilter('prefecture-highlight-fill', ['==', 'name_ja', '']);
				map.setFilter('prefecture-highlight-border', ['==', 'name_ja', '']);
			}
		}

		window.updatePrefectureHighlight = updatePrefectureHighlight;

		function getCurrentLocationPrefecture(lat, lon) {
			if (lat >= 35.5 && lat <= 35.8 && lon >= 139.3 && lon <= 139.9) {
				return '東京';
			} else if (lat >= 35.2 && lat <= 36.1 && lon >= 139.8 && lon <= 140.9) {
				return '千葉';
			} else if (lat >= 35.7 && lat <= 36.9 && lon >= 140.0 && lon <= 140.9) {
				return '茨城';
			} else if (lat >= 35.6 && lat <= 36.3 && lon >= 139.0 && lon <= 139.9) {
				return '埼玉';
			} else if (lat >= 35.1 && lat <= 35.9 && lon >= 139.0 && lon <= 139.8) {
				return '神奈川';
			} else if (lat >= 36.2 && lat <= 37.0 && lon >= 139.3 && lon <= 140.3) {
				return '栃木';
			} else if (lat >= 36.0 && lat <= 37.0 && lon >= 138.4 && lon <= 139.8) {
				return '群馬';
			} else if (lat >= 34.5 && lat <= 35.5 && lon >= 137.4 && lon <= 139.0) {
				return '静岡';
			} else if (lat >= 34.6 && lat <= 35.7 && lon >= 136.5 && lon <= 137.7) {
				return '愛知';
			} else if (lat >= 34.3 && lat <= 35.6 && lon >= 135.0 && lon <= 136.8) {
				return '大阪';
			} else if (lat >= 34.3 && lat <= 35.8 && lon >= 134.8 && lon <= 136.5) {
				return '兵庫';
			} else if (lat >= 34.8 && lat <= 35.8 && lon >= 135.0 && lon <= 136.2) {
				return '京都';
			} else if (lat >= 33.0 && lat <= 34.5 && lon >= 129.5 && lon <= 131.2) {
				return '福岡';
			} else if (lat >= 40.2 && lat <= 45.8 && lon >= 139.3 && lon <= 148.9) {
				return '北海道';
			} else if (lat >= 26.0 && lat <= 26.9 && lon >= 127.0 && lon <= 128.4) {
				return '沖縄';
			}
			return null;
		}

		function showCurrentLocation() {
			if (!navigator.geolocation) {
				console.log('このブラウザは位置情報サービスをサポートしていません。');
				showMarkerList(allRows);
				return;
			}

			navigator.geolocation.getCurrentPosition(
				function(position) {
					const lat = position.coords.latitude;
					const lon = position.coords.longitude;

					currentLocationPrefecture = getCurrentLocationPrefecture(lat, lon);

					if (currentLocationMarker) {
						currentLocationMarker.remove();
					}

					const currentLocationImg = document.createElement('img');
					currentLocationImg.src = 'images/cp_blue2.png';
					currentLocationImg.className = 'current-location-marker';
					currentLocationImg.style.cursor = 'pointer';
					currentLocationImg.title = '現在地';

					currentLocationMarker = new maplibregl.Marker({ 
						element: currentLocationImg, 
						anchor: 'center' 
					})
						.setLngLat([lon, lat])
						.addTo(map);

					console.log('現在地を表示しました:', lat, lon, '都道府県:', currentLocationPrefecture);

					showMarkerList(allRows);
				},
				function(error) {
					console.log('位置情報の取得に失敗しました:', error.message);
					showMarkerList(allRows);
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 300000
				}
			);
		}

		map.on('load', function() {
			if (validPoints > 0 && !bounds.isEmpty()) {
				map.fitBounds(bounds, {
					padding: { top: 50, bottom: 50, left: 50, right: 50 },
					maxZoom: 15
				});
			}

			addPrefectureBoundaries();

			showCurrentLocation();
			
			if (data.NearestStation && Array.isArray(data.NearestStation)) {
				data.NearestStation.forEach(row => {
					if (!row[3] || !row[4]) return;
					const latNum = parseFloat(row[3]);
					const lonNum = parseFloat((row[4] || '').replace(/\r?\n/g, '').trim());
					if (isNaN(latNum) || isNaN(lonNum)) return;
					const nearestStationName = row[2] || '';

					const markerDiv = document.createElement('div');
					markerDiv.className = 'nearest-station-marker';
					markerDiv.title = '';
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

					markerDiv.addEventListener('click', function(e) {
						e.stopPropagation();
						popupDiv.style.display = (popupDiv.style.display === 'block') ? 'none' : 'block';
					});
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
			const id = row[0] || '';
			const category = row[1] || '';
			const type = row[2] || '';
			const field_name = row[3] || '';
			const RegularMeetingCharge = row[4] || '';
			const CharterCharge = row[5] || '';
			const lat = row[6] || '';
			const lon = row[7] || '';
			const SiteLink = row[8] || '';
			const BookLink = row[9] || '';
			const BusBookLink = row[10] || '';
			const Reading = row[11] || '';
			const NearestStation = row[12] || '';
			const OtherInfo = row[13] || '';
			const lunch = row[14] || '';
			const num = row[15] || '';
			const where = row[16] || '';
			
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
				if (lastActiveMarkerIndex !== null && markers[lastActiveMarkerIndex]) {
					const prevImg = markers[lastActiveMarkerIndex].getElement();
					if (prevImg && prevImg.tagName === 'IMG') prevImg.src = 'images/pin_blue.png';
				}
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
					leftPanel.innerHTML = markerInfoHtml(id, field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch, num, where);
					setupSlideshowListeners();
					const backBtn = document.getElementById('back-to-list-btn');
					if (backBtn) {
						backBtn.addEventListener('click', function() {
							if (lastActiveMarkerIndex !== null && markers[lastActiveMarkerIndex]) {
								const prevImg = markers[lastActiveMarkerIndex].getElement();
								if (prevImg && prevImg.tagName === 'IMG') prevImg.src = 'images/pin_blue.png';
								lastActiveMarkerIndex = null;
							}
							// 現在のフィルター結果(rows)を使用
							showMarkerList(rows);
							if (expandedPrefectures.size > 0) {
								const firstExpandedPrefecture = Array.from(expandedPrefectures)[0];
								const prefectureConfig = prefectureCenterZoom[firstExpandedPrefecture];
								if (prefectureConfig) {
									map.flyTo({
										center: prefectureConfig.center,
										zoom: prefectureConfig.zoom,
										duration: 1000
									});
								}
							} else {
								if (currentLocationMarker) {
									const currentLngLat = currentLocationMarker.getLngLat();
									map.flyTo({
										center: [currentLngLat.lng, currentLngLat.lat],
										zoom: 11,
										duration: 1000
									});
								} else {
									map.flyTo({
										center: [139.98886293394258, 35.853556991089334],
										zoom: 8.7,
										duration: 1000
									});
								}
							}
						});
					}
				}
				map.flyTo({ center: [lonNum, latNum], zoom: 17 });
				if (window.innerWidth <= 767) setTimeout(() => map.resize(), 300);
			});
		});
		showMarkerList(allRows);
	}

	function markerInfoHtml(id, field_name, SiteLink, BookLink, BusBookLink, NearestStation, RegularMeetingCharge, CharterCharge, OtherInfo, lunch, num, where) {
		let linksHtml = '';
		if (SiteLink && String(SiteLink).trim() !== '') linksHtml += `<a href="${SiteLink}" target="_blank">公式サイト</a><br>`;
		if (BookLink && String(BookLink).trim() !== '') linksHtml += `<a href="${BookLink}" target="_blank">定例会・貸し切りの予約はここから</a><br>`;
		if (BusBookLink && String(BusBookLink).trim() !== '') linksHtml += `<a href="${BusBookLink}" target="_blank">送迎バス予約はここから</a><br>`;
		if (OtherInfo && String(OtherInfo).trim() !== '') linksHtml += `<p>${OtherInfo}</p><br>`;
		if (lunch && String(lunch).trim() !== '') linksHtml += `<p>昼食代は別途${lunch}円</p><br>`;
		let imageHtml = '';
		if (num && String(num).trim() !== '') {
			const numValue = parseInt(String(num).trim());
			if (numValue >= 2) {
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
				imageHtml = `<img src="images/${id}-1.jpg" 
					alt="Airsoft field named ${field_name} showing main play area and surroundings. The environment includes outdoor terrain and field structures. Any visible signage reads ${field_name}. The atmosphere is energetic and inviting." 
					class="field-photos expandable-image" 
					data-field-id="${id}"
					onerror="this.style.display='none'; console.log('Image not found: ${id}-1.jpg');" />`;
			}
		}

		let whereHtml = '';
		if (where !== undefined && where !== null && String(where).trim() !== '' && String(where).trim() !== 'undefined') {
			whereHtml = `<p>所在地: ${String(where).trim()}</p>`;
		}
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

	function showMarkerList(rowsToShow) {
		const leftPanel = document.getElementById('left-panel');
		if (!leftPanel) return;

		hideLoading();
		
		// rowsToShowをグローバルなrows変数に保存
		rows = rowsToShow;
		
		const sortedRows = [...rowsToShow].sort((a, b) => {
			const readingA = ((a && a[11]) || '').toString().normalize('NFKC');
			const readingB = ((b && b[11]) || '').toString().normalize('NFKC');
			const fallbackA = ((a && a[3]) || '').toString().normalize('NFKC');
			const fallbackB = ((b && b[3]) || '').toString().normalize('NFKC');

			const keyA = readingA || fallbackA;
			const keyB = readingB || fallbackB;

			const hiraA = toHiragana(keyA);
			const hiraB = toHiragana(keyB);
			return hiraA.localeCompare(hiraB, 'ja', { sensitivity: 'base' });
		});

		const prefectureGroups = {};
		sortedRows.forEach(row => {
			if (!row || !Array.isArray(row)) return;
			
			const id = row[0] || '';
			const category = row[1] || '';
			const field_name = row[3] || '';
			const nearestStation = row[12] || '';
			
			if (!field_name || String(field_name).trim() === '') return;
			
			const prefecture = extractPrefecture(field_name, nearestStation, category);
			if (!prefectureGroups[prefecture]) {
				prefectureGroups[prefecture] = [];
			}
			prefectureGroups[prefecture].push(row);
		});
		Object.keys(prefectureGroups).forEach(prefecture => {
			prefectureGroups[prefecture].sort((a, b) => {
				const readingA = ((a && a[11]) || '').toString().normalize('NFKC');
				const readingB = ((b && b[11]) || '').toString().normalize('NFKC');
				const fallbackA = ((a && a[3]) || '').toString().normalize('NFKC');
				const fallbackB = ((b && b[3]) || '').toString().normalize('NFKC');

				const keyA = readingA || fallbackA;
				const keyB = readingB || fallbackB;

				const hiraA = toHiragana(keyA);
				const hiraB = toHiragana(keyB);
				return hiraA.localeCompare(hiraB, 'ja', { sensitivity: 'base' });
			});
		});

		const prefectureOrder = [
			'北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
			'茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
			'新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜',
			'静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫',
			'奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口',
			'徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎',
			'熊本', '大分', '宮崎', '鹿児島', '沖縄', 'その他'
		];
		
		let html = '<div class="prefecture-list">';
		
		prefectureOrder.forEach(prefecture => {
			if (!prefectureGroups[prefecture]) return;
			const fieldsCount = prefectureGroups[prefecture].length;
			let isExpanded = expandedPrefectures.has(prefecture);
			if (!expandedPrefectures.size && prefecture === currentLocationPrefecture) {
				expandedPrefectures.add(prefecture);
				isExpanded = true;
				const cfg = prefectureCenterZoom[prefecture];
				if (cfg && map) {
					map.flyTo({
						center: cfg.center,
						zoom: cfg.zoom,
						duration: 1000
					});
				}
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
				const id = row[0] || '';
				const field_name = row[3] || '';
				html += `<li><button class="marker-list-btn" data-marker-id="${id}">${field_name}</button></li>`;
			});
			
			html += `
					</ul>
				</div>
			`;
		});
		
		html += '</div>';
		leftPanel.innerHTML = html;
		leftPanel.querySelectorAll('.prefecture-toggle').forEach(toggleBtn => {
			toggleBtn.addEventListener('click', function() {
				const prefecture = this.getAttribute('data-prefecture');
				const fieldsList = leftPanel.querySelector(`.prefecture-fields[data-prefecture="${prefecture}"]`);
				const toggleIcon = this.querySelector('.toggle-icon');
				
				if (fieldsList.style.display === 'none') {
					expandedPrefectures.forEach(openPrefecture => {
						if (openPrefecture !== prefecture) {
							const otherFieldsList = leftPanel.querySelector(`.prefecture-fields[data-prefecture="${openPrefecture}"]`);
							const otherToggleIcon = leftPanel.querySelector(`[data-prefecture="${openPrefecture}"] .toggle-icon`);
							if (otherFieldsList) otherFieldsList.style.display = 'none';
							if (otherToggleIcon) otherToggleIcon.textContent = '+';
						}
					});

					expandedPrefectures.clear();
					expandedPrefectures.add(prefecture);

					fieldsList.style.display = 'block';
					toggleIcon.textContent = '-';
					const prefectureConfig = prefectureCenterZoom[prefecture];
					if (prefectureConfig) {
						map.flyTo({
							center: prefectureConfig.center,
							zoom: prefectureConfig.zoom,
							duration: 1000
						});
					}
				} else {
					fieldsList.style.display = 'none';
					toggleIcon.textContent = '+';
					expandedPrefectures.delete(prefecture);

					if (expandedPrefectures.size === 0) {
						if (currentLocationMarker) {
							const currentLngLat = currentLocationMarker.getLngLat();
							map.flyTo({
								center: [currentLngLat.lng, currentLngLat.lat],
								zoom: 11,
								duration: 1000
							});
						} else {
							map.flyTo({
								center: [139.98886293394258, 35.853556991089334],
								zoom: 8.7,
								duration: 1000
							});
						}
					}
				}

				// マーカー表示を更新（フィルター結果とトグル状態の両方を考慮）
				updateMarkerVisibilityWithFilter();

				if (window.updatePrefectureHighlight) {
					window.updatePrefectureHighlight();
				}
			});
		});

		leftPanel.querySelectorAll('button[data-marker-id]').forEach(btn => {
			btn.addEventListener('click', function() {
				const markerId = this.getAttribute('data-marker-id');
				const idx = allRows.findIndex(row => row[0] == markerId);
				if (markers[idx] && markers[idx].getElement()) {
					if (lastActiveMarkerIndex !== null && markers[lastActiveMarkerIndex]) {
						const prevImg = markers[lastActiveMarkerIndex].getElement();
						if (prevImg && prevImg.tagName === 'IMG') prevImg.src = 'images/pin_blue.png';
					}
					const thisImg = markers[idx].getElement();
					if (thisImg && thisImg.tagName === 'IMG') thisImg.src = 'images/pin_magenta.png';
					lastActiveMarkerIndex = idx;

					leftPanel.scrollTop = 0;

					markers[idx].getElement().dispatchEvent(new Event('click', {bubbles: true}));
				}
			});
		});

		if (!expandedPrefectures.size && currentLocationPrefecture) {
			expandedPrefectures.add(currentLocationPrefecture);
		}

		// マーカー表示を更新（フィルター結果とトグル状態の両方を考慮）
		updateMarkerVisibilityWithFilter();

		if (window.updatePrefectureHighlight) {
			window.updatePrefectureHighlight();
		}
	}

	function extractPrefecture(fieldName, nearestStation, category) {
		const prefectureMap = {
			'0': '東京','1': '千葉', '2': '茨城','3': '埼玉','4': '神奈川','5': '栃木','6': '群馬','7': '静岡','8': '愛知','9': '大阪','10': '兵庫','11': '京都','12': '福岡','13': '北海道','14': '青森','15': '岩手','16': '宮城','17': '秋田','18': '山形','19': '福島','20': '新潟','21': '富山','22': '石川','23': '福井','24': '山梨','25': '長野','26': '岐阜','27': '三重','28': '滋賀','29': '奈良','30': '和歌山','31': '鳥取','32': '島根','33': '岡山','34': '広島','35': '山口','36': '徳島','37': '香川','38': '愛媛','39': '高知','40': '佐賀','41': '長崎','42': '熊本','43': '大分','44': '宮崎','45': '鹿児島','46': '沖縄'
		};

		if (category !== undefined && category !== null) {
			const categoryStr = String(category).trim();
			const prefecture = prefectureMap[categoryStr];
			if (prefecture) {
				return prefecture;
			}
		}

		return 'その他';
	}

	// フィルター結果とトグル状態の両方を考慮してマーカーの表示を更新
	function updateMarkerVisibilityWithFilter() {
		const filteredIds = new Set(rows.map(row => row && row[0]).filter(id => id));
		
		markers.forEach((marker, idx) => {
			if (!marker) return;
			const row = markerDataList[idx];
			if (!row || !Array.isArray(row)) return;

			const category = row[1] || '';
			const field_name = row[3] || '';
			const nearestStation = row[12] || '';
			const prefecture = extractPrefecture(field_name, nearestStation, category);

			const matchesFilter = filteredIds.has(row[0]);
			const isToggleExpanded = expandedPrefectures.has(prefecture);
			const isVisible = matchesFilter && isToggleExpanded;

			marker.getElement().style.display = isVisible ? '' : 'none';
		});
	}

	function applyFilters() {
		const filteredRows = typeFilter.applyFilters(
			allRows, 
			toHiragana, 
			toKatakana, 
			toRomaji, 
			toKatakanaFromAlphabet, 
			normalizeText
		);

		rows = filteredRows;

		showMarkerList(filteredRows);
	}

	function setupSlideshowListeners() {
		document.querySelectorAll('.prev-btn, .next-btn').forEach(btn => {
			const newBtn = btn.cloneNode(true);
			btn.parentNode.replaceChild(newBtn, btn);
		});

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

		setupImageExpandListeners();
	}

	function changeSlide(id, direction) {
		const slideshowContainer = document.querySelector(`.image-slideshow[data-field-id="${id}"]`);
		if (!slideshowContainer) return;
		
		const totalSlides = parseInt(slideshowContainer.getAttribute('data-total-slides')) || 1;
		const currentSpan = document.getElementById(`slide-current-${id}`);
		const imgElement = document.getElementById(`slideshow-img-${id}`);
		
		if (!currentSpan || !imgElement) return;
		
		let currentIndex = parseInt(currentSpan.textContent) || 1;
		let newIndex = currentIndex + direction;

		if (newIndex > totalSlides) {
			newIndex = 1;
		} else if (newIndex < 1) {
			newIndex = totalSlides;
		}

		imgElement.src = `images/${id}-${newIndex}.jpg`;
		currentSpan.textContent = newIndex;

		setupImageExpandListeners();
		
		console.log(`Slide changed for ${id}: ${currentIndex} -> ${newIndex}`);
	}

	function setupImageExpandListeners() {
		document.querySelectorAll('.expandable-image').forEach(img => {
			const newImg = img.cloneNode(true);
			img.parentNode.replaceChild(newImg, img);
		});

		document.querySelectorAll('.expandable-image').forEach(img => {
			img.addEventListener('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				expandImage(this.src, this.alt);
			});
		});
	}

	function expandImage(src, alt) {
		const existingModal = document.getElementById('image-modal');
		if (existingModal) {
			existingModal.remove();
		}

		const fieldId = extractFieldIdFromSrc(src);
		const currentSlide = extractSlideNumberFromSrc(src);
		const slideshowContainer = document.querySelector(`.image-slideshow[data-field-id="${fieldId}"]`);
		const totalSlides = slideshowContainer ? parseInt(slideshowContainer.getAttribute('data-total-slides')) : 1;

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

		let startX = 0;
		let endX = 0;
		let currentSlideNumber = currentSlide;

		function changeExpandedSlide(direction) {
			if (totalSlides <= 1) return;
			
			let newSlideNumber = currentSlideNumber + direction;

			if (newSlideNumber > totalSlides) {
				newSlideNumber = 1;
			} else if (newSlideNumber < 1) {
				newSlideNumber = totalSlides;
			}
			
			currentSlideNumber = newSlideNumber;
			expandedImg.src = `images/${fieldId}-${newSlideNumber}.jpg`;
			const originalImg = document.getElementById(`slideshow-img-${fieldId}`);
			const currentSpan = document.getElementById(`slide-current-${fieldId}`);
			if (originalImg) originalImg.src = `images/${fieldId}-${newSlideNumber}.jpg`;
			if (currentSpan) currentSpan.textContent = newSlideNumber;
		}

		modal.addEventListener('touchstart', function(e) {
			startX = e.touches[0].clientX;
		}, { passive: true });
		
		modal.addEventListener('touchend', function(e) {
			endX = e.changedTouches[0].clientX;
			const diffX = startX - endX;

			if (Math.abs(diffX) > 50) {
				if (diffX > 0) {
					changeExpandedSlide(1);
				} else {
					changeExpandedSlide(-1);
				}
			}
		}, { passive: true });

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

		setTimeout(() => {
			modal.classList.add('show');
		}, 10);

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

	function extractFieldIdFromSrc(src) {
		const match = src.match(/images\/(.+)-\d+\.jpg/);
		return match ? match[1] : null;
	}

	function extractSlideNumberFromSrc(src) {
		const match = src.match(/images\/.+-(\d+)\.jpg/);
		return match ? parseInt(match[1]) : 1;
	}

	// フィルター変更時のコールバック設定
	typeFilter.onFilterChange = applyFilters;
	
	// フィルターUIの初期化
	typeFilter.initAll();
}
