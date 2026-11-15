const serviceIntegrasi = require('./services')
const db = require('../../config/database/database')
const { validasiFile, validasiFileSize, validasiFormatFile, getDataUser, parseUserError, formatSummaryData, formatDate, formatCurrency } = require('../../helpers/global_helpers')
const { statusCode, successMessage, errorMessage } = require('../../helpers/status')
const { v4: uuidv4 } = require('uuid');
const moment = require('moment')
const { encodedJwt } = require('../user/services')
const model = require('../../config/model')
const pm2 = require('pm2')
const ExcelJS = require('exceljs');
const { default: puppeteer } = require('puppeteer');
const fs = require('fs');

exports.getDataSales = async () => {
    try {
        const payload = {
            entitas: 'dwh',
            modul: 'get_sales',
            method: 'post',
            posting_date: '2026-10-01'
            // posting_date: moment().subtract(1, 'days').format('YYYY-MM-DD')
        }

        const config = await serviceIntegrasi.checkConfig(payload)
        
        if (config > 0) {
            const result = await serviceIntegrasi.getDataSales(payload)
            // res.status(statusCode.success).json(successMessage(result))
        } else {
            // res.status(statusCode.error).json(errorMessage('Tidak Ada Konfigurasi'))
        }
    } catch (error) {
        console.log(error)
        // res.status(statusCode.error).json(errorMessage(error))
    }
}

// exports.getDataSales = async () => {
//     try {
//         const startDate = moment('2026-11-01');
//         const endDate = moment('2026-11-07');

//         for (
//             let date = startDate.clone();
//             date.isSameOrBefore(endDate, 'day');
//             date.add(1, 'day')
//         ) {
//             const postingDate = date.format('YYYY-MM-DD');

//             console.log(`Proses get sales tanggal: ${postingDate}`);

//             const payload = {
//                 entitas: 'dwh',
//                 modul: 'get_sales',
//                 method: 'post',
//                 posting_date: postingDate
//             };

//             const config = await serviceIntegrasi.checkConfig(payload);

//             if (config > 0) {
//                 const result = await serviceIntegrasi.getDataSales(payload);

//                 console.log(`Berhasil: ${postingDate}`, result);
//             } else {
//                 console.log(`Tidak ada konfigurasi: ${postingDate}`);
//             }
//         }

//         console.log('Proses get sales Oktober 2026 selesai');

//     } catch (error) {
//         console.log(error);
//     }
// };