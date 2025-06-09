// -------------------------------------------- //
// FieldList.csvの読み込み                       //
// -------------------------------------------- //

const csvFileName = 'FieldList.csv';
let data = {};

async function fetchCSV() {
	console.log('Fetching CSV:', csvFileName);
	try {
		const response = await fetch(csvFileName);
		if (!response.ok) {
			throw new Error('Failed to fetch CSV');
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
	const result = await fetchCSV();

	if (result !== null) {
		data['FieldList'] = result;
		console.log('Data object:', data);

		// Wait for both DOM and data to be ready
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', init);
		} else {
			init();
		}
	} else {
		console.log('Failed to fetch data from FieldList.csv.');
	}
}

// ...existing code...
checkAndInit();
