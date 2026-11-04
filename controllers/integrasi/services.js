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
const dwh = require('./sistem/dwh')

const nodemailer = require("nodemailer");

exports.getMasterIntegrasi = async ({ entitas, modul, method }) => {
    const QUERY = query.getMasterIntegrasi
        .replace(/:entitas/g, entitas)
        .replace(/:modul/g, modul)
        .replace(/:method/g, method)

    const listData = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return listData
}

exports.checkConfig = async (payload) => {
    const { entitas, modul, method } = payload
    const QUERY = query.checkConfig
        .replace(/:entitas/g, entitas)
        .replace(/:modul/g, modul)
        .replace(/:method/g, method)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result?.jml
}

exports.getDataSales = async (payload) => {
    let transaction;

    try {
        // =====================================================
        // GET MASTER INTEGRASI
        // =====================================================

        const masterData = await this.getMasterIntegrasi(payload);

        if (!masterData) {
            throw new Error("Master integrasi tidak ditemukan");
        }

        if (!payload?.posting_date) {
            throw new Error("Posting date wajib diisi");
        }

        // =====================================================
        // CONFIG
        // =====================================================

        const limit = 500;
        let page = 1;
        let totalPages = 1;
        let totalData = 0;

        const dwhIds = [];
        let penjualanIds = [];

        // =====================================================
        // MULAI TRANSACTION
        // =====================================================

        transaction = await db.transaction();

        // =====================================================
        // LOOPING DATA SALES DARI DWH
        // =====================================================

        while (page <= totalPages) {

            console.log(`GET SALES PAGE ${page}/${totalPages}`);

            // REQUEST API DWH
            const response = await dwh.getDataSales(masterData, {
                posting_date: payload.posting_date,
                page,
                limit
            });

            const responseData = response?.data;

            if (!responseData) {
                throw new Error(
                    `Response API kosong pada page ${page}`
                );
            }

            const data = responseData?.data || [];

            totalPages = Number(responseData?.totalPages || 0);

            if (!Array.isArray(data)) {
                throw new Error(
                    `Format data tidak valid pada page ${page}`
                );
            }

            if (
                !Number.isInteger(totalPages) ||
                totalPages < 1
            ) {
                throw new Error("Total pages tidak valid");
            }

            if (Number(responseData?.page) !== page) {
                throw new Error(
                    `Page response tidak sesuai. Request: ${page}, Response: ${responseData?.page}`
                );
            }

            // =================================================
            // INSERT KE D_DWH
            // =================================================

            if (data.length > 0) {

                const dataInsert = data.map(item => ({
                    sales_id: item.sales_id,
                    entitas_code: item.entitas_code,
                    plant: item.plant,
                    posting_date: item.posting_date,
                    billing_no: item.billing_no,
                    so_type: item.so_type,
                    customer_no: item.customer_no,
                    customer_bill_no: item.customer_bill_no,
                    material: item.material,
                    bill_qty_sku: item.bill_qty_sku,
                    base_uom_sku: item.base_uom_sku,
                    qty_penjualan: item.qty_penjualan,
                    sales_unit_penjualan: item.sales_unit_penjualan,
                    unit_price_penjualan: item.unit_price_penjualan,
                    uom_price_penjualan: item.uom_price_penjualan,
                    total_discount: item.total_discount,
                    surchage: item.surchage,
                    total_penjualan: item.total_penjualan,
                    total_cogs: item.total_cogs,
                    currency: item.currency,
                    pelayanan_code: item.pelayanan_code,
                    salesman: item.salesman,
                    order_reason: item.order_reason,
                    so_no: item.so_no,
                    po_no: item.po_no,
                    do_no: item.do_no,
                    batch: item.batch,
                    sled_date: item.sled_date,
                    posting_status: item.posting_status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    upload_date: item.upload_date,
                    upload_id: item.upload_id,
                    uploaded_at: new Date(),
                    is_get: 'Y'
                }));

                const insertedData = await model.d_dwh.bulkCreate(
                    dataInsert,
                    {
                        transaction,
                        returning: true
                    }
                );

                const insertedIds = insertedData.map(
                    item => item.dwh_id
                );

                dwhIds.push(...insertedIds);

                totalData += data.length;
            }

            console.log(`PAGE ${page}/${totalPages} BERHASIL`);
            console.log(`TOTAL DATA PAGE: ${data.length}`);

            if (page === totalPages) {
                console.log("SELURUH PAGE BERHASIL DIAMBIL");
                break;
            }

            page++;
        }

        // =====================================================
        // PROSES INSERT D_PENJUALAN DAN D_PIUTANG
        // =====================================================

        if (dwhIds.length === totalData) {

            // =================================================
            // INSERT D_DWH KE D_PENJUALAN
            // =================================================

            const [insertPenjualan] = await db.query(`
                INSERT INTO public.d_penjualan (
                    sales_office,
                    desc_s_office,
                    posting_date,
                    billing_no,
                    posting_status,
                    bill_to_party,
                    name_bill_to,
                    address,
                    material,
                    material_group_1,
                    desc_material_group_1,
                    text_material,
                    quantity,
                    sales_unit,
                    unit_price_penjualan,
                    total_discount,
                    total_penjualan,
                    tax_amount,
                    total_cogs,
                    bill_qty_in_sku,
                    uom_sku,
                    code_pelayanan,
                    principle,
                    name_principle,
                    desc_cust_grp4,
                    salesman,
                    name_salesman,
                    po_number,
                    created_by,
                    is_upload
                )
                SELECT
                    d.plant,
                    e.ur_ref,
                    d.posting_date,
                    d.billing_no,
                    d.posting_status,
                    d.customer_bill_no,
                    f.name,
                    f.address,
                    d.material,
                    g.material_group_1,
                    g.mg1_description,
                    g.material_description,
                    d.qty_penjualan,
                    d.sales_unit_penjualan,
                    d.unit_price_penjualan,
                    d.total_discount,
                    d.total_penjualan,
                    (d.total_penjualan * 11 / 100) AS tax_amount,
                    d.total_cogs,
                    d.bill_qty_sku,
                    d.base_uom_sku,
                    d.pelayanan_code,
                    g.principle,
                    g.nama_principle,
                    '-' AS desc_cust_grp4,
                    d.salesman,
                    NULL AS name_salesman,
                    d.po_no,
                    'SYSTEM' AS created_by,
                    1 AS is_upload

                FROM public.d_dwh d

                LEFT JOIN public.m_referensi e
                    ON e.kd_ref = d.plant
                    AND e.jns_ref = 'cabang_id'

                LEFT JOIN public.m_customer f
                    ON f.kode_customer = d.customer_bill_no

                LEFT JOIN public.m_produk g
                    ON g.material = d.material

                WHERE
                    d.is_get = 'Y' AND d.plant != '2000'

                RETURNING penjualan_id;
            `, {
                replacements: {
                    dwhIds
                },
                transaction
            });

            penjualanIds = (insertPenjualan || []).map(
                item => item.penjualan_id
            );

            console.log(
                `INSERT D_PENJUALAN BERHASIL: ${penjualanIds.length} DATA`
            );

            // =================================================
            // INSERT D_PENJUALAN KE D_PIUTANG
            // =================================================

            if (penjualanIds.length > 0) {

                const [insertPiutang] = await db.query(`
                    INSERT INTO public.d_piutang (
                        no_faktur,
                        no_billing,
                        document_type,
                        customer,
                        sales,
                        nama_sales,
                        cabang,
                        principle,
                        posting_date,
                        jatuh_tempo,
                        dpp,
                        ppn,
                        pph,
                        aging,
                        status_piutang,
                        created_by,
                        created_at,
                        desc_cust_grp3,
                        channel_id
                    )
                    SELECT
                        x.billing_no AS no_faktur,
                        x.billing_no AS no_billing,
                        x.document_type,
                        x.bill_to_party AS customer,
                        x.salesman AS sales,
                        x.name_salesman AS nama_sales,
                        x.sales_office AS cabang,
                        x.principle,
                        x.posting_date,
                        x.jatuh_tempo,
                        x.dpp,
                        x.ppn,
                        x.pph,
                        x.aging,
                        x.status_piutang,
                        'SYSTEM' AS created_by,
                        CURRENT_TIMESTAMP AS created_at,
                        x.desc_cust_grp4 AS desc_cust_grp3,
                        x.channel_id

                    FROM (
                        SELECT
                            dp.billing_no,
                            dp.posting_date,
                            dp.bill_to_party,
                            dp.salesman,
                            dp.name_salesman,
                            dp.sales_office,
                            dp.principle,

                            COALESCE(SUM(dp.total_penjualan), 0) AS dpp,

                            CASE
                                WHEN LEFT(dp.billing_no, 2) = '28'
                                    AND COALESCE(SUM(dp.total_penjualan), 0) > 0
                                    THEN 'RV'

                                WHEN LEFT(dp.billing_no, 2) = '28'
                                    AND COALESCE(SUM(dp.total_penjualan), 0) < 0
                                    THEN 'DK'

                                WHEN LEFT(dp.billing_no, 2) = '29'
                                    AND COALESCE(SUM(dp.total_penjualan), 0) < 0
                                    THEN 'RETUR'

                                ELSE '-'
                            END AS document_type,

                            COALESCE(SUM(dp.tax_amount), 0) AS ppn,

                            ROUND(
                                COALESCE(SUM(dp.total_penjualan), 0) * 0.015,
                                2
                            ) AS pph,

                            COALESCE(pb.dibayar, 0) AS dibayar,

                            COALESCE(SUM(dp.total_penjualan), 0)
                                - COALESCE(pb.dibayar, 0) AS outstanding,

                            dp.posting_date
                                + (
                                    COALESCE(
                                        NULLIF(TRIM(mt.top), '')::INTEGER,
                                        30
                                    ) * INTERVAL '1 day'
                                ) AS jatuh_tempo,

                            CURRENT_DATE - dp.posting_date AS aging,

                            CASE
                                WHEN
                                    COALESCE(SUM(dp.total_penjualan), 0)
                                    - COALESCE(pb.dibayar, 0) <= 0
                                    THEN 'PAID'

                                WHEN
                                    dp.posting_date
                                    + (
                                        COALESCE(
                                            NULLIF(TRIM(mt.top), '')::INTEGER,
                                            30
                                        ) * INTERVAL '1 day'
                                    ) > CURRENT_DATE
                                    THEN 'NOT_DUE'

                                WHEN
                                    dp.posting_date
                                    + (
                                        COALESCE(
                                            NULLIF(TRIM(mt.top), '')::INTEGER,
                                            30
                                        ) * INTERVAL '1 day'
                                    ) < CURRENT_DATE
                                    THEN 'OVERDUE'

                                WHEN
                                    dp.posting_date
                                    + (
                                        COALESCE(
                                            NULLIF(TRIM(mt.top), '')::INTEGER,
                                            30
                                        ) * INTERVAL '1 day'
                                    ) <= CURRENT_DATE + INTERVAL '7 days'
                                    THEN 'DUE_SOON'

                                ELSE 'OUTSTANDING'
                            END AS status_piutang,

                            dp.desc_cust_grp4,
                            m1.kd_ref AS channel_id

                        FROM public.d_penjualan dp

                        LEFT JOIN public.m_top mt
                            ON REPLACE(
                                LOWER(mt.desc_cust_grp3),
                                ' ',
                                ''
                            ) = REPLACE(
                                LOWER(dp.desc_cust_grp4),
                                ' ',
                                ''
                            )

                        LEFT JOIN public.m_referensi m1
                            ON REPLACE(
                                LOWER(m1.ur_ref),
                                ' ',
                                ''
                            ) = REPLACE(
                                LOWER(mt.lini),
                                ' ',
                                ''
                            )
                            AND m1.jns_ref = 'channel_id'

                        LEFT JOIN (
                            SELECT
                                payment_rows.no_billing,
                                COALESCE(
                                    SUM(payment_rows.nominal),
                                    0
                                ) AS dibayar

                            FROM (
                                SELECT
                                    no_billing,
                                    nominal_bayar AS nominal
                                FROM public.d_pembayaran

                                UNION ALL

                                SELECT
                                    no_billing,
                                    nominal_billing AS nominal
                                FROM public.d_cod
                            ) payment_rows

                            GROUP BY payment_rows.no_billing
                        ) pb
                            ON pb.no_billing = dp.billing_no

                        WHERE
                            dp.is_upload = 1
                            AND dp.sales_office != '2000'

                        GROUP BY
                            dp.billing_no,
                            dp.posting_date,
                            dp.bill_to_party,
                            dp.salesman,
                            dp.name_salesman,
                            dp.sales_office,
                            dp.principle,
                            dp.desc_cust_grp4,
                            m1.kd_ref,
                            mt.top,
                            pb.dibayar
                    ) x

                    RETURNING piutang_id;
                `, {
                    replacements: {
                        penjualanIds
                    },
                    transaction
                });

                console.log(
                    `INSERT D_PIUTANG BERHASIL: ${insertPiutang?.length || 0} DATA`
                );
            }

            // =================================================
            // UPDATE STATUS D_DWH MENJADI Y
            // SETELAH D_PENJUALAN DAN D_PIUTANG BERHASIL
            // =================================================

            await model.d_dwh.update(
                {
                    is_get: 'T'
                },
                {
                    where: {
                        is_get: 'Y'
                    },
                    transaction
                }
            );
            await model.d_penjualan.update(
                {
                    is_upload: 0
                },
                {
                    where: {
                        is_upload: 1
                    },
                    transaction
                }
            );

            console.log(
                "STATUS D_DWH BERHASIL DIUPDATE MENJADI Y"
            );
        }

        // =====================================================
        // COMMIT TRANSACTION
        // =====================================================

        await transaction.commit();

        console.log(
            "SELURUH TRANSACTION BERHASIL DI-COMMIT"
        );

        // =====================================================
        // RETURN
        // =====================================================

        return {
            success: true,
            message: "Data sales berhasil disimpan ke DWH, Penjualan, dan Piutang",
            posting_date: payload?.posting_date,
            total_data: totalData,
            total_page: totalPages,
            total_dwh: dwhIds.length,
            total_penjualan: penjualanIds.length,
            is_get: 'Y'
        };

    } catch (error) {

        // =====================================================
        // ROLLBACK JIKA ADA ERROR
        // =====================================================

        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        console.error(
            "ERROR SERVICE GET DATA SALES:",
            error
        );

        throw error;
    }
};

