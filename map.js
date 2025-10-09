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

	// 47都道府県の中心座標とズームレベルを定義（実際の境界に基づいて調整）
	const prefectureCenterZoom = {
		'北海道': { center: [143.2141, 43.0642], zoom: 5.5 },
		'青森': { center: [140.7402, 40.8244], zoom: 7.5 },
		'岩手': { center: [141.1527, 39.7036], zoom: 7.0 },
		'宮城': { center: [140.8719, 38.2682], zoom: 8.0 },
		'秋田': { center: [140.1024, 39.7186], zoom: 7.5 },
		'山形': { center: [140.3633, 38.2404], zoom: 8.0 },
		'福島': { center: [140.4677, 37.7500], zoom: 7.5 },
		'茨城': { center: [140.4467, 36.3414], zoom: 8.0 },
		'栃木': { center: [139.8837, 36.5658], zoom: 8.5 },
		'群馬': { center: [139.0608, 36.3911], zoom: 8.5 },
		'埼玉': { center: [139.6489, 35.8617], zoom: 9.0 },
		'千葉': { center: [140.1233, 35.6049], zoom: 8.5 },
		'東京': { center: [139.6917, 35.6895], zoom: 9.5 },
		'神奈川': { center: [139.6425, 35.4478], zoom: 9.0 },
		'新潟': { center: [139.0235, 37.9026], zoom: 7.0 },
		'富山': { center: [137.2114, 36.6959], zoom: 8.5 },
		'石川': { center: [136.6256, 36.5944], zoom: 8.0 },
		'福井': { center: [136.2217, 35.9432], zoom: 8.5 },
		'山梨': { center: [138.5684, 35.6642], zoom: 8.5 },
		'長野': { center: [138.1811, 36.2048], zoom: 7.5 },
		'岐阜': { center: [137.2110, 35.3912], zoom: 7.5 },
		'静岡': { center: [138.3833, 34.9769], zoom: 8.0 },
		'愛知': { center: [137.1805, 35.1803], zoom: 8.5 },
		'三重': { center: [136.5086, 34.7302], zoom: 8.0 },
		'滋賀': { center: [136.1018, 35.0045], zoom: 9.0 },
		'京都': { center: [135.7681, 35.0116], zoom: 8.5 },
		'大阪': { center: [135.5200, 34.6937], zoom: 9.5 },
		'兵庫': { center: [134.6900, 34.6913], zoom: 8.0 },
		'奈良': { center: [135.8327, 34.6851], zoom: 9.0 },
		'和歌山': { center: [135.1675, 34.2261], zoom: 8.0 },
		'鳥取': { center: [134.2324, 35.5038], zoom: 8.5 },
		'島根': { center: [132.5564, 35.4725], zoom: 7.5 },
		'岡山': { center: [133.9348, 34.6617], zoom: 8.5 },
		'広島': { center: [132.4596, 34.3963], zoom: 8.0 },
		'山口': { center: [131.4706, 34.3859], zoom: 7.5 },
		'徳島': { center: [134.5593, 34.0658], zoom: 8.5 },
		'香川': { center: [134.0434, 34.3401], zoom: 9.5 },
		'愛媛': { center: [132.7661, 33.8416], zoom: 8.0 },
		'高知': { center: [133.5311, 33.5597], zoom: 7.5 },
		'福岡': { center: [130.4017, 33.6064], zoom: 8.5 },
		'佐賀': { center: [130.2985, 33.2494], zoom: 9.0 },
		'長崎': { center: [129.8737, 32.7503], zoom: 7.5 },
		'熊本': { center: [130.7417, 32.7898], zoom: 8.0 },
		'大分': { center: [131.6127, 33.2382], zoom: 8.0 },
		'宮崎': { center: [131.4214, 32.0106], zoom: 8.0 },
		'鹿児島': { center: [130.5581, 31.5602], zoom: 7.0 },
		'沖縄': { center: [127.6792, 26.2124], zoom: 7.0 },
		'その他': { center: [139.98886293394258, 35.853556991089334], zoom: 8.7 }
	};

	// ローディング表示/非表示の関数を追加
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

	// 初期状態でローディングを表示
	showLoading();

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

		// 都道府県境界データを追加する関数
		async function addPrefectureBoundaries() {
			try {
				// 都道府県境界のGeoJSONデータを取得
				const response = await fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson');
				const prefectureData = await response.json();
				
				// ソースとして都道府県データを追加
				map.addSource('prefecture-boundaries', {
					'type': 'geojson',
					'data': prefectureData
				});
				
				// 都道府県境界線レイヤーを追加（全体）
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
				
				// ハイライト用の塗りつぶしレイヤーを追加
				map.addLayer({
					'id': 'prefecture-highlight-fill',
					'type': 'fill',
					'source': 'prefecture-boundaries',
					'layout': {},
					'paint': {
						'fill-color': '#007bff',
						'fill-opacity': 0.1
					},
					'filter': ['==', 'name_ja', ''] // 初期状態では何も表示しない
				});
				
				// ハイライト用の境界線レイヤーを追加
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
					'filter': ['==', 'name_ja', ''] // 初期状態では何も表示しない
				});
				
			} catch (error) {
				console.error('都道府県境界データの読み込みに失敗しました:', error);
			}
		}
		
		// 展開された都道府県をハイライトする関数
		function updatePrefectureHighlight() {
			if (!map.getSource('prefecture-boundaries')) return;
			
			// 展開されている都道府県名の配列を作成
			const expandedPrefectureNames = Array.from(expandedPrefectures);
			
			if (expandedPrefectureNames.length > 0) {
				// 複数の都道府県をハイライトするフィルターを作成
				let filter;
				if (expandedPrefectureNames.length === 1) {
					filter = ['==', 'name_ja', expandedPrefectureNames[0]];
				} else {
					filter = ['in', 'name_ja', ...expandedPrefectureNames];
				}
				
				// ハイライトレイヤーのフィルターを更新
				map.setFilter('prefecture-highlight-fill', filter);
				map.setFilter('prefecture-highlight-border', filter);
			} else {
				// ハイライトを非表示
				map.setFilter('prefecture-highlight-fill', ['==', 'name_ja', '']);
				map.setFilter('prefecture-highlight-border', ['==', 'name_ja', '']);
			}
		}

		// updatePrefectureHighlight関数をグローバルスコープで使用できるようにする
		window.updatePrefectureHighlight = updatePrefectureHighlight;

		// 現在地から都道府県を判定する関数（拡張版）
		function getCurrentLocationPrefecture(lat, lon) {
			// より詳細な座標による都道府県判定
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

		// 現在地を取得して表示する関数
		function showCurrentLocation() {
			if (!navigator.geolocation) {
				console.log('このブラウザは位置情報サービスをサポートしていません。');
				// 位置情報が取得できない場合でもマーカーリストを表示
				showMarkerList(allRows);
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

			// 都道府県境界を追加
			addPrefectureBoundaries();

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
							// expandedPrefectures の状態を保持したまま一覧表示
							showMarkerList(allRows);
							
							// 地図のビューを適切に調整
							if (expandedPrefectures.size > 0) {
								// 展開されている都道府県（現在は最大1つ）の中心に移動
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
								// 展開されている都道府県がない場合
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

	// 都道府県を抽出する関数を拡張
	function extractPrefecture(fieldName, nearestStation, category) {
		// categoryの数字から都道府県を判定（READMEの仕様に基づく）
		const prefectureMap = {
			'0': '東京',
			'1': '千葉', 
			'2': '茨城',
			'3': '埼玉',
			'4': '神奈川',
			'5': '栃木',
			'6': '群馬',
			'7': '静岡',
			'8': '愛知',
			'9': '大阪',
			'10': '兵庫',
			'11': '京都',
			'12': '福岡',
			'13': '北海道',
			'14': '青森',
			'15': '岩手',
			'16': '宮城',
			'17': '秋田',
			'18': '山形',
			'19': '福島',
			'20': '新潟',
			'21': '富山',
			'22': '石川',
			'23': '福井',
			'24': '山梨',
			'25': '長野',
			'26': '岐阜',
			'27': '三重',
			'28': '滋賀',
			'29': '奈良',
			'30': '和歌山',
			'31': '鳥取',
			'32': '島根',
			'33': '岡山',
			'34': '広島',
			'35': '山口',
			'36': '徳島',
			'37': '香川',
			'38': '愛媛',
			'39': '高知',
			'40': '佐賀',
			'41': '長崎',
			'42': '熊本',
			'43': '大分',
			'44': '宮崎',
			'45': '鹿児島',
			'46': '沖縄'
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
		
		// ローディングを非表示にする
		hideLoading();
		
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
		
		// 都道府県順に並べ替え（47都道府県 + その他）
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
					// 他の都道府県をすべて閉じる
					expandedPrefectures.forEach(openPrefecture => {
						if (openPrefecture !== prefecture) {
							const otherFieldsList = leftPanel.querySelector(`.prefecture-fields[data-prefecture="${openPrefecture}"]`);
							const otherToggleIcon = leftPanel.querySelector(`[data-prefecture="${openPrefecture}"] .toggle-icon`);
							if (otherFieldsList) otherFieldsList.style.display = 'none';
							if (otherToggleIcon) otherToggleIcon.textContent = '+';
						}
					});
					
					// expandedPrefecturesをクリアして現在の都道府県のみ追加
					expandedPrefectures.clear();
					expandedPrefectures.add(prefecture);
					
					// 現在クリックした都道府県を展開
					fieldsList.style.display = 'block';
					toggleIcon.textContent = '-';
					
					// 都道府県を展開したときに地図の中心とズームを調整
					const prefectureConfig = prefectureCenterZoom[prefecture];
					if (prefectureConfig) {
						map.flyTo({
							center: prefectureConfig.center,
							zoom: prefectureConfig.zoom,
							duration: 1000
						});
					}
				} else {
					// 現在の都道府県を閉じる
					fieldsList.style.display = 'none';
					toggleIcon.textContent = '+';
					expandedPrefectures.delete(prefecture);
					
					// 都道府県を閉じたときの処理
					if (expandedPrefectures.size === 0) {
						// 現在地がある場合は現在地を中心に表示
						if (currentLocationMarker) {
							const currentLngLat = currentLocationMarker.getLngLat();
							map.flyTo({
								center: [currentLngLat.lng, currentLngLat.lat],
								zoom: 11,
								duration: 1000
							});
						} else {
							// 現在地がない場合はデフォルト位置
							map.flyTo({
								center: [139.98886293394258, 35.853556991089334],
								zoom: 8.7,
								duration: 1000
							});
						}
					}
				}
				
				// トグル状態変更時にマーカーの表示を更新
				updateMarkerVisibilityByToggle();
				
				// 都道府県のハイライトを更新
				if (window.updatePrefectureHighlight) {
					window.updatePrefectureHighlight();
				}
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
		
		// 都道府県のハイライトを更新
		if (window.updatePrefectureHighlight) {
			window.updatePrefectureHighlight();
		}
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
// 		let isDragging = false;
// 		let startMouseX = 0;
		
// 		modal.addEventListener('mousedown', function(e) {
// 			isDragging = true;
// 			startMouseX = e.clientX;
// 		});
		
// 		modal.addEventListener('mousemove', function(e) {
// 			if (!isDragging) return;
// 			e.preventDefault();
// 		});
		
// 		modal.addEventListener('mouseup', function(e) {
// 			if (!isDragging) return;
// 			isDragging = false;
			
// 			const diffX = startMouseX - e.clientX;
			
// 			// 50px以上のドラッグで反応
// 			if (Math.abs(diffX) > 50) {
// 				if (diffX > 0) {
// 					// 左ドラッグ（次の画像）
// 					changeExpandedSlide(1);
// 				} else {
// 					// 右ドラッグ（前の画像）
// 					changeExpandedSlide(-1);
// 				}
// 			}
// 		});
		
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