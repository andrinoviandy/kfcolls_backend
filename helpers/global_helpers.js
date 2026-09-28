const jwt = require('jsonwebtoken')
const path = require('path');

exports.encodedJwt = async (data) => {
	const result = await jwt.sign(data, process.env.COSTRACK_SALT, { algorithm: 'HS256' })
	return result
}
exports.statusUpdate = async (status) => {
	const updated = status[0] == 1 ? true : false
	return {
		status: updated,
		message: updated ? "Success" : "Failed"
	}
}

exports.isNotEmpty = (data) => {
	let result = true
	switch (result) {
		case data == '':
			// console.log("string")
			result = false
			break;
		case data == undefined:
			result = false
			// console.log(data, result, "undefined, result false <<<<<<<<<<<<")
			break;
		case data == null:
			// console.log("null")
			result = false
			break;
		case Array.isArray(data) && data.length == 0:
			// console.log("array")
			result = false
			break;
		case typeof data === 'object' && Object.entries(data).length == 0:
			// console.log("object")
			result = false
			break;
		case typeof data === 'number' && isNaN(data):
			// console.log("NaN")
			result = false
			break;
	}

	return result
}

exports.getTypeByStatus = async (status) => {
	switch (status) {
		case '001':
		case '002':
		case '003':
		case '004':
		case '005':
			return '01'
		default:
			return null
	}
}

exports.validasiFileSize = async (size) => {
	const allowSize = (size / 1024 / 1024).toFixed(2);
	if (allowSize <= 50) {
		return true;
	} else {
		return false
	}
}

exports.validasiFormatFile = async (ext) => {
	if (ext == '.docx' || ext == '.pdf' || ext == '.xlsx' || ext == '.xls' || ext == '.png' || ext == 'jpg' || ext == 'jpeg' || ext == 'svg') {
		return true
	} else {
		return false
	}
}

exports.validasiFile = async (files) => {
	for (const file of files) {
		const size = file.size
		const format = path.extname(file.name).toLowerCase()

		if (await this.validasiFileSize(size)) {
			const validasiFormatFile = await this.validasiFormatFile(format)
			if (!validasiFormatFile) {
				return {
					valid: false,
					data: {
						code: '02',
						message: 'Format File Tidak Diizinkan',
						data: []
					}
				}
			}
		} else {
			return {
				valid: false,
				data: {
					code: '02',
					message: 'Ukuran File Melebihi 50 MB',
					data: []
				}
			}
		}
	}
}

exports.processUpdate = async (result) => {
	if (result == 1) return "Sukses Update"
	else return "Gagal Update"
}

exports.processDelete = async (result) => {
	if (result == 1) return "Sukses Delete"
	else return "Gagal Delete"
}

exports.getDataUser = async (dataUser) => {
	const { HAKAKSES, HAKAKSES_DESC } = dataUser
	const hak_akses = HAKAKSES.split(',')
	const hak_akses_desc = HAKAKSES_DESC.split(',')
	const result = []

	for (let i = 0; i < hak_akses.length; i++) {
		const data = hak_akses[i];
		const uraian = hak_akses_desc[i]
		result.push({
			kode: data,
			uraian: uraian
		})
	}

	return {
		result,
		HAKAKSES: HAKAKSES.split(','),
		HAKAKSES_DESC: HAKAKSES_DESC.split(',')
	}
}

exports.parseUserError = (error) => {
	const message = error?.message || '';

	if (message.includes('ORA-00001')) {
		return 'Data sudah ada, tidak boleh duplikat.';
	}

	if (message.includes('ORA-00936')) {
		return 'Terjadi kesalahan saat menyimpan data. Silakan periksa kembali input Anda.';
	}

	if (message.includes('ORA-12899')) {
		return 'Panjang karakter melebihi batas. Silakan periksa kembali input.';
	}

	if (message.includes('ORA-02291')) {
		return 'Data yang dirujuk tidak ditemukan. Pastikan data relasi sudah ada.';
	}

	if (message.includes('ORA-01400')) {
		return 'Silakan periksa kembali inputan.';
	}

	// Default fallback
	return 'Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.';
}

exports.formatCurrency = (value, dec = 2, useCurrency = true) => {
	if (value === null || value === undefined) {
		return value;
	}
	// Konfigurasi untuk format angka
	const options = {
		maximumFractionDigits: dec,
		minimumFractionDigits: dec,
		...(useCurrency && { style: 'currency', currency: 'IDR' }) // Sertakan style dan currency hanya jika useCurrency true
	};

	// Menggunakan Intl.NumberFormat dengan opsi yang dinamis
	const formattedValue = new Intl.NumberFormat('id-ID', options).format(value);

	return formattedValue;
};

exports.terbilangRupiah = (angka) => {
	const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

	function terbilang(n) {
		n = Math.floor(n);
		if (n < 12) return satuan[n];
		else if (n < 20) return terbilang(n - 10) + " Belas";
		else if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
		else if (n < 200) return "Seratus " + terbilang(n - 100);
		else if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
		else if (n < 2000) return "Seribu " + terbilang(n - 1000);
		else if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
		else if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
		else if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + " Miliar " + terbilang(n % 1000000000);
		else if (n < 1000000000000000) return terbilang(Math.floor(n / 1000000000000)) + " Triliun " + terbilang(n % 1000000000000);
		else return "Angka terlalu besar";
	}

	const hasil = terbilang(angka).replace(/\s+/g, ' ').trim();
	return hasil + " Rupiah";
}

exports.getAlphabetIndex = (i) => {
	return String.fromCharCode(97 + i);
}

exports.formatDate = (date = new Date()) => {
	const pad = (n) => (n < 10 ? "0" + n : n);

	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1); // bulan dimulai dari 0
	const year = date.getFullYear();

	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());

	return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

exports.formatSummaryData = (result) => {
	// Urutan SPUC yang diinginkan
	const spucOrder = ['CTDS', 'ETDS', 'LHDS', 'MPDS', 'MTDS'];

	const formatData = (data) => {
		// Jika data kosong, return array kosong
		if (!data || data.length === 0) {
			return spucOrder.map(spuc => ({
				spuc: spuc,
				planning: { revenue: 0, beban: 0, margin: 0, laba: 0 },
				realisasi: { lop: 0, nonLop: 0, jumlah: 0, beban: 0, margin: 0, laba: 0 },
				deviasi: { revenue: 0, beban: 0, margin: 0, laba: 0 }
			}));
		}

		// Buat map dari hasil query
		const spucMap = {};
		data.forEach(item => {
			if (item.KD_SPUC) {
				spucMap[item.KD_SPUC] = {
					planning: {
						revenue: parseFloat(item.T_REVENUE_P) || 0,
						beban: parseFloat(item.T_BEBAN_P) || 0,
						margin: parseFloat(item.T_MARGIN_P) || 0,
						laba: parseFloat(item.T_LABA_P) || 0
					},
					realisasi: {
						lop: parseFloat(item.T_REVENUE_RY) || 0,
						nonLop: parseFloat(item.T_REVENUE_RN) || 0,
						jumlah: parseFloat(item.T_REVENUE_R) || 0,
						beban: parseFloat(item.T_BEBAN_R) || 0,
						margin: parseFloat(item.T_MARGIN_R) || 0,
						laba: parseFloat(item.T_LABA_R) || 0
					},
					deviasi: {
						revenue: parseFloat(item.T_REVENUE_D) || 0,
						beban: parseFloat(item.T_BEBAN_D) || 0,
						margin: parseFloat(item.T_MARGIN_D) || 0,
						laba: parseFloat(item.T_LABA_D) || 0
					}
				};
			}
		});

		// Return dalam urutan yang ditentukan
		return spucOrder.map(spuc => ({
			spuc: spuc,
			...(spucMap[spuc] || {
				planning: { revenue: 0, beban: 0, margin: 0, laba: 0 },
				realisasi: { lop: 0, nonLop: 0, jumlah: 0, beban: 0, margin: 0, laba: 0 },
				deviasi: { revenue: 0, beban: 0, margin: 0, laba: 0 }
			})
		}));
	};

	// Pastikan semua data ada (bahkan jika kosong)
	return {
		mtd: formatData(result.mtd || []),
		ytd: formatData(result.ytd || []),
		ytd_cumulative: formatData(result.ytd_cumulative || []) // Tambahkan ytd_cumulative
	};
};

exports.parseFloatOrNull = (value) => {
	if (value === '' || value === undefined || value === null) {
		return null
	}

	return Number(value)
}

exports.convertMonthYear = async (value = "") => {
	if (!value) return null;

	const monthMap = {
		jan: "01",
		feb: "02",
		mar: "03",
		apr: "04",
		may: "05",
		jun: "06",
		jul: "07",
		aug: "08",
		sep: "09",
		oct: "10",
		nov: "11",
		dec: "12",
	};

	const [month, year] = String(value).trim().split("-");

	if (!month || !year) {
		return null;
	}

	const monthNumber = monthMap[month.toLowerCase()];

	if (!monthNumber) {
		return null;
	}

	const fullYear = Number(year) < 100 ? `20${year}` : year;

	return `${fullYear}-${monthNumber}`;
};