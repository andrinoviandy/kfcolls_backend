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

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure:
        String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    requireTLS:
        String(process.env.SMTP_USE_TLS || "true").toLowerCase() === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const logoHeaderPath = path.join(
    __dirname,
    "../../files/logo_kfcolls.png"
);

const logoFixPath = path.join(
    __dirname,
    "../../files/LOGO_FIX.png"
);

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
            const dataUser = await model.m_user.findOne({ where: { user_id: item } })
            const payPush = {
                notifikasi_push_id: uuidv4(),
                notifikasi_id: payload?.notifikasi_id,
                user_id: item,
                username: dataUser?.username
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
        data_error: [],
    };

    if (!payload.length) return result;

    const uploadedPenjualanIds = [];
    const maxErrorPreview = 100;

    /*
     * Pertahankan mapping dataInsert yang sudah ada.
     * Untuk setiap item, mapping menghasilkan satu object
     * dengan seluruh kolom d_penjualan.
     */
    const createdAt = new Date();

    const dataInsert = payload.map((item, index) => ({
        penjualan_id: item?.penjualan_id || uuidv4(),

        // Pertahankan seluruh mapping kolom Anda di sini.
        // Contoh:
        sales_office: item?.sales_office,
        desc_s_office: item?.desc_s_office,
        posting_date: item?.posting_date,
        billing_no: item?.billing_no,

        // ... kolom lain tetap sama seperti mapping lama ...

        is_upload: item?.is_upload ?? 1,
        created_by: item?.created_by || null,
        created_at: createdAt,

        // Untuk menghubungkan error dengan data input.
        _source_index: index,
    }));

    for (const item of dataInsert) {
        const { _source_index, ...data } = item;
        const savepoint = `sp_penjualan_${_source_index}`;

        try {
            /*
             * Savepoint memungkinkan satu insert gagal
             * tanpa membatalkan transaksi batch seluruhnya.
             */
            await db.query(`SAVEPOINT ${savepoint}`, {
                transaction,
            });

            await model.d_penjualan.create(data, {
                transaction,
                validate: true,
            });

            await db.query(`RELEASE SAVEPOINT ${savepoint}`, {
                transaction,
            });

            result.total_success += 1;
            uploadedPenjualanIds.push(data.penjualan_id);
        } catch (error) {
            await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`, {
                transaction,
            });

            await db.query(`RELEASE SAVEPOINT ${savepoint}`, {
                transaction,
            });

            result.total_error += 1;

            if (result.data_error.length < maxErrorPreview) {
                result.data_error.push({
                    id: _source_index,
                    row: _source_index + 2,
                    message:
                        error?.parent?.detail ||
                        error?.message ||
                        "Gagal menyimpan data penjualan.",
                    code: error?.parent?.code || null,
                    data: data,
                });
            }
        }
    }

    /*
     * Proses piutang dan update is_upload hanya untuk
     * data penjualan yang berhasil disimpan.
     */
    if (uploadedPenjualanIds.length > 0) {
        const createdBy =
            dataInsert.find((item) => item.created_by)?.created_by || null;

        await exports.insertDataPiutang(
            uploadedPenjualanIds,
            createdBy,
            transaction
        );

        await model.d_penjualan.update(
            { is_upload: 0 },
            {
                where: {
                    penjualan_id: uploadedPenjualanIds,
                },
                transaction,
            }
        );
    }

    return result;
};


// Normalisasi header: abaikan huruf besar/kecil, spasi, dan tanda baca.
// Contoh: "Bill.Cancel" dan "Bill Cancel" menjadi "billcancel".
const normalizeHeader = (value) =>
    String(value ?? '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

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

const numericFields = new Set([
    'quantity',
    'unit_price_penjualan',
    'dis_pct_zd01',
    'dis_amt_zd01',
    'dis_pct_zd02',
    'dis_amt_zd02',
    'dis_pct_zd03',
    'dis_amt_zd03',
    'dis_pct_zd04',
    'dis_amt_zd04',
    'dis_pct_zd05',
    'dis_amt_zd05',
    'dis_pct_zd06',
    'dis_amt_zd06',
    'disc_upfront_pct_zd07',
    'disc_upfront_amt_zd07',
    'disc_beban_kftd_upf_pct_zd08',
    'disc_beban_kftd_upf_amt_zd08',
    'disc_beban_principle_upf_pct_zd09',
    'disc_beban_principle_upf_amt_zd09',
    'disc_pengembalian_upf_pct_zd10',
    'disc_pengembalian_upf_amt_zd10',
    'dis_pct_zd12',
    'dis_amt_zd12',
    'dis_pct_zd14',
    'dis_amt_zd14',
    'dis_pct_zd15',
    'dis_amt_zd15',
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

function parseNumeric(value) {
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
            (
                parts.length === 2 &&
                parts[1].length === 3 &&
                parts[0].length <= 3
            )
        ) {
            cleaned = cleaned.replace(/\./g, '');
        }
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return [
            value.getFullYear(),
            String(value.getMonth() + 1).padStart(2, '0'),
            String(value.getDate()).padStart(2, '0'),
        ].join('-');
    }

    if (typeof value === 'number') {
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

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

/**
 * INSERT KE D_PENJUALAN
 */
exports.insertPenjualanArray2 = async (payload, transaction) => {
    const result = {
        total_data: Array.isArray(payload) ? payload.length : 0,
        total_success: 0,
        total_error: 0,
        data_error: [],
    };

    if (!Array.isArray(payload) || payload.length === 0) {
        return result;
    }

    const createdAt = new Date();

    const dataInsert = payload?.filter(a => a.sales_office !== '2000' || !['KFA', 'KFD'].includes(a.desc_cust_grp4))?.map?.((item) => ({
        penjualan_id: item.penjualan_id,
        sales_office: item.sales_office ?? null,
        desc_s_office: item.desc_s_office ?? null,
        posting_date: item.posting_date ?? null,
        billing_no: item.billing_no ?? null,

        posting_status: item.posting_status ?? null,
        bill_cancel: item.bill_cancel ?? null,
        bill_to_party: item.bill_to_party ?? null,
        name_bill_to: item.name_bill_to ?? null,
        address: item.address ?? null,

        material: item.material ?? null,
        material_group_1: item.material_group_1 ?? null,
        desc_material_group_1: item.desc_material_group_1 ?? null,
        text_material: item.text_material ?? null,

        quantity: item.quantity ?? null,
        sales_unit: item.sales_unit ?? null,
        unit_price_penjualan: item.unit_price_penjualan ?? null,

        dis_pct_zd01: item.dis_pct_zd01 ?? null,
        dis_amt_zd01: item.dis_amt_zd01 ?? null,
        dis_pct_zd02: item.dis_pct_zd02 ?? null,
        dis_amt_zd02: item.dis_amt_zd02 ?? null,
        dis_pct_zd03: item.dis_pct_zd03 ?? null,
        dis_amt_zd03: item.dis_amt_zd03 ?? null,
        dis_pct_zd04: item.dis_pct_zd04 ?? null,
        dis_amt_zd04: item.dis_amt_zd04 ?? null,
        dis_pct_zd05: item.dis_pct_zd05 ?? null,
        dis_amt_zd05: item.dis_amt_zd05 ?? null,
        dis_pct_zd06: item.dis_pct_zd06 ?? null,
        dis_amt_zd06: item.dis_amt_zd06 ?? null,

        disc_upfront_pct_zd07: item.disc_upfront_pct_zd07 ?? null,
        disc_upfront_amt_zd07: item.disc_upfront_amt_zd07 ?? null,
        disc_beban_kftd_upf_pct_zd08: item.disc_beban_kftd_upf_pct_zd08 ?? null,
        disc_beban_kftd_upf_amt_zd08: item.disc_beban_kftd_upf_amt_zd08 ?? null,
        disc_beban_principle_upf_pct_zd09: item.disc_beban_principle_upf_pct_zd09 ?? null,
        disc_beban_principle_upf_amt_zd09: item.disc_beban_principle_upf_amt_zd09 ?? null,
        disc_pengembalian_upf_pct_zd10: item.disc_pengembalian_upf_pct_zd10 ?? null,
        disc_pengembalian_upf_amt_zd10: item.disc_pengembalian_upf_amt_zd10 ?? null,

        dis_pct_zd12: item.dis_pct_zd12 ?? null,
        dis_amt_zd12: item.dis_amt_zd12 ?? null,
        dis_pct_zd14: item.dis_pct_zd14 ?? null,
        dis_amt_zd14: item.dis_amt_zd14 ?? null,
        dis_pct_zd15: item.dis_pct_zd15 ?? null,
        dis_amt_zd15: item.dis_amt_zd15 ?? null,

        total_discount: item.total_discount ?? null,
        total_penjualan: item.total_penjualan ?? null,
        tax_amount: item.tax_amount ?? null,
        total_cogs: item.total_cogs ?? null,
        unit_price_pembelian: item.unit_price_pembelian ?? null,
        bill_qty_in_sku: item.bill_qty_in_sku ?? null,

        uom_sku: item.uom_sku ?? null,
        code_pelayanan: item.code_pelayanan ?? null,
        dec_pelayanan: item.dec_pelayanan ?? null,
        prod_hierarchy3: item.prod_hierarchy3 ?? null,
        principle: item.principle ?? null,
        name_principle: item.name_principle ?? null,
        desc_cust_grp4: item.desc_cust_grp4 ? item?.desc_cust_grp3 : null,
        salesman: item.salesman ?? null,
        name_salesman: item.name_salesman ?? null,

        po_number: item.po_number ?? null,
        quotation_number: item.quotation_number ?? null,

        is_upload: item.is_upload ?? 1,
        created_by: item.created_by || null,
        created_at: createdAt,
    }));

    // Debug: pastikan kolom-kolom ini sudah terisi sebelum bulkCreate.
    const first = dataInsert[0];

    console.log('[D_PENJUALAN] Sample sebelum bulkCreate:', {
        jumlah: dataInsert.length,
        posting_status: first.posting_status,
        bill_cancel: first.bill_cancel,
        bill_to_party: first.bill_to_party,
        name_bill_to: first.name_bill_to,
        po_number: first.po_number,
        quotation_number: first.quotation_number,
    });

    await model.d_penjualan.bulkCreate(dataInsert, {
        transaction,
        validate: true,
        returning: false,
    });

    result.total_success = dataInsert.length;

    return result;
};

/**
 * INSERT KE D_PIUTANG
 *
 * query.getUploadedDataPiutang harus membaca data berdasarkan penjualan_id
 * yang baru dimasukkan dan mengembalikan alias kolom yang digunakan di bawah.
 */
exports.insertDataPiutang = async (
    penjualanIds,
    createdBy,
    transaction
) => {
    if (!Array.isArray(penjualanIds) || penjualanIds.length === 0) {
        return {
            total_data: 0,
            total_success: 0,
            total_error: 0,
        };
    }

    const batchSize = 999999;
    let totalData = 0;
    let totalSuccess = 0;

    // Query per 500 ID agar ukuran replacements tidak terlalu besar.
    for (
        let batchStart = 0;
        batchStart < penjualanIds.length;
        batchStart += batchSize
    ) {
        const ids = penjualanIds.slice(
            batchStart,
            batchStart + batchSize
        );

        const piutangRows = await db.query(
            query.getUploadedDataPiutang,
            {
                replacements: {
                    penjualan_ids: ids,
                },
                type: db.QueryTypes.SELECT,
                transaction,
            }
        );

        totalData += piutangRows.length;

        if (!piutangRows.length) {
            console.warn(
                '[D_PIUTANG] Query tidak menghasilkan data untuk batch:',
                {
                    batchStart,
                    jumlahIds: ids.length,
                }
            );

            continue;
        }

        const createdAt = new Date();

        const dataInsert = piutangRows.map((item) => ({
            piutang_id: uuidv4(),
            no_faktur: item.billing_no ?? null,
            desc_cust_grp3: item.desc_cust_grp4 ?? null,
            channel_id: item.channel_id ?? null,
            no_billing: item.billing_no ?? null,
            document_type: item.document_type ?? null,
            customer: item.bill_to_party ?? null,
            sales: item.salesman ?? null,
            nama_sales: item.name_salesman ?? null,
            cabang: item.sales_office ?? null,
            posting_date: item.posting_date ?? null,
            jatuh_tempo: item.jatuh_tempo ?? null,
            dpp: item.dpp ?? 0,
            ppn: item.ppn ?? 0,
            pph: item.pph ?? 0,
            aging: item.aging ?? null,
            status_piutang: item.status_piutang ?? 'OUTSTANDING',
            created_by: createdBy || null,
            created_at: createdAt,
        }));

        await model.d_piutang.bulkCreate(dataInsert, {
            transaction,
            validate: true,
            returning: false,
        });

        totalSuccess += dataInsert.length;
    }

    console.log('[D_PIUTANG] Hasil insert:', {
        idsDikirim: penjualanIds.length,
        totalDataQuery: totalData,
        totalSuccess,
    });

    return {
        total_data: totalData,
        total_success: totalSuccess,
        total_error: Math.max(totalData - totalSuccess, 0),
    };
};

/**
 * UPLOAD PENJUALAN EXCEL
 */
exports.uploadPenjualanExcel = async (
    file,
    createdBy,
    transaction
) => {
    if (!file?.name) {
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

    const addError = (row, message) => {
        result.total_error += 1;

        if (result.data_error.length < maxErrorPreview) {
            result.data_error.push({
                row,
                message,
            });
        }
    };

    const processBatch = async (rows) => {
        let payload = [];

        const flushBatch = async () => {
            if (!payload.length) return;

            const currentPayload = payload;
            payload = [];

            const batchResult = await exports.insertPenjualanArray2(
                currentPayload,
                transaction
            );

            result.total_data +=
                batchResult.total_data ?? currentPayload.length;

            result.total_success += batchResult.total_success ?? 0;
            result.total_error += batchResult.total_error ?? 0;

            if (Array.isArray(batchResult.data_error)) {
                const remaining =
                    maxErrorPreview - result.data_error.length;

                if (remaining > 0) {
                    result.data_error.push(
                        ...batchResult.data_error.slice(0, remaining)
                    );
                }
            }
        };

        for (const entry of rows) {
            const row = entry?.row;
            const excelRow = entry?.excelRow;

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
                    const value = normalizedRow.get(
                        normalizeHeader(header)
                    );

                    if (field === 'posting_date') {
                        item[field] = parseDate(value);
                    } else if (numericFields.has(field)) {
                        item[field] = parseNumeric(value);
                    } else {
                        item[field] =
                            value === null || value === undefined
                                ? null
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
                    error.message ||
                    `Gagal memproses baris ${excelRow}.`
                );
            }
        }

        await flushBatch();
    };

    try {
        await new Promise((resolve, reject) => {
            let settled = false;

            const finishError = (error) => {
                if (settled) return;

                settled = true;
                reject(error);
            };

            const finishSuccess = () => {
                if (settled) return;

                settled = true;
                resolve();
            };

            worker.on('message', async (message) => {
                try {
                    if (message.type === 'HEADERS') {
                        const normalized = new Set(
                            (message.headers || []).map(normalizeHeader)
                        );

                        const missingHeaders = Object.values(columnMap).filter(
                            (header) =>
                                !normalized.has(normalizeHeader(header))
                        );

                        if (missingHeaders.length) {
                            worker.postMessage({
                                type: 'CANCEL',
                            });

                            finishError(
                                new Error(
                                    `Format Excel tidak sesuai. Kolom yang belum tersedia: ${missingHeaders.join(', ')}`
                                )
                            );

                            return;
                        }

                        headersValidated = true;

                        worker.postMessage({
                            type: 'ACK',
                        });

                        return;
                    }

                    if (message.type === 'BATCH') {
                        if (!headersValidated) {
                            throw new Error(
                                'Header Excel belum divalidasi.'
                            );
                        }

                        await processBatch(message.rows || []);

                        worker.postMessage({
                            type: 'ACK',
                        });

                        return;
                    }

                    if (message.type === 'DONE') {
                        workerFinished = true;
                        finishSuccess();
                        return;
                    }

                    if (message.type === 'ERROR') {
                        finishError(
                            new Error(
                                message.message ||
                                'Worker gagal membaca Excel.'
                            )
                        );
                    }
                } catch (error) {
                    worker.postMessage({
                        type: 'CANCEL',
                    });

                    finishError(error);
                }
            });

            worker.once('error', finishError);

            worker.once('exit', (code) => {
                if (code !== 0 && !workerFinished) {
                    finishError(
                        new Error(
                            `Worker Excel berhenti dengan kode ${code}.`
                        )
                    );
                }
            });
        });

        if (!headersValidated) {
            throw new Error(
                'Header Excel tidak berhasil divalidasi.'
            );
        }

        if (result.total_success === 0) {
            throw new Error(
                result.total_error > 0
                    ? `Tidak ada data yang berhasil diproses. Total error: ${result.total_error}.`
                    : 'Tidak ada data penjualan yang dapat diproses.'
            );
        }

        if (uploadedPenjualanIds.length !== result.total_success) {
            throw new Error(
                `Jumlah ID penjualan (${uploadedPenjualanIds.length}) tidak sama dengan jumlah sukses (${result.total_success}).`
            );
        }

        // Buat data piutang setelah semua batch penjualan selesai.
        const piutangResult = await exports.insertDataPiutang(
            uploadedPenjualanIds,
            createdBy,
            transaction
        );

        console.log('[UPLOAD PENJUALAN] Ringkasan:', {
            totalData: result.total_data,
            totalSukses: result.total_success,
            totalError: result.total_error,
            totalIdPenjualan: uploadedPenjualanIds.length,
            totalPiutangQuery: piutangResult?.total_data ?? 0,
            totalPiutangSukses: piutangResult?.total_success ?? 0,
        });

        // Jangan tandai selesai jika tidak ada piutang yang terbentuk.
        if (
            !piutangResult ||
            Number(piutangResult.total_success) <= 0
        ) {
            throw new Error(
                'Data d_penjualan berhasil diinsert, tetapi tidak ada data d_piutang yang terbentuk. Periksa query.getUploadedDataPiutang dan pastikan query mengambil penjualan_id yang baru diinsert. Controller harus melakukan rollback.'
            );
        }

        // Update status hanya setelah insert piutang berhasil.
        const [updatedCount] = await model.d_penjualan.update(
            {
                is_upload: 0,
            },
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
            total_piutang: piutangResult.total_success,
            total_updated: updatedCount || 0,
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
                AND dp.principle IN (:principles)
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
                AND p.channel_id IN (:customer_groups)
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
        console.log(listData.length, 'wkwkwk');

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

exports.getDataKreasiFaktur = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        const page = Math.max(Number(params?.page) || 1, 1);
        const limit = Math.max(Number(params?.limit) || 10, 1);
        const offset = (page - 1) * limit;
        const keyword = String(params?.keyword || '').trim();

        const salesOffices = normalizeFilterValues(
            params?.sales_office ?? params?.['sales_office[]']
        );

        const customers = normalizeFilterValues(
            params?.customer ?? params?.['customer[]']
        );

        const customerGroups = normalizeFilterValues(
            params?.customer_group ?? params?.['customer_group[]']
        );

        const principles = normalizeFilterValues(
            params?.principle ?? params?.['principle[]']
        );

        const statusPiutang = String(params?.status || 'ALL').trim();
        const postingStatus = String(
            params?.posting_status || 'ALL'
        ).trim();

        const statusTerimaFaktur = String(
            params?.status_terima_faktur || 'ALL'
        ).trim().toUpperCase();

        const startDate = String(params?.start_date || '').trim();
        const endDate = String(params?.end_date || '').trim();

        let condition = '';
        let summaryCondition = '';

        const bind = { limit, offset };
        const summaryBind = {};

        // FILTER KEYWORD
        if (keyword) {
            const keywordCondition = `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
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

            condition += keywordCondition;
            summaryCondition += keywordCondition;

            bind.keyword = `%${keyword}%`;
            summaryBind.keyword = `%${keyword}%`;
        }

        // FILTER SALES OFFICE
        if (
            salesOffices.length &&
            !salesOffices.some((value) => value.toUpperCase() === 'ALL')
        ) {
            condition += ` AND p.cabang IN (:sales_offices)`;
            summaryCondition += ` AND p.cabang IN (:sales_offices)`;

            bind.sales_offices = salesOffices;
            summaryBind.sales_offices = salesOffices;
        }

        // FILTER CUSTOMER
        if (
            customers.length &&
            !customers.some((value) => value.toUpperCase() === 'ALL')
        ) {
            condition += ` AND p.customer IN (:customers)`;
            summaryCondition += ` AND p.customer IN (:customers)`;

            bind.customers = customers;
            summaryBind.customers = customers;
        }

        // FILTER STATUS PIUTANG
        if (statusPiutang && statusPiutang.toUpperCase() !== 'ALL') {
            condition += `
                AND UPPER(p.status_piutang) = UPPER(:status)
            `;

            summaryCondition += `
                AND UPPER(p.status_piutang) = UPPER(:status)
            `;

            bind.status = statusPiutang;
            summaryBind.status = statusPiutang;
        }

        // FILTER CUSTOMER GROUP
        if (
            customerGroups.length &&
            !customerGroups.some((value) => value.toUpperCase() === 'ALL')
        ) {
            condition += ` AND p.channel_id IN (:customer_groups)`;
            summaryCondition += ` AND p.channel_id IN (:customer_groups)`;

            bind.customer_groups = customerGroups;
            summaryBind.customer_groups = customerGroups;
        }

        // FILTER PRINCIPLE
        if (
            principles.length &&
            !principles.some((value) => value.toUpperCase() === 'ALL')
        ) {
            condition += ` AND p.principle IN (:principles)`;
            summaryCondition += ` AND p.principle IN (:principles)`;

            bind.principles = principles;
            summaryBind.principles = principles;
        }

        // FILTER TANGGAL AWAL
        if (startDate) {
            condition += ` AND p.posting_date >= :start_date`;
            summaryCondition += ` AND p.posting_date >= :start_date`;

            bind.start_date = startDate;
            summaryBind.start_date = startDate;
        }

        // FILTER TANGGAL AKHIR
        if (endDate) {
            condition += `
                AND p.posting_date < (:end_date::date + INTERVAL '1 day')
            `;

            summaryCondition += `
                AND p.posting_date < (:end_date::date + INTERVAL '1 day')
            `;

            bind.end_date = endDate;
            summaryBind.end_date = endDate;
        }

        // FILTER STATUS PENERIMAAN FAKTUR
        if (statusTerimaFaktur === 'BELUM_DITERIMA') {
            condition += `
        AND COALESCE(p.diterima::text, '0') = '0'
    `;
        } else if (
            statusTerimaFaktur === 'DITERIMA' ||
            statusTerimaFaktur === 'SUDAH_DITERIMA'
        ) {
            condition += `
        AND COALESCE(p.diterima::text, '0') = '1'
    `;
        } else if (
            statusTerimaFaktur !== 'ALL' &&
            statusTerimaFaktur !== ''
        ) {
            throw new Error(
                `status_terima_faktur tidak valid: ${statusTerimaFaktur}`
            );
        }

        // 1. GET LIST DATA
        const LIST_QUERY = query.getDataKreasiFaktur.replace(
            /:condition/g,
            condition
        );

        const listData = await db.query(LIST_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        });

        // 2. GET TOTAL DATA
        const COUNT_QUERY = query.countDataKreasiFaktur.replace(
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
        // Summary memakai filter lain, tetapi tidak dibatasi oleh
        // statusTerimaFaktur agar kedua kartu tetap menampilkan jumlahnya.
        const SUMMARY_QUERY = query.summaryDataKreasiFaktur.replace(
            /:condition/g,
            summaryCondition
        );

        const summaryResult = await db.query(SUMMARY_QUERY, {
            replacements: summaryBind,
            type: db.QueryTypes.SELECT
        });

        const rawSummary = summaryResult?.[0] || {};

        const summary = {
            belum_diterima: Number(rawSummary.belum_diterima || 0),
            sudah_diterima: Number(rawSummary.sudah_diterima || 0),
            total_data: Number(rawSummary.total_data || 0)
        };

        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary
        };
    } catch (error) {
        console.error('ERROR SERVICE GET DATA KREASI FAKTUR:', error);
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
                // logging: console.log
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
        // logging: console.log, // Enable logging for debugging
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
     * Jika kegiatan gabungan, simpan sebagai
     * dua kegiatan terpisah.
     */
    const kegiatanInput = String(payload.kegiatan)
        .trim()
        .toUpperCase();

    let daftarKegiatan = [];

    if (kegiatanInput === 'TUKAR_FAKTUR_PENAGIHAN') {
        daftarKegiatan = [
            'TUKAR_FAKTUR',
            'PENAGIHAN'
        ];
    } else if (
        ['TUKAR_FAKTUR', 'PENAGIHAN'].includes(kegiatanInput)
    ) {
        daftarKegiatan = [kegiatanInput];
    } else {
        throw new Error('Kegiatan penugasan tidak valid');
    }

    /*
     * Cek semua kegiatan terlebih dahulu.
     * Jika salah satu sudah aktif, jangan insert apa pun.
     */
    for (const kegiatan of daftarKegiatan) {
        const checkAssignment =
            await model.d_faktur_petugas.count({
                where: {
                    piutang_id: payload.piutang_id,
                    // nip: payload.nip,
                    kegiatan,
                    is_active: 'Y'
                },
                transaction
            });

        if (checkAssignment > 0) {
            await model.d_faktur_petugas.update({
                is_active: 'T'
            }, {
                where: {
                    piutang_id: payload.piutang_id,
                    kegiatan,
                    is_active: 'Y'
                }
            })
            // throw new Error(
            //     `Piutang sudah ditugaskan kepada petugas untuk kegiatan ${kegiatan}!`
            // );
        }
    }

    const createdAt = new Date();
    const hasil = [];

    /*
     * Insert record untuk setiap kegiatan.
     */
    for (const kegiatan of daftarKegiatan) {
        const fakturPetugas =
            await model.d_faktur_petugas.create({
                faktur_petugas_id: uuidv4(),
                piutang_id: payload.piutang_id,
                nip: payload.nip,
                kegiatan,
                is_active: payload?.is_active || 'Y',
                assigned_at: payload?.assigned_at || createdAt,
                created_by: payload?.created_by,
                created_at: createdAt
            }, {
                transaction,
                returning: true
            });

        if (fakturPetugas) {
            const dataUser = await model.m_user.findOne({ where: { nip: payload?.nip }, plain: true, returning: true })
            const dataPiutang = await model.d_piutang.findOne({ where: { piutang_id: payload?.piutang_id }, plain: true, returning: true })
            const userToNotif = await model.m_role_user.findAll({ where: { user_id: dataUser?.user_id }, returning: true })
            const payNotif = {
                notifikasi_id: uuidv4(),
                no_billing: dataPiutang?.no_billing,
                username: payload?.nip,
                title: kegiatan === 'TUKAR_FAKTUR' ? `Ditugaskan Tukar Faktur` : 'Ditugaskan Penagihan',
                body: `Anda Telah Ditunjuk Untuk Melakukan ${kegiatan === 'TUKAR_FAKTUR' ? 'Tukar Faktur' : 'Penagihan'} Pada Billing Ini`,
                created_by: payload?.created_by || '',
                kegiatan: kegiatan,
                user: [...new Set(userToNotif.map(a => a.user_id))]
            }
            await this.insertNotifikasi(payNotif, transaction)
        }

        hasil.push({
            faktur_petugas_id: fakturPetugas.faktur_petugas_id,
            piutang_id: fakturPetugas.piutang_id,
            nip: fakturPetugas.nip,
            kegiatan: fakturPetugas.kegiatan,
            is_active: fakturPetugas.is_active,
            assigned_at: fakturPetugas.assigned_at,
            created_by: fakturPetugas.created_by,
            created_at: fakturPetugas.created_at
        });
    }

    return hasil.length === 1 ? hasil[0] : hasil;
};

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

    const kegiatanInput = String(payload.kegiatan)
        .trim()
        .toUpperCase();

    let daftarKegiatan = [];

    if (kegiatanInput === 'TUKAR_FAKTUR_PENAGIHAN') {
        daftarKegiatan = [
            'TUKAR_FAKTUR',
            'PENAGIHAN'
        ];
    } else if (
        ['TUKAR_FAKTUR', 'PENAGIHAN'].includes(kegiatanInput)
    ) {
        daftarKegiatan = [kegiatanInput];
    } else {
        throw new Error(
            'Kegiatan hanya boleh TUKAR_FAKTUR, PENAGIHAN, atau TUKAR_FAKTUR_PENAGIHAN'
        );
    }

    /*
     * Cek data assignment lama
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
     * Cek duplikasi untuk setiap kegiatan baru
     * sebelum menonaktifkan assignment lama
     */
    for (const kegiatan of daftarKegiatan) {
        const duplicateAssignment =
            await model.d_faktur_petugas.count({
                where: {
                    piutang_id: payload.piutang_id,
                    nip: payload.nip,
                    kegiatan,
                    is_active: 'Y',
                    faktur_petugas_id: {
                        [Op.ne]: fakturPetugasId
                    }
                },
                transaction
            });

        if (duplicateAssignment > 0) {
            throw new Error(
                `Piutang sudah ditugaskan kepada petugas untuk kegiatan ${kegiatan}!`
            );
        }
    }

    const updatedAt = new Date();

    /*
     * Nonaktifkan assignment lama
     */
    const [deactivatedCount] =
        await model.d_faktur_petugas.update({
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
    const hasil = [];

    for (const kegiatan of daftarKegiatan) {
        const activeAssignment =
            await model.d_faktur_petugas.create({
                faktur_petugas_id: uuidv4(),
                piutang_id: payload.piutang_id,
                nip: payload.nip,
                kegiatan,
                is_active: 'Y',
                assigned_at: payload?.assigned_at || updatedAt,
                created_by: payload?.updated_by,
                created_at: updatedAt
            }, {
                transaction,
                returning: true
            });

        hasil.push({
            faktur_petugas_id: activeAssignment.faktur_petugas_id,
            piutang_id: activeAssignment.piutang_id,
            nip: activeAssignment.nip,
            kegiatan: activeAssignment.kegiatan,
            is_active: activeAssignment.is_active,
            assigned_at: activeAssignment.assigned_at,
            created_by: activeAssignment.created_by,
            created_at: activeAssignment.created_at
        });
    }

    /*
     * Pertahankan return object untuk satu kegiatan.
     * Untuk kegiatan gabungan, return array berisi dua record.
     */
    if (hasil.length === 1) {
        return {
            ...hasil[0],
            deactivated_count: deactivatedCount
        };
    }

    return hasil.map((item) => ({
        ...item,
        deactivated_count: deactivatedCount
    }));
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
                // logging: console.log
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
                // logging: console.log
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
                // logging: console.log
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
                // logging: console.log
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

// exports.insertTukarFaktur = async (payload, files, transaction) => {
//     try {

//         if (
//             !Array.isArray(payload?.faktur) ||
//             payload.faktur.length === 0
//         ) {
//             throw new Error('Data faktur wajib diisi');
//         }

//         if (!files || files.length === 0) {
//             throw new Error('File bukti tukar faktur wajib diupload');
//         }

//         const piutangIds = payload.faktur
//             .map((item) => item?.piutang_id)
//             .filter(Boolean);

//         if (piutangIds.length === 0) {
//             throw new Error('piutang_id wajib diisi');
//         }

//         /*
//          * Cek duplicate piutang di dalam payload
//          */
//         const uniquePiutangIds = [...new Set(piutangIds)];

//         if (
//             uniquePiutangIds.length !== piutangIds.length
//         ) {
//             throw new Error(
//                 'Terdapat piutang yang sama dalam proses Tukar Faktur'
//             );
//         }

//         /*
//          * Cek apakah piutang sudah pernah
//          * melakukan proses Tukar Faktur
//          */
//         const existingData =
//             await model.d_tukar_faktur.findAll({
//                 where: {
//                     piutang_id: uniquePiutangIds
//                 },
//                 transaction
//             });

//         if (
//             existingData &&
//             existingData.length > 0
//         ) {
//             throw new Error(
//                 `Terdapat ${existingData.length} piutang yang sudah melakukan proses Tukar Faktur`
//             );
//         }

//         /*
//          * Upload 1 file untuk seluruh faktur
//          */
//         const uploadDocument =
//             await this.processUploadFile(
//                 payload,
//                 files,
//                 transaction
//             );

//         const createdAt = new Date();

//         const dataInsert = payload.faktur.map((item) => ({
//             tukar_faktur_id:
//                 uuidv4(),

//             faktur_petugas_id:
//                 item.faktur_petugas_id,

//             piutang_id:
//                 item.piutang_id,

//             files:
//                 uploadDocument[0]?.path !== null ? uploadDocument[0]?.path.replace(/\\/g, '/') : "",

//             created_by:
//                 payload?.created_by ||
//                 'SYSTEM',

//             created_at:
//                 createdAt
//         }));

//         /*
//          * Insert banyak data sekaligus
//          */
//         const tukarFaktur =
//             await model.d_tukar_faktur.bulkCreate(
//                 dataInsert,
//                 {
//                     transaction,
//                     returning: true
//                 }
//             );

//         if (tukarFaktur) {
//             const userToNotif = await model.m_role_user.findAll({ where: { cabang_id: payload?.dataUser?.cabang_id, role_id: '03' }, returning: true })
//             const payNotif = {
//                 notifikasi_id: uuidv4(),
//                 no_billing: payload?.no_faktur,
//                 // username: payload?.nip,
//                 title: 'Penukaran Faktur',
//                 body: `Sales Telah Melakukan Tukar Faktur Pada Faktur Ini`,
//                 created_by: payload?.created_by || '',
//                 kegiatan: 'SALES_TUKAR_FAKTUR',
//                 user: [...new Set(userToNotif.map(a => a.user_id))]
//             }
//             await this.insertNotifikasi(payNotif, transaction)
//         }

//         return {
//             total:
//                 tukarFaktur.length,

//             data:
//                 tukarFaktur
//         };

//     } catch (error) {

//         console.error(
//             'ERROR SERVICE INSERT TUKAR FAKTUR:',
//             error
//         );

//         throw error;
//     }
// };


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
         * Validasi koordinat dari frontend
         */
        const latitude = Number(payload?.latitude);
        const longitude = Number(payload?.longitude);

        if (
            payload?.latitude === undefined ||
            payload?.latitude === null ||
            payload?.latitude === '' ||
            payload?.longitude === undefined ||
            payload?.longitude === null ||
            payload?.longitude === '' ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            throw new Error(
                'Latitude dan longitude lokasi tidak valid'
            );
        }

        /*
         * Informasi tambahan koordinat dan alamat
         */
        const koordinat = payload?.koordinat || {};

        // Ambil alamat dari payload utama atau objek koordinat
        const alamatRaw =
            payload?.alamat ??
            koordinat?.alamat ??
            '';

        const alamat =
            typeof alamatRaw === 'string'
                ? alamatRaw.trim() || null
                : null;

        const accuracy =
            koordinat?.accuracy !== undefined &&
            koordinat?.accuracy !== null &&
            koordinat?.accuracy !== ''
                ? Number(koordinat.accuracy)
                : null;

        if (
            accuracy !== null &&
            (!Number.isFinite(accuracy) || accuracy < 0)
        ) {
            throw new Error('Akurasi koordinat tidak valid');
        }

        const capturedAt = koordinat?.captured_at
            ? new Date(koordinat.captured_at)
            : null;

        if (
            capturedAt &&
            Number.isNaN(capturedAt.getTime())
        ) {
            throw new Error(
                'Waktu pengambilan koordinat tidak valid'
            );
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

        if (existingData && existingData.length > 0) {
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

        /*
         * Insert data faktur beserta koordinat dan alamat lokasi
         */
        const dataInsert = payload.faktur.map((item) => ({
            tukar_faktur_id: uuidv4(),

            faktur_petugas_id:
                item.faktur_petugas_id,

            piutang_id:
                item.piutang_id,

            files:
                uploadDocument[0]?.path != null
                    ? uploadDocument[0].path.replace(/\\/g, '/')
                    : '',

            // Koordinat lokasi dari frontend
            latitude: latitude,
            longitude: longitude,

            // Alamat hasil reverse geocoding
            alamat_lokasi: alamat,

            // Informasi akurasi dan waktu pengambilan lokasi
            accuracy: accuracy,
            captured_at: capturedAt,

            created_by:
                payload?.created_by || 'SYSTEM',

            created_at: createdAt
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

        /*
         * Notifikasi
         */
        if (tukarFaktur && tukarFaktur.length > 0) {
            const userToNotif =
                await model.m_role_user.findAll({
                    where: {
                        cabang_id: payload?.dataUser?.cabang_id,
                        role_id: '03'
                    },
                    transaction,
                    returning: true
                });

            const payNotif = {
                notifikasi_id: uuidv4(),
                no_billing: payload?.no_faktur,
                title: 'Penukaran Faktur',
                body: 'Sales Telah Melakukan Tukar Faktur Pada Faktur Ini',
                created_by: payload?.created_by || '',
                kegiatan: 'SALES_TUKAR_FAKTUR',
                user: [
                    ...new Set(
                        userToNotif.map((a) => a.user_id)
                    )
                ]
            };

            await this.insertNotifikasi(
                payNotif,
                transaction
            );
        }

        return {
            total: tukarFaktur.length,
            data: tukarFaktur
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
            'MENUNGGU_PEMBAYARAN',
            'PENERIMAAN_LAIN',
            'SPP'
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
            payload.faktur ? payload.faktur
                .map(
                    item =>
                        item?.piutang_id
                )
                .filter(Boolean) : [];

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

        if (payload.faktur) {
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

                            jenis_pembayaran: jenisPembayaran,

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

                if (pembayaran && (item?.no_billing || item?.no_faktur)) {
                    const userToNotif = await model.m_role_user.findAll({ where: { cabang_id: payload?.dataUser?.cabang_id, role_id: '03' }, returning: true })
                    const payNotif = {
                        notifikasi_id: uuidv4(),
                        no_billing: item?.no_faktur || item?.no_billing,
                        // username: payload?.nip,
                        title: 'Penukaran Faktur',
                        body: `Sales Telah Melakukan Tukar Faktur Pada Faktur Ini`,
                        created_by: payload?.created_by || '',
                        kegiatan: 'SALES_TUKAR_FAKTUR',
                        user: [...new Set(userToNotif.map(a => a.user_id))]
                    }
                    await this.insertNotifikasi(payNotif, transaction)
                }

                pembayaranData.push(
                    pembayaran
                );

            }
        }

        if (jenisPembayaran === 'PENERIMAAN_LAIN') {
            const pembayaran =
                await model.d_pembayaran.create(
                    {
                        pembayaran_id:
                            uuidv4(),

                        nominal_bayar:
                            payload?.nominal_bayar,

                        tanggal_pembayaran:
                            tanggalPembayaran,

                        jenis_pembayaran: jenisPembayaran,

                        metode_pembayaran:
                            payload?.metode_pembayaran,

                        created_by:
                            payload?.created_by ||
                            'SYSTEM',

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

exports.insertPenerimaanLain = async (
    payload,
    files,
    transaction
) => {
    try {

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

        if (
            !payload?.metode_pembayaran
        ) {
            throw new Error(
                'Metode pembayaran wajib diisi'
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

        if (jenisPembayaran === 'PENERIMAAN_LAIN') {
            const pembayaran =
                await model.d_penerimaan_lain.create(
                    {
                        penerimaan_lain_id:
                            uuidv4(),

                        document_number:
                            payload?.document_number,

                        nominal_bayar:
                            payload?.nominal_bayar,
                        sisa_penerimaan:
                            payload?.nominal_bayar,

                        tanggal_pembayaran:
                            tanggalPembayaran,

                        jenis_pembayaran: jenisPembayaran,

                        metode_pembayaran:
                            payload?.metode_pembayaran,

                        created_by:
                            payload?.created_by ||
                            'SYSTEM',

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

exports.terimaFaktur = async (payload, transaction) => {
    try {
        const {
            piutang_id,
            billing_no,
            no_billing,
            status_terima_faktur,
            diterima,
            catatan,
        } = payload;

        /*
         * =====================================================
         * VALIDASI
         * =====================================================
         */

        if (!piutang_id) {
            throw new Error("piutang_id wajib diisi");
        }

        const statusDiterima = ["DITERIMA", "BELUM_DITERIMA"];

        if (!statusDiterima.includes(status_terima_faktur)) {
            throw new Error("Status penerimaan faktur tidak valid");
        }

        if (
            status_terima_faktur === "BELUM_DITERIMA" &&
            !String(catatan || "").trim()
        ) {
            throw new Error(
                "Catatan wajib diisi jika faktur belum diterima"
            );
        }

        /*
         * =====================================================
         * VALIDASI DATA PIUTANG
         * =====================================================
         */

        const piutang = await model.d_piutang.findOne({
            where: {
                piutang_id,
            },
            transaction,
        });

        if (!piutang) {
            throw new Error("Data Piutang tidak ditemukan");
        }

        if (Number(piutang.diterima) === 1) {
            throw new Error(
                "Faktur sudah diterima. Status penerimaan tidak dapat diubah lagi."
            );
        }

        /*
         * =====================================================
         * KONVERSI STATUS
         * =====================================================
         *
         * d_piutang.diterima:
         * 1 = Faktur Diterima
         * 0 = Faktur Belum Diterima
         *
         * d_status.kd_status:
         * S = Faktur Diterima
         * F = Faktur Belum Diterima
         */

        const nilaiDiterima =
            status_terima_faktur === "DITERIMA" ? 1 : 0;

        const kdStatus =
            status_terima_faktur === "DITERIMA" ? "S" : "F";

        const keterangan =
            status_terima_faktur === "BELUM_DITERIMA"
                ? String(catatan || "").trim()
                : "";

        /*
         * =====================================================
         * VALIDASI KONSISTENSI PAYLOAD
         * =====================================================
         */

        if (
            typeof diterima === "boolean" &&
            diterima !== (nilaiDiterima === 1)
        ) {
            throw new Error(
                "Status diterima tidak sesuai dengan status penerimaan faktur"
            );
        }

        /*
         * =====================================================
         * UPDATE d_piutang
         * =====================================================
         */

        await piutang.update(
            {
                diterima: nilaiDiterima,
            },
            {
                transaction,
            }
        );

        /*
         * =====================================================
         * INSERT HISTORY d_status
         * =====================================================
         */

        const tanggalVerifikasi = new Date();

        const history = await model.d_status.create(
            {
                foreign_id: piutang_id,
                kegiatan: "PENERIMAAN_FAKTUR",
                kd_status: kdStatus,
                keterangan,
                created_by: payload?.created_by || "SYSTEM",
                created_at: tanggalVerifikasi,
            },
            {
                transaction,
            }
        );

        /*
         * =====================================================
         * RESPONSE
         * =====================================================
         */

        return {
            piutang_id,
            billing_no: billing_no || no_billing || null,
            diterima: nilaiDiterima,
            kd_status: kdStatus,
            status_terima_faktur,
            tanggal_verifikasi: tanggalVerifikasi,
            keterangan,
            history,
        };
    } catch (error) {
        console.error("ERROR SERVICE TERIMA FAKTUR:", error);
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

        if (status && no_faktur) {
            const userToNotif = await model.m_user.findAll({ where: { nip: fakturPetugas?.nip } })
            const payNotif = {
                notifikasi_id: uuidv4(),
                no_billing: no_faktur,
                // username: payload?.nip,
                title: 'Verifikasi Tukar Faktur',
                body: `Inkaso Telah Melakukan Verifikasi Pada Faktur Yang Telah Anda Tukar`,
                created_by: payload?.created_by || '',
                kegiatan: 'VERIFIKASI_TUKAR_FAKTUR',
                user: [...new Set(userToNotif.map(a => a.user_id))]
            }
            await this.insertNotifikasi(payNotif, transaction)
        }


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

// exports.getDataBayarFaktur = async (params) => {
//     try {
//         const normalizeFilterValues = (value) => {
//             const values = Array.isArray(value)
//                 ? value
//                 : [value];

//             return values
//                 .filter(
//                     (item) =>
//                         item !== undefined &&
//                         item !== null
//                 )
//                 .flatMap((item) => {
//                     if (
//                         typeof item === 'string' &&
//                         item.includes(',')
//                     ) {
//                         return item
//                             .split(',')
//                             .map((value) =>
//                                 String(value).trim()
//                             );
//                     }

//                     return [
//                         String(item).trim()
//                     ];
//                 })
//                 .filter(Boolean);
//         };

//         /*
//          * =====================================================
//          * PAGINATION
//          * =====================================================
//          */
//         const page = Math.max(
//             Number(params?.page) || 1,
//             1
//         );

//         const limit = Math.max(
//             Number(params?.limit) || 10,
//             1
//         );

//         const offset = (page - 1) * limit;

//         /*
//          * =====================================================
//          * KEYWORD
//          * =====================================================
//          */
//         const keyword = String(
//             params?.keyword || ''
//         ).trim();

//         /*
//          * =====================================================
//          * SALES OFFICE
//          * =====================================================
//          */
//         const salesOffices = normalizeFilterValues(
//             params?.sales_office ??
//             params?.['sales_office[]']
//         );

//         /*
//          * =====================================================
//          * CUSTOMER
//          * =====================================================
//          */
//         const customers = normalizeFilterValues(
//             params?.customer ??
//             params?.['customer[]']
//         );

//         /*
//          * =====================================================
//          * STATUS PEMBAYARAN
//          * =====================================================
//          */
//         const statusValues = normalizeFilterValues(
//             params?.status ??
//             params?.['status[]']
//         ).map((item) => item.toUpperCase());

//         /*
//          * =====================================================
//          * STATUS VERIFIKASI
//          * =====================================================
//          */
//         const statusVerifikasiValues = normalizeFilterValues(
//             params?.status_verifikasi ??
//             params?.['status_verifikasi[]']
//         ).map((item) => item.toUpperCase());

//         /*
//          * =====================================================
//          * DATE
//          * =====================================================
//          */
//         const startDate = String(
//             params?.start_date || ''
//         ).trim();

//         const endDate = String(
//             params?.end_date || ''
//         ).trim();

//         /*
//          * =====================================================
//          * CONDITION
//          * =====================================================
//          */
//         let condition = '';

//         /*
//          * =====================================================
//          * BIND
//          * =====================================================
//          */
//         const bind = {
//             limit,
//             offset
//         };

//         /*
//          * =====================================================
//          * SEARCH KEYWORD
//          * =====================================================
//          */
//         if (keyword) {
//             condition += `
//                 AND (
//                     p.no_faktur ILIKE :keyword
//                     OR p.no_billing ILIKE :keyword
//                     OR p.customer ILIKE :keyword
//                     OR p.sales ILIKE :keyword
//                     OR p.nama_sales ILIKE :keyword
//                     OR p.cabang ILIKE :keyword
//                     OR p.principle ILIKE :keyword
//                     OR p.document_type ILIKE :keyword
//                     OR p.posting_date::text ILIKE :keyword
//                     OR p.jatuh_tempo::text ILIKE :keyword

//                     OR mc.name ILIKE :keyword
//                     OR mr.ur_ref ILIKE :keyword
//                     OR mp.nama_principle ILIKE :keyword

//                     OR fp.nip ILIKE :keyword
//                     OR mu.nama ILIKE :keyword
//                     OR fp.kd_status ILIKE :keyword

//                     OR cod.total_nominal_billing::text
//                        ILIKE :keyword

//                     OR pay.total_nominal_bayar::text
//                        ILIKE :keyword

//                     OR verifikasi.kd_status_verifikasi
//                        ILIKE :keyword
//                 )
//             `;

//             bind.keyword = `%${keyword}%`;
//         }

//         /*
//          * =====================================================
//          * FILTER CABANG
//          * =====================================================
//          */
//         if (
//             salesOffices.length &&
//             !salesOffices.some(
//                 (item) => item.toUpperCase() === 'ALL'
//             )
//         ) {
//             condition += `
//                 AND p.cabang IN (:sales_offices)
//             `;

//             bind.sales_offices = salesOffices;
//         }

//         /*
//          * =====================================================
//          * FILTER CUSTOMER
//          * =====================================================
//          */
//         if (
//             customers.length &&
//             !customers.some(
//                 (item) => item.toUpperCase() === 'ALL'
//             )
//         ) {
//             condition += `
//                 AND p.customer IN (:customers)
//             `;

//             bind.customers = customers;
//         }

//         /*
//          * =====================================================
//          * FILTER STATUS PEMBAYARAN
//          * =====================================================
//          */
//         const allowedStatus = [
//             'BELUM_DIBAYAR',
//             'PARTIAL',
//             'MENUNGGU_PEMBAYARAN',
//             'SUDAH_DIBAYAR'
//         ];

//         const filteredStatusValues = statusValues.filter(
//             (item) => item !== 'ALL'
//         );

//         if (filteredStatusValues.length) {
//             const invalidStatus = filteredStatusValues.find(
//                 (item) => !allowedStatus.includes(item)
//             );

//             if (invalidStatus) {
//                 throw new Error(
//                     'Status hanya boleh BELUM_DIBAYAR, PARTIAL, MENUNGGU_PEMBAYARAN atau SUDAH_DIBAYAR'
//                 );
//             }

//             const statusConditions = [];

//             /*
//              * BELUM DIBAYAR
//              */
//             if (
//                 filteredStatusValues.includes('BELUM_DIBAYAR')
//             ) {
//                 statusConditions.push(`
//                     (
//                         COALESCE(
//                             pay.total_nominal_bayar,
//                             0
//                         ) <= 0

//                         AND COALESCE(p.dpp, 0) > 0
//                     )
//                 `);
//             }

//             /*
//              * PARTIAL
//              */
//             if (filteredStatusValues.includes('PARTIAL')) {
//                 statusConditions.push(`
//                     (
//                         COALESCE(
//                             pay.total_nominal_bayar,
//                             0
//                         ) > 0

//                         AND COALESCE(
//                             pay.total_nominal_bayar,
//                             0
//                         ) < COALESCE(p.dpp, 0)
//                     )
//                 `);
//             }

//             /*
//              * SUDAH DIBAYAR
//              */
//             if (
//                 filteredStatusValues.includes('SUDAH_DIBAYAR')
//             ) {
//                 statusConditions.push(`
//                     (
//                         COALESCE(
//                             pay.total_nominal_bayar,
//                             0
//                         ) >= COALESCE(p.dpp, 0)

//                         AND COALESCE(p.dpp, 0) > 0
//                     )
//                 `);
//             }

//             /*
//              * MENUNGGU PEMBAYARAN
//              */
//             if (
//                 filteredStatusValues.includes(
//                     'MENUNGGU_PEMBAYARAN'
//                 )
//             ) {
//                 statusConditions.push(`
//                     (
//                         1 = 0
//                     )
//                 `);
//             }

//             if (statusConditions.length) {
//                 condition += `
//                     AND (
//                         ${statusConditions.join(' OR ')}
//                     )
//                 `;
//             }
//         }

//         /*
//          * =====================================================
//          * FILTER STATUS VERIFIKASI
//          * =====================================================
//          */
//         const allowedVerificationStatus = [
//             'VERIFIED',
//             'BELUM_DIVERIFIKASI'
//         ];

//         const filteredVerificationValues =
//             statusVerifikasiValues.filter(
//                 (item) => item !== 'ALL'
//             );

//         if (filteredVerificationValues.length) {
//             const invalidVerificationStatus =
//                 filteredVerificationValues.find(
//                     (item) =>
//                         !allowedVerificationStatus.includes(item)
//                 );

//             if (invalidVerificationStatus) {
//                 throw new Error(
//                     'Status verifikasi hanya boleh VERIFIED atau BELUM_DIVERIFIKASI'
//                 );
//             }

//             const verificationConditions = [];

//             /*
//              * VERIFIED
//              */
//             if (
//                 filteredVerificationValues.includes('VERIFIED')
//             ) {
//                 verificationConditions.push(`
//                     (
//                         verifikasi.kd_status_verifikasi = 'S'
//                     )
//                 `);
//             }

//             /*
//              * BELUM DIVERIFIKASI
//              */
//             if (
//                 filteredVerificationValues.includes(
//                     'BELUM_DIVERIFIKASI'
//                 )
//             ) {
//                 verificationConditions.push(`
//                     (
//                         verifikasi.kd_status_verifikasi IS NULL
//                     )
//                 `);
//             }

//             if (verificationConditions.length) {
//                 condition += `
//                     AND (
//                         ${verificationConditions.join(' OR ')}
//                     )
//                 `;
//             }
//         }

//         /*
//          * =====================================================
//          * FILTER TANGGAL AWAL
//          * =====================================================
//          */
//         if (startDate) {
//             condition += `
//                 AND p.posting_date >= :start_date
//             `;

//             bind.start_date = startDate;
//         }

//         /*
//          * =====================================================
//          * FILTER TANGGAL AKHIR
//          * =====================================================
//          */
//         if (endDate) {
//             condition += `
//                 AND p.posting_date < (
//                     CAST(:end_date AS DATE)
//                     + INTERVAL '1 day'
//                 )
//             `;

//             bind.end_date = endDate;
//         }

//         /*
//          * =====================================================
//          * LIST DATA
//          * =====================================================
//          */
//         const listQuery =
//             query.getDataBayarFaktur.replace(
//                 ':condition',
//                 condition
//             );

//         const listData = await db.query(
//             listQuery,
//             {
//                 replacements: bind,
//                 type: db.QueryTypes.SELECT,
//                 logging: console.log
//             }
//         );

//         /*
//          * =====================================================
//          * HISTORY PEMBAYARAN
//          * =====================================================
//          */
//         const getHistoryPembayaran = async (noBilling) => {
//             try {
//                 if (!noBilling) {
//                     return [];
//                 }

//                 const result = await db.query(
//                     query.getHistoryPembayaranBayarFaktur,
//                     {
//                         replacements: {
//                             no_billing: noBilling
//                         },
//                         type: db.QueryTypes.SELECT
//                     }
//                 );

//                 if (
//                     Array.isArray(
//                         result?.[0]?.h_pembayaran
//                     )
//                 ) {
//                     return result[0].h_pembayaran;
//                 }

//                 if (
//                     typeof result?.[0]?.h_pembayaran === 'string'
//                 ) {
//                     try {
//                         const parsed = JSON.parse(
//                             result[0].h_pembayaran
//                         );

//                         return Array.isArray(parsed)
//                             ? parsed
//                             : [];
//                     } catch (error) {
//                         return [];
//                     }
//                 }

//                 if (Array.isArray(result)) {
//                     return result;
//                 }

//                 return [];
//             } catch (error) {
//                 console.error(
//                     'ERROR GET HISTORY PEMBAYARAN:',
//                     {
//                         no_billing: noBilling,
//                         error: error?.message || error
//                     }
//                 );

//                 return [];
//             }
//         };

//         /*
//          * =====================================================
//          * TAMBAHKAN HISTORY
//          * =====================================================
//          */
//         const listDataWithHistory = await Promise.all(
//             (listData || []).map(async (item) => {
//                 const h_pembayaran = await getHistoryPembayaran(
//                     item?.no_billing
//                 );

//                 return {
//                     ...item,
//                     h_pembayaran
//                 };
//             })
//         );

//         /*
//          * =====================================================
//          * COUNT
//          * =====================================================
//          */
//         const countQuery =
//             query.countDataBayarFaktur.replace(
//                 ':condition',
//                 condition
//             );

//         const countData = await db.query(
//             countQuery,
//             {
//                 replacements: bind,
//                 type: db.QueryTypes.SELECT
//             }
//         );

//         const totalData = Number(
//             countData?.[0]?.total || 0
//         );

//         const totalHalaman = Math.ceil(
//             totalData / limit
//         );

//         /*
//          * =====================================================
//          * SUMMARY
//          * =====================================================
//          */
//         const summaryQuery =
//             query.summaryDataBayarFaktur.replace(
//                 ':condition',
//                 condition
//             );

//         const summaryResult = await db.query(
//             summaryQuery,
//             {
//                 replacements: bind,
//                 type: db.QueryTypes.SELECT
//             }
//         );

//         const summary = summaryResult?.[0] || {};

//         /*
//          * =====================================================
//          * RESPONSE
//          * =====================================================
//          */
//         return {
//             total_data: totalData,
//             total_halaman: totalHalaman,
//             limit,
//             page,

//             list_data: listDataWithHistory,

//             summary: {
//                 // 1. Total Faktur
//                 total_faktur: Number(
//                     summary?.total_faktur || 0
//                 ),

//                 total_nominal_faktur: Number(
//                     summary?.total_nominal_faktur || 0
//                 ),

//                 // 2. Belum Dibayar
//                 belum_dibayar: Number(
//                     summary?.belum_dibayar || 0
//                 ),

//                 nominal_belum_dibayar: Number(
//                     summary?.nominal_belum_dibayar || 0
//                 ),

//                 // 3. Collections Menunggu Verifikasi
//                 total_data_menunggu_verifikasi: Number(
//                     summary?.total_data_menunggu_verifikasi || 0
//                 ),

//                 total_collections_menunggu_verifikasi: Number(
//                     summary?.total_collections_menunggu_verifikasi || 0
//                 ),

//                 // 4. Collections Tidak Terverifikasi
//                 total_data_tidak_terverifikasi: Number(
//                     summary?.total_data_tidak_terverifikasi || 0
//                 ),

//                 total_collections_tidak_terverifikasi: Number(
//                     summary?.total_collections_tidak_terverifikasi || 0
//                 ),

//                 // 5. Collections Terverifikasi
//                 total_data_terverifikasi: Number(
//                     summary?.total_data_terverifikasi || 0
//                 ),

//                 total_collections_terverifikasi: Number(
//                     summary?.total_collections_terverifikasi || 0
//                 ),

//                 // 6. Total Saldo Piutang
//                 total_saldo_piutang: Number(
//                     summary?.total_saldo_piutang || 0
//                 ),

//                 // 7. Total Penerimaan Lain
//                 total_penerimaan_lain: Number(
//                     summary?.total_penerimaan_lain || 0
//                 )
//             }
//         };
//     } catch (error) {
//         console.error(
//             'ERROR SERVICE GET DATA BAYAR FAKTUR:',
//             error
//         );

//         throw error;
//     }
// };

exports.getDataBayarFaktur = async (params) => {
    try {
        const penerimaanLainId = params?.penerimaan_lain_id || null;
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

        const offset = (page - 1) * limit;

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
        const salesOffices = normalizeFilterValues(
            params?.sales_office ??
            params?.['sales_office[]']
        );

        /*
         * =====================================================
         * CUSTOMER
         * =====================================================
         */
        const customers = normalizeFilterValues(
            params?.customer ??
            params?.['customer[]']
        );

        /*
         * =====================================================
         * STATUS PEMBAYARAN
         * =====================================================
         */
        const statusValues = normalizeFilterValues(
            params?.status ??
            params?.['status[]']
        ).map((item) => item.toUpperCase());

        /*
         * =====================================================
         * STATUS VERIFIKASI
         * =====================================================
         */
        const statusVerifikasiValues = normalizeFilterValues(
            params?.status_verifikasi ??
            params?.['status_verifikasi[]']
        ).map((item) => item.toUpperCase());

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
 * FILTER PENERIMAAN LAIN
 * Mengambil billing berdasarkan d_pembayaran.penerimaan_lain_id
 * =====================================================
 */
        if (
            penerimaanLainId !== undefined &&
            penerimaanLainId !== null &&
            String(penerimaanLainId).trim() !== ''
        ) {
            condition += `
        AND EXISTS (
            SELECT 1
            FROM public.d_pembayaran dp_penerimaan_lain
            WHERE dp_penerimaan_lain.penerimaan_lain_id = :penerimaan_lain_id
              AND BTRIM(COALESCE(dp_penerimaan_lain.no_billing, '')) =
                  BTRIM(COALESCE(p.no_billing, ''))
        )
    `;

            bind.penerimaan_lain_id = penerimaanLainId;
        }

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

            bind.keyword = `%${keyword}%`;
        }

        /*
         * =====================================================
         * FILTER CABANG
         * =====================================================
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
         * =====================================================
         * FILTER CUSTOMER
         * =====================================================
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

        const filteredStatusValues = statusValues.filter(
            (item) => item !== 'ALL'
        );

        if (filteredStatusValues.length) {
            const invalidStatus = filteredStatusValues.find(
                (item) => !allowedStatus.includes(item)
            );

            if (invalidStatus) {
                throw new Error(
                    'Status hanya boleh BELUM_DIBAYAR, PARTIAL, MENUNGGU_PEMBAYARAN atau SUDAH_DIBAYAR'
                );
            }

            const statusConditions = [];

            /*
             * BELUM DIBAYAR
             */
            if (
                filteredStatusValues.includes('BELUM_DIBAYAR')
            ) {
                statusConditions.push(`
                    (
                        COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) <= 0

                        AND COALESCE(p.dpp, 0) > 0
                    )
                `);
            }

            /*
             * PARTIAL
             */
            if (filteredStatusValues.includes('PARTIAL')) {
                statusConditions.push(`
                    (
                        COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) > 0

                        AND COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) < COALESCE(p.dpp, 0)
                    )
                `);
            }

            /*
             * SUDAH DIBAYAR
             */
            if (
                filteredStatusValues.includes('SUDAH_DIBAYAR')
            ) {
                statusConditions.push(`
                    (
                        COALESCE(
                            pay.total_nominal_bayar,
                            0
                        ) >= COALESCE(p.dpp, 0)

                        AND COALESCE(p.dpp, 0) > 0
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

            if (statusConditions.length) {
                condition += `
                    AND (
                        ${statusConditions.join(' OR ')}
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
                (item) => item !== 'ALL'
            );

        if (filteredVerificationValues.length) {
            const invalidVerificationStatus =
                filteredVerificationValues.find(
                    (item) =>
                        !allowedVerificationStatus.includes(item)
                );

            if (invalidVerificationStatus) {
                throw new Error(
                    'Status verifikasi hanya boleh VERIFIED atau BELUM_DIVERIFIKASI'
                );
            }

            const verificationConditions = [];

            /*
             * VERIFIED
             */
            if (
                filteredVerificationValues.includes('VERIFIED')
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

            if (verificationConditions.length) {
                condition += `
                    AND (
                        ${verificationConditions.join(' OR ')}
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

            bind.start_date = startDate;
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

            bind.end_date = endDate;
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

        const listData = await db.query(
            listQuery,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
                // logging: console.log
            }
        );

        /*
         * =====================================================
         * HISTORY PEMBAYARAN
         * =====================================================
         */
        const getHistoryPembayaran = async (noBilling) => {
            try {
                if (!noBilling) {
                    return [];
                }

                const result = await db.query(
                    query.getHistoryPembayaranBayarFaktur,
                    {
                        replacements: {
                            no_billing: noBilling
                        },
                        type: db.QueryTypes.SELECT
                    }
                );

                if (
                    Array.isArray(
                        result?.[0]?.h_pembayaran
                    )
                ) {
                    return result[0].h_pembayaran;
                }

                if (
                    typeof result?.[0]?.h_pembayaran === 'string'
                ) {
                    try {
                        const parsed = JSON.parse(
                            result[0].h_pembayaran
                        );

                        return Array.isArray(parsed)
                            ? parsed
                            : [];
                    } catch (error) {
                        return [];
                    }
                }

                if (Array.isArray(result)) {
                    return result;
                }

                return [];
            } catch (error) {
                console.error(
                    'ERROR GET HISTORY PEMBAYARAN:',
                    {
                        no_billing: noBilling,
                        error: error?.message || error
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
        const listDataWithHistory = await Promise.all(
            (listData || []).map(async (item) => {
                const h_pembayaran = await getHistoryPembayaran(
                    item?.no_billing
                );

                return {
                    ...item,
                    h_pembayaran
                };
            })
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
         * =====================================================
         * SUMMARY
         * =====================================================
         */
        const summaryQuery =
            query.summaryDataBayarFaktur.replace(
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

        /*
         * =====================================================
         * RESPONSE
         * =====================================================
         */
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,

            list_data: listDataWithHistory,

            summary: {
                // 1. Total Faktur
                total_faktur: Number(
                    summary?.total_faktur || 0
                ),

                total_nominal_faktur: Number(
                    summary?.total_nominal_faktur || 0
                ),

                // 2. Belum Dibayar
                belum_dibayar: Number(
                    summary?.belum_dibayar || 0
                ),

                nominal_belum_dibayar: Number(
                    summary?.nominal_belum_dibayar || 0
                ),

                // 3. Collections Menunggu Verifikasi
                total_data_menunggu_verifikasi: Number(
                    summary?.total_data_menunggu_verifikasi || 0
                ),

                total_collections_menunggu_verifikasi: Number(
                    summary?.total_collections_menunggu_verifikasi || 0
                ),

                // 4. Collections Tidak Terverifikasi
                total_data_tidak_terverifikasi: Number(
                    summary?.total_data_tidak_terverifikasi || 0
                ),

                total_collections_tidak_terverifikasi: Number(
                    summary?.total_collections_tidak_terverifikasi || 0
                ),

                // 5. Collections Terverifikasi
                total_data_terverifikasi: Number(
                    summary?.total_data_terverifikasi || 0
                ),

                total_collections_terverifikasi: Number(
                    summary?.total_collections_terverifikasi || 0
                ),

                // 6. Total Saldo Piutang
                total_saldo_piutang: Number(
                    summary?.total_saldo_piutang || 0
                ),

                // 7. Total Penerimaan Lain
                total_penerimaan_lain: Number(
                    summary?.total_penerimaan_lain || 0
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
            petugas_nip,
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

        if (status) {
            const userToNotif = await model.m_user.findAll({ where: { nip: petugas_nip } })
            const payNotif = {
                notifikasi_id: uuidv4(),
                no_billing: no_faktur,
                // username: payload?.nip,
                title: 'Verifikasi Pembayaran Faktur',
                body: `Inkaso Sudah Melakukan Verifikasi Pada Pembayaran Yang Anda Masukkan`,
                created_by: payload?.created_by || '',
                kegiatan: 'VERIFIKASI_PENAGIHAN',
                user: [...new Set(userToNotif.map(a => a.user_id))]
            }
            await this.insertNotifikasi(payNotif, transaction)
        }
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


// exports.konfirmasiCustomer = async (
//     payload,
//     transaction
// ) => {
//     try {
//         const {
//             k_piutang_id,
//             nama_customer,
//             keputusan,
//             catatan,
//             tanggal_rencana_pembayaran
//         } = payload;

//         /*
//          * =====================================================
//          * VALIDASI PAYLOAD
//          * =====================================================
//          */

//         if (
//             !Array.isArray(k_piutang_id) ||
//             k_piutang_id.length === 0
//         ) {
//             throw new Error(
//                 'k_piutang_id wajib diisi dalam bentuk array'
//             );
//         }

//         if (
//             !String(nama_customer || '').trim()
//         ) {
//             throw new Error(
//                 'nama_customer wajib diisi'
//             );
//         }

//         /*
//          * =====================================================
//          * MAPPING KEPUTUSAN KE KD_STATUS
//          * =====================================================
//          *
//          * DISETUJUI = S
//          * DITOLAK   = T
//          */

//         const keputusanUpper = String(
//             keputusan || ''
//         ).trim().toUpperCase();

//         let kd_status;

//         if (keputusanUpper === 'DISETUJUI') {
//             kd_status = 'S';
//         } else if (keputusanUpper === 'DITOLAK') {
//             kd_status = 'T';
//         } else {
//             throw new Error(
//                 'keputusan harus DISETUJUI atau DITOLAK'
//             );
//         }

//         /*
//          * =====================================================
//          * VALIDASI CATATAN PENOLAKAN
//          * =====================================================
//          */

//         if (
//             kd_status === 'T' &&
//             !String(catatan || '').trim()
//         ) {
//             throw new Error(
//                 'Catatan penolakan wajib diisi'
//             );
//         }

//         /*
//          * =====================================================
//          * NORMALISASI K_PIUTANG_ID
//          * =====================================================
//          *
//          * Menghapus ID kosong dan duplikat.
//          */

//         const piutangIds = [
//             ...new Set(
//                 k_piutang_id
//                     .filter(
//                         (id) =>
//                             id !== null &&
//                             id !== undefined &&
//                             String(id).trim() !== ''
//                     )
//                     .map(
//                         (id) => String(id).trim()
//                     )
//             )
//         ];

//         if (piutangIds.length === 0) {
//             throw new Error(
//                 'Tidak ada k_piutang_id yang valid'
//             );
//         }

//         /*
//          * =====================================================
//          * TANGGAL KONFIRMASI
//          * =====================================================
//          */

//         const tanggalKonfirmasi = new Date();

//         /*
//          * =====================================================
//          * LOOPING SETIAP PIUTANG
//          * =====================================================
//          */

//         const hasil = [];

//         for (const idPiutang of piutangIds) {

//             /*
//              * =================================================
//              * INSERT HISTORY KE D_STATUS
//              * =================================================
//              */

//             const dataStatus = {
//                 foreign_id: idPiutang,

//                 kegiatan: 'KONFIRMASI_CUSTOMER',

//                 kd_status: kd_status,

//                 keterangan: String(
//                     catatan || ''
//                 ).trim(),

//                 created_by: String(
//                     nama_customer
//                 ).trim(),
//             };

//             const status =
//                 await model.d_status.create(
//                     dataStatus,
//                     {
//                         transaction
//                     }
//                 );

//             if (status) {
//                 const kPiutang = await model.k_piutang.findOne({
//                     where: {
//                         k_piutang_id: idPiutang
//                     }
//                 })
//                 const dataPiutang = await model.d_piutang.findOne({
//                     where: {
//                         piutang_id: kPiutang?.piutang_id
//                     }
//                 })
//                 const userToNotif = await model.m_role_user.findAll({ where: { cabang_id: dataPiutang?.cabang, role_id: '03' }, returning: true })
//                 const payNotif = {
//                     notifikasi_id: uuidv4(),
//                     no_billing: dataPiutang?.no_billing,
//                     // username: payload?.nip,
//                     title: 'Konfirmasi Dari Customer',
//                     body: `Customer Telah Melakukan Konfirmasi Piutang Pada Billing Ini`,
//                     created_by: payload?.created_by || '',
//                     kegiatan: 'KONFIRMASI_CUSTOMER',
//                     user: [...new Set(userToNotif.map(a => a.user_id))]
//                 }
//                 await this.insertNotifikasi(payNotif, transaction)
//             }

//             /*
//              * Simpan hasil masing-masing piutang.
//              */

//             await model.k_piutang.update({
//                 tgl_rencana_pembayaran: tanggal_rencana_pembayaran
//             }, { where: { k_piutang_id: idPiutang } })

//             hasil.push({
//                 k_piutang_id: idPiutang,
//                 kd_status: kd_status,

//                 status:
//                     kd_status === 'S'
//                         ? 'DISETUJUI'
//                         : 'DITOLAK',

//                 tanggal_verifikasi:
//                     tanggalKonfirmasi,

//                 history: status
//             });
//         }

//         /*
//          * =====================================================
//          * RESPONSE SERVICE
//          * =====================================================
//          */

//         return {
//             nama_customer: String(
//                 nama_customer
//             ).trim(),

//             keputusan: keputusanUpper,

//             kd_status: kd_status,

//             tanggal_rencana_pembayaran:
//                 kd_status === 'S'
//                     ? tanggal_rencana_pembayaran || null
//                     : null,

//             total_piutang: piutangIds.length,

//             berhasil: hasil.filter(
//                 (item) => item.status !== 'SKIPPED'
//             ).length,

//             dilewati: hasil.filter(
//                 (item) => item.status === 'SKIPPED'
//             ).length,

//             detail: hasil
//         };

//     } catch (error) {
//         console.error(
//             'ERROR SERVICE KONFIRMASI CUSTOMER:',
//             error
//         );

//         throw error;
//     }
// };



exports.konfirmasiCustomer = async (
    payload,
    files,
    transaction
) => {
    try {
        const {
            k_piutang_id,
            nama_customer,
            keputusan,
            catatan,
            tanggal_rencana_pembayaran
        } = payload;

        /*
         * =====================================================
         * VALIDASI PAYLOAD
         * =====================================================
         */

        let piutangIdInput = k_piutang_id;

        // Antisipasi jika k_piutang_id dikirim sebagai JSON string.
        if (typeof piutangIdInput === 'string') {
            try {
                piutangIdInput = JSON.parse(piutangIdInput);
            } catch (error) {
                throw new Error(
                    'Format k_piutang_id tidak valid'
                );
            }
        }

        if (
            !Array.isArray(piutangIdInput) ||
            piutangIdInput.length === 0
        ) {
            throw new Error(
                'k_piutang_id wajib diisi dalam bentuk array'
            );
        }

        if (!String(nama_customer || '').trim()) {
            throw new Error(
                'nama_customer wajib diisi'
            );
        }

        /*
         * =====================================================
         * VALIDASI FILE SURAT JAWABAN
         * =====================================================
         */

        if (!files || files.length === 0) {
            throw new Error(
                'File surat jawaban wajib diupload'
            );
        }

        const allowedExtensions = [
            '.pdf',
            '.doc',
            '.docx',
            '.jpg',
            '.jpeg',
            '.png'
        ];

        const maxFileSize = 10 * 1024 * 1024; // 10 MB

        for (const file of files) {
            const fileName = String(
                file?.name || ''
            ).toLowerCase();

            const extension = fileName.includes('.')
                ? fileName.substring(
                    fileName.lastIndexOf('.')
                )
                : '';

            if (!allowedExtensions.includes(extension)) {
                throw new Error(
                    'Format surat jawaban harus PDF, DOC, DOCX, JPG, JPEG, atau PNG'
                );
            }

            if (Number(file?.size || 0) > maxFileSize) {
                throw new Error(
                    'Ukuran surat jawaban maksimal 10 MB'
                );
            }
        }

        /*
         * =====================================================
         * MAPPING KEPUTUSAN KE KD_STATUS
         * =====================================================
         *
         * DISETUJUI = S
         * DITOLAK   = T
         */

        const keputusanUpper = String(
            keputusan || ''
        ).trim().toUpperCase();

        let kd_status;

        if (keputusanUpper === 'DISETUJUI') {
            kd_status = 'S';
        } else if (keputusanUpper === 'DITOLAK') {
            kd_status = 'T';
        } else {
            throw new Error(
                'keputusan harus DISETUJUI atau DITOLAK'
            );
        }

        /*
         * =====================================================
         * VALIDASI CATATAN PENOLAKAN
         * =====================================================
         */

        const catatanFinal = String(
            catatan || ''
        ).trim();

        if (
            kd_status === 'T' &&
            !catatanFinal
        ) {
            throw new Error(
                'Catatan penolakan wajib diisi'
            );
        }

        /*
         * =====================================================
         * VALIDASI TANGGAL RENCANA PEMBAYARAN
         * =====================================================
         */

        let tanggalRencanaFinal = null;

        if (kd_status === 'S') {
            if (
                !String(
                    tanggal_rencana_pembayaran || ''
                ).trim()
            ) {
                throw new Error(
                    'Tanggal rencana pembayaran wajib diisi'
                );
            }

            const parsedDate = new Date(
                tanggal_rencana_pembayaran
            );

            if (Number.isNaN(parsedDate.getTime())) {
                throw new Error(
                    'Tanggal rencana pembayaran tidak valid'
                );
            }

            tanggalRencanaFinal =
                tanggal_rencana_pembayaran;
        }

        /*
         * =====================================================
         * NORMALISASI K_PIUTANG_ID
         * =====================================================
         *
         * Menghapus ID kosong dan duplikat.
         */

        const piutangIds = [
            ...new Set(
                piutangIdInput
                    .filter(
                        (id) =>
                            id !== null &&
                            id !== undefined &&
                            String(id).trim() !== ''
                    )
                    .map(
                        (id) => String(id).trim()
                    )
            )
        ];

        if (piutangIds.length === 0) {
            throw new Error(
                'Tidak ada k_piutang_id yang valid'
            );
        }

        /*
         * =====================================================
         * VALIDASI DATA PIUTANG
         * =====================================================
         *
         * Pastikan seluruh piutang ditemukan sebelum upload.
         */

        const dataPiutangList = [];

        for (const idPiutang of piutangIds) {
            const kPiutang =
                await model.k_piutang.findOne({
                    where: {
                        k_piutang_id: idPiutang
                    },
                    transaction
                });

            if (!kPiutang) {
                throw new Error(
                    `Data piutang dengan ID ${idPiutang} tidak ditemukan`
                );
            }

            dataPiutangList.push({
                idPiutang,
                kPiutang
            });
        }

        /*
         * =====================================================
         * UPLOAD SURAT JAWABAN
         * =====================================================
         *
         * Upload satu file untuk seluruh piutang terpilih.
         * Mengikuti pola insertTukarFaktur.
         */

        const uploadDocument =
            await this.processUploadFile(
                payload,
                files,
                transaction
            );

        if (
            !uploadDocument ||
            !uploadDocument.length ||
            !uploadDocument[0]?.path
        ) {
            throw new Error(
                'Upload surat jawaban gagal atau path file tidak ditemukan'
            );
        }

        const filePath = String(
            uploadDocument[0].path
        ).replace(/\\/g, '/');

        /*
         * =====================================================
         * TANGGAL KONFIRMASI
         * =====================================================
         */

        const tanggalKonfirmasi = new Date();

        /*
         * =====================================================
         * LOOPING SETIAP PIUTANG
         * =====================================================
         */

        const hasil = [];

        for (const item of dataPiutangList) {
            const idPiutang = item.idPiutang;
            const kPiutang = item.kPiutang;

            /*
             * =================================================
             * INSERT HISTORY KE D_STATUS
             * =================================================
             *
             * Path file tidak disimpan di d_status.
             */

            const dataStatus = {
                foreign_id: idPiutang,

                kegiatan: 'KONFIRMASI_CUSTOMER',

                kd_status: kd_status,

                keterangan: catatanFinal,

                created_by: String(
                    nama_customer
                ).trim()
            };

            const status =
                await model.d_status.create(
                    dataStatus,
                    {
                        transaction
                    }
                );

            /*
             * =================================================
             * UPDATE KOLOM K_PIUTANG
             * =================================================
             *
             * Surat jawaban disimpan ke:
             * k_piutang.surat_jawaban
             *
             * Tanggal rencana pembayaran hanya diubah
             * apabila keputusan DISETUJUI.
             */

            const updatePiutang = {
                surat_jawaban: filePath
            };

            if (kd_status === 'S') {
                updatePiutang.tgl_rencana_pembayaran =
                    tanggalRencanaFinal;
            }

            await model.k_piutang.update(
                updatePiutang,
                {
                    where: {
                        k_piutang_id: idPiutang
                    },
                    transaction
                }
            );

            /*
             * =================================================
             * AMBIL DATA PIUTANG UNTUK NOTIFIKASI
             * =================================================
             */

            const dataPiutang =
                await model.d_piutang.findOne({
                    where: {
                        piutang_id: kPiutang.piutang_id
                    },
                    transaction
                });

            /*
             * =================================================
             * INSERT NOTIFIKASI
             * =================================================
             */

            if (status && dataPiutang) {
                const userToNotif =
                    await model.m_role_user.findAll({
                        where: {
                            cabang_id: dataPiutang.cabang,
                            role_id: '03'
                        },
                        transaction
                    });

                const payNotif = {
                    notifikasi_id: uuidv4(),

                    no_billing:
                        dataPiutang.no_billing,

                    title:
                        'Konfirmasi Dari Customer',

                    body:
                        'Customer Telah Melakukan Konfirmasi Piutang Pada Billing Ini',

                    created_by:
                        payload?.created_by || '',

                    kegiatan:
                        'KONFIRMASI_CUSTOMER',

                    user: [
                        ...new Set(
                            userToNotif.map(
                                (user) => user.user_id
                            )
                        )
                    ]
                };

                await this.insertNotifikasi(
                    payNotif,
                    transaction
                );
            }

            /*
             * =================================================
             * SIMPAN HASIL
             * =================================================
             */

            hasil.push({
                k_piutang_id: idPiutang,

                kd_status: kd_status,

                status:
                    kd_status === 'S'
                        ? 'DISETUJUI'
                        : 'DITOLAK',

                tanggal_verifikasi:
                    tanggalKonfirmasi,

                surat_jawaban:
                    filePath,

                history: status
            });
        }

        /*
         * =====================================================
         * RESPONSE SERVICE
         * =====================================================
         */

        return {
            nama_customer: String(
                nama_customer
            ).trim(),

            keputusan: keputusanUpper,

            kd_status: kd_status,

            surat_jawaban:
                filePath,

            tanggal_rencana_pembayaran:
                kd_status === 'S'
                    ? tanggalRencanaFinal
                    : null,

            total_piutang:
                piutangIds.length,

            berhasil:
                hasil.length,

            dilewati: 0,

            detail:
                hasil
        };

    } catch (error) {
        console.error(
            'ERROR SERVICE KONFIRMASI CUSTOMER:',
            error
        );

        throw error;
    }
};

exports.getMonitoringPenugasan = async (params = {}) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .flatMap((item) =>
                    typeof item === "string" && item.includes(",")
                        ? item.split(",")
                        : [item]
                )
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        const page = Math.max(1, Number(params?.page) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number(params?.limit) || 10)
        );
        const offset = (page - 1) * limit;

        const keyword = String(params?.keyword || "").trim();

        const salesOffices = normalizeFilterValues(
            params?.sales_office ?? params?.["sales_office[]"]
        );

        const customers = normalizeFilterValues(
            params?.customer ?? params?.["customer[]"]
        );

        const statusTukar = String(
            params?.status_tukar_faktur ??
            params?.status ??
            "ALL"
        ).trim().toUpperCase();

        const statusPembayaran = String(
            params?.status_pembayaran || "ALL"
        ).trim().toUpperCase();

        const startDate = String(params?.start_date || "").trim();
        const endDate = String(params?.end_date || "").trim();

        let condition = "";
        let summaryCondition = "";

        const bind = {
            limit,
            offset,
        };

        const summaryBind = {};

        /*
         * SEARCH
         */
        if (keyword) {
            const searchCondition = `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR mc.name ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
                    OR p.cabang ILIKE :keyword
                    OR mr.ur_ref ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR mp.nama_principle ILIKE :keyword
                    OR COALESCE(fp_tagih.petugas, '') ILIKE :keyword
                )
            `;

            condition += searchCondition;
            summaryCondition += searchCondition;

            bind.keyword = `%${keyword}%`;
            summaryBind.keyword = `%${keyword}%`;
        }

        /*
         * FILTER CABANG
         */
        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) => item.toUpperCase() === "ALL"
            )
        ) {
            const cabangCondition = `
                AND p.cabang IN (:sales_offices)
            `;

            condition += cabangCondition;
            summaryCondition += cabangCondition;

            bind.sales_offices = salesOffices;
            summaryBind.sales_offices = salesOffices;
        }

        /*
         * FILTER CUSTOMER
         */
        if (
            customers.length &&
            !customers.some(
                (item) => item.toUpperCase() === "ALL"
            )
        ) {
            const customerCondition = `
                AND p.customer IN (:customers)
            `;

            condition += customerCondition;
            summaryCondition += customerCondition;

            bind.customers = customers;
            summaryBind.customers = customers;
        }

        /*
         * FILTER STATUS TUKAR FAKTUR
         *
         * ALL
         * BELUM_DITUKAR
         * SUDAH_DITUKAR
         */
        if (statusTukar !== "ALL") {
            if (
                !["BELUM_DITUKAR", "SUDAH_DITUKAR"].includes(
                    statusTukar
                )
            ) {
                throw new Error(
                    "Status tukar faktur tidak valid."
                );
            }

            if (statusTukar === "BELUM_DITUKAR") {
                condition += `
                    AND tf.tukar_faktur_id IS NULL
                `;
            }

            if (statusTukar === "SUDAH_DITUKAR") {
                condition += `
                    AND tf.tukar_faktur_id IS NOT NULL
                `;
            }
        }

        /*
         * FILTER STATUS PEMBAYARAN
         *
         * ALL
         * BELUM_LUNAS
         * SUDAH_LUNAS
         */
        if (statusPembayaran !== "ALL") {
            if (
                !["BELUM_LUNAS", "SUDAH_LUNAS"].includes(
                    statusPembayaran
                )
            ) {
                throw new Error(
                    "Status pembayaran hanya boleh BELUM_LUNAS atau SUDAH_LUNAS."
                );
            }

            const collectionExpression = `
                (
                    COALESCE(cod.total_nominal_billing, 0)
                    + COALESCE(pay.total_nominal_bayar, 0)
                )
            `;

            if (statusPembayaran === "BELUM_LUNAS") {
                condition += `
                    AND ${collectionExpression} < COALESCE(p.dpp, 0)
                `;
            }

            if (statusPembayaran === "SUDAH_LUNAS") {
                condition += `
                    AND COALESCE(p.dpp, 0) > 0
                    AND ${collectionExpression} >= COALESCE(p.dpp, 0)
                `;
            }
        }

        /*
         * FILTER TANGGAL AWAL
         */
        if (startDate) {
            const startCondition = `
                AND p.posting_date::date >= CAST(:start_date AS date)
            `;

            condition += startCondition;
            summaryCondition += startCondition;

            bind.start_date = startDate;
            summaryBind.start_date = startDate;
        }

        /*
         * FILTER TANGGAL AKHIR
         */
        if (endDate) {
            const endCondition = `
                AND p.posting_date::date <= CAST(:end_date AS date)
            `;

            condition += endCondition;
            summaryCondition += endCondition;

            bind.end_date = endDate;
            summaryBind.end_date = endDate;
        }

        /*
         * LIST DATA
         */
        const listQuery = query.getMonitoringPenugasan.replace(
            ":condition",
            condition
        );

        const listData = await db.query(listQuery, {
            replacements: bind,
            type: db.QueryTypes.SELECT,
        });

        /*
         * COUNT DATA
         */
        const countQuery = query.countMonitoringPenugasan.replace(
            ":condition",
            condition
        );

        const countData = await db.query(countQuery, {
            replacements: bind,
            type: db.QueryTypes.SELECT,
        });

        const totalData = Number(
            countData?.[0]?.total || 0
        );

        const totalHalaman = Math.ceil(
            totalData / limit
        );

        /*
         * SUMMARY
         *
         * Mengikuti keyword, cabang, customer, dan tanggal.
         * Tidak dipersempit oleh filter status agar kartu summary
         * tetap menampilkan keseluruhan status sesuai filter umum.
         */
        const summaryQuery =
            query.summaryMonitoringPenugasan.replace(
                ":condition",
                summaryCondition
            );

        const summaryResult = await db.query(summaryQuery, {
            replacements: summaryBind,
            type: db.QueryTypes.SELECT,
        });

        const summary = summaryResult?.[0] || {};

        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary: {
                total_penugasan: Number(
                    summary.total_penugasan || 0
                ),
                belum_tukar_faktur: Number(
                    summary.belum_tukar_faktur || 0
                ),
                sudah_tukar_faktur: Number(
                    summary.sudah_tukar_faktur || 0
                ),
                belum_penagihan: Number(
                    summary.belum_penagihan || 0
                ),
                sudah_penagihan: Number(
                    summary.sudah_penagihan || 0
                ),
            },
        };
    } catch (error) {
        console.error(
            "ERROR SERVICE GET MONITORING PENUGASAN:",
            error
        );

        throw error;
    }
};

exports.getDataReportSales = async (params) => {
    try {
        // =========================================
        // HELPER MULTIPLE FILTER
        // =========================================
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        const isAll = (values) =>
            !values.length ||
            values.some((item) => item.toUpperCase() === "ALL");

        // =========================================
        // PAGINATION & SEARCH
        // =========================================
        const page = Math.max(Number(params?.page) || 1, 1);
        const limit = Math.min(
            Math.max(Number(params?.limit) || 10, 1),
            1000
        );
        const offset = (page - 1) * limit;
        const keyword = String(params?.keyword || "").trim();

        // =========================================
        // FILTER
        // =========================================
        const salesOffices = normalizeFilterValues(
            params?.sales_office ?? params?.["sales_office[]"]
        );

        const customers = normalizeFilterValues(
            params?.customer ?? params?.["customer[]"]
        );

        const channels = normalizeFilterValues(
            params?.channel ?? params?.["channel[]"]
        );

        const principles = normalizeFilterValues(
            params?.principle ?? params?.["principle[]"]
        );

        const startDate = String(params?.start_date || "").trim();
        const endDate = String(params?.end_date || "").trim();

        // =========================================
        // DYNAMIC CONDITION
        // Alias p mengarah ke public.d_piutang
        // =========================================
        let condition = "";

        const filterBind = {};

        if (keyword) {
            condition += `
                AND (
                    p.no_billing ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
                )
            `;

            filterBind.keyword = `%${keyword}%`;
        }

        // sales_office dipetakan ke cabang karena
        // query d_piutang yang diberikan menggunakan kolom cabang.
        if (!isAll(salesOffices)) {
            condition += ` AND p.cabang IN (:sales_offices) `;
            filterBind.sales_offices = salesOffices;
        }

        if (!isAll(customers)) {
            condition += ` AND p.customer IN (:customers) `;
            filterBind.customers = customers;
        }

        if (!isAll(channels)) {
            condition += ` AND p.channel_id IN (:channels) `;
            filterBind.channels = channels;
        }

        if (!isAll(principles)) {
            condition += ` AND p.principle IN (:principles) `;
            filterBind.principles = principles;
        }

        if (startDate) {
            condition += `
                AND p.posting_date >= CAST(:start_date AS DATE)
            `;

            filterBind.start_date = startDate;
        }

        if (endDate) {
            condition += `
                AND p.posting_date <
                    CAST(:end_date AS DATE) + INTERVAL '1 day'
            `;

            filterBind.end_date = endDate;
        }

        // =========================================
        // EXECUTE DATA, COUNT, SUMMARY
        // Semua memakai filter dan bind yang sama
        // =========================================
        const dataSQL = query.getDataReportSales
            .replace(/:condition/g, condition);

        const countSQL = query.countDataReportSales
            .replace(/:condition/g, condition);

        const summarySQL = query.summaryDataReportSales
            .replace(/:condition/g, condition);

        const [listData, countResult, summaryResult] =
            await Promise.all([
                db.query(dataSQL, {
                    replacements: {
                        ...filterBind,
                        limit,
                        offset,
                    },
                    type: db.QueryTypes.SELECT,
                }),

                db.query(countSQL, {
                    replacements: {
                        ...filterBind,
                    },
                    type: db.QueryTypes.SELECT,
                }),

                db.query(summarySQL, {
                    replacements: {
                        ...filterBind,
                    },
                    type: db.QueryTypes.SELECT,
                }),
            ]);

        // =========================================
        // RESULT
        // =========================================
        const totalData = Number(
            countResult?.[0]?.total_data || 0
        );

        const summaryData = summaryResult?.[0] || {};

        return {
            total_data: totalData,
            total_halaman: Math.ceil(totalData / limit),
            page,
            limit,

            list_data: listData.map((item) => ({
                ...item,
                total_transaksi: Number(item.total_transaksi || 0),
                total_customer: Number(item.total_customer || 0),
                total_penjualan: Number(item.total_penjualan || 0),
                total_pencairan: Number(item.total_pencairan || 0),
                total_sisa_pencairan: Number(
                    item.total_sisa_pencairan || 0
                ),
            })),

            summary: {
                total_penjualan: Number(
                    summaryData.total_penjualan || 0
                ),
                total_pencairan: Number(
                    summaryData.total_pencairan || 0
                ),
                total_sisa_pencairan: Number(
                    summaryData.total_sisa_pencairan || 0
                ),
                total_transaksi: Number(
                    summaryData.total_transaksi || 0
                ),
                total_customer: Number(
                    summaryData.total_customer || 0
                ),
            },
        };
    } catch (error) {
        console.error(
            "ERROR SERVICE GET DATA REPORT SALES:",
            error
        );

        throw error;
    }
};

exports.getDetailPenjualan = async (params) => {
    try {
        const kodeSales = String(
            params?.kode_sales ?? ""
        ).trim();

        if (!kodeSales) {
            throw new Error("Parameter kode_sales wajib diisi");
        }

        const result = await db.query(
            query.getDetailPenjualan,
            {
                replacements: {
                    kode_sales: kodeSales,
                },
                type: db.QueryTypes.SELECT,
            }
        );

        const listData = result.map((item) => ({
            ...item,

            // Nominal penjualan menggunakan DPP.
            "Total Penjualan": Number(
                item["Total Penjualan"] || 0
            ),

            "Tax Amount": Number(
                item["Tax Amount"] || 0
            ),

            PPH: Number(
                item.PPH || 0
            ),

            Aging: Number(
                item.Aging || 0
            ),
        }));

        return {
            total_data: listData.length,
            list_data: listData,
        };
    } catch (error) {
        console.error(
            "ERROR SERVICE GET DETAIL PENJUALAN:",
            error
        );

        throw error;
    }
};


exports.getDetailPencairan = async (params) => {
    try {
        const kodeSales = String(
            params?.kode_sales ?? ""
        ).trim();

        if (!kodeSales) {
            throw new Error("Parameter kode_sales wajib diisi");
        }

        const result = await db.query(
            query.getDetailPencairan,
            {
                replacements: {
                    kode_sales: kodeSales,
                },
                type: db.QueryTypes.SELECT,
            }
        );

        const listData = result.map((item) => ({
            ...item,
            "Total Pembayaran": Number(
                item["Total Pembayaran"] || 0
            ),
        }));

        return {
            total_data: listData.length,
            list_data: listData,
        };
    } catch (error) {
        console.error(
            "ERROR SERVICE GET DETAIL PENCAIRAN:",
            error
        );

        throw error;
    }
};

const normalizeFilterValues = (value) => {
    if (value === undefined || value === null || value === '') {
        return [];
    }

    const values = Array.isArray(value) ? value : [value];

    return values
        .flatMap((item) => {
            if (item === undefined || item === null) {
                return [];
            }

            return String(item)
                .split(',')
                .map((val) => val.trim())
                .filter(Boolean);
        });
};

exports.getDataKonfirmasiPiutang = async (params) => {
    try {
        const page = Math.max(
            1,
            Number(params?.page) || 1
        );

        const limit = Math.min(
            1000,
            Math.max(1, Number(params?.limit) || 10)
        );

        const offset = (page - 1) * limit;

        // =====================================================
        // FILTER DASAR
        // =====================================================
        const keyword = String(
            params?.keyword ?? ''
        ).trim();

        const status = String(
            params?.status ?? 'ALL'
        ).trim();

        const startDate = String(
            params?.start_date ?? ''
        ).trim();

        const endDate = String(
            params?.end_date ?? ''
        ).trim();

        // =====================================================
        // BIND
        // =====================================================
        const bind = {
            limit,
            offset,
        };

        let condition = '';

        // =====================================================
        // FILTER KEYWORD
        // =====================================================
        if (keyword) {
            condition += `
                AND (
                    CAST(kp.k_piutang_id AS TEXT)
                        ILIKE :keyword

                    OR CAST(kp.piutang_id AS TEXT)
                        ILIKE :keyword

                    OR COALESCE(p.no_faktur::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(p.no_billing::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(p.customer::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(p.sales::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(p.cabang::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(p.principle::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(kp.created_by::TEXT, '')
                        ILIKE :keyword

                    OR COALESCE(
                        kp.tgl_kirim_konfirmasi::TEXT,
                        ''
                    ) ILIKE :keyword

                    OR COALESCE(
                        kp.created_at::TEXT,
                        ''
                    ) ILIKE :keyword

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

        // Filter status konfirmasi piutang
        const normalizedStatus = String(status ?? '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_');

        if (normalizedStatus && normalizedStatus !== 'ALL') {
            switch (normalizedStatus) {
                case 'BELUM_DIKIRIM':
                    // Belum pernah dikirim untuk konfirmasi
                    condition += `
                AND kp.k_piutang_id IS NULL
            `;
                    break;

                case 'MENUNGGU_KONFIRMASI':
                case 'MK':
                    // Sudah dikirim, tetapi belum ada keputusan final
                    condition += `
                AND kp.k_piutang_id IS NOT NULL
                AND (
                    ds.kd_status IS NULL
                    OR UPPER(ds.kd_status::TEXT) NOT IN ('S', 'T', 'O')
                )
            `;
                    break;

                case 'DISETUJUI_CUSTOMER':
                case 'STJ':
                case 'S':
                    // Disetujui customer
                    condition += `
                AND UPPER(ds.kd_status::TEXT) = 'S'
            `;
                    break;

                case 'DITOLAK_CUSTOMER':
                case 'TLK':
                case 'T':
                    // Ditolak customer
                    condition += `
                AND UPPER(ds.kd_status::TEXT) = 'T'
            `;
                    break;

                case 'DISETUJUI_OTOMATIS':
                case 'OTO':
                case 'O':
                    // Disetujui otomatis
                    condition += `
                AND UPPER(ds.kd_status::TEXT) = 'O'
            `;
                    break;

                default:
                    throw new Error(
                        `Filter status konfirmasi tidak dikenal: ${status}`
                    );
            }
        }

        // =====================================================
        // FILTER TANGGAL MULAI
        // =====================================================
        if (startDate) {
            condition += `
                AND kp.tgl_kirim_konfirmasi
                    >= CAST(:start_date AS DATE)
            `;

            bind.start_date = startDate;
        }

        // =====================================================
        // FILTER TANGGAL AKHIR
        // Inklusif sampai seluruh waktu pada tanggal akhir
        // =====================================================
        if (endDate) {
            condition += `
                AND kp.tgl_kirim_konfirmasi
                    < (
                        CAST(:end_date AS DATE)
                        + INTERVAL '1 day'
                    )
            `;

            bind.end_date = endDate;
        }

        // =====================================================
        // 1. QUERY LIST DATA
        // =====================================================
        const LIST_QUERY =
            query.getDataKonfirmasiPiutang.replace(
                /:condition/g,
                condition
            );

        const listData = await db.query(
            LIST_QUERY,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
            }
        );

        // =====================================================
        // 2. QUERY COUNT DATA
        // =====================================================
        const COUNT_QUERY =
            query.countDataKonfirmasiPiutang.replace(
                /:condition/g,
                condition
            );

        const countData = await db.query(
            COUNT_QUERY,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
            }
        );

        const totalData = Number(
            countData?.[0]?.total || 0
        );

        const totalHalaman = Math.ceil(
            totalData / limit
        );

        // =====================================================
        // 3. QUERY SUMMARY
        // =====================================================
        const SUMMARY_QUERY =
            query.summaryDataKonfirmasiPiutang.replace(
                /:condition/g,
                condition
            );

        const summaryResult = await db.query(
            SUMMARY_QUERY,
            {
                replacements: bind,
                type: db.QueryTypes.SELECT,
            }
        );

        const summary = {
            total: 0,
            menunggu: 0,
            disetujui: 0,
            ditolak: 0,
            otomatis: 0,
            ...(summaryResult?.[0] || {}),
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
            summary,
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA KONFIRMASI PIUTANG:',
            error
        );

        throw error;
    }
};

exports.getDataKonfirmasiCustomer = async (params) => {
    try {
        // =====================================================
        // VALIDASI PARAMETER
        // =====================================================
        const status = String(
            params?.status ?? ''
        ).trim();

        if (!status) {
            throw new Error(
                'Parameter status (k_konfirmasi_id) wajib diisi.'
            );
        }

        // =====================================================
        // GET DATA KONFIRMASI CUSTOMER + DETAIL BILLING
        // =====================================================
        const result = await db.query(
            query.getDataKonfirmasiCustomer,
            {
                replacements: {
                    status,
                },
                type: db.QueryTypes.SELECT,
            }
        );

        // =====================================================
        // VALIDASI DATA
        // =====================================================
        if (!result || result.length === 0) {
            return null;
        }

        // =====================================================
        // DATA CUSTOMER
        // Ambil informasi header dari billing pertama
        // =====================================================
        const first = result[0];

        const customer = {
            k_konfirmasi_id: first.k_konfirmasi_id,
            customer_id: first.customer_id,
            customer: first.nama_customer,
            nama_customer: first.nama_customer,
            customer_name: first.customer_name,

            cabang: first.cabang,
            nama_cabang: first.nama_cabang,

            principle: first.principle,
            nama_principle: first.nama_principle,

            tanggal_kirim_konfirmasi:
                first.tgl_kirim_konfirmasi,

            // =================================================
            // DETAIL BILLING
            // =================================================
            detail_billing: result.map((item) => ({
                k_piutang_id: item.k_piutang_id,
                piutang_id: item.detail_piutang_id,

                no_billing: item.no_billing,
                no_faktur: item.no_faktur,
                document_type: item.document_type,

                customer_id: item.customer_id,
                customer: item.nama_customer,
                nama_customer: item.nama_customer,

                cabang: item.cabang,
                nama_cabang: item.nama_cabang,

                principle: item.principle,
                nama_principle: item.nama_principle,

                sales: item.sales,
                nama_sales: item.nama_sales,

                posting_date: item.posting_date,
                jatuh_tempo: item.jatuh_tempo,

                dpp: Number(item.dpp || 0),
                ppn: Number(item.ppn || 0),

                total_piutang: Number(
                    item.total_piutang || 0
                ),

                tanggal_kirim_konfirmasi:
                    item.tgl_kirim_konfirmasi,

                // =============================================
                // STATUS KONFIRMASI TERBARU PER BILLING
                // =============================================
                kd_status: item.kd_status ?? null,

                keterangan_konfirmasi:
                    item.keterangan_status ?? null,

                tanggal_konfirmasi:
                    item.tanggal_konfirmasi ?? null,
                tgl_rencana_pembayaran:
                    item.tgl_rencana_pembayaran ?? null,
                jawaban:
                    item.jawaban ?? null,
            })),
        };

        return customer;

    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA KONFIRMASI CUSTOMER:',
            error
        );

        throw error;
    }
};

exports.getDataPenerimaanLain = async (params) => {
    try {
        // =====================================================
        // VALIDASI PARAMETER
        // =====================================================
        const page = Math.max(
            1,
            parseInt(params?.page, 10) || 1
        );

        const limit = Math.max(
            1,
            parseInt(params?.limit, 10) || 10
        );

        const keyword = String(
            params?.keyword ?? ''
        ).trim();

        const offset = (page - 1) * limit;

        // =====================================================
        // GET DATA PENERIMAAN LAIN
        // =====================================================
        const listData = await db.query(
            query.getDataPenerimaanLain,
            {
                replacements: {
                    keyword: `%${keyword}%`,
                    limit,
                    offset,
                },
                type: db.QueryTypes.SELECT,
            }
        );

        // =====================================================
        // TOTAL DATA
        // =====================================================
        const totalData = Number(
            listData?.[0]?.total_data || 0
        );

        // =====================================================
        // TOTAL HALAMAN
        // =====================================================
        const totalHalaman = Math.ceil(
            totalData / limit
        );

        // =====================================================
        // RETURN DATA
        // =====================================================
        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData.map((item) => {
                const { total_data, ...data } = item;
                return data;
            }),
        };

    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA PENERIMAAN LAIN:',
            error
        );

        throw error;
    }
};

exports.getDataLaporan = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];

            return values
                .filter(
                    (item) =>
                        item !== undefined &&
                        item !== null &&
                        String(item).trim() !== ''
                )
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        const page = Math.max(1, Number(params?.page) || 1);
        const limit = Math.max(1, Number(params?.limit) || 10);
        const offset = (page - 1) * limit;
        const keyword = String(params?.keyword || '').trim();

        const salesOffices = normalizeFilterValues(
            params?.sales_office ?? params?.['sales_office[]']
        );
        const customers = normalizeFilterValues(
            params?.customer ?? params?.['customer[]']
        );
        const principles = normalizeFilterValues(
            params?.principle ?? params?.['principle[]']
        );

        const status = String(params?.status || 'ALL').trim();
        const startDate = String(params?.start_date || '').trim();
        const endDate = String(params?.end_date || '').trim();

        let condition = '';
        const filterBind = {};

        // FILTER KEYWORD
        if (keyword) {
            condition += `
                AND (
                    p.no_faktur ILIKE :keyword
                    OR p.no_billing ILIKE :keyword
                    OR p.document_type ILIKE :keyword
                    OR p.customer ILIKE :keyword
                    OR p.sales ILIKE :keyword
                    OR p.nama_sales ILIKE :keyword
                    OR p.cabang ILIKE :keyword
                    OR p.principle ILIKE :keyword
                    OR p.posting_date::text ILIKE :keyword
                    OR p.jatuh_tempo::text ILIKE :keyword
                    OR p.dpp::text ILIKE :keyword
                    OR p.ppn::text ILIKE :keyword
                    OR p.pph::text ILIKE :keyword
                    OR p.total_dibayar_hitung::text ILIKE :keyword
                    OR p.saldo_piutang_hitung::text ILIKE :keyword
                    OR p.aging::text ILIKE :keyword

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
            filterBind.keyword = `%${keyword}%`;
        }

        // FILTER CABANG / SALES OFFICE
        if (salesOffices.length > 0 && !salesOffices.some((item) => item.toUpperCase() === 'ALL')) {
            condition += ` AND p.cabang IN (:sales_offices) `;
            filterBind.sales_offices = salesOffices;
        }

        // FILTER CUSTOMER
        if (customers.length > 0 && !customers.some((item) => item.toUpperCase() === 'ALL')) {
            condition += ` AND p.customer IN (:customers) `;
            filterBind.customers = customers;
        }

        // FILTER STATUS PIUTANG
        if (status && status.toUpperCase() !== 'ALL') {
            condition += `
                AND UPPER(COALESCE(p.status_piutang, '')) = UPPER(:status)
            `;
            filterBind.status = status;
        }

        // FILTER PRINCIPLE
        if (principles.length > 0 && !principles.some((item) => item.toUpperCase() === 'ALL')) {
            condition += ` AND p.principle IN (:principles) `;
            filterBind.principles = principles;
        }

        // FILTER TANGGAL MULAI
        if (startDate) {
            condition += ` AND p.posting_date >= CAST(:start_date AS DATE) `;
            filterBind.start_date = startDate;
        }

        // FILTER TANGGAL SELESAI (inklusif untuk satu hari penuh)
        if (endDate) {
            condition += `
                AND p.posting_date < CAST(:end_date AS DATE) + INTERVAL '1 day'
            `;
            filterBind.end_date = endDate;
        }

        // GET LIST DATA
        const listQuery = query.getDataLaporan.replace(/:condition/g, condition);
        const listData = await db.query(listQuery, {
            replacements: { ...filterBind, limit, offset },
            type: db.QueryTypes.SELECT
        });

        // GET TOTAL DATA
        const countQuery = query.countDataLaporan.replace(/:condition/g, condition);
        const countData = await db.query(countQuery, {
            replacements: filterBind,
            type: db.QueryTypes.SELECT
        });
        const totalData = Number(countData?.[0]?.total || 0);
        const totalHalaman = Math.ceil(totalData / limit);

        // GET SUMMARY
        const summaryQuery = query.summaryDataLaporan.replace(/:condition/g, condition);
        const summaryResult = await db.query(summaryQuery, {
            replacements: filterBind,
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

        return {
            total_data: totalData,
            total_halaman: totalHalaman,
            limit,
            page,
            list_data: listData,
            summary
        };
    } catch (error) {
        console.error('ERROR SERVICE GET DATA LAPORAN:', error);
        throw error;
    }
};

const escapeHtml = (value = "") =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

// exports.konfirmasiPiutang = async (payload = {}, transaction) => {
//     const {
//         id,
//         piutang_id,
//         piutang_ids,
//         no_billing,
//         customer_id,
//         customer,
//         nama_customer,
//         media_email,
//         email_customer,
//         created_by,
//     } = payload;

//     const emailPenerima = String(email_customer || "").trim();

//     if (!transaction) {
//         throw new Error("Transaksi database wajib tersedia.");
//     }

//     // ==================================================
//     // 1. VALIDASI ARRAY BILLING
//     // ==================================================

//     const piutangIds = Array.isArray(piutang_ids)
//         ? piutang_ids
//             .map((value) => String(value ?? "").trim())
//             .filter(Boolean)
//         : [piutang_id ?? id]
//             .filter((value) => value !== undefined && value !== null && value !== "")
//             .map(String);

//     const billingNumbers = Array.isArray(no_billing)
//         ? no_billing
//             .map((value) => String(value ?? "").trim())
//             .filter(Boolean)
//         : [no_billing]
//             .filter(Boolean)
//             .map((value) => String(value).trim());

//     if (!piutangIds.length || !billingNumbers.length) {
//         throw new Error(
//             "ID piutang dan nomor billing wajib diisi."
//         );
//     }

//     if (piutangIds.length !== billingNumbers.length) {
//         throw new Error(
//             "Jumlah ID piutang tidak sama dengan jumlah nomor billing."
//         );
//     }

//     // Hindari ID ganda agar tidak mencatat billing berulang.
//     if (new Set(piutangIds).size !== piutangIds.length) {
//         throw new Error("Terdapat ID piutang yang duplikat.");
//     }

//     // ==================================================
//     // 2. AMBIL SEMUA DATA PIUTANG
//     // ==================================================

//     const dataPiutangList = await model.d_piutang.findAll({
//         where: {
//             piutang_id: piutangIds,
//         },
//         transaction,
//     });

//     if (dataPiutangList.length !== piutangIds.length) {
//         throw new Error(
//             "Ada data piutang yang tidak ditemukan."
//         );
//     }

//     // Urutkan kembali mengikuti urutan payload dari frontend.
//     const byId = new Map(
//         dataPiutangList.map((item) => [
//             String(item.piutang_id),
//             item,
//         ])
//     );

//     const orderedRows = piutangIds.map((idValue) =>
//         byId.get(String(idValue))
//     );

//     if (orderedRows.some((item) => !item)) {
//         throw new Error("Data piutang tidak lengkap.");
//     }

//     // ==================================================
//     // 3. VALIDASI CUSTOMER
//     // ==================================================

//     const firstPiutang = orderedRows[0];

//     const nama =
//         nama_customer ||
//         firstPiutang.nama_customer ||
//         firstPiutang.customer_name ||
//         "-";

//     const kodeCustomer =
//         customer ||
//         firstPiutang.customer ||
//         firstPiutang.customer_id ||
//         firstPiutang.kode_customer ||
//         "-";

//     const customerKey = String(kodeCustomer).trim();

//     const mixedCustomer = orderedRows.some((item) => {
//         const key = String(
//             item.customer ??
//             item.customer_id ??
//             item.kode_customer ??
//             ""
//         ).trim();

//         return (
//             key &&
//             customerKey !== "-" &&
//             key !== customerKey
//         );
//     });

//     if (mixedCustomer) {
//         throw new Error(
//             "Semua billing harus berasal dari customer yang sama."
//         );
//     }

//     // ==================================================
//     // 4. SIAPKAN RINCIAN BILLING
//     // ==================================================

//     const rows = orderedRows.map((item, index) => {
//         const dpp = Number(item.dpp || 0);
//         const ppn = Number(item.ppn || 0);

//         const lcAmount = Number(
//             item.lc_amount ??
//             item.nominal_tagihan ??
//             item.total_invoice ??
//             (dpp + ppn)
//         );

//         const partialPayment = Number(
//             item.partial_payment ??
//             item.jumlah_bayar ??
//             item.total_bayar ??
//             0
//         );

//         const balance = Number(
//             item.balance ??
//             item.sisa_piutang ??
//             item.outstanding ??
//             Math.max(lcAmount - partialPayment, 0)
//         );

//         const docDate =
//             item.doc_date ??
//             item.posting_date ??
//             item.tanggal_invoice ??
//             null;

//         const docDateFormatted = docDate
//             ? new Intl.DateTimeFormat("id-ID", {
//                 day: "2-digit",
//                 month: "2-digit",
//                 year: "numeric",
//                 timeZone: "Asia/Jakarta",
//             }).format(new Date(docDate))
//             : "-";

//         return {
//             id: String(item.piutang_id),
//             noBilling: billingNumbers[index],
//             lcAmount,
//             partialPayment,
//             balance,
//             docDateFormatted,
//         };
//     });

//     const totalLcAmount = rows.reduce(
//         (sum, item) => sum + item.lcAmount,
//         0
//     );

//     const totalPartialPayment = rows.reduce(
//         (sum, item) => sum + item.partialPayment,
//         0
//     );

//     const totalBalance = rows.reduce(
//         (sum, item) => sum + item.balance,
//         0
//     );

//     const waktuPercobaan = new Date();

//     let flagEmail = "F";
//     let keterangan = "";
//     let messageId = null;

//     // ==================================================
//     // 5. KIRIM SATU EMAIL UNTUK SEMUA BILLING
//     // ==================================================

//     const k_konfirmasi_id = uuidv4();

//     try {
//         if (media_email !== true) {
//             throw new Error(
//                 "Media pengiriman email tidak diaktifkan."
//             );
//         }

//         if (!emailPenerima) {
//             throw new Error(
//                 "Email penerima wajib diisi."
//             );
//         }

//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//         if (!emailRegex.test(emailPenerima)) {
//             throw new Error(
//                 "Format email penerima tidak valid."
//             );
//         }

//         if (
//             !process.env.SMTP_USER ||
//             !process.env.SMTP_PASS
//         ) {
//             throw new Error(
//                 "Konfigurasi SMTP belum lengkap."
//             );
//         }

//         const subject =
//             `Permintaan Konfirmasi Piutang Pelanggan - ${nama}`;

//         const tanggalSurat = new Intl.DateTimeFormat(
//             "id-ID",
//             {
//                 day: "2-digit",
//                 month: "long",
//                 year: "numeric",
//                 timeZone: "Asia/Jakarta",
//             }
//         ).format(new Date());

//         // ==================================================
//         // LOGO EMAIL
//         // Variabel fs, logoHeaderPath, logoFixPath,
//         // dan escapeHtml harus tersedia di file service.
//         // ==================================================

//         const headerLogoHtml = `
//             <table role="presentation"
//                 cellpadding="0"
//                 cellspacing="0"
//                 style="border-collapse:collapse;margin-left:auto;">
//                 <tr>
//                     ${fs.existsSync(logoHeaderPath)
//                 ? `
//                                 <td style="vertical-align:middle;padding-left:10px;">
//                                     <img
//                                         src="cid:logoKimiaFarmaHeader"
//                                         alt="Kimia Farma"
//                                         style="display:block;width:auto;height:30px;max-width:120px;border:0;"
//                                     />
//                                 </td>
//                             `
//                 : ""
//             }
//                     ${fs.existsSync(logoFixPath)
//                 ? `
//                                 <td style="vertical-align:middle;padding-left:10px;">
//                                     <img
//                                         src="cid:logoFixHeader"
//                                         alt="Logo Fix"
//                                         style="display:block;width:auto;height:30px;max-width:120px;border:0;"
//                                     />
//                                 </td>
//                             `
//                 : ""
//             }
//                 </tr>
//             </table>
//         `;

//         // ==================================================
//         // BARIS TABEL BILLING
//         // ==================================================

//         const detailRowsHtml = rows.map((row) => `
//             <tr>
//                 <td style="padding:9px 6px;border:1px solid #d1d5db;">
//                     ${escapeHtml(row.noBilling)}
//                 </td>
//                 <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:center;">
//                     ${escapeHtml(row.docDateFormatted)}
//                 </td>
//                 <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
//                     ${escapeHtml(formatRupiah(row.lcAmount))}
//                 </td>
//                 <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
//                     ${escapeHtml(formatRupiah(row.partialPayment))}
//                 </td>
//                 <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
//                     ${escapeHtml(formatRupiah(row.balance))}
//                 </td>
//             </tr>
//         `).join("");

//         // ==================================================
//         // HTML EMAIL
//         // ==================================================

//         const html = `
//             <!DOCTYPE html>
//             <html lang="id">
//             <head>
//                 <meta charset="UTF-8">
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                 <title>${escapeHtml(subject)}</title>
//             </head>
//             <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
//                 <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #d1d5db;padding:32px;box-sizing:border-box;">

//                     <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
//                         ${headerLogoHtml}
//                     </div>

//                     <p style="margin:0 0 8px;">
//                         ${escapeHtml(tanggalSurat)}
//                     </p>

//                     <p style="margin:18px 0 4px;">
//                         Kepada Yth.:
//                     </p>

//                     <p style="margin:0;font-weight:bold;">
//                         ${escapeHtml(nama)}
//                     </p>

//                     <p style="margin:2px 0 0;">
//                         Up. Bagian Keuangan / Penagihan
//                     </p>

//                     <h2 style="text-align:center;font-size:17px;letter-spacing:.5px;margin:30px 0 24px;text-decoration:underline;">
//                         PERMINTAAN KONFIRMASI PIUTANG PELANGGAN
//                     </h2>

//                     <p style="margin:0 0 14px;">
//                         Dengan hormat,
//                     </p>

//                     <p style="line-height:1.7;margin:0 0 14px;">
//                         Bersama email ini kami sampaikan rincian tagihan atas nama
//                         <strong>${escapeHtml(nama)}</strong>, per tanggal
//                         ${escapeHtml(tanggalSurat)}, dengan total saldo piutang sebesar
//                         <strong>${escapeHtml(formatRupiah(totalBalance))}</strong>.
//                     </p>

//                     <p style="line-height:1.7;margin:0 0 14px;">
//                         Demi memastikan keakuratan data, mohon bantuan Bapak/Ibu
//                         untuk melakukan rekonsiliasi terhadap tagihan tersebut dengan
//                         catatan yang Bapak/Ibu miliki. Apabila terdapat perbedaan atau
//                         ketidaksesuaian, kami sangat mengharapkan informasi dari Bapak/Ibu.
//                     </p>

//                     <p style="line-height:1.7;margin:0 0 14px;">
//                         Untuk keperluan tersebut, Bapak/Ibu dapat menghubungi pihak
//                         terkait di PT Kimia Farma Trading Distribution. Mohon cantumkan
//                         catatan atau informasi pendukung apabila terdapat perbedaan
//                         pada rincian transaksi di bawah ini.
//                     </p>

//                     <p style="line-height:1.7;margin:0 0 18px;">
//                         Mengingat pentingnya konfirmasi ini bagi kelengkapan data
//                         piutang kami, kami mengharapkan tanggapan paling lambat
//                         14 (empat belas) hari kalender setelah tanggal email ini.
//                         Apabila kami tidak menerima konfirmasi dalam jangka waktu
//                         tersebut, data tagihan akan dianggap sesuai dengan catatan Bapak/Ibu.
//                     </p>

//                     <h3 style="text-align:center;font-size:14px;letter-spacing:1px;margin:26px 0 14px;">
//                         LAMPIRAN PERINCIAN TAGIHAN
//                     </h3>

//                     <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
//                         style="width:100%;border-collapse:collapse;font-size:12px;">

//                         <tr>
//                             <td colspan="5" style="padding:7px;border:1px solid #d1d5db;background:#f8fafc;">
//                                 <strong>Customer:</strong> ${escapeHtml(kodeCustomer)}
//                                 &nbsp;&nbsp;
//                                 <strong>Name:</strong> ${escapeHtml(nama)}
//                             </td>
//                         </tr>

//                         <tr style="background:#e5e7eb;">
//                             <th style="padding:9px 6px;border:1px solid #d1d5db;text-align:left;">
//                                 Bill. Doc.
//                             </th>
//                             <th style="padding:9px 6px;border:1px solid #d1d5db;text-align:center;">
//                                 Doc. Date
//                             </th>
//                             <th style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;">
//                                 LC Amount
//                             </th>
//                             <th style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;">
//                                 Partial Payment
//                             </th>
//                             <th style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;">
//                                 Balance
//                             </th>
//                         </tr>

//                         ${detailRowsHtml}

//                         <tr style="font-weight:bold;background:#f8fafc;">
//                             <td colspan="2" style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;">
//                                 Total
//                             </td>
//                             <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
//                                 ${escapeHtml(formatRupiah(totalLcAmount))}
//                             </td>
//                             <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
//                                 ${escapeHtml(formatRupiah(totalPartialPayment))}
//                             </td>
//                             <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
//                                 ${escapeHtml(formatRupiah(totalBalance))}
//                             </td>
//                         </tr>
//                     </table>

//                     <div style="margin:22px 0;padding:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:6px;">
//                         <p style="margin:0 0 10px;line-height:1.6;font-weight:bold;color:#1e3a8a;">
//                             Silakan melakukan konfirmasi piutang melalui tautan berikut:
//                         </p>
//                         <a href="https://kfcolls-dev.kftd.co.id/konfirmasi-customer?status=${k_konfirmasi_id}"
//                            target="_blank"
//                            rel="noopener noreferrer"
//                            style="color:#1d4ed8;overflow-wrap:anywhere;line-height:1.7;">
//                             https://kfcolls-dev.kftd.co.id/konfirmasi-customer?status=${k_konfirmasi_id}
//                         </a>
//                     </div>

//                     <p style="line-height:1.7;margin:0 0 14px;">
//                         Terima kasih atas perhatian dan kerja sama Bapak/Ibu.
//                     </p>

//                     <p style="font-size:11px;line-height:1.6;color:#64748b;border-top:1px solid #e5e7eb;padding-top:14px;margin:26px 0 0;">
//                         Email ini dihasilkan secara elektronik dan tidak memerlukan tanda tangan fisik.
//                         Email ini ditujukan untuk keperluan konfirmasi piutang.
//                     </p>
//                 </div>
//             </body>
//             </html>
//         `;
//         // ==================================================
//         // VERSI TEXT EMAIL
//         // ==================================================

//         const text = [
//             tanggalSurat,
//             "",
//             "Kepada Yth.:",
//             nama,
//             "Up. Bagian Keuangan / Penagihan",
//             "",
//             "PERMINTAAN KONFIRMASI PIUTANG PELANGGAN",
//             "",
//             "Dengan hormat,",
//             `Bersama email ini kami sampaikan rincian tagihan atas nama ${nama}, dengan total saldo piutang sebesar ${formatRupiah(totalBalance)}.`,
//             "",
//             "LAMPIRAN PERINCIAN TAGIHAN",
//             `Customer: ${kodeCustomer}`,
//             `Name: ${nama}`,
//             "",
//             "Bill. Doc. | Doc. Date | LC Amount | Partial Payment | Balance",
//             ...rows.map(
//                 (row) =>
//                     `${row.noBilling} | ${row.docDateFormatted} | ${formatRupiah(row.lcAmount)} | ${formatRupiah(row.partialPayment)} | ${formatRupiah(row.balance)}`
//             ),
//             "",
//             `Total LC Amount: ${formatRupiah(totalLcAmount)}`,
//             `Total Partial Payment: ${formatRupiah(totalPartialPayment)}`,
//             `Total Balance: ${formatRupiah(totalBalance)}`,
//             "",
//             "Silakan melakukan konfirmasi piutang melalui tautan berikut:",
//             "https://kfcolls-dev.kftd.co.id/konfirmasi-customer?status=12345",
//             "",
//             "Terima kasih atas perhatian dan kerja sama Bapak/Ibu.",
//         ].join("\n");

//         // ==================================================
//         // ATTACHMENT LOGO
//         // ==================================================

//         const attachments = [];

//         if (fs.existsSync(logoHeaderPath)) {
//             attachments.push({
//                 filename: "logo_kfcolls.png",
//                 path: logoHeaderPath,
//                 cid: "logoKimiaFarmaHeader",
//                 contentDisposition: "inline",
//             });
//         }

//         if (fs.existsSync(logoFixPath)) {
//             attachments.push({
//                 filename: "LOGO_FIX.png",
//                 path: logoFixPath,
//                 cid: "logoFixHeader",
//                 contentDisposition: "inline",
//             });
//         }

//         // ==================================================
//         // KIRIM EMAIL SATU KALI
//         // ==================================================

//         const info = await transporter.sendMail({
//             from: {
//                 name:
//                     process.env.SMTP_FROM_NAME ||
//                     "Konfirmasi Piutang",
//                 address: process.env.SMTP_USER,
//             },
//             to: emailPenerima,
//             subject,
//             text,
//             html,
//             attachments,
//         });

//         flagEmail = "S";
//         messageId = info.messageId;

//         keterangan =
//             "Email konfirmasi piutang berhasil dikirim.";

//     } catch (error) {
//         flagEmail = "F";

//         keterangan =
//             `Gagal mengirim email: ${error.message}`;

//         console.error(
//             "[KONFIRMASI PIUTANG] Gagal:",
//             error.message
//         );
//     }

//     // ==================================================
//     // 6. SIMPAN LOG UNTUK SETIAP BILLING
//     // ==================================================

//     const logKonfirmasi = [];

//     if (flagEmail === "S") {
//         await model.k_konfirmasi.create({
//             k_konfirmasi_id: k_konfirmasi_id,
//             tgl_kirim_konfirmasi: waktuPercobaan,
//             keterangan: email_customer,
//             created_by: created_by
//         }, {
//             transaction,
//         })
//         for (const row of rows) {
//             // Nonaktifkan log konfirmasi sebelumnya untuk billing ini.
//             await model.k_piutang.update(
//                 {
//                     flag_aktif: "T",
//                 },
//                 {
//                     where: {
//                         piutang_id: row.id,
//                         flag_aktif: "Y",
//                     },
//                     transaction,
//                 }
//             );

//             // Buat log baru untuk masing-masing billing.
//             const log = await model.k_piutang.create(
//                 {
//                     k_piutang_id: uuidv4(),
//                     k_konfirmasi_id: k_konfirmasi_id,
//                     piutang_id: row.id,
//                     tgl_kirim_konfirmasi: waktuPercobaan,
//                     keterangan,
//                     created_by: created_by || null,
//                     created_at: new Date(),
//                     flag_wa: "N",
//                     flag_email: flagEmail,
//                     flag_aktif: "Y",
//                     wa: null,
//                     email: emailPenerima || null,
//                 },
//                 {
//                     transaction,
//                 }
//             );

//             logKonfirmasi.push(log);
//         }
//     }

//     // ==================================================
//     // 7. RESPONSE
//     // ==================================================

//     return {
//         status: flagEmail === "S",
//         success: flagEmail === "S",
//         message: keterangan,
//         flag_email: flagEmail,
//         email: emailPenerima || null,

//         jumlah_billing: rows.length,

//         no_billing: rows.map(
//             (row) => row.noBilling
//         ),

//         piutang_ids: rows.map(
//             (row) => row.id
//         ),

//         total_lc_amount: totalLcAmount,
//         total_partial_payment: totalPartialPayment,
//         total_balance: totalBalance,

//         messageId,

//         k_piutang_ids: logKonfirmasi.map(
//             (item) => item.k_piutang_id
//         ),
//     };
// };


exports.konfirmasiPiutang = async (payload = {}, transaction) => {
    const {
        id,
        piutang_id,
        piutang_ids,
        no_billing,
        customer_id,
        customer,
        nama_customer,
        media_email,
        email_customer,
        created_by,
    } = payload;

    const emailPenerima = String(email_customer || "").trim();

    if (!transaction) {
        throw new Error("Transaksi database wajib tersedia.");
    }

    // ==================================================
    // 1. VALIDASI ARRAY BILLING
    // ==================================================

    const piutangIds = Array.isArray(piutang_ids)
        ? piutang_ids
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
        : [piutang_id ?? id]
            .filter(
                (value) =>
                    value !== undefined &&
                    value !== null &&
                    value !== ""
            )
            .map(String);

    const billingNumbers = Array.isArray(no_billing)
        ? no_billing
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
        : [no_billing]
            .filter(Boolean)
            .map((value) => String(value).trim());

    if (!piutangIds.length || !billingNumbers.length) {
        throw new Error(
            "ID piutang dan nomor billing wajib diisi."
        );
    }

    if (piutangIds.length !== billingNumbers.length) {
        throw new Error(
            "Jumlah ID piutang tidak sama dengan jumlah nomor billing."
        );
    }

    // Hindari ID ganda agar tidak mencatat billing berulang.
    if (new Set(piutangIds).size !== piutangIds.length) {
        throw new Error("Terdapat ID piutang yang duplikat.");
    }

    // ==================================================
    // 2. AMBIL SEMUA DATA PIUTANG
    // ==================================================

    const dataPiutangList = await model.d_piutang.findAll({
        where: {
            piutang_id: piutangIds,
        },
        transaction,
    });

    if (dataPiutangList.length !== piutangIds.length) {
        throw new Error(
            "Ada data piutang yang tidak ditemukan."
        );
    }

    // Urutkan kembali mengikuti urutan payload dari frontend.
    const byId = new Map(
        dataPiutangList.map((item) => [
            String(item.piutang_id),
            item,
        ])
    );

    const orderedRows = piutangIds.map((idValue) =>
        byId.get(String(idValue))
    );

    if (orderedRows.some((item) => !item)) {
        throw new Error("Data piutang tidak lengkap.");
    }

    // ==================================================
    // 3. VALIDASI CUSTOMER
    // ==================================================

    const firstPiutang = orderedRows[0];

    const nama =
        nama_customer ||
        firstPiutang.nama_customer ||
        firstPiutang.customer_name ||
        "-";

    const kodeCustomer =
        customer ||
        firstPiutang.customer ||
        firstPiutang.customer_id ||
        firstPiutang.kode_customer ||
        "-";

    const customerKey = String(kodeCustomer).trim();

    const mixedCustomer = orderedRows.some((item) => {
        const key = String(
            item.customer ??
            item.customer_id ??
            item.kode_customer ??
            ""
        ).trim();

        return (
            key &&
            customerKey !== "-" &&
            key !== customerKey
        );
    });

    if (mixedCustomer) {
        throw new Error(
            "Semua billing harus berasal dari customer yang sama."
        );
    }

    // ==================================================
    // 4. SIAPKAN RINCIAN BILLING
    // ==================================================

    const rows = orderedRows.map((item, index) => {
        const dpp = Number(item.dpp || 0);
        const ppn = Number(item.ppn || 0);

        const lcAmount = Number(
            item.lc_amount ??
            item.nominal_tagihan ??
            item.total_invoice ??
            (dpp + ppn)
        );

        const partialPayment = Number(
            item.partial_payment ??
            item.jumlah_bayar ??
            item.total_bayar ??
            0
        );

        const balance = Number(
            item.balance ??
            item.sisa_piutang ??
            item.outstanding ??
            Math.max(lcAmount - partialPayment, 0)
        );

        const docDate =
            item.doc_date ??
            item.posting_date ??
            item.tanggal_invoice ??
            null;

        const docDateFormatted = docDate
            ? new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
            }).format(new Date(docDate))
            : "-";

        // Tanggal jatuh tempo untuk menghitung piutang overdue.
        const dueDate =
            item.due_date ??
            item.net_due_date ??
            item.tanggal_jatuh_tempo ??
            item.jatuh_tempo ??
            item.dueDate ??
            null;

        const dueDateFormatted = dueDate
            ? new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
            }).format(new Date(dueDate))
            : "-";

        return {
            id: String(item.piutang_id),
            noBilling: billingNumbers[index],
            lcAmount,
            partialPayment,
            balance,
            docDate,
            docDateFormatted,
            dueDate,
            dueDateFormatted,
        };
    });

    // ==================================================
    // 5. HITUNG TOTAL PIUTANG
    // ==================================================

    const totalLcAmount = rows.reduce(
        (sum, item) => sum + item.lcAmount,
        0
    );

    const totalPartialPayment = rows.reduce(
        (sum, item) => sum + item.partialPayment,
        0
    );

    const totalBalance = rows.reduce(
        (sum, item) => sum + item.balance,
        0
    );

    // Total piutang jatuh tempo:
    // saldo yang tanggal jatuh temponya sudah terlewati.
    const tanggalHariIni = new Date();
    tanggalHariIni.setHours(0, 0, 0, 0);

    const totalPiutangJatuhTempo = rows.reduce(
        (sum, item) => {
            if (!item.dueDate) {
                return sum;
            }

            const tanggalJatuhTempo = new Date(item.dueDate);

            if (Number.isNaN(tanggalJatuhTempo.getTime())) {
                return sum;
            }

            tanggalJatuhTempo.setHours(0, 0, 0, 0);

            return tanggalJatuhTempo < tanggalHariIni
                ? sum + item.balance
                : sum;
        },
        0
    );

    const waktuPercobaan = new Date();

    let flagEmail = "F";
    let keterangan = "";
    let messageId = null;

    // ==================================================
    // 6. SIAPKAN ID KONFIRMASI
    // ==================================================

    const k_konfirmasi_id = uuidv4();

    // ==================================================
    // 7. KIRIM SATU EMAIL UNTUK SEMUA BILLING
    // ==================================================

    try {
        if (media_email !== true) {
            throw new Error(
                "Media pengiriman email tidak diaktifkan."
            );
        }

        if (!emailPenerima) {
            throw new Error(
                "Email penerima wajib diisi."
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailPenerima)) {
            throw new Error(
                "Format email penerima tidak valid."
            );
        }

        if (
            !process.env.SMTP_USER ||
            !process.env.SMTP_PASS
        ) {
            throw new Error(
                "Konfigurasi SMTP belum lengkap."
            );
        }

        // ==================================================
        // 8. SUBJECT DAN TANGGAL SURAT
        // ==================================================

        const subject = `Konfirmasi Piutang - ${nama}`;

        const tanggalSurat = new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
            }
        ).format(new Date());

        const tanggalSuratDenganKota = `Jakarta, ${tanggalSurat}`;

        // ==================================================
        // 9. LOGO EMAIL
        // Variabel fs, logoHeaderPath, logoFixPath,
        // dan escapeHtml harus tersedia di file service.
        // ==================================================

        const headerLogoHtml = `
            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                style="border-collapse:collapse;margin-left:auto;"
            >
                <tr>
                    ${fs.existsSync(logoHeaderPath)
                ? `
                                <td style="vertical-align:middle;padding-left:10px;">
                                    <img
                                        src="cid:logoKimiaFarmaHeader"
                                        alt="Kimia Farma"
                                        style="display:block;width:auto;height:30px;max-width:120px;border:0;"
                                    />
                                </td>
                            `
                : ""
            }

                    ${fs.existsSync(logoFixPath)
                ? `
                                <td style="vertical-align:middle;padding-left:10px;">
                                    <img
                                        src="cid:logoFixHeader"
                                        alt="Logo Fix"
                                        style="display:block;width:auto;height:30px;max-width:120px;border:0;"
                                    />
                                </td>
                            `
                : ""
            }
                </tr>
            </table>
        `;

        // ==================================================
        // 10. BARIS TABEL RINCIAN FAKTUR
        // Lampiran rincian tetap ditampilkan di email.
        // ==================================================

        const detailRowsHtml = rows.map((row) => `
            <tr>
                <td style="padding:9px 6px;border:1px solid #d1d5db;">
                    ${escapeHtml(row.noBilling)}
                </td>

                <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:center;">
                    ${escapeHtml(row.docDateFormatted)}
                </td>

                <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:center;">
                    ${escapeHtml(row.dueDateFormatted)}
                </td>

                <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
                    ${escapeHtml(formatRupiah(row.lcAmount))}
                </td>

                <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
                    ${escapeHtml(formatRupiah(row.partialPayment))}
                </td>

                <td style="padding:9px 6px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
                    ${escapeHtml(formatRupiah(row.balance))}
                </td>
            </tr>
        `).join("");

        // ==================================================
        // 11. FORMAT RINGKASAN PIUTANG
        // ==================================================

        const ringkasanPiutangHtml = `
            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;"
            >
                <tr>
                    <td style="padding:5px 0;width:240px;">
                        Total Saldo Piutang
                    </td>
                    <td style="padding:5px 0;width:15px;">:</td>
                    <td style="padding:5px 0;font-weight:bold;">
                        ${escapeHtml(formatRupiah(totalBalance))}
                    </td>
                </tr>

                <tr>
                    <td style="padding:5px 0;">
                        Total Piutang Jatuh Tempo
                    </td>
                    <td style="padding:5px 0;">:</td>
                    <td style="padding:5px 0;font-weight:bold;">
                        ${escapeHtml(formatRupiah(totalPiutangJatuhTempo))}
                    </td>
                </tr>
            </table>
        `;

        // ==================================================
        // 12. HTML EMAIL
        // ==================================================

        const html = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >
                <title>${escapeHtml(subject)}</title>
            </head>

            <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
                <div style="max-width:800px;margin:0 auto;background:#ffffff;border:1px solid #d1d5db;padding:32px;box-sizing:border-box;">

                    <!-- LOGO -->
                    <div style="text-align:right;margin-bottom:24px;">
                        ${headerLogoHtml}
                    </div>

                    <!-- TANGGAL SURAT -->
                    <p style="margin:0 0 24px;text-align:right;">
                        ${escapeHtml(tanggalSuratDenganKota)}
                    </p>

                    <!-- TUJUAN SURAT -->
                    <p style="margin:0 0 4px;">
                        Kepada Yth.,
                    </p>

                    <p style="margin:0 0 4px;">
                        Pimpinan
                    </p>

                    <p style="margin:0 0 4px;font-weight:bold;">
                        ${escapeHtml(nama)}
                    </p>

                    <p style="margin:0 0 24px;">
                        di tempat
                    </p>

                    <!-- PERIHAL -->
                    <!-- PERIHAL RATA TENGAH -->
                    <p style="text-align:center;margin:24px 0;font-weight:bold;">
                        Perihal: Konfirmasi Piutang
                    </p>

                    <!-- PEMBUKA SURAT -->
                    <p style="margin:0 0 14px;">
                        Dengan hormat,
                    </p>

                    <p style="line-height:1.8;text-align:justify;margin:0 0 16px;">
                        Teriring salam dan do’a untuk Bapak/Ibu, semoga
                        senantiasa diberikan kesehatan dan kemudahan di dalam
                        menjalankan aktivitas sehari-hari, serta ucapan terima
                        kasih atas kepercayaan dan kerjasama yang telah terjalin
                        selama ini.
                    </p>

                    <p style="line-height:1.8;text-align:justify;margin:0 0 14px;">
                        Selanjutnya, sehubungan dengan kerjasama tersebut,
                        bersama ini kami beritahukan bahwa saat ini piutang
                        dagang
                        <strong>${escapeHtml(nama)}</strong>
                        per tanggal
                        <strong>${escapeHtml(tanggalSurat)}</strong>
                        adalah sebagai berikut:
                    </p>

                    <!-- RINGKASAN PIUTANG -->
                    ${ringkasanPiutangHtml}

                    <p style="line-height:1.8;text-align:justify;margin:0 0 16px;">
                        Kami lampirkan rincian piutang tersebut, mohon untuk
                        dapat dilakukan peninjauan dan pemeriksaan atas data
                        tersebut. Kemudian, mohon agar dibuatkan catatan dan
                        ditandatangani sesuai format terlampir.
                    </p>

                    <p style="line-height:1.8;text-align:justify;margin:0 0 24px;">
                        Demikian pemberitahuan ini disampaikan. Atas perhatian
                        dan kerjasama yang baik, kami ucapkan terima kasih.
                    </p>

                    <!-- TANDA TANGAN -->
                    <div style="margin-top:28px;margin-bottom:28px;">
                        <p style="margin:0 0 8px;">
                            Hormat kami,
                        </p>

                        <p style="margin:0 0 4px;font-weight:bold;">
                            PT Kimia Farma Trading &amp; Distribution
                        </p>

                        <div style="height:64px;"></div>

                        <p style="margin:0;font-weight:bold;text-decoration:underline;">
                            Soni Odang Sonjaya
                        </p>

                        <p style="margin:4px 0 0;">
                            Direktur Keuangan, Manajemen Risiko &amp; SDM
                        </p>
                    </div>

                    <!-- PEMISAH LAMPIRAN -->
                    <div style="border-top:2px solid #1f2937;margin:30px 0 20px;"></div>

                    <h3 style="font-size:16px;text-align:center;margin:0 0 6px;">
                        LAMPIRAN RINCIAN PIUTANG
                    </h3>

                    <p style="font-size:12px;text-align:center;color:#64748b;margin:0 0 18px;">
                        Rincian faktur pelanggan per ${escapeHtml(tanggalSurat)}
                    </p>

                    <!-- IDENTITAS CUSTOMER -->
                    <table
                        role="presentation"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;"
                    >
                        <tr>
                            <td style="padding:8px;border:1px solid #d1d5db;background:#f8fafc;">
                                <strong>Kode Customer:</strong>
                                ${escapeHtml(kodeCustomer)}
                            </td>

                            <td style="padding:8px;border:1px solid #d1d5db;background:#f8fafc;">
                                <strong>Nama Customer:</strong>
                                ${escapeHtml(nama)}
                            </td>
                        </tr>
                    </table>

                    <!-- TABEL RINCIAN FAKTUR -->
                    <table
                        role="presentation"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        style="width:100%;border-collapse:collapse;font-size:11px;"
                    >
                        <thead>
                            <tr style="background:#e5e7eb;">
                                <th style="padding:8px 5px;border:1px solid #d1d5db;text-align:left;">
                                    No. Billing
                                </th>

                                <th style="padding:8px 5px;border:1px solid #d1d5db;text-align:center;">
                                    Tanggal Faktur
                                </th>

                                <th style="padding:8px 5px;border:1px solid #d1d5db;text-align:center;">
                                    Jatuh Tempo
                                </th>

                                <th style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;">
                                    Nominal Tagihan
                                </th>

                                <th style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;">
                                    Pembayaran
                                </th>

                                <th style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;">
                                    Sisa Piutang
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${detailRowsHtml}

                            <tr style="font-weight:bold;background:#f8fafc;">
                                <td
                                    colspan="3"
                                    style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;"
                                >
                                    Total
                                </td>

                                <td style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
                                    ${escapeHtml(formatRupiah(totalLcAmount))}
                                </td>

                                <td style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
                                    ${escapeHtml(formatRupiah(totalPartialPayment))}
                                </td>

                                <td style="padding:8px 5px;border:1px solid #d1d5db;text-align:right;white-space:nowrap;">
                                    ${escapeHtml(formatRupiah(totalBalance))}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- TAUTAN KONFIRMASI -->
                    <div style="margin:24px 0;padding:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:6px;">
                        <p style="margin:0 0 10px;line-height:1.6;font-weight:bold;color:#1e3a8a;">
                            Silakan melakukan konfirmasi piutang melalui tautan berikut:
                        </p>

                        <a
                            href="https://kfcolls-dev.kftd.co.id/konfirmasi-customer?status=${encodeURIComponent(k_konfirmasi_id)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="color:#1d4ed8;overflow-wrap:anywhere;line-height:1.7;"
                        >
                            https://kfcolls-dev.kftd.co.id/konfirmasi-customer?status=${encodeURIComponent(k_konfirmasi_id)}
                        </a>
                    </div>

                    <p style="font-size:11px;line-height:1.6;color:#64748b;border-top:1px solid #e5e7eb;padding-top:14px;margin:26px 0 0;">
                        Email ini dibuat secara elektronik untuk keperluan konfirmasi piutang.
                    </p>

                </div>
            </body>
            </html>
        `;

        // ==================================================
        // 13. VERSI TEXT EMAIL
        // ==================================================

        const text = [
            tanggalSuratDenganKota,
            "",
            "Kepada Yth.,",
            "Pimpinan",
            nama,
            "di tempat",
            "",
            "Perihal : Konfirmasi Piutang",
            "",
            "Dengan hormat,",
            "",
            "Teriring salam dan do’a untuk Bapak/Ibu, semoga senantiasa diberikan kesehatan dan kemudahan di dalam menjalankan aktivitas sehari-hari, serta ucapan terima kasih atas kepercayaan dan kerjasama yang telah terjalin selama ini.",
            "",
            `Selanjutnya, sehubungan dengan kerjasama tersebut, bersama ini kami beritahukan bahwa saat ini piutang dagang ${nama} per tanggal ${tanggalSurat} adalah sebagai berikut:`,
            "",
            `Total Saldo Piutang       : ${formatRupiah(totalBalance)}`,
            `Total Piutang Jatuh Tempo : ${formatRupiah(totalPiutangJatuhTempo)}`,
            "",
            "Kami lampirkan rincian piutang tersebut, mohon untuk dapat dilakukan peninjauan dan pemeriksaan atas data tersebut. Kemudian, mohon agar dibuatkan catatan dan ditandatangani sesuai format terlampir.",
            "",
            "Demikian pemberitahuan ini disampaikan. Atas perhatian dan kerjasama yang baik, kami ucapkan terima kasih.",
            "",
            "Hormat kami,",
            "PT Kimia Farma Trading & Distribution",
            "",
            "",
            "Soni Odang Sonjaya",
            "Direktur Keuangan, Manajemen Risiko & SDM",
            "",
            "LAMPIRAN RINCIAN PIUTANG",
            `Kode Customer: ${kodeCustomer}`,
            `Nama Customer: ${nama}`,
            "",
            "No. Billing | Tanggal Faktur | Jatuh Tempo | Nominal Tagihan | Pembayaran | Sisa Piutang",
            ...rows.map(
                (row) =>
                    `${row.noBilling} | ${row.docDateFormatted} | ${row.dueDateFormatted} | ${formatRupiah(row.lcAmount)} | ${formatRupiah(row.partialPayment)} | ${formatRupiah(row.balance)}`
            ),
            "",
            `Total Nominal Tagihan: ${formatRupiah(totalLcAmount)}`,
            `Total Pembayaran: ${formatRupiah(totalPartialPayment)}`,
            `Total Sisa Piutang: ${formatRupiah(totalBalance)}`,
            "",
            "Silakan melakukan konfirmasi piutang melalui tautan berikut:",
            `https://kfcolls-dev.kftd.co.id/konfirmasi-customer?status=${k_konfirmasi_id}`,
            "",
            "PT Kimia Farma Trading & Distribution",
        ].join("\n");

        // ==================================================
        // 14. ATTACHMENT LOGO
        // ==================================================

        const attachments = [];

        const formatKonfirmasiPath = path.join(
            __dirname,
            "../../files/format-konfirmasi-piutang.docx"
        );

        // Lampiran dokumen Word
        if (fs.existsSync(formatKonfirmasiPath)) {
            attachments.push({
                filename: "format-konfirmasi-piutang.docx",
                path: formatKonfirmasiPath,
                contentType:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
        } else {
            console.warn(
                "[KONFIRMASI PIUTANG] File tidak ditemukan:",
                formatKonfirmasiPath
            );
        }

        if (fs.existsSync(logoHeaderPath)) {
            attachments.push({
                filename: "logo_kfcolls.png",
                path: logoHeaderPath,
                cid: "logoKimiaFarmaHeader",
                contentDisposition: "inline",
            });
        }

        if (fs.existsSync(logoFixPath)) {
            attachments.push({
                filename: "LOGO_FIX.png",
                path: logoFixPath,
                cid: "logoFixHeader",
                contentDisposition: "inline",
            });
        }

        // ==================================================
        // 15. KIRIM EMAIL
        // ==================================================

        const info = await transporter.sendMail({
            from: {
                name:
                    process.env.SMTP_FROM_NAME ||
                    "Konfirmasi Piutang",
                address: process.env.SMTP_USER,
            },
            to: emailPenerima,
            subject,
            text,
            html,
            attachments,
        });

        flagEmail = "S";
        messageId = info.messageId;

        keterangan =
            "Email konfirmasi piutang berhasil dikirim.";

    } catch (error) {
        flagEmail = "F";

        keterangan =
            `Gagal mengirim email: ${error.message}`;

        console.error(
            "[KONFIRMASI PIUTANG] Gagal:",
            error.message
        );
    }

    // ==================================================
    // 16. SIMPAN LOG UNTUK SETIAP BILLING
    // ==================================================

    const logKonfirmasi = [];

    if (flagEmail === "S") {
        await model.k_konfirmasi.create(
            {
                k_konfirmasi_id: k_konfirmasi_id,
                tgl_kirim_konfirmasi: waktuPercobaan,
                keterangan: emailPenerima,
                created_by: created_by,
            },
            {
                transaction,
            }
        );

        for (const row of rows) {
            // Nonaktifkan log konfirmasi sebelumnya untuk billing ini.
            await model.k_piutang.update(
                {
                    flag_aktif: "T",
                },
                {
                    where: {
                        piutang_id: row.id,
                        flag_aktif: "Y",
                    },
                    transaction,
                }
            );

            // Buat log baru untuk masing-masing billing.
            const log = await model.k_piutang.create(
                {
                    k_piutang_id: uuidv4(),
                    k_konfirmasi_id: k_konfirmasi_id,
                    piutang_id: row.id,
                    tgl_kirim_konfirmasi: waktuPercobaan,
                    keterangan,
                    created_by: created_by || null,
                    created_at: new Date(),
                    flag_wa: "N",
                    flag_email: flagEmail,
                    flag_aktif: "Y",
                    wa: null,
                    email: emailPenerima || null,
                },
                {
                    transaction,
                }
            );

            logKonfirmasi.push(log);
        }
    }

    // ==================================================
    // 17. RESPONSE
    // ==================================================

    return {
        status: flagEmail === "S",
        success: flagEmail === "S",
        message: keterangan,
        flag_email: flagEmail,
        email: emailPenerima || null,

        jumlah_billing: rows.length,

        no_billing: rows.map(
            (row) => row.noBilling
        ),

        piutang_ids: rows.map(
            (row) => row.id
        ),

        total_lc_amount: totalLcAmount,
        total_partial_payment: totalPartialPayment,
        total_balance: totalBalance,
        total_piutang_jatuh_tempo: totalPiutangJatuhTempo,

        messageId,

        k_konfirmasi_id:
            flagEmail === "S"
                ? k_konfirmasi_id
                : null,

        k_piutang_ids: logKonfirmasi.map(
            (item) => item.k_piutang_id
        ),
    };
};

exports.alokasiPenerimaanLain = async (payload, transaction) => {
    try {
        const pembayaranId = payload?.penerimaan_lain_id;
        const noBilling = String(payload?.no_billing || "").trim();

        // Validasi input
        if (!pembayaranId) {
            throw new Error("Penerimaan ID wajib diisi");
        }

        if (!noBilling) {
            throw new Error("No Billing wajib diisi");
        }

        const piutang = await model.d_piutang.findOne({
            where: {
                no_billing: noBilling,
            },
        });

        const penerimaanLain = await model.d_penerimaan_lain.findOne({
            where: {
                penerimaan_lain_id: pembayaranId,
            },
        });

        if (!piutang) {
            throw new Error(
                `Data piutang dengan No Billing ${noBilling} tidak ditemukan`
            );
        }

        // 4. Ambil customer dari d_piutang
        const billingToParty = piutang.customer;

        if (!billingToParty) {
            throw new Error(
                `Customer untuk No Billing ${noBilling} tidak ditemukan`
            );
        }

        const pembayaran =
            await model.d_pembayaran.create(
                {
                    pembayaran_id:
                        uuidv4(),

                    bill_to_party:
                        piutang?.customer ||
                        null,

                    no_billing:
                        noBilling ||
                        null,

                    nominal_bayar:
                        parseFloat(piutang?.dpp) + parseFloat(piutang?.ppn),

                    tanggal_pembayaran:
                        penerimaanLain?.tanggal_pembayaran,

                    metode_pembayaran:
                        penerimaanLain?.metode_pembayaran,

                    created_by:
                        payload?.created_by ||
                        'SYSTEM',

                    created_at:
                        new Date(),

                    files:
                        penerimaanLain?.files,

                    keterangan:
                        penerimaanLain?.document_number ||
                        null
                },
                {
                    transaction,
                    returning: true
                }
            );

        // 5. Update data pembayaran
        await model.d_penerimaan_lain.update({
            sisa_penerimaan: payload.sisa_penerimaan,
        }, { where: { penerimaan_lain_id: pembayaranId } });

        return {
            pembayaran_id: pembayaran.pembayaran_id,
            no_billing: pembayaran.no_billing,
            billing_to_party: pembayaran.billing_to_party,
        };
    } catch (error) {
        console.error(
            "ERROR SERVICE ALOKASI PENERIMAAN LAIN:",
            error
        );

        throw error;
    }
};

exports.updateNotifikasiPush = async (payload) => {
    const result = await model.d_notifikasi_push.update(payload, { where: { notifikasi_push_id: payload?.notifikasi_push_id }, returning: true })
    return result
}

exports.readAllNotification = async (payload) => {
    const result = await model.d_notifikasi_push.update({ is_read: 'Y' }, { where: { user_id: payload?.user_id } })
    return result
}

exports.getListNotification = async ({ user_id, page, limit }) => {
    const QUERY = query.getListNotification

    // console.log(user_id, 'user_id');

    const bindList = {
        user_id: String(user_id),
        page: page,
        limit: limit
    }

    const listNotification = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
    })

    return listNotification
}

const normalizeValues = (value) => {
    const values = Array.isArray(value)
        ? value
        : value == null
            ? []
            : [value];

    return values
        .flatMap((item) => {
            if (
                typeof item === 'string' &&
                item.includes(',')
            ) {
                return item.split(',');
            }

            return [item];
        })
        .filter(
            (item) =>
                item !== undefined &&
                item !== null &&
                String(item).trim() !== ''
        )
        .map((item) => String(item).trim())
        .filter(Boolean);
};

const getValues = (params, ...keys) => {
    for (const key of keys) {
        if (params?.[key] !== undefined) {
            return normalizeValues(params[key]);
        }
    }

    return [];
};

// =====================================================
// PERSIAPAN FILTER
// =====================================================
const prepareFilters = (params = {}) => {
    const cabang = getValues(
        params,
        'cabang',
        'cabang[]',
        'sales_office',
        'sales_office[]'
    );

    const principal = getValues(
        params,
        'principal',
        'principal[]',
        'principal_id',
        'principal_id[]'
    );

    const channel = getValues(
        params,
        'channel',
        'channel[]',
        'channel_id',
        'channel_id[]'
    );

    const customer = getValues(
        params,
        'customer',
        'customer[]'
    );

    const produk = getValues(
        params,
        'produk',
        'produk[]',
        'material',
        'material[]'
    );

    // Rentang tanggal dari frontend.
    // Tetap mendukung nama parameter lama.
    const tanggalMulai = String(
        params.tanggal_mulai ||
        params.start_date ||
        params.startDate ||
        ''
    ).trim() || null;

    const tanggalAkhir = String(
        params.tanggal_akhir ||
        params.end_date ||
        params.endDate ||
        params.tanggal ||
        ''
    ).trim() || null;

    const notAll = (values) =>
        values.length > 0 &&
        !values.some(
            (value) => value.toUpperCase() === 'ALL'
        );

    // Sequelize membutuhkan daftar tidak kosong untuk IN (:parameter).
    // Flag *_all membuat filter dilewati jika tidak ada pilihan.
    const actual = (values) =>
        notAll(values)
            ? values
            : ['__NO_FILTER_MATCH__'];

    return {
        cabang: actual(cabang),
        principal: actual(principal),
        channel: actual(channel),
        customer: actual(customer),
        produk: actual(produk),

        cabang_all: !notAll(cabang),
        principal_all: !notAll(principal),
        channel_all: !notAll(channel),
        customer_all: !notAll(customer),
        produk_all: !notAll(produk),

        tanggal_mulai: tanggalMulai,
        tanggal_akhir: tanggalAkhir,

        // Kompatibilitas untuk query lama yang masih memakai :tanggal.
        tanggal: tanggalAkhir
    };
};

// =====================================================
// EKSEKUSI QUERY
// =====================================================
const runSelect = async (
    sql,
    replacements = {}
) => {
    return db.query(sql, {
        replacements,
        type: db.QueryTypes.SELECT
    });
};

const runDashboardQuery = async (
    sql,
    params
) => {
    const filters = prepareFilters(params);

    return runSelect(sql, filters);
};

// =====================================================
// 1. SUMMARY PIUTANG
// =====================================================
exports.getSummaryPiutangDashboard = async (params) => {
    const rows = await runDashboardQuery(
        query.getSummaryPiutangDashboard,
        params
    );

    const row = rows?.[0] || {};

    return {
        total_piutang: Number(row.total_piutang || 0),
        sudah_dibayar: Number(row.sudah_dibayar || 0),
        outstanding: Number(row.outstanding || 0),

        not_due_amount: Number(row.not_due_amount || 0),
        due_soon_amount: Number(row.due_soon_amount || 0),
        overdue_amount: Number(row.overdue_amount || 0),

        paid: Number(row.paid || 0),
        not_due: Number(row.not_due || 0),
        due_soon: Number(row.due_soon || 0),
        overdue: Number(row.overdue || 0)
    };
};

// =====================================================
// 2. TREND SALDO PIUTANG
// =====================================================
exports.getTrendSaldoPiutangDashboard = async (params) => {
    return runDashboardQuery(
        query.getTrendSaldoPiutangDashboard,
        params
    );
};

// =====================================================
// 3. DETAIL PIUTANG
// =====================================================

exports.getDetailPiutangDashboard = async (params = {}) => {
    try {
        const filters = prepareFilters({
            ...params,
            tanggal_mulai: params.tanggal_mulai ?? null,
            tanggal_akhir: params.tanggal_akhir ?? null,
        });

        const page = Math.max(
            1,
            Number.parseInt(params.page, 10) || 1
        );

        const limit = Math.min(
            1000000,
            Math.max(
                1,
                Number.parseInt(params.limit, 10) || 10
            )
        );

        const offset = (page - 1) * limit;

        const replacements = {
            ...filters,
            limit,
            offset
        };

        const [
            listData,
            countData,
            summaryData
        ] = await Promise.all([
            runSelect(
                query.getDetailPiutangDashboard,
                replacements
            ),

            runSelect(
                query.countDetailPiutangDashboard,
                filters
            ),

            runSelect(
                query.getSummaryDetailPiutangDashboard,
                filters
            )
        ]);

        const totalData = Number(
            countData?.[0]?.total_data || 0
        );

        const summaryRow = summaryData?.[0] || {};

        const aging = Array.from(
            { length: 7 },
            (_, index) =>
                Number(summaryRow[`aging_${index}`] || 0)
        );

        const totalOutstanding = Number(
            summaryRow.total_outstanding ??
            aging.reduce(
                (sum, value) => sum + value,
                0
            )
        );

        return {
            list_data: Array.isArray(listData)
                ? listData
                : [],

            total_data: totalData,
            total_halaman: Math.ceil(totalData / limit),
            page,
            limit,

            // Summary mencakup semua data sesuai filter,
            // bukan hanya halaman yang sedang ditampilkan.
            summary: {
                aging,
                aging_0: aging[0],
                aging_1: aging[1],
                aging_2: aging[2],
                aging_3: aging[3],
                aging_4: aging[4],
                aging_5: aging[5],
                aging_6: aging[6],
                total_outstanding: totalOutstanding
            }
        };
    } catch (error) {
        console.error(
            'ERROR SERVICE GET DETAIL PIUTANG DASHBOARD:',
            error
        );

        throw error;
    }
};

// =====================================================
// 4. SALES OPEN INVOICE
// =====================================================
exports.getSalesOpenInvoiceDashboard = async (params) => {
    return runDashboardQuery(
        query.getSalesOpenInvoiceDashboard,
        params
    );
};

// =====================================================
// 5. ANALISIS PIUTANG
// =====================================================
exports.getAnalisisPiutangDashboard = async (params) => {
    return runDashboardQuery(
        query.getAnalisisPiutangDashboard,
        params
    );
};

// =====================================================
// 6. COLLECTION PER CUSTOMER
// =====================================================
exports.getCollectionByCustomerDashboard = async (params) => {
    return runDashboardQuery(
        query.getCollectionByCustomerDashboard,
        params
    );
};

// =====================================================
// 7. PERFORMA PIUTANG PER PRODUK
// =====================================================
exports.getPerformaPiutangProdukDashboard = async (params) => {
    const filters = prepareFilters(params);

    const condition = `
        AND (
            :principal_all = TRUE
            OR dp.principle IN (:principal)
        )

        AND (
            :produk_all = TRUE
            OR dp.material IN (:produk)
        )

        AND (
            :cabang_all = TRUE
            OR dp.sales_office IN (:cabang)
        )

        AND (
            :customer_all = TRUE
            OR dp.bill_to_party IN (:customer)
        )

        AND (
            :channel_all = TRUE
            OR EXISTS (
                SELECT 1
                FROM public.d_piutang pi
                WHERE pi.no_billing = dp.billing_no
                  AND pi.channel_id IN (:channel)
            )
        )

        AND (
            :tanggal_mulai IS NULL
            OR dp.posting_date >= CAST(:tanggal_mulai AS DATE)
        )

        AND (
            :tanggal_akhir IS NULL
            OR dp.posting_date <
                CAST(:tanggal_akhir AS DATE) + INTERVAL '1 day'
        )
    `;

    const sql =
        query.getPerformaPiutangProdukDashboard.replace(
            ':condition',
            condition
        );

    return runSelect(sql, filters);
};

// =====================================================
// 8. MASTER REFERENSI
// Contoh jenis=cabang_id atau channel_id
// Tidak menggunakan filter rentang tanggal.
// =====================================================
exports.getReferensiDashboard = async (params) => {
    const jenis = String(
        params?.jenis || ''
    ).trim();

    if (!jenis) {
        throw new Error(
            'Parameter jenis wajib diisi'
        );
    }

    return runSelect(
        query.getReferensiDashboard,
        { jenis }
    );
};

// =====================================================
// 9. MASTER PRINCIPAL
// Referensi dropdown: tetap menggunakan filter cabang.
// =====================================================
exports.getPrincipleDashboard = async (params) => {
    const filters = prepareFilters(params);

    return runSelect(
        query.getPrincipleDashboard,
        {
            cabang: filters.cabang,
            cabang_all: filters.cabang_all
        }
    );
};

// =====================================================
// 10. MASTER CUSTOMER
// Referensi dropdown: tetap menggunakan filter cabang.
// =====================================================
exports.getCustomerDashboard = async (params) => {
    const filters = prepareFilters(params);

    return runSelect(
        query.getCustomerDashboard,
        {
            cabang: filters.cabang,
            cabang_all: filters.cabang_all
        }
    );
};

// =====================================================
// 11. MASTER PRODUK
// Referensi dropdown: tetap menggunakan filter principal.
// =====================================================
exports.getProdukDashboard = async (params) => {
    const filters = prepareFilters(params);

    return runSelect(
        query.getProdukDashboard,
        {
            principal: filters.principal,
            principal_all: filters.principal_all
        }
    );
};

exports.getSaldoAkhirJatuhTempoDashboard = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .flatMap((item) => String(item).split(','))
                .map((item) => item.trim())
                .filter(Boolean);
        };

        // FILTER DARI FRONTEND
        const cabang = normalizeFilterValues(
            params?.cabang ?? params?.['cabang[]']
        );

        const principles = normalizeFilterValues(
            params?.principal ??
            params?.principal_id ??
            params?.['principal[]'] ??
            params?.['principal_id[]']
        );

        const channels = normalizeFilterValues(
            params?.channel ?? params?.['channel[]']
        );

        const customers = normalizeFilterValues(
            params?.customer ?? params?.['customer[]']
        );

        const produk = normalizeFilterValues(
            params?.produk ?? params?.['produk[]']
        );

        const tanggalMulai = String(
            params?.tanggal_mulai || ''
        ).trim();

        const tanggalAkhir = String(
            params?.tanggal_akhir || ''
        ).trim();

        let condition = '';

        const bind = {};

        // FILTER CABANG
        if (
            cabang.length &&
            !cabang.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.cabang IN (:cabang)
            `;

            bind.cabang = cabang;
        }

        // FILTER PRINCIPAL
        if (
            principles.length &&
            !principles.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.principle IN (:principles)
            `;

            bind.principles = principles;
        }

        // FILTER CHANNEL
        if (
            channels.length &&
            !channels.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.channel_id IN (:channels)
            `;

            bind.channels = channels;
        }

        // FILTER CUSTOMER
        if (
            customers.length &&
            !customers.some((item) => item.toUpperCase() === 'ALL')
        ) {
            condition += `
                AND p.customer IN (:customers)
            `;

            bind.customers = customers;
        }

        // FILTER TANGGAL MULAI
        if (tanggalMulai) {
            condition += `
                AND p.posting_date >= CAST(:tanggal_mulai AS DATE)
            `;

            bind.tanggal_mulai = tanggalMulai;
        }

        // FILTER TANGGAL AKHIR
        if (tanggalAkhir) {
            condition += `
                AND p.posting_date < (
                    CAST(:tanggal_akhir AS DATE) + INTERVAL '1 day'
                )
            `;

            bind.tanggal_akhir = tanggalAkhir;
        }

        /*
         * FILTER PRODUK
         *
         * Belum diterapkan karena contoh struktur d_piutang
         * yang diberikan belum menunjukkan kolom atau relasi produk.
         * Jangan mengasumsikan kolom produk berada di d_piutang.
         */

        console.log(
            {
                cabang,
                principles,
                channels,
                customers,
                produk,
                tanggalMulai,
                tanggalAkhir
            },
            'PARAMS GET SALDO AKHIR JATUH TEMPO DASHBOARD'
        );

        // EKSEKUSI QUERY
        const SQL_QUERY =
            query.getSaldoAkhirJatuhTempoDashboard.replace(
                /:condition/g,
                condition
            );

        const result = await db.query(SQL_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        });

        // PASTIKAN KETIGA KATEGORI SELALU ADA
        const categories = [
            'Belum JTO',
            'Segera JTO',
            'Sudah JTO'
        ];

        const resultMap = new Map(
            result.map((item) => [
                String(item.name).trim().toUpperCase(),
                Number(item.value) || 0
            ])
        );

        return categories.map((name) => ({
            name,
            value: resultMap.get(name.toUpperCase()) || 0
        }));

    } catch (error) {
        console.error(
            'ERROR SERVICE GET SALDO AKHIR JATUH TEMPO DASHBOARD:',
            error
        );

        throw error;
    }
};

exports.getAgingPiutangDashboard = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];

            return values
                .filter((item) => item !== undefined && item !== null)
                .flatMap((item) => String(item).split(","))
                .map((item) => item.trim())
                .filter(Boolean);
        };

        const cabang = normalizeFilterValues(
            params?.cabang ?? params?.["cabang[]"]
        );

        const principals = normalizeFilterValues(
            params?.principal ??
            params?.principal_id ??
            params?.["principal[]"] ??
            params?.["principal_id[]"]
        );

        const channels = normalizeFilterValues(
            params?.channel ?? params?.["channel[]"]
        );

        const customers = normalizeFilterValues(
            params?.customer ?? params?.["customer[]"]
        );

        const tanggalMulai = String(
            params?.tanggal_mulai || ""
        ).trim();

        const tanggalAkhir = String(
            params?.tanggal_akhir || ""
        ).trim();

        let condition = "";
        const bind = {};

        if (
            cabang.length &&
            !cabang.some((item) => item.toUpperCase() === "ALL")
        ) {
            condition += ` AND p.cabang IN (:cabang)`;
            bind.cabang = cabang;
        }

        if (
            principals.length &&
            !principals.some((item) => item.toUpperCase() === "ALL")
        ) {
            condition += ` AND p.principle IN (:principals)`;
            bind.principals = principals;
        }

        if (
            channels.length &&
            !channels.some((item) => item.toUpperCase() === "ALL")
        ) {
            condition += ` AND p.channel_id IN (:channels)`;
            bind.channels = channels;
        }

        if (
            customers.length &&
            !customers.some((item) => item.toUpperCase() === "ALL")
        ) {
            condition += ` AND p.customer IN (:customers)`;
            bind.customers = customers;
        }

        if (tanggalMulai) {
            condition += `
        AND p.posting_date >= CAST(:tanggal_mulai AS DATE)
      `;
            bind.tanggal_mulai = tanggalMulai;
        }

        if (tanggalAkhir) {
            condition += `
        AND p.posting_date < (
          CAST(:tanggal_akhir AS DATE) + INTERVAL '1 day'
        )
      `;
            bind.tanggal_akhir = tanggalAkhir;
        }

        const SQL_QUERY = query.getAgingPiutangDashboard.replace(
            /:condition/g,
            condition
        );

        const result = await db.query(SQL_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT,
        });

        return result.map((item) => ({
            label: item.label,
            value: Number(item.value) || 0,
            percentage: Number(item.percentage) || 0,
        }));
    } catch (error) {
        console.error(
            "ERROR SERVICE GET AGING PIUTANG DASHBOARD:",
            error
        );

        throw error;
    }
};

