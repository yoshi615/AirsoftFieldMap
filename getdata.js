// -------------------------------------------- //
// FieldList.csvの読み込み                       //
// -------------------------------------------- //

const csvFileNames = ['FieldList.csv', 'NearestStation.csv'];
let data = {};

async function fetchCSV(fileName) {
	console.log('Fetching CSV:', fileName);
	try {
		const response = await fetch(fileName);
		if (!response.ok) {
			throw new Error('Failed to fetch CSV: ' + fileName);
		}
		const text = await response.text();
		const rows = text.trim().split('\n').map(row => row.split(','));
		// 最初の行（ヘッダー）を削除
		rows.shift();
		return rows;
	} catch (error) {
		console.error('Error fetching CSV:', error);
		return null;
	}
}

async function checkAndInit() {
	const [fieldList, nearestStation] = await Promise.all([
		fetchCSV('FieldList.csv'),
		fetchCSV('NearestStation.csv')
	]);

	let success = true;
	if (fieldList !== null) {
		data['FieldList'] = fieldList;
	} else {
		console.log('Failed to fetch data from FieldList.csv.');
		success = false;
	}
	if (nearestStation !== null) {
		data['NearestStation'] = nearestStation;
	} else {
		console.log('Failed to fetch data from NearestStation.csv.');
		success = false;
	}

	console.log('Data object:', data);

	// Wait for both DOM and data to be ready
	if (success) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', init);
		} else {
			init();
		}
	}
}

// ...existing code...
checkAndInit();
