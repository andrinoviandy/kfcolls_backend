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

exports.getReferensiByJenis = async (jns_ref, keyword, cabang_id, role_id) => {
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
    if (jns_ref === 'role_id') {
        if (cabang_id !== '2000') {
            if (role_id !== 'RL00') {
                condition = ` AND a.sub_kd_ref = 'KC' `
            }
        } else {
            condition = ``
        }
    }
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

exports.getDataPenjualan = async (params) => {
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

        const salesOffice = String(
            params?.sales_office || 'ALL'
        ).trim()

        const postingStatus = String(
            params?.posting_status || 'ALL'
        ).trim()

        const customerGroup = String(
            params?.customer_group || 'ALL'
        ).trim()

        const principle = String(
            params?.principle || 'ALL'
        ).trim()

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
        if (
            salesOffice &&
            salesOffice.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.sales_office = :sales_office
            `

            bind.sales_office = salesOffice
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
        if (
            customerGroup &&
            customerGroup.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.desc_cust_grp4 = :customer_group
            `

            bind.customer_group = customerGroup
        }

        // =========================
        // PRINCIPLE
        // =========================
        if (
            principle &&
            principle.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.principle = :principle
            `

            bind.principle = principle
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
        // =========================
        // PARAMETER
        // =========================
        const page =
            Number(params?.page) || 1

        const limit =
            Number(params?.limit) || 10

        const offset =
            (page - 1) * limit

        const keyword =
            String(params?.keyword || '').trim()

        const status =
            String(params?.status || 'ALL').trim()

        const sales_office =
            String(params?.sales_office || 'ALL').trim()

        const channel =
            String(params?.channel || 'ALL').trim()

        const principle =
            String(params?.principle || 'ALL').trim()

        const customer =
            String(params?.customer || 'ALL').trim()

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
                    OR dp.salesman ILIKE :keyword
                    OR dp.name_salesman ILIKE :keyword
                    OR dp.principle ILIKE :keyword
                    OR dp.name_principle ILIKE :keyword
                    OR dp.desc_s_office ILIKE :keyword
                )
            `

            bind.keyword =
                `%${keyword}%`
        }

        // =========================
        // SALES OFFICE
        // =========================
        if (
            sales_office &&
            sales_office.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.sales_office = :sales_office
            `

            bind.sales_office =
                sales_office
        }

        // =========================
        // CHANNEL
        // =========================
        if (
            channel &&
            channel.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.desc_cust_grp4 = :channel
            `

            bind.channel =
                channel
        }

        // =========================
        // PRINCIPLE
        // =========================
        if (
            principle &&
            principle.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.principle = :principle
            `

            bind.principle =
                principle
        }

        // =========================
        // CUSTOMER
        // =========================
        if (
            customer &&
            customer.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND dp.bill_to_party = :customer
            `

            bind.customer =
                customer
        }

        // =====================================================
        // STATUS
        // =====================================================
        /*
         * Status tidak diambil dari dp.status_piutang.
         *
         * Status dihitung berdasarkan:
         *
         * 1. outstanding <= 0
         *       => PAID
         *
         * 2. jatuh tempo < CURRENT_DATE
         *       => OVERDUE
         *
         * 3. jatuh tempo <= CURRENT_DATE + 7 hari
         *       => DUE_SOON
         *
         * 4. selain itu
         *       => NOT_DUE
         *
         * Karena query utama sudah melakukan grouping
         * berdasarkan billing_no, maka filter status
         * dilakukan menggunakan EXISTS terhadap hasil
         * grouping yang sama.
         */

        if (
            status &&
            status.toUpperCase() !== 'ALL'
        ) {
            condition += `
                AND (
                    CASE
                        WHEN (
                            COALESCE(
                                (
                                    SELECT SUM(dp_status.total_penjualan)
                                    FROM public.d_penjualan dp_status
                                    WHERE dp_status.billing_no = dp.billing_no
                                ),
                                0
                            )
                            -
                            COALESCE(
                                (
                                    SELECT SUM(pd_status.nominal_bayar)
                                    FROM public.d_pembayaran_detail pd_status
                                    WHERE pd_status.billing_no = dp.billing_no
                                ),
                                0
                            )
                        ) <= 0
                            THEN 'PAID'

                        WHEN (
                            dp.posting_date + INTERVAL '30 days'
                        ) < CURRENT_DATE
                            THEN 'OVERDUE'

                        WHEN (
                            dp.posting_date + INTERVAL '30 days'
                        ) <= CURRENT_DATE + INTERVAL '7 days'
                            THEN 'DUE_SOON'

                        ELSE 'NOT_DUE'
                    END
                ) = :status
            `

            bind.status =
                status.toUpperCase()
        }

        // =====================================================
        // 1. GET LIST DATA
        // =====================================================
        const LIST_QUERY =
            query.getDataPiutang
                .replace(
                    /:condition/g,
                    condition
                )

        const listData =
            await db.query(
                LIST_QUERY,
                {
                    replacements: bind,
                    type: db.QueryTypes.SELECT
                }
            )

        // =====================================================
        // 2. GET TOTAL DATA
        // =====================================================
        const COUNT_QUERY =
            query.countDataPiutang
                .replace(
                    /:condition/g,
                    condition
                )

        const countData =
            await db.query(
                COUNT_QUERY,
                {
                    replacements: bind,
                    type: db.QueryTypes.SELECT
                }
            )

        const totalData =
            Number(
                countData?.[0]?.total || 0
            )

        const totalHalaman =
            Math.ceil(
                totalData / limit
            )

        // =====================================================
        // 3. GET SUMMARY
        // =====================================================
        const SUMMARY_QUERY =
            query.summaryDataPiutang
                .replace(
                    /:condition/g,
                    condition
                )

        const summaryResult =
            await db.query(
                SUMMARY_QUERY,
                {
                    replacements: bind,
                    type: db.QueryTypes.SELECT
                }
            )

        const summary =
            summaryResult?.[0] || {
                total_piutang: 0,
                sudah_dibayar: 0,
                outstanding: 0,
                not_due_amount: 0,
                due_soon_amount: 0,
                overdue_amount: 0,
                paid: 0,
                not_due: 0,
                due_soon: 0,
                overdue: 0
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
            'ERROR SERVICE GET DATA PIUTANG:',
            error
        )

        throw error
    }
}

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