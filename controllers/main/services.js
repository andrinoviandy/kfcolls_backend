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
// const LINK_QRCODE = process.env.URL_QRCODE
const LINK_QRCODE = 'https://kfcolls.kftd.co.id/validasi-approval'

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

    try {

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

            disc_beban_kftd_upf_pct_zd08:
                item?.disc_beban_kftd_upf_pct_zd08,

            disc_beban_kftd_upf_amt_zd08:
                item?.disc_beban_kftd_upf_amt_zd08,

            disc_beban_principle_upf_pct_zd09:
                item?.disc_beban_principle_upf_pct_zd09,

            disc_beban_principle_upf_amt_zd09:
                item?.disc_beban_principle_upf_amt_zd09,

            disc_pengembalian_upf_pct_zd10:
                item?.disc_pengembalian_upf_pct_zd10,

            disc_pengembalian_upf_amt_zd10:
                item?.disc_pengembalian_upf_amt_zd10,

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
            created_at: new Date()
        }));

        await model.d_penjualan.bulkCreate(
            dataInsert,
            {
                transaction,
                validate: false,
                returning: false
            }
        );

        result.total_success = dataInsert.length;

        return result;

    } catch (error) {

        console.error(
            "ERROR BULK INSERT D_PENJUALAN:",
            error
        );

        throw error;
    }
};

exports.insertDataPiutang = async (penjualanIds, createdBy, transaction) => {
    if (!penjualanIds?.length) {
        return { total_data: 0, total_success: 0 };
    }

    // DISINI masih salah
    const piutangRows = await db.query(query.getUploadedDataPiutang, {
        replacements: { penjualan_ids: penjualanIds },
        type: db.QueryTypes.SELECT,
        transaction
    });

    const createdAt = new Date();
    const dataInsert = piutangRows.map((item) => ({
        piutang_id: uuidv4(),
        no_faktur: item.billing_no,
        no_billing: item.billing_no,
        document_type: item.document_type,
        customer: item.bill_to_party,
        sales: item.salesman,
        nama_sales: item.name_salesman,
        cabang: item.sales_office,
        principle: item.principle,
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

    const batchSize = 500;
    for (let batchStart = 0; batchStart < dataInsert.length; batchStart += batchSize) {
        await model.d_piutang.bulkCreate(
            dataInsert.slice(batchStart, batchStart + batchSize),
            { transaction, validate: false, returning: false }
        );
    }

    return {
        total_data: dataInsert.length,
        total_success: dataInsert.length
    };
};

exports.uploadPenjualanExcel = async (file, createdBy, transaction) => {
    if (!/\.(xlsx|xls)$/i.test(file?.name || '')) {
        throw new Error('Format file harus .xlsx atau .xls.');
    }

    const workbook = file.tempFilePath
        ? XLSX.readFile(file.tempFilePath, { cellDates: true })
        : XLSX.read(file.data, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error('File Excel tidak memiliki sheet.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
    if (!rows.length) {
        throw new Error('File Excel tidak memiliki data.');
    }

    const normalizeHeader = (value) => String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

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
        quotation_number: 'Quotation Number'
    };
    const headers = Object.keys(rows[0]);
    const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]));
    const missingHeaders = Object.values(columnMap).filter(
        (header) => !normalizedHeaders.has(normalizeHeader(header))
    );
    if (missingHeaders.length) {
        throw new Error(`Format Excel tidak sesuai. Kolom yang belum tersedia: ${missingHeaders.join(', ')}`);
    }

    const numericFields = new Set([
        'quantity', 'unit_price_penjualan', 'dis_pct_zd01', 'dis_amt_zd01',
        'dis_pct_zd02', 'dis_amt_zd02', 'dis_pct_zd03', 'dis_amt_zd03',
        'dis_pct_zd04', 'dis_amt_zd04', 'dis_pct_zd05', 'dis_amt_zd05',
        'dis_pct_zd06', 'dis_amt_zd06', 'disc_upfront_pct_zd07',
        'disc_upfront_amt_zd07', 'disc_beban_kftd_upf_pct_zd08',
        'disc_beban_kftd_upf_amt_zd08', 'disc_beban_principle_upf_pct_zd09',
        'disc_beban_principle_upf_amt_zd09', 'disc_pengembalian_upf_pct_zd10',
        'disc_pengembalian_upf_amt_zd10', 'dis_pct_zd12', 'dis_amt_zd12',
        'dis_pct_zd14', 'dis_amt_zd14', 'dis_pct_zd15', 'dis_amt_zd15',
        'total_discount', 'total_penjualan', 'tax_amount', 'total_cogs',
        'unit_price_pembelian', 'bill_qty_in_sku'
    ]);
    const requiredFields = [
        'sales_office', 'posting_date', 'billing_no', 'material', 'quantity',
        'sales_unit', 'unit_price_penjualan', 'total_penjualan'
    ];
    const parseNumeric = (value) => {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        let cleaned = String(value).trim().replace(/\s/g, '').replace(/[^0-9,.\-]/g, '');
        if (!cleaned) return null;
        if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
                ? cleaned.replace(/\./g, '').replace(',', '.')
                : cleaned.replace(/,/g, '');
        } else if (cleaned.includes(',')) {
            const parts = cleaned.split(',');
            cleaned = parts.length === 2 && parts[1].length !== 3
                ? cleaned.replace(',', '.')
                : cleaned.replace(/,/g, '');
        } else if (cleaned.includes('.')) {
            const parts = cleaned.split('.');
            if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)) {
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
            const parts = XLSX.SSF.parse_date_code(value);
            if (parts) {
                return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
            }
        }
        const text = String(value ?? '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const dmy = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
        if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    };

    const batchSize = 500;
    const result = {
        total_data: 0,
        total_success: 0,
        total_error: 0,
        data_error: []
    };
    const uploadedPenjualanIds = [];

    for (let batchStart = 0; batchStart < rows.length; batchStart += batchSize) {
        const batchRows = rows.slice(batchStart, batchStart + batchSize);
        const payload = [];

        for (let rowIndex = 0; rowIndex < batchRows.length; rowIndex += 1) {
            const row = batchRows[rowIndex];
            if (!Object.values(row).some((value) => String(value ?? '').trim() !== '')) {
                continue;
            }

            const item = {};
            for (const [field, header] of Object.entries(columnMap)) {
                const sourceHeader = normalizedHeaders.get(normalizeHeader(header));
                const value = row[sourceHeader];
                if (field === 'posting_date') {
                    item[field] = parseDate(value);
                } else if (numericFields.has(field)) {
                    item[field] = parseNumeric(value);
                } else {
                    item[field] = value === null || value === undefined ? '' : String(value).trim();
                }
            }

            const excelRow = batchStart + rowIndex + 2;
            const missingData = requiredFields.filter((field) => {
                const value = item[field];
                return value === null || value === undefined || String(value).trim() === '';
            });
            if (missingData.length) {
                throw new Error(`Data pada baris ${excelRow} belum lengkap: ${missingData.join(', ')}`);
            }
            if (!item.posting_date) {
                throw new Error(`Posting Date pada baris ${excelRow} tidak valid.`);
            }

            item.penjualan_id = uuidv4();
            item.is_upload = 1;
            item.created_by = createdBy || null;
            uploadedPenjualanIds.push(item.penjualan_id);
            payload.push(item);
        }

        if (payload.length === 0) {
            continue;
        }

        const batchResult = await exports.insertPenjualanArray(payload, transaction);
        result.total_data += batchResult.total_data;
        result.total_success += batchResult.total_success;
        result.total_error += batchResult.total_error;
        result.data_error.push(...batchResult.data_error);
    }

    if (result.total_data === 0) {
        throw new Error('Tidak ada data penjualan yang dapat diproses.');
    }

    const piutangResult = await exports.insertDataPiutang(
        uploadedPenjualanIds,
        createdBy,
        transaction
    );

    await model.d_penjualan.update(
        { is_upload: 0 },
        {
            where: { penjualan_id: uploadedPenjualanIds },
            transaction
        }
    );

    return {
        ...result,
        total_piutang: piutangResult.total_success
    };
};

exports.getDataPenjualan = async (params) => {
    try {
        const normalizeFilterValues = (value) => {
            const values = Array.isArray(value) ? value : [value];
            return values
                .filter((item) => item !== undefined && item !== null)
                .map((item) => String(item).trim())
                .filter(Boolean);
        };

        // =========================
        // PARAMETER
        // =========================
        const page = Number(params?.page) || 1
        const limit = Number(params?.limit) || 10

        const offset = (page - 1) * limit

        const keyword = String(
            params?.keyword || ''
        ).trim()

        const salesOffices = normalizeFilterValues(
            params?.sales_office ?? params?.['sales_office[]']
        );

        const postingStatus = String(
            params?.posting_status || 'ALL'
        ).trim()

        const customerGroups = normalizeFilterValues(
            params?.customer_group ?? params?.['customer_group[]']
        );

        const principles = normalizeFilterValues(
            params?.principle ?? params?.['principle[]']
        );

        const startDate = String(
            params?.start_date || ''
        ).trim()

        const endDate = String(
            params?.end_date || ''
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
            `

            bind.keyword = `%${keyword}%`
        }

        // =========================
        // SALES OFFICE
        // =========================
        if (salesOffices.length && !salesOffices.some((item) => item.toUpperCase() === 'ALL')) {
            condition += `
                AND dp.sales_office IN (:sales_offices)
            `

            bind.sales_offices = salesOffices
        }

        // =========================
        // POSTING STATUS
        // =========================
        if (
            postingStatus &&
            postingStatus.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.posting_status = :posting_status
            `

            bind.posting_status = postingStatus
        }

        // =========================
        // CUSTOMER GROUP
        // =========================
        if (customerGroups.length && !customerGroups.some((item) => item.toUpperCase() === 'ALL')) {
            condition += `
                AND dp.desc_cust_grp4 IN (:customer_groups)
            `

            bind.customer_groups = customerGroups
        }

        // =========================
        // PRINCIPLE
        // =========================
        if (principles.length && !principles.some((item) => item.toUpperCase() === 'ALL')) {
            condition += `
                AND dp.principle IN (:principles)
            `

            bind.principles = principles
        }

        // =========================
        // START DATE
        // =========================
        if (startDate) {
            condition += `
                AND dp.posting_date >= :start_date
            `

            bind.start_date = startDate
        }

        // =========================
        // END DATE
        // =========================
        if (endDate) {
            condition += `
                AND dp.posting_date <= :end_date
            `

            bind.end_date = endDate
        }

        // =====================================================
        // 1. GET LIST DATA
        // =====================================================
        const LIST_QUERY = query.getDataPenjualan
            .replace(/:condition/g, condition)

        const listData = await db.query(LIST_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        })

        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================
        const COUNT_QUERY = query.countDataPenjualan
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
        // 3. GET SUMMARY
        // =====================================================
        const SUMMARY_QUERY = query.summaryDataPenjualan
            .replace(/:condition/g, condition)

        const summaryResult = await db.query(SUMMARY_QUERY, {
            replacements: bind,
            type: db.QueryTypes.SELECT
        })

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
        }

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
        }

    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA PENJUALAN:',
            error
        )

        throw error
    }
}

exports.getDataPiutang = async (params) => {
    try {

        // =====================================================
        // HELPER NORMALIZE FILTER
        // Bisa menerima:
        // "2244"
        // ["2244", "2238"]
        // params["sales_office[]"]
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
                .map((item) =>
                    String(item).trim()
                )
                .filter(Boolean);
        };


        // =====================================================
        // PARAMETER
        // =====================================================

        const page =
            Number(params?.page) || 1;

        const limit =
            Number(params?.limit) || 10;

        const offset =
            (page - 1) * limit;


        const keyword = String(
            params?.keyword || ''
        ).trim();


        // =====================================================
        // SALES OFFICE
        //
        // Support:
        // sales_office
        // sales_office[]
        // =====================================================

        const salesOffices =
            normalizeFilterValues(
                params?.sales_office ??
                params?.['sales_office[]']
            );


        // =====================================================
        // STATUS
        // =====================================================

        const status = String(
            params?.status || 'ALL'
        ).trim();


        // =====================================================
        // POSTING STATUS
        // =====================================================

        const postingStatus = String(
            params?.posting_status || 'ALL'
        ).trim();


        // =====================================================
        // CUSTOMER GROUP
        // =====================================================

        const customerGroups =
            normalizeFilterValues(
                params?.customer_group ??
                params?.['customer_group[]']
            );


        // =====================================================
        // PRINCIPLE
        //
        // Support:
        // principle
        // principle[]
        // =====================================================

        const principles =
            normalizeFilterValues(
                params?.principle ??
                params?.['principle[]']
            );


        // =====================================================
        // START DATE
        // =====================================================

        const startDate = String(
            params?.start_date || ''
        ).trim();


        // =====================================================
        // END DATE
        // =====================================================

        const endDate = String(
            params?.end_date || ''
        ).trim();


        // =====================================================
        // CONDITION
        // =====================================================

        let condition = ``;


        // =====================================================
        // BIND
        // =====================================================

        const bind = {
            limit,
            offset
        };


        // =====================================================
        // KEYWORD
        // =====================================================

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


                    -- CUSTOMER NAME
                    OR EXISTS (
                        SELECT 1
                        FROM public.m_customer mc_keyword
                        WHERE mc_keyword.kode_customer = p.customer
                          AND mc_keyword.name ILIKE :keyword
                    )


                    -- CABANG NAME
                    OR EXISTS (
                        SELECT 1
                        FROM public.m_referensi mr_keyword
                        WHERE mr_keyword.kd_ref = p.cabang
                          AND mr_keyword.jns_ref = 'cabang_id'
                          AND mr_keyword.ur_ref ILIKE :keyword
                    )


                    -- PRINCIPLE NAME
                    OR EXISTS (
                        SELECT 1
                        FROM public.m_principle mp_keyword
                        WHERE mp_keyword.principle = p.principle
                          AND mp_keyword.nama_principle ILIKE :keyword
                    )
                )
            `;

            bind.keyword =
                `%${keyword}%`;
        }


        // =====================================================
        // SALES OFFICE
        //
        // Payload:
        // sales_office[] = 2244
        // sales_office[] = 2238
        //
        // Karena struktur d_piutang yang Anda lampirkan
        // menggunakan field "cabang", filter sales office
        // diarahkan ke p.cabang.
        // =====================================================

        if (
            salesOffices.length &&
            !salesOffices.some(
                (item) =>
                    item.toUpperCase() === 'ALL'
            )
        ) {

            condition += `
                AND p.cabang IN (:sales_offices)
            `;

            bind.sales_offices =
                salesOffices;
        }


        // =====================================================
        // STATUS PIUTANG
        //
        // Payload:
        // status = OUTSTANDING
        // status = BELUM_LUNAS
        // status = LUNAS
        // =====================================================

        if (
            status &&
            status.toUpperCase() !== 'ALL'
        ) {

            condition += `
                AND UPPER(p.status_piutang)
                    = UPPER(:status)
            `;

            bind.status =
                status;
        }


        // =====================================================
        // POSTING STATUS
        //
        // Catatan:
        // pada struktur d_piutang yang Anda lampirkan,
        // field yang tersedia adalah status_piutang,
        // bukan posting_status.
        //
        // Jadi hanya aktif jika query getDataPiutang
        // memang mempunyai field posting_status.
        // =====================================================

        if (
            postingStatus &&
            postingStatus.toUpperCase() !== 'ALL'
        ) {

            condition += `
                AND p.posting_status = :posting_status
            `;

            bind.posting_status =
                postingStatus;
        }


        // =====================================================
        // CUSTOMER GROUP
        // =====================================================

        if (
            customerGroups.length &&
            !customerGroups.some(
                (item) =>
                    item.toUpperCase() === 'ALL'
            )
        ) {

            condition += `
                AND p.customer IN (:customer_groups)
            `;

            bind.customer_groups =
                customerGroups;
        }


        // =====================================================
        // PRINCIPLE
        //
        // Payload:
        // principle[] = 7000000004
        // principle[] = 7000000005
        // =====================================================

        if (
            principles.length &&
            !principles.some(
                (item) =>
                    item.toUpperCase() === 'ALL'
            )
        ) {

            condition += `
                AND p.principle IN (:principles)
            `;

            bind.principles =
                principles;
        }


        // =====================================================
        // START DATE
        // =====================================================

        if (startDate) {

            condition += `
                AND p.posting_date >= :start_date
            `;

            bind.start_date =
                startDate;
        }


        // =====================================================
        // END DATE
        // =====================================================

        if (endDate) {

            condition += `
                AND p.posting_date <= :end_date
            `;

            bind.end_date =
                endDate;
        }


        // =====================================================
        // 1. GET LIST DATA
        // =====================================================

        const LIST_QUERY =
            query.getDataPiutang
                .replace(
                    /:condition/g,
                    condition
                );


        const listData =
            await db.query(
                LIST_QUERY,
                {
                    replacements: bind,
                    type: db.QueryTypes.SELECT
                }
            );


        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================

        const COUNT_QUERY =
            query.countDataPiutang
                .replace(
                    /:condition/g,
                    condition
                );


        const countData =
            await db.query(
                COUNT_QUERY,
                {
                    replacements: bind,
                    type: db.QueryTypes.SELECT
                }
            );


        const totalData =
            Number(
                countData?.[0]?.total || 0
            );


        const totalHalaman =
            Math.ceil(
                totalData / limit
            );


        // =====================================================
        // 3. GET SUMMARY
        // =====================================================

        const SUMMARY_QUERY =
            query.summaryDataPiutang
                .replace(
                    /:condition/g,
                    condition
                );


        const summaryResult =
            await db.query(
                SUMMARY_QUERY,
                {
                    replacements: bind,
                    type: db.QueryTypes.SELECT
                }
            );


        const summary =
            summaryResult?.[0] || {
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


        // =====================================================
        // RETURN
        // =====================================================

        return {
            total_data: totalData,

            total_halaman:
                totalHalaman,

            limit,

            page,

            list_data:
                listData,

            summary
        };

    } catch (error) {

        console.error(
            'ERROR SERVICE GET DATA PIUTANG:',
            error
        );

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
        const page = Number(
            params?.page
        ) || 1

        const limit = Number(
            params?.limit
        ) || 10

        const offset =
            (page - 1) * limit

        const keyword = String(
            params?.keyword || ''
        ).trim()

        const status = String(
            params?.status || ''
        ).trim()

        const salesOffice = String(
            params?.sales_office || ''
        ).trim()

        const sortBy = String(
            params?.sortBy || ''
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

            bind.keyword =
                `%${keyword}%`
        }


        // =========================
        // FILTER STATUS
        // =========================
        if (status) {
            condition += `
                AND UPPER(
                    TRIM(
                        COALESCE(
                            mc.status_outlet,
                            ''
                        )
                    )
                ) = UPPER(:status)
            `

            bind.status = status
        }


        // =========================
        // FILTER SALES OFFICE
        // =========================
        if (salesOffice) {
            condition += `
                AND mc.sales_office = :sales_office
            `

            bind.sales_office =
                salesOffice
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
         *
         * Jangan langsung masukkan sortBy
         * dari frontend ke raw query.
         */

        const sortMapping = {
            customer_id:
                'mc.customer_id',

            sales_office:
                'mc.sales_office',

            sales_office_description:
                'mc.sales_office_description',

            kode_customer:
                'mc.kode_customer',

            name:
                'mc.name',

            status_outlet:
                'mc.status_outlet',

            address:
                'mc.address',

            city:
                'mc.city',

            customer_groups_1_description:
                'mc.customer_groups_1_description',

            customer_groups_2_description:
                'mc.customer_groups_2_description',

            customer_groups_3_description:
                'mc.customer_groups_3_description',

            customer_groups_4_description:
                'mc.customer_groups_4_description',

            top:
                'mc.top',

            no_npwp:
                'mc.no_npwp',

            tgl_registrasi:
                'mc.tgl_registrasi',

            division:
                'mc.division',

            created_at:
                'mc.created_at',

            updated_at:
                'mc.updated_at'
        }


        if (sortBy) {
            let sortColumn = sortBy
            let sortDirection = 'ASC'


            // =========================
            // FORMAT:
            // name:asc
            // name:desc
            // =========================
            if (
                sortBy.includes(':')
            ) {
                const parts =
                    sortBy.split(':')

                sortColumn =
                    parts[0]

                sortDirection =
                    String(
                        parts[1] || 'ASC'
                    ).toUpperCase()
            }


            // =========================
            // FORMAT:
            // name asc
            // name desc
            // =========================
            else if (
                /\s+DESC$/i.test(
                    sortBy
                )
            ) {
                sortColumn =
                    sortBy
                        .replace(
                            /\s+DESC$/i,
                            ''
                        )
                        .trim()

                sortDirection = 'DESC'
            }

            else if (
                /\s+ASC$/i.test(
                    sortBy
                )
            ) {
                sortColumn =
                    sortBy
                        .replace(
                            /\s+ASC$/i,
                            ''
                        )
                        .trim()

                sortDirection = 'ASC'
            }


            // =========================
            // VALIDASI
            // =========================
            if (
                sortMapping[
                    sortColumn
                ]
            ) {
                if (
                    ![
                        'ASC',
                        'DESC'
                    ].includes(
                        sortDirection
                    )
                ) {
                    sortDirection =
                        'ASC'
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
        const LIST_QUERY =
            query.getDataPelanggan
                .replace(
                    /:condition/g,
                    condition
                )
                .replace(
                    /:sortBy/g,
                    orderBy
                )


        const listData =
            await db.query(
                LIST_QUERY,
                {
                    replacements: bind,
                    type:
                        db.QueryTypes.SELECT
                }
            )


        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================
        const COUNT_QUERY =
            query.countDataPelanggan
                .replace(
                    /:condition/g,
                    condition
                )


        const countData =
            await db.query(
                COUNT_QUERY,
                {
                    replacements: bind,
                    type:
                        db.QueryTypes.SELECT
                }
            )


        const totalData =
            Number(
                countData?.[0]?.total ||
                0
            )


        const totalHalaman =
            Math.ceil(
                totalData / limit
            )


        // =====================================================
        // 3. GET SUMMARY
        // =====================================================
        const SUMMARY_QUERY =
            query.summaryDataPelanggan
                .replace(
                    /:condition/g,
                    condition
                )


        const summaryData =
            await db.query(
                SUMMARY_QUERY,
                {
                    replacements: bind,
                    type:
                        db.QueryTypes.SELECT
                }
            )


        const summary =
            summaryData?.[0] || {}


        // =====================================================
        // RETURN
        // =====================================================
        return {
            total_data:
                totalData,

            total_halaman:
                totalHalaman,

            limit,

            page,

            list_data:
                listData,

            summary: {
                total:
                    Number(
                        summary?.total_pelanggan ||
                        0
                    ),

                aktif:
                    Number(
                        summary?.total_aktif ||
                        0
                    ),

                nonaktif:
                    Number(
                        summary?.total_nonaktif ||
                        0
                    ),

                cabang:
                    Number(
                        summary?.total_cabang ||
                        0
                    )
            }
        }

    } catch (error) {
        console.error(
            'ERROR SERVICE GET DATA PELANGGAN:',
            error
        )

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