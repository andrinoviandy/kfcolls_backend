const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const stripHexPrefix = require('strip-hex-prefix')
const moment = require('moment')
const path = require('path')
const db = require('../../config/database/database')
const model = require('../../config/model')
const query = require('./raw_query')
const helpers = require('../../helpers/global_helpers')
const sequelize = require('../../config/database/database');
const chmodr = require('chmodr');
const axios = require('axios');
const { log, error } = require('console');
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");
const FormData = require("form-data");
const { randomBytes } = require('crypto');
const { autoCommit } = require('oracledb');
const { A_LOP_DETAIL } = require('../../config/model/kfcolls/kfcolls');
const ExcelJS = require('exceljs');
const fsPromises = require('fs/promises');
const { Op, fn, col, where, Sequelize } = require("sequelize");
const { PDFDocument } = require('pdf-lib');
const { title } = require('process');
const XLSX = require('xlsx');
const { Worker } = require('worker_threads');
// const LINK_QRCODE = process.env.URL_QRCODE
const LINK_QRCODE = 'https://kfcolls.kftd.co.id/validasi-approval'

exports.uploadFile = async (lampiran, path_upload, file_name) => {
    const full_path = path.join(path_upload, file_name);

    try {
        // Pastikan directory tersedia
        await fs.promises.mkdir(path_upload, {
            recursive: true
        });

        // Kalau file sudah ada, hapus dulu
        if (fs.existsSync(full_path)) {
            await fs.promises.unlink(full_path);
        }

        // Upload/move file
        await new Promise((resolve, reject) => {
            lampiran.mv(full_path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        return full_path;

    } catch (error) {
        console.error('Upload file error:', error);
        throw error;
    }
};

exports.processUploadFile = async (data, files, transaction) => {
    const result = []
    for (const lampiran of files) {
        const name = lampiran.name
        const ext = path.extname(name).toLowerCase()
        const timestamp = moment().format('YYYYMMDD_HHmmss');
        const uniqueId = uuidv4();
        const file_name = name.replace(ext, '') + ' (' + timestamp + '_' + uniqueId + ')' + ext;
        const _date = moment().local('id');
        const _months = Number(_date.format("MM"));

        const path_upload = "files" + '/' + `${_date.year()}/${_months}/${_date.date()}/`;

        const full_path = await this.uploadFile(lampiran, path_upload, file_name)
        result.push({ path: full_path, name: name })
    }
    return result
}

exports.insertNotifikasi = async (payload, transaction) => {
    const insertNotif = await model.d_notifikasi.create(payload, { transaction })
    if (payload?.user && payload?.user?.length > 0) {
        for (const item of payload?.user) {
            const payPush = {
                notifikasi_push_id: uuidv4(),
                notifikasi_id: payload?.notifikasi_id,
                user_id: item
            }
            const insertNotifPush = await model.d_notifikasi_push.create(payPush, { transaction })
        }
    }

    return insertNotif
}

exports.insertNotifikasiPush = async (payload, transaction) => {
    if (payload?.user && payload?.user?.length > 0) {
        for (const item of payload?.user) {
            const payPush = {
                notifikasi_push_id: uuidv4(),
                notifikasi_id: payload?.notifikasi_id,
                user_id: item
            }
            const insertNotifPush = await model.d_notifikasi_push.create(payPush, { transaction })
        }
    }
}

exports.getReferensiByJenis = async (jns_ref, keyword) => {
    let condition = ``;
    // if (jns_ref === 'jenis_biaya_id' || jns_ref === 'jabatan_id') {
    //     if (cabang_id === '2000') {
    //         if (role_id !== 'RL00') {
    //             condition = ` AND a.sub_kd_ref = 'KP' `
    //         }
    //     } else {
    //         if (role_id !== 'RL00') {
    //             condition = ` AND a.sub_kd_ref = 'KC' `
    //         }
    //     }
    // }
    const QUERY = query.getReferensiByJenis
        .replace(/:condition/g, condition)

    const bind = {
        jns_ref: jns_ref,
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`
    }

    const result = await db.query(QUERY, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getSubReferensiByJenis = async ({ jns_ref, kd_ref, keyword }) => {
    let condition = ``
    if (kd_ref) {
        condition += ` AND a.sub_kd_ref = '${kd_ref}' `
    }
    const QUERY = query.getSubReferensiByJenis
        .replace(/:condition/g, condition)
    const result = await db.query(QUERY, {
        replacements: { jns_ref, condition, keyword: `%${keyword}%` },
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    return result
}

exports.getReferensiByJenisGroup = async (keyword) => {
    let condition = ``;
    const QUERY = query.getReferensiByJenisGroup
    const bind = {
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`
    }

    const result = await db.query(QUERY, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.insertPenjualanArray = async (payload, transaction) => {
    const result = {
        total_data: payload.length,
        total_success: 0,
        total_error: 0,
        data_error: []
    };
    if (!payload.length) {
        return result;
    }
    try {
        const createdAt = new Date();
        const dataInsert = payload.map((item) => ({
            penjualan_id: item?.penjualan_id,
            sales_office: item?.sales_office,
            desc_s_office: item?.desc_s_office,
            posting_date: item?.posting_date,
            billing_no: item?.billing_no,
            posting_status: item?.posting_status,
            bill_cancel: item?.bill_cancel,
            bill_to_party: item?.bill_to_party,
            name_bill_to: item?.name_bill_to,
            address: item?.address,
            material: item?.material,
            material_group_1: item?.material_group_1,
            desc_material_group_1: item?.desc_material_group_1,
            text_material: item?.text_material,
            quantity: item?.quantity,
            sales_unit: item?.sales_unit,
            unit_price_penjualan: item?.unit_price_penjualan,
            dis_pct_zd01: item?.dis_pct_zd01,
            dis_amt_zd01: item?.dis_amt_zd01,
            dis_pct_zd02: item?.dis_pct_zd02,
            dis_amt_zd02: item?.dis_amt_zd02,
            dis_pct_zd03: item?.dis_pct_zd03,
            dis_amt_zd03: item?.dis_amt_zd03,
            dis_pct_zd04: item?.dis_pct_zd04,
            dis_amt_zd04: item?.dis_amt_zd04,
            dis_pct_zd05: item?.dis_pct_zd05,
            dis_amt_zd05: item?.dis_amt_zd05,
            dis_pct_zd06: item?.dis_pct_zd06,
            dis_amt_zd06: item?.dis_amt_zd06,
            disc_upfront_pct_zd07: item?.disc_upfront_pct_zd07,
            disc_upfront_amt_zd07: item?.disc_upfront_amt_zd07,
            disc_beban_kftd_upf_pct_zd08: item?.disc_beban_kftd_upf_pct_zd08,
            disc_beban_kftd_upf_amt_zd08: item?.disc_beban_kftd_upf_amt_zd08,
            disc_beban_principle_upf_pct_zd09: item?.disc_beban_principle_upf_pct_zd09,
            disc_beban_principle_upf_amt_zd09: item?.disc_beban_principle_upf_amt_zd09,
            disc_pengembalian_upf_pct_zd10: item?.disc_pengembalian_upf_pct_zd10,
            disc_pengembalian_upf_amt_zd10: item?.disc_pengembalian_upf_amt_zd10,
            dis_pct_zd12: item?.dis_pct_zd12,
            dis_amt_zd12: item?.dis_amt_zd12,
            dis_pct_zd14: item?.dis_pct_zd14,
            dis_amt_zd14: item?.dis_amt_zd14,
            dis_pct_zd15: item?.dis_pct_zd15,
            dis_amt_zd15: item?.dis_amt_zd15,
            total_discount: item?.total_discount,
            total_penjualan: item?.total_penjualan,
            tax_amount: item?.tax_amount,
            total_cogs: item?.total_cogs,
            unit_price_pembelian: item?.unit_price_pembelian,
            bill_qty_in_sku: item?.bill_qty_in_sku,
            uom_sku: item?.uom_sku,
            code_pelayanan: item?.code_pelayanan,
            dec_pelayanan: item?.dec_pelayanan,
            prod_hierarchy3: item?.prod_hierarchy3,
            principle: item?.principle,
            name_principle: item?.name_principle,
            desc_cust_grp4: item?.desc_cust_grp4,
            salesman: item?.salesman,
            name_salesman: item?.name_salesman,
            po_number: item?.po_number,
            quotation_number: item?.quotation_number,
            is_upload: item?.is_upload ?? 1,
            created_by: item?.created_by || null,
            created_at: createdAt
        }));
        await model.d_penjualan.bulkCreate(dataInsert, {
            transaction,
            validate: false,
            returning: false
        });
        result.total_success = dataInsert.length;
        return result;
    } catch (error) {
        console.error('ERROR BULK INSERT D_PENJUALAN:', error);
        throw error;
    }
};

exports.insertDataPiutang = async (
    penjualanIds,
    createdBy,
    transaction
) => {
    if (!penjualanIds?.length) {
        return {
            total_data: 0,
            total_success: 0
        };
    }
    const piutangRows = await db.query(
        query.getUploadedDataPiutang,
        {
            replacements: {
                penjualan_ids: penjualanIds
            },
            type: db.QueryTypes.SELECT,
            transaction
        }
    );
    const createdAt = new Date();
    const batchSize = 500;
    let totalSuccess = 0;
    for (
        let batchStart = 0;
        batchStart < piutangRows.length;
        batchStart += batchSize
    ) {
        const batchRows = piutangRows.slice(
            batchStart,
            batchStart + batchSize
        );
        const dataInsert = batchRows.map((item) => ({
            piutang_id: uuidv4(),
            no_faktur: item.billing_no,
            no_billing: item.billing_no,
            document_type: item.document_type,
            customer: item.bill_to_party,
            sales: item.salesman,
            nama_sales: item.name_salesman,
            cabang: item.sales_office,
            posting_date: item.posting_date,
            jatuh_tempo: item.jatuh_tempo,
            dpp: item.dpp,
            ppn: item.ppn,
            pph: item.pph,
            aging: item.aging,
            status_piutang: item.status_piutang,
            created_by: createdBy || null,
            created_at: createdAt
        }));
        await model.d_piutang.bulkCreate(dataInsert, {
            transaction,
            validate: false,
            returning: false
        });
        totalSuccess += dataInsert.length;
    }
    return {
        total_data: piutangRows.length,
        total_success: totalSuccess
    };
};

exports.uploadPenjualanExcel = async (file, createdBy, transaction) => {
    if (!file || !file.name) {
        throw new Error('File Excel wajib diunggah.');
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
        throw new Error('Format file harus .xlsx atau .xls.');
    }

    if (!file.tempFilePath) {
        throw new Error(
            'File sementara tidak ditemukan. Pastikan express-fileupload menggunakan useTempFiles: true.'
        );
    }

    const columnMap = {
        sales_office: 'Sales Office',
        desc_s_office: 'Desc. S.Office',
        posting_date: 'Posting Date',
        billing_no: 'Billing No',
        posting_status: 'Posting Status',
        bill_cancel: 'Bill.Cancel',
        bill_to_party: 'Bill to party',
        name_bill_to: 'Name Bill to',
        address: 'Address',
        material: 'Material',
        material_group_1: 'Material Group 1',
        desc_material_group_1: 'Desc Material Group 1',
        text_material: 'Text Material',
        quantity: 'Quantity',
        sales_unit: 'Sales Unit',
        unit_price_penjualan: 'Unit Price Penjualan',
        dis_pct_zd01: 'Dis% (ZD01)',
        dis_amt_zd01: 'DisAmt (ZD01)',
        dis_pct_zd02: 'Dis% (ZD02)',
        dis_amt_zd02: 'DisAmt (ZD02)',
        dis_pct_zd03: 'Dis% (ZD03)',
        dis_amt_zd03: 'DisAmt (ZD03)',
        dis_pct_zd04: 'Dis% (ZD04)',
        dis_amt_zd04: 'DisAmt (ZD04)',
        dis_pct_zd05: 'Dis% (ZD05)',
        dis_amt_zd05: 'DisAmt (ZD05)',
        dis_pct_zd06: 'Dis% (ZD06)',
        dis_amt_zd06: 'DisAmt (ZD06)',
        disc_upfront_pct_zd07: 'Disc. Upfront % (ZD07)',
        disc_upfront_amt_zd07: 'Disc. Upfront Amt (ZD07)',
        disc_beban_kftd_upf_pct_zd08: 'Disc. Beban KFTD Upf % (ZD08)',
        disc_beban_kftd_upf_amt_zd08: 'Disc. Beban KFTD Upf Amt (ZD08)',
        disc_beban_principle_upf_pct_zd09: 'Disc. Beban Principle Upf % (ZD09)',
        disc_beban_principle_upf_amt_zd09: 'Disc. Beban Principle Upf Amt (ZD09)',
        disc_pengembalian_upf_pct_zd10: 'Disc. Pengembalian Upf % (ZD10)',
        disc_pengembalian_upf_amt_zd10: 'Disc. Pengembalian Upf Amt (ZD10)',
        dis_pct_zd12: 'Dis% (ZD12)',
        dis_amt_zd12: 'DisAmt (ZD12)',
        dis_pct_zd14: 'Dis% (ZD14)',
        dis_amt_zd14: 'DisAmt (ZD14)',
        dis_pct_zd15: 'Dis% (ZD15)',
        dis_amt_zd15: 'DisAmt (ZD15)',
        total_discount: 'Total Discount',
        total_penjualan: 'Total Penjualan',
        tax_amount: 'Tax Amount',
        total_cogs: 'Total COGS',
        unit_price_pembelian: 'Unit Price Pembelian',
        bill_qty_in_sku: 'Bill Qty in SKU',
        uom_sku: 'UoM SKU',
        code_pelayanan: 'Code Pelayanan',
        dec_pelayanan: 'Dec. Pelayanan',
        prod_hierarchy3: 'Prod. Hierarchy3',
        principle: 'Principle',
        name_principle: 'Name Principle',
        desc_cust_grp4: 'Desc. Cust. Grp4',
        salesman: 'Salesman',
        name_salesman: 'Name Salesman',
        po_number: 'PO Number',
        quotation_number: 'Quotation Number',
    };

    const normalizeHeader = (value) =>
        String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

    const numericFields = new Set([
        'quantity',
        'unit_price_penjualan',
        'dis_pct_zd01', 'dis_amt_zd01',
        'dis_pct_zd02', 'dis_amt_zd02',
        'dis_pct_zd03', 'dis_amt_zd03',
        'dis_pct_zd04', 'dis_amt_zd04',
        'dis_pct_zd05', 'dis_amt_zd05',
        'dis_pct_zd06', 'dis_amt_zd06',
        'disc_upfront_pct_zd07',
        'disc_upfront_amt_zd07',
        'disc_beban_kftd_upf_pct_zd08',
        'disc_beban_kftd_upf_amt_zd08',
        'disc_beban_principle_upf_pct_zd09',
        'disc_beban_principle_upf_amt_zd09',
        'disc_pengembalian_upf_pct_zd10',
        'disc_pengembalian_upf_amt_zd10',
        'dis_pct_zd12', 'dis_amt_zd12',
        'dis_pct_zd14', 'dis_amt_zd14',
        'dis_pct_zd15', 'dis_amt_zd15',
        'total_discount',
        'total_penjualan',
        'tax_amount',
        'total_cogs',
        'unit_price_pembelian',
        'bill_qty_in_sku',
    ]);

    const requiredFields = [
        'sales_office',
        'posting_date',
        'billing_no',
        'material',
        'quantity',
        'sales_unit',
        'unit_price_penjualan',
        'total_penjualan',
    ];

    const parseNumeric = (value) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }

        let cleaned = String(value)
            .trim()
            .replace(/\s/g, '')
            .replace(/[^0-9,.\-]/g, '');

        if (!cleaned) return null;

        if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned =
                cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
                    ? cleaned.replace(/\./g, '').replace(',', '.')
                    : cleaned.replace(/,/g, '');
        } else if (cleaned.includes(',')) {
            const parts = cleaned.split(',');

            cleaned =
                parts.length === 2 && parts[1].length !== 3
                    ? cleaned.replace(',', '.')
                    : cleaned.replace(/,/g, '');
        } else if (cleaned.includes('.')) {
            const parts = cleaned.split('.');

            if (
                parts.length > 2 ||
                (parts.length === 2 &&
                    parts[1].length === 3 &&
                    parts[0].length <= 3)
            ) {
                cleaned = cleaned.replace(/\./g, '');
            }
        }

        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const parseDate = (value) => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().slice(0, 10);
        }

        if (typeof value === 'number') {
            // Worker mengirim nilai cell mentah.
            // Untuk serial Excel, gunakan konversi tanggal yang sesuai.
            const XLSX = require('xlsx');
            const parts = XLSX.SSF.parse_date_code(value);

            if (parts) {
                return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
            }
        }

        const text = String(value ?? '').trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            return text;
        }

        const dmy = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);

        if (dmy) {
            return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
        }

        const date = new Date(text);

        return Number.isNaN(date.getTime())
            ? null
            : date.toISOString().slice(0, 10);
    };

    const { v4: uuidv4 } = require('uuid');

    const result = {
        total_data: 0,
        total_success: 0,
        total_error: 0,
        data_error: [],
        preview: [],
    };

    const maxErrorPreview = 100;
    const maxDataPreview = 100;
    const uploadedPenjualanIds = [];

    let headersValidated = false;
    let workerFinished = false;
    let workerError = null;

    console.log('[UPLOAD PENJUALAN] File sementara:', {
        path: file.tempFilePath,
        exists: fs.existsSync(file.tempFilePath),
        size: fs.existsSync(file.tempFilePath)
            ? fs.statSync(file.tempFilePath).size
            : null,
    });

    const worker = new Worker(
        path.join(__dirname, '../workers/penjualanExcel.worker.js'),
        {
            workerData: {
                filePath: file.tempFilePath,
            },
        }
    );

    worker.on('online', () => {
    console.log('[EXCEL WORKER] Thread online');
});

worker.on('error', (error) => {
    console.error('[EXCEL WORKER] ERROR:', error);
});

worker.on('exit', (code) => {
    console.log('[EXCEL WORKER] EXIT:', code);
});

    const addError = (row, message) => {
        result.total_error += 1;

        if (result.data_error.length < maxErrorPreview) {
            result.data_error.push({ row, message });
        }
    };

    const processBatch = async (rows) => {
        let payload = [];

        const flushBatch = async () => {
            if (!payload.length) return;

            const currentPayload = payload;
            payload = [];

            const batchResult = await exports.insertPenjualanArray(
                currentPayload,
                transaction
            );

            result.total_data += batchResult.total_data ?? currentPayload.length;
            result.total_success += batchResult.total_success ?? 0;
            result.total_error += batchResult.total_error ?? 0;

            if (Array.isArray(batchResult.data_error)) {
                const remaining = maxErrorPreview - result.data_error.length;

                if (remaining > 0) {
                    result.data_error.push(
                        ...batchResult.data_error.slice(0, remaining)
                    );
                }
            }
        };

        for (const entry of rows) {
            const row = entry.row;
            const excelRow = entry.excelRow;

            if (
                !row ||
                !Object.values(row).some(
                    (value) => String(value ?? '').trim() !== ''
                )
            ) {
                continue;
            }

            try {
                const normalizedRow = new Map(
                    Object.entries(row).map(([key, value]) => [
                        normalizeHeader(key),
                        value,
                    ])
                );

                const item = {};

                for (const [field, header] of Object.entries(columnMap)) {
                    const value = normalizedRow.get(normalizeHeader(header));

                    if (field === 'posting_date') {
                        item[field] = parseDate(value);
                    } else if (numericFields.has(field)) {
                        item[field] = parseNumeric(value);
                    } else {
                        item[field] =
                            value === null || value === undefined
                                ? ''
                                : String(value).trim();
                    }
                }

                const missing = requiredFields.filter((field) => {
                    const value = item[field];

                    return (
                        value === null ||
                        value === undefined ||
                        String(value).trim() === ''
                    );
                });

                if (missing.length) {
                    addError(
                        excelRow,
                        `Data pada baris ${excelRow} belum lengkap: ${missing.join(', ')}`
                    );
                    continue;
                }

                if (!item.posting_date) {
                    addError(
                        excelRow,
                        `Posting Date pada baris ${excelRow} tidak valid.`
                    );
                    continue;
                }

                item.penjualan_id = uuidv4();
                item.is_upload = 1;
                item.created_by = createdBy || null;

                uploadedPenjualanIds.push(item.penjualan_id);

                if (result.preview.length < maxDataPreview) {
                    result.preview.push({
                        ...item,
                        _excel_row: excelRow,
                    });
                }

                payload.push(item);

                if (payload.length >= 500) {
                    await flushBatch();
                }
            } catch (error) {
                addError(
                    excelRow,
                    error.message || `Gagal memproses baris ${excelRow}.`
                );
            }
        }

        await flushBatch();
    };

    try {
        await new Promise((resolve, reject) => {
            worker.on('message', async (message) => {
                try {
                    if (message.type === 'HEADERS') {
                        const normalized = new Set(
                            message.headers.map(normalizeHeader)
                        );

                        const missingHeaders = Object.values(columnMap).filter(
                            (header) => !normalized.has(normalizeHeader(header))
                        );

                        if (missingHeaders.length) {
                            worker.postMessage({ type: 'CANCEL' });

                            reject(
                                new Error(
                                    `Format Excel tidak sesuai. Kolom yang belum tersedia: ${missingHeaders.join(', ')}`
                                )
                            );
                            return;
                        }

                        headersValidated = true;
                        worker.postMessage({ type: 'ACK' });
                        return;
                    }

                    if (message.type === 'BATCH') {
                        if (!headersValidated) {
                            throw new Error('Header Excel belum divalidasi.');
                        }

                        await processBatch(message.rows || []);
                        worker.postMessage({ type: 'ACK' });
                        return;
                    }

                    if (message.type === 'DONE') {
                        workerFinished = true;
                        resolve();
                        return;
                    }

                    if (message.type === 'ERROR') {
                        workerError = new Error(message.message);
                        reject(workerError);
                    }
                } catch (error) {
                    worker.postMessage({ type: 'CANCEL' });
                    reject(error);
                }
            });

            worker.once('error', reject);

            worker.once('exit', (code) => {
                if (code !== 0 && !workerFinished) {
                    reject(
                        new Error(`Worker Excel berhenti dengan kode ${code}.`)
                    );
                }
            });
        });

        if (!headersValidated) {
            throw new Error('Header Excel tidak berhasil divalidasi.');
        }

        if (result.total_success === 0) {
            throw new Error(
                result.total_error > 0
                    ? `Tidak ada data yang berhasil diproses. Total error: ${result.total_error}.`
                    : 'Tidak ada data penjualan yang dapat diproses.'
            );
        }

        const piutangResult = await exports.insertDataPiutang(
            uploadedPenjualanIds,
            createdBy,
            transaction
        );

        const updateResult = await model.d_penjualan.update(
            { is_upload: 0 },
            {
                where: {
                    penjualan_id: uploadedPenjualanIds,
                    is_upload: 1,
                },
                transaction,
            }
        );

        return {
            ...result,
            total: result.total_data,
            success: result.total_success,
            failed: result.total_error,
            preview: result.preview.slice(0, maxDataPreview),
            errors: result.data_error.slice(0, maxErrorPreview),
            total_piutang: piutangResult.total_success || 0,
            total_updated: updateResult?.[0] || 0,
        };
    } catch (error) {
        await worker.terminate().catch(() => { });
        throw error;
    }
};


exports.getDataPenjualan = async (params) => {
    try {
        // =====================================================
        // HELPER NORMALIZE FILTER
        // Mendukung nilai tunggal maupun array
        // =====================================================
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value)
                ? value
                : [value];

            return values
                .filter(
                    (item) =>
                        item !== undefined &&
                        item !== null
                )
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        // =====================================================
        // PARAMETER PAGINATION
        // =====================================================
        const page = Math.max(
            Number(params?.page) || 1,
            1
        );

        const limit = Math.max(
            Number(params?.limit) || 10,
            1
        );

        const offset = (page - 1) * limit;

        const keyword = String(
            params?.keyword || ''
        ).trim();

        // =====================================================
        // SALES OFFICE
        // =====================================================
        const salesOffices = normalizeFilterValues(
            params?.sales_office ??
            params?.['sales_office[]']
        );

        // =====================================================
        // CUSTOMER
        // Nilai dari frontend adalah kode_customer
        // Dicocokkan dengan dp.bill_to_party
        // =====================================================
        const customers = normalizeFilterValues(
            params?.customer ??
            params?.['customer[]']
        );

        // =====================================================
        // POSTING STATUS
        // =====================================================
        const postingStatuses = normalizeFilterValues(
            params?.posting_status ??
            params?.['posting_status[]']
        );

        // =====================================================
        // CUSTOMER GROUP
        // =====================================================
        const customerGroups = normalizeFilterValues(
            params?.customer_group ??
            params?.['customer_group[]']
        );

        // =====================================================
        // PRINCIPLE
        // =====================================================
        const principles = normalizeFilterValues(
            params?.principle ??
            params?.['principle[]']
        );

        // =====================================================
        // DATE FILTER
        // =====================================================
        const startDate = String(
            params?.start_date || ''
        ).trim();

        const endDate = String(
            params?.end_date || ''
        ).trim();

        // =====================================================
        // CONDITION DAN REPLACEMENTS
        // =====================================================
        let condition = '';

        const replacements = {
            limit,
            offset
        };

        // =====================================================
        // KEYWORD SEARCH
        // =====================================================
        if (keyword) {
            condition += `
                AND (
                    dp.billing_no ILIKE :keyword
                    OR dp.bill_to_party ILIKE :keyword
                    OR dp.name_bill_to ILIKE :keyword
                    OR dp.address ILIKE :keyword
                    OR dp.material ILIKE :keyword
                    OR dp.text_material ILIKE :keyword
                    OR dp.desc_s_office ILIKE :keyword
                    OR dp.principle ILIKE :keyword
                    OR dp.name_principle ILIKE :keyword
                    OR dp.salesman ILIKE :keyword
                    OR dp.name_salesman ILIKE :keyword
                    OR dp.po_number ILIKE :keyword
                    OR dp.quotation_number ILIKE :keyword
                )
            `;

            replacements.keyword = `%${keyword}%`;
        }

        // =====================================================
        // FILTER SALES OFFICE
        // Mempertahankan kolom filter sebelumnya
        // =====================================================
        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND dp.sales_office IN (:sales_offices)
            `;

            replacements.sales_offices = salesOffices;
        }

        // =====================================================
        // FILTER CUSTOMER
        // kode_customer -> dp.bill_to_party
        // =====================================================
        if (
            customers.length &&
            !customers.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND dp.bill_to_party IN (:customers)
            `;

            replacements.customers = customers;
        }

        // =====================================================
        // FILTER POSTING STATUS
        // =====================================================
        if (
            postingStatuses.length &&
            !postingStatuses.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND dp.posting_status IN (:posting_statuses)
            `;

            replacements.posting_statuses = postingStatuses;
        }

        // =====================================================
        // FILTER CUSTOMER GROUP
        // =====================================================
        if (
            customerGroups.length &&
            !customerGroups.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND dp.desc_cust_grp4 IN (:customer_groups)
            `;

            replacements.customer_groups = customerGroups;
        }

        // =====================================================
        // FILTER PRINCIPLE
        // =====================================================
        if (
            principles.length &&
            !principles.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND dp.name_principle IN (:principles)
            `;

            replacements.principles = principles;
        }

        // =====================================================
        // FILTER START DATE
        // =====================================================
        if (startDate) {
            condition += `
                AND dp.posting_date >= :start_date
            `;

            replacements.start_date = startDate;
        }

        // =====================================================
        // FILTER END DATE
        // =====================================================
        if (endDate) {
            condition += `
                AND dp.posting_date <= :end_date
            `;

            replacements.end_date = endDate;
        }

        // =====================================================
        // 1. GET LIST DATA
        // =====================================================
        const listQuery = query.getDataPenjualan.replace(
            ':condition',
            condition
        );

        const listData = await db.query(
            listQuery,
            {
                replacements,
                type: db.QueryTypes.SELECT
            }
        );

        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================
        const countQuery = query.countDataPenjualan.replace(
            ':condition',
            condition
        );

        const countData = await db.query(
            countQuery,
            {
                replacements,
                type: db.QueryTypes.SELECT
            }
        );

        const totalData = Number(
            countData?.[0]?.total || 0
        );

        const totalHalaman = Math.ceil(
            totalData / limit
        );

        // =====================================================
        // 3. GET SUMMARY DATA
        // =====================================================
        const summaryQuery =
            query.summaryDataPenjualan.replace(
                ':condition',
                condition
            );

        const summaryResult = await db.query(
            summaryQuery,
            {
                replacements,
                type: db.QueryTypes.SELECT
            }
        );

        const summary = summaryResult?.[0] || {
            total_transaksi: 0,
            total_billing: 0,
            total_customer: 0,
            total_quantity: 0,
            total_penjualan: 0,
            total_tax: 0,
            total_cogs: 0,
            total_discount: 0,
            total_margin: 0
        };

        // =====================================================
        // RETURN
        // =====================================================
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary
        };

    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA PENJUALAN:',
            error
        );

        throw error;
    }
};

exports.getDataPiutang = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];
            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const offset = (page - 1) * limit;
        const keyword = String(params?.keyword || '').trim();
        // SALES OFFICE
        const salesOffices = normalizeFilterValues(
            params?.sales_office ?? params?.['sales_office[]']
        );
        // CUSTOMER
        // Mendukung customer dan customer[]
        const customers = normalizeFilterValues(
            params?.customer ?? params?.['customer[]']
        );
        // STATUS
        const status = String(params?.status || 'ALL').trim();
        // POSTING STATUS
        const postingStatus = String(params?.posting_status || 'ALL').trim();
        // CUSTOMER GROUP
        const customerGroups = normalizeFilterValues(
            params?.customer_group ?? params?.['customer_group[]']
        );
        // PRINCIPLE
        const principles = normalizeFilterValues(
            params?.principle ?? params?.['principle[]']
        );
        // START DATE
        const startDate = String(params?.start_date || '').trim();
        // END DATE
        const endDate = String(params?.end_date || '').trim();
        let condition = '';
        const bind = {
            limit,
            offset
        };
        // KEYWORD
        if (keyword) {
            condition += `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.cabang ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR p.posting_date::text ILIKE :keyword
                    OR p.jatuh_tempo::text ILIKE :keyword
                    OR p.dpp::text ILIKE :keyword
                    OR p.ppn::text ILIKE :keyword
                    OR p.pph::text ILIKE :keyword
                    OR p.dibayar::text ILIKE :keyword
                    OR p.outstanding::text ILIKE :keyword
                    OR p.aging::text ILIKE :keyword
                    OR p.status_piutang ILIKE :keyword
                    OR p.created_by ILIKE :keyword
                    OR p.created_at::text ILIKE :keyword
                    OR p.updated_by ILIKE :keyword
                    OR p.updated_at::text ILIKE :keyword
                    OR EXISTS (
                        SELECT 1
                        FROM public.m_customer mc_keyword
                        WHERE mc_keyword.kode_customer = p.customer
                        AND mc_keyword.name ILIKE :keyword
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.m_referensi mr_keyword
                        WHERE mr_keyword.kd_ref = p.cabang
                        AND mr_keyword.jns_ref = 'cabang_id'
                        AND mr_keyword.ur_ref ILIKE :keyword
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.m_principle mp_keyword
                        WHERE mp_keyword.principle = p.principle
                        AND mp_keyword.nama_principle ILIKE :keyword
                    )
                )
            `;
            bind.keyword = `%${keyword}%`;
        }
        // FILTER SALES OFFICE
        if (
            salesOffices.length &&
            !salesOffices.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.cabang IN (:sales_offices)
            `;
            bind.sales_offices = salesOffices;
        }
        // FILTER CUSTOMER
        // Filter menggunakan kolom customer dari d_piutang.
        // Alias p harus sesuai dengan alias pada query.getDataPiutang,
        // query.countDataPiutang, dan query.summaryDataPiutang.
        if (
            customers.length &&
            !customers.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.customer IN (:customers)
            `;
            bind.customers = customers;
        }
        // FILTER STATUS PIUTANG
        if (status && status.toUpperCase() !== 'ALL') {
            condition += `
                AND UPPER(p.status_piutang) = UPPER(:status)
            `;
            bind.status = status;
        }
        // FILTER POSTING STATUS
        if (postingStatus && postingStatus.toUpperCase() !== 'ALL') {
            condition += `
                AND p.posting_status = :posting_status
            `;
            bind.posting_status = postingStatus;
        }
        // FILTER CUSTOMER GROUP
        if (
            customerGroups.length &&
            !customerGroups.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.customer IN (:customer_groups)
            `;
            bind.customer_groups = customerGroups;
        }
        // FILTER PRINCIPLE
        if (
            principles.length &&
            !principles.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.principle IN (:principles)
            `;
            bind.principles = principles;
        }
        // FILTER START DATE
        if (startDate) {
            condition += `
                AND p.posting_date >= :start_date
            `;
            bind.start_date = startDate;
        }
        // FILTER END DATE
        if (endDate) {
            condition += `
                AND p.posting_date <= :end_date
            `;
            bind.end_date = endDate;
        }
        // 1. GET LIST DATA
        const LIST_QUERY = query.getDataPiutang.replace(
            /:condition/g,
            condition
        );
        const listData = await db.query(LIST_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        });
        // 2. GET TOTAL DATA
        const COUNT_QUERY = query.countDataPiutang.replace(
            /:condition/g,
            condition
        );
        const countData = await db.query(COUNT_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        });
        const totalData = Number(countData?.[0]?.total || 0);
        const totalHalaman = Math.ceil(totalData / limit);
        // 3. GET SUMMARY
        const SUMMARY_QUERY = query.summaryDataPiutang.replace(
            /:condition/g,
            condition
        );
        const summaryResult = await db.query(SUMMARY_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        });
        const summary = summaryResult?.[0] || {
            total_piutang: 0,
            sudah_dibayar: 0,
            outstanding: 0,
            outstanding_count: 0,
            belum_lunas_count: 0,
            lunas_count: 0,
            akan_jatuh_tempo_amount: 0,
            akan_jatuh_tempo_count: 0,
            sudah_jatuh_tempo_amount: 0,
            sudah_jatuh_tempo_count: 0,
            total_data: 0
        };
        // RETURN
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary
        };
    } catch (error) {
        console.error('ERROR SERVICE GET DATA PIUTANG:', error);
        throw error;
    }
};

exports.getListPrinciple = async (params) => {
    try {
        // =========================
        // PARAMETER
        // =========================
        const page = Number(params?.page) || 1
        const limit = Number(params?.limit) || 10

        const offset = (page - 1) * limit

        const keyword = String(
            params?.keyword || ''
        ).trim()

        // =========================
        // CONDITION
        // =========================
        let condition = ``

        const bind = {
            limit,
            offset
        }

        // =========================
        // KEYWORD
        // =========================
        if (keyword) {
            condition += `
                AND (
                    mp.principle ILIKE :keyword
                    OR mp.nama_principle ILIKE :keyword
                )
            `

            bind.keyword = `%${keyword}%`
        }

        // =====================================================
        // 1. GET LIST DATA
        // =====================================================
        const LIST_QUERY = query.getListPrinciple
            .replace(/:condition/g, condition)

        const listData = await db.query(LIST_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        })

        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================
        const COUNT_QUERY = query.countListPrinciple
            .replace(/:condition/g, condition)

        const countData = await db.query(COUNT_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        })

        const totalData = Number(
            countData?.[0]?.total || 0
        )

        const totalHalaman = Math.ceil(
            totalData / limit
        )

        // =====================================================
        // RETURN
        // =====================================================
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData
        }

    } catch (error) {
        console.error(
            'ERROR SERVICE GET LIST PRINCIPLE:',
            error
        )

        throw error
    }
}

exports.getDataPelanggan = async (params) => {
    try {
        // =========================
        // PARAMETER
        // =========================
        const page = Number(params?.page) || 1
        const limit = Number(params?.limit) || 10
        const offset = (page - 1) * limit
        const keyword = String(params?.keyword || '').trim()
        const status = String(params?.status || '').trim()
        const salesOffice = String(params?.sales_office || '').trim()
        // Filter cabang dari frontend (multi-select)
        const cabangId = Array.isArray(params?.cabang_id)
            ? params.cabang_id.filter(
                (item) => item !== null &&
                    item !== undefined &&
                    String(item).trim() !== ''
            )
            : params?.cabang_id !== null &&
                params?.cabang_id !== undefined &&
                String(params.cabang_id).trim() !== ''
                ? [params.cabang_id]
                : []
        const sortBy = String(params?.sortBy || '').trim()
        // =========================
        // CONDITION
        // =========================
        let condition = ``
        const bind = {
            limit,
            offset
        }
        // =========================
        // KEYWORD
        // =========================
        if (keyword) {
            condition += `
                AND (
                    mc.kode_customer ILIKE :keyword
                    OR mc.name ILIKE :keyword
                    OR mc.sales_office ILIKE :keyword
                    OR mc.sales_office_description ILIKE :keyword
                    OR mc.status_outlet ILIKE :keyword
                    OR mc.address ILIKE :keyword
                    OR mc.city ILIKE :keyword
                    OR mc.customer_groups_1_description ILIKE :keyword
                    OR mc.customer_groups_2_description ILIKE :keyword
                    OR mc.customer_groups_3_description ILIKE :keyword
                    OR mc.customer_groups_4_description ILIKE :keyword
                    OR mc.no_npwp ILIKE :keyword
                    OR mc.nama_npwp ILIKE :keyword
                    OR mc.division ILIKE :keyword
                    OR mc.channel_tw_alpian ILIKE :keyword
                    OR mc.lini_custom_asha ILIKE :keyword
                    OR mc.channel_nopalpadil ILIKE :keyword
                    OR mc.ket_payer ILIKE :keyword
                )
            `
            bind.keyword = `%${keyword}%`
        }
        // =========================
        // FILTER STATUS
        // =========================
        if (status) {
            // condition += `
            //     AND UPPER(
            //         TRIM(
            //             COALESCE(mc.status_outlet, '')
            //         )
            //     ) = UPPER(:status)
            // `
            bind.status = status
        }
        // =========================
        // FILTER SALES OFFICE
        // =========================
        if (salesOffice && cabangId.length === 0) {
            condition += `
                AND mc.sales_office = :sales_office
            `
            bind.sales_office = salesOffice
        }
        // =========================
        // FILTER CABANG ID (MULTI-SELECT)
        // =========================
        if (cabangId.length > 0) {
            condition += `
                AND mc.sales_office IN (:cabang_id)
            `
            bind.cabang_id = cabangId
        }
        // =========================
        // SORTING
        // =========================
        let orderBy = `
            mc.created_at DESC NULLS LAST,
            mc.name ASC NULLS LAST
        `
        /*
         * Whitelist sorting.
         * Jangan langsung masukkan sortBy
         * dari frontend ke raw query.
         */
        const sortMapping = {
            customer_id: 'mc.customer_id',
            sales_office: 'mc.sales_office',
            sales_office_description: 'mc.sales_office_description',
            kode_customer: 'mc.kode_customer',
            name: 'mc.name',
            status_outlet: 'mc.status_outlet',
            address: 'mc.address',
            city: 'mc.city',
            customer_groups_1_description: 'mc.customer_groups_1_description',
            customer_groups_2_description: 'mc.customer_groups_2_description',
            customer_groups_3_description: 'mc.customer_groups_3_description',
            customer_groups_4_description: 'mc.customer_groups_4_description',
            top: 'mc.top',
            no_npwp: 'mc.no_npwp',
            tgl_registrasi: 'mc.tgl_registrasi',
            division: 'mc.division',
            created_at: 'mc.created_at',
            updated_at: 'mc.updated_at'
        }
        if (sortBy) {
            let sortColumn = sortBy
            let sortDirection = 'ASC'
            // Format: name:asc atau name:desc
            if (sortBy.includes(':')) {
                const parts = sortBy.split(':')
                sortColumn = parts[0]
                sortDirection = String(parts[1] || 'ASC').toUpperCase()
            }
            // Format: name desc
            else if (/\s+DESC$/i.test(sortBy)) {
                sortColumn = sortBy.replace(/\s+DESC$/i, '').trim()
                sortDirection = 'DESC'
            }
            // Format: name asc
            else if (/\s+ASC$/i.test(sortBy)) {
                sortColumn = sortBy.replace(/\s+ASC$/i, '').trim()
                sortDirection = 'ASC'
            }
            // Validasi kolom dan arah sorting
            if (sortMapping[sortColumn]) {
                if (!['ASC', 'DESC'].includes(sortDirection)) {
                    sortDirection = 'ASC'
                }
                orderBy = `
                    ${sortMapping[sortColumn]}
                    ${sortDirection}
                    NULLS LAST
                `
            }
        }
        // =====================================================
        // 1. GET LIST DATA
        // =====================================================
        const LIST_QUERY = query.getDataPelanggan
            .replace(/:condition/g, condition)
            .replace(/:sortBy/g, orderBy)
        const listData = await db.query(
            LIST_QUERY,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
                logging: console.log
            }
        )
        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================
        const COUNT_QUERY = query.countDataPelanggan
            .replace(/:condition/g, condition)
        const countData = await db.query(
            COUNT_QUERY,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        )
        const totalData = Number(countData?.[0]?.total || 0)
        const totalHalaman = Math.ceil(totalData / limit)
        // =====================================================
        // 3. GET SUMMARY
        // =====================================================
        const SUMMARY_QUERY = query.summaryDataPelanggan
            .replace(/:condition/g, condition)
        const summaryData = await db.query(
            SUMMARY_QUERY,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        )
        const summary = summaryData?.[0] || {}
        // =====================================================
        // RETURN
        // =====================================================
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary: {
                total: Number(summary?.total_pelanggan || 0),
                aktif: Number(summary?.total_aktif || 0),
                nonaktif: Number(summary?.total_nonaktif || 0),
                cabang: Number(summary?.total_cabang || 0)
            }
        }
    } catch (error) {
        console.error('ERROR SERVICE GET DATA PELANGGAN:', error)
        throw error
    }
}

exports.insertUser = async (payload, transaction) => {
    const checkNip = await model.m_user.count({
        where: { nip: payload?.nip },
        transaction
    });
    if (checkNip > 0) {
        throw new Error('NIP Sudah Terdaftar !');
    }

    const checkUsername = await model.m_user.count({
        where: { username: payload?.username },
        transaction
    });
    if (checkUsername > 0) {
        throw new Error('Username Sudah Terdaftar !');
    }

    const password = await helpers.encodedJwt(payload?.password);
    const createdAt = new Date();

    const user = await model.m_user.create({
        user_id: payload?.user_id,
        username: payload?.username,
        password,
        nip: payload?.nip,
        nama: payload?.nama,
        email: payload?.email,
        no_telepon: payload?.no_telepon,
        tipe_user: payload?.tipe_user,
        flag_aktif: payload?.flag_aktif,
        created_by: payload?.created_by,
        created_at: createdAt
    }, { transaction, returning: true });

    await model.m_role_user.create({
        role_user_id: payload?.role_user_id,
        user_id: payload?.user_id,
        role_id: payload?.role_id,
        cabang_id: payload?.cabang_id,
        is_aktif: payload?.flag_aktif,
        created_by: payload?.created_by,
        created_at: createdAt
    }, { transaction });

    return {
        user_id: user.user_id,
        username: user.username,
        nip: user.nip,
        nama: user.nama,
        email: user.email,
        no_telepon: user.no_telepon,
        tipe_user: user.tipe_user,
        flag_aktif: user.flag_aktif
    };
};

exports.updateUser = async (payload, transaction) => {
    const userId = payload?.user_id;
    if (!userId) {
        throw new Error('user_id wajib diisi');
    }

    if (payload?.nip) {
        const duplicateNip = await model.m_user.count({
            where: { nip: payload.nip, user_id: { [Op.ne]: userId } },
            transaction
        });
        if (duplicateNip > 0) {
            throw new Error('NIP Sudah Terdaftar !');
        }
    }

    if (payload?.username) {
        const duplicateUsername = await model.m_user.count({
            where: { username: payload.username, user_id: { [Op.ne]: userId } },
            transaction
        });
        if (duplicateUsername > 0) {
            throw new Error('Username Sudah Terdaftar !');
        }
    }

    const updatedAt = new Date();
    const [updatedUserCount] = await model.m_user.update({
        username: payload?.username,
        nip: payload?.nip,
        nama: payload?.nama,
        email: payload?.email,
        no_telepon: payload?.no_telepon,
        tipe_user: payload?.tipe_user,
        flag_aktif: payload?.flag_aktif,
        updated_by: payload?.updated_by,
        updated_at: updatedAt
    }, {
        where: { user_id: userId },
        transaction
    });

    if (updatedUserCount === 0) {
        throw new Error('User tidak ditemukan');
    }

    const [deactivatedRoleCount] = await model.m_role_user.update({
        is_aktif: 'T',
        updated_by: payload?.updated_by,
        updated_at: updatedAt
    }, {
        where: { user_id: userId, is_aktif: 'Y' },
        transaction
    });

    const activeRole = await model.m_role_user.create({
        role_user_id: uuidv4(),
        user_id: userId,
        role_id: payload?.role_id,
        cabang_id: payload?.cabang_id,
        is_aktif: 'Y',
        created_by: payload?.updated_by,
        created_at: updatedAt
    }, { transaction, returning: true });

    return {
        user_id: userId,
        updated_user: updatedUserCount,
        deactivated_roles: deactivatedRoleCount,
        active_role: activeRole
    };
};

exports.deleteUser = async (userId, transaction) => {
    if (!userId) {
        throw new Error('user_id wajib diisi');
    }

    const deletedRoleUser = await model.m_role_user.destroy({
        where: { user_id: userId },
        transaction
    });
    const deletedUser = await model.m_user.destroy({
        where: { user_id: userId },
        transaction
    });

    return {
        user_id: userId,
        deleted_role_user: deletedRoleUser,
        deleted_user: deletedUser
    };
};

exports.getListUserManagement = async ({
    keyword = null,
    page = 1,
    limit = 10,
    sortBy = 'DESC',
    status = null,
    role_id = null,
    cabang_id = null,
}) => {

    const order_by = `ORDER BY mu.nama ${sortBy === 'ASC' ? 'ASC' : 'DESC'}`;

    let condition = ``;

    // =====================================================
    // SEARCH
    // =====================================================

    if (keyword && keyword.trim() !== '') {

        condition += `
            AND (
                UPPER(mu.nama) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(mu.username) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(mu.nip) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(mu.email) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(m1.ur_ref) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(m2.ur_ref) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(m3.ur_ref) ILIKE UPPER('%${keyword.trim()}%')
                OR UPPER(m4.ur_ref) ILIKE UPPER('%${keyword.trim()}%')
            )
        `;
    }


    // =====================================================
    // STATUS
    // =====================================================

    if (
        status &&
        status !== 'ALL'
    ) {
        const stat = status === 'AKTIF' ? 'Y' : 'T'
        condition += `
            AND mu.flag_aktif = '${stat}'
        `;

    }


    // =====================================================
    // ROLE
    // =====================================================

    if (
        role_id &&
        role_id !== 'ALL'
    ) {

        condition += `
            AND mru.role_id = '${role_id}'
        `;

    }


    // =====================================================
    // CABANG
    // =====================================================

    if (
        cabang_id &&
        cabang_id !== 'ALL'
    ) {

        condition += `
            AND mru.cabang_id = '${cabang_id}'
        `;

    }


    // =====================================================
    // QUERY
    // =====================================================

    const QUERY = query.getListUserManagement
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by);


    const COUNT_QUERY = query.countListUserManagement
        .replace(/:condition/g, condition);


    // =====================================================
    // BIND PAGINATION
    // =====================================================

    const bindList = {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
    };


    // =====================================================
    // GET DATA
    // =====================================================

    const listUser = await db.query(
        QUERY,
        {
            replacements: bindList,
            type: db.QueryTypes.SELECT,
        }
    );


    // =====================================================
    // COUNT
    // =====================================================

    const countData = await db.query(
        COUNT_QUERY,
        {
            replacements: bindList,
            type: db.QueryTypes.SELECT,
            plain: true,
        }
    );


    // =====================================================
    // RESULT
    // =====================================================

    const totalData = Number(
        countData?.total_data || 0
    );

    const totalHalaman = Number(
        countData?.total_halaman || 0
    );


    return {

        status: true,

        data: {

            total_data: totalData,

            total_halaman: totalHalaman,

            limit: bindList.limit,

            list_data: listUser || [],

        },

    };

};

exports.getListDataCod = async ({ keyword = null, page = 1, limit = 10 } = {}) => {
    let condition = '';
    const bindList = {
        page: Math.max(Number(page) || 1, 1),
        limit: Math.max(Number(limit) || 10, 1),
    };

    if (keyword && keyword.trim() !== '') {
        condition = ` AND (
            cod_id::text ILIKE :keyword
            OR no_billing ILIKE :keyword
            OR tanggal_pelunasan::text ILIKE :keyword
            OR nominal_billing::text ILIKE :keyword
            OR created_by ILIKE :keyword
            OR created_at::text ILIKE :keyword
            OR updated_at::text ILIKE :keyword
            OR updated_by ILIKE :keyword
        )`;
        bindList.keyword = `%${keyword.trim()}%`;
    }

    const listQuery = query.getListDataCod.replace(/:condition/g, condition);
    const countQuery = query.countListDataCod.replace(/:condition/g, condition);

    const listData = await db.query(listQuery, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        logging: console.log, // Enable logging for debugging
    });

    const countData = await db.query(countQuery, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    });

    return {
        status: true,
        data: {
            total_data: Number(countData?.total_data || 0),
            total_halaman: Number(countData?.total_halaman || 0),
            limit: bindList.limit,
            list_data: listData || [],
        },
    };
};

exports.insertDataCod = async (payload) => {
    return model.d_cod.create({
        no_billing: payload?.no_billing,
        tanggal_pelunasan: payload?.tanggal_pelunasan || null,
        nominal_billing: payload?.nominal_billing ?? 0,
        created_by: payload?.created_by || null
    });
};

exports.editDataCod = async (payload) => {
    console.log('Payload editDataCod:', payload); // Debugging line to check the payload
    return model.d_cod.update({
        no_billing: payload?.no_billing,
        tanggal_pelunasan: payload?.tanggal_pelunasan || null,
        nominal_billing: payload?.nominal_billing ?? 0,
        updated_by: payload?.updated_by || null,
        updated_at: new Date()
    }, {
        where: { cod_id: payload?.cod_id },
        returning: true
    });
};

exports.deleteDataCod = async (codId) => {
    return model.d_cod.destroy({
        where: { cod_id: codId }
    });
};

exports.insertFakturPetugas = async (payload, transaction) => {

    if (!payload?.piutang_id) {
        throw new Error('piutang_id wajib diisi');
    }

    if (!payload?.nip) {
        throw new Error('NIP wajib diisi');
    }

    if (!payload?.kegiatan) {
        throw new Error('Kegiatan wajib diisi');
    }

    /*
     * Cek apakah piutang + NIP + kegiatan
     * masih memiliki assignment aktif
     */
    const checkAssignment = await model.d_faktur_petugas.count({
        where: {
            piutang_id: payload.piutang_id,
            nip: payload.nip,
            kegiatan: payload.kegiatan,
            is_active: 'Y'
        },
        transaction
    });

    if (checkAssignment > 0) {
        throw new Error(
            'Piutang sudah ditugaskan kepada petugas untuk kegiatan tersebut !'
        );
    }

    const createdAt = new Date();

    const fakturPetugas = await model.d_faktur_petugas.create({
        faktur_petugas_id: payload?.faktur_petugas_id || uuidv4(),
        piutang_id: payload?.piutang_id,
        nip: payload?.nip,
        kegiatan: payload?.kegiatan,
        is_active: payload?.is_active || 'Y',
        assigned_at: payload?.assigned_at || createdAt,
        created_by: payload?.created_by,
        created_at: createdAt
    }, {
        transaction,
        returning: true
    });

    return {
        faktur_petugas_id: fakturPetugas.faktur_petugas_id,
        piutang_id: fakturPetugas.piutang_id,
        nip: fakturPetugas.nip,
        kegiatan: fakturPetugas.kegiatan,
        is_active: fakturPetugas.is_active,
        assigned_at: fakturPetugas.assigned_at,
        created_by: fakturPetugas.created_by,
        created_at: fakturPetugas.created_at
    };
};


/**
 * UPDATE FAKTUR PETUGAS
 *
 * Pola:
 * 1. Nonaktifkan assignment lama
 * 2. Buat assignment baru sebagai aktif
 */
exports.updateFakturPetugas = async (payload, transaction) => {

    const fakturPetugasId = payload?.faktur_petugas_id;

    if (!fakturPetugasId) {
        throw new Error('faktur_petugas_id wajib diisi');
    }

    if (!payload?.piutang_id) {
        throw new Error('piutang_id wajib diisi');
    }

    if (!payload?.nip) {
        throw new Error('NIP wajib diisi');
    }

    if (!payload?.kegiatan) {
        throw new Error('Kegiatan wajib diisi');
    }

    if (!VALID_KEGIATAN.includes(payload.kegiatan)) {
        throw new Error(
            'Kegiatan hanya boleh TUKAR_FAKTUR atau PENAGIHAN'
        );
    }

    /*
     * Cek data yang akan di-update
     */
    const existingData = await model.d_faktur_petugas.findOne({
        where: {
            faktur_petugas_id: fakturPetugasId
        },
        transaction
    });

    if (!existingData) {
        throw new Error('Data faktur petugas tidak ditemukan');
    }

    /*
     * Cek apakah assignment yang sama
     * sudah dimiliki oleh record aktif lain
     */
    const duplicateAssignment = await model.d_faktur_petugas.count({
        where: {
            piutang_id: payload.piutang_id,
            nip: payload.nip,
            kegiatan: payload.kegiatan,
            is_active: 'Y',
            faktur_petugas_id: {
                [Op.ne]: fakturPetugasId
            }
        },
        transaction
    });

    if (duplicateAssignment > 0) {
        throw new Error(
            'Piutang sudah ditugaskan kepada petugas untuk kegiatan tersebut !'
        );
    }

    const updatedAt = new Date();

    /*
     * Nonaktifkan assignment lama
     */
    const [deactivatedCount] = await model.d_faktur_petugas.update({
        is_active: 'T',
        updated_by: payload?.updated_by,
        updated_at: updatedAt
    }, {
        where: {
            faktur_petugas_id: fakturPetugasId,
            is_active: 'Y'
        },
        transaction
    });

    /*
     * Buat assignment baru
     */
    const activeAssignment = await model.d_faktur_petugas.create({
        faktur_petugas_id: uuidv4(),
        piutang_id: payload?.piutang_id,
        nip: payload?.nip,
        kegiatan: payload?.kegiatan,
        is_active: 'Y',
        assigned_at: payload?.assigned_at || updatedAt,
        created_by: payload?.updated_by,
        created_at: updatedAt
    }, {
        transaction,
        returning: true
    });

    return {
        faktur_petugas_id: activeAssignment.faktur_petugas_id,
        piutang_id: activeAssignment.piutang_id,
        nip: activeAssignment.nip,
        kegiatan: activeAssignment.kegiatan,
        is_active: activeAssignment.is_active,
        assigned_at: activeAssignment.assigned_at,
        deactivated_count: deactivatedCount
    };
};

exports.getDataFakturPetugas = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];
            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const offset = (page - 1) * limit;
        const keyword = String(params?.keyword || '').trim();
        const kegiatan = String(params?.kegiatan || 'ALL').trim().toUpperCase();
        const salesOffices = normalizeFilterValues(params?.sales_office ?? params?.['sales_office[]']);
        const customers = normalizeFilterValues(params?.customer ?? params?.['customer[]']);
        const status = String(params?.status || 'ALL').trim().toUpperCase();
        const startDate = String(params?.start_date || '').trim();
        const endDate = String(params?.end_date || '').trim();
        let condition = '';
        const bind = {
            limit,
            offset
        };
        if (keyword) {
            condition += `
        AND (
            p.no_faktur ILIKE :keyword
            OR p.no_billing ILIKE :keyword
            OR p.customer ILIKE :keyword
            OR p.sales ILIKE :keyword
            OR p.nama_sales ILIKE :keyword
            OR p.cabang ILIKE :keyword
            OR p.principle ILIKE :keyword
            OR p.document_type ILIKE :keyword
            OR p.posting_date::text ILIKE :keyword
            OR p.jatuh_tempo::text ILIKE :keyword
            OR mc.name ILIKE :keyword
            OR mr.ur_ref ILIKE :keyword
            OR mp.nama_principle ILIKE :keyword
        )
    `;
            bind.keyword = `%${keyword}%`;
        }
        if (salesOffices.length && !salesOffices.some((item) => item.toUpperCase() === 'ALL')) {
            condition += `
                AND p.cabang IN (:sales_offices)
            `;
            bind.sales_offices = salesOffices;
        }
        if (customers.length && !customers.some((item) => item.toUpperCase() === 'ALL')) {
            condition += `
                AND p.customer IN (:customers)
            `;
            bind.customers = customers;
        }
        if (kegiatan !== 'ALL') {
            if (!['TUKAR_FAKTUR', 'PENAGIHAN'].includes(kegiatan)) {
                throw new Error(
                    'Kegiatan hanya boleh TUKAR_FAKTUR atau PENAGIHAN'
                );
            }
            bind.kegiatan = kegiatan;
            if (kegiatan === 'TUKAR_FAKTUR') {
                condition += `
                    AND fp_tukar.faktur_petugas_id IS NOT NULL
                `;
            }
            if (kegiatan === 'PENAGIHAN') {
                condition += `
                    AND fp_penagihan.faktur_petugas_id IS NOT NULL
                `;
            }
        }
        if (status && status !== 'ALL') {
            if (!['BELUM_DITUGASKAN', 'SUDAH_DITUGASKAN'].includes(status)) {
                throw new Error(
                    'Status hanya boleh BELUM_DITUGASKAN atau SUDAH_DITUGASKAN'
                );
            }
            if (kegiatan === 'TUKAR_FAKTUR') {
                if (status === 'BELUM_DITUGASKAN') {
                    condition += `
                        AND fp_tukar.faktur_petugas_id IS NULL
                    `;
                }
                if (status === 'SUDAH_DITUGASKAN') {
                    condition += `
                        AND fp_tukar.faktur_petugas_id IS NOT NULL
                    `;
                }
            } else if (kegiatan === 'PENAGIHAN') {
                if (status === 'BELUM_DITUGASKAN') {
                    condition += `
                        AND fp_penagihan.faktur_petugas_id IS NULL
                    `;
                }
                if (status === 'SUDAH_DITUGASKAN') {
                    condition += `
                        AND fp_penagihan.faktur_petugas_id IS NOT NULL
                    `;
                }
            } else {
                if (status === 'BELUM_DITUGASKAN') {
                    condition += `
                        AND fp_tukar.faktur_petugas_id IS NULL
                        AND fp_penagihan.faktur_petugas_id IS NULL
                    `;
                }
                if (status === 'SUDAH_DITUGASKAN') {
                    condition += `
                        AND (
                            fp_tukar.faktur_petugas_id IS NOT NULL
                            OR fp_penagihan.faktur_petugas_id IS NOT NULL
                        )
                    `;
                }
            }
        }
        if (startDate) {
            condition += `
                AND p.posting_date >= :start_date
            `;
            bind.start_date = startDate;
        }
        if (endDate) {
            condition += `
                AND p.posting_date <= :end_date
            `;
            bind.end_date = endDate;
        }
        const listQuery = query.getDataFakturPetugas.replace(':condition', condition);
        const listData = await db.query(
            listQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
                logging: console.log
            }
        );
        const countQuery = query.countDataFakturPetugas.replace(':condition', condition);
        const countData = await db.query(
            countQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );
        const totalData = Number(countData?.[0]?.total || 0);
        const totalHalaman = Math.ceil(totalData / limit);
        const summaryQuery = query.summaryDataFakturPetugas.replace(':condition', condition);
        const summaryResult = await db.query(
            summaryQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );
        const summary = summaryResult?.[0] || {};
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary: {
                total_faktur: Number(summary?.total_faktur || 0),
                sudah_ditugaskan: Number(summary?.sudah_ditugaskan || 0),
                belum_ditugaskan: Number(summary?.belum_ditugaskan || 0)
            }
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA FAKTUR PETUGAS:',
            error
        );
        throw error;
    }
};

exports.getDataTukarFaktur = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value)
                ? value
                : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const offset = (page - 1) * limit;

        const keyword = String(
            params?.keyword || ''
        ).trim();

        const salesOffices = normalizeFilterValues(
            params?.sales_office ??
            params?.['sales_office[]']
        );

        const customers = normalizeFilterValues(
            params?.customer ??
            params?.['customer[]']
        );

        /*
         * STATUS TUKAR FAKTUR
         *
         * ALL
         * BELUM_DITUKAR
         * SUDAH_DITUKAR
         */
        const status = String(
            params?.status || 'ALL'
        ).trim().toUpperCase();

        /*
         * STATUS VERIFIKASI
         *
         * ALL
         * MENUNGGU_VERIFIKASI
         * DITERIMA
         * DITOLAK
         */
        const statusVerifikasi = String(
            params?.status_verifikasi || 'ALL'
        ).trim().toUpperCase();

        const startDate = String(
            params?.start_date || ''
        ).trim();

        const endDate = String(
            params?.end_date || ''
        ).trim();

        let condition = '';

        const bind = {
            limit,
            offset
        };

        /*
         * SEARCH
         */
        if (keyword) {
            condition += `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
                    OR p.cabang ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR p.document_type ILIKE :keyword
                    OR p.posting_date::text ILIKE :keyword
                    OR p.jatuh_tempo::text ILIKE :keyword
                    OR mc.name ILIKE :keyword
                    OR mr.ur_ref ILIKE :keyword
                    OR mp.nama_principle ILIKE :keyword
                )
            `;

            bind.keyword = `%${keyword}%`;
        }

        /*
         * FILTER CABANG
         */
        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND p.cabang IN (:sales_offices)
            `;

            bind.sales_offices = salesOffices;
        }

        /*
         * FILTER CUSTOMER
         */
        if (
            customers.length &&
            !customers.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND p.customer IN (:customers)
            `;

            bind.customers = customers;
        }

        /*
         * FILTER STATUS TUKAR FAKTUR
         *
         * BELUM_DITUKAR
         * = belum mempunyai data d_tukar_faktur
         *
         * SUDAH_DITUKAR
         * = sudah mempunyai data d_tukar_faktur
         */
        if (
            status &&
            status !== 'ALL'
        ) {
            const allowedStatus = [
                'BELUM_DITUKAR',
                'SUDAH_DITUKAR'
            ];

            if (!allowedStatus.includes(status)) {
                throw new Error(
                    'Status hanya boleh BELUM_DITUKAR atau SUDAH_DITUKAR'
                );
            }

            if (status === 'BELUM_DITUKAR') {
                condition += `
                    AND tf.tukar_faktur_id IS NULL
                `;
            }

            if (status === 'SUDAH_DITUKAR') {
                condition += `
                    AND tf.tukar_faktur_id IS NOT NULL
                `;
            }
        }

        /*
         * FILTER STATUS VERIFIKASI
         *
         * MENUNGGU_VERIFIKASI
         * = fp.kd_status IS NULL
         *
         * DITERIMA
         * = fp.kd_status = 'S'
         *
         * DITOLAK
         * = fp.kd_status = 'T'
         */
        if (
            statusVerifikasi &&
            statusVerifikasi !== 'ALL'
        ) {
            const allowedStatusVerifikasi = [
                'MENUNGGU_VERIFIKASI',
                'DITERIMA',
                'DITOLAK'
            ];

            if (
                !allowedStatusVerifikasi.includes(
                    statusVerifikasi
                )
            ) {
                throw new Error(
                    'Status verifikasi hanya boleh MENUNGGU_VERIFIKASI, DITERIMA atau DITOLAK'
                );
            }

            /*
             * Menunggu Verifikasi
             */
            if (
                statusVerifikasi === 'MENUNGGU_VERIFIKASI'
            ) {
                condition += `
                    AND tf.tukar_faktur_id IS NOT NULL
                    AND fp.kd_status IS NULL
                `;
            }

            /*
             * Diterima
             */
            if (
                statusVerifikasi === 'DITERIMA'
            ) {
                condition += `
                    AND tf.tukar_faktur_id IS NOT NULL
                    AND fp.kd_status = 'S'
                `;
            }

            /*
             * Ditolak
             */
            if (
                statusVerifikasi === 'DITOLAK'
            ) {
                condition += `
                    AND tf.tukar_faktur_id IS NOT NULL
                    AND fp.kd_status = 'T'
                `;
            }
        }

        /*
         * FILTER TANGGAL AWAL
         */
        if (startDate) {
            condition += `
                AND p.posting_date >= :start_date
            `;

            bind.start_date = startDate;
        }

        /*
         * FILTER TANGGAL AKHIR
         */
        if (endDate) {
            condition += `
                AND p.posting_date <= :end_date
            `;

            bind.end_date = endDate;
        }

        /*
         * LIST DATA
         */
        const listQuery = query.getDataTukarFaktur
            .replace(
                ':condition',
                condition
            );

        const listData = await db.query(
            listQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
                logging: console.log
            }
        );

        /*
         * COUNT DATA
         */
        const countQuery = query.countDataTukarFaktur
            .replace(
                ':condition',
                condition
            );

        const countData = await db.query(
            countQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );

        const totalData = Number(
            countData?.[0]?.total || 0
        );

        const totalHalaman = Math.ceil(
            totalData / limit
        );

        /*
         * SUMMARY
         */
        const summaryQuery = query.summaryDataTukarFaktur
            .replace(
                ':condition',
                condition
            );

        const summaryResult = await db.query(
            summaryQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );

        const summary = summaryResult?.[0] || {};

        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary: {
                total_faktur: Number(
                    summary?.total_faktur || 0
                ),
                sudah_ditukar: Number(
                    summary?.sudah_ditukar || 0
                ),
                belum_ditukar: Number(
                    summary?.belum_ditukar || 0
                )
            }
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA TUKAR FAKTUR:',
            error
        );

        throw error;
    }
};

exports.getDataVerifikasiTukarFaktur = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value)
                ? value
                : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const offset = (page - 1) * limit;

        const keyword = String(
            params?.keyword || ''
        ).trim();

        const salesOffices = normalizeFilterValues(
            params?.sales_office ??
            params?.['sales_office[]']
        );

        const customers = normalizeFilterValues(
            params?.customer ??
            params?.['customer[]']
        );

        const status = String(
            params?.status || 'ALL'
        ).trim().toUpperCase();

        const startDate = String(
            params?.start_date || ''
        ).trim();

        const endDate = String(
            params?.end_date || ''
        ).trim();

        let condition = '';

        const bind = {
            limit,
            offset
        };

        /*
         * HANYA DATA YANG SUDAH MELAKUKAN TUKAR FAKTUR
         */
        condition += `
            AND tf.tukar_faktur_id IS NOT NULL
        `;

        /*
         * SEARCH
         */
        if (keyword) {
            condition += `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
                    OR p.cabang ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR p.document_type ILIKE :keyword
                    OR p.posting_date::text ILIKE :keyword
                    OR p.jatuh_tempo::text ILIKE :keyword
                    OR mc.name ILIKE :keyword
                    OR mr.ur_ref ILIKE :keyword
                    OR mp.nama_principle ILIKE :keyword
                    OR fp.kd_status ILIKE :keyword
                )
            `;

            bind.keyword = `%${keyword}%`;
        }

        /*
         * FILTER CABANG
         */
        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND p.cabang IN (:sales_offices)
            `;

            bind.sales_offices = salesOffices;
        }

        /*
         * FILTER CUSTOMER
         */
        if (
            customers.length &&
            !customers.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND p.customer IN (:customers)
            `;

            bind.customers = customers;
        }

        /*
         * FILTER STATUS VERIFIKASI
         *
         * fp.kd_status:
         *
         * NULL = MENUNGGU VERIFIKASI
         * S    = DITERIMA
         * T    = DITOLAK
         */
        if (
            status &&
            status !== 'ALL'
        ) {
            const allowedStatus = [
                'MENUNGGU_VERIFIKASI',
                'DITERIMA',
                'DITOLAK'
            ];

            if (!allowedStatus.includes(status)) {
                throw new Error(
                    'Status hanya boleh MENUNGGU_VERIFIKASI, DITERIMA atau DITOLAK'
                );
            }

            if (
                status === 'MENUNGGU_VERIFIKASI'
            ) {
                condition += `
                    AND fp.kd_status IS NULL
                `;
            }

            if (
                status === 'DITERIMA'
            ) {
                condition += `
                    AND fp.kd_status = 'S'
                `;
            }

            if (
                status === 'DITOLAK'
            ) {
                condition += `
                    AND fp.kd_status = 'T'
                `;
            }
        }

        /*
         * FILTER TANGGAL AWAL
         */
        if (startDate) {
            condition += `
                AND p.posting_date >= :start_date
            `;

            bind.start_date = startDate;
        }

        /*
         * FILTER TANGGAL AKHIR
         */
        if (endDate) {
            condition += `
                AND p.posting_date < (
                    CAST(:end_date AS DATE) + INTERVAL '1 day'
                )
            `;

            bind.end_date = endDate;
        }

        /*
         * LIST DATA
         */
        const listQuery =
            query.getDataVerifikasiTukarFaktur
                .replace(
                    ':condition',
                    condition
                );

        const listData = await db.query(
            listQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
                logging: console.log
            }
        );

        /*
         * COUNT DATA
         */
        const countQuery =
            query.countDataVerifikasiTukarFaktur
                .replace(
                    ':condition',
                    condition
                );

        const countData = await db.query(
            countQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );

        const totalData = Number(
            countData?.[0]?.total || 0
        );

        const totalHalaman = Math.ceil(
            totalData / limit
        );

        /*
         * SUMMARY
         */
        const summaryQuery =
            query.summaryDataVerifikasiTukarFaktur
                .replace(
                    ':condition',
                    condition
                );

        const summaryResult = await db.query(
            summaryQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );

        const summary =
            summaryResult?.[0] || {};

        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary: {
                total_faktur: Number(
                    summary?.total_faktur || 0
                ),
                menunggu_verifikasi: Number(
                    summary?.menunggu_verifikasi || 0
                ),
                diterima: Number(
                    summary?.diterima || 0
                ),
                ditolak: Number(
                    summary?.ditolak || 0
                )
            }
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA VERIFIKASI TUKAR FAKTUR:',
            error
        );

        throw error;
    }
};

exports.getDataVerifikasiPembayaran = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value)
                ? value
                : [value];
            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 10;
        const offset = (page - 1) * limit;
        const keyword = String(params?.keyword || '').trim();
        const salesOffices = normalizeFilterValues(
            params?.sales_office ??
            params?.['sales_office[]']
        );
        const customers = normalizeFilterValues(
            params?.customer ??
            params?.['customer[]']
        );
        const status = String(params?.status || 'ALL').trim().toUpperCase();
        const startDate = String(params?.start_date || '').trim();
        const endDate = String(params?.end_date || '').trim();
        let condition = '';
        const bind = {
            limit,
            offset
        };
        /*
         * SEARCH
         */
        if (keyword) {
            condition += `
                AND (
                    COALESCE(dp.no_billing,'') ILIKE :keyword
                    OR COALESCE(p.no_faktur,'') ILIKE :keyword
                    OR COALESCE(p.customer,'') ILIKE :keyword
                    OR COALESCE(mc.name,'') ILIKE :keyword
                    OR COALESCE(p.sales,'') ILIKE :keyword
                    OR COALESCE(p.nama_sales,'') ILIKE :keyword
                    OR COALESCE(p.cabang,'') ILIKE :keyword
                    OR COALESCE(mr.ur_ref,'') ILIKE :keyword
                    OR COALESCE(mu.nama,'') ILIKE :keyword
                    OR COALESCE(dp.metode_pembayaran,'') ILIKE :keyword
                    OR COALESCE(ds.kd_status,'') ILIKE :keyword
                    OR COALESCE(ds.keterangan,'') ILIKE :keyword
                )
            `;
            bind.keyword = `%${keyword}%`;
        }
        /*
         * FILTER CABANG
         */
        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND p.cabang IN (:sales_offices)
            `;
            bind.sales_offices = salesOffices;
        }
        /*
         * FILTER CUSTOMER
         */
        if (
            customers.length &&
            !customers.some(
                (item) => item.toUpperCase() === 'ALL'
            )
        ) {
            condition += `
                AND p.customer IN (:customers)
            `;
            bind.customers = customers;
        }
        /*
         * FILTER STATUS
         *
         * NULL = MENUNGGU VERIFIKASI
         * S    = PEMBAYARAN DITERIMA
         * T    = PEMBAYARAN DITOLAK
         */
        if (
            status &&
            status !== 'ALL'
        ) {
            const allowedStatus = [
                'MENUNGGU_VERIFIKASI',
                'PEMBAYARAN_DITERIMA',
                'PEMBAYARAN_DITOLAK'
            ];
            if (!allowedStatus.includes(status)) {
                throw new Error(
                    'Status hanya boleh MENUNGGU_VERIFIKASI, PEMBAYARAN_DITERIMA atau PEMBAYARAN_DITOLAK'
                );
            }
            if (
                status === 'MENUNGGU_VERIFIKASI'
            ) {
                condition += `
                    AND ds.kd_status IS NULL
                `;
            }
            if (
                status === 'PEMBAYARAN_DITERIMA'
            ) {
                condition += `
                    AND ds.kd_status = 'S'
                `;
            }
            if (
                status === 'PEMBAYARAN_DITOLAK'
            ) {
                condition += `
                    AND ds.kd_status = 'T'
                `;
            }
        }
        /*
         * FILTER TANGGAL PEMBAYARAN
         */
        if (startDate) {
            condition += `
                AND dp.tanggal_pembayaran >= :start_date
            `;
            bind.start_date = startDate;
        }
        if (endDate) {
            condition += `
                AND dp.tanggal_pembayaran < (
                    CAST(:end_date AS DATE) + INTERVAL '1 day'
                )
            `;
            bind.end_date = endDate;
        }
        /*
         * LIST DATA
         */
        const listQuery =
            query.getDataVerifikasiPembayaran
                .replace(
                    ':condition',
                    condition
                );
        const listData = await db.query(
            listQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
                logging: console.log
            }
        );
        /*
         * COUNT DATA
         */
        const countQuery =
            query.countDataVerifikasiPembayaran
                .replace(
                    ':condition',
                    condition
                );
        const countData = await db.query(
            countQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );
        const totalData = Number(
            countData?.[0]?.total || 0
        );
        const totalHalaman = Math.ceil(
            totalData / limit
        );
        /*
         * SUMMARY
         */
        const summaryQuery =
            query.summaryDataVerifikasiPembayaran
                .replace(
                    ':condition',
                    condition
                );
        const summaryResult = await db.query(
            summaryQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT
            }
        );
        const summary =
            summaryResult?.[0] || {};
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary: {
                total_verifikasi:
                    Number(
                        summary?.total_verifikasi ??
                        summary?.total_faktur ??
                        summary?.total_pembayaran ??
                        0
                    ),
                menunggu_verifikasi:
                    Number(
                        summary?.menunggu_verifikasi ??
                        0
                    ),
                pembayaran_diterima:
                    Number(
                        summary?.pembayaran_diterima ??
                        summary?.diterima ??
                        0
                    ),
                pembayaran_ditolak:
                    Number(
                        summary?.pembayaran_ditolak ??
                        summary?.ditolak ??
                        0
                    ),
                total_nominal_menunggu:
                    Number(
                        summary?.total_nominal_menunggu ??
                        0
                    )
            }
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA VERIFIKASI PEMBAYARAN:',
            error
        );
        throw error;
    }
};

exports.insertTukarFaktur = async (payload, files, transaction) => {
    try {

        if (
            !Array.isArray(payload?.faktur) ||
            payload.faktur.length === 0
        ) {
            throw new Error('Data faktur wajib diisi');
        }

        if (!files || files.length === 0) {
            throw new Error('File bukti tukar faktur wajib diupload');
        }

        const piutangIds = payload.faktur
            .map((item) => item?.piutang_id)
            .filter(Boolean);

        if (piutangIds.length === 0) {
            throw new Error('piutang_id wajib diisi');
        }

        /*
         * Cek duplicate piutang di dalam payload
         */
        const uniquePiutangIds = [...new Set(piutangIds)];

        if (
            uniquePiutangIds.length !== piutangIds.length
        ) {
            throw new Error(
                'Terdapat piutang yang sama dalam proses Tukar Faktur'
            );
        }

        /*
         * Cek apakah piutang sudah pernah
         * melakukan proses Tukar Faktur
         */
        const existingData =
            await model.d_tukar_faktur.findAll({
                where: {
                    piutang_id: uniquePiutangIds
                },
                transaction
            });

        if (
            existingData &&
            existingData.length > 0
        ) {
            throw new Error(
                `Terdapat ${existingData.length} piutang yang sudah melakukan proses Tukar Faktur`
            );
        }

        /*
         * Upload 1 file untuk seluruh faktur
         */
        const uploadDocument =
            await this.processUploadFile(
                payload,
                files,
                transaction
            );

        const createdAt = new Date();

        const dataInsert = payload.faktur.map((item) => ({
            tukar_faktur_id:
                uuidv4(),

            faktur_petugas_id:
                item.faktur_petugas_id,

            piutang_id:
                item.piutang_id,

            files:
                uploadDocument[0]?.path !== null ? uploadDocument[0]?.path.replace(/\\/g, '/') : "",

            created_by:
                payload?.created_by ||
                'SYSTEM',

            created_at:
                createdAt
        }));

        /*
         * Insert banyak data sekaligus
         */
        const tukarFaktur =
            await model.d_tukar_faktur.bulkCreate(
                dataInsert,
                {
                    transaction,
                    returning: true
                }
            );

        return {
            total:
                tukarFaktur.length,

            data:
                tukarFaktur
        };

    } catch (error) {

        console.error(
            'ERROR SERVICE INSERT TUKAR FAKTUR:',
            error
        );

        throw error;
    }
};

exports.insertBayarFaktur = async (
    payload,
    files,
    transaction
) => {
    try {

        if (
            !Array.isArray(payload?.faktur) ||
            payload.faktur.length === 0
        ) {
            throw new Error(
                'Data faktur wajib diisi'
            );
        }

        if (
            !files ||
            files.length === 0
        ) {
            throw new Error(
                'File bukti pembayaran wajib diupload'
            );
        }

        const jenisPembayaran =
            String(
                payload?.jenis_pembayaran || ''
            ).toUpperCase();

        const allowedJenisPembayaran = [
            'FULL_PAYMENT',
            'PARTIAL_PAYMENT',
            'MENUNGGU_PEMBAYARAN'
        ];

        if (
            !allowedJenisPembayaran.includes(
                jenisPembayaran
            )
        ) {
            throw new Error(
                'Jenis pembayaran tidak valid'
            );
        }

        if (
            !payload?.metode_pembayaran
        ) {
            throw new Error(
                'Metode pembayaran wajib diisi'
            );
        }

        const piutangIds =
            payload.faktur
                .map(
                    item =>
                        item?.piutang_id
                )
                .filter(Boolean);

        if (
            piutangIds.length === 0
        ) {
            throw new Error(
                'piutang_id wajib diisi'
            );
        }

        const uniquePiutangIds = [
            ...new Set(
                piutangIds
            )
        ];

        if (
            uniquePiutangIds.length !==
            piutangIds.length
        ) {
            throw new Error(
                'Terdapat piutang yang sama dalam proses pembayaran'
            );
        }

        const dataPiutang =
            await model.d_piutang.findAll({
                where: {
                    piutang_id:
                        uniquePiutangIds
                },
                transaction
            });

        if (
            !dataPiutang ||
            dataPiutang.length !==
            uniquePiutangIds.length
        ) {
            throw new Error(
                'Terdapat piutang yang tidak ditemukan'
            );
        }

        /*
         * Upload bukti pembayaran
         */
        const uploadDocument =
            await this.processUploadFile(
                payload,
                files,
                transaction
            );

        const filePath =
            uploadDocument?.[0]?.path
                ? uploadDocument[0].path
                    .replace(/\\/g, '/')
                : '';

        if (!filePath) {
            throw new Error(
                'File bukti pembayaran gagal disimpan'
            );
        }

        const tanggalPembayaran =
            payload?.tanggal_pembayaran
                ? new Date(
                    payload.tanggal_pembayaran
                )
                : new Date();

        const pembayaranData = [];

        for (
            const item of payload.faktur
        ) {

            /*
             * SALDO PIUTANG
             *
             * Nilai ini berasal dari frontend:
             *
             * saldo_piutang =
             * dpp - collections
             */
            const saldoPiutang =
                Number(
                    item?.saldo_piutang ??
                    item?.sisa_tagihan ??
                    item?.nominal_tagihan ??
                    0
                );

            let totalBayar = 0;
            let nominalBayar = 0;

            /*
             * FULL PAYMENT
             */
            if (
                jenisPembayaran ===
                'FULL_PAYMENT'
            ) {

                totalBayar =
                    saldoPiutang;

                nominalBayar =
                    saldoPiutang;
            }

            /*
             * PARTIAL PAYMENT
             */
            else if (
                jenisPembayaran ===
                'PARTIAL_PAYMENT'
            ) {

                totalBayar =
                    saldoPiutang;

                nominalBayar =
                    Number(
                        item?.nominal_pembayaran ||
                        0
                    );
            }

            /*
             * MENUNGGU PEMBAYARAN
             */
            else if (
                jenisPembayaran ===
                'MENUNGGU_PEMBAYARAN'
            ) {

                totalBayar =
                    saldoPiutang;

                nominalBayar = 0;
            }

            /*
             * VALIDASI NOMINAL
             */
            if (
                jenisPembayaran !==
                'MENUNGGU_PEMBAYARAN' &&
                nominalBayar <= 0
            ) {
                throw new Error(
                    `Nominal pembayaran untuk faktur ${item?.no_faktur || '-'} harus lebih dari 0`
                );
            }

            /*
             * VALIDASI PEMBAYARAN
             * TIDAK BOLEH MELEBIHI
             * SALDO PIUTANG
             */
            if (
                jenisPembayaran ===
                'PARTIAL_PAYMENT' &&
                nominalBayar > saldoPiutang
            ) {
                throw new Error(
                    `Nominal pembayaran faktur ${item?.no_faktur || '-'} melebihi saldo piutang`
                );
            }

            /*
             * INSERT d_pembayaran
             */
            const pembayaran =
                await model.d_pembayaran.create(
                    {
                        pembayaran_id:
                            uuidv4(),

                        bill_to_party:
                            item?.customer_id ||
                            item?.customer ||
                            null,

                        no_billing:
                            item?.no_billing ||
                            null,

                        total_bayar:
                            totalBayar,

                        nominal_bayar:
                            nominalBayar,

                        tanggal_pembayaran:
                            tanggalPembayaran,

                        metode_pembayaran:
                            payload?.metode_pembayaran,

                        created_by:
                            payload?.created_by ||
                            'SYSTEM',

                        created_at:
                            new Date(),

                        files:
                            filePath,

                        keterangan:
                            payload?.keterangan ||
                            null
                    },
                    {
                        transaction,
                        returning: true
                    }
                );

            pembayaranData.push(
                pembayaran
            );

        }

        return {
            total:
                pembayaranData.length,

            jenis_pembayaran:
                jenisPembayaran,

            metode_pembayaran:
                payload?.metode_pembayaran,

            data:
                pembayaranData
        };

    } catch (error) {

        console.error(
            'ERROR SERVICE INSERT BAYAR FAKTUR:',
            error
        );

        throw error;
    }
};

exports.verifikasiTukarFaktur = async (
    payload,
    transaction
) => {
    try {

        const {
            tukar_faktur_id,
            piutang_id,
            faktur_petugas_id,
            kegiatan,
            kd_status,
            keterangan,
            no_faktur
        } = payload;

        /*
         * =====================================================
         * VALIDASI
         * =====================================================
         */

        if (!tukar_faktur_id) {
            throw new Error(
                'tukar_faktur_id wajib diisi'
            );
        }

        if (!faktur_petugas_id) {
            throw new Error(
                'faktur_petugas_id wajib diisi'
            );
        }

        if (!kd_status) {
            throw new Error(
                'kd_status wajib diisi'
            );
        }

        /*
         * Status:
         * S = Diterima
         * T = Ditolak
         */

        if (
            ![
                'S',
                'T'
            ].includes(kd_status)
        ) {
            throw new Error(
                'kd_status tidak valid'
            );
        }

        /*
         * Jika ditolak, keterangan wajib diisi
         */

        if (
            kd_status === 'T' &&
            !String(
                keterangan || ''
            ).trim()
        ) {
            throw new Error(
                'Keterangan penolakan wajib diisi'
            );
        }


        /*
         * =====================================================
         * CEK TUKAR FAKTUR
         * =====================================================
         */

        const tukarFaktur =
            await model.d_tukar_faktur.findOne({
                where: {
                    tukar_faktur_id
                },
                transaction
            });

        if (!tukarFaktur) {
            throw new Error(
                'Data Tukar Faktur tidak ditemukan'
            );
        }


        /*
         * =====================================================
         * VALIDASI PIUTANG
         * =====================================================
         */

        if (
            piutang_id &&
            tukarFaktur.piutang_id !==
            piutang_id
        ) {
            throw new Error(
                'piutang_id tidak sesuai dengan data Tukar Faktur'
            );
        }


        /*
         * =====================================================
         * CEK PENUGASAN FAKTUR
         * =====================================================
         *
         * kd_status pada d_faktur_petugas adalah
         * status aktual verifikasi.
         */

        const fakturPetugas =
            await model.d_faktur_petugas.findOne({
                where: {
                    faktur_petugas_id,
                    piutang_id:
                        tukarFaktur.piutang_id,
                    kegiatan:
                        'TUKAR_FAKTUR',
                    is_active:
                        'Y'
                },
                transaction
            });

        if (!fakturPetugas) {
            throw new Error(
                'Data penugasan Faktur tidak ditemukan'
            );
        }


        /*
         * =====================================================
         * CEK SUDAH PERNAH DIVERIFIKASI
         * =====================================================
         *
         * Status aktual dibaca dari
         * d_faktur_petugas.kd_status
         */

        if (
            fakturPetugas.kd_status !== null &&
            fakturPetugas.kd_status !== undefined &&
            fakturPetugas.kd_status !== ''
        ) {
            throw new Error(
                'Tukar Faktur sudah pernah diverifikasi'
            );
        }


        /*
         * =====================================================
         * TANGGAL VERIFIKASI
         * =====================================================
         */

        const tanggalVerifikasi =
            new Date();


        /*
         * =====================================================
         * UPDATE STATUS AKTUAL
         * =====================================================
         *
         * Source of truth status verifikasi
         * berada di d_faktur_petugas.
         */

        await fakturPetugas.update(
            {
                kd_status:
                    kd_status
            },
            {
                transaction
            }
        );


        /*
         * =====================================================
         * INSERT HISTORY
         * =====================================================
         *
         * d_status hanya digunakan sebagai
         * history perubahan status.
         *
         * created_at = tanggal verifikasi
         */

        const dataStatus = {
            foreign_id:
                faktur_petugas_id,

            kegiatan:
                kegiatan ||
                'TUKAR_FAKTUR',

            kd_status:
                kd_status,

            keterangan:
                String(
                    keterangan || ''
                ).trim(),

            created_by:
                payload?.created_by ||
                'SYSTEM',

            created_at:
                tanggalVerifikasi
        };


        const status =
            await model.d_status.create(
                dataStatus,
                {
                    transaction
                }
            );


        /*
         * =====================================================
         * RESPONSE
         * =====================================================
         */

        return {
            tukar_faktur_id:
                tukar_faktur_id,

            piutang_id:
                tukarFaktur.piutang_id,

            faktur_petugas_id:
                faktur_petugas_id,

            no_faktur:
                no_faktur ||
                null,

            kd_status:
                kd_status,

            status_verifikasi:
                kd_status === 'S'
                    ? 'DITERIMA'
                    : 'DITOLAK',

            tanggal_verifikasi:
                tanggalVerifikasi,

            keterangan:
                String(
                    keterangan || ''
                ).trim(),

            history:
                status
        };

    } catch (error) {

        console.error(
            'ERROR SERVICE VERIFIKASI TUKAR FAKTUR:',
            error
        );

        throw error;
    }
};

exports.getDataBayarFaktur = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value)
                ? value
                : [value];

            return values
                .filter(
                    (item) =>
                        item !== undefined &&
                        item !== null
                )
                .flatMap((item) => {
                    if (
                        typeof item === 'string' &&
                        item.includes(',')
                    ) {
                        return item
                            .split(',')
                            .map((value) =>
                                String(value).trim()
                            );
                    }

                    return [
                        String(item).trim()
                    ];
                })
                .filter(Boolean);
        };

        /*
         * =====================================================
         * PAGINATION
         * =====================================================
         */
        const page = Math.max(
            Number(params?.page) || 1,
            1
        );

        const limit = Math.max(
            Number(params?.limit) || 10,
            1
        );

        const offset =
            (page - 1) * limit;

        /*
         * =====================================================
         * KEYWORD
         * =====================================================
         */
        const keyword = String(
            params?.keyword || ''
        ).trim();

        /*
         * =====================================================
         * SALES OFFICE
         * =====================================================
         */
        const salesOffices =
            normalizeFilterValues(
                params?.sales_office ??
                params?.['sales_office[]']
            );

        /*
         * =====================================================
         * CUSTOMER
         * =====================================================
         */
        const customers =
            normalizeFilterValues(
                params?.customer ??
                params?.['customer[]']
            );

        /*
         * =====================================================
         * STATUS PEMBAYARAN
         * =====================================================
         */
        const statusValues =
            normalizeFilterValues(
                params?.status ??
                params?.['status[]']
            ).map((item) =>
                item.toUpperCase()
            );

        /*
         * =====================================================
         * STATUS VERIFIKASI
         * =====================================================
         */
        const statusVerifikasiValues =
            normalizeFilterValues(
                params?.status_verifikasi ??
                params?.['status_verifikasi[]']
            ).map((item) =>
                item.toUpperCase()
            );

        /*
         * =====================================================
         * DATE
         * =====================================================
         */
        const startDate = String(
            params?.start_date || ''
        ).trim();

        const endDate = String(
            params?.end_date || ''
        ).trim();

        /*
         * =====================================================
         * CONDITION
         * =====================================================
         */
        let condition = '';

        /*
         * =====================================================
         * BIND
         * =====================================================
         */
        const bind = {
            limit,
            offset
        };

        /*
         * =====================================================
         * SEARCH KEYWORD
         * =====================================================
         */
        if (keyword) {
            condition += `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
                    OR p.cabang ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR p.document_type ILIKE :keyword
                    OR p.posting_date::text ILIKE :keyword
                    OR p.jatuh_tempo::text ILIKE :keyword

                    OR mc.name ILIKE :keyword
                    OR mr.ur_ref ILIKE :keyword
                    OR mp.nama_principle ILIKE :keyword

                    OR fp.nip ILIKE :keyword
                    OR mu.nama ILIKE :keyword
                    OR fp.kd_status ILIKE :keyword

                    OR cod.total_nominal_billing::text
                       ILIKE :keyword

                    OR pay.total_nominal_bayar::text
                       ILIKE :keyword

                    OR verifikasi.kd_status_verifikasi
                       ILIKE :keyword
                )
            `;

            bind.keyword =
                `%${keyword}%`;
        }

        /*
         * =====================================================
         * FILTER CABANG
         * =====================================================
         */
        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) =>
                    item.toUpperCase() ===
                    'ALL'
            )
        ) {
            condition += `
                AND p.cabang IN (:sales_offices)
            `;

            bind.sales_offices =
                salesOffices;
        }

        /*
         * =====================================================
         * FILTER CUSTOMER
         * =====================================================
         */
        if (
            customers.length &&
            !customers.some(
                (item) =>
                    item.toUpperCase() ===
                    'ALL'
            )
        ) {
            condition += `
                AND p.customer IN (:customers)
            `;

            bind.customers =
                customers;
        }

        /*
         * =====================================================
         * FILTER STATUS PEMBAYARAN
         * =====================================================
         */
        const allowedStatus = [
            'BELUM_DIBAYAR',
            'PARTIAL',
            'MENUNGGU_PEMBAYARAN',
            'SUDAH_DIBAYAR'
        ];

        const filteredStatusValues =
            statusValues.filter(
                (item) =>
                    item !== 'ALL'
            );

        if (
            filteredStatusValues.length
        ) {
            const invalidStatus =
                filteredStatusValues.find(
                    (item) =>
                        !allowedStatus.includes(
                            item
                        )
                );

            if (invalidStatus) {
                throw new Error(
                    'Status hanya boleh BELUM_DIBAYAR, PARTIAL, MENUNGGU_PEMBAYARAN atau SUDAH_DIBAYAR'
                );
            }

            /*
             * -------------------------------------------------
             * SINGLE STATUS
             * -------------------------------------------------
             *
             * Kita gunakan OR supaya jika frontend
             * mengirim lebih dari satu status tetap aman.
             */
            const statusConditions = [];

            /*
             * BELUM DIBAYAR
             */
            if (
                filteredStatusValues.includes(
                    'BELUM_DIBAYAR'
                )
            ) {
                statusConditions.push(`
                    (
                        COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) <= 0

                        AND COALESCE(
                            p.dpp,
                            0
                        ) > 0
                    )
                `);
            }

            /*
             * PARTIAL
             */
            if (
                filteredStatusValues.includes(
                    'PARTIAL'
                )
            ) {
                statusConditions.push(`
                    (
                        COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) > 0

                        AND COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) < COALESCE(
                            p.dpp,
                            0
                        )
                    )
                `);
            }

            /*
             * SUDAH DIBAYAR
             */
            if (
                filteredStatusValues.includes(
                    'SUDAH_DIBAYAR'
                )
            ) {
                statusConditions.push(`
                    (
                        COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) >= COALESCE(
                            p.dpp,
                            0
                        )

                        AND COALESCE(
                            p.dpp,
                            0
                        ) > 0
                    )
                `);
            }

            /*
             * MENUNGGU PEMBAYARAN
             */
            if (
                filteredStatusValues.includes(
                    'MENUNGGU_PEMBAYARAN'
                )
            ) {
                statusConditions.push(`
                    (
                        1 = 0
                    )
                `);
            }

            if (
                statusConditions.length
            ) {
                condition += `
                    AND (
                        ${statusConditions.join(
                    ' OR '
                )}
                    )
                `;
            }
        }

        /*
         * =====================================================
         * FILTER STATUS VERIFIKASI
         * =====================================================
         */
        const allowedVerificationStatus = [
            'VERIFIED',
            'BELUM_DIVERIFIKASI'
        ];

        const filteredVerificationValues =
            statusVerifikasiValues.filter(
                (item) =>
                    item !== 'ALL'
            );

        if (
            filteredVerificationValues.length
        ) {
            const invalidVerificationStatus =
                filteredVerificationValues.find(
                    (item) =>
                        !allowedVerificationStatus.includes(
                            item
                        )
                );

            if (
                invalidVerificationStatus
            ) {
                throw new Error(
                    'Status verifikasi hanya boleh VERIFIED atau BELUM_DIVERIFIKASI'
                );
            }

            const verificationConditions =
                [];

            /*
             * VERIFIED
             */
            if (
                filteredVerificationValues.includes(
                    'VERIFIED'
                )
            ) {
                verificationConditions.push(`
                    (
                        verifikasi.kd_status_verifikasi = 'S'
                    )
                `);
            }

            /*
             * BELUM DIVERIFIKASI
             */
            if (
                filteredVerificationValues.includes(
                    'BELUM_DIVERIFIKASI'
                )
            ) {
                verificationConditions.push(`
                    (
                        verifikasi.kd_status_verifikasi IS NULL
                    )
                `);
            }

            /*
             * Jika dua-duanya dipilih,
             * otomatis OR.
             */
            if (
                verificationConditions.length
            ) {
                condition += `
                    AND (
                        ${verificationConditions.join(
                    ' OR '
                )}
                    )
                `;
            }
        }

        /*
         * =====================================================
         * FILTER TANGGAL AWAL
         * =====================================================
         */
        if (startDate) {
            condition += `
                AND p.posting_date >= :start_date
            `;

            bind.start_date =
                startDate;
        }

        /*
         * =====================================================
         * FILTER TANGGAL AKHIR
         * =====================================================
         */
        if (endDate) {
            condition += `
                AND p.posting_date < (
                    CAST(:end_date AS DATE)
                    + INTERVAL '1 day'
                )
            `;

            bind.end_date =
                endDate;
        }

        /*
         * =====================================================
         * LIST DATA
         * =====================================================
         */
        const listQuery =
            query.getDataBayarFaktur.replace(
                ':condition',
                condition
            );

        const listData =
            await db.query(
                listQuery,
                {
                    replacements: bind,
                    type:
                        db.QueryTypes.SELECT,
                    logging: console.log
                }
            );

        /*
         * =====================================================
         * HISTORY PEMBAYARAN
         * =====================================================
         */
        const getHistoryPembayaran =
            async (noBilling) => {
                try {
                    if (!noBilling) {
                        return [];
                    }

                    const result =
                        await db.query(
                            query.getHistoryPembayaranBayarFaktur,
                            {
                                replacements: {
                                    no_billing:
                                        noBilling
                                },
                                type:
                                    db.QueryTypes
                                        .SELECT
                            }
                        );

                    if (
                        Array.isArray(
                            result?.[0]
                                ?.h_pembayaran
                        )
                    ) {
                        return result[0]
                            .h_pembayaran;
                    }

                    if (
                        typeof result?.[0]
                            ?.h_pembayaran ===
                        'string'
                    ) {
                        try {
                            const parsed =
                                JSON.parse(
                                    result[0]
                                        .h_pembayaran
                                );

                            return Array.isArray(
                                parsed
                            )
                                ? parsed
                                : [];
                        } catch (error) {
                            return [];
                        }
                    }

                    if (
                        Array.isArray(
                            result
                        )
                    ) {
                        return result;
                    }

                    return [];
                } catch (error) {
                    console.error(
                        'ERROR GET HISTORY PEMBAYARAN:',
                        {
                            no_billing:
                                noBilling,
                            error:
                                error?.message ||
                                error
                        }
                    );

                    return [];
                }
            };

        /*
         * =====================================================
         * TAMBAHKAN HISTORY
         * =====================================================
         */
        const listDataWithHistory =
            await Promise.all(
                (listData || []).map(
                    async (item) => {
                        const h_pembayaran =
                            await getHistoryPembayaran(
                                item?.no_billing
                            );

                        return {
                            ...item,
                            h_pembayaran
                        };
                    }
                )
            );

        /*
         * =====================================================
         * COUNT
         * =====================================================
         */
        const countQuery =
            query.countDataBayarFaktur.replace(
                ':condition',
                condition
            );

        const countData =
            await db.query(
                countQuery,
                {
                    replacements: bind,
                    type:
                        db.QueryTypes.SELECT
                }
            );

        const totalData =
            Number(
                countData?.[0]?.total ||
                0
            );

        const totalHalaman =
            Math.ceil(
                totalData / limit
            );

        /*
         * =====================================================
         * SUMMARY
         * =====================================================
         */
        const summaryQuery =
            query.summaryDataBayarFaktur.replace(
                ':condition',
                condition
            );

        const summaryResult =
            await db.query(
                summaryQuery,
                {
                    replacements: bind,
                    type:
                        db.QueryTypes.SELECT
                }
            );

        const summary =
            summaryResult?.[0] || {};

        /*
         * =====================================================
         * RESPONSE
         * =====================================================
         */
        return {
            total_data:
                totalData,

            total_halaman:
                totalHalaman,

            limit,

            page,

            list_data:
                listDataWithHistory,

            summary: {
                total_faktur:
                    Number(
                        summary?.total_faktur ||
                        0
                    ),

                belum_dibayar:
                    Number(
                        summary?.belum_dibayar ||
                        0
                    ),

                partial:
                    Number(
                        summary?.partial ||
                        0
                    ),

                menunggu_pembayaran:
                    Number(
                        summary
                            ?.menunggu_pembayaran ||
                        0
                    ),

                sudah_dibayar:
                    Number(
                        summary?.sudah_dibayar ||
                        0
                    ),

                total_nominal:
                    Number(
                        summary?.total_nominal ||
                        0
                    ),

                total_collections:
                    Number(
                        summary?.total_collections ||
                        0
                    ),

                total_dibayar:
                    Number(
                        summary?.total_dibayar ||
                        0
                    ),

                total_saldo_piutang:
                    Number(
                        summary
                            ?.total_saldo_piutang ||
                        0
                    )
            }
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA BAYAR FAKTUR:',
            error
        );

        throw error;
    }
};

exports.verifikasiBayarFaktur = async (
    payload,
    transaction
) => {
    try {

        const {
            pembayaran_id,
            piutang_id,
            kegiatan,
            kd_status,
            keterangan,
            no_faktur,
            create_document_number
        } = payload;

        /*
         * =====================================================
         * VALIDASI
         * =====================================================
         */

        if (!pembayaran_id) {
            throw new Error(
                'pembayaran_id wajib diisi'
            );
        }

        if (!kd_status) {
            throw new Error(
                'kd_status wajib diisi'
            );
        }

        /*
         * Status:
         * S = Diterima
         * T = Ditolak
         */

        if (
            ![
                'S',
                'T'
            ].includes(kd_status)
        ) {
            throw new Error(
                'kd_status tidak valid'
            );
        }

        /*
         * Jika ditolak, keterangan wajib diisi
         */

        if (
            kd_status === 'T' &&
            !String(
                keterangan || ''
            ).trim()
        ) {
            throw new Error(
                'Keterangan penolakan wajib diisi'
            );
        }

        /*
         * Create Document Number wajib
         */

        if (
            !String(
                create_document_number || ''
            ).trim()
        ) {
            throw new Error(
                'Create Document Number wajib diisi'
            );
        }


        /*
         * =====================================================
         * CEK PEMBAYARAN
         * =====================================================
         */

        const pembayaran =
            await model.d_pembayaran.findOne({
                where: {
                    pembayaran_id
                },
                transaction
            });

        if (!pembayaran) {
            throw new Error(
                'Data Pembayaran tidak ditemukan'
            );
        }


        /*
         * =====================================================
         * VALIDASI PIUTANG
         * =====================================================
         */

        if (
            piutang_id &&
            pembayaran.piutang_id !==
            piutang_id
        ) {
            throw new Error(
                'piutang_id tidak sesuai dengan data Pembayaran'
            );
        }


        /*
         * =====================================================
         * CEK SUDAH PERNAH DIVERIFIKASI
         * =====================================================
         *
         * Status terakhir diambil dari d_status.
         *
         * foreign_id =
         * pembayaran_id
         *
         * kegiatan =
         * PENAGIHAN
         */

        const lastStatus =
            await model.d_status.findOne({
                where: {
                    foreign_id:
                        pembayaran_id,

                    kegiatan:
                        kegiatan ||
                        'PENAGIHAN'
                },

                order: [
                    [
                        'created_at',
                        'DESC'
                    ]
                ],

                transaction
            });


        /*
         * Jika sudah pernah diverifikasi
         */

        if (
            lastStatus &&
            [
                'S',
                'T'
            ].includes(
                lastStatus.kd_status
            )
        ) {
            throw new Error(
                'Pembayaran sudah pernah diverifikasi'
            );
        }


        /*
         * =====================================================
         * TANGGAL VERIFIKASI
         * =====================================================
         */

        const tanggalVerifikasi =
            new Date();


        /*
         * =====================================================
         * UPDATE CREATE DOCUMENT NUMBER
         * =====================================================
         *
         * Jika field ini memang tersedia
         * di d_pembayaran.
         */

        if (
            create_document_number
        ) {
            await pembayaran.update(
                {
                    create_document_number:
                        String(
                            create_document_number
                        ).trim()
                },
                {
                    transaction
                }
            );
        }


        /*
         * =====================================================
         * INSERT HISTORY STATUS
         * =====================================================
         *
         * d_status digunakan sebagai
         * history perubahan status.
         */

        const dataStatus = {
            foreign_id:
                pembayaran_id,

            kegiatan:
                kegiatan ||
                'PENAGIHAN',

            kd_status:
                kd_status,

            keterangan:
                String(
                    keterangan || ''
                ).trim(),

            created_by:
                payload?.created_by ||
                payload?.user_id ||
                'SYSTEM',

            created_at:
                tanggalVerifikasi
        };


        const status =
            await model.d_status.create(
                dataStatus,
                {
                    transaction
                }
            );


        /*
         * =====================================================
         * RESPONSE
         * =====================================================
         */

        return {
            pembayaran_id:
                pembayaran_id,

            piutang_id:
                pembayaran.piutang_id ||
                piutang_id ||
                null,

            no_faktur:
                no_faktur ||
                null,

            create_document_number:
                create_document_number ||
                null,

            kd_status:
                kd_status,

            status_verifikasi:
                kd_status === 'S'
                    ? 'DITERIMA'
                    : 'DITOLAK',

            tanggal_verifikasi:
                tanggalVerifikasi,

            keterangan:
                String(
                    keterangan || ''
                ).trim(),

            history:
                status
        };

    } catch (error) {

        console.error(
            'ERROR SERVICE VERIFIKASI BAYAR FAKTUR:',
            error
        );

        throw error;
    }
};