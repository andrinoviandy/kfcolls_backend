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
const { getMasterIntegrasi, integrasiData, insertLogIntegrasi } = require('../integrasi/services');
const axios = require('axios');
const { log, error } = require('console');
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");
const FormData = require("form-data");
const { randomBytes } = require('crypto');
const { autoCommit } = require('oracledb');
const { A_LOP_DETAIL } = require('../../config/model/n2n/n2n');
const ExcelJS = require('exceljs');
const fsPromises = require('fs/promises');
const { Op, fn, col, where } = require("sequelize");
const { PDFDocument } = require('pdf-lib');

exports.getListMenu = async (kd_ref) => {
    const result = await db.query(query.getListMenu, {
        replacements: { kd_ref },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const normalizeArray = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    if (result) {
        const menu = JSON.parse(result.DATA)
        const sortMenu = menu?.menu?.sort((a, b) => a.id_acl - b.id_acl)
        const menuObj = sortMenu.map((item) => {
            const subObj = normalizeArray(item?.submenu)
                .sort((a, b) => a.id_acl - b.id_acl);

            return {
                ...item,
                submenu: subObj
            };
        });
        // const menuObj = sortMenu.map((item) => {
        //     const subObj = Array.isArray(item?.submenu)
        //         ? item.submenu.sort((a, b) => a.id_acl - b.id_acl)
        //         : null;
        //     return {
        //         ...item,
        //         submenu: subObj
        //     }
        // })
        return {
            menu: menuObj
        }
    } else {
        return {
            "message": "Failed",
            "data": "Data tidak ditemukan!"
        }
    }
}

exports.getAcl = async (id_acl) => {
    const result = await db.query(query.getAcl, {
        replacements: { id_acl },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getReferensiByJenis = async (jns_ref, keyword) => {
    const bind = {
        jns_ref: jns_ref,
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`
    }

    const result = await db.query(query.getReferensiByJenis, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getPermissionCrud = async (jns_ref, kd_ref) => {
    const bind = { jns_ref: jns_ref, kd_ref: kd_ref }
    const result = await db.query(query.getPermissionCrud, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getRoleUser = async (kode) => {
    const result = await db.query(query.getRoleUser, {
        replacements: { kode },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.createCustomer = async (payload, transaction) => {
    // const { customer_id } = payload
    const result = await model.m_customer.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.createVendorPt = async (payload, transaction) => {
    const result = await model.m_vendor_pt.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.createPortofolio = async (payload, transaction) => {
    // const { customer_id } = payload
    const max = await model.m_portofolio.max('PORTOFOLIO_ID')
    Object.assign(payload, {
        portofolio_id: max + 1
    })
    const result = await model.m_portofolio.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.createKaryawan = async (payload, transaction) => {
    const result = await model.m_karyawan.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.createContactCustomer = async (payload, transaction) => {
    const { customer_id } = payload
    const result = await model.m_customer_contact.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.createContactVendorPt = async (payload, transaction) => {
    const result = await model.m_vendor_kontak.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.createReferensi = async (payload, transaction) => {
    const payloadHeader = {
        kd_ref: payload?.kd_ref || '',
        ur_ref: payload?.ur_ref || '',
        jns_ref: payload?.jns_ref || '',
        flag_aktif: payload?.ref_status || '',
        created_date: Date.now(),
    }

    if (payload?.originalData) {
        const payloadParent = {
            kd_ref: payload?.originalData?.kd_ref || '',
            ur_ref: payload?.originalData?.ur_ref || '',
            jns_ref: payload?.originalData?.jns_ref || '',
            flag_aktif: payload?.originalData?.ref_status || '',
        }
        const result = await model.m_referensi.update(payloadHeader, { where: payloadParent })
        if (result.includes(1)) {
            return {
                code: 1,
                message: 'Sukses Update',
                data: payloadHeader
            }
        }
        else {
            return {
                code: 0,
                message: 'Gagal Update',
                data: payload
            }
        }
    } else {
        const result = await model.m_referensi.create(payloadHeader, { transaction })
        return {
            code: 1,
            message: 'Sukses Dibuat',
            data: result.dataValues
        }
    }
}

exports.createDProject = async (payload, transaction) => {
    const { project_id, kd_status, id_tab_status } = payload
    const result = await model.d_project.create(payload, { transaction })

    const payloadProjectStatus = {
        status_id: uuidv4(),
        project_id: project_id,
        kd_status: kd_status,
        date_status: Date.now(),
        type: kd_status == '001' || kd_status == '005' ? '01' : null,
        type_status: 'PR01',
        id_tab_status: id_tab_status
    }
    const resultProjectStatus = await model.d_project_status.create(payloadProjectStatus, { transaction })

    const referensi = await model.m_referensi.findOne({ where: { jns_ref: 'project_type_id', kd_ref: result.project_type_id }, raw: true })
    const portofolio = await model.m_portofolio.findOne({ where: { portofolio_id: result.portofolio_id }, raw: true })

    const payloadHprojectNo = {
        project_id: result.project_id,
        project_no: result.project_no,
        project_type_id: result.project_type_id,
        created_by: result.created_by,
        created_at: result.created_at
    }

    await this.createHProject(payloadHprojectNo, transaction);

    return {
        project: {
            ...result.dataValues,
            ur_project_type_id: referensi.ur_ref,
            ur_portofolio_id: portofolio.portofolio
        },
        project_status: resultProjectStatus
    }
}

exports.createHProject = async (payload, transaction) => {
    const result = await model.h_project_no.create(payload, { transaction });
    return {
        hProject: {
            ...result.dataValues
        }
    }
}

exports.createDPersonilDetail = async (payload, transaction) => {
    const { project_id, kd_status, id_tab_status } = payload
    const result = await model.d_personil_detail.create(payload, { transaction })

    return {
        personil_detail: {
            ...result.dataValues
        }
    }
}

exports.updatePersonilDetail = async (payload) => {
    const { dpersonel_id } = payload
    const result = await model.d_personil_detail.update(payload, { where: { dpersonel_id } })
    return await helpers.processUpdate(result)
}

exports.createOperationalDetail = async (payload, transaction) => {
    const { project_id, kd_status, id_tab_status } = payload
    const result = await model.d_cost_opr.create(payload, { transaction })

    return {
        cost: {
            ...result.dataValues
        }
    }
}

exports.updateOperationalDetail = async (payload, transaction) => {
    const { cost_id } = payload

    const result = await model.d_cost_opr.update(payload, { where: { cost_id } })
    return await helpers.processUpdate(result)
}

exports.createOperationalDetailDokumen = async (payload, transaction) => {
    const { project_id, kd_status, id_tab_status } = payload
    const result = await model.d_cost_opr_detail.create(payload, { transaction })

    return {
        ...result.dataValues
    }
}

exports.insertBillingDokumen = async (payload, transaction) => {
    const result = await model.d_billing_dokumen.create(payload, { transaction })

    return {
        ...result.dataValues
    }
}

exports.generateNoProject = async (project_id) => {
    const hex = stripHexPrefix(project_id)
    const upper = hex.toUpperCase();
    const dateNow = moment(Date.now()).format('YYYYMMDD');
    let countProject = await model.d_project.count()

    let total = countProject
    let isValid = false
    while (!isValid) {
        z
        switch (String(countProject).length) {
            case 6:
                total = countProject
                break;
            case 5:
                total = '0' + countProject
                break;
            case 4:
                total = '00' + countProject
                break;
            case 3:
                total = '000' + countProject
                break;
            case 2:
                total = '0000' + countProject
                break;
            case 1:
                total = '00000' + countProject
                break;
            default:
                total = '000001'
                break;
        }
        const tempNomorAju = 'PROJ' + upper.substr(0, 5) + dateNow + total
        const dataProject = await model.d_project.findOne({ where: { project_no: tempNomorAju }, raw: true })

        if (helpers.isNotEmpty(dataProject)) {
            countProject = parseInt(countProject) + 1
        } else {
            isValid = true
        }
    }

    const project_no = 'PROJ' + upper.substr(0, 5) + dateNow + total

    return project_no
}

exports.generateProjectNo = async (portofolio_id, customer_id) => {
    const QUERY = query.projectNo
        .replace(/:portofolio_id/g, portofolio_id)
        .replace(/:customer_id/g, customer_id)

    const project_no = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })
    return project_no[0].PROJECT_NO
}

exports.generateProjectNoNew = async (portofolio_id, customer_id, project_type_id, project_model_id) => {
    const QUERY = query.projectNoNew
        .replace(/:PORTOFOLIO/g, `'${portofolio_id}'`)  // Tambahkan quotes untuk string
        .replace(/:CUSTOMER_ID/g, `'${customer_id}'`)    // Tambahkan quotes untuk string
        .replace(/:PROJECT_TYPE/g, `'${project_type_id}'`)  // Tambahkan quotes untuk string
        .replace(/:PROJECT_MODEL/g, `'${project_model_id}'`) // Tambahkan quotes untuk string

    try {
        const project_no = await db.query(QUERY, {
            type: db.QueryTypes.SELECT
        })

        if (!project_no || project_no.length === 0) {
            throw new Error(`No project number generated for customer ${customer_id}`);
        }

        return project_no[0].PROJECT_NO.toString()
    } catch (error) {
        console.error("Error details:", error.message);
        console.error("Query that failed:", QUERY);
        throw error;
    }
}

exports.getListProject = async ({ status = null, kd_spuc = null, keyword, page, limit, order = 'DESC', tab_status, project_type_id, startDate, endDate, modul, month, isAdmin, customer_id, username, hak_akses }) => {
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    // let select = '', searchHeader = '';
    let archive_condition, condition, cond_billing = '';
    if (project_type_id && project_type_id == '1' && (startDate === '' || endDate === '')) {
        archive_condition = "AND A.KD_STATUS IN ('004', '005') AND A.PROJECT_TYPE_ID = '1'"
        condition = "WHERE A.KD_STATUS IN ('004', '005') AND A.PROJECT_TYPE_ID = '1'"
    } else if (project_type_id && project_type_id == '1' && (startDate !== '' && endDate !== '') && (!keyword || keyword === '')) {
        archive_condition = `AND A.KD_STATUS IN ('004', '005') AND A.PROJECT_TYPE_ID = '1' AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        condition = `WHERE A.KD_STATUS IN ('004', '005') AND A.PROJECT_TYPE_ID = '1' AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
    } else {
        if (startDate !== '' && endDate !== '' && (!keyword || keyword === '')) {
            archive_condition = tab_status == null ? '' : tab_status == 'SA2' ? `AND a.KD_ARCHIVE = :status AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')` : `AND (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
            condition = tab_status == null ? '' : tab_status == 'SA2' ? `WHERE a.KD_ARCHIVE = :status AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')` : `WHERE (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        } else {
            archive_condition = tab_status == null ? '' : tab_status == 'SA2' ? 'AND a.KD_ARCHIVE = :status' : 'AND (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL'
            condition = tab_status == null ? '' : tab_status == 'SA2' ? 'WHERE a.KD_ARCHIVE = :status' : 'WHERE (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL'
        }
    }
    if (modul === 'billing') {
        cond_billing = `INNER JOIN (SELECT
                                PROJECT_ID
                                FROM N2N.D_BILLING
                                GROUP BY PROJECT_ID) i ON i.PROJECT_ID = a.PROJECT_ID`
    }

    if (month) {
        archive_condition = `AND TO_CHAR(A.CREATED_AT, 'YYYY-MM') = '${month}'`
        condition = `WHERE TO_CHAR(a.CREATED_AT, 'YYYY-MM') = '${month}'`
    }

    if (isAdmin === 'false') {
        if (hak_akses === "4382") {
            condition += " AND a.NIP_SALES = :username";
            archive_condition += " AND a.NIP_SALES = :username";
        } else {
            condition += " AND (a.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL OR a.KD_SPUC IS NULL OR a.KD_SPUC = '')";
            archive_condition += " AND (a.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL OR a.KD_SPUC IS NULL OR a.KD_SPUC = '')";
        }
    }

    if (customer_id) {
        archive_condition += `AND (f.CUSTOMER_ID = :customer_id OR :customer_id IS NULL)`;
        condition += `AND (f.CUSTOMER_ID = :customer_id OR :customer_id IS NULL)`;
    }

    const QUERY = query.getListProjectNew
        .replace(/:archive_condition/g, archive_condition)
        .replace(/:order/g, order_by)
        .replace(/:cond_billing/g, cond_billing)


    const COUNT_QUERY = query.countListProject
        .replace(/:condition/g, condition)
        .replace(/:cond_billing/g, cond_billing)

    // if (body && Object.keys(body).length > 0) {
    //         const countBody = Object.keys(body).length
    //         Object.keys(body).map((key, index) => {
    //             if (key === 'sla') {
    //                 searchHeader += `AND (TO_DATE(v1.SLA, 'YYYY-MM-DD')) ${body[key]} `;
    //             } else {
    //                 searchHeader += `AND UPPER(${key}) like UPPER('%${body[key]}%') `;
    //             }
    //         });
    //     }
    // console.log("SEARCH ",searchHeader)
    // console.log(QUERY, "<<<<<<<<<< QUERY")
    let bindListProject = {
        status: status,
        customer_id: customer_id,
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
        // searchHeader: searchHeader ,
        page: page,
        limit: limit
    }
    if (isAdmin === 'false') {
        if (hak_akses === "4382") {
            bindListProject.username = username;
        } else {
            bindListProject.kd_spuc = kd_spuc;
        }
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const lsitProjectFix = listProject.map(item => {
        if (item.DETAIL_PROJECT) item.DETAIL_PROJECT = JSON.parse(item.DETAIL_PROJECT)
        else item.DETAIL_PROJECT = []

        return item
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    if (statusData) { // Get TOTAL COST every project
        for (const [index, project] of listProject.entries()) {
            const dataPersonil = await this.getCostPersonilPlanning(project.PROJECT_ID)
            Object.assign(listProject[index], { "TOTAL_COST": dataPersonil.TOTAL_COST })
        };
    }

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: lsitProjectFix
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}
exports.postListProject = async ({ status = null, keyword, page, limit, order = 'DESC', tab_status, project_type_id, startDate, endDate, modul, month }, body) => {
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    let select = '', searchHeader = '';
    let archive_condition, condition, cond_billing = '';
    if (project_type_id && project_type_id == '1' && (startDate === '' || endDate === '')) {
        archive_condition = "AND A.KD_STATUS = '004' AND A.PROJECT_TYPE_ID = '1'"
        condition = "WHERE A.KD_STATUS = '004' AND A.PROJECT_TYPE_ID = '1'"
    } else if (project_type_id && project_type_id == '1' && (startDate !== '' && endDate !== '')) {
        archive_condition = `AND A.KD_STATUS = '004' AND A.PROJECT_TYPE_ID = '1' AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        condition = `WHERE A.KD_STATUS = '004' AND A.PROJECT_TYPE_ID = '1' AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
    } else {
        if (startDate !== '' && endDate !== '') {
            archive_condition = tab_status == null ? '' : tab_status == 'SA2' ? `AND a.KD_ARCHIVE = :status AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')` : `AND (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
            condition = tab_status == null ? '' : tab_status == 'SA2' ? `WHERE a.KD_ARCHIVE = :status AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')` : `WHERE (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL AND TRUNC(A.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        } else {
            archive_condition = tab_status == null ? '' : tab_status == 'SA2' ? 'AND a.KD_ARCHIVE = :status' : 'AND (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL'
            condition = tab_status == null ? '' : tab_status == 'SA2' ? 'WHERE a.KD_ARCHIVE = :status' : 'WHERE (a.KD_STATUS = :status OR :status IS NULL) AND a.KD_ARCHIVE IS NULL'
        }
    }
    if (modul === 'billing') {
        cond_billing = `INNER JOIN (SELECT
                                PROJECT_ID
                                FROM N2N.D_BILLING
                                GROUP BY PROJECT_ID) i ON i.PROJECT_ID = a.PROJECT_ID`
    }

    if (month) {
        archive_condition = `AND TO_CHAR(A.CREATED_AT, 'YYYY-MM') = '${month}'`
        condition = `WHERE TO_CHAR(a.CREATED_AT, 'YYYY-MM') = '${month}'`
    }

    const QUERY = query.postListProject
        .replace(/:archive_condition/g, archive_condition)
        .replace(/:order/g, order_by)
        .replace(/:cond_billing/g, cond_billing)
        .replace(/:page/g, page)
        .replace(/:limit/g, limit)

    const COUNT_QUERY = query.countListProject
        .replace(/:condition/g, condition)
        .replace(/:cond_billing/g, cond_billing)

    if (body && Object.keys(body).length > 0) {
        const countBody = Object.keys(body).length
        // console.log("berarti masuk")
        Object.keys(body).map((key, index) => {
            if (key === 'sla') {
                searchHeader += `AND (TO_DATE(v1.SLA, 'YYYY-MM-DD')) ${body[key]} `;
            } else {
                searchHeader += `AND UPPER(${key}) like UPPER(%${body[key]}%) `;
            }
        });
    }

    const bindListProject = {
        status: status,
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
        searchHeader: searchHeader || " ",
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = listProject.length > 0 ? true : false

    if (statusData) { // Get TOTAL COST every project
        for (const [index, project] of listProject.entries()) {
            const dataPersonil = await this.getCostPersonilPlanning(project.PROJECT_ID)
            Object.assign(listProject[index], { "TOTAL_COST": dataPersonil.TOTAL_COST })
        };
    }

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.searchProject = async ({ keyword, startDate, endDate }) => {
    const QUERY = query.searchProject

    const listProject = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            startDate: `${startDate}`,
            endDate: `${endDate}`
        },
        type: db.QueryTypes.SELECT
    })

    return listProject
}

exports.getListBillingRealization = async ({ status = null, keyword, page, limit, order = 'DESC', startDate, endDate, modul, kd_spuc = null, isAdmin, nik }) => {
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    let condition1, condition2;
    if (startDate === '' || endDate === '') {
        condition1 = ""
        condition2 = ""
    }
    if (startDate !== '' && endDate !== '') {
        condition1 = `AND TRUNC(a.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        condition2 = `AND TRUNC((SELECT x.CREATED_AT FROM D_PROJECT x WHERE x.PROJECT_ID = a.PROJECT_ACTUAL_ID)) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
    }

    if (isAdmin === 'false') {
        condition1 += " AND (a.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL OR a.KD_SPUC IS NULL OR a.KD_SPUC = '')";
    }

    const QUERY = query.getListBillingRealization
        .replace(/:condition1/g, condition1)
        .replace(/:condition2/g, condition2)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListBillingRealization
        .replace(/:condition1/g, condition1)
        .replace(/:condition2/g, condition2)

    const bindListProject = {
        status: status,
        kd_spuc: kd_spuc,
        // nik: `${nik}`,
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
        page: page,
        limit: limit
    }

    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    // if (statusData) { // Get TOTAL COST every project
    //     for (const [index, project] of listProject.entries()) {
    //         const dataPersonil = await this.getCostPersonilPlanning(project.PROJECT_ID)
    //         Object.assign(listProject[index], { "TOTAL_COST": dataPersonil.TOTAL_COST })
    //     };
    // }

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListBillingCollections = async ({ status = null, keyword, page, limit, billing_id, order = 'DESC', filter, monthYear, month, year, kd_status, start_date, end_date, customer_id, role_kode, spuc, nik, billing_code, is_billing_realisasi }, body, user) => {
    const order_by = 'ORDER BY DECODE(z.KD_STATUS, NULL, 1, 302, 2, 303, 3, 304, 4, 301, 5, 402, 6, 403, 7, 400, 8, 405, 9, 401, 10) ' + order + ', z.CREATED_AT DESC';
    if (start_date === undefined) start_date = ''
    if (end_date === undefined) end_date = ''
    let condition = '', status_billing = '', searchHeader = '';

    if (start_date !== '' && end_date !== '') {
        condition += `AND TRUNC(E.LATEST_DATE_STATUS) BETWEEN TO_DATE('${start_date}', 'YYYY-MM-DD') AND TO_DATE('${end_date}', 'YYYY-MM-DD') `
    }

    if (month !== '' && year !== '') {
        // const month = monthYear.split('-')
        if (filter === 'Estimasi') {
            condition += `AND z.EST_PERIODE_BILLING = '${year}' AND z.EST_BULAN_BILLING = '${month}'`
        } else {
            condition += `AND z.REAL_PERIODE_BILLING = '${year}' AND z.REAL_BULAN_BILLING = '${month}'`
        }
    } else if (year !== '') {
        if (filter === 'Estimasi') {
            condition += `AND z.EST_PERIODE_BILLING = '${year}'`
        } else {
            condition += `AND z.REAL_PERIODE_BILLING = '${year}'`
        }
    }

    if (role_kode && ['4384'].includes(role_kode) && spuc !== '') {
        condition += ` AND upper(z.DIVISI_ID) = upper('${spuc}') `
    }

    if (role_kode && role_kode !== "" && role_kode !== null && ['4382'].includes(role_kode)) {
        status_billing += ` AND b.NIP_SALES = '${user?.USERNAME}' `
    }

    // if (nik !== '') {
    //     condition += `AND
    //     EXISTS (
    //         SELECT 1 
    //         FROM N2N.D_PERSONIL_DETAIL pd
    //         INNER JOIN N2N.D_PERSONIL p ON p.PERSONEL_ID = pd.PERSONEL_ID
    //         WHERE pd.NIK = '${nik}'
    //         AND p.PROJECT_ID = z.PROJECT_ID
    //     )`
    // }

    if (keyword !== '') {
        if (month !== '' && year !== '') {
            condition += ` AND
                            (z.PROJECT_NO like '%${keyword}%'
                            OR upper(z.PROJECT_NAME) like upper('%${keyword}%')
                            OR upper(z.UR_KATEGORI_PROJECT) like upper('%${keyword}%')
                            OR upper(z.TERMIN) like upper('%${keyword}%')
                            OR upper(z.BILLING_CODE) like upper('%${keyword}%')
                            OR upper(z.CUSTOMER_NAME) like upper('%${keyword}%')
                            OR upper(z.DESC_TERMIN) like upper('%${keyword}%') 
                            OR upper(z.NO_INVOICE) like upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1
                                FROM D_BILLING X
                                WHERE X.PARENT_id = z.BILLING_ID 
                                AND X.FLAG_PARENT = 0
                                AND (
                                    UPPER(X.BILLING_CODE) LIKE UPPER('%${keyword}%')
                                )
                            )) `
        } else {
            condition += ` AND
                            (z.PROJECT_NO like '%${keyword}%'
                            OR upper(z.PROJECT_NAME) like upper('%${keyword}%')
                            OR upper(z.UR_KATEGORI_PROJECT) like upper('%${keyword}%')
                            OR upper(z.TERMIN) like upper('%${keyword}%')
                            OR upper(z.BILLING_CODE) like upper('%${keyword}%')
                            OR upper(z.CUSTOMER_NAME) like upper('%${keyword}%')
                            OR upper(z.DESC_TERMIN) like upper('%${keyword}%') 
                            OR upper(z.NO_INVOICE) like upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1
                                FROM D_BILLING X
                                WHERE X.PARENT_id = z.BILLING_ID 
                                AND X.FLAG_PARENT = 0
                                AND (
                                    UPPER(X.BILLING_CODE) LIKE UPPER('%${keyword}%')
                                )
                            )) `

        }
    }

    if (!["", null, undefined].includes(billing_code)) {
        condition += `AND upper(z.BILLING_CODE) like upper('%${keyword}%')`
    }
    if (!["", null, undefined].includes(is_billing_realisasi)) {
        if (is_billing_realisasi === "Y") {
            condition += `AND NOT EXISTS(SELECT 1
                FROM D_BILLING_REVENUE X
                WHERE X.BILLING_ID = z.BILLING_ID)`
        }
    }

    if (![null, undefined].includes(kd_status)) {
        if (kd_status === '') {
            status_billing = `AND a.KD_STATUS IS NULL`
        }
        if (kd_status) {
            status_billing = `AND a.KD_STATUS = ${kd_status}`
        }
    }

    if (billing_id) {
        status_billing += `AND a.BILLING_ID = '${billing_id}'`
    }

    if (customer_id) {
        status_billing += `AND mc.CUSTOMER_ID = '${customer_id}' `
    }

    if (body && Object.keys(body).length > 0) {
        const countBody = Object.keys(body).length
        Object.keys(body).map((key, index) => {
            if (key === 'sla_kelengkapan_dokumen') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_KD_END IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_KD_END END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_KD_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else if (key === 'sla_penerbitan_invoice') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_INVOICE_START IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_INVOICE_START END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_SUBMIT_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else if (key === 'sla_pelunasan') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_PAID IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_PAID END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_INVOICE_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else {
                if (key === 'z.EST_PERIODE_BILLING') {
                    let est_billing = body[key].split("-")
                    searchHeader += `AND z.EST_BULAN_BILLING = '${est_billing[1]}' AND z.EST_PERIODE_BILLING = '${est_billing[0]}' `;
                } else if (key === 'z.REAL_PERIODE_BILLING') {
                    let real_billing = body[key].split("-")
                    searchHeader += `AND z.REAL_BULAN_BILLING = '${real_billing[1]}' AND z.REAL_PERIODE_BILLING = '${real_billing[0]}' `;
                } else {
                    searchHeader += `AND UPPER(${key}) like UPPER('%${body[key]}%') `;
                }
            }
        });
    }

    const QUERY = query.getListBillingCollections
        .replace(/:searchHeader/g, searchHeader)
        .replace(/:condition/g, condition)
        .replace(/:status_billing/g, status_billing)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListBillingCollections
        .replace(/:searchHeader/g, searchHeader)
        .replace(/:condition/g, condition)
        .replace(/:status_billing/g, status_billing)

    const bindListProject = {
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const listProjectFix = listProject.map(item => {
        if (item.DETAIL_CHILD) item.DETAIL_CHILD = JSON.parse(item.DETAIL_CHILD)
        else item.DETAIL_CHILD = []
        item.REAL_BILLING_TERBILANG = helpers.terbilangRupiah(item.REAL_BILLING);
        item.NILAI_KONTRAK_TERBILANG = helpers.terbilangRupiah(item.NILAI_KONTRAK);
        item.NILAI_PELAPORAN_TERBILANG = helpers.terbilangRupiah(item.NILAI_PELAPORAN);
        item.T_NILAI_PELAPORAN_TERBILANG = helpers.terbilangRupiah(item.T_NILAI_PELAPORAN);
        return item
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProjectFix.length > 0 ? true : false

    // if (statusData) { // Get TOTAL COST every project
    //     for (const [index, project] of listProject.entries()) {
    //         const dataPersonil = await this.getCostPersonilPlanning(project.PROJECT_ID)
    //         Object.assign(listProject[index], { "TOTAL_COST": dataPersonil.TOTAL_COST })
    //     };
    // }

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProjectFix
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListAllBilling = async ({ keyword, project_id, project_no, billing_id }) => {
    const order_by = 'ORDER BY a.BILLING_CODE ASC';
    let condition = '';
    if (keyword) {
        if (project_id && project_no) {
            condition += ` AND (a.PROJECT_ID = '${project_id}' OR b.PROJECT_NO = '${project_no}') AND (upper(a.BILLING_CODE) like upper('%${keyword}%')) `
        }
        if (project_id) {
            condition += ` AND (a.PROJECT_ID = '${project_id}') AND (upper(a.BILLING_CODE) like upper('%${keyword}%'))`
        }
    }
    if (billing_id) {
        condition += ` AND a.BILLING_ID = '${billing_id}' `
    }


    const QUERY = query.getListAllBilling
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const listBilling = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // logging: true,
    })

    return listBilling
}

exports.getLogActivity = async (project_id) => {
    const result = await db.query(query.getDetailProject, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    const resultLog = await db.query(query.getLogActivity, {
        replacements: { 'project_id': result.PROJECT_NO },
        type: db.QueryTypes.SELECT
    })

    if (result) {
        if (result.VENDOR_PLANNING) result.VENDOR_PLANNING = JSON.parse(result.VENDOR_PLANNING)
        else result.VENDOR_PLANNING = []
        if (result.VENDOR_FINAL) result.VENDOR_FINAL = JSON.parse(result.VENDOR_FINAL)
        else result.VENDOR_FINAL = []
    }

    return { ...result, LOG_ACTIVITY: resultLog }
}

exports.getLogBillingActivity = async (billing_id) => {
    const resultLog = await db.query(query.getLogBillingActivity, {
        replacements: { 'billing_id': billing_id },
        type: db.QueryTypes.SELECT
    })

    const resultLogDocument = await db.query(query.getLogBillingDocument, {
        replacements: { 'billing_id': billing_id },
        type: db.QueryTypes.SELECT
    })

    return {
        LOG_STATUS: resultLog,
        LOG_DOCUMENT: resultLogDocument,
    }
}

exports.getLogBillingSuratTagihan = async (billing_id) => {
    const resultLog = await db.query(query.getLogBillingSuratTagihan, {
        replacements: { 'billing_id': billing_id },
        type: db.QueryTypes.SELECT
    })

    return resultLog
}

exports.getListProjectForCostPersonil = async ({ keyword, page, limit, order = 'DESC', startDate, endDate, kd_spuc = null, isAdmin, nik }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    let condition = ''
    if (startDate !== '' && endDate !== '') {
        condition += `WHERE TRUNC(a.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        if (keyword) {
            condition += ` AND (upper(a.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(a.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(a.CONTRACT_NO) like upper('%${keyword}%'))
                        `
        }
    } else {
        if (keyword) {
            condition += `WHERE (upper(a.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(a.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(a.CONTRACT_NO) like upper('%${keyword}%'))
                        `
        }
    }

    if (isAdmin === 'false') {
        condition += `AND (a.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL OR a.KD_SPUC IS NULL OR a.KD_SPUC = '')`
    }

    // if (nik !== '') {
    //     condition += `AND
    //     EXISTS (
    //         SELECT 1 
    //         FROM N2N.D_PERSONIL_DETAIL pd
    //         INNER JOIN N2N.D_PERSONIL p ON p.PERSONEL_ID = pd.PERSONEL_ID
    //         WHERE pd.NIK = '${nik}'
    //         AND p.PROJECT_ID = a.PROJECT_ID
    //     )`
    // }

    const QUERY = query.getListProjectForCostPersonil
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListProjectForCostPersonil
        .replace(/:condition/g, condition)

    const bindListProject = {
        // keyword: `%${ keyword ? keyword.toUpperCase() : keyword }%`,
        kd_spuc: kd_spuc,
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getDetailCostPersonil = async ({ project_id }) => {
    const result = await db.query(query.getProjectForCostPersonil, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const listDetail = await db.query(query.getDetailCostPersonil, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        DETAIL_COST: listDetail
    }
}

exports.getDetailCostAdvance = async ({ cost_revenue_id }) => {
    const result = await db.query(query.getDetailCostAdvance, {
        replacements: { cost_revenue_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getDetailTagihanVendor = async ({ billing_id }) => {
    const result = await db.query(query.getDetailTagihanVendor, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getDetailCostPersonilDetail = async ({ personel_id }) => {
    const result = await db.query(query.getDetailCostPersonilDetail, {
        replacements: { personel_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getDetailCostOperasional = async ({ project_id }) => {
    const result = await db.query(query.getProjectForCostOperasional, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const listDetail = await db.query(query.getDetailCostOperasional, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        DETAIL_COST: listDetail
    }
}

exports.getDetailVendorProjectBilling = async ({ billing_id }) => {
    const result = await db.query(query.getVendorProjectBilling, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const dokumenInvoice = await db.query(query.getDokumenInvoice, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const dokumenPenagihan = await db.query(query.getDokumenPenagihan, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const dokumenPendukung = await db.query(query.getDokumenBilling, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        DOKUMEN_INVOICE: dokumenInvoice,
        DOKUMEN_PENAGIHAN: dokumenPenagihan,
        DOKUMEN_PENDUKUNG: dokumenPendukung
    }
}

exports.getDetailCostOperasionalWithDokumenByCostId = async ({ cost_id }) => {
    const result = await db.query(query.getDetailCostOperasionalWithDokumenByCostId, {
        replacements: { cost_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const listDokumen = await db.query(query.getDetailDokumenCostOperasional, {
        replacements: { cost_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        DOKUMEN: listDokumen
    }
}

exports.getListProjectForCostOperasional = async ({ keyword, page, limit, order = 'DESC', startDate, endDate, kd_spuc = null, isAdmin, nik }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    let condition = ''
    if (startDate !== '' && endDate !== '') {
        condition += `WHERE TRUNC(a.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        if (keyword) {
            condition += ` AND (upper(a.PROJECT_NO) like upper('%${keyword}%')
                                    OR upper(a.PROJECT_NAME) like upper('%${keyword}%')
                                    OR upper(a.CONTRACT_NO) like upper('%${keyword}%')) `
        }
    } else {
        if (keyword) {
            condition += `WHERE (upper(a.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(a.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(a.CONTRACT_NO) like upper('%${keyword}%')) `
        }
    }

    if (isAdmin === 'false') {
        condition += `AND (a.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL OR a.KD_SPUC IS NULL OR a.KD_SPUC = '')`
    }

    // if (nik !== '') {
    //     condition += `AND
    //     EXISTS (
    //         SELECT 1 
    //         FROM N2N.D_PERSONIL_DETAIL pd
    //         INNER JOIN N2N.D_PERSONIL p ON p.PERSONEL_ID = pd.PERSONEL_ID
    //         WHERE pd.NIK = '${nik}'
    //         AND p.PROJECT_ID = a.PROJECT_ID
    //     )`
    // }

    const QUERY = query.getListProjectForCostOperasional
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListProjectForCostOperasional
        .replace(/:condition/g, condition)

    const bindListProject = {
        // keyword: `%${ keyword ? keyword.toUpperCase() : keyword }%`,
        kd_spuc: kd_spuc,
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListProjectForVendorProjectBilling = async ({ keyword, page, limit, order = 'DESC', startDate, endDate, kd_spuc = null, isAdmin, nik }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    let condition = ''
    if (startDate !== '' && endDate !== '') {
        condition += `WHERE TRUNC(a.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        if (keyword) {
            condition += ` AND (upper(c.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(c.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(b.NO_KONTRAK) like upper('%${keyword}%') 
                        OR upper(m.NAMA_PERUSAHAAN) like upper('%${keyword}%')) `
        }
    } else {
        if (keyword) {
            condition += `WHERE (upper(c.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(c.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(b.NO_KONTRAK) like upper('%${keyword}%') 
                        OR upper(m.NAMA_PERUSAHAAN) like upper('%${keyword}%')) `
        }
    }

    if (isAdmin === 'false') {
        condition += `AND (c.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL OR c.KD_SPUC IS NULL OR c.KD_SPUC = '')`
    }

    // if (nik !== '') {
    //     condition += `AND
    //     EXISTS (
    //         SELECT 1 
    //         FROM N2N.D_PERSONIL_DETAIL pd
    //         INNER JOIN N2N.D_PERSONIL p ON p.PERSONEL_ID = pd.PERSONEL_ID
    //         WHERE pd.NIK = '${nik}'
    //         AND p.PROJECT_ID = a.PROJECT_ID
    //     )`
    // }

    const QUERY = query.getListProjectForVendorProjectBilling
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)
    const COUNT_QUERY = query.countListProjectForVendorProjectBilling
        .replace(/:condition/g, condition)

    const bindListProject = {
        // keyword: `%${ keyword ? keyword.toUpperCase() : keyword }%`,
        kd_spuc: kd_spuc,
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListProjectForCostAdvanced = async ({ keyword, page, limit, order = 'DESC', startDate, endDate }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    const order_by = 'ORDER BY a.TANGGAL_COST ' + order
    let condition = ''
    if (startDate !== '' && endDate !== '') {
        condition += `WHERE TRUNC(a.TANGGAL_COST) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        if (keyword && keyword !== '') {
            condition += ` AND (upper(b.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(b.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(b.CONTRACT_NO) like upper('%${keyword}%') 
                        OR upper(m1.UR_REF) like upper('%${keyword}%') 
                        OR upper(m2.UR_REF) like upper('%${keyword}%') 
                        OR upper(m3.UR_REF) like upper('%${keyword}%') 
                        OR upper(a.DIVISI_ID) like upper('%${keyword}%')) `
        }
    } else {
        if (keyword && keyword !== '') {
            condition += `WHERE (upper(b.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(b.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(b.CONTRACT_NO) like upper('%${keyword}%') 
                        OR upper(m1.UR_REF) like upper('%${keyword}%') 
                        OR upper(m2.UR_REF) like upper('%${keyword}%') 
                        OR upper(m3.UR_REF) like upper('%${keyword}%') 
                        OR upper(a.DIVISI_ID) like upper('%${keyword}%')) `
        }
    }

    const QUERY = query.getListProjectForCostAdvanced
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)
    const COUNT_QUERY = query.countListProjectForCostAdvanced
        .replace(/:condition/g, condition)

    const bindListProject = {
        // keyword: `%${ keyword ? keyword.toUpperCase() : keyword }%`,
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListProjectForTagihanVendor = async ({ keyword, page, limit, order = 'DESC', startDate, endDate }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    let condition = ''
    if (startDate !== '' && endDate !== '') {
        condition += `AND TRUNC(a.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
        if (keyword) {
            condition += ` AND (upper(c.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(c.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(b.NO_KONTRAK) like upper('%${keyword}%') 
                        OR upper(m.NAMA_PERUSAHAAN) like upper('%${keyword}%')) `
        }
    } else {
        if (keyword) {
            condition += `AND (upper(c.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(c.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(b.NO_KONTRAK) like upper('%${keyword}%') 
                        OR upper(m.NAMA_PERUSAHAAN) like upper('%${keyword}%')) `
        }
    }

    const QUERY = query.getListProjectForTagihanVendor
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)
    const COUNT_QUERY = query.countListProjectForTagihanVendor
        .replace(/:condition/g, condition)

    const bindListProject = {
        // keyword: `%${ keyword ? keyword.toUpperCase() : keyword }%`,
        page: page,
        limit: limit
    }

    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListBillingByTermin = async ({ keyword, page = 1, limit = 10, order = 'ASC', billing_id, project_id }) => {
    const order_by = 'ORDER BY a.PROJECT_ID ' + order + ', b.TERMIN ASC'
    let condition = ''
    if (project_id) {
        condition = `WHERE a.PROJECT_ID = '${project_id}'`
    }
    if (billing_id) {
        condition = "WHERE b.BILLING_ID = " + billing_id + ""
    }
    const QUERY = query.getListBillingByTermin
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)
    const COUNT_QUERY = query.countListBillingByTermin
        .replace(/:condition/g, condition)

    const bindListProject = {
        // keyword: `%${ keyword ? keyword.toUpperCase() : keyword }%`,
        page: page,
        limit: limit
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListBillingProjectAkselerasi = async (project_id) => {
    const QUERY = query.getListBillingProjectAkselerasi
        .replace(/:project_id/g, project_id)

    const listProject = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    return listProject
}

exports.deletePersonilDetail = async (dpersonel_id) => {
    const result = await model.d_personil_detail.destroy({ where: { dpersonel_id } })
    return await helpers.processDelete(result)
}

exports.deleteOperationalDetail = async (cost_id) => {
    const result = await model.d_cost_opr.destroy({ where: { cost_id } })
    return await helpers.processDelete(result)
}

exports.getRefStatusProject = async ({ kd_spuc = null, isAdmin, username, hak_akses }) => {
    let condition = '';

    let bind = {}

    if (isAdmin === "false") {
        if (hak_akses === "4416") {
            condition = " AND b.NIP_SALES = :username";
            bind.username = username;
        } else {
            condition = 'AND (b.KD_SPUC = :kd_spuc OR :kd_spuc IS NULL)'
            bind.kd_spuc = kd_spuc;
        }
    }

    const QUERY = query.getRefStatusProject
        .replace(/:condition/g, condition)


    const result = await db.query(QUERY, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    if (result.length > 0) {
        const rowsWithoutData = result.map(row => {
            const { DATA } = row;
            return JSON.parse(DATA);
        });
        return rowsWithoutData
    } else {
        return result
    }
}

exports.getRefStatusRevenue = async ({ keyword, startDate, endDate }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    let condition = '';
    if (startDate !== '' && endDate !== '') {
        condition += `AND TRUNC(f.DATE_STATUS) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD') `
    }

    const QUERY = query.getRefStatusRevenue
        .replace(/:keyword/g, `'%${keyword ? keyword.toUpperCase() : keyword}%'`)
        .replace(/:condition/g, condition)

    const result = await db.query(QUERY, {
        replacements: {

        },
        type: db.QueryTypes.SELECT
    })

    const result_data = result.map((item) => {
        if (item.KD_STATUS === "302") {
            return {
                ...item,
                URAIAN: "Rejected"
            };
        }
        if (item.KD_STATUS === "301") {
            return {
                ...item,
                URAIAN: "Submited"
            };
        }
        if (item.KD_STATUS === "402") {
            return {
                ...item,
                URAIAN: "PYMAD"
            };
        }
        if (item.KD_STATUS === "403") {
            return {
                ...item,
                URAIAN: "Completed"
            };
        }
        if (item.KD_STATUS === "400") {
            return {
                ...item,
                URAIAN: "Invoice"
            };
        }
        if (item.KD_STATUS === "401") {
            return {
                ...item,
                URAIAN: "Pelunasan"
            };
        }
        if (item.KD_STATUS === "405") {
            return {
                ...item,
                URAIAN: "Surat Tagihan"
            };
        }
        return item;
    })

    return result_data
}

exports.getRefStatusInvoiceNonProject = async ({ keyword, startDate, endDate }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    let condition = '';
    if (startDate !== '' && endDate !== '') {
        condition += `AND TRUNC(f.DATE_STATUS) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD') `
    }

    const QUERY = query.getRefStatusInvoiceNonProject
        .replace(/:keyword/g, `'%${keyword ? keyword.toUpperCase() : keyword}%'`)
        .replace(/:condition/g, condition)

    const result = await db.query(QUERY, {
        replacements: {

        },
        type: db.QueryTypes.SELECT
    })

    const result_data = result.map((item) => {
        if (item.KD_STATUS === "302") {
            return {
                ...item,
                URAIAN: "Rejected"
            };
        }
        if (item.KD_STATUS === "301") {
            return {
                ...item,
                URAIAN: "Submited"
            };
        }
        if (item.KD_STATUS === "402") {
            return {
                ...item,
                URAIAN: "PYMAD"
            };
        }
        if (item.KD_STATUS === "403") {
            return {
                ...item,
                URAIAN: "Completed"
            };
        }
        if (item.KD_STATUS === "400") {
            return {
                ...item,
                URAIAN: "Invoice"
            };
        }
        if (item.KD_STATUS === "401") {
            return {
                ...item,
                URAIAN: "Pelunasan"
            };
        }
        if (item.KD_STATUS === "405") {
            return {
                ...item,
                URAIAN: "Surat Tagihan"
            };
        }
        return item;
    })

    return result_data
}

exports.getRefStatus = async (id_tab_status) => {
    const result = await db.query(query.getRefStatus, {
        replacements: { id_tab_status },
        type: db.QueryTypes.SELECT
    })
    return result
}

exports.markAsProject = async (payload, transaction) => {
    const result = []
    const { project_id, status, id_tab_status, updated_by } = payload
    for (const id of project_id) {
        const payloadProject = { kd_status: status, project_id: id, updated_by: updated_by }
        const updateProject = await this.updateProject(payloadProject)
        if (updateProject) {
            const payloadProjectStatus = {
                project_id: id,
                kd_status: status,
                date_status: Date.now(),
                type: await helpers.getTypeByStatus(status),
                id_tab_status: id_tab_status,
                type_status: 'PR01',
                updated_by: updated_by
            }
            const createProjectStatus = await model.d_project_status.create(payloadProjectStatus, { transaction })
            result.push({ updateProject, createProjectStatus })
        }
    }
    return {
        status: true,
        message: "Data Berhasil Diupdate",
        data: result
    }
}

exports.getPortofolio = async () => {
    const result = await model.m_portofolio.findAll({ where: { flag_aktif: 'Y' }, order: [['portofolio_id', 'ASC']] })
    return result
}

exports.getLinkedPID = async (keyword) => {
    const result = await db.query(query.getLinkedPID, {
        replacements: { keyword },
        type: db.QueryTypes.SELECT
    });

    return result;
}

exports.getListDokumen = async ({ jns_dok, tipe_dok }) => {
    const QUERY = query.getListDokumen
        .replace(/:jns_dok/g, `'${jns_dok}'`)
        .replace(/:tipe_dok/g, `'${tipe_dok}'`);

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })
    return result
}

exports.getCustomers = async (keyword) => {
    const result = await model.m_customer.findAll({ where: { customer_name: sequelize.where(sequelize.fn('LOWER', sequelize.col('CUSTOMER_NAME')), 'LIKE', '%' + keyword.toLowerCase() + '%') } })
    return result;
}

exports.getStartDate = async ({ column, table }) => {
    const QUERY = query.getStartDate.replace(/:table/g, table).replace(/:column/g, column)
    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })
    return result
}

exports.markAsArchive = async (payload, transaction) => {
    const result = []
    const dateNow = Date.now()
    const { project_id, archive, id_tab_status, updated_by } = payload
    for (const id of project_id) {
        const updatedProjectArchive = await model.d_project.update({ kd_archive: archive, updated_at: dateNow, updated_by: updated_by }, { where: { project_id: id }, transaction })
        const statusUpdate = await helpers.statusUpdate(updatedProjectArchive)
        if (statusUpdate) {
            const payloadProjectStatus = {
                project_id: id,
                kd_status: archive,
                date_status: dateNow,
                type: '02',
                id_tab_status: id_tab_status,
                type_status: 'PR01',
                created_by: updated_by
            }
            const createProjectStatus = await model.d_project_status.create(payloadProjectStatus, { transaction })
            result.push({ statusUpdate, createProjectStatus })
        }
    }

    return {
        status: true,
        message: "Data Berhasil Diupdate",
        data: result
    }
}

exports.markAsUnarchive = async (payload, transaction) => {
    const result = []
    const dateNow = Date.now()
    const { project_id, updated_by } = payload
    for (const id of project_id) {
        const updatedProjectArchive = await model.d_project.update({ kd_archive: null, updated_at: dateNow, updated_by: updated_by }, { where: { project_id: id }, transaction })
        const statusUpdate = await helpers.statusUpdate(updatedProjectArchive)
        if (statusUpdate) {
            const payloadProjectStatus = {
                project_id: id,
                kd_status: "104",
                date_status: dateNow,
                id_tab_status: "SA2",
                type_status: 'PR01',
                created_by: updated_by
            }
            const createProjectStatus = await model.d_project_status.create(payloadProjectStatus, { transaction })
            result.push({ statusUpdate, createProjectStatus })
        }
    }

    return {
        status: true,
        message: "Data Berhasil Diupdate",
        data: result
    }
}

exports.markAsClone = async (payload, transaction) => {
    const result = []
    const dateNow = Date.now()
    const { project_id, updated_by } = payload

    for (const id of project_id) {
        const updatedProject = await model.d_project.update({ flag_aktif: 'F', updated_at: dateNow, updated_by: updated_by }, { where: { project_id: id }, transaction })
        const statusUpdate = await helpers.statusUpdate(updatedProject)
        if (statusUpdate.status) {
            const projectData = await model.d_project.findOne({ where: { project_id: id }, raw: true })

            const payloadProject = Object.keys(projectData).reduce((acc, key) => {
                acc[key.toLowerCase()] = projectData[key];
                return acc;
            }, {});

            delete payloadProject.flag_aktif, delete payloadProject.updated_by, delete payloadProject.updated_at;
            payloadProject.project_id = uuidv4()
            payloadProject.created_by = updated_by
            payloadProject.created_at = dateNow

            const createProject = await model.d_project.create(payloadProject, { transaction })
            const projectIdNew = createProject?.dataValues?.project_id;

            //clone data billing
            const d_billing = await model.d_billing.findAll({ where: { project_id: id } })
            const billingData = d_billing.map(item => item.dataValues);
            for (itemBilling of billingData) {
                const data = await model.d_billing.findOne({ where: { billing_id: itemBilling?.billing_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                delete payload.updated_by, delete payload.updated_at;
                payload.billing_id = uuidv4()
                payload.project_id = projectIdNew
                payload.created_by = updated_by
                payload.created_at = dateNow

                const createBilling = await model.d_billing.create(payload, { transaction })
                const billingIdNew = createBilling?.dataValues?.billing_id

                // clone billing dokumen
                const d_billing_dokumen = await model.d_billing_dokumen.findAll({ where: { billing_id: itemBilling?.billing_id } })
                const dokumenData = d_billing_dokumen.map(item => item.dataValues);
                for (item of dokumenData) {
                    const dataDok = await model.d_billing_dokumen.findOne({ where: { billing_detail_id: item?.billing_detail_id }, raw: true })

                    const payloadDok = Object.keys(dataDok).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataDok[key];
                        return acc;
                    }, {});

                    delete payloadDok.updated_by, delete payloadDok.updated_at;
                    payloadDok.billing_detail_id = uuidv4()
                    payloadDok.billing_id = billingIdNew
                    payloadDok.created_by = updated_by
                    payloadDok.created_at = dateNow

                    const createBillingDokumen = await model.d_billing_dokumen.create(payloadDok, { transaction })
                }
                // clone billing revenue
                const d_billing_revenue = await model.d_billing_revenue.findAll({ where: { billing_id: itemBilling?.billing_id } })
                const revenueData = d_billing_revenue.map(item => item.dataValues);
                for (item of revenueData) {
                    const dataRev = await model.d_billing_revenue.findOne({ where: { billing_revenue_id: item?.billing_revenue_id }, raw: true })

                    const payloadRev = Object.keys(dataRev).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataRev[key];
                        return acc;
                    }, {});

                    delete payloadRev.updated_by, delete payloadRev.updated_date;
                    payloadRev.billing_revenue_id = uuidv4()
                    payloadRev.billing_id = billingIdNew
                    payloadRev.created_by = updated_by
                    payloadRev.created_date = dateNow

                    const createRevenue = await model.d_billing_revenue.create(payloadRev, { transaction })
                }
            }
            //clone data cost opr
            const d_cost_opr = await model.d_cost_opr.findAll({ where: { project_id: id } })
            const costData = d_cost_opr.map(item => item.dataValues);
            for (item of costData) {
                const data = await model.d_cost_opr.findOne({ where: { cost_id: item?.cost_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                payload.cost_id = uuidv4()
                payload.project_id = projectIdNew

                const createCost = await model.d_cost_opr.create(payload, { transaction })
                const costIdNew = createCost?.dataValues?.cost_id

                // clone cost opr detail
                const d_opr_detail = await model.d_cost_opr_detail.findAll({ where: { cost_id: item?.cost_id } })
                const oprDetailData = d_opr_detail.map(item => item.dataValues);
                for (item of oprDetailData) {
                    const dataDetail = await model.d_cost_opr_detail.findOne({ where: { cost_detail_id: item?.cost_detail_id }, raw: true })

                    const payloadDetail = Object.keys(dataDetail).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataDetail[key];
                        return acc;
                    }, {});

                    payloadDetail.cost_detail_id = uuidv4()
                    payloadDetail.cost_id = costIdNew

                    const createOprDetail = await model.d_cost_opr_detail.create(payloadDetail, { transaction })
                }
                // clone cost opr revenue
                const d_opr_revenue = await model.d_cost_revenue.findAll({ where: { cost_id: item?.cost_id } })
                const oprRevenueData = d_opr_revenue.map(item => item.dataValues);
                for (item of oprRevenueData) {
                    const dataRevenue = await model.d_cost_revenue.findOne({ where: { cost_revenue_id: item?.cost_revenue_id }, raw: true })

                    const payloadRevenue = Object.keys(dataRevenue).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataRevenue[key];
                        return acc;
                    }, {});

                    payloadRevenue.cost_revenue_id = uuidv4()
                    payloadRevenue.cost_id = costIdNew

                    const createCostRevenue = await model.d_cost_revenue.create(payloadRevenue, { transaction })
                }
            }
            //clone data d_personil
            //
            const d_personil = await model.d_personil.findAll({ where: { project_id: id } })
            const personilData = d_personil.map(item => item.dataValues);
            for (item of personilData) {
                const data = await model.d_personil.findOne({ where: { personel_id: item?.personel_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                payload.personel_id = uuidv4()
                payload.project_id = projectIdNew

                const createPersonil = await model.d_personil.create(payload, { transaction })
                const personelIdNew = createPersonil?.dataValues?.personil_id

                // clone personil detail
                const personil_detail = await model.d_personil_detail.findAll({ where: { personel_id: item?.personel_id } })
                const personilDetailData = personil_detail.map(item => item.dataValues);
                for (item of personilDetailData) {
                    const dataDetail = await model.d_personil_detail.findOne({ where: { dpersonel_id: item?.dpersonel_id }, raw: true })

                    const payloadDetail = Object.keys(dataDetail).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataDetail[key];
                        return acc;
                    }, {});

                    payloadDetail.dpersonel_id = uuidv4()
                    payloadDetail.personel_id = personelIdNew

                    const createPersonilDetail = await model.d_personil_detail.create(payloadDetail, { transaction })
                }
            }
            //clone data cbb
            const d_cbb = await model.d_project_cbb.findAll({ where: { project_id: id } })
            const cbbData = d_cbb.map(item => item.dataValues);
            for (item of cbbData) {
                const data = await model.d_project_cbb.findOne({ where: { cbb_id: item?.cbb_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                payload.cbb_id = uuidv4()
                payload.project_id = projectIdNew

                const createCBB = await model.d_project_cbb.create(payload, { transaction })
            }
            //clone data vendor
            const d_vendor = await model.d_project_vendor.findAll({ where: { project_id: id } })
            const vendorData = d_vendor.map(item => item.dataValues);
            for (item of vendorData) {
                const data = await model.d_project_vendor.findOne({ where: { project_vendor_id: item?.project_vendor_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                delete payload.updated_by, delete payload.updated_at;
                payload.project_vendor_id = uuidv4()
                payload.project_id = projectIdNew
                payload.created_by = updated_by
                payload.created_at = dateNow

                const createVendor = await model.d_project_vendor.create(payload, { transaction })
            }
            //clone data remind
            const d_remind = await model.d_remind.findAll({ where: { project_id: id } })
            const remindData = d_remind.map(item => item.dataValues);
            for (item of remindData) {
                const data = await model.d_remind.findOne({ where: { remind_id: item?.remind_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                delete payload.updated_by, delete payload.updated_at;
                payload.remind_id = uuidv4()
                payload.project_id = projectIdNew
                payload.created_by = updated_by
                payload.created_at = dateNow

                const createRemind = await model.d_remind.create(payload, { transaction })
            }
            //clone data project status
            const d_project_status = await model.d_project_status.findAll({ where: { project_id: id } })
            const statusData = d_project_status.map(item => item.dataValues);
            for (item of statusData) {
                const data = await model.d_project_status.findOne({ where: { status_id: item?.status_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                delete payload.updated_by, delete payload.updated_at;
                payload.status_id = uuidv4()
                payload.project_id = projectIdNew
                payload.created_by = updated_by
                payload.created_at = dateNow

                const createStatus = await model.d_project_status.create(payload, { transaction })
            }

            result.push({ statusUpdate, createProject })
        }
    }

    return {
        status: true,
        message: "Data Berhasil Diclone",
        data: result
    }
}

exports.getDetailProjectProfile = async (project_id, NIP) => {
    const result = await db.query(query.getDetailProjectProfile, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const {
        percentageGeneral,
        cost,
        nominal,
        project_log
    } = await this.getGeneralInfo(project_id)

    const {
        percentageTop,
        list_top
    } = await this.getTopOverview(project_id)

    const {
        percentageVendor,
        list_vendor
    } = await this.getVendorOverview(project_id)

    const d_personil = await model.d_personil.findAll({ where: { project_id: project_id } })
    const personilData = d_personil.map(item => item.dataValues);

    return {
        ...result,
        GENERAL_INFO: { PERCENTAGE: percentageGeneral, COST: cost, NOMINAL: nominal, PROJECT_LOG: project_log },
        TOP_OVERVIEW: { PERCENTAGE: percentageTop, LIST_TOP: list_top },
        VENDOR_OVERVIEW: { PERCENTAGE: percentageVendor, LIST_VENDOR: list_vendor },
        BUDGET_OVERVIEW: {},
        PERSONIL: personilData[0]?.personel_id
    }
}

exports.getDetailProject = async (project_id, NIP, kode) => {
    const result = await db.query(query.getDetailProject, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    if (!result) return result
    const roleAccess = await this.getRoleUser(kode);

    if (roleAccess?.RoleId == '4416') {
        Object.assign(result, { FLAG_BE: true, FLAG_EDIT: result.NIP_SALES == NIP ? true : true })
    } else if ((NIP && kode) && result?.NIP_SALES !== NIP) {
        if ((roleAccess?.RoleId == '4382' || roleAccess?.RoleId == '4380') && roleAccess?.FlagAktif == 'T' && roleAccess?.FlagAdmin == 'T') {
            Object.assign(result, { FLAG_EDIT: true })
        } else {
            Object.assign(result, { FLAG_EDIT: true })
        }
    } else {
        Object.assign(result, { FLAG_EDIT: result.NIP_SALES == NIP ? true : true })
    }

    const {
        dataAkselerasi,
        dokumenRfi,
        dokumenPendukung,
        dokumenKontrak,
        dokumenBAMK,
        dokumenCBB,
        billingCollectionPlan,
        vendorPlanning,
        assign_team,
    } = await this.getDetailDokumen(project_id)

    if (result) {
        if (result.VENDOR_PLANNING) result.VENDOR_PLANNING = JSON.parse(result.VENDOR_PLANNING)
        else result.VENDOR_PLANNING = []
        if (result.VENDOR_FINAL) result.VENDOR_FINAL = JSON.parse(result.VENDOR_FINAL)
        else result.VENDOR_FINAL = []
    }

    const resultChild = await db.query(query.getBillingChildOpt, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        DETAIL_CHILD: resultChild,
        AKSELERASI: dataAkselerasi,
        DOKUMEN_RFI: dokumenRfi,
        DOKUMEN_PENDUKUNG: dokumenPendukung,
        DOKUMEN_KONTRAK: dokumenKontrak,
        DOKUMEN_BAMK: dokumenBAMK,
        DOKUMEN_BILLING: billingCollectionPlan,
        DOKUMEN_VENDOR: vendorPlanning,
        DOKUMEN_CBB: dokumenCBB,
        ASSIGN_PROJECT: assign_team
    }
}

exports.getDetailProjectByNo = async (project_no, NIP, kode) => {
    const result = await db.query(query.getDetailProjectByNo, {
        replacements: { project_no },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getGeneralInfo = async (project_id) => {
    const percentage = await db.query(query.getPercentage, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
    })

    const cost = await db.query(query.getCost, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
    })

    const nominal = await db.query(query.getPeople, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    const project_log = await db.query(query.getProjectLog, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return {
        percentage,
        cost,
        nominal,
        project_log
    }
}

exports.getDetailDokumen = async (project_id) => {
    let dokumenPendukung, dokumenKontrak, dokumenBAMK
    for (let i = 1; i <= 3; i++) {
        const dataDokumen = await db.query(query.getDokumenProject, {
            replacements: { project_id, tipe_dokumen: '0' + i },
            type: db.QueryTypes.SELECT
        })

        if (i == 1) dokumenPendukung = dataDokumen
        if (i == 2) dokumenBAMK = dataDokumen
        if (i == 3) dokumenKontrak = dataDokumen
    }

    const dokumenCBB = await db.query(query.getDokumenProjectByJnsDokumen, {
        replacements: { project_id, jns_dokumen: '04001' },
        type: db.QueryTypes.SELECT
    })

    const assign_team = await db.query(query.getAssignProject, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    const billingCollectionPlan = await db.query(query.getBillingCollection, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
    })

    if (billingCollectionPlan.length > 0) {
        for (let i = 0; i < billingCollectionPlan.length; i++) {
            const billing = billingCollectionPlan[i];
            const billingDokumen = await this.getBillingDocument({ billing_id: billing.BILLING_ID })
            billing.TOTAL_DOKUMEN = billingDokumen.DOKUMEN_BILLING.length
            billing.DOKUMEN = billingDokumen.DOKUMEN_PENDUKUNG
        }
    }

    const vendorPlanning = await db.query(query.getVendorPlanning, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
    })

    const dataAkselerasi = await db.query(query.getDataEkselerasi, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    const dokumenRfi = await db.query(query.getDokumenProject, {
        replacements: { project_id, tipe_dokumen: '05' },
        type: db.QueryTypes.SELECT
    })

    return {
        dataAkselerasi,
        dokumenRfi,
        dokumenPendukung,
        dokumenKontrak,
        dokumenBAMK,
        dokumenCBB,
        billingCollectionPlan,
        vendorPlanning,
        assign_team
    }
}

exports.insertDokumen = async (payloadData, files, transaction) => {
    console.log("an.. insertDataDokumen")
    if (files === null || files === "" || files === undefined) {
        const saveDokumen = await this.saveDokumen(payloadData, "")
        const saveBillingDokumen = await this.saveBillingDokumen(payloadData, saveDokumen)
        return {
            dokumen_id: saveDokumen,
            dokumen_billing: saveBillingDokumen,
            keterangan: "Dokumen berhasil disimpan",
        }
    } else {
        const uploadDocument = await this.processUploadFile(payloadData, files);
        const saveDokumen = await this.saveDokumen(payloadData, uploadDocument)
        const saveBillingDokumen = await this.saveBillingDokumen(payloadData, saveDokumen)
        return {
            dokumen_id: saveDokumen,
            dokumen_billing: saveBillingDokumen,
            keterangan: "Dokumen berhasil disimpan",
        }
    }
}

exports.insertDokumenMaterai = async (payloadData, files, transaction) => {
    const uploadDocument = await this.processUploadMaterai(payloadData, files);
    return uploadDocument
}

exports.updateDokumen = async (payloadData, files) => {
    const uploadDocument = await this.processUploadFile(payloadData, files);
    const updateDokumen = await this.updateDokumens(payloadData, uploadDocument)

    return {
        dokumen_id: updateDokumen,
        keterangan: "Dokumen berhasil disimpan",
    }
}

exports.updateDokumenStamp = async (payloadData, files) => {
    const uploadDocument = await this.processUploadFileStamp(payloadData, files);
    const updateDokumen = await this.updateDokumens(payloadData, uploadDocument)

    return {
        dokumen_id: updateDokumen,
        keterangan: "Dokumen berhasil disimpan",
    }
}

exports.updateDokumenNoFile = async (payload) => {
    const { dokumen_id } = payload
    const updateDokumen = await model.d_dokumen.update(payload, { where: { dokumen_id } })

    return { dokumen_id: dokumen_id, keterangan: "Data Berhasil Diupdate !" }
}

exports.insertDokumenBase64 = async (payloadData, transaction) => {
    console.log("an.. insertDataDokumen Base64")
    const uploadDocument = await this.processUploadFileBase64(payloadData);
    const saveDokumen = await this.saveDokumenBase64(payloadData, uploadDocument)
    const saveBillingDokumen = await this.saveBillingDokumenBase64(payloadData, saveDokumen)

    return {
        dokumen_id: saveDokumen,
        dokumen_billing: saveBillingDokumen,
        keterangan: "Dokumen berhasil disimpan",
    }
}

exports.processUploadFile = async (data, files) => {
    const result = []
    for (const lampiran of files) {
        const name = lampiran.name
        const ext = path.extname(name).toLowerCase()
        const file_name = Date.now() + '_' + ext
        const _date = moment().local('id');
        const _months = Number(_date.format("MM"));

        const path_upload = "files" + '/' + `${_date.year()}/${_months}/${_date.date()}/`;

        const full_path = await this.uploadFile(lampiran, path_upload, file_name)
        result.push(full_path)
    }
    return result
}

exports.processUploadMaterai = async (data, files) => {
    const result = []
    for (const lampiran of files) {
        const name = lampiran.name
        const ext = path.extname(name).toLowerCase()
        const file_name = data[0]?.NAMA_FOLDER === 'STAMP' ? 'MTR-' + data[0]?.BILLING_CODE + '' + ext : 'INV-' + data[0]?.BILLING_CODE + '-DRAFT' + ext
        const path_upload = "sharefolder/" + data[0]?.NAMA_FOLDER + "/";
        const full_path = await this.uploadFileMaterai(lampiran, path_upload, file_name)
        result.push({ name: file_name, path: full_path })
    }

    if (result?.length > 0) {
        return {
            status: result.length > 0,
            files: result
        };
    } else {
        return {
            status: false,
            files: result,
        };
    }
}

exports.processUploadFileStamp = async (data, files) => {
    const result = [];
    for (const lampiran of files) {
        const name = lampiran.name || (`file_${Date.now()}.pdf`);
        let ext = path.extname(name).toLowerCase(); // termasuk dot, misal '.pdf'
        if (!ext) ext = '.pdf'; // fallback

        const file_name = `${Date.now()}${ext}`; // contoh: 169... .pdf

        const _date = moment().local('id');
        const _months = Number(_date.format("MM"));
        const path_upload = path.join(
            "files",
            `${_date.year()}`,
            `${_months}`,
            `${_date.date()}`
        ); // gunakan path.join

        const full_path = await this.uploadFileStamp(lampiran, path_upload, file_name);
        result.push(full_path);
    }
    return result;
}

exports.processUploadFileBase64 = async (data) => {
    // const result = []
    // for (const lampiran of files) {
    const ext = path.extname(data.lampiran.fileName)
    const file_name = Date.now() + '_' + ext
    const _date = moment().local('id');
    const _months = Number(_date.format("MM"));

    const path_upload = "files" + '/' + `${_date.year()}/${_months}/${_date.date()}/`;

    const full_path = await this.uploadFileBase64(data.lampiran.fileData, path_upload, file_name)
    // result.push(full_path)
    // }
    return full_path;
}

exports.uploadFile = async (lampiran, path_upload, file_name) => {
    //concat dir and name upload
    let full_path = path_upload + file_name;

    // Check Directory
    if (!fs.existsSync(path_upload)) {
        // Move file upload
        await fs.promises.mkdir(path_upload, { recursive: true }, (err) => {
            if (err) console.error(err);
        });

        // Give privilege path folder
        // fs.chmod(path_upload, 0o777, (err) => {
        // 	if (err) console.log(err);
        // });

        //do upload file
        lampiran.mv(full_path, (err) => {
            if (err) console.error(err);
        });
    } else {
        //check file in path exist or not
        if (!fs.existsSync(full_path)) {
            // Give privilege folder
            // chmodr(path_upload, 0o777, (err) => {
            // 	if (err) console.log(err);
            // });

            // Do upload file
            lampiran.mv(full_path, (err) => {
                if (err) console.error(err);
            });
        } else {
            // if path exist than access file
            fs.access(full_path, fs.F_OK, (err) => {
                if (err) {
                    return err
                }

                //give privilege to remove file
                // chmodr(full_path, 0o777, (err) => {
                // 	if (err) { console.log(err) }
                // });

                // Do remove file
                fs.unlink(full_path, (err) => {
                    if (err) { console.error(err) }
                });

                //give privilege to folder
                // chmodr(path_upload, 0o777, (err) => {
                // 	if (err) { console.log(err) }
                // });

                // Do upload file again
                lampiran.mv(full_path, (err) => {
                    if (err) console.error(err);
                });
            });
        }
    }

    return full_path;
}

// exports.uploadFileMaterai = async (lampiran, path_upload, file_name) => {
//     //concat dir and name upload
//     let full_path = path_upload + file_name;

//     // Check Directory
//     if (!fs.existsSync(path_upload)) {
//         // Move file upload
//         await fs.promises.mkdir(path_upload, { recursive: true }, (err) => {
//             if (err) console.error(err);
//         });

//         // Give privilege path folder
//         // fs.chmod(path_upload, 0o777, (err) => {
//         // 	if (err) console.log(err);
//         // });

//         //do upload file
//         lampiran.mv(full_path, (err) => {
//             if (err) console.error(err);
//         });
//     } else {
//         //check file in path exist or not
//         if (!fs.existsSync(full_path)) {
//             // Give privilege folder
//             // chmodr(path_upload, 0o777, (err) => {
//             // 	if (err) console.log(err);
//             // });

//             // Do upload file
//             lampiran.mv(full_path, (err) => {
//                 if (err) console.error(err);
//             });
//         } else {
//             // if path exist than access file
//             fs.access(full_path, fs.F_OK, (err) => {
//                 if (err) {
//                     return err
//                 }

//                 //give privilege to remove file
//                 // chmodr(full_path, 0o777, (err) => {
//                 // 	if (err) { console.log(err) }
//                 // });

//                 // Do remove file
//                 fs.unlink(full_path, (err) => {
//                     if (err) { console.error(err) }
//                 });

//                 //give privilege to folder
//                 // chmodr(path_upload, 0o777, (err) => {
//                 // 	if (err) { console.log(err) }
//                 // });

//                 // Do upload file again
//                 lampiran.mv(full_path, (err) => {
//                     if (err) console.error(err);
//                 });
//             });
//         }
//     }

//     return full_path;
// }

exports.uploadFileMaterai = async (lampiran, path_upload, file_name) => {
    const full_path = path.join(path_upload, file_name);

    if (!fs.existsSync(path_upload)) {
        await fs.promises.mkdir(path_upload, { recursive: true });
    }

    if (fs.existsSync(full_path)) {
        await fs.promises.unlink(full_path);
    }

    await lampiran.mv(full_path);

    return full_path;
};

exports.uploadFileStamp = async (lampiran, path_upload, file_name) => {
    // gunakan path.join untuk benar2 membentuk path
    // pastikan path_upload adalah folder (bukan include filename)
    const full_path = path.join(path_upload, file_name);

    // buat folder (rekursif) jika belum ada
    await fs.promises.mkdir(path_upload, { recursive: true });

    // Jika lampiran punya mv (express-fileupload)
    if (typeof lampiran.mv === 'function') {
        await new Promise((resolve, reject) => {
            lampiran.mv(full_path, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }
    // Jika lampiran sudah berupa path temporer di disk
    else if (lampiran.path) {
        // copy (atau rename) dari temp path ke tujuan
        await fs.promises.copyFile(lampiran.path, full_path);
    }
    // Jika lampiran berupa buffer/data (multer => .buffer, express-fileupload => .data)
    else if (lampiran.buffer || lampiran.data) {
        const data = lampiran.buffer || lampiran.data;
        await fs.promises.writeFile(full_path, data);
    }
    else {
        throw new Error("Unsupported lampiran format. Expected .mv, .path, .buffer or .data");
    }

    return full_path;
}

exports.uploadFileBase64 = async (lampiran, path_upload, file_name) => {
    //concat dir and name upload
    let full_path = path_upload + file_name;

    // Check Directory
    if (!fs.existsSync(path_upload)) {
        // Move file upload
        await fs.promises.mkdir(path_upload, { recursive: true }, (err) => {
            if (err) console.error(err);
        });

        // Give privilege path folder
        // fs.chmod(path_upload, 0o777, (err) => {
        // 	if (err) console.log(err);
        // });

        //do upload file
        fs.writeFile(full_path, lampiran, 'base64', (err) => {
            if (err) {
                console.error('Error saving file:', err);
            }
        });
    } else {
        //check file in path exist or not
        if (!fs.existsSync(full_path)) {
            // Give privilege folder
            // chmodr(path_upload, 0o777, (err) => {
            // 	if (err) console.log(err);
            // });

            // Do upload file
            fs.writeFile(full_path, lampiran, 'base64', (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                }
            });
        } else {
            // if path exist than access file
            fs.access(full_path, fs.F_OK, (err) => {
                if (err) {
                    return err
                }

                //give privilege to remove file
                // chmodr(full_path, 0o777, (err) => {
                // 	if (err) { console.log(err) }
                // });

                // Do remove file
                fs.unlink(full_path, (err) => {
                    if (err) { console.error(err) }
                });

                //give privilege to folder
                // chmodr(path_upload, 0o777, (err) => {
                // 	if (err) { console.log(err) }
                // });

                // Do upload file again
                fs.writeFile(full_path, lampiran, 'base64', (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                    }
                });
            });
        }
    }

    return full_path;
}

exports.saveDokumen = async (payloadData, full_path) => {
    const post_data = []
    for (let i = 0; i < payloadData.length; i++) {
        const data = payloadData[i]
        const payload = {
            ...data,
            dokumen_id: uuidv4(),
            url_dokumen: full_path !== null ? full_path[i] : ""
        }
        const result = await model.d_dokumen.create(payload)
        post_data.push(result)
    }
    return post_data
}

exports.updateDokumens = async (payloadData, full_path) => {
    const { dokumen_id } = payloadData
    const payload = {
        ...payloadData,
        url_dokumen: full_path[0]
    }

    const result = await model.d_dokumen.update(payload, { where: { dokumen_id } })

    return result
}

exports.updateDokumenPeo = async (payloadData) => {
    const { dokumen_id } = payloadData
    const result = await model.d_dokumen.update(payloadData, { where: { dokumen_id } })

    return result
}

exports.insertDokumenNoFile = async (payloadData, transaction) => {
    const post_data = []
    for (let i = 0; i < payloadData.length; i++) {
        const data = payloadData[i]
        const payload = {
            dokumen_id: uuidv4(),
            tipe_dokumen: data?.tipe_dokumen || "",
            jns_dokumen: data?.jns_dokumen || "",
            no_dokumen: "",
            tgl_dokumen: data?.tgl_dokumen || "",
            url_dokumen: data?.url_dokumen || "",
            notes: data?.notes || "",
            project_id: data?.project_id,
            created_by: data?.created_by
        }
        const result = await model.d_dokumen.create(payload, transaction)

        if (data.billing_id) {
            const payloadBilling = {
                billing_id: data.billing_id,
                dokumen_id: payload?.dokumen_id,
                billing_detail_id: uuidv4(),
                created_by: payload.created_by
            }
            await model.d_billing_dokumen.create(payloadBilling)
        }

        post_data.push(result)
    }
    return post_data
}

exports.saveDokumenBase64 = async (payloadData, full_path) => {
    // const post_data = []
    // for (let i = 0; i < payloadData.length; i++) {
    //     const data = payloadData[i]
    const payload = {
        ...payloadData,
        dokumen_id: uuidv4(),
        url_dokumen: full_path
    }
    const result = await model.d_dokumen.create(payload)
    // post_data.push(result)
    // }
    return result
}

exports.saveBillingDokumen = async (payloadData, saveDokumen) => {
    const result = []

    for (let i = 0; i < payloadData.length; i++) {
        const data = payloadData[i];

        const { billing_id, created_by } = data
        if (billing_id) {
            const payload = {
                billing_id: billing_id,
                dokumen_id: saveDokumen[i].dataValues.dokumen_id,
                billing_detail_id: uuidv4(),
                created_by: created_by
            }

            const created = await model.d_billing_dokumen.create(payload)
            result.push(created)
        }
    }
    return result


}

exports.saveBillingDokumenBase64 = async (payloadData, saveDokumen) => {
    const result = []

    // for (let i = 0; i < payloadData.length; i++) {
    //     const data = payloadData[i];

    const { billing_id, created_by } = payloadData
    if (billing_id) {
        const payload = {
            billing_id: billing_id,
            dokumen_id: saveDokumen.dataValues.dokumen_id,
            billing_detail_id: uuidv4(),
            created_by: created_by
        }

        const created = await model.d_billing_dokumen.create(payload)
        result.push(created)
    }
    // }
    return result


}

exports.deleteDokumen = async (dokumen_id, aktor) => {
    const dataDokumen = await model.d_dokumen.findOne({ where: { dokumen_id }, raw: true })
    const historyDokumen = await model.h_dokumen.create({
        action_date: moment(Date.now()).format('YYYY-MM-DD') || "",
        method: "DELETE",
        aktor: aktor,
        json_data: JSON.stringify(dataDokumen)
    })

    const dataBilling = await model.d_billing_dokumen.findOne({ where: { dokumen_id }, raw: true })
    // if (dataDokumen && dataDokumen.url_dokumen !== null) await this.deleteFileFromDirectory(dataDokumen.url_dokumen)
    if (dataDokumen?.jns_dokumen === '01003' || dataDokumen?.jns_dokumen === '01032') {
        await model.d_billing_revenue.update({ no_faktur: "", tgl_faktur: "" }, { where: { billing_id: dataBilling?.billing_id } })
    }
    const result = await model.d_dokumen.destroy({ where: { dokumen_id } })
    const resultBillingDokumen = await model.d_billing_dokumen.destroy({ where: { dokumen_id } })
    return await helpers.processDelete(result)
}

exports.deleteFileFromDirectory = async (path) => {
    fs.access(path, fs.F_OK, (err) => {
        if (err) {
            return err
        } else {
            //give privilege to remove file
            chmodr(path, 0o777, (err) => {
                if (err) {
                    return err;
                }
            });
            // do remove file
            fs.unlink(path, (err) => {
                if (err) {
                    return err;
                }
            });
        }
    });
}

exports.updateProject = async (payload) => {
    const { project_id } = payload
    Object.assign(payload, { updated_at: Date.now() })
    const checkPo = await model.d_sap_po.findOne({ where: { project_id }, raw: true })
    if (payload?.po_number && !checkPo) {
        if (payload?.detailPO) {
            const payloadPO = payload?.detailPO
            const header = {
                project_id: payload?.project_id,
                nomor_po: payloadPO?.nomor_po,
                nomor_pr: payloadPO?.nomor_pr,
                ekpo_ebelp: payloadPO?.ekpo_ebelp,
                desc_item: payloadPO?.desc_item,
            }
            const insertPo = await model.d_sap_po.create(header, { returning: true })
            if (insertPo) {
                if (payloadPO?.item_barang) {
                    for (item of payloadPO?.item_barang) {
                        const payloadItem = {
                            po_id: insertPo?.id,
                            ...item
                        }
                        await model.d_sap_po_item.create(payloadItem)
                    }
                }
                if (payloadPO?.item_service) {
                    for (item of payloadPO?.item_service) {
                        const payloadItem = {
                            po_id: insertPo?.id,
                            ...item
                        }
                        await model.d_sap_po_service.create(payloadItem)
                    }
                }
            }
        }
    } else {
        if (payload?.po_number && payload?.detailPO) {
            const dataProject = await model.d_project.findOne({ where: { project_id }, raw: true })
            if (payload?.po_number !== dataProject?.po_number) {
                const nonAktifPO = await model.d_sap_po.update({ flag_aktif: 'T' }, { where: { id: checkPo?.id } })
                if (nonAktifPO) {
                    if (payload?.detailPO) {
                        const payloadPO = payload?.detailPO
                        const header = {
                            project_id: payload?.project_id,
                            nomor_po: payloadPO?.nomor_po,
                            nomor_pr: payloadPO?.nomor_pr,
                            ekpo_ebelp: payloadPO?.ekpo_ebelp,
                            desc_item: payloadPO?.desc_item,
                        }
                        const insertPo = await model.d_sap_po.create(header, { returning: true })
                        if (insertPo) {
                            if (payloadPO?.item_barang) {
                                for (item of payloadPO?.item_barang) {
                                    const payloadItem = {
                                        po_id: insertPo?.id,
                                        ...item
                                    }
                                    await model.d_sap_po_item.create(payloadItem)
                                }
                            }
                            if (payloadPO?.item_service) {
                                for (item of payloadPO?.item_service) {
                                    const payloadItem = {
                                        po_id: insertPo?.id,
                                        ...item
                                    }
                                    await model.d_sap_po_service.create(payloadItem)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    const result = await model.d_project.update(payload, { where: { project_id } })
    return await helpers.processUpdate(result)
}

exports.updateCustomer = async (payload) => {
    const { customer_id } = payload
    Object.assign(payload, { updated_at: Date.now() })

    const result = await model.m_customer.update(payload, { where: { customer_id } })
    return await helpers.processUpdate(result)
}

exports.updateVendorPt = async (payload) => {
    const { vendor_id } = payload;
    Object.assign(payload, { updated_at: Date.now() })

    const result = await model.m_vendor_pt.update(payload, { where: { vendor_id } })
    return await helpers.processUpdate(result)
}

exports.updatePortofolio = async (payload) => {
    const { portofolio_id } = payload
    Object.assign(payload, { updated_at: Date.now() })

    const result = await model.m_portofolio.update(payload, { where: { portofolio_id } })
    return await helpers.processUpdate(result)
}

exports.updateKaryawan = async (payload) => {
    const { karyawan_id } = payload
    Object.assign(payload, { updated_at: Date.now() })

    const result = await model.m_karyawan.update(payload, { where: { karyawan_id } })
    return await helpers.processUpdate(result)
}

exports.updateKdStatus = async (payload) => {
    const { billing_id } = payload
    Object.assign(payload, { updated_at: Date.now() })
    const result = await model.d_billing.update(payload, { where: { billing_id } })
    return await helpers.processUpdate(result)
}

exports.updateHLog = async (payload) => {
    const { id_log } = payload
    Object.assign(payload, { updated_at: Date.now() })

    const result = await model.h_log.update(payload, { where: { id_log } })
    return await helpers.processUpdate(result)
}

exports.saveDokumenBAMK = async (Documents, payloadData) => {
    const result = []
    for (let i = 0; i < Documents.length; i++) {
        const { dokumen_id } = Documents[i];
        const payloadDokumen = { dokumen_bamk_id: dokumen_id, project_id: payloadData[i] }
        const updatedProject = await this.updateProject(payloadDokumen)
        result.push(updatedProject)
    }

    return result
}

exports.postBillingCollection = async (payload) => {
    let result
    const { billing_id } = payload

    if (!billing_id) {
        const est_periode_billing = payload.est_periode_billing.split("-")
        const real_periode_billing = payload.real_periode_billing ? payload.real_periode_billing.split("-") : []
        Object.assign(payload, { billing_id: uuidv4(), est_periode_billing: est_periode_billing[0], est_bulan_billing: est_periode_billing[1], real_periode_billing: real_periode_billing.length ? real_periode_billing[0] : null, real_bulan_billing: real_periode_billing.length ? real_periode_billing[1] : null })
        result = await model.d_billing.create(payload, {
            returning: true
        })
    } else {
        if (payload?.est_periode_billing) {
            if (payload?.est_periode_billing && payload?.est_periode_billing.includes('null') === false) {
                const est_periode_billing = payload.est_periode_billing.split("-")
                Object.assign(payload, { est_periode_billing: est_periode_billing[0], est_bulan_billing: est_periode_billing[1] })
            } else {
                const est_periode_billing = payload.est_periode_billing.split("-")
                Object.assign(payload, { est_periode_billing: null, est_bulan_billing: null })
            }
        } else {
            if (payload.real_periode_billing) {
                if (payload?.real_periode_billing && payload?.real_periode_billing.includes('null') === false) {
                    const real_periode_billing = payload.real_periode_billing.split("-")
                    Object.assign(payload, { real_periode_billing: real_periode_billing[0], real_bulan_billing: real_periode_billing[1] })
                } else {
                    const real_periode_billing = payload.real_periode_billing.split("-")
                    Object.assign(payload, { real_periode_billing: null, real_bulan_billing: null })
                }
            }
        }

        await model.d_billing.update(payload, { where: { billing_id: billing_id } })
            .then(async (res) => {
                result = await helpers.processUpdate(res)
            })
            .catch(error => console.log(error, "ERROR <<<<<<"))
    }
    return result
}

exports.getBillingCollection = async (project_id) => {
    const result = await db.query(query.getBillingCollection, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getStatusBilling = async (billing_id) => {
    const result = await db.query(query.getStatusBilling, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getBillingCollectionProjectActual = async (project_id) => {
    const result = await db.query(query.getBillingCollectionProjectActual, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.deleteBillingCollection = async (billing_id) => {
    const result = await model.d_billing.destroy({ where: { billing_id } })
    return await helpers.processDelete(result)
}

exports.deleteBillingDokumen = async (billing_detail_id) => {
    const result = await model.d_billing_dokumen.destroy({ where: { billing_detail_id } })
    return await helpers.processDelete(result)
}

exports.postVendorPlanning = async (payload) => {
    const { project_vendor_id } = payload
    let result = null
    if (project_vendor_id) {
        await model.d_project_vendor.update(payload, { where: { project_vendor_id: project_vendor_id } })
            .then(async (res) =>
                result = await helpers.processUpdate(res)
            ).catch(err => console.log(err))
    } else {
        Object.assign(payload, { project_vendor_id: uuidv4() })
        result = await model.d_project_vendor.create(payload)
    }
    return result
}

exports.vendorRemind = async (payload) => {
    const { remind_id } = payload
    let result = null

    if (remind_id === '' || remind_id === null) {
        Object.assign(payload, { remind_id: uuidv4() })
        result = await model.d_remind.create(payload)
    } else {
        await model.d_remind.update(payload, { where: { remind_id: remind_id } })
            .then(async (res) =>
                result = await helpers.processUpdate(res)
            ).catch(err => console.log(err))
    }
    return result
}

exports.getVendorPlanning = async (project_id) => {
    const result = await db.query(query.getVendorPlanning, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.deleteVendorPlanning = async (project_vendor_id) => {
    const result = await model.d_project_vendor.destroy({ where: { project_vendor_id } })
    return await helpers.processDelete(result)
}

exports.postCBBPlanning = async (payload) => {
    Object.assign(payload, { cbb_id: uuidv4() })
    const result = await model.d_project_cbb.create(payload)
    return result
}

exports.costPersonilPlanning = async (payload) => {
    Object.assign(payload, { personel_id: uuidv4() })
    const result = await model.d_personil.create(payload)
    return result
}

exports.getDokumenPendukung = async (project_id) => {
    const result = await db.query(query.getDokumenPendukung, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getDokumenKontrak = async (project_id) => {
    const result = await db.query(query.getDokumenKontrak, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getDokumenBAMK = async (project_id) => {
    const result = await db.query(query.getDokumenBAMK, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getCBBPlanning = async (project_id) => {
    let total_direct_cost = 0, total_indirect_cost = 0
    const result = await db.query(query.getCBBPlanning, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    const lampiran = await db.query(query.getDokumenProject, {
        replacements: { project_id, tipe_dokumen: "04" },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    if (result.length > 0) {
        for (const { DIRECT_COST, INDIRECT_COST } of result) {
            total_direct_cost += DIRECT_COST
            total_indirect_cost += INDIRECT_COST
        }
    }

    return {
        lampiran: lampiran,
        cbb_data: result,
        total_direct_cost: total_direct_cost,
        total_indirect_cost: total_indirect_cost
    }
}

exports.deleteCBBPlanning = async (cbb_id) => {
    const result = await model.d_project_cbb.destroy({ where: { cbb_id } })

    return await helpers.processDelete(result)
}

exports.getCostPersonilPlanning = async (project_id) => {
    let total_cost = 0
    const dataProject = await model.d_project.findOne({ where: { project_id }, raw: true })
    const result = await db.query(query.getCostPersonilPlanning, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            const personil = result[i];
            total_cost += personil.COST_TOTAL
            const personelDetail = await model.d_personil_detail.findOne({ where: { personel_id: personil.PERSONEL_ID } })
            Object.assign(personil, { PERSONEL_DETAIL: personelDetail })
        }
    }

    const resultVendor = await db.query(query.getCostVendorPlanning, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    if (resultVendor.length > 0) {
        for (let i = 0; i < resultVendor.length; i++) {
            const personil = resultVendor[i];
            total_cost += personil.COST_TOTAL
            const personelDetail = await model.d_personil_detail.findOne({ where: { personel_id: personil.PERSONEL_ID } })
            Object.assign(personil, { PERSONEL_DETAIL: personelDetail })
        }
    }

    return {
        PROJECT_ID: project_id,
        PROJECT_NAME: dataProject?.project_name,
        PERSONEL: result,
        PERSONEL_VENDOR: resultVendor,
        TOTAL_COST: total_cost
    }
}

exports.deleteCostPersonilPlanning = async (personel_id) => {
    const result = await model.d_personil.destroy({ where: { personel_id } })
    return await helpers.processDelete(result)
}

exports.deleteContactCustomer = async (customer_contact_id) => {
    const result = await model.m_customer_contact.destroy({ where: { customer_contact_id } })
    return await helpers.processDelete(result)
}

exports.deleteContactVendorPt = async (vendor_contact_id) => {
    const result = await model.m_vendor_kontak.destroy({ where: { vendor_contact_id } })
    return await helpers.processDelete(result);
}

exports.getSubReferensiByJenis = async ({ jns_ref, kd_ref, keyword }) => {
    const result = await db.query(query.getSubReferensiByJenis, {
        replacements: { jns_ref, kd_ref, keyword: `%${keyword}%` },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getSubReferensiByJenis2 = async ({ jns_ref, kd_ref, keyword }) => {
    const result = await db.query(query.getSubReferensiByJenis2, {
        replacements: { jns_ref, kd_ref, keyword: `%${keyword}%` },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getValidasi = async ({ jns_ref, kd_ref, keyword, sub_jns_ref = null }) => {
    const result = await db.query(query.getValidasi, {
        replacements: { jns_ref, kd_ref, keyword: `%${keyword}%`, sub_jns_ref },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getListVendor = async (keyword) => {
    const result = keyword ? await model.m_vendor_pt.findAll({ where: { nama_perusahaan: sequelize.where(sequelize.fn('LOWER', sequelize.col('NAMA_PERUSAHAAN')), 'LIKE', '%' + keyword.toLowerCase() + '%') } }) : await model.m_vendor_pt.findAll()

    return result
}

exports.getListVendorPt = async ({ keyword = '', page = 1, limit = 10, order = ['VENDOR_ID', 'ASC'] }) => {
    const offset = (page - 1) * limit;

    const whereClause = keyword
        ? {
            nama_perusahaan: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('NAMA_PERUSAHAAN')),
                'LIKE',
                '%' + keyword.toLowerCase() + '%'
            )
        }
        : {};

    const result = await model.m_vendor_pt.findAndCountAll({
        where: whereClause,
        offset,
        limit,
        order: [order] // e.g., ['NAMA_PERUSAHAAN', 'DESC']
    });

    return {
        list_data: result.rows,
        total_data: result.count,
        limit: limit,
        // total_halaman: Math.ceil(result.count / limit),
        total_halaman: page,
    };
};

exports.validasiPayloadMarkAsActualID = async (payload) => {
    const { project_actual_id, project_id, new_project } = payload
    const dataProject = await model.d_project.findOne({ where: { project_id: project_actual_id, project_type_id: '1' }, raw: true })

    if (!dataProject && Object.keys(new_project).length === 0 && new_project.constructor === Object) return {
        valid: false,
        message: "Project yang anda masukkan tidak valid!"
    }

    const validasiProjectAkselerasi = await this.validasiProjectAkselerasi(payload, '2')

    return {
        valid: validasiProjectAkselerasi.valid,
        message: "Project yang anda masukkan tidak valid!"
    }
}

exports.validasiProjectAkselerasi = async (payload, type) => {
    const { project_id } = payload
    let valid = true
    for (const project of project_id) {
        const dataProject = await model.d_project.findOne({ where: { project_id: project, project_type_id: type }, raw: true })
        if (!dataProject) {
            valid = false
            break
        }
    }

    return {
        valid: valid,
        message: "Project yang anda masukkan tidak valid!"
    }
}

exports.markAsActualID = async (payload, transaction) => {
    const { project_actual_id, new_project, updated_by } = payload
    if (project_actual_id.length == 0) {
        const project_id = uuidv4()
        Object.assign(new_project, {
            project_id: project_id,
            created_by: updated_by
            // project_no: await this.generateNoProject(project_id),
        })
        const createProject = await this.createDProject(new_project, transaction)
        const projectIdNew = createProject?.project?.project_id;
        const dateNow = Date.now();
        if (payload?.project_id.length == 1) {
            //clone data billing
            const d_billing = await model.d_billing.findAll({ where: { project_id: payload?.project_id[0] } })
            const billingData = d_billing.map(item => item.dataValues);
            for (itemBilling of billingData) {
                const data = await model.d_billing.findOne({ where: { billing_id: itemBilling?.billing_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                delete payload.updated_by, delete payload.updated_at;
                payload.billing_id = uuidv4()
                payload.project_id = projectIdNew
                payload.created_by = updated_by
                payload.created_at = dateNow

                const createBilling = await model.d_billing.create(payload, { transaction })
                const billingIdNew = createBilling?.dataValues?.billing_id

                // clone billing dokumen
                const d_billing_dokumen = await model.d_billing_dokumen.findAll({ where: { billing_id: itemBilling?.billing_id } })
                const dokumenData = d_billing_dokumen.map(item => item.dataValues);
                for (item of dokumenData) {
                    const dataDok = await model.d_billing_dokumen.findOne({ where: { billing_detail_id: item?.billing_detail_id }, raw: true })

                    const payloadDok = Object.keys(dataDok).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataDok[key];
                        return acc;
                    }, {});

                    delete payloadDok.updated_by, delete payloadDok.updated_at;
                    payloadDok.billing_detail_id = uuidv4()
                    payloadDok.billing_id = billingIdNew
                    payloadDok.created_by = updated_by
                    payloadDok.created_at = dateNow

                    const createBillingDokumen = await model.d_billing_dokumen.create(payloadDok, { transaction })
                }
                // clone billing revenue
                const d_billing_revenue = await model.d_billing_revenue.findAll({ where: { billing_id: itemBilling?.billing_id } })
                const revenueData = d_billing_revenue.map(item => item.dataValues);
                for (item of revenueData) {
                    const dataRev = await model.d_billing_revenue.findOne({ where: { billing_revenue_id: item?.billing_revenue_id }, raw: true })

                    const payloadRev = Object.keys(dataRev).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataRev[key];
                        return acc;
                    }, {});

                    delete payloadRev.updated_by, delete payloadRev.updated_date;
                    payloadRev.billing_revenue_id = uuidv4()
                    payloadRev.billing_id = billingIdNew
                    payloadRev.created_by = updated_by
                    payloadRev.created_date = dateNow

                    const createRevenue = await model.d_billing_revenue.create(payloadRev, { transaction })
                }
            }
        }
        payload.project_actual_id = project_id
        const postMarkAsActualID = await this.postMarkAsActualID(payload, transaction)
        return {
            project: createProject,
            markAsActualId: postMarkAsActualID
        }
    } else {
        const postMarkAsActualID = await this.postMarkAsActualID(payload, transaction)
        return {
            markAsActualId: postMarkAsActualID
        }
    }
}

exports.markAsActualIDNew = async (payload, transaction) => {
    const { project_actual_id, new_project, updated_by } = payload
    if (project_actual_id.length == 0) {
        const project_id = uuidv4()
        Object.assign(new_project, {
            project_id: project_id,
            created_by: updated_by
        })
        const createProject = await this.createDProject(new_project, transaction)
        const projectIdNew = createProject?.project?.project_id;
        const dateNow = Date.now();
        if (payload?.project_id.length == 1) {
            //clone data billing
            const d_billing = await model.d_billing.findAll({ where: { project_id: payload?.project_id[0] } })
            const billingData = d_billing.map(item => item.dataValues);
            for (itemBilling of billingData) {
                const data = await model.d_billing.findOne({ where: { billing_id: itemBilling?.billing_id }, raw: true })

                const payload = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                delete payload.updated_by, delete payload.updated_at;
                payload.billing_id = uuidv4()
                payload.project_id = projectIdNew
                payload.created_by = updated_by
                payload.created_at = dateNow

                const createBilling = await model.d_billing.create(payload, { transaction })
                const billingIdNew = createBilling?.dataValues?.billing_id

                // clone billing dokumen
                const d_billing_dokumen = await model.d_billing_dokumen.findAll({ where: { billing_id: itemBilling?.billing_id } })
                const dokumenData = d_billing_dokumen.map(item => item.dataValues);
                for (item of dokumenData) {
                    const dataDok = await model.d_billing_dokumen.findOne({ where: { billing_detail_id: item?.billing_detail_id }, raw: true })

                    const payloadDok = Object.keys(dataDok).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataDok[key];
                        return acc;
                    }, {});

                    delete payloadDok.updated_by, delete payloadDok.updated_at;
                    payloadDok.billing_detail_id = uuidv4()
                    payloadDok.billing_id = billingIdNew
                    payloadDok.created_by = updated_by
                    payloadDok.created_at = dateNow

                    const createBillingDokumen = await model.d_billing_dokumen.create(payloadDok, { transaction })
                }
                // clone billing revenue
                const d_billing_revenue = await model.d_billing_revenue.findAll({ where: { billing_id: itemBilling?.billing_id } })
                const revenueData = d_billing_revenue.map(item => item.dataValues);
                for (item of revenueData) {
                    const dataRev = await model.d_billing_revenue.findOne({ where: { billing_revenue_id: item?.billing_revenue_id }, raw: true })

                    const payloadRev = Object.keys(dataRev).reduce((acc, key) => {
                        acc[key.toLowerCase()] = dataRev[key];
                        return acc;
                    }, {});

                    delete payloadRev.updated_by, delete payloadRev.updated_date;
                    payloadRev.billing_revenue_id = uuidv4()
                    payloadRev.billing_id = billingIdNew
                    payloadRev.created_by = updated_by
                    payloadRev.created_date = dateNow

                    const createRevenue = await model.d_billing_revenue.create(payloadRev, { transaction })
                }
            }
        }
        payload.project_actual_id = project_id
        const postMarkAsActualID = await this.postMarkAsActualIDNew(payload, transaction)
        return {
            project: createProject,
            markAsActualId: postMarkAsActualID
        }
    } else {
        const postMarkAsActualID = await this.postMarkAsActualIDNew(payload, transaction)
        return {
            markAsActualId: postMarkAsActualID
        }
    }
}

exports.postMarkAsActualID = async (payload, transaction) => {
    const result = []
    const { project_actual_id, project_id, updated_by } = payload
    for (const id of project_id) {
        const updatedProject = await model.d_project.update({ project_actual_id: project_actual_id, updated_by: updated_by }, { where: { project_id: id }, transaction })
        result.push(await helpers.processUpdate(updatedProject))
    }

    return result
}

exports.postMarkAsActualIDNew = async (payload, transaction) => {
    const result = []
    const { project_actual_id, project_id, updated_by } = payload
    for (const id of project_id) {
        const updatedProject = await model.d_project.update({ project_actual_id: project_actual_id, kd_status: "006", updated_by: updated_by }, { where: { project_id: id }, transaction })
        result.push(await helpers.processUpdate(updatedProject))
    }

    return result
}

exports.getListProjectVendor = async ({ keyword, page, limit, order = 'DESC', startDate, endDate }) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    const order_by = 'ORDER BY a.CREATED_AT ' + order
    let condition = ''
    if (startDate !== '' && endDate !== '') {
        condition += `AND TRUNC(a.CREATED_AT) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD')`
    }

    const QUERY = query.getListProjectVendor
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const bindListProject = {
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
        page: page,
        limit: limit
    }

    const result = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const COUNT_QUERY = query.countListProjectVendor.replace(/:condition/g, condition)

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            const item = result[i];
            if (item.DETAIL_VENDOR) item.DETAIL_VENDOR = JSON.parse(item.DETAIL_VENDOR)
        }
    }

    const statusData = result.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: result
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }

    return result
}

exports.getDetailProjectVendor = async (project_id) => {
    const result = await db.query(query.getDetailProjectVendor, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    if (result) {
        if (result.VENDOR_PLANNING) result.VENDOR_PLANNING = JSON.parse(result.VENDOR_PLANNING)
        else result.VENDOR_PLANNING = []
        if (result.VENDOR_FINAL) result.VENDOR_FINAL = JSON.parse(result.VENDOR_FINAL)
        else result.VENDOR_FINAL = []
    }

    return result
}

exports.getProjectByType = async (type, keyword, kd_status) => {
    let condition = ''
    let condi2 = `
    AND
    a.PROJECT_ID NOT IN
        (
            SELECT
                e.PROJECT_ID
            FROM N2N.D_PROJECT e
            INNER JOIN N2N.D_PROJECT f ON f.PROJECT_ACTUAL_ID = e.PROJECT_ID AND f.PROJECT_TYPE_ID = '2'
            WHERE e.PROJECT_TYPE_ID = '1'
        )
    `;
    if (kd_status) {
        condition += `AND a.KD_STATUS = '${kd_status}'`;
        condi2 = ''
    }

    const QUERY = query.getProjectByType
        .replace(/:condition/g, condition)
        .replace(/:condi2/g, condi2)

    const result = await db.query(QUERY, {
        replacements: { type, keyword: `%${keyword}%` },
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.markAsAcceleration = async (payload, transaction) => {
    const result = []
    const { project_id, updated_by } = payload
    for (const id of project_id) {
        const updatedProject = await model.d_project.update({ project_type_id: '2', updated_by: updated_by }, { where: { project_id: id }, transaction })
        result.push(await helpers.processUpdate(updatedProject))
    }

    return result
}

exports.insertProjectStatus = async (payload, transaction) => {
    const { id_tab_status, project_id, kd_status, billing_id } = payload
    const result = model.d_project_status.create(payload, { transaction })
    if ((id_tab_status == "FN1" || id_tab_status == "DL1") && billing_id) {
        const updateDBilling = await model.d_billing.update({ kd_status: kd_status }, { where: { billing_id: billing_id }, transaction })
        console.log(updateDBilling, "UPDATE DBILLING <<<<")
    }
    return result
}

exports.updateProjectStatus = async (payload) => {
    const { project_id, kd_status } = payload
    const resStatus = await db.query(query.getStatusProject, {
        replacements: { project_id, kd_status },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    const status_id = resStatus?.STATUS_ID;
    const result = await model.d_project_status.update(payload, { where: { status_id } })
    return result
}

exports.getDetailVendorRealization = async ({ project_vendor_id }) => {
    const result = await db.query(query.getDetailVendorRealization, {
        replacements: { project_vendor_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const remind = await db.query(query.getRemindd, {
        replacements: { project_vendor_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const {
        dataAkselerasi,
        dokumenPendukung,
        dokumenRfi,
        dokumenKontrak,
        dokumenBAMK,
        billingCollectionPlan,
        vendorPlanning
    } = await this.getDetailDokumen(project_vendor_id)

    return {
        ...result,
        DOKUMEN_PENDUKUNG: dokumenPendukung,
        DOKUMEN_KONTRAK: dokumenKontrak,
        DOKUMEN_BAMK: dokumenBAMK,
        DOKUMEN_BILLING: billingCollectionPlan,
        DOKUMEN_VENDOR: vendorPlanning,
        DOKUMEN_RFI: dokumenRfi,
        REMIND: remind
    }


}

exports.insertHAudit = async (payload, transaction) => {
    Object.assign(payload, { created_at: Date.now() })

    const result = await model.h_audit.create(payload, { transaction })
    return await helpers.processUpdate(result)
}

exports.dataRevenueStream = async (payload, transaction) => {
    Object.assign(payload, { billing_revenue_id: uuidv4() })
    // if (payload.tanggal_posting && payload.real_periode_billing) {

    //     const postingDate = new Date(payload.tanggal_posting);
    //     const postingYearMonth =
    //         postingDate.getFullYear() + "-" + String(postingDate.getMonth() + 1).padStart(2, "0");

    //     if (payload.real_periode_billing === postingYearMonth) {
    //         // Jika tahun & bulan sama → jalankan logic di sini
    //         console.log("MATCH tahun & bulan antara real_periode_billing & tanggal_posting");

    //         await db.query(query.updateStatusPYMAD, {
    //             replacements: { billing_id: payload.billing_id },
    //             type: db.QueryTypes.UPDATE,
    //             logging: true
    //         }).then((res) => {
    //             console.log("SUCCESS UPDATE STATUS PYMAD")
    //         }).catch((err) => { console.log(err, "ERROR UPDATE STATUS PYMAD") });
    //     }
    // }
    if (payload.edit_periode && payload.edit_periode === 'T') {
        const real_billing = payload.real_periode_billing.split("-")
        const payloadBilling = {
            billing_id: payload?.billing_id,
            real_periode_billing: real_billing[0],
            real_bulan_billing: real_billing[1],
        }
        await model.d_billing.update(payloadBilling, { where: { billing_id: payloadBilling?.billing_id } })
    }
    if (payload.edit_revenue && payload.edit_revenue === 'T') {
        const real_billing = payload.nominal_pymad
        const payloadBilling = {
            billing_id: payload?.billing_id,
            real_billing: real_billing,
        }
        await model.d_billing.update(payloadBilling, { where: { billing_id: payloadBilling?.billing_id } })
    }
    // if (parseInt(payload?.nominal_realisasi) !== parseInt(payload?.nominal_pymad)) {
    //     Object.assign(payload, { keterangan: `User ${payload?.created_by} Mengubah Nilai PYMAD Tanggal : ${moment(Date.now()).format('DD/MM/YYYY')} dari ${payload?.nominal_realisasi} menjadi ${payload?.nominal_pymad}` })
    //     const payloadBilling = {
    //         billing_id: payload?.billing_id,
    //         real_billing: payload?.nominal_pymad
    //     }
    //     await model.d_billing.update(payloadBilling, { where: { billing_id: payloadBilling?.billing_id } })
    // }

    const cekData = await model.d_billing_revenue.count({ where: { billing_id: payload?.billing_id } })

    const { data_old, ...newObj } = payload;

    const payloadAudit = {
        nip: payload?.created_by,
        table_name: "D_BILLING_REVENUE",
        primary_key: payload?.billing_revenue_id,
        action_type: "INSERT",
        old_data: JSON.stringify(payload?.data_old),
        new_data: JSON.stringify(newObj),
        remarks: "",
        modul: "Insert Revenue",
    }

    await this.insertHAudit(payloadAudit, transaction)

    if (cekData > 0) {
        return {}
    } else {
        const result = await model.d_billing_revenue.create(payload, { transaction })
        return result
    }
}

exports.dataRevenueStreamUpdate = async (payload, transaction) => {
    const { billing_revenue_id } = payload
    Object.assign(payload, { updated_date: Date.now() })
    // if (payload.tanggal_posting && payload.real_periode_billing) {

    //     const postingDate = new Date(payload.tanggal_posting);
    //     const postingYearMonth =
    //         postingDate.getFullYear() + "-" + String(postingDate.getMonth() + 1).padStart(2, "0");

    //     if (payload.real_periode_billing === postingYearMonth) {
    //         // Jika tahun & bulan sama → jalankan logic di sini
    //         console.log("MATCH tahun & bulan antara real_periode_billing & tanggal_posting");

    //         await db.query(query.updateStatusPYMAD, {
    //             replacements: { billing_id: payload.billing_id },
    //             type: db.QueryTypes.UPDATE,
    //             logging: true
    //         });
    //         // payload.status_invoice = "MATCH";
    //     }
    // }
    if (payload.edit_periode && payload.edit_periode === 'T') {
        const real_billing = payload.real_periode_billing.split("-")
        const payloadBilling = {
            billing_id: payload?.billing_id,
            real_periode_billing: real_billing[0],
            real_bulan_billing: real_billing[1],
        }
        await model.d_billing.update(payloadBilling, { where: { billing_id: payloadBilling?.billing_id } })
    }
    if (payload.edit_revenue && payload.edit_revenue === 'T') {
        const real_billing = payload.nominal_pymad
        const payloadBilling = {
            billing_id: payload?.billing_id,
            real_billing: real_billing,
        }
        await model.d_billing.update(payloadBilling, { where: { billing_id: payloadBilling?.billing_id } })
    }
    // if (parseInt(payload?.nominal_realisasi) !== parseInt(payload?.nominal_pymad)) {
    //     Object.assign(payload, { keterangan: `User ${payload?.updated_by} Mengubah Nilai PYMAD Tanggal : ${moment(Date.now()).format('DD/MM/YYYY')} dari ${payload?.nominal_realisasi} menjadi ${payload?.nominal_pymad}` })
    //     const payloadBilling = {
    //         billing_id: payload?.billing_id,
    //         real_billing: payload?.nominal_pymad
    //     }
    //     await model.d_billing.update(payloadBilling, { where: { billing_id: payloadBilling?.billing_id } })
    // }

    const { data_old, ...newObj } = payload;

    const payloadAudit = {
        nip: payload?.updated_by,
        table_name: "D_BILLING_REVENUE",
        primary_key: payload?.billing_revenue_id,
        action_type: "UPDATE",
        old_data: JSON.stringify(payload?.data_old),
        new_data: JSON.stringify(newObj),
        remarks: "",
        modul: "Perubahan Revenue",
    }

    await this.insertHAudit(payloadAudit, transaction)

    const result = await model.d_billing_revenue.update(payload, { where: { billing_revenue_id } })
    return await helpers.processUpdate(result)
}

exports.getBillingRealization = async ({ }) => {
    const result = await db.query(query.getBillingRealization, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getBillingDocument = async ({ billing_id }) => {
    const dataProject = await model.d_billing.findOne({
        where: {
            billing_id: billing_id
        }
    })

    let dokumenKontrak, dokumenBAMK, dokumenPendukung
    for (let i = 1; i <= 3; i++) {
        const project_id = dataProject.dataValues.project_id
        const dataDokumen = await db.query(query.getDokumenProject, {
            replacements: { project_id, tipe_dokumen: '0' + i },
            type: db.QueryTypes.SELECT
        })

        if (i == 1) dokumenPendukung = dataDokumen
        if (i == 2) dokumenBAMK = dataDokumen
        if (i == 3) dokumenKontrak = dataDokumen
    }

    const result = await db.query(query.getDetailBilling, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const result1 = await db.query(query.getBillingDocument, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const result2 = await db.query(query.getBillingDocumentKeuangan, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const result3 = await db.query(query.getBillingDocumentPenagihan, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const result4 = await db.query(query.getBillingDocumentPenagihanTambahan, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const result5 = await db.query(query.getBillingDocumentStamp, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const result6 = await db.query(query.getBillingChild, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        DOKUMEN_BILLING: result1,
        DOKUMEN_KEUANGAN: result2,
        DOKUMEN_PENAGIHAN: result3,
        DOKUMEN_PENAGIHAN_TAMBAHAN: result4,
        DOKUMEN_PENDUKUNG: dokumenPendukung,
        DOKUMEN_BAMK: dokumenBAMK,
        DOKUMEN_KONTRAK: dokumenKontrak,
        DOKUMEN_STAMP: result5,
        DETAIL_CHILD: result6
    }
}

exports.getListBillingRevenue = async ({ keyword, page, limit, billing_id, order = 'DESC', startDate, endDate, month, kd_status }, body) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    let condition = '', select = '', searchHeader = '', order_by = `ORDER BY E.LATEST_DATE_STATUS ${order}`;
    if (startDate !== '' && endDate !== '') {
        condition += `AND TRUNC(E.LATEST_DATE_STATUS) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD') `
        if (keyword) {
            condition += ` AND (upper(B.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(B.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') 
                        OR upper(A.TERMIN) like upper('%${keyword}%') 
                        OR upper(A.KD_STATUS) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%')
                        OR upper(A.BILLING_CODE) like upper('%${keyword}%') 
                        OR upper(F.NO_FAKTUR) like upper('%${keyword}%') 
                        OR upper(F.NO_INVOICE) like upper('%${keyword}%') 
                        OR upper(A.DESC_TERMIN) like upper('%${keyword}%')
                        OR upper(A.KETERANGAN) like upper('%${keyword}%')
                        OR upper(B.CONTRACT_NO) like upper('%${keyword}%')
                        OR EXISTS (
                            SELECT 1
                            FROM D_BILLING X
                            WHERE X.PARENT_id = A.BILLING_ID   -- relasi parent
                            AND X.FLAG_PARENT = 0
                            AND (
                                UPPER(X.BILLING_CODE) LIKE UPPER('%${keyword}%')
                            )
                        )) `
        }
    } else {
        if (keyword) {
            condition += `AND (upper(B.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(B.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') 
                        OR upper(A.TERMIN) like upper('%${keyword}%') 
                        OR upper(A.DESC_TERMIN) like upper('%${keyword}%') 
                        OR upper(A.KETERANGAN) like upper('%${keyword}%') 
                        OR upper(A.BILLING_CODE) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%')
                        OR upper(A.BILLING_CODE) like upper('%${keyword}%') 
                        OR upper(F.NO_FAKTUR) like upper('%${keyword}%') 
                        OR upper(F.NO_INVOICE) like upper('%${keyword}%') 
                        OR upper(A.DESC_TERMIN) like upper('%${keyword}%')
                        OR upper(A.KETERANGAN) like upper('%${keyword}%')
                        OR upper(B.CONTRACT_NO) like upper('%${keyword}%') 
                        OR EXISTS (
                            SELECT 1
                            FROM D_BILLING X
                            WHERE X.PARENT_id = A.BILLING_ID   -- relasi parent
                            AND X.FLAG_PARENT = 0
                            AND (
                                UPPER(X.BILLING_CODE) LIKE UPPER('%${keyword}%')
                            )
                        )) `
        }
    }

    if (month) {
        const periode = month.split("-")
        let bulan_sblm = '', tahun_sblm = '';
        if ((parseInt(periode[1]) - 1) > 1 && (parseInt(periode[1]) - 1) < 10) {
            bulan_sblm = '0' + (parseInt(periode[1]) - 1);
            tahun_sblm = periode[0]
        } else if (periode[1] == '01') {
            bulan_sblm = '12'
            tahun_sblm = (parseInt(periode[0]) - 1)
        } else {
            bulan_sblm = periode[1]
            tahun_sblm = periode[0]
        }
        condition = `AND A.EST_BULAN_BILLING = '${periode[1]}' AND A.EST_PERIODE_BILLING = '${periode[0]}'`
        select = `, A.EST_BILLING, A.EST_BULAN_BILLING, A.EST_PERIODE_BILLING, A.REAL_BILLING, A.REAL_BULAN_BILLING, A.REAL_PERIODE_BILLING, (SELECT SUM(EST_BILLING) FROM N2N.D_BILLING WHERE EST_BULAN_BILLING = '${periode[1]}' AND EST_PERIODE_BILLING = '${periode[0]}' AND KD_STATUS IN ('301', '300', '400', '401', '402')) AS TOTAL_EST_BULAN_SAAT_INI, (SELECT SUM(EST_BILLING) FROM N2N.D_BILLING WHERE EST_BULAN_BILLING = '${bulan_sblm}' AND EST_PERIODE_BILLING = '${tahun_sblm}' AND KD_STATUS IN ('301', '300', '400', '401', '402')) AS TOTAL_EST_BULAN_SBLM, (SELECT SUM(REAL_BILLING) FROM N2N.D_BILLING WHERE EST_BULAN_BILLING = '${periode[1]}' AND EST_PERIODE_BILLING = '${periode[0]}' AND KD_STATUS IN ('301', '300', '400', '401', '402')) AS TOTAL_REAL_BULAN_SAAT_INI `
    }

    if (!["", null, undefined].includes(kd_status)) {
        condition += `AND A.KD_STATUS = '${kd_status}'`
        if (kd_status === '402') {
            order_by = `ORDER BY CASE WHEN (SELECT FLAG_NEW_DOK FROM D_PROJECT_STATUS WHERE PROJECT_ID = A.BILLING_ID ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) = '1' THEN 2 ELSE 1 END ${order}, E.LATEST_DATE_STATUS ${order}`
        }
    }

    if (billing_id) {
        condition += `AND A.BILLING_ID = '${billing_id}'`
    }

    if (body && Object.keys(body).length > 0) {
        const countBody = Object.keys(body).length
        Object.keys(body).map((key, index) => {
            if (key === 'sla_kelengkapan_dokumen') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_KD_END IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_KD_END END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_KD_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else if (key === 'sla_penerbitan_invoice') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_INVOICE_START IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_INVOICE_START END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_SUBMIT_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else if (key === 'sla_pelunasan') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_PAID IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_PAID END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_INVOICE_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else {
                searchHeader += `AND UPPER(${key}) like UPPER('%${body[key]}%') `;
            }
        });
    }

    const QUERY = query.getListBillingRevenue
        .replace(/:order_by/g, order_by)
        .replace(/:condition/g, condition)
        .replace(/:select/g, select)
        .replace(/:searchHeader/g, searchHeader)

    const result = await db.query(QUERY, {
        replacements: {
            page: page,
            limit: limit
        },
        // logging:console.log,
        type: db.QueryTypes.SELECT,
    })

    const listBillingFix = result.map(item => {
        if (item.DETAIL_CHILD) item.DETAIL_CHILD = JSON.parse(item.DETAIL_CHILD)
        else item.DETAIL_CHILD = []

        if (item.DETAIL_PROJECT) item.DETAIL_PROJECT = JSON.parse(item.DETAIL_PROJECT)
        else item.DETAIL_PROJECT = []

        return item
    })

    // const QUERY1 = query.getListBillingRevenue1.replace(/:order/g, order).replace(/:condition/g, condition)

    // const result1 = await db.query(QUERY1, {
    //     replacements: {
    //         page: page,
    //         limit: limit
    //     },
    //     type: db.QueryTypes.SELECT
    // })
    // const QUERY2 = query.getListBillingRevenue2.replace(/:order/g, order).replace(/:condition/g, condition)
    // const result2 = await db.query(QUERY2, {
    //     replacements: {
    //         page: page,
    //         limit: limit
    //     },
    //     type: db.QueryTypes.SELECT
    // })

    const QUERY_COUNT = query.countListBillingRevenue.replace(/:condition/g, condition)
    const resultCount = await db.query(QUERY_COUNT, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    // let result = order === 'DESC' ? result1 : result2

    const statusData = listBillingFix.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: listBillingFix
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListBillingNonProject = async ({ keyword, page, limit, billing_id, order = 'DESC', startDate, endDate, month, kd_status }, body) => {
    if (startDate === undefined) startDate = ''
    if (endDate === undefined) endDate = ''
    let condition = '', select = '', searchHeader = '', order_by = `ORDER BY E.LATEST_DATE_STATUS ${order}`;
    if (startDate !== '' && endDate !== '') {
        condition += `AND TRUNC(E.LATEST_DATE_STATUS) BETWEEN TO_DATE('${startDate}', 'YYYY-MM-DD') AND TO_DATE('${endDate}', 'YYYY-MM-DD') `
        if (keyword) {
            condition += ` AND (upper(A.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') 
                        OR upper(A.TERMIN) like upper('%${keyword}%') 
                        OR upper(A.KD_STATUS) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%')
                        OR upper(A.BILLING_CODE) like upper('%${keyword}%') 
                        OR upper(F.NO_INVOICE) like upper('%${keyword}%')) `
        }
    } else {
        if (keyword) {
            condition += `AND (pper(A.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') 
                        OR upper(A.TERMIN) like upper('%${keyword}%') 
                        OR upper(A.DESC_TERMIN) like upper('%${keyword}%') 
                        OR upper(A.KETERANGAN) like upper('%${keyword}%') 
                        OR upper(A.BILLING_CODE) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%')) `
        }
    }

    if (month) {
        const periode = month.split("-")
        let bulan_sblm = '', tahun_sblm = '';
        if ((parseInt(periode[1]) - 1) > 1 && (parseInt(periode[1]) - 1) < 10) {
            bulan_sblm = '0' + (parseInt(periode[1]) - 1);
            tahun_sblm = periode[0]
        } else if (periode[1] == '01') {
            bulan_sblm = '12'
            tahun_sblm = (parseInt(periode[0]) - 1)
        } else {
            bulan_sblm = periode[1]
            tahun_sblm = periode[0]
        }
        condition = `AND A.EST_BULAN_BILLING = '${periode[1]}' AND A.EST_PERIODE_BILLING = '${periode[0]}'`
        select = `, A.EST_BILLING, A.EST_BULAN_BILLING, A.EST_PERIODE_BILLING, A.REAL_BILLING, A.REAL_BULAN_BILLING, A.REAL_PERIODE_BILLING, (SELECT SUM(EST_BILLING) FROM N2N.D_BILLING_NONPROJECT WHERE EST_BULAN_BILLING = '${periode[1]}' AND EST_PERIODE_BILLING = '${periode[0]}' AND KD_STATUS IN ('301', '300', '400', '401', '402')) AS TOTAL_EST_BULAN_SAAT_INI, (SELECT SUM(EST_BILLING) FROM N2N.D_BILLING_NONPROJECT WHERE EST_BULAN_BILLING = '${bulan_sblm}' AND EST_PERIODE_BILLING = '${tahun_sblm}' AND KD_STATUS IN ('301', '300', '400', '401', '402')) AS TOTAL_EST_BULAN_SBLM, (SELECT SUM(REAL_BILLING) FROM N2N.D_BILLING_NONPROJECT WHERE EST_BULAN_BILLING = '${periode[1]}' AND EST_PERIODE_BILLING = '${periode[0]}' AND KD_STATUS IN ('301', '300', '400', '401', '402')) AS TOTAL_REAL_BULAN_SAAT_INI `
    }

    if (kd_status) {
        condition += `AND A.KD_STATUS = '${kd_status}'`
        if (kd_status === '402') {
            order_by = `ORDER BY CASE WHEN (SELECT FLAG_NEW_DOK FROM D_PROJECT_STATUS WHERE PROJECT_ID = A.BILLING_ID ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) = 'T' THEN 2 ELSE 1 END ${order}, E.LATEST_DATE_STATUS ${order}`
        }
    }

    if (billing_id) {
        condition += `AND A.BILLING_ID = '${billing_id}'`
    }

    if (body && Object.keys(body).length > 0) {
        const countBody = Object.keys(body).length
        Object.keys(body).map((key, index) => {
            if (key === 'sla_kelengkapan_dokumen') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_KD_END IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_KD_END END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_KD_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else if (key === 'sla_penerbitan_invoice') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_INVOICE_START IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_INVOICE_START END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_SUBMIT_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else if (key === 'sla_pelunasan') {
                searchHeader += `AND (TO_DATE(CASE WHEN E.SLA_PAID IS NULL THEN TO_CHAR(SYSDATE, 'YYYY-MM-DD') ELSE E.SLA_PAID END, 'YYYY-MM-DD') 
 - TO_DATE(E.SLA_INVOICE_START, 'YYYY-MM-DD')) ${body[key]} `;
            } else {
                searchHeader += `AND UPPER(${key}) like UPPER('%${body[key]}%') `;
            }
        });
    }

    const QUERY = query.getListBillingNonProject
        .replace(/:order_by/g, order_by)
        .replace(/:condition/g, condition)
        .replace(/:select/g, select)
        .replace(/:searchHeader/g, searchHeader)

    const result = await db.query(QUERY, {
        replacements: {
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const listBillingFix = result.map(item => {
        if (item.DETAIL_CHILD) item.DETAIL_CHILD = JSON.parse(item.DETAIL_CHILD)
        else item.DETAIL_CHILD = []
        return item
    })

    // const QUERY1 = query.getListBillingRevenue1.replace(/:order/g, order).replace(/:condition/g, condition)

    // const result1 = await db.query(QUERY1, {
    //     replacements: {
    //         page: page,
    //         limit: limit
    //     },
    //     type: db.QueryTypes.SELECT
    // })
    // const QUERY2 = query.getListBillingRevenue2.replace(/:order/g, order).replace(/:condition/g, condition)
    // const result2 = await db.query(QUERY2, {
    //     replacements: {
    //         page: page,
    //         limit: limit
    //     },
    //     type: db.QueryTypes.SELECT
    // })

    const QUERY_COUNT = query.countListBillingNonProject.replace(/:condition/g, condition)
    const resultCount = await db.query(QUERY_COUNT, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    // let result = order === 'DESC' ? result1 : result2

    const statusData = listBillingFix.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: listBillingFix
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListBillingMonitoring = async ({ keyword, page, limit, order = 'DESC', periode, kd_status }, body) => {
    let formattedPeriode = '';
    // kd_status == '402' ? kd_status = `'402'` : kd_status = `'402', '400', '401'`
    // kd_status == '402' ? kd_status = `'402', '400', '401'` : kd_status = `'402', '400', '401'`

    if (periode) {
        // console.log("MASUKK ")
        const [year, month] = periode.split('-');
        formattedPeriode = `${year}-${month}`;
    }
    console.log("PERIODE2 :", formattedPeriode)
    const QUERY = kd_status === '402' ? query.getListBillingMonitoring : query.getListBillingMonitoringPiutangNew
    // const QUERY = query.getListBillingMonitoring
    // .replace(/:order/g, order)
    // .replace(/:month/g, formattedPeriode)
    // .replace(/:kd_status/g, kd_status)

    const result = await db.query(QUERY, {
        replacements: {
            month: formattedPeriode,
            kd_status: kd_status,
        },
        // logging: console.log,
        type: db.QueryTypes.SELECT
    })

    const realisasi_pembayaran = await db.query(query.getSummaryMonitoring, {
        replacements: {
            month: formattedPeriode,
            kd_status: kd_status,
        },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    // const QUERY_COUNT = query.countListBillingMonitoring.replace(/:condition/g, condition)
    // const resultCount = await db.query(QUERY_COUNT, {
    //     replacements: { page, limit },
    //     type: db.QueryTypes.SELECT,
    //     plain: true
    // })

    // let result = order === 'DESC' ? result1 : result2

    const statusData = result.length > 0 ? true : false
    // console.log("MAIN.lenght :", statusData)
    // console.log("MAIN.data :", result)
    // return statusData ?
    //     {
    //         total_data: resultCount.total_data,
    //         total_halaman: resultCount.total_halaman,
    //         limit: resultCount.limit,
    //         list_data: result
    //     } : {
    //         total_data: 0,
    //         total_halaman: null,
    //         limit: null,
    //         list_data: []
    //     }
    return statusData ?
        {
            data: result,
            realisasi_pembayaran: realisasi_pembayaran?.JUMLAH_TAGIHAN || 0
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListDetailBillingMonitoring = async ({ keyword, page, limit, order = 'DESC', periode, kd_status, customer_name }, body) => {
    // kd_status == '402' ? kd_status = `'402'` : kd_status = `'402', '400', '401'`
    let formattedPeriode = '';
    let yyyy = null;
    let mm = null;
    let result = null;

    // kd_status == '402' ? kd_status = `'402', '400', '401'` : kd_status = `'402', '400', '401'`
    customer_name
        ? customer_name = `AND c.CUSTOMER_NAME = '${customer_name}'`
        : customer_name = 'AND 1=1'

    if (periode) {
        const [year, month] = periode.split('-');
        formattedPeriode = `${month}-${year}`;
        mm = month;
        yyyy = year;
    }

    // console.log("STATUS  :", kd_status)
    // console.log("PERIODE :", formattedPeriode)
    // console.log("customer_name :", customer_name)

    if (kd_status == 'dendaPajak') {
        const QUERY = query.getListBillingFakturPajak;

        result = await db.query(QUERY, {
            replacements: {
                year: yyyy,
                month: mm
            },
            type: db.QueryTypes.SELECT
        });
    } else {
        const rawQuery = kd_status === '402' ? query.getListDetailBillingMonitoring : query.getListDetailBillingMonitoringPiutangNew;
        const QUERY = rawQuery.replace(/:customer_name/g, customer_name)
        // .replace(/:order/g, order)
        // .replace(/:month/g, formattedPeriode)
        // .replace(/:month/g, periode)
        // .replace(/:kd_status/g, kd_status)
        // .replace(/:customer_name/g, customer_name)
        // .replace(/\/\*customer_name\*\//g, customer_name)
        const replacements = {
            month: formattedPeriode,
            kd_status: kd_status,
        };
        result = await db.query(QUERY, {
            replacements,
            // logging: console.log,
            type: db.QueryTypes.SELECT
        })
    }

    // const QUERY_COUNT = query.countListBillingMonitoring.replace(/:condition/g, condition)
    // const resultCount = await db.query(QUERY_COUNT, {
    //     replacements: { page, limit },
    //     type: db.QueryTypes.SELECT,
    //     plain: true
    // })

    // let result = order === 'DESC' ? result1 : result2

    const statusData = result.length > 0 ? true : false
    // console.log("MAINDETAIL.lenght :", statusData)
    // console.log("MAINDETAIL.data :", result)
    // return statusData ?
    //     {
    //         total_data: resultCount.total_data,
    //         total_halaman: resultCount.total_halaman,
    //         limit: resultCount.limit,
    //         list_data: result
    //     } : {
    //         total_data: 0,
    //         total_halaman: null,
    //         limit: null,
    //         list_data: []
    //     }
    return statusData ?
        {
            data: result,
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}
exports.getListDetailPerCustomer = async ({ keyword, page, limit, order = 'DESC', customer_name, periode, kd_status }, body) => {
    let searchHeader = ''
    const QUERY = query.getListDetailBillingMonitoring
        // .replace(/:order/g, order)
        // .replace(/:periode/g, periode)
        .replace(/:month/g, formattedPeriode)
        // .replace(/:month/g, periode)
        // .replace(/:kd_status/g, kd_status)
        .replace(/:customer_name/g, customer_name)

    const result = await db.query(QUERY, {
        // replacements: {
        //     page: page,
        //     limit: limit
        // },
        // logging: console.log,
        type: db.QueryTypes.SELECT
    })


    // const QUERY_COUNT = query.countListBillingMonitoring.replace(/:condition/g, condition)
    // const resultCount = await db.query(QUERY_COUNT, {
    //     replacements: { page, limit },
    //     type: db.QueryTypes.SELECT,
    //     plain: true
    // })

    // let result = order === 'DESC' ? result1 : result2

    const statusData = result.length > 0 ? true : false
    // console.log("MAINDETAIL.lenght :", statusData)
    // console.log("MAINDETAIL.data :", result)
    // return statusData ?
    //     {
    //         total_data: resultCount.total_data,
    //         total_halaman: resultCount.total_halaman,
    //         limit: resultCount.limit,
    //         list_data: result
    //     } : {
    //         total_data: 0,
    //         total_halaman: null,
    //         limit: null,
    //         list_data: []
    //     }
    return statusData ?
        {
            data: result,
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListNoFaktur = async ({ keyword, page, limit, order = 'DESC', status, divisi, periode, statusDokumen, wajibFaktur, billing_id, stBilling }, body) => {
    let conditionPeriode = ''
    let mm = ''
    let yyyy = ''
    let kdStatusJurnal = ''
    let formattedPeriode = '';
    let billingCondition = '';
    // status = status == "1" ? "AND F.NO_FAKTUR IS NOT NULL AND F.NO_FAKTUR <> '-'"
    //     : status === "0"
    //         ? "AND (F.NO_FAKTUR IS NULL OR F.NO_FAKTUR = '-')"
    //         : "";
    status = status == "1" ? "AND B.NO_FAKTUR IS NOT NULL AND B.NO_FAKTUR <> '-'"
        : status === "0"
            ? "AND (B.NO_FAKTUR IS NULL OR B.NO_FAKTUR = '-')"
            : "";

    if (billing_id) {
        billingCondition += ` AND A.BILLING_ID = '${billing_id}' `
    }

    // divisi = !divisi ? `` : `AND B.KD_SPUC LIKE '%${divisi}%'`
    divisi = !divisi ? `` : `AND C.KD_SPUC LIKE '%${divisi}%'`
    if (periode && !keyword) {
        const [month, year] = periode.split('-');
        //    await formattedPeriode = `${year}-${month}`;
        conditionPeriode = `AND TO_DATE('01-' || LPAD(NVL(A.REAL_BULAN_BILLING, '01'), 2, '0') || '-' || NVL(A.REAL_PERIODE_BILLING, '1900'), 'DD-MM-YYYY' ) = TO_DATE('01-'||'${month}-${year}', 'DD-MM-YYYY')`
        mm = month
        yyyy = year
    }
    // console.log("MM",mm)
    // console.log("YYYY",yyyy)

    // let dokumen = statusDokumen == "1" ? "AND H.URL_DOKUMEN IS NOT NULL"
    //     : statusDokumen === "0"
    //         ? "AND H.URL_DOKUMEN IS NULL"
    //         : "";
    let dokumen = statusDokumen == "1" ? "AND (DOK.URL_FAKTUR_PGNT IS NOT NULL OR DOK.URL_FAKTUR_AWAL IS NOT NULL)"
        : statusDokumen === "0"
            ? "AND (DOK.URL_FAKTUR_PGNT IS NULL OR DOK.URL_FAKTUR_AWAL IS NULL)"
            : "";

    // let wajib_faktur = (wajibFaktur && wajibFaktur !== '') ? ` AND F.FLAG_FAKTUR = '${wajibFaktur}' ` : '';
    let wajib_faktur = (wajibFaktur && wajibFaktur !== '') ? ` AND B.FLAG_FAKTUR = '${wajibFaktur}' ` : '';

    keyword = !keyword ? `` : `AND A.BILLING_CODE like '%${keyword}%'`
    console.log("CEK ST", stBilling)
    if (!mm && !yyyy) {
        mm = '10'
        yyyy = '2000'
    }
    if (stBilling) {
        kdStatusJurnal = `AND A.KD_STATUS IN ('402', '403')`

    }
    // console.log("KEYWORD :", keyword)
    console.log("PERIODE2 :", conditionPeriode)
    // console.log("LIMITTTTT :", limits)
    // const condition = kd_status === '402' ? `AND F.NO_FAKTUR IS NULL` : `AND F.NO_FAKTUR IS NOT NULL`
    const QUERY = query.getListNoFaktur
        // .replace(/:condition/g, condition)
        .replace(/:billingCondition/g, billingCondition)
        .replace(/:month/g, conditionPeriode)
        .replace(/:divisi/g, divisi)
        .replace(/:status/g, status)
        .replace(/:wajib_faktur/g, wajib_faktur)
        .replace(/:keyword/g, keyword)
        .replace(/:dokumen/g, dokumen)
        // .replace(/:mm/g, mm)
        // .replace(/:yyyy/g, yyyy)
        .replace(/:limit/g, limit)
        .replace(/:page/g, page)
        .replace(/:kdStatusJurnal/g, kdStatusJurnal)


    const result = await db.query(QUERY, {
        replacements: {
            page: page,
            limit: limit
        },
        // logging: console.log,
        type: db.QueryTypes.SELECT
    })


    const statusData = result.length > 0 ? true : false

    // return statusData ?
    //     {
    //         data: result,
    //     } : {
    //         total_data: 0,
    //         total_halaman: null,
    //         limit: null,
    //         list_data: []
    //     }
    const QUERY_COUNT = query.countListNoFaktur
        // replace(/:condition/g, condition)
        .replace(/:billingCondition/g, billingCondition)
        .replace(/:month/g, conditionPeriode)
        .replace(/:divisi/g, divisi)
        .replace(/:status/g, status)
        .replace(/:wajib_faktur/g, wajib_faktur)
        .replace(/:keyword/g, keyword)
        .replace(/:dokumen/g, dokumen)
    const resultCount = await db.query(QUERY_COUNT, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })
    console.log("COUNT :", resultCount)
    return statusData ?
        {
            total_data: resultCount.total_data,
            // total_data: result.length,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            data: []
        }
}

exports.getDetailBillingRevenue = async ({ billing_id }) => {
    const result = await db.query(query.getDetailBillingRevenue, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: true
    })

    if (result) {
        if (result.DETAIL_CHILD) result.DETAIL_CHILD = JSON.parse(result.DETAIL_CHILD)
        else result.DETAIL_CHILD = []

        if (result?.JSON_DOK) result.JSON_DOK = JSON.parse(result?.JSON_DOK)
    }

    const {
        billingCollectionPlan
    } = await this.getDetailDokumen(result.PROJECT_ID)

    const project_id = result?.PROJECT_ID
    const result3 = await db.query(query.getRMasterData, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    const result4 = await db.query(query.getRTransaction, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT
    })

    const result5 = await db.query(query.getDetailTransaction, {
        replacements: { billing_id },
        type: db.QueryTypes.SELECT,
        // plain: true
    })

    let header = {}, details = [], chars = [];
    if (result5) {
        header = result5?.filter(item => item.FLAG_DELETE === 'F')[0]
        result5.forEach((item) => {
            const { JSON_DOK, ...rest } = item
            // header = rest
            const dataDok = JSON_DOK !== '' ? JSON.parse(JSON_DOK) : ""

            if (dataDok !== "" && Array.isArray(dataDok?.payload?.details)) {
                const dataDokDetails = dataDok?.payload?.details.map((data, i) => {
                    details.push({
                        ...data,
                        flag_delete: item?.FLAG_DELETE,
                        // CONTRACT_DATE: dataDok?.CHARS[i]?.CONTRACT_START,
                        // CONTRACT_VALIDITY: dataDok?.CHARS[i]?.CONTRACT_END
                    })
                });
                // details.push(dataDokDetails)
            }
        })
    }

    return {
        ...result,
        // AKSELERASI: dataAkselerasi,
        // DOKUMEN_PENDUKUNG: dokumenPendukung,
        // DOKUMEN_KONTRAK: dokumenKontrak,
        // DOKUMEN_BAMK: dokumenBAMK,
        DOKUMEN_BILLING: billingCollectionPlan,
        // DOKUMEN_VENDOR: vendorPlanning,
        DOKUMEN_MASTER_DATA: result3,
        DOKUMEN_TRANSACTION: result4,
        TRANSACTION_HEADER: header,
        TRANSACTION_DETAILS: details,
    }
}

exports.getReportBillingRevenue = async ({ month, status }) => {
    let QUERY = '';
    if (status === '402') {
        QUERY = query.getListReportPYMAD
    } else if (status === '400') {
        QUERY = query.getListReportPiutang
    } else if (status === 'revenue') {
        QUERY = query.getListReportRevenue
    } else if (status === 'transaksi') {
        QUERY = query.getListReportTransaksi
    } else {
        QUERY = query.getListReportSLAInvoice
    }

    if (status === 'transaksi') {
        // const explode = month.split('-')
        // const p_periode = status === 'transaksi' ? explode[1] + '' + explode[0] : month
        // const invoice = await db.query(query.getListReportRevenue, {
        //     replacements: status === 'transaksi' ? { p_periode, status } : { month, status },
        //     type: db.QueryTypes.SELECT,
        // })
        const list_data = await db.query(QUERY, {
            replacements: { month, status },
            type: db.QueryTypes.SELECT,
        })
        // const accrue = await db.query(query.getListReportAccrue, {
        const accrue = await db.query(query.getListReportPYMADMutasiTambah, {
            replacements: { month, status },
            type: db.QueryTypes.SELECT,
        })
        const reverse = await db.query(query.getListReportReverse, {
            replacements: { month, status },
            type: db.QueryTypes.SELECT,
        })
        const adjustment = await db.query(query.getListReportAdjustment, {
            replacements: { month, status },
            type: db.QueryTypes.SELECT,
        })
        const summary = await db.query(query.getListReportSummary, {
            replacements: { month, status },
            type: db.QueryTypes.SELECT,
            plain: true
        })
        return {
            list_data: list_data || [],
            invoice: list_data || [],
            accrue: accrue || [],
            reverse: reverse || [],
            adjustment: adjustment || [],
            summary: summary || {},
        }
    } else {
        let mtdResult = [];
        if (status === 'revenue') {
            const [bulan, tahun] = month ? month.split('-') : [null, null];

            // Konversi bulan dari '01', '02', ... '12' menjadi '1', '2', ... '12'
            const bulanTanpaLeadingZero = bulan ? bulan.replace(/^0+/, '') : null;

            // Gunakan query asli tanpa perubahan
            const QUERY = query.getListSummaryLop;

            // Eksekusi untuk MTD (Month-To-Date)
            mtdResult = await db.query(QUERY, {
                replacements: {
                    TAHUN_EST: tahun || null,
                    BULAN_EST: bulanTanpaLeadingZero || null,
                    MODE: 'M'
                },
                type: db.QueryTypes.SELECT
            });
        }
        const explode = month.split('-')
        const p_periode = (status === 'revenue' || status === '400') ? explode[1] + '' + explode[0] : month
        const list_data = await db.query(QUERY, {
            replacements: (status === 'revenue' || status === '400') ? { p_periode, status } : { month, status },
            type: db.QueryTypes.SELECT,
        })
        //untuk pymad
        let QUERY_T = '', QUERY_K = '';;
        if (status === '402') {
            QUERY_T = query.getListReportPYMADMutasiTambah
            QUERY_K = query.getListReportPYMADMutasiKurang
        }
        if (status === '400') {
            QUERY_T = query.getListReportPiutangMutasiTambah
            QUERY_K = query.getListReportPiutangMutasiKurang
        }

        let mutasi_tambah = [], mutasi_kurang = []
        if (status === '402' || status === '400') {
            mutasi_tambah = await db.query(QUERY_T, {
                replacements: status === '400' ? { p_periode, status } : { month, status },
                type: db.QueryTypes.SELECT
            })
            mutasi_kurang = await db.query(QUERY_K, {
                replacements: status === '400' ? { p_periode, status } : { month, status },
                type: db.QueryTypes.SELECT
            })
        }

        const total = await db.query(query.getTotalReportBillingRevenue, {
            replacements: { month },
            type: db.QueryTypes.SELECT
        })

        // Mengubah array menjadi object (mengambil elemen pertama)
        const detail_total = total.length > 0 ? total[0] : {};

        return {
            ...(status === '402' || status === '400') ? { mutasi_tambah: mutasi_tambah } : {},
            ...(status === '402' || status === '400') ? { mutasi_kurang: mutasi_kurang } : {},
            ...(status === 'revenue') ? { planning_revenue: mtdResult } : {},
            list_data,
            detail_total
        }
    }
}

exports.getDetailCustomer = async ({ customer_id }) => {
    const result = await db.query(query.getDetailCustomer, {
        replacements: { customer_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const contact = await db.query(query.getDetailContactCustomer, {
        replacements: { customer_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        CONTACT_CUSTOMER: contact,
    }
}

exports.getDetailVendorPt = async ({ vendor_id }) => {
    const result = await db.query(query.getDetailVendorPt, {
        replacements: { vendor_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const contact = await db.query(query.getDetailContactVendorPt, {
        replacements: { vendor_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        CONTACT_VENDOR_PT: contact,
    }
}

exports.getDetailPortofolio = async ({ portofolio_id }) => {
    const result = await db.query(query.getDetailPortofolio, {
        replacements: { portofolio_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getListСustomer = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListCustomer.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListCustomer, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListKaryawan = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListKaryawan.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListKaryawan, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListPortofolio = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListPortofolio.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListPortofolio, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getListReferensi = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListReferensi.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListReferensi, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getDetailReferensi = async ({ kd_ref = '', ur_ref = '', jns_ref = '', status = '' }) => {
    const result = await db.query(query.getDetailReferensi, {
        replacements: { kd_ref, ur_ref, jns_ref, status },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return {
        ...result
    }
}

exports.getRemind = async () => {
    const result = await db.query(query.getRemind, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.updateRemind = async (payload) => {
    const { remind_id } = payload
    const result = await model.d_remind.update(payload, { where: { remind_id } })
    return await helpers.processUpdate(result)
}

exports.getListBillingProject = async ({ status = null, keyword, page, limit, order = 'DESC', project_id }) => {
    const order_by = 'ORDER BY z.CREATED_AT ' + order
    let condition = '';
    if (keyword !== '') {
        if (monthYear !== '') {
            condition += ` AND
                            (OR upper(z.TERMIN) like upper('%${keyword}%')
                            OR upper(z.DESC_TERMIN) like upper('%${keyword}%')) `
        } else {
            condition += ` WHERE
                            (OR upper(z.TERMIN) like upper('%${keyword}%')
                            OR upper(z.DESC_TERMIN) like upper('%${keyword}%')) `

        }
    }

    const QUERY = query.getListBillingProject
        .replace(/:project_id/g, project_id)
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListBillingProject
        .replace(/:project_id/g, project_id)
        .replace(/:condition/g, condition)

    const bindListProject = {
        page: page,
        limit: limit,
    }
    const listProject = await db.query(QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListProject,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listProject.length > 0 ? true : false

    // if (statusData) { // Get TOTAL COST every project
    //     for (const [index, project] of listProject.entries()) {
    //         const dataPersonil = await this.getCostPersonilPlanning(project.PROJECT_ID)
    //         Object.assign(listProject[index], { "TOTAL_COST": dataPersonil.TOTAL_COST })
    //     };
    // }

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listProject
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getProjectLog = async (project_id, key = keyword ? keyword : '') => {

    const QUERY = query.getLogProject
        .replace(/:project_id/g, project_id)
        .replace(/:keyword/g, key)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // plain: true
    })

    return result
}

exports.getGeneralInfo = async (project_id, keyword = '') => {
    const percentageGeneral = await db.query(query.getPercentage, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    const cost = {}
    // const cost = await db.query(query.getCost, {
    //     replacements: { project_id },
    //     type: db.QueryTypes.SELECT,
    // })
    const nominal = {}
    // const nominal = await db.query(query.getPeople, {
    //     replacements: { project_id },
    //     type: db.QueryTypes.SELECT
    // })
    const QUERY_PL = query.getLogProject
        .replace(/:project_id/g, project_id)
        .replace(/:keyword/g, keyword)
    const project_log = await db.query(QUERY_PL, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    return {
        percentageGeneral,
        cost,
        nominal,
        project_log
    }
}

exports.getTopOverview = async (project_id) => {
    const percentageTop = await db.query(query.getPercentageTop, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    const list_top = await db.query(query.getListTop, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return {
        percentageTop,
        list_top
    }
}

exports.getVendorOverview = async (project_id) => {
    const percentageVendor = await db.query(query.getPercentageVendor, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    const list_vendor = await db.query(query.getListVendor, {
        replacements: { project_id },
        type: db.QueryTypes.SELECT
    })

    return {
        percentageVendor,
        list_vendor
    }
}

exports.getListUserActivity = async ({ keyword, page, limit, order = 'DESC' }) => {
    const order_by = 'ORDER BY a.TANGGAL ' + order
    let where = '';

    const QUERY = query.getListUserActivity
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListUserActivity

    const bindList = {
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
        page: page,
        limit: limit
    }
    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListApproval = async ({ keyword }) => {
    const QUERY = query.getListApproval

    const bindList = {
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`
    }
    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT
    })

    return listData;
}

exports.getListLokasi = async ({ keyword }) => {
    const result = await model.m_lokasi.findAll({
        order: [
            ['REGIONAL', 'ASC'], // Kolom pertama (dalam urutan ascending)
            ['KOTA', 'ASC'], // Kolom kedua (dalam urutan descending)
        ],
    })
    return result;
}

exports.flagNotificationCategory = async (id) => {
    const result = await model.m_referensi.findOne({
        where: {
            JNS_REF: 'notification_category',
            KD_REF: id
        }
    })
    return {
        ...result.dataValues,
    }
}

exports.insertNotification = async (payload, transaction) => {
    const result = await model.n_event.create(payload, { transaction })
    payload.notification_push_client_id = uuidv4()
    const push_client = await model.n_push_client.create(payload, { transaction })
    payload?.nip_tujuan.length > 0 && payload?.nip_tujuan?.forEach(async (item) => {
        let payload2 = {
            notification_status_id: uuidv4(),
            notification_event_id: payload?.notification_event_id,
            nip_tujuan: item
        }
        await model.n_status.create(payload2)
    })

    return {
        ...result.dataValues,
    }
}

exports.updateNotification = async (payload) => {
    const { notification_status_id } = payload
    const result = await model.n_status.update(payload, { where: { notification_status_id } })
    return await helpers.processUpdate(result)
}

function isJsonString(str) {
    if (typeof str !== "string") return false
    try {
        const parsed = JSON.parse(str)
        // JSON harus berupa object/array, bukan number/string murni
        return typeof parsed === "object"
    } catch (e) {
        return false
    }
}

exports.getListNotification = async (nip) => {
    const QUERY = query.getListNotification

    const listNotification = await db.query(QUERY, {
        replacements: {
            nip: String(nip)
        },
        type: db.QueryTypes.SELECT
    })
    const parsedList = listNotification.map(item => {
        let bodyObj = null
        const isJson = isJsonString(item.PUSH_BODY_TEMPLATE)
        try {
            bodyObj = isJson === false ? item?.PUSH_BODY_TEMPLATE : JSON.parse(item.PUSH_BODY_TEMPLATE)
        } catch (e) {
            console.error('Gagal parse PUSH_BODY_TEMPLATE:', e)
        }

        return {
            ...item,
            PUSH_BODY_TEMPLATE: isJson === false ? item?.PUSH_BODY_TEMPLATE : bodyObj?.project_name,
            HTML: isJson === false ? "" : bodyObj?.html,
        }
    })

    return parsedList
}

exports.getNotificationFaktur = async (id) => {
    try {
        const QUERY = query.getNotificationFaktur;
        // console.log("QUERY :", id)

        const listNotification = await db.query(QUERY, {
            replacements: {
                project_id: id, // nanti bisa dari req.query.id
                // project_id: "144c456e-f181-4833-bf73-b9fbe52dcaca", // nanti bisa dari req.query.id
            },
            type: db.QueryTypes.SELECT,
            //   logging: console.log,
        });

        const parsedList = listNotification.map((item) => {
            let bodyObj = null;
            try {
                // parse pertama
                bodyObj = JSON.parse(item.PUSH_BODY_TEMPLATE);

                // kalau masih string (double escaped), parse lagi
                if (typeof bodyObj === "string") {
                    bodyObj = JSON.parse(bodyObj);
                }

                // fix string HTML: hilangkan escape karakter berlebih
                if (typeof bodyObj.html === "string") {
                    bodyObj.html = bodyObj.html.replace(/\\"/g, '"').replace(/^"|"$/g, "");
                    // bodyObj.html = bodyObj.html.replace(/\\"/g, '"');
                }
            } catch (e) {
                console.error("Gagal parse PUSH_BODY_TEMPLATE:", e);
            }

            return {
                ...item,
                PROJECT_NAME: bodyObj?.project_name || null,
                HTML: bodyObj?.html || null,
            };
        });

        return parsedList;
    } catch (err) {
        console.error("Error getNotificationFaktur:", err);
        return { error: "Internal server error" };
    }
}

exports.insertTask = async (payload, transaction) => {
    try {
        // Buat task_id baru
        const taskId = uuidv4();

        // Simpan ke d_task
        const taskData = {
            task_id: taskId,
            notification_status_id: payload?.notification_status_id,
            notification_event_id: payload?.notification_event_id,
            project_id: payload?.project_id,
            title_task: payload?.title_task,
            task_detail: payload?.task_detail,
            created_by: payload?.created_by,
            assign_by: payload?.assign_by,
            start_date: payload?.start_date,
            end_date: payload?.end_date,
            task_category: payload?.task_category
        };

        await model.d_task.create(taskData, { transaction });

        // Simpan ke d_task_assign jika assign_to lebih dari satu
        if (Array.isArray(payload?.assign_to) && payload?.assign_to.length > 0) {
            const taskAssignData = payload.assign_to.map((assignee) => ({
                task_assign_id: uuidv4(),
                task_id: taskId,
                assign_to: assignee,
                created_by: payload?.created_by
            }));

            await model.d_task_assign.bulkCreate(taskAssignData, { transaction });
        }

        return {
            success: true,
            message: "Task and assignments successfully created.",
            task_id: taskId
        };
    } catch (error) {
        console.error("Error inserting task:", error);
        throw new Error("Failed to insert task.");
    }
}

exports.updateTask = async ({ task_id, payload }, transaction) => {
    try {
        // 🔍 Periksa apakah task_id valid
        // console.log({ task_id, payload })
        // console.log("masukk")
        if (!task_id) {
            throw new Error("task_id is required.");
        }
        // console.log("MASUHK")
        // 🔍 Periksa apakah task ada di database
        const existingTask = await model.d_task.findOne({ where: { task_id } });
        if (!existingTask) {
            return { success: false, message: "Task not found." };
        }
        // 📝 Update data task di d_task
        const taskData = {
            notification_status_id: payload?.notification_status_id,
            notification_event_id: payload?.notification_event_id,
            project_id: payload?.project_id,
            title_task: payload?.title_task,
            task_detail: payload?.task_detail,
            assign_by: payload?.assign_by,
            start_date: payload?.start_date,
            end_date: payload?.end_date,
            task_category: payload?.task_category
        };

        await model.d_task.update(taskData, { where: { task_id }, transaction });

        // 🔄 Update assign_to jika ada perubahan
        if (Array.isArray(payload?.assign_to)) {
            // Hapus semua data lama di d_task_assign untuk task_id ini
            await model.d_task_assign.destroy({ where: { task_id }, transaction });

            // Masukkan data baru ke d_task_assign
            const newTaskAssign = payload.assign_to.map(assignee => ({
                task_assign_id: uuidv4(),
                task_id,
                assign_to: assignee,
                created_by: payload?.created_by
            }));

            await model.d_task_assign.bulkCreate(newTaskAssign, { transaction });
        }

        return {
            success: true,
            message: "Task successfully updated.",
            task_id
        };
    } catch (error) {
        console.error("Error updating task:", error);
        throw new Error("Failed to update task.");
    }
};

exports.getListTask = async (nip, keyword) => {
    const QUERY = query.getListTask
        .replace(/:nip/g, nip)

    const listTask = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : ''}%`
        },
        type: db.QueryTypes.SELECT
    })

    return listTask
}

exports.getTaskDetail = async ({ task_id }) => {
    try {
        // 🔍 Periksa apakah taskId valid
        if (!task_id) {
            throw new Error("taskId is required and cannot be undefined or null.");
        }

        // Ambil task berdasarkan task_id
        const task = await model.d_task.findOne({
            where: { task_id: task_id },
            include: [
                {
                    model: model.d_task_assign,
                    as: "assignments", // Pastikan alias sesuai dengan model association
                    attributes: ["assign_to"],
                    include: [
                        {
                            model: model.m_karyawan,
                            as: "karyawan",
                            attributes: ["nik", "nama", "email"]
                        }
                    ]
                }
            ]
        });

        // Cek apakah task ditemukan
        if (!task) {
            return {
                success: false,
                message: "Task not found."
            };
        }

        return {
            success: true,
            data: {
                task_id: task.task_id,
                notification_status_id: task.notification_status_id,
                notification_event_id: task.notification_event_id,
                project_id: task.project_id,
                title_task: task.title_task,
                task_detail: task.task_detail,
                created_by: task.created_by,
                assign_by: task.assign_by,
                start_date: task.start_date,
                end_date: task.end_date,
                task_category: task.task_category,
                assigned_to: task.assignments.map((a) => ({
                    nik: a.assign_to,
                    nama: a.karyawan ? a.karyawan.nama : null,
                    email: a.karyawan ? a.karyawan.email : null
                })) // Ambil assign_to dari d_task_assign
            }
        };
    } catch (error) {
        console.error("Error fetching task detail:", error);
        throw new Error("Failed to fetch task details.");
    }
};

exports.deleteTask = async (task_id, transaction) => {
    try {
        // 🔍 Periksa apakah task_id valid
        if (!task_id) {
            throw new Error("task_id is required.");
        }

        // 🔍 Periksa apakah task ada di database
        const existingTask = await model.d_task.findOne({ where: { task_id } });
        if (!existingTask) {
            return { success: false, message: "Task not found." };
        }

        const QUERYTASKASSIGN = query.deleteTaskAssign
            .replace(/:task_id/g, task_id)

        await db.query(QUERYTASKASSIGN, {
            replacements: {},
            // type: db.QueryTypes.DELETE
        }).then((response) => {
            console.log("RESPONSE=", response)
        }).catch((err) => console.log("ERR DTASK_ASSIGN :", err));

        const QUERYTASK = query.deleteTask
            .replace(/:task_id/g, task_id)

        await db.query(QUERYTASK, {
            replacements: {},
            // type: db.QueryTypes.DELETE
        }).then((response) => {
            console.log("RESPONSE TASK=", response)
        }).catch((err) => console.log("ERR DTASK :", err));

        // // 🗑️ Hapus semua data di d_task_assign yang terkait dengan task_id
        // await model.d_task_assign.destroy({ where: { task_id }, transaction, logging: console.log })
        // .then((response) => {
        //     console.log("RESPONSE=",response)
        // }).catch((err) => console.log("ERR DTASK_ASSIGN :",err) );

        // // 🗑️ Hapus task di d_task
        // await model.d_task.destroy({ where: { task_id }, transaction, logging: console.log })
        // .then((response) => {
        //     console.log("RESPONSE D_TASK=",response)
        // }).catch((err) => console.log("ERR DTASK :",err) );

        return {
            success: true,
            message: "Task successfully deleted."
        };
    } catch (error) {
        console.error("Error deleting task:", error);
        throw new Error("Failed to delete task.");
    }
};

exports.getListPegawai = async (payloadList) => {
    const {
        departmentId = '',
        kelas = [],
        page = 0,
        limit = 0,
        sort = 'ASC',
        start = 0,
        end = 0,
    } = payloadList;
    const bind = {};
    let whereBind = ``;
    let pagingBind = ``;
    if (departmentId) {
        whereBind += ` AND DEPARTMENT_ID =:departmentId`;
        bind.departmentId = departmentId;
    }

    if (kelas.length > 0) {
        whereBind += ` AND KELAS IN (:kelas)`;
        bind.kelas = kelas;
    }

    if (Number(page) > 0 && Number(limit) > 0) {
        pagingBind += `
            OFFSET :startIndex ROWS
            FETCH FIRST :endIndex ROWS ONLY
        `;
        bind.startIndex = start;
        bind.endIndex = end;
    }

    let getData = query.getListPegawai;
    if (whereBind) {
        getData += whereBind;
    }
    getData += ` ORDER BY NAMA ${sort}`;
    if (pagingBind) {
        getData += pagingBind;
    }
    const result = await db.query(getData, {
        replacements: bind,
        type: db.QueryTypes.SELECT,
    });
    return result;
}

exports.getRefDepartment = async () => {
    const bind = { isY: 'Y' };
    const result = await db.query(query.getRefDepartment, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    });
    return result
}

exports.getCustomerBySpuc = async (payloadList) => {
    const {
        portofolio_id = '',
        divisi = '',
        keyword = '',
        sort = '',
    } = payloadList;
    const bind = {};
    let whereBind = ``;
    let pagingBind = ``;
    // if (portofolio_id) {
    //     whereBind += ` AND cp.PORTOFOLIO_ID =:portofolio_id`;
    //     bind.portofolio_id = portofolio_id;
    // }

    // if (divisi) {
    //     whereBind += ` AND cp.DIVISI = ':divisi'`;
    //     bind.divisi = divisi;
    // }

    // if (keyword) {
    //     whereBind += ` AND UPPER(mc.CUSTOMER_NAME) LIKE UPPER('%:keyword%')`;
    //     bind.keyword = `%${keyword?.toUpperCase()}%`;
    // }

    let getData = query.getCustomerBySpuc.replace(/:divisi/g, divisi).replace(/:keyword/g, `%${keyword ? keyword.toUpperCase() : ''}%`);

    // if (whereBind) {
    //     getData += whereBind;
    // }
    // getData += ` ORDER BY cp.assigned_date ${sort}`;
    const result = await db.query(getData, {
        replacements: {
            // divisi: divisi,
            // keyword: `%${keyword ? keyword.toUpperCase() : ''}%`
        },
        type: db.QueryTypes.SELECT,
        // logging: true
    });
    return result;
}


exports.getListNIPByRole = async (role) => {
    const QUERY = query.getListNIPByRole
        .replace(/:role_id/g, role)
    const listData = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    const data = listData.length > 0 ? listData.map((item) => {
        return item?.NIP
    }) : []

    return data
}

exports.getNIPByRoleId = async (role) => {
    const QUERY = query.getNIPByRoleId
        .replace(/:role_id/g, role)
    const listData = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    const data = listData.length > 0 ? listData.map((item) => {
        return item?.USERNAME
    }) : []

    return data
}

exports.getListRemarks = async (project_id) => {
    const QUERY = query.getListRemarks
        .replace(/:project_id/g, project_id)

    const listRemarks = await db.query(QUERY, {
        replacements: {
            // keyword:`%${keyword ? keyword.toUpperCase() : ''}%` 
        },
        type: db.QueryTypes.SELECT
    })

    return listRemarks
}

exports.insertRemarks = async (payload, transaction) => {
    const result = await model.d_remarks.create(payload, { transaction })

    return {
        ...result.dataValues
    }
}

exports.addAssignTeam = async (payload, transaction) => {
    const result = await model.d_assign_project.create(payload, { transaction })

    return {
        ...result.dataValues
    }
}

exports.deleteAssignTeam = async (assign_id) => {
    const result = await model.d_assign_project.destroy({ where: { assign_id } })
    return await helpers.processDelete(result)
}

exports.getListUser = async ({ keyword, page, limit, order = 'DESC' }) => {
    const order_by = 'ORDER BY b.NAMA ' + order

    const QUERY = query.getListUser
        .replace(/:order_by/g, order_by)

    const bindListUser = {
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
        page: page,
        limit: limit
    }

    const listUser = await db.query(QUERY, {
        replacements: bindListUser,
        type: db.QueryTypes.SELECT
    })

    const COUNT_QUERY = query.countListUser

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListUser,
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = listUser.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listUser
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.insertUser = async (payload, transaction) => {
    const result = await model.m_user.create(payload, { transaction })

    return {
        ...result.dataValues
    }
}

exports.insertProgressProject = async (payloadData, files, transaction) => {
    Object.assign(payloadData, { progress_id: uuidv4() });
    if (files) {
        const fullPath = await this.processUploadFile(payloadData, files);
        Object.assign(payloadData, { dok_pendukung: fullPath[0] });
    }

    const result = await model.d_project_progress.create(payloadData, { transaction })

    return {
        ...result.dataValues
    }
}

exports.insertProgressBilling = async (payloadData, transaction) => {
    // const fullPath = await this.processUploadFile(payloadData, files);
    // Object.assign(payloadData, { progress_id: uuidv4(), dok_weekly: fullPath[0] });

    const result = await model.d_project_progress.create(payloadData, { transaction })
    console.log("RESULT=", result)
    return {
        ...result.dataValues
    }
}

exports.getListProgressProject = async ({ project_id }) => {
    console.log("PROJECT_ID=", project_id)
    const QUERY = query.getListProgressProject.replace(/:project_id/g, project_id);
    console.log("QUERY=", QUERY)

    const listData = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    });
    console.log("LISTDATA=", listData)
    const {
        project_log
    } = await this.getGeneralInfo(project_id);

    return {
        list_data: listData,
        project_log: project_log
    }
}
exports.getOverall = async (payload, transaction) => {
    const result = await db.query(query.getOverall, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getListProgressProjectBilling = async ({ project_id }) => {
    console.log("PROJECT_ID=", project_id)
    const QUERY = query.getListProgressProjectBilling.replace(/:project_id/g, project_id);
    console.log("QUERY=", QUERY)

    const listData = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT
    });
    console.log("LISTDATA=", listData)

    return {
        list_data: listData,
        // project_log: project_log
    }
}

exports.getOverall = async (payload, transaction) => {
    const result = await db.query(query.getOverall, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getDataAreaChart = async ({ year, type }) => {
    let listData = []
    let typeQuery = '';
    for (let i = 1; i <= 12; i++) {
        const bulan = '0' + i
        let bln;
        if (i === 1) {
            bln = 'Jan'
        }
        if (i === 2) {
            bln = 'Feb'
        }
        if (i === 3) {
            bln = 'Mar'
        }
        if (i === 4) {
            bln = 'Apr'
        }
        if (i === 5) {
            bln = 'Mei'
        }
        if (i === 6) {
            bln = 'Jun'
        }
        if (i === 7) {
            bln = 'Jul'
        }
        if (i === 8) {
            bln = 'Agu'
        }
        if (i === 9) {
            bln = 'Sep'
        }
        if (i === 10) {
            bln = 'Okt'
        }
        if (i === 11) {
            bln = 'Nov'
        }
        if (i === 12) {
            bln = 'Des'
        }

        if (type && type === 'customer') {
            typeQuery += ` INNER JOIN D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID `
        } else if (type && type === 'vendor') {
            typeQuery += ` INNER JOIN D_PROJECT_VENDOR b ON b.PROJECT_VENDOR_ID = a.PROJECT_ID `
        } else {
            typeQuery = '';
        }
        const QUERY = query.getDataAreaChart.replace(/:year/g, year).replace(/:bulan/g, bulan).replace(/:type/g, typeQuery)
        const list = await db.query(QUERY, {
            replacements: {},
            type: db.QueryTypes.SELECT,
            plain: true
        })
        listData.push({
            name: bln,
            belum_realisasi: list?.belum_realisasi === null ? 0 : parseInt(list?.belum_realisasi),
            sudah_realisasi: list?.sudah_realisasi === null ? 0 : parseInt(list?.sudah_realisasi),
            amt: 0
        })
    }

    return listData
}

exports.getDataRadialChart = async ({ year }) => {
    let listData = []
    const QUERY = query.getDataRadialChart.replace(/:year/g, year)
    const list = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return list
}

exports.updatePassword = async (payload) => {
    const userExist = await model.m_user.findOne(payload.nipp)
    if (userExist) {
        const result = await model.m_user.update(payload)
    }

    return {
        ...result.dataValues
    }
}

exports.checkPelunasan = async () => {
    const result = await db.query(query.checkPelunasan, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    if (result.length > 0) {
        for (const item of result) {
            const masterData = await getMasterIntegrasi({
                entitas: "REMOTE",
                modul: "GET_TRANSACTION",
                method: "POST"
            });

            const dataTrans = await integrasiData({
                entitas: "REMOTE",
                modul: "GET_TRANSACTION",
                method: "POST"
            }, masterData, {
                trans_id: item?.TRANS_ID,
                billing_id: item?.BILLING_ID
            });

            const payloadIntegrasiLog = {
                id_log: uuidv4(),
                end_point: masterData?.URL_AKSES,
                modul: masterData?.MODUL,
                method: masterData?.METHOD_AKSES,
                req: JSON.stringify({ trans_id: item?.TRANS_ID, billing_id: item?.BILLING_ID }),
                res: JSON.stringify(dataTrans)
            };

            if (dataTrans?.status === 'S' && dataTrans?.result?.data?.length > 0) {
                const recStat = dataTrans.result.data[0]?.REC_STAT;

                if (recStat === 1) {
                    Object.assign(payloadIntegrasiLog, { status: 'S' });
                    await insertLogIntegrasi(payloadIntegrasiLog);

                    const payloadUpdate = {
                        billing_revenue_id: item?.BILLING_REVENUE_ID,
                        status_pelunasan: 'T',
                        nominal_pelunasan: dataTrans.result.data[0]?.TOTAL,
                        kode_bayar: dataTrans.result.data[0]?.KODE_BAYAR,
                        tanggal_pelunasan: (dataTrans.result.data[0]?.TGL_LUNAS !== null)
                            ? moment(dataTrans.result.data[0]?.TGL_LUNAS, "MM/DD/YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss")
                            : ''
                    };

                    await this.dataRevenueStreamUpdate(payloadUpdate);

                    const payloadStatus = {
                        project_id: item?.BILLING_ID,
                        billing_id: item?.BILLING_ID,
                        date_status: moment(new Date()).format('YYYY-MM-DD'),
                        created_by: 'SYSTEM',
                        id_tab_status: 'FN1',
                        kd_status: '401',
                        type_status: 'BL01'
                    };

                    await this.insertProjectStatus(payloadStatus);
                }
            }
        }
    }
}

exports.checkPelunasanFromSAP = async () => {
    const result = await db.query(query.checkPelunasanFromSAP, {
        replacements: {},
        type: db.QueryTypes.SELECT
    })

    if (result.length > 0) {
        for (const item of result) {
            const masterData = await getMasterIntegrasi({
                entitas: "SAP",
                modul: "PAYMENT_CHECK",
                method: "POST"
            });

            const dataTrans = await integrasiData({
                entitas: "SAP",
                modul: "PAYMENT_CHECK",
                method: "POST"
            }, masterData, {
                kode_bayar: item?.KODE_BAYAR,
                billing_id: item?.BILLING_ID
            });

            const payloadIntegrasiLog = {
                id_log: uuidv4(),
                end_point: masterData?.URL_AKSES,
                modul: masterData?.MODUL,
                method: masterData?.METHOD_AKSES,
                req: JSON.stringify({ kode_bayar: item?.KODE_BAYAR, billing_id: item?.BILLING_ID }),
                res: JSON.stringify(dataTrans)
            };

            console.log('dataTrans', dataTrans);

            if (dataTrans?.status === "S") {
                Object.assign(payloadIntegrasiLog, { status: 'S' });
                await insertLogIntegrasi(payloadIntegrasiLog);

                const payloadUpdate = {
                    billing_revenue_id: item?.BILLING_REVENUE_ID,
                    status_pelunasan: 'T',
                    nominal_pelunasan: dataTrans.totalAmount,
                    tanggal_pelunasan: (dataTrans.paymentdate !== null)
                        ? moment(dataTrans.paymentdate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                        : ''
                };

                await this.dataRevenueStreamUpdate(payloadUpdate);

                const payloadStatus = {
                    project_id: item?.BILLING_ID,
                    billing_id: item?.BILLING_ID,
                    date_status: moment(new Date()).format('YYYY-MM-DD'),
                    created_by: 'SYSTEM',
                    id_tab_status: 'FN1',
                    kd_status: '401',
                    type_status: 'BL01'
                };

                await this.insertProjectStatus(payloadStatus);
            }
        }
    }
}

exports.updateTransaction = async (payload) => {
    try {
        const { trans_id } = payload
        const result = await model.r_transaction.update(payload, { where: { trans_id } })
        return await helpers.processUpdate(result)
    } catch (error) {
        console.error("Error updating transaction:", error);
        throw new Error("Failed to update transaction.");
    }
};

exports.getSettingDok = async (jenis_dok) => {
    const result = await db.query(query.getSettingDok, {
        replacements: { jenis_dok },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    // const listData = result.map(item => ({
    //     ...item,
    //     PEMARAF: JSON.parse(item.PEMARAF),
    //     PENANDATANGAN: JSON.parse(item.PENANDATANGAN)
    // }));

    if (result) {
        result.PEMARAF = JSON.parse(result?.PEMARAF)
        result.PENANDATANGAN = JSON.parse(result?.PENANDATANGAN)
    }

    return result
}

exports.getDetailBillingRevenueByNoRef = async (no_ref) => {
    const QUERY = query.getDetailBillingRevenueByNoRef.replace(/:no_ref/g, no_ref)
    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getListBillingAdjustment = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListBillingAdjustment.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListBillingAdjustment, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.createBillingAdjustment = async (payload, transaction) => {
    // const { customer_id } = payload
    if (payload.real_periode_billing) {
        if (payload?.real_periode_billing && payload?.real_periode_billing.includes('null') === false) {
            const real_periode_billing = payload.real_periode_billing.split("-")
            Object.assign(payload, { real_periode_billing: real_periode_billing[0], real_bulan_billing: real_periode_billing[1] })
        } else {
            const real_periode_billing = payload.real_periode_billing.split("-")
            Object.assign(payload, { real_periode_billing: null, real_bulan_billing: null })
        }
    }
    const result = await model.d_billing_adjustment.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.updateBillingAdjustment = async (payload) => {
    const { adjustment_id } = payload
    Object.assign(payload, { updated_at: Date.now() })
    if (payload.real_periode_billing) {
        if (payload?.real_periode_billing && payload?.real_periode_billing.includes('null') === false) {
            const real_periode_billing = payload.real_periode_billing.split("-")
            Object.assign(payload, { real_periode_billing: real_periode_billing[0], real_bulan_billing: real_periode_billing[1] })
        } else {
            const real_periode_billing = payload.real_periode_billing.split("-")
            Object.assign(payload, { real_periode_billing: null, real_bulan_billing: null })
        }
    }
    const result = await model.d_billing_adjustment.update(payload, { where: { adjustment_id } })
    return await helpers.processUpdate(result)
}

exports.deleteBillingAdjustment = async (id) => {
    const result = await model.d_billing_adjustment.destroy({ where: { adjustment_id: id } })
    return await helpers.processDelete(result)
}

exports.getDetailBillingAdjustment = async ({ adjustment_id }) => {
    const result = await db.query(query.getDetailBillingAdjustment, {
        replacements: { adjustment_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return {
        ...result
    }
}

exports.mergeAndSavePDF = async (no_invoice, lampiran) => {
    // Import pdf-merger-js secara dinamis
    const PDFMerger = (await import('pdf-merger-js')).default;
    const merger = new PDFMerger();

    // Waktu dan path
    const _date = moment().local('id');
    const _months = Number(_date.format("MM"));
    const path_upload = `files/${_date.year()}/${_months}/${_date.date()}/`;

    // Pastikan direktori upload ada
    const dir = path.join(__dirname, '../../', path_upload);
    fs.mkdirSync(dir, { recursive: true });

    for (const file of lampiran) {
        if (file.jenis === 'LINK') {
            const response = await axios.get(file.link_file, { responseType: 'arraybuffer' });
            // console.log(response.data.slice(0, 10).toString());
            // Simpan file ke sementara dulu (opsional)
            const tempPath = path.join(dir, path.basename(file.link_file));
            // fs.writeFileSync(tempPath, response.data);
            await fs.promises.writeFile(tempPath, response.data);
            // const stat = fs.statSync(tempPath);
            // console.log('File saved:', tempPath, 'size:', stat.size);
            // Tambahkan ke merger
            await merger.add(tempPath);
        }
    }

    // Nama file hasil gabungan
    const mergedFileName = `${no_invoice}_merged.pdf`;
    const mergedPath = path.join(dir, mergedFileName);

    // Simpan hasil merge
    await merger.save(mergedPath);

    // Return path relatif (atau full URL jika kamu ingin)
    return `${path_upload}${mergedFileName}`;
};

const generateQRCode = async (url) => {
    if (!url) return null;
    const qrDataUrl = await QRCode.toDataURL(url, {
        version: 5,
        width: 100,
        margin: 1,
        color: {
            dark: '#000000',         // warna kotak
            light: '#FFFFFF'         // warna background
        }
    });
    return qrDataUrl;
}

exports.stampingCloud = async (htmlContent, data, transaction) => {
    try {
        let payload_d_stamp = {
            billing_id: data?.billing_id,
            sn: '',
            materai: '',
            jwtoken: '',
            flag_unsigned: '',
            flag_stamp: '',
            flag_signed: '',
            kode_proses: '',
            keterangan: '',
            ...((data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) ?
                { stamp_id: data?.stamp_id, updated_by: data?.updated_by, updated_date: data?.updated_date } :
                { created_by: data?.created_by })
        }

        // STEP 1 Start (Upload Invoice)
        const logo = fs.readFileSync('img/pelindo_solusi_digital.png', { encoding: 'base64' });
        htmlContent = htmlContent.replace("#LOGO", `<img src="data:image/png;base64,${logo}" width="118px" />`);

        const footer = fs.readFileSync('img/bg-footer-nota.png', { encoding: 'base64' });
        htmlContent = htmlContent.replace("#FOOTER", `data:image/png;base64,${footer}`);

        // const materai = fs.readFileSync('img/materai.png', { encoding: 'base64' });
        // htmlContent = htmlContent.replace("#QRMATERAI", `<img src="data:image/png;base64,${materai}" width="85px" height="85px" />`);

        // const url = await generateQRCode(`${process.env.URL_DOK}${data?.url_dokumen}`);
        // htmlContent = htmlContent.replace("#QRCODE", `<img src="${url}" width="75px" height="75px" />`);

        const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            printBackground: true,
            width: "210mm",  // lebar A4
            height: "297mm", // tinggi A4
            pageRanges: "1", // hanya ambil halaman pertama
            margin: {
                top: "0mm",
                right: "0mm",
                bottom: "0mm",
                left: "0mm",
            },
        });

        await browser.close();

        // res.set({
        //     "Content-Type": "application/pdf",
        //     "Content-Disposition": "attachment; filename=Testing.pdf",
        //     "Content-Length": pdfBuffer.length,
        // });

        // return res.end(pdfBuffer); // gunakan res.end, bukan res.send

        const files = [
            {
                name: `document_${Date.now()}.pdf`,
                data: pdfBuffer,
                mimetype: "application/pdf",
                size: pdfBuffer.length,
                // mv: (dest, cb) => {
                //     fs.writeFile(dest, pdfBuffer, cb);
                // },
                mv: (dest) => fs.promises.writeFile(dest, pdfBuffer),
            },
        ];

        const payloadData = [{
            BILLING_CODE: data?.billing_code,
            NAMA_FOLDER: 'UNSIGNED'
        }]
        const result = await this.insertDokumenMaterai(payloadData, files, transaction)
        // END
        console.log('result_upload_pdf', result);
        const payloadIntegrasiLog1 = {
            id_log: uuidv4(),
            end_point: '',
            modul: 'UPLOAD_INVOICE',
            method: 'POST',
            req: JSON.stringify({ data: data, htmlContent: htmlContent }),
            res: JSON.stringify(result)
        };

        if (result?.status === true) {
            payload_d_stamp.flag_unsigned = 'T';
            Object.assign(payloadIntegrasiLog1, { status: 'S' });
            await insertLogIntegrasi(payloadIntegrasiLog1);
            // STEP 2 START (Generate SN dan QR Serta Upload File Materai)
            const payloadSNQR = {
                isUpload: false,
                namadoc: "4b",
                namafile: result?.files[0]?.name,
                nilaidoc: "0",
                namejidentitas: "KTP",
                noidentitas: "3515132508760001",
                namedipungut: "Agus Dharmawan",
                snOnly: false,
                nodoc: "1",
                tgldoc: moment(data?.tgl_dokumen).format("YYYY-MM-DD")
            };
            const masterSNQR = await getMasterIntegrasi({
                entitas: "MATERAI",
                modul: "GENERATE_SNQR",
                method: "POST"
            })
            const resultSNQR = await integrasiData({
                entitas: "MATERAI",
                modul: "GENERATE_SNQR",
                method: "POST"
            }, masterSNQR, payloadSNQR)

            const payloadIntegrasiLog2 = {
                id_log: uuidv4(),
                end_point: '',
                modul: 'GENERATE_SN_QR',
                method: 'POST',
                req: JSON.stringify(payloadSNQR),
                res: JSON.stringify(resultSNQR)
            };

            if (resultSNQR?.message === 'success') {
                // STEP 3 START ()
                Object.assign(payloadIntegrasiLog2, { status: 'S' });
                await insertLogIntegrasi(payloadIntegrasiLog2);
                const sn = resultSNQR?.result?.sn
                let base64Image = resultSNQR?.result?.image
                const bufferMaterai = Buffer.from(base64Image, "base64");
                const filesMaterai = [
                    {
                        name: `image.jpg`,
                        data: bufferMaterai,
                        mimetype: "image\/jpeg",
                        size: bufferMaterai.length,
                        // mv: (dest, cb) => {
                        //     fs.writeFile(dest, bufferMaterai, cb);
                        // },
                        mv: (dest) => fs.promises.writeFile(dest, bufferMaterai),
                    },
                ];

                const payloadDataMaterai = [{
                    BILLING_CODE: data?.billing_code,
                    NAMA_FOLDER: 'STAMP'
                }]
                const resultMaterai = await this.insertDokumenMaterai(payloadDataMaterai, filesMaterai, transaction)

                const payloadIntegrasiLog3 = {
                    id_log: uuidv4(),
                    end_point: '',
                    modul: 'UPLOAD_MATERAI',
                    method: 'POST',
                    req: JSON.stringify({ payload: payloadDataMaterai, lampiran: base64Image }),
                    res: JSON.stringify(resultMaterai)
                };

                console.log('result_upload_stamp', resultMaterai);
                if (resultMaterai?.status === true) {
                    Object.assign(payloadIntegrasiLog3, { status: 'S' });
                    await insertLogIntegrasi(payloadIntegrasiLog3);
                    payload_d_stamp.flag_stamp = 'T'
                    payload_d_stamp.sn = sn
                    // STEP 3 START (Stamping Materai)
                    const payloadStamp = {
                        certificatelevel: "NOT_CERTIFIED",
                        src: `/sharefolder/UNSIGNED/${result?.files[0]?.name}`,
                        dest: `/sharefolder/SIGNED/SIGNED_${result?.files[0]?.name}`,
                        docpass: "",
                        location: "JAKARTA",
                        profileName: "emeteraicertificateSigner",
                        reason: "Invoice",
                        refToken: `${sn}`,
                        spesimenPath: `/sharefolder/STAMP/${resultMaterai?.files[0]?.name}`,
                        // spesimenPath: buffer,
                        visLLX: 322.0,
                        visLLY: 90.0,
                        visURX: 414.0,
                        visURY: 174.0,
                        visSignaturePage: 1
                    };

                    const masterStamp = await getMasterIntegrasi({
                        entitas: "MATERAI",
                        modul: "DOC_SIGNING",
                        method: "POST"
                    })
                    const resultStamp = await integrasiData({
                        entitas: "MATERAI",
                        modul: "DOC_SIGNING",
                        method: "POST"
                    }, masterStamp, payloadStamp)

                    const payloadIntegrasiLog4 = {
                        id_log: uuidv4(),
                        end_point: '',
                        modul: 'DOC_SIGNING',
                        method: 'POST',
                        req: JSON.stringify(payloadStamp),
                        res: JSON.stringify(resultStamp)
                    };
                    console.log('result_stamp', resultStamp);
                    if (resultStamp?.status === 'True') {
                        Object.assign(payloadIntegrasiLog4, { status: 'S' });
                        await insertLogIntegrasi(payloadIntegrasiLog4);
                        payload_d_stamp.flag_signed = 'T'
                        const payloadUpdate = {
                            dokumen_id: data?.dokumen_id,
                            url_dokumen: payloadStamp?.dest
                        }
                        await this.updateDokumenNoFile(payloadUpdate)
                        if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                            const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                            return resultUpdateDStamp
                        } else {
                            const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp, { transaction })
                            return resultInsertDStamp
                        }
                    } else {
                        payload_d_stamp.flag_signed = 'F'
                        if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                            const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                        } else {
                            const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp, { transaction })
                        }
                        Object.assign(payloadIntegrasiLog4, { status: 'F' });
                        await insertLogIntegrasi(payloadIntegrasiLog4);
                        throw new Error(`Gagal stamp document`);
                    }
                    // END
                } else {
                    payload_d_stamp.flag_stamp = 'F'
                    if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                        const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                    } else {
                        const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp, { transaction })
                    }
                    Object.assign(payloadIntegrasiLog3, { status: 'F' });
                    await insertLogIntegrasi(payloadIntegrasiLog3);
                    throw new Error(`Gagal Upload Stamp !`);
                }
                // END
            } else {
                payload_d_stamp.flag_stamp = 'F'
                if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                    const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                } else {
                    const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp, { transaction })
                }
                Object.assign(payloadIntegrasiLog2, { status: 'F' });
                await insertLogIntegrasi(payloadIntegrasiLog2);
                throw new Error(`Gagal Generate SN QR ! ${resultSNQR?.message}`);
            }
            // END
        } else {
            payload_d_stamp.flag_unsigned = 'F'
            if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
            } else {
                const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp, { transaction })
            }
            Object.assign(payloadIntegrasiLog1, { status: 'F' });
            await insertLogIntegrasi(payloadIntegrasiLog1);
            throw new Error(`Gagal Upload Dokumen`);
        }
    } catch (error) {
        throw error
    }
}

const stampFull = async (htmlContent, data, payload_d_stamp, transaction) => {
    // STEP 1 Start (Upload Invoice)
    const logo = fs.readFileSync('img/pelindo_solusi_digital.png', { encoding: 'base64' });
    htmlContent = htmlContent.replace("#LOGO", `<img src="data:image/png;base64,${logo}" width="118px" />`);

    const footer = fs.readFileSync('img/bg-footer-nota.png', { encoding: 'base64' });
    htmlContent = htmlContent.replace("#FOOTER", `data:image/png;base64,${footer}`);

    // const materai = fs.readFileSync('img/materai.png', { encoding: 'base64' });
    // htmlContent = htmlContent.replace("#QRMATERAI", `<img src="data:image/png;base64,${materai}" width="85px" height="85px" />`);

    const url = await generateQRCode(`https://inco.pelindo.co.id/PrintNota/CetakNota?ze=${data?.no_dokumen}&ck=7100`);
    htmlContent = htmlContent.replace("#QRCODE", `<img src="${url}" width="75px" height="75px" />`);

    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        printBackground: true,
        width: "210mm",  // lebar A4
        height: "297mm", // tinggi A4
        pageRanges: "1", // hanya ambil halaman pertama
        margin: {
            top: "0mm",
            right: "0mm",
            bottom: "0mm",
            left: "0mm",
        },
    });

    await browser.close();

    const pdfNodeBuffer = Buffer.from(pdfBuffer);

    const files = {
        name: `document_${Date.now()}.pdf`,
        data: pdfBuffer,
        mimetype: "application/pdf",
        size: pdfBuffer.length,
        // mv: (dest, cb) => {
        //     fs.writeFile(dest, pdfBuffer, cb);
        // },
        mv: (dest) => fs.promises.writeFile(dest, pdfBuffer),
    };

    const payloadData = {
        BILLING_CODE: data?.billing_code,
        NAMA_FOLDER: 'UNSIGNED'
    }

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payloadData));
    formData.append("lampiran", pdfNodeBuffer, {
        filename: `invoice.pdf`,
        contentType: "application/pdf",
        knownLength: pdfNodeBuffer.length,
    });

    const master1 = await getMasterIntegrasi({
        entitas: "MATERAI",
        modul: "UPLOAD_FILE_CLOUD",
        method: "POST"
    })
    const result = await integrasiData({
        entitas: "MATERAI",
        modul: "UPLOAD_FILE_CLOUD",
        method: "POST"
    }, master1, formData)
    // const result = await this.insertDokumenMaterai(payloadData, files, transaction)
    // END
    console.log('result_upload_pdf', result);
    const payloadIntegrasiLog1 = {
        id_log: uuidv4(),
        end_point: master1?.URL_AKSES,
        modul: 'UPLOAD_INVOICE',
        method: 'POST',
        req: JSON.stringify({ data: data, htmlContent: htmlContent }),
        res: JSON.stringify(result)
    };

    if (result?.status === true) {
        payload_d_stamp.file_draft = result?.files[0]?.name;
        payload_d_stamp.flag_unsigned = 'T'
        Object.assign(payloadIntegrasiLog1, { status: 'S' });
        await insertLogIntegrasi(payloadIntegrasiLog1);
        // STEP 2 START (Generate SN dan QR Serta Upload File Materai)
        const payloadSNQR = {
            isUpload: false,
            namadoc: "4b",
            namafile: result?.files[0]?.name,
            nilaidoc: "0",
            namejidentitas: "KTP",
            noidentitas: "3515132508760001",
            namedipungut: "Agus Dharmawan",
            snOnly: false,
            nodoc: "1",
            tgldoc: moment(data?.tgl_dokumen).format("YYYY-MM-DD")
        };
        const masterSNQR = await getMasterIntegrasi({
            entitas: "MATERAI",
            modul: "GENERATE_SNQR",
            method: "POST"
        })
        const resultSNQR = await integrasiData({
            entitas: "MATERAI",
            modul: "GENERATE_SNQR",
            method: "POST"
        }, masterSNQR, payloadSNQR)

        const payloadIntegrasiLog2 = {
            id_log: uuidv4(),
            end_point: masterSNQR?.URL_AKSES,
            modul: 'GENERATE_SN_QR',
            method: 'POST',
            req: JSON.stringify(payloadSNQR),
            res: JSON.stringify(resultSNQR)
        };

        console.log('resultSNQR', resultSNQR);

        if (resultSNQR?.message === 'success') {
            // STEP 3 START ()
            payload_d_stamp.materai = resultSNQR?.result?.image
            Object.assign(payloadIntegrasiLog2, { status: 'S' });
            await insertLogIntegrasi(payloadIntegrasiLog2);
            const sn = resultSNQR?.result?.sn
            let base64Image = resultSNQR?.result?.image
            const bufferMaterai = Buffer.from(base64Image, "base64");
            const filesMaterai = {
                name: `image.jpg`,
                data: bufferMaterai,
                mimetype: "image\/jpeg",
                size: bufferMaterai.length,
                // mv: (dest, cb) => {
                //     fs.writeFile(dest, bufferMaterai, cb);
                // },
                mv: (dest) => fs.promises.writeFile(dest, bufferMaterai),
            }

            const payloadDataMaterai = {
                BILLING_CODE: data?.billing_code,
                NAMA_FOLDER: 'STAMP'
            }

            const formDataStamp = new FormData();
            formDataStamp.append("payload", JSON.stringify(payloadDataMaterai));
            formDataStamp.append("lampiran", filesMaterai.data, {
                filename: filesMaterai.name,
                contentType: filesMaterai.mimetype,
                knownLength: filesMaterai.size,
            });

            const resultMaterai = await integrasiData({
                entitas: "MATERAI",
                modul: "UPLOAD_FILE_CLOUD",
                method: "POST"
            }, master1, formDataStamp)

            const payloadIntegrasiLog3 = {
                id_log: uuidv4(),
                end_point: master1?.URL_AKSES,
                modul: 'UPLOAD_MATERAI',
                method: 'POST',
                req: JSON.stringify({ payload: payloadDataMaterai, lampiran: base64Image }),
                res: JSON.stringify(resultMaterai)
            };

            console.log('result_upload_stamp', resultMaterai);
            if (resultMaterai?.status === true) {
                Object.assign(payloadIntegrasiLog3, { status: 'S' });
                await insertLogIntegrasi(payloadIntegrasiLog3);
                payload_d_stamp.flag_stamp = 'T'
                payload_d_stamp.sn = sn
                // STEP 3 START (Stamping Materai)
                const payloadStamp = {
                    certificatelevel: "NOT_CERTIFIED",
                    src: `/sharefolder/UNSIGNED/${result?.files[0]?.name}`,
                    dest: `/sharefolder/SIGNED/INV-${data?.billing_code}-${moment().format('YYYYMMDDHHmmss')}.pdf`,
                    docpass: "",
                    location: "JAKARTA",
                    profileName: "emeteraicertificateSigner",
                    reason: "Invoice",
                    refToken: `${sn}`,
                    spesimenPath: `/sharefolder/STAMP/${resultMaterai?.files[0]?.name}`,
                    // spesimenPath: buffer,
                    // visLLX: 322.0,
                    // visLLY: 90.0,
                    // visURX: 414.0,
                    // visURY: 174.0,
                    visLLX: 317.0, // tetap (geser kiri sudah pas)
                    visLLY: 75.0,  // 85 - 10
                    visURX: 409.0, // tetap
                    visURY: 159.0, // 169 - 10
                    visSignaturePage: 1
                };

                const masterStamp = await getMasterIntegrasi({
                    entitas: "MATERAI",
                    modul: "DOC_SIGNING_CLOUD",
                    method: "POST"
                })
                const resultStamp = await integrasiData({
                    entitas: "MATERAI",
                    modul: "DOC_SIGNING_CLOUD",
                    method: "POST"
                }, masterStamp, payloadStamp)

                const payloadIntegrasiLog4 = {
                    id_log: uuidv4(),
                    end_point: masterStamp?.URL_AKSES,
                    modul: 'DOC_SIGNING',
                    method: 'POST',
                    req: JSON.stringify(payloadStamp),
                    res: JSON.stringify(resultStamp)
                };
                console.log('result_stamp', resultStamp);
                if (resultStamp?.status === 'True') {
                    Object.assign(payloadIntegrasiLog4, { status: 'S' });
                    await insertLogIntegrasi(payloadIntegrasiLog4);
                    payload_d_stamp.flag_signed = 'T'
                    payload_d_stamp.jwtoken = resultStamp?.jwToken
                    payload_d_stamp.kode_proses = '200'
                    payload_d_stamp.keterangan = 'Success'
                    const payloadUpdate = {
                        dokumen_id: data?.dokumen_id,
                        url_dokumen: payloadStamp?.dest
                    }
                    await this.updateDokumenNoFile(payloadUpdate)

                    if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                        const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                        return resultUpdateDStamp
                    } else {
                        const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp)
                        return resultInsertDStamp
                    }
                } else {
                    payload_d_stamp.flag_signed = 'F'
                    payload_d_stamp.jwtoken = resultStamp?.jwToken
                    payload_d_stamp.materai = resultSNQR?.result?.image
                    payload_d_stamp.kode_proses = '500'
                    payload_d_stamp.keterangan = 'Stamping Gagal'
                    if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                        const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                    } else {
                        const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp)
                    }
                    Object.assign(payloadIntegrasiLog4, { status: 'F' });
                    await insertLogIntegrasi(payloadIntegrasiLog4);
                    throw new Error(`Gagal stamp document`);
                }
                // END
            } else {
                payload_d_stamp.flag_stamp = 'F'
                payload_d_stamp.kode_proses = '500'
                payload_d_stamp.keterangan = 'Upload Materai Gagal'
                if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                    const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                } else {
                    const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp)
                }
                Object.assign(payloadIntegrasiLog3, { status: 'F' });
                await insertLogIntegrasi(payloadIntegrasiLog3);
                throw new Error(`Gagal Upload Stamp !`);
            }
            // END
        } else {
            payload_d_stamp.flag_stamp = 'F'
            payload_d_stamp.kode_proses = '500'
            payload_d_stamp.keterangan = 'Generate SN dan QR Gagal'
            if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
                const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
            } else {
                const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp)
            }
            Object.assign(payloadIntegrasiLog2, { status: 'F' });
            await insertLogIntegrasi(payloadIntegrasiLog2);
            throw new Error(`Gagal Generate SN QR ! ${resultSNQR?.result?.err}`);
        }
        // END
    } else {
        payload_d_stamp.flag_unsigned = 'F'
        payload_d_stamp.kode_proses = '500'
        payload_d_stamp.keterangan = 'Upload Invoice Gagal'
        if (data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) {
            const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
        } else {
            const resultInsertDStamp = await model.d_stamp.create(payload_d_stamp)
        }
        Object.assign(payloadIntegrasiLog1, { status: 'F' });
        await insertLogIntegrasi(payloadIntegrasiLog1);
        throw new Error(`Gagal Upload Dokumen`);
    }
}

exports.uploadDokumenUnsigned = async (htmlContent, data, transaction) => {
    try {
        // STEP 1 Start (Upload Invoice)
        const logo = fs.readFileSync('img/pelindo_solusi_digital.png', { encoding: 'base64' });
        htmlContent = htmlContent.replace("#LOGO", `<img src="data:image/png;base64,${logo}" width="118px" />`);

        const footer = fs.readFileSync('img/bg-footer-nota.png', { encoding: 'base64' });
        htmlContent = htmlContent.replace("#FOOTER", `data:image/png;base64,${footer}`);

        // const materai = fs.readFileSync('img/materai.png', { encoding: 'base64' });
        // htmlContent = htmlContent.replace("#QRMATERAI", `<img src="data:image/png;base64,${materai}" width="85px" height="85px" />`);

        const url = await generateQRCode(`https://inco.pelindo.co.id/PrintNota/CetakNota?ze=${data?.no_dokumen}&ck=7100`);
        htmlContent = htmlContent.replace("#QRCODE", `<img src="${url}" width="75px" height="75px" />`);

        const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            printBackground: true,
            width: "210mm",  // lebar A4
            height: "297mm", // tinggi A4
            pageRanges: "1", // hanya ambil halaman pertama
            margin: {
                top: "0mm",
                right: "0mm",
                bottom: "0mm",
                left: "0mm",
            },
        });

        await browser.close();

        const pdfNodeBuffer = Buffer.from(pdfBuffer);

        const files = {
            name: `document_${Date.now()}.pdf`,
            data: pdfBuffer,
            mimetype: "application/pdf",
            size: pdfBuffer.length,
            // mv: (dest, cb) => {
            //     fs.writeFile(dest, pdfBuffer, cb);
            // },
            mv: (dest) => fs.promises.writeFile(dest, pdfBuffer),
        };

        const payloadData = {
            BILLING_CODE: data?.billing_code,
            NAMA_FOLDER: 'UNSIGNED'
        }

        const formData = new FormData();
        formData.append("payload", JSON.stringify(payloadData));
        formData.append("lampiran", pdfNodeBuffer, {
            filename: `invoice.pdf`,
            contentType: "application/pdf",
            knownLength: pdfNodeBuffer.length,
        });

        const master1 = await getMasterIntegrasi({
            entitas: "MATERAI",
            modul: "UPLOAD_FILE_CLOUD",
            method: "POST"
        })
        const result = await integrasiData({
            entitas: "MATERAI",
            modul: "UPLOAD_FILE_CLOUD",
            method: "POST"
        }, master1, formData)

        return result
        // END   
    } catch (error) {
        throw error
    }
}

const stampFromMaterai = async (data, payload_d_stamp, datas) => {
    // STEP 2 START (Generate SN dan QR Serta Upload File Materai)
    const master1 = await getMasterIntegrasi({
        entitas: "MATERAI",
        modul: "UPLOAD_FILE_CLOUD",
        method: "POST"
    })

    if (datas?.sn === '' || datas?.sn === null) {
        const payloadSNQR = {
            isUpload: false,
            namadoc: "4b",
            namafile: datas?.file_draft,
            nilaidoc: "0",
            namejidentitas: "KTP",
            noidentitas: "3515132508760001",
            namedipungut: "Agus Dharmawan",
            snOnly: false,
            nodoc: "1",
            tgldoc: moment(data?.tgl_dokumen).format("YYYY-MM-DD")
        };
        const masterSNQR = await getMasterIntegrasi({
            entitas: "MATERAI",
            modul: "GENERATE_SNQR",
            method: "POST"
        })
        const resultSNQR = await integrasiData({
            entitas: "MATERAI",
            modul: "GENERATE_SNQR",
            method: "POST"
        }, masterSNQR, payloadSNQR)

        const payloadIntegrasiLog2 = {
            id_log: uuidv4(),
            end_point: masterSNQR?.URL_AKSES,
            modul: 'GENERATE_SN_QR',
            method: 'POST',
            req: JSON.stringify(payloadSNQR),
            res: JSON.stringify(resultSNQR)
        };

        console.log('resultSNQR', resultSNQR);

        if (resultSNQR?.message === 'success') {
            // STEP 3 START ()
            payload_d_stamp.materai = resultSNQR?.result?.image
            Object.assign(payloadIntegrasiLog2, { status: 'S' });
            await insertLogIntegrasi(payloadIntegrasiLog2);
            const sn = resultSNQR?.result?.sn
            let base64Image = resultSNQR?.result?.image
            payload_d_stamp.materai = base64Image
            const bufferMaterai = Buffer.from(base64Image, "base64");
            const filesMaterai = {
                name: `image.jpg`,
                data: bufferMaterai,
                mimetype: "image\/jpeg",
                size: bufferMaterai.length,
                // mv: (dest, cb) => {
                //     fs.writeFile(dest, bufferMaterai, cb);
                // },
                mv: (dest) => fs.promises.writeFile(dest, bufferMaterai),
            }

            const payloadDataMaterai = {
                BILLING_CODE: data?.billing_code,
                NAMA_FOLDER: 'STAMP'
            }

            const formDataStamp = new FormData();
            formDataStamp.append("payload", JSON.stringify(payloadDataMaterai));
            formDataStamp.append("lampiran", filesMaterai.data, {
                filename: filesMaterai.name,
                contentType: filesMaterai.mimetype,
                knownLength: filesMaterai.size,
            });

            const resultMaterai = await integrasiData({
                entitas: "MATERAI",
                modul: "UPLOAD_FILE_CLOUD",
                method: "POST"
            }, master1, formDataStamp)

            const payloadIntegrasiLog3 = {
                id_log: uuidv4(),
                end_point: master1?.URL_AKSES,
                modul: 'UPLOAD_MATERAI',
                method: 'POST',
                req: JSON.stringify({ payload: payloadDataMaterai, lampiran: base64Image }),
                res: JSON.stringify(resultMaterai)
            };

            console.log('result_upload_stamp', resultMaterai);
            if (resultMaterai?.status === true) {
                Object.assign(payloadIntegrasiLog3, { status: 'S' });
                await insertLogIntegrasi(payloadIntegrasiLog3);
                payload_d_stamp.flag_stamp = 'T'
                payload_d_stamp.sn = sn
                // STEP 3 START (Stamping Materai)
                const payloadStamp = {
                    certificatelevel: "NOT_CERTIFIED",
                    src: `/sharefolder/UNSIGNED/${datas?.file_draft}`,
                    dest: `/sharefolder/SIGNED/INV-${data?.billing_code}-${moment().format('YYYYMMDDHHmmss')}.pdf`,
                    docpass: "",
                    location: "JAKARTA",
                    profileName: "emeteraicertificateSigner",
                    reason: "Invoice",
                    refToken: `${sn}`,
                    spesimenPath: `/sharefolder/STAMP/${resultMaterai?.files[0]?.name}`,
                    // spesimenPath: buffer,
                    // visLLX: 322.0,
                    // visLLY: 90.0,
                    // visURX: 414.0,
                    // visURY: 174.0,
                    visLLX: 317.0, // tetap (geser kiri sudah pas)
                    visLLY: 75.0,  // 85 - 10
                    visURX: 409.0, // tetap
                    visURY: 159.0, // 169 - 10
                    visSignaturePage: 1
                };

                const masterStamp = await getMasterIntegrasi({
                    entitas: "MATERAI",
                    modul: "DOC_SIGNING_CLOUD",
                    method: "POST"
                })
                const resultStamp = await integrasiData({
                    entitas: "MATERAI",
                    modul: "DOC_SIGNING_CLOUD",
                    method: "POST"
                }, masterStamp, payloadStamp)

                const payloadIntegrasiLog4 = {
                    id_log: uuidv4(),
                    end_point: masterStamp?.URL_AKSES,
                    modul: 'DOC_SIGNING',
                    method: 'POST',
                    req: JSON.stringify(payloadStamp),
                    res: JSON.stringify(resultStamp)
                };
                console.log('result_stamp', resultStamp);
                if (resultStamp?.status === 'True') {
                    Object.assign(payloadIntegrasiLog4, { status: 'S' });
                    await insertLogIntegrasi(payloadIntegrasiLog4);
                    payload_d_stamp.flag_signed = 'T'
                    payload_d_stamp.jwtoken = resultStamp?.jwToken
                    payload_d_stamp.kode_proses = '200'
                    payload_d_stamp.keterangan = 'Success'
                    const payloadUpdate = {
                        dokumen_id: data?.dokumen_id,
                        url_dokumen: payloadStamp?.dest
                    }
                    await this.updateDokumenNoFile(payloadUpdate)

                    const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                    return resultUpdateDStamp
                } else {
                    payload_d_stamp.flag_signed = 'F'
                    payload_d_stamp.jwtoken = resultStamp?.jwToken
                    payload_d_stamp.materai = resultSNQR?.result?.image
                    payload_d_stamp.kode_proses = '500'
                    payload_d_stamp.keterangan = 'Stamping Gagal'
                    const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                    Object.assign(payloadIntegrasiLog4, { status: 'F' });
                    await insertLogIntegrasi(payloadIntegrasiLog4);
                    throw new Error(`Gagal stamp document`);
                }
                // END
            } else {
                payload_d_stamp.flag_stamp = 'F'
                payload_d_stamp.kode_proses = '500'
                payload_d_stamp.keterangan = 'Upload Materai Gagal'
                const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                Object.assign(payloadIntegrasiLog3, { status: 'F' });
                await insertLogIntegrasi(payloadIntegrasiLog3);
                throw new Error(`Gagal Upload Stamp !`);
            }
            // END
        } else {
            payload_d_stamp.flag_stamp = 'F'
            payload_d_stamp.kode_proses = '500'
            payload_d_stamp.keterangan = 'Generate SN dan QR Gagal'
            const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
            Object.assign(payloadIntegrasiLog2, { status: 'F' });
            await insertLogIntegrasi(payloadIntegrasiLog2);
            throw new Error(`Gagal Generate SN QR ! ${resultSNQR?.result?.err}`);
        }
    } else {
        // STEP 3 START ()
        let base64Image = datas?.materai
        const bufferMaterai = Buffer.from(base64Image, "base64");
        const filesMaterai = {
            name: `image.jpg`,
            data: bufferMaterai,
            mimetype: "image\/jpeg",
            size: bufferMaterai.length,
            // mv: (dest, cb) => {
            //     fs.writeFile(dest, bufferMaterai, cb);
            // },
            mv: (dest) => fs.promises.writeFile(dest, bufferMaterai),
        }

        const payloadDataMaterai = {
            BILLING_CODE: data?.billing_code,
            NAMA_FOLDER: 'STAMP'
        }

        const formDataStamp = new FormData();
        formDataStamp.append("payload", JSON.stringify(payloadDataMaterai));
        formDataStamp.append("lampiran", filesMaterai.data, {
            filename: filesMaterai.name,
            contentType: filesMaterai.mimetype,
            knownLength: filesMaterai.size,
        });

        const resultMaterai = await integrasiData({
            entitas: "MATERAI",
            modul: "UPLOAD_FILE_CLOUD",
            method: "POST"
        }, master1, formDataStamp)

        const payloadIntegrasiLog3 = {
            id_log: uuidv4(),
            end_point: master1?.URL_AKSES,
            modul: 'UPLOAD_MATERAI',
            method: 'POST',
            req: JSON.stringify({ payload: payloadDataMaterai, lampiran: base64Image }),
            res: JSON.stringify(resultMaterai)
        };

        console.log('result_upload_stamp', resultMaterai);
        if (resultMaterai?.status === true) {
            Object.assign(payloadIntegrasiLog3, { status: 'S' });
            await insertLogIntegrasi(payloadIntegrasiLog3);
            payload_d_stamp.flag_stamp = 'T'
            // STEP 3 START (Stamping Materai)
            const payloadStamp = {
                certificatelevel: "NOT_CERTIFIED",
                src: `/sharefolder/UNSIGNED/${datas?.file_draft}`,
                dest: `/sharefolder/SIGNED/INV-${data?.billing_code}-${moment().format('YYYYMMDDHHmmss')}.pdf`,
                docpass: "",
                location: "JAKARTA",
                profileName: "emeteraicertificateSigner",
                reason: "Invoice",
                refToken: `${datas?.sn}`,
                spesimenPath: `/sharefolder/STAMP/${resultMaterai?.files[0]?.name}`,
                // spesimenPath: buffer,
                // visLLX: 322.0,
                // visLLY: 90.0,
                // visURX: 414.0,
                // visURY: 174.0,
                visLLX: 317.0, // tetap (geser kiri sudah pas)
                visLLY: 75.0,  // 85 - 10
                visURX: 409.0, // tetap
                visURY: 159.0, // 169 - 10
                visSignaturePage: 1
            };

            const masterStamp = await getMasterIntegrasi({
                entitas: "MATERAI",
                modul: "DOC_SIGNING_CLOUD",
                method: "POST"
            })
            const resultStamp = await integrasiData({
                entitas: "MATERAI",
                modul: "DOC_SIGNING_CLOUD",
                method: "POST"
            }, masterStamp, payloadStamp)

            const payloadIntegrasiLog4 = {
                id_log: uuidv4(),
                end_point: masterStamp?.URL_AKSES,
                modul: 'DOC_SIGNING',
                method: 'POST',
                req: JSON.stringify(payloadStamp),
                res: JSON.stringify(resultStamp)
            };
            console.log('result_stamp', resultStamp);
            if (resultStamp?.status === 'True') {
                Object.assign(payloadIntegrasiLog4, { status: 'S' });
                await insertLogIntegrasi(payloadIntegrasiLog4);
                payload_d_stamp.flag_signed = 'T'
                payload_d_stamp.jwtoken = resultStamp?.jwToken
                payload_d_stamp.kode_proses = '200'
                payload_d_stamp.keterangan = 'Success'
                const payloadUpdate = {
                    dokumen_id: data?.dokumen_id,
                    url_dokumen: payloadStamp?.dest
                }
                await this.updateDokumenNoFile(payloadUpdate)

                const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                return resultUpdateDStamp
            } else {
                payload_d_stamp.flag_signed = 'F'
                payload_d_stamp.jwtoken = resultStamp?.jwToken
                payload_d_stamp.kode_proses = '500'
                payload_d_stamp.keterangan = 'Stamping Gagal'
                const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
                Object.assign(payloadIntegrasiLog4, { status: 'F' });
                await insertLogIntegrasi(payloadIntegrasiLog4);
                throw new Error(`${resultStamp?.errorMessage}`);
            }
            // END
        } else {
            payload_d_stamp.flag_stamp = 'F'
            payload_d_stamp.kode_proses = '500'
            payload_d_stamp.keterangan = 'Upload Materai Gagal'
            const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
            Object.assign(payloadIntegrasiLog3, { status: 'F' });
            await insertLogIntegrasi(payloadIntegrasiLog3);
            throw new Error(`Gagal Upload Stamp !`);
        }
        // END
    }
    // END
}

const stampDocSign = async (data, payload_d_stamp, datas) => {
    // STEP 3 START (Stamping Materai)
    const payloadStamp = {
        certificatelevel: "NOT_CERTIFIED",
        src: `/sharefolder/UNSIGNED/${datas?.file_draft}`,
        dest: `/sharefolder/SIGNED/INV-${data?.billing_code}-${moment().format('YYYYMMDDHHmmss')}.pdf`,
        docpass: "",
        location: "JAKARTA",
        profileName: "emeteraicertificateSigner",
        reason: "Invoice",
        refToken: `${datas?.sn}`,
        spesimenPath: `/sharefolder/STAMP/MTR-${data?.billing_code}.jpg`,
        // spesimenPath: buffer,
        // visLLX: 322.0,
        // visLLY: 90.0,
        // visURX: 414.0,
        // visURY: 174.0,
        visLLX: 317.0, // tetap (geser kiri sudah pas)
        visLLY: 75.0,  // 85 - 10
        visURX: 409.0, // tetap
        visURY: 159.0, // 169 - 10
        visSignaturePage: 1
    };

    const masterStamp = await getMasterIntegrasi({
        entitas: "MATERAI",
        modul: "DOC_SIGNING_CLOUD",
        method: "POST"
    })
    const resultStamp = await integrasiData({
        entitas: "MATERAI",
        modul: "DOC_SIGNING_CLOUD",
        method: "POST"
    }, masterStamp, payloadStamp)

    const payloadIntegrasiLog4 = {
        id_log: uuidv4(),
        end_point: masterStamp?.URL_AKSES,
        modul: 'DOC_SIGNING',
        method: 'POST',
        req: JSON.stringify(payloadStamp),
        res: JSON.stringify(resultStamp)
    };
    console.log('result_stamp', resultStamp);
    if (resultStamp?.status === 'True') {
        Object.assign(payloadIntegrasiLog4, { status: 'S' });
        await insertLogIntegrasi(payloadIntegrasiLog4);
        payload_d_stamp.flag_signed = 'T'
        payload_d_stamp.jwtoken = resultStamp?.jwToken
        payload_d_stamp.kode_proses = '200'
        payload_d_stamp.keterangan = 'Success'
        const payloadUpdate = {
            dokumen_id: data?.dokumen_id,
            url_dokumen: payloadStamp?.dest
        }
        await this.updateDokumenNoFile(payloadUpdate)

        const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
        return resultUpdateDStamp
    } else {
        payload_d_stamp.flag_signed = 'F'
        payload_d_stamp.jwtoken = resultStamp?.jwToken
        payload_d_stamp.kode_proses = '500'
        payload_d_stamp.keterangan = 'Stamping Gagal'
        const resultUpdateDStamp = await model.d_stamp.update(payload_d_stamp, { where: { stamp_id: payload_d_stamp.stamp_id } })
        Object.assign(payloadIntegrasiLog4, { status: 'F' });
        await insertLogIntegrasi(payloadIntegrasiLog4);
        throw new Error(`${resultStamp?.errorMessage}`);
    }
    // END
}

exports.stampingProd = async (htmlContent, data, transaction) => {
    try {
        if (!data?.stamp_id) {
            let payload_d_stamp = {
                billing_id: data?.billing_id,
                dokumen_id: data?.dokumen_id,
                sn: '',
                materai: '',
                jwtoken: '',
                flag_unsigned: 'F',
                flag_stamp: 'F',
                flag_signed: 'F',
                kode_proses: '',
                keterangan: '',
                file_draft: '',
                ...((data?.stamp_id && data?.stamp_id !== '' && data?.stamp_id !== null) ?
                    { stamp_id: data?.stamp_id, updated_by: data?.updated_by, updated_date: data?.updated_date } :
                    { created_by: data?.created_by })
            }
            const result = await stampFull(htmlContent, data, payload_d_stamp, transaction)
            return result
        } else {
            const dataStamp = await model.d_stamp.findOne({ where: { stamp_id: data?.stamp_id } })
            const datas = dataStamp.dataValues
            let payload_d_stamp = {
                billing_id: datas?.billing_id,
                dokumen_id: datas?.dokumen_id,
                sn: datas?.sn,
                materai: datas?.materai,
                jwtoken: datas?.jwtoken,
                flag_unsigned: datas?.flag_unsigned,
                flag_stamp: datas?.stamp,
                flag_signed: datas?.signed,
                kode_proses: datas?.kode_proses,
                keterangan: datas?.keterangan,
                file_draft: datas?.file_draft,
                stamp_id: datas?.stamp_id
            }
            if (datas?.flag_unsigned === 'F') {
                const result = await stampFull(htmlContent, data, payload_d_stamp, transaction)
                return result
            }
            if (datas?.flag_unsigned === 'T' && datas?.flag_stamp === 'F') {
                const result = await stampFromMaterai(data, payload_d_stamp, datas)
                return result
            }
            if (datas?.flag_unsigned === 'T' && datas?.flag_stamp === 'T' && datas?.flag_signed === 'F') {
                const result = await stampDocSign(data, payload_d_stamp, datas)
                return result
            }
        }
    } catch (error) {
        throw error
    }
}

exports.getListHariLibur = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListHariLibur.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListHariLibur, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.deleteHariLibur = async (id) => {
    const result = await model.m_hari_libur.destroy({ where: { hari_libur_id: id } })
    return await helpers.processDelete(result)
}

exports.createHariLibur = async (payload, transaction) => {
    // const { customer_id } = payload
    const result = await model.m_hari_libur.create(payload, { transaction })
    return {
        ...result.dataValues,
    }
}

exports.updateHariLibur = async (payload) => {
    const { hari_libur_id } = payload
    Object.assign(payload, { updated_at: Date.now() })

    const result = await model.m_hari_libur.update(payload, { where: { hari_libur_id } })
    return await helpers.processUpdate(result)
}

exports.dataRevenueLOP = async (payload, transaction) => {
    // Object.assign(payload, {
    //     lop_id: uuidv4(),
    // })

    console.log('payload_lop CREATE', payload);
    const newDetailId = await generateLopDetailId(payload?.LOP_ID, transaction);
    console.log(newDetailId, "detail id new");

    // const result = await model.a_lop.create(payload, { transaction, logging: console.log })
    let resultDetail;

    if (payload?.DETAIL?.BILLING_ID && payload?.DETAIL?.BILLING_ID !== '') {
        const dataBilling = await db.query(query.getDetailDataBilling, {
            replacements: { billing_id: payload?.DETAIL?.BILLING_ID },
            type: db.QueryTypes.SELECT,
            plain: true
        })

        const payloadDetail = {
            LOP_DETAIL_ID: newDetailId,
            LOP_ID: payload?.LOP_ID,
            TERMIN: payload?.DETAIL?.TERMIN ?? dataBilling?.TERMIN,
            // COGS_TERMIN_EST: dataBilling?.COGS_TERMIN_EST,
            // BULAN_EST: dataBilling?.EST_BULAN_BILLING,
            // TAHUN_EST: dataBilling?.EST_PERIODE_BILLING,
            // NILAI_EST: dataBilling?.EST_BILLING,
            BULAN_REAL: payload?.DETAIL?.BULAN_REAL ?? dataBilling?.REAL_BULAN_BILLING,
            TAHUN_REAL: payload?.DETAIL?.TAHUN_REAL ?? dataBilling?.REAL_PERIODE_BILLING,
            NILAI_REAL: payload?.DETAIL?.NILAI_REAL ?? dataBilling?.REAL_BILLING,
            NOMINAL_INVOICE: dataBilling?.NOMINAL_INVOICE,
            BILLING_ID: payload?.DETAIL?.BILLING_ID,
            KETERANGAN: payload?.DETAIL?.KETERANGAN,
            SUBMIT_POTTER: payload?.DETAIL?.SUBMIT_POTTER,
            STATUS_LOP: payload?.DETAIL?.STATUS_LOP,
            STATUS_BILLING: payload?.DETAIL?.STATUS_BILLING,
            JENIS_LOP: payload?.DETAIL?.JENIS_LOP,
            COGS_REAL: payload?.DETAIL?.COGS_REAL,
            LABA_REAL: payload?.DETAIL?.LABA_REAL,
            CREATED_BY: payload?.created_by
        }

        console.log(payloadDetail, "payload detail billing id");

        resultDetail = await model.a_lop_detail.create(payloadDetail, { transaction })
    } else {
        const payloadDetail = {
            LOP_DETAIL_ID: newDetailId,
            LOP_ID: payload?.LOP_ID,
            TERMIN: payload?.DETAIL?.TERMIN,
            // BULAN_EST: payload?.DETAIL?.BULAN_EST,
            // TAHUN_EST: payload?.DETAIL?.TAHUN_EST,
            // NILAI_EST: payload?.DETAIL?.NILAI_EST,
            BULAN_REAL: payload?.DETAIL?.BULAN_REAL,
            TAHUN_REAL: payload?.DETAIL?.TAHUN_REAL,
            NILAI_REAL: payload?.DETAIL?.NILAI_REAL,
            BILLING_ID: '',
            KETERANGAN: payload?.DETAIL?.KETERANGAN,
            SUBMIT_POTTER: payload?.DETAIL?.SUBMIT_POTTER,
            STATUS_LOP: payload?.DETAIL?.STATUS_LOP,
            JENIS_LOP: payload?.DETAIL?.JENIS_LOP,
            COGS_REAL: payload?.COGS_REAL,
            LABA_REAL: payload?.LABA_REAL,
            CREATED_BY: payload?.created_by
        }
        console.log(payloadDetail, "payload detail non billing id");

        resultDetail = await model.a_lop_detail.create(payloadDetail, { transaction })
    }
    return resultDetail;
}

exports.dataRevenueLOPGroup = async (payload, created_by, transaction) => {
    // console.log('payload_lop_group', payload);
    const normalizeVarchar = (val) => {
        if (val === undefined || val === null || val === '') return null;
        return String(val);
    };
    const normalizeString = (val, maxLength) => {
        if (!val || typeof val !== 'string') return null;
        return val.length > maxLength
            ? val.substring(0, maxLength)
            : val;
    };

    const normalizeNumber = (val) => {
        if (
            val === '' ||
            val === null ||
            val === undefined ||
            Number.isNaN(val) ||
            !Number.isFinite(val)
        ) {
            return null;
        }
        return Number(val);
    }
    const toNumberBoolean = (val) => {
        if (val === true || val === 'Y' || val === 1) return 1;
        if (val === false || val === 'N' || val === 0) return 0;
        return null;
    };

    const normalizeBooleanToNumber = (val) => {
        if (val === true) return 1;
        if (val === false) return 0;
        return null;
    };

    const toNumber = (val) => {
        if (val === '' || val === null || val === undefined || Number.isNaN(val)) {
            return null;
        }
        return Number(val);
    };

    const toString = (val) => {
        if (val === '' || val === null || val === undefined) {
            return null;
        }
        return String(val).trim();
    };

    for (item of payload) {
        const dataHeader = await model.a_lop.findOne(
            {
                where: { project_no: item?.project_no },
                raw: true,
                // logging: true
            })

        Object.assign(item, {
            lop_id: uuidv4(),
        })
        // console.log("dataHeader", dataHeader)
        if (dataHeader) {
            console.log("masuk IF")
            const payloadDetail = {
                lop_detail_id: uuidv4(),
                lop_id: item.lop_id,

                lop_no: toString(item?.lop_no),
                termin: toString(item?.detail?.termin),

                cogs_est: toNumber(item?.detail?.cogs_est),
                nilai_est: toNumber(item?.detail?.nilai_est),
                nilai_real: toNumber(item?.detail?.nilai_real),

                bulan_est: item?.detail?.bulan_est != null
                    ? String(toNumber(item.detail.bulan_est)).padStart(2, '0')
                    : null,
                // bulan_est: toNumber(item?.detail?.bulan_est).length == 1 ? `0${toNumber(item?.detail?.bulan_est)}` : toNumber(item?.detail?.bulan_est),
                tahun_est: toString(item?.detail?.tahun_est), // ⬅️ NUMBER BUKAN STRING
                bulan_real: toString(item?.detail?.bulan_real),
                tahun_real: toString(item?.detail?.tahun_real),

                jenis_lop: toString(item?.detail?.jenis_lop),
                status_lop: toString(item?.detail?.status_lop),
                submit_potter: toNumberBoolean(item?.detail?.submit_potter),
                keterangan: toString(item?.detail?.keterangan),

                billing_id: null,
                created_by
            };

            //   console.log('INSERT D_LOP DETAIL PAYLOAD:', payloadDetail)

            await model.a_lop_detail.bulkCreate(
                [payloadDetail],
                {
                    transaction,
                    validate: false,
                    hooks: false,
                    returning: false,
                    raw: true
                }
            );
            // await model.d_lop_detail.bulkCreate([payloadDetail], {
            //     transaction,
            //     returning: false
            //   });
        } else {
            console.log("masuk else")

            const rawMargin = normalizeNumber(item.margin_project_est);
            const payload_dlop = {
                lop_id: item?.lop_id,
                project_no: item?.project_no || null,
                project_name: normalizeString(item?.project_name, 1000) || null,
                customer_id: item?.customer_id || null,
                portofolio_id: item?.portofolio_id
                    ? String(item.portofolio_id)
                    : null,
                kd_spuc: item?.kd_spuc || null,
                nilai_project_est: normalizeNumber(item?.nilai_project_est),
                cogs_project_est: normalizeNumber(item?.cogs_project_est),
                margin_project_est:
                    rawMargin !== null
                        ? Number((rawMargin * 100).toFixed(2))
                        : null,
                status_project: item?.status_project || null
            };

            // console.log('INSERT D_LOP HEADER PAYLOAD:', payload_dlop)

            const result = await model.a_lop.bulkCreate([payload_dlop], {
                transaction,
                validate: false,
                hooks: false,
                returning: false,
                raw: true
            })
            // await model.d_lop.bulkCreate([payload_dlop], {
            //     transaction,
            //     returning: false
            //   });


            let resultDetail;

            // console.log("payload_detail", item?.detail)

            // const payloadDetail = {
            //     lop_detail_id: uuidv4(),
            //     lop_id: item?.lop_id,
            //     lop_no: normalizeVarchar(item?.lop_no),
            //     termin: normalizeNumber(item?.detail?.termin),

            //     cogs_est: normalizeNumber(item?.detail?.cogs_est),
            //     nilai_est: normalizeNumber(item?.detail?.nilai_est),
            //     nilai_real: normalizeNumber(item?.detail?.nilai_real),

            //     bulan_est: normalizeNumber(item?.detail?.bulan_est),
            //     tahun_est: normalizeVarchar(item?.detail?.tahun_est),

            //     bulan_real: normalizeNumber(item?.detail?.bulan_real),
            //     tahun_real: normalizeVarchar(item?.detail?.tahun_real),

            //     jenis_lop: normalizeVarchar(item?.detail?.jenis_lop),
            //     status_lop: normalizeVarchar(item?.detail?.status_lop),

            //     submit_potter: normalizeBooleanToNumber(item?.detail?.submit_potter),
            //     keterangan: normalizeVarchar(item?.detail?.keterangan),

            //     billing_id: null,
            //     created_by
            //   };
            const payloadDetail = {
                lop_detail_id: uuidv4(),
                lop_id: item.lop_id,

                lop_no: toString(item?.lop_no),
                termin: toString(item?.detail?.termin),

                cogs_est: toNumber(item?.detail?.cogs_est),
                nilai_est: toNumber(item?.detail?.nilai_est),
                nilai_real: toNumber(item?.detail?.nilai_real),

                bulan_est: item?.detail?.bulan_est != null
                    ? String(toNumber(item.detail.bulan_est)).padStart(2, '0')
                    : null,
                // bulan_est: toNumber(item?.detail?.bulan_est).length == 1 ? `0${toNumber(item?.detail?.bulan_est)}` : toNumber(item?.detail?.bulan_est),
                tahun_est: toString(item?.detail?.tahun_est), // ⬅️ NUMBER BUKAN STRING
                bulan_real: toString(item?.detail?.bulan_real),
                tahun_real: toString(item?.detail?.tahun_real),

                jenis_lop: toString(item?.detail?.jenis_lop),
                status_lop: toString(item?.detail?.status_lop),
                submit_potter: toNumberBoolean(item?.detail?.submit_potter),
                keterangan: toString(item?.detail?.keterangan),

                billing_id: null,
                created_by
            };

            console.log('INSERT A_LOP DETAIL PAYLOAD:', payloadDetail)

            await model.a_lop_detail.bulkCreate(
                [payloadDetail],
                {
                    transaction,
                    validate: false,
                    hooks: false,
                    returning: false
                }
            );
            // await model.d_lop_detail.bulkCreate([payloadDetail], {
            //     transaction,
            //     returning: false
            //   });

        }
    }

    return "Sukses Upload"
}

exports.dataRevenueLOPUpdateOld = async (payload) => {
    try {
        console.log('payload_update_lop', payload);

        const { LOP_DETAIL_ID, LOP_ID } = payload;

        const payloadHeader = {
            ...payload,
            updated_date: Date.now()
        };

        // Update header LOP
        // const result = await model.a_lop.update(payloadHeader, {
        //     where: { lop_id }
        // });

        // Update detail LOP
        const resultDetail = await model.a_lop_detail.update(payload?.DETAIL, {
            where: { LOP_DETAIL_ID }
        });

        // console.log('result_update_lop', result);
        // console.log('result_update_lop_detail', resultDetail);

        // Validation untuk update
        // await helpers.processUpdate(result);
        await helpers.processUpdate(resultDetail);

        return "Sukses Update LOP";

    } catch (err) {
        console.error(err);
        throw err; // biar controller menangkap error
    }
};

exports.dataRevenueLOPUpdate = async (payload) => {
    try {
        console.log('payload_update_lop', payload);

        const { LOP_DETAIL_ID, DETAIL } = payload;

        if (!LOP_DETAIL_ID) {
            throw new Error('LOP_DETAIL_ID is required');
        }

        const QUERY_UPDATE = query.updateRevenueLopDetail;

        const result = await db.query(QUERY_UPDATE, {
            replacements: {
                LOP_DETAIL_ID,
                TERMIN: DETAIL?.TERMIN,
                STATUS_BILLING: DETAIL?.STATUS_BILLING,
                BULAN_REAL: DETAIL?.BULAN_REAL,
                TAHUN_REAL: DETAIL?.TAHUN_REAL,
                NILAI_REAL: DETAIL?.NILAI_REAL,
                STATUS_LOP: DETAIL?.STATUS_LOP,
                BILLING_ID: DETAIL?.BILLING_ID,
                KETERANGAN: DETAIL?.KETERANGAN,
                SUBMIT_POTTER: DETAIL?.SUBMIT_POTTER,
                COGS_REAL: DETAIL?.COGS_REAL,
                LABA_REAL: DETAIL?.LABA_REAL
            },
            type: db.QueryTypes.UPDATE
        });

        await helpers.processUpdate(result);

        return 'Sukses Update LOP Detail';
    } catch (err) {
        console.error(err);
        throw err;
    }
};

exports.getListBillingLOP = async ({ keyword, page, limit, order, tahun, jenis_lop, status_revenue, spuc, periode, submit_potter }) => {
    let condition = '', select = '', searchHeader = '', order_by = `ORDER BY B.CREATED_DATE ${order}`;

    if (tahun && tahun !== '') {
        condition += ` AND B.TAHUN_REAL = '${tahun}' `
    }
    if (jenis_lop && jenis_lop !== '') {
        if (jenis_lop === 'RKAP') {
            condition += ` AND B.BULAN_REAL IN ('01','02','03','04','05','06') `
        } else {
            condition += ` AND B.BULAN_REAL IN ('07','08','09','10','11','12') `
        }
    }
    if (status_revenue && status_revenue !== '') {
        if (status_revenue === 'Y') {
            condition += ` AND B.BULAN_REAL IS NOT NULL AND B.TAHUN_REAL IS NOT NULL `
        } else {
            condition += ` AND B.BULAN_REAL IS NULL AND B.TAHUN_REAL IS NULL `
        }
    }
    if (spuc && spuc !== '') {
        condition += ` AND A.KD_SPUC = '${spuc}' `
    }
    if (periode && periode !== '') {
        condition += ` AND B.BULAN_REAL = '${periode}' `
    }
    if (keyword) {
        condition += ` AND (upper(A.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(A.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(A.KD_SPUC) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%') 
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') 
                        OR upper(B.TERMIN) like upper('%${keyword}%') 
                        OR upper(B.KETERANGAN) like upper('%${keyword}%')) `
    }
    if (submit_potter && submit_potter !== '') {
        condition += ` AND B.SUBMIT_POTTER = '${submit_potter}' `
    }
    // console.log('condition', condition)
    // console.log("ORDER BY ", order_by)
    const QUERY = query.getListBillingLOP
        .replace(/:condition/g, condition)
        .replace(/:order_by/g, order_by)

    const result = await db.query(QUERY, {
        replacements: {
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT,
        // logging: true
    })


    const QUERY_COUNT = query.countListBillingLOP.replace(/:condition/g, condition)
    const resultCount = await db.query(QUERY_COUNT, {
        replacements: { page, limit },
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    // let result = order === 'DESC' ? result1 : result2

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.getSummaryRevenue = async ({ periode }) => {
    const tanggal = periode?.split("-")

    const spuc = await model.m_referensi.findAll({ where: { jns_ref: 'kd_spuc' }, raw: true })
    const getLopY = async (kd_spuc) => {
        const QUERY = query.getListDataLopY
            .replace(/:kd_spuc/g, kd_spuc)
            .replace(/:tahun/g, tanggal[0])
            .replace(/:bulan/g, tanggal[1])
        const flagY = await db.query(QUERY, {
            replacements: {},
            type: db.QueryTypes.SELECT,
            plain: true
        })
        return flagY
    }
    const getLopN = async (kd_spuc) => {
        const QUERY = query.getListDataLopN
            .replace(/:kd_spuc/g, kd_spuc)
            .replace(/:tahun/g, tanggal[0])
            .replace(/:bulan/g, tanggal[1])
        const flagN = await db.query(QUERY, {
            replacements: {},
            type: db.QueryTypes.SELECT,
            plain: true
        })
        return flagN
    }

    const result = await Promise.all(
        spuc.map(async (a) => {
            const kd_spuc = a.kd_ref;

            const [flagY, flagN] = await Promise.all([
                getLopY(kd_spuc),
                getLopN(kd_spuc)
            ]);

            return {
                spuc: kd_spuc,
                lop_yes: flagY,
                lop_no: flagN
            };
        })
    );

    return result
}

exports.getDetailBillingLOP = async ({ lop_detail_id }) => {
    console.log('lop_detail_id', lop_detail_id)
    try {
        const result = await db.query(query.getDetailBillingLOP, {
            replacements: { lop_detail_id },
            type: db.QueryTypes.SELECT,
            plain: true,
            // logging: true
        })

        if (result?.PROJECT_ID) {
            const project_id = result.PROJECT_ID;
            let dokumenPendukung = [];
            let dokumenKontrak = [];
            let dokumenBAMK = [];

            // Get all document types in parallel for better performance
            const [dokumenPendukungData, dokumenBAMKData, dokumenKontrakData] = await Promise.all([
                // Dokumen Pendukung (tipe 01)
                db.query(query.getDokumenProject, {
                    replacements: { project_id, tipe_dokumen: '01' },
                    type: db.QueryTypes.SELECT,
                    // logging: true
                }),
                // Dokumen BAMK (tipe 02)
                db.query(query.getDokumenProject, {
                    replacements: { project_id, tipe_dokumen: '02' },
                    type: db.QueryTypes.SELECT,
                    // logging: true
                }),
                // Dokumen Kontrak (tipe 03)
                db.query(query.getDokumenProject, {
                    replacements: { project_id, tipe_dokumen: '03' },
                    type: db.QueryTypes.SELECT,
                    // logging: true
                })
            ]);

            dokumenPendukung = dokumenPendukungData || [];
            dokumenBAMK = dokumenBAMKData || [];
            dokumenKontrak = dokumenKontrakData || [];

            console.log(result)
            // Return combined data with documents
            return {
                status: true,
                data: {
                    // Main data
                    ...result,
                    // Documents data
                    dokumen: {
                        pendukung: dokumenPendukung,
                        bamk: dokumenBAMK,
                        kontrak: dokumenKontrak
                    }
                },
                message: 'Data berhasil diambil'
            };
        } else if (result?.PROJECT_NO) {
            const { PR_PROJECT_NAME, PR_CUSTOMER_ID, PR_PROJECT_NO, PR_COGS, PR_NILAI_KONTRAK, ...finalResult } = result
            return {
                status: true,
                data: {
                    // Main data
                    ...finalResult,
                },
                message: 'Data berhasil diambil'
            };
        } else if (result?.LOP_ID) {
            const { PR_PROJECT_NAME, PR_CUSTOMER_ID, PR_PROJECT_NO, PR_COGS, PR_NILAI_KONTRAK, ...finalResult } = result
            return {
                status: true,
                data: {
                    // Main data
                    ...finalResult,
                },
                message: 'Data berhasil diambil'
            };
        } else {
            return {
                status: false,
                data: null,
                message: 'Project tidak ditemukan'
            };
        }

    } catch (error) {
        console.error('Error in getDetailBillingLOP:', error);
        return {
            status: false,
            data: null,
            message: 'Terjadi kesalahan saat mengambil data'
        };
    }
}

exports.getDetailLOP = async ({ project_no }) => {
    try {
        const result = await db.query(query.getDetailLOP, {
            replacements: { project_no },
            type: db.QueryTypes.SELECT,
            plain: true,
            // logging: true
        });

        // console.log("ISI RESULT", result);

        if (result?.PROJECT_ID) {
            const project_id = result.PROJECT_ID;
            let dokumenPendukung = [];
            let dokumenKontrak = [];
            let dokumenBAMK = [];

            // Get all document types in parallel for better performance
            const [dokumenPendukungData, dokumenBAMKData, dokumenKontrakData] = await Promise.all([
                // Dokumen Pendukung (tipe 01)
                db.query(query.getDokumenProject, {
                    replacements: { project_id, tipe_dokumen: '01' },
                    type: db.QueryTypes.SELECT,
                    // logging: true
                }),
                // Dokumen BAMK (tipe 02)
                db.query(query.getDokumenProject, {
                    replacements: { project_id, tipe_dokumen: '02' },
                    type: db.QueryTypes.SELECT,
                    // logging: true
                }),
                // Dokumen Kontrak (tipe 03)
                db.query(query.getDokumenProject, {
                    replacements: { project_id, tipe_dokumen: '03' },
                    type: db.QueryTypes.SELECT,
                    // logging: true
                })
            ]);

            // console.log('dokumenPendukungData', dokumenPendukungData);
            // console.log('dokumenBAMKData', dokumenBAMKData);
            // console.log('dokumenKontrakData', dokumenKontrakData);
            dokumenPendukung = dokumenPendukungData || [];
            dokumenBAMK = dokumenBAMKData || [];
            dokumenKontrak = dokumenKontrakData || [];

            // Return combined data with documents
            return {
                status: true,
                data: {
                    // Main data
                    ...result,
                    // Documents data
                    dokumen: {
                        pendukung: dokumenPendukung,
                        bamk: dokumenBAMK,
                        kontrak: dokumenKontrak
                    }
                },
                message: 'Data berhasil diambil'
            };
        } else {
            return {
                status: false,
                data: null,
                message: 'Project tidak ditemukan'
            };
        }
    } catch (error) {
        console.error('Error in getDetailLOP:', error);
        return {
            status: false,
            data: null,
            message: 'Terjadi kesalahan saat mengambil data'
        };
    }
};

exports.autogenerateLOP = async (req, res) => {
    try {
        // Query database untuk mendapatkan sequence terakhir berdasarkan tahun dan jenis LOP
        const tahun = new Date().getFullYear();
        const { jenis_lop } = req.query; // optional

        let query = `
        SELECT MAX(CAST(SUBSTRING_INDEX(LOP_NO, '.', -1) AS UNSIGNED)) as LAST_SEQUENCE
        FROM A_LOP_DETAIL
        WHERE LOP_NO LIKE '${tahun}.%'
      `;

        if (jenis_lop) {
            const jenisCode = jenis_lop === 'RKAP' ? 'RKAP' : 'PROG';
            query += ` AND LOP_NO LIKE '${tahun}.${jenisCode}.%'`;
        }

        const result = await db.query(query);

        return res.json({
            status: true,
            data: {
                LAST_SEQUENCE: result[0]?.LAST_SEQUENCE || '0'
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Server error' });
    }
};

exports.softDeleteLop = async (payload) => {
    try {
        console.log('payload_update_lop', payload);

        const { lop_detail_id, lop_id, flag_delete } = payload;

        //   const payloadHeader = {
        //     ...payload,
        //     updated_date: Date.now(),
        //     updated_by: payload?.deleted_by,
        //   };

        // Update detail LOP
        const resultDetail = await model.a_lop_detail.update({ flag_delete }, {
            where: { lop_detail_id },
            // logging: true
        }
        );

        //   console.log('result_update_lop', result);
        console.log('result_update_lop_detail', resultDetail);

        // Validation untuk update
        //   await helpers.processUpdate(result);
        await helpers.processUpdate(resultDetail);

        return "Sukses Delete LOP";

    } catch (err) {
        console.error(err);
        throw err; // biar controller menangkap error
    }
};


// Helper untuk parsing nilai
const parseValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'object') {
        if (value instanceof Date) {
            return value.toISOString();
        }
        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return null;

        if (!isNaN(trimmed) && trimmed !== '') {
            const num = parseFloat(trimmed.replace(/[^0-9.-]+/g, ''));
            return isNaN(num) ? trimmed : num;
        }
        return trimmed;
    }

    return value;
};

const getCellString = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return null;

    const v = cell.value;

    // plain string
    if (typeof v === 'string') return v.trim();

    // number → paksa string
    if (typeof v === 'number') return v.toString();

    // richText
    if (v.richText) {
        return v.richText.map(rt => rt.text).join('').trim();
    }

    // formula
    if (v.formula) {
        return v.result != null ? v.result.toString().trim() : null;
    }

    // hyperlink / text
    if (v.text) return v.text.trim();

    return v.toString().trim();
};


exports.uploadLOPExcel = async (req, res) => {
    console.log('=== START UPLOAD LOP EXCEL ===');

    let transaction;
    let tempFileExists = false;

    // console.log('req.files:', req.files);
    // console.log('req.body:', req.body);

    try {
        // 1. Validasi request
        if (!req.files || !req.files.excelFile) {
            console.log('ERROR: No file uploaded');
            return res.status(400).json({
                status: false,
                message: 'Tidak ada file yang diupload'
            });
        }

        const excelFile = req.files.excelFile;
        console.log('Processing file:', excelFile.name, 'Size:', excelFile.size);

        // 2. Cek apakah data ada di buffer atau di temp file
        console.log('Checking file data...');
        console.log('Has buffer data?', !!excelFile.data);
        console.log('Buffer length:', excelFile.data ? excelFile.data.length : 0);
        console.log('Temp file path:', excelFile.tempFilePath);

        // Cek apakah temp file ada
        if (excelFile.tempFilePath) {
            try {
                const stats = await fs.stat(excelFile.tempFilePath);
                console.log('Temp file exists, size:', stats.size);
                tempFileExists = true;
            } catch (err) {
                console.log('Temp file not accessible:', err.message);
            }
        }

        // 3. Baca file Excel dari buffer atau temp file
        console.log('Loading Excel file...');
        const workbook = new ExcelJS.Workbook();

        try {
            console.log('Loading Excel file...');

            if (!excelFile.tempFilePath) {
                return res.status(400).json({
                    status: false,
                    message: 'Temp file tidak tersedia'
                });
            }

            // const workbook = new ExcelJS.Workbook();

            try {
                console.log('Reading Excel from tempFilePath:', excelFile.tempFilePath);
                await workbook.xlsx.readFile(excelFile.tempFilePath);

                console.log('Excel file loaded successfully');
                console.log(`Sheets found: ${workbook.worksheets.length}`);

            } catch (excelError) {
                console.error('ERROR loading Excel:', excelError.message, excelError.stack);
                return res.status(400).json({
                    status: false,
                    message: 'File Excel tidak valid atau rusak',
                    error: excelError.message
                });
            }

            console.log('Excel file loaded successfully');
            console.log(`Sheets found: ${workbook.worksheets.length}`);
            workbook.worksheets.forEach((sheet, idx) => {
                console.log(`  Sheet ${idx + 1}: ${sheet.name} (${sheet.rowCount} rows)`);
            });

        } catch (excelError) {
            console.error('ERROR loading Excel:', excelError.message, excelError.stack);
            return res.status(400).json({
                status: false,
                message: 'File Excel tidak valid atau rusak',
                error: excelError.message
            });
        }

        // 4. Validasi sheet
        // console.log('Validating sheets...');
        // console.log(
        //     'Available sheet names:',
        //     workbook.worksheets.map(ws => `[${ws.name}]`)
        // );
        const findSheet = (workbook, targetName) => {
            return workbook.worksheets.find(ws =>
                ws.name &&
                ws.name.toString().trim().toUpperCase() === targetName
            );
        };
        console.log('Searching for HEADER and DETAIL sheets...');
        const headerSheet = findSheet(workbook, 'HEADER');
        const detailSheet = findSheet(workbook, 'DETAIL');


        if (!headerSheet) {
            console.log('ERROR: HEADER sheet not found');
            return res.status(400).json({
                status: false,
                message: 'Sheet HEADER tidak ditemukan'
            });
        }

        if (!detailSheet) {
            console.log('ERROR: DETAIL sheet not found');
            return res.status(400).json({
                status: false,
                message: 'Sheet DETAIL tidak ditemukan'
            });
        }

        // console.log(`HEADER sheet: ${headerSheet.rowCount} rows`);
        // console.log(`DETAIL sheet: ${detailSheet.rowCount} rows`);

        // 5. Parse HEADER data
        console.log('Parsing HEADER data...');
        const headerData = [];
        let headerRowCount = 0;

        headerSheet.eachRow((row, rowNumber) => {
            headerRowCount++;
            if (rowNumber > 1) { // Skip header row
                try {
                    // if(row.getCell(2).value){}
                    const rowData = {
                        // NO: parseValue(row.getCell(1).value),
                        LOP_ID: row.getCell(2).value,
                        PROJECT_NO: row.getCell(3).value ? row.getCell(3).value.toString().trim() : null,
                        PROJECT_NAME: getCellString(row.getCell(4)),
                        JENIS_LOP: row.getCell(5).value ? row.getCell(5).value.toString().trim() : null,
                        CUSTOMER_ID: row.getCell(6).value.split(" | ")[0],
                        PORTOFOLIO_ID: row.getCell(7).value.split(" | ")[0],
                        KD_SPUC: row.getCell(8).value ? row.getCell(8).value.toString().trim() : null,
                        NAMA_SALES: row.getCell(9).value ? row.getCell(9).value.toString().trim() : null,
                        CATEGORY_ID: row.getCell(10).value.split(" | ")[0],
                        PROJECT_OWNER: row.getCell(11).value ? row.getCell(11).value.toString().trim() : null,
                        NILAI_PROJECT_EST: parseValue(row.getCell(12).value),
                        COGS_PROJECT_EST: parseValue(row.getCell(13).value),
                        MARGIN_PROJECT_EST: parseValue((row.getCell(14).value * 100).toFixed(2)),
                        NILAI_REVENUE: parseValue(row.getCell(15).value),
                        NILAI_COGS: parseValue(row.getCell(16).value),
                        NILAI_LABA: parseValue(row.getCell(17).value)
                    };

                    // Hanya tambah jika LOP_ID ada
                    if (rowData.LOP_ID) {
                        // console.log(`HEADER row ${rowNumber}: LOP_ID = ${rowData.LOP_ID}`);
                        headerData.push(rowData);
                    } else {
                        console.log(`HEADER row ${rowNumber}: Skipped - no LOP_ID`);

                    }
                } catch (rowError) {
                    console.error(`Error parsing HEADER row ${rowNumber}:`, rowError.message);
                }
            }
        });

        // console.log(`Total HEADER rows scanned: ${headerRowCount}`);
        // console.log(`Valid HEADER rows parsed: ${headerData.length}`);

        // 6. Parse DETAIL data
        console.log('Parsing DETAIL data...');
        const detailData = [];
        let detailRowCount = 0;

        detailSheet.eachRow((row, rowNumber) => {
            detailRowCount++;
            if (rowNumber > 1) { // Skip header row
                try {
                    const rowData = {
                        LOP_DETAIL_ID: row.getCell(2).value,
                        LOP_ID: row.getCell(3).value,
                        BULAN_EST: row.getCell(4).value ? row.getCell(4).value.split(" | ")[0] : null,
                        TAHUN_EST: row.getCell(5).value ? row.getCell(5).value.toString().trim() : null,
                        NILAI_EST: parseValue(row.getCell(6).value),
                        TERMIN: row.getCell(7).value ? row.getCell(7).value.toString() : null,
                        COGS_EST: parseValue(row.getCell(8).value),
                        LABA_EST: parseValue(row.getCell(9).value)
                    };

                    // Hanya tambah jika LOP_DETAIL_ID dan LOP_ID ada
                    if (rowData.LOP_DETAIL_ID && rowData.LOP_ID) {
                        // console.log(`DETAIL row ${rowNumber}: LOP_DETAIL_ID = ${rowData.LOP_DETAIL_ID}, LOP_ID = ${rowData.LOP_ID}`);
                        detailData.push(rowData);
                    } else {
                        console.log(`DETAIL row ${rowNumber}: Skipped - missing LOP_DETAIL_ID or LOP_ID`);
                    }
                } catch (rowError) {
                    console.error(`Error parsing DETAIL row ${rowNumber}:`, rowError.message);
                }
            }
        });

        // console.log(`Total DETAIL rows scanned: ${detailRowCount}`);
        // console.log(`Valid DETAIL rows parsed: ${detailData.length}`);

        // 7. Validasi data minimal
        if (headerData.length === 0 && detailData.length === 0) {
            console.log('ERROR: No valid data found');
            return res.status(400).json({
                status: false,
                message: 'Tidak ada data valid yang ditemukan dalam file'
            });
        }

        // 8. Mulai transaction
        console.log('Starting database transaction...');
        transaction = await sequelize.transaction();

        // 9. UPSERT HEADER data
        let headerInserted = 0;
        let headerUpdated = 0;

        if (headerData.length > 0) {
            console.log('UPSERT HEADER data...');

            // 9.1 Ambil LOP_ID yang sudah ada
            const existingHeaders = await model.a_lop.findAll({
                attributes: ['LOP_ID'],
                where: {
                    LOP_ID: headerData.map(h => h.LOP_ID)
                },
                transaction
            });

            const existingHeaderSet = new Set(
                existingHeaders.map(h => h.LOP_ID)
            );

            // 9.2 Pisahkan insert & update
            const headerToInsert = [];
            const headerToUpdate = [];

            for (const h of headerData) {
                if (existingHeaderSet.has(h.LOP_ID)) {
                    headerToUpdate.push(h);
                } else {
                    headerToInsert.push(h);
                }
            }

            // 9.3 INSERT baru
            if (headerToInsert.length > 0) {
                await model.a_lop.bulkCreate(headerToInsert, {
                    transaction,
                    validate: true
                });
                headerInserted = headerToInsert.length;
            }

            // 9.4 UPDATE lama
            for (const h of headerToUpdate) {
                // console.log(`Updating HEADER LOP_ID: ${h[2]}`);
                // console.log(`Updating HEADER LOP_ID: ${h[3]}`);
                await model.a_lop.update(
                    {
                        PROJECT_NO: h.PROJECT_NO,
                        PROJECT_NAME: h.PROJECT_NAME,
                        JENIS_LOP: h.JENIS_LOP,
                        CUSTOMER_ID: h.CUSTOMER_ID,
                        PORTOFOLIO_ID: h.PORTOFOLIO_ID,
                        KD_SPUC: h.KD_SPUC,
                        NAMA_SALES: h.NAMA_SALES,
                        CATEGORY_ID: h.CATEGORY_ID,
                        PROJECT_OWNER: h.PROJECT_OWNER,
                        NILAI_PROJECT_EST: h.NILAI_PROJECT_EST,
                        COGS_PROJECT_EST: h.COGS_PROJECT_EST,
                        MARGIN_PROJECT_EST: h.MARGIN_PROJECT_EST,
                        NILAI_REVENUE: h.NILAI_REVENUE,
                        NILAI_COGS: h.NILAI_COGS,
                        NILAI_LABA: h.NILAI_LABA,
                        updated_date: new Date()
                    },
                    {
                        where: { LOP_ID: h.LOP_ID },
                        transaction
                    }
                );
                headerUpdated++;
            }

            // console.log(`HEADER -> Insert: ${headerInserted}, Update: ${headerUpdated}`);
        }

        // 10. UPSERT DETAIL data
        let detailInserted = 0;
        let detailUpdated = 0;

        if (detailData.length > 0) {
            console.log('UPSERT DETAIL data...');

            // 10.1 Ambil LOP_DETAIL_ID yang sudah ada
            const detailIds = detailData.map(d => d.LOP_DETAIL_ID);
            const detailIdChunks = chunkArray(detailIds, 900);

            const existingDetails = [];

            for (const chunk of detailIdChunks) {
                const rows = await model.a_lop_detail.findAll({
                    attributes: ['LOP_DETAIL_ID'],
                    where: {
                        LOP_DETAIL_ID: chunk
                    },
                    transaction,
                    raw: true
                });

                existingDetails.push(...rows);
            }

            const existingDetailSet = new Set(
                existingDetails.map(d => d.LOP_DETAIL_ID)
            );

            // 10.2 Pisahkan insert & update
            const detailToInsert = [];
            const detailToUpdate = [];

            // FILTER UNIK di detailData dulu
            const uniqueDetailData = [];
            const seenIds = new Set();

            for (const d of detailData) {
                if (!seenIds.has(d.LOP_DETAIL_ID)) {
                    seenIds.add(d.LOP_DETAIL_ID);
                    uniqueDetailData.push(d);
                } else {
                    console.log(`Duplicate found in Excel: ${d.LOP_DETAIL_ID}`);
                }
            }

            console.log(`After deduplication: ${uniqueDetailData.length} unique rows from ${detailData.length} original rows`);

            // Sekarang pisahkan insert & update dari data yang sudah unik
            for (const d of uniqueDetailData) {
                if (existingDetailSet.has(d.LOP_DETAIL_ID)) {
                    detailToUpdate.push(d);
                } else {
                    detailToInsert.push(d);
                }
            }

            console.log(`DETAIL -> To Insert: ${detailToInsert.length}, To Update: ${detailToUpdate.length}`);

            // 10.3 INSERT baru
            if (detailToInsert.length > 0) {
                console.log('Inserting DETAIL data...');
                console.log('Sample IDs to insert:', detailToInsert.slice(0, 3).map(d => d.LOP_DETAIL_ID));

                // VALIDASI: Cek lagi tidak ada duplikat di detailToInsert
                const insertIds = detailToInsert.map(d => d.LOP_DETAIL_ID);
                const uniqueInsertIds = [...new Set(insertIds)];

                if (insertIds.length !== uniqueInsertIds.length) {
                    console.error('ERROR: Masih ada duplikat di detailToInsert!');
                    console.error(`Insert IDs: ${insertIds.length}, Unique: ${uniqueInsertIds.length}`);

                    // Filter lagi untuk pastikan unik
                    const seen = new Set();
                    const finalInsert = [];
                    for (const item of detailToInsert) {
                        if (!seen.has(item.LOP_DETAIL_ID)) {
                            seen.add(item.LOP_DETAIL_ID);
                            finalInsert.push(item);
                        }
                    }
                    detailToInsert.length = 0;
                    detailToInsert.push(...finalInsert);

                    console.log(`Setelah final deduplication: ${detailToInsert.length} rows`);
                }

                try {
                    await model.a_lop_detail.bulkCreate(detailToInsert, {
                        transaction,
                        validate: true,
                        logging: true
                    });
                    detailInserted = detailToInsert.length;
                    console.log(`Successfully inserted ${detailInserted} DETAIL rows`);
                } catch (bulkError) {
                    console.error('ERROR in bulkCreate DETAIL:', bulkError.message);

                    // Debug: tampilkan data yang bermasalah
                    if (bulkError.name === 'SequelizeUniqueConstraintError') {
                        console.error('Duplicate constraint error!');

                        // Coba insert satu per satu untuk debug
                        for (let i = 0; i < detailToInsert.length; i++) {
                            try {
                                await model.a_lop_detail.create(detailToInsert[i], {
                                    transaction,
                                    validate: true
                                });
                            } catch (singleError) {
                                console.error(`Failed to insert LOP_DETAIL_ID ${detailToInsert[i].LOP_DETAIL_ID}:`, singleError.message);
                                throw singleError;
                            }
                        }
                    } else {
                        throw bulkError;
                    }
                }
            }

            // 10.4 UPDATE lama
            if (detailToUpdate.length > 0) {
                console.log('Updating DETAIL data...');

                for (const d of detailToUpdate) {
                    await model.a_lop_detail.update(
                        {
                            BULAN_EST: d.BULAN_EST,
                            TAHUN_EST: d.TAHUN_EST,
                            NILAI_EST: d.NILAI_EST,
                            TERMIN: d.TERMIN,
                            COGS_EST: d.COGS_EST,
                            LABA_EST: d.LABA_EST,
                            UPDATED_DATE: new Date()
                        },
                        {
                            where: { LOP_DETAIL_ID: d.LOP_DETAIL_ID },
                            transaction
                        }
                    );
                    detailUpdated++;
                }
                console.log(`Successfully updated ${detailUpdated} DETAIL rows`);
            }
        }

        // 11. Commit transaction
        await transaction.commit();
        console.log('Transaction committed successfully');

        // 12. Kirim response SUKSES
        const responseData = {
            status: true,
            message: 'Data berhasil diimpor ke database',
            summary: {
                header: {
                    scanned: headerRowCount - 1, // minus header row
                    parsed: headerData.length,
                    inserted: headerInserted
                },
                detail: {
                    scanned: detailRowCount - 1, // minus header row
                    parsed: detailData.length,
                    inserted: detailInserted
                }
            }
        };

        console.log('Sending success response');
        return res.status(200).json(responseData);

    } catch (error) {
        console.error('=== UNEXPECTED ERROR ===', error.message, error.stack);

        // Rollback jika transaction masih aktif
        if (transaction && !transaction.finished) {
            try {
                await transaction.rollback();
                console.log('Transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('ERROR rolling back transaction:', rollbackError);
            }
        }

        // Kirim response ERROR
        const errorResponse = {
            status: false,
            message: 'Terjadi kesalahan saat mengimpor data'
        };

        // Tambahkan error detail hanya di development
        if (process.env.NODE_ENV === 'development' && error.message) {
            errorResponse.error = error.message.substring(0, 200);
        }

        // Pastikan headers belum terkirim
        if (!res.headersSent) {
            console.log('Sending error response');
            return res.status(500).json(errorResponse);
        } else {
            console.error('Headers already sent, cannot send error response');
        }
    } finally {
        console.log('=== END UPLOAD LOP EXCEL ===');
    }
};

const chunkArray = (arr, size = 900) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

exports.getListBillingLOPNew = async ({ keyword, page, limit, order, tahun, jenis_lop, status_revenue, spuc, real_periode, est_periode, submit_potter, real_periode_start, real_periode_end, est_periode_start, est_periode_end }) => {
    let condition = '', conditionHeader = ''

    // if (real_periode) {
    //     const [year, month] = real_periode.split('-');
    //     const monthNumb = Number(month);
    //     condition += ` AND COALESCE(C3.REAL_PERIODE_BILLING,B.TAHUN_REAL) = '${year}' AND TO_NUMBER(COALESCE(C3.REAL_BULAN_BILLING, B.BULAN_REAL)) = '${monthNumb}'`
    // }

    // if (est_periode) {
    //     const [year, month] = est_periode.split('-');
    //     const monthNumb = Number(month);
    //     condition += ` AND B.TAHUN_EST = '${year}' AND B.BULAN_EST = '${monthNumb}'`
    // }

    if (real_periode_start && real_periode_end) {
        const [yearStart, monthStart] = real_periode_start.split('-');
        const [yearEnd, monthEnd] = real_periode_end.split('-');
        const realStart = yearStart + monthStart;
        const realEnd = yearEnd + monthEnd;

        condition += `AND ((TO_NUMBER(COALESCE(C3.REAL_PERIODE_BILLING, B.TAHUN_REAL) ||
                    LPAD(COALESCE(C3.REAL_BULAN_BILLING, B.BULAN_REAL), 2, '0')) BETWEEN ${realStart} AND ${realEnd}))`
    }

    if (est_periode_start && est_periode_end) {
        const [yearStart, monthStart] = est_periode_start.split('-');
        const [yearEnd, monthEnd] = est_periode_end.split('-');
        const estStart = yearStart + monthStart;
        const estEnd = yearEnd + monthEnd;

        condition += `AND ((TO_NUMBER(B.TAHUN_EST || LPAD(B.BULAN_EST, 2, '0')) BETWEEN ${estStart} AND ${estEnd}))`
    }

    if (jenis_lop && jenis_lop !== '') {
        condition += ` AND UPPER(A.JENIS_LOP) = UPPER('${jenis_lop}') `
        conditionHeader += ` AND UPPER(A.JENIS_LOP) = UPPER('${jenis_lop}') `
    }

    if (status_revenue && status_revenue !== '') {
        if (status_revenue === 'Y') {
            condition += ` AND B.BULAN_REAL IS NOT NULL AND B.TAHUN_REAL IS NOT NULL `
        } else {
            condition += ` AND B.BULAN_REAL IS NULL AND B.TAHUN_REAL IS NULL `
        }
    }

    if (spuc && spuc !== '') {
        condition += ` AND A.KD_SPUC = '${spuc}' `
        conditionHeader += ` AND A.KD_SPUC = '${spuc}' `
    }

    if (keyword) {
        condition += ` AND (upper(A.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(A.LOP_ID) like upper('%${keyword}%')
                        OR upper(B.LOP_DETAIL_ID) like upper('%${keyword}%')
                        OR upper(A.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(A.KD_SPUC) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%') 
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') 
                        OR upper(B.TERMIN) like upper('%${keyword}%') 
                        OR upper(B.KETERANGAN) like upper('%${keyword}%')) `

        conditionHeader += ` AND (upper(A.PROJECT_NO) like upper('%${keyword}%')
                        OR upper(A.LOP_ID) like upper('%${keyword}%')
                        OR upper(A.PROJECT_NAME) like upper('%${keyword}%')
                        OR upper(A.KD_SPUC) like upper('%${keyword}%') 
                        OR upper(C.CUSTOMER_NAME) like upper('%${keyword}%') 
                        OR upper(D.PORTOFOLIO) like upper('%${keyword}%') ) `
    }

    if (submit_potter && submit_potter !== '') {
        condition += ` AND B.SUBMIT_POTTER = '${submit_potter}' `
    }

    // Query utama dengan pagination
    const QUERY = query.getListBillingLOPNew.replace(/:condition/g, condition);

    const result = await db.query(QUERY, {
        replacements: {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10
        },
        type: db.QueryTypes.SELECT,
        // logging: true
    });

    // Query untuk header
    const QUERY_HEADER = query.getListBillingHeaderLOP.replace(/:conditionHeader/g, conditionHeader);

    const resultHeader = await db.query(QUERY_HEADER, {
        replacements: {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10
        },
        type: db.QueryTypes.SELECT
    });

    // Query count untuk detail
    const QUERY_COUNT = query.countListBillingLOPNew.replace(/:condition/g, condition);

    const resultCount = await db.query(QUERY_COUNT, {
        replacements: {
            limit: parseInt(limit) || 10
        },
        type: db.QueryTypes.SELECT,
        plain: true
    });

    // Query count untuk header
    const QUERY_COUNT_HEADER = query.countListBillingHeaderLOP.replace(/:conditionHeader/g, conditionHeader);

    const resultCountHeader = await db.query(QUERY_COUNT_HEADER, {
        replacements: {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10
        },
        type: db.QueryTypes.SELECT,
        plain: true
    });

    const getYearFromPeriod = (period) => {
        return period ? period.split('-')[0] : null;
    };

    const getTargetYear = () => {
        const currentYear = new Date().getFullYear().toString();

        const yearFromEst = getYearFromPeriod(est_periode);
        const yearFromReal = getYearFromPeriod(real_periode);

        if (yearFromEst) {
            return yearFromEst;
        } else if (yearFromReal) {
            return yearFromReal;
        } else {
            return currentYear;
        }
    };

    const targetYear = getTargetYear();

    console.log("Tahun yang digunakan:", targetYear);

    const conditionYear = `SUBSTR(LOP_ID,1,4) = :targetYear`;

    // Query Total Revenue Planning
    const QUERY_TOTAL_REVENUE = query.getTotalRevenueLop.replace(/:conditionYear/g, conditionYear);

    const resultTotalRevenue = await db.query(QUERY_TOTAL_REVENUE, {
        type: db.QueryTypes.SELECT,
        replacements: {
            targetYear: targetYear
        }
    });

    let lopIds = [];

    if (resultHeader?.length) {
        lopIds = resultHeader.map(h => h.LOP_ID);
    } else if (result?.[0]?.LOP_ID) {
        lopIds = [result[0].LOP_ID];
    }

    const QUERY_DETAIL = query.getDetailByLopIds;

    const details = await db.query(QUERY_DETAIL, {
        type: db.QueryTypes.SELECT,
        replacements: {
            lopIds: lopIds   // HARUS array
        },
        logging: true
    });

    // Group detail by LOP_ID
    const detailMap = details.reduce((acc, cur) => {
        (acc[cur.LOP_ID] ||= []).push(cur);
        return acc;
    }, {});

    resultHeader.forEach(h => {
        h.DETAIL = detailMap[h.LOP_ID] || [];
    });

    const statusData = result.length > 0;

    return statusData ? {
        total_data: resultCount.total_data,
        total_halaman: resultCount.total_halaman,
        limit: resultCount.limit,
        list_data: result,
        total_data_header: resultCountHeader.total_data_header,
        total_halaman_header: resultCountHeader.total_halaman_header,
        limit_header: resultCountHeader.limit_header,
        list_data_header: resultHeader,
        list_total_revenue: resultTotalRevenue
    } : {
        total_data: 0,
        total_halaman: null,
        limit: null,
        list_data: [],
        list_total_revenue: []
    };
}

exports.getRefLop = async (payloadList) => {
    const { keyword, kd_spuc } = payloadList;

    let conditionHeader = ''

    if (keyword) {
        conditionHeader += `
            AND a.KD_SPUC = '${kd_spuc}'
            AND (
                upper(a.LOP_ID) like upper('%${keyword}%')
                OR upper(a.PROJECT_NAME) like upper('%${keyword}%')
                OR upper(a.KD_SPUC) like upper('%${keyword}%')
            ) `
    }

    const QUERY = query.getRefLop
        .replace(/:conditionHeader/g, conditionHeader)

    const result = await db.query(QUERY, {
        // replacements: {
        //     kd_spuc 
        // },
        type: db.QueryTypes.SELECT,
        logging: true
    })

    return result
}

exports.getListLOPID = async (payload) => {
    try {
        console.log('payload_getListLOPID', payload);

        const { keyword } = payload;
        let select = '', searchHeader = ''
        let conditionHeader = ''
        // order_by = `ORDER BY B.CREATED_DATE ${order}`;

        if (keyword) {
            conditionHeader += ` AND upper(A.LOP_ID) like upper('%${keyword}%')`
        }

        const QUERY = query.getListLOPID
            .replace(/:conditionHeader/g, conditionHeader)

        const result = await db.query(QUERY, {
            // replacements: {
            // },
            type: db.QueryTypes.SELECT,
            logging: true
        })

        return result

    } catch (err) {
        console.error(err);
        throw err; // biar controller menangkap error
    }
};

exports.addLOPDetail = async (req, res) => {
    let transaction;

    try {
        const {
            LOP_ID,
            TERMIN,
            STATUS_BILLING,
            COGS_EST,
            BULAN_EST,
            TAHUN_EST,
            NILAI_EST,
            BULAN_REAL,
            TAHUN_REAL,
            NILAI_REAL,
            STATUS_LOP,
            BILLING_ID,
            KETERANGAN,
            SUBMIT_POTTER
        } = req.body;

        if (!LOP_ID) {
            return res.status(400).json({
                status: false,
                message: 'LOP_ID wajib diisi'
            });
        }

        transaction = await sequelize.transaction();

        // 1️⃣ Generate ID detail dari DB
        const [result] = await sequelize.query(
            `SELECT N2N.FN_GEN_LOP_DETAIL_ID(:lopId) AS LOP_DETAIL_ID FROM DUAL`,
            {
                replacements: { lopId: LOP_ID },
                type: sequelize.QueryTypes.SELECT,
                transaction
            }
        );

        const LOP_DETAIL_ID = result.LOP_DETAIL_ID;

        // 2️⃣ Insert ke A_LOP_DETAIL
        await model.A_LOP_DETAIL.create({
            LOP_DETAIL_ID,
            LOP_ID,
            TERMIN,
            STATUS_BILLING,
            FLAG_DELETE: 'N',
            COGS_EST,
            BULAN_EST,
            TAHUN_EST,
            NILAI_EST,
            BULAN_REAL,
            TAHUN_REAL,
            NILAI_REAL,
            STATUS_LOP,
            BILLING_ID,
            KETERANGAN,
            SUBMIT_POTTER,
            CREATED_BY: req.user?.username || 'SYSTEM',
            CREATED_DATE: new Date()
        }, { transaction });

        await transaction.commit();

        return res.status(201).json({
            status: true,
            message: 'Detail LOP berhasil ditambahkan',
            data: { LOP_DETAIL_ID }
        });

    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        console.error('ADD LOP DETAIL ERROR:', error);
        return res.status(500).json({
            status: false,
            message: 'Gagal menambahkan detail LOP'
        });
    }
};

/**
* Generate LOP_DETAIL_ID berdasarkan LOP_ID
* Contoh:
* LOP_ID = 2026.RKAP.Y.0001
* Result  = 2026.RKAP.Y.0001.03
*/
const generateLopDetailId = async (lopId, transaction) => {
    const query = `
        SELECT LOP_DETAIL_ID
        FROM N2N.A_LOP_DETAIL
        WHERE LOP_ID = :lopId
        ORDER BY TO_NUMBER(REGEXP_SUBSTR(LOP_DETAIL_ID, '[^.]+$')) DESC
        FETCH FIRST 1 ROWS ONLY
    `

    const result = await db.query(query, {
        replacements: { lopId },
        type: sequelize.QueryTypes.SELECT,
        transaction
    })

    let nextNumber = 1

    if (result.length > 0) {
        const lastId = result[0].LOP_DETAIL_ID
        const lastNumber = parseInt(lastId.split('.').pop(), 10)
        nextNumber = lastNumber + 1
    }

    const suffix = String(nextNumber)
    return `${lopId}.${suffix}`
}

exports.saveLopDetail = async (payload, transaction) => {
    const {
        lop_detail_id,
        billing_id,
        lop_id,
        submit_potter,
        termin,
        bulan_est,
        tahun_est,
        nilai_est,
        bulan_real,
        tahun_real,
        nilai_real,
    } = payload.detail

    // const {
    //     lop_detail_id,
    //     lop_id,
    //     bulan_est,
    //     tahun_est,
    //     nilai_est,
    //     cogs_est,
    //     created_by,
    //     updated_by
    // } = payload.detail

    // =========================
    // UPDATE
    // =========================
    if (lop_detail_id) {
        const updateQuery = `
            UPDATE N2N.A_LOP_DETAIL
            SET
                BULAN_EST = :bulan_est,
                TAHUN_EST = :tahun_est,
                NILAI_EST = :nilai_est,
                COGS_EST  = :cogs_est,
                UPDATED_BY = :updated_by,
                UPDATED_DATE = CURRENT_TIMESTAMP
            WHERE LOP_DETAIL_ID = :lop_detail_id
        `

        await db.query(updateQuery, {
            replacements: payload,
            type: sequelize.QueryTypes.UPDATE,
            transaction
        })

        return { message: 'Detail berhasil diupdate' }
    }

    // =========================
    // INSERT (AUTO GENERATE ID)
    // =========================
    const newDetailId = await generateLopDetailId(lop_id, transaction)
    console.log("PAYLOAD", payload.detail)
    console.log("newDetailId", newDetailId)
    const insertQuery = `
        INSERT INTO N2N.A_LOP_DETAIL (
            LOP_DETAIL_ID,
            LOP_ID,
            BULAN_EST,
            TAHUN_EST,
            NILAI_EST,
            CREATED_DATE
        ) VALUES (
            :lop_detail_id,
            :lop_id,
            :bulan_est,
            :tahun_est,
            :nilai_est,
            CURRENT_TIMESTAMP
        )
    `

    await db.query(insertQuery, {
        replacements: {
            // ...payload,
            lop_id,
            bulan_est,
            tahun_est,
            nilai_est,
            lop_detail_id: newDetailId
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
    })

    return {
        message: 'Detail berhasil ditambahkan',
        lop_detail_id: newDetailId
    }
}


exports.generateLopId = async () => {
    try {
        const query = `
        SELECT TO_CHAR(SYSDATE, 'YYYY')
                || '.RKAP.N.'
                || LPAD(NVL(MAX(TO_NUMBER(SUBSTR(LOP_ID, -4))), 0) + 1, 4, '0') AS LOP_ID
        FROM N2N.A_LOP
        WHERE SUBSTR(LOP_ID, 1, 4) = TO_CHAR(SYSDATE, 'YYYY')
        `;

        // console.log('Executing LOP_ID generation query...');

        const result = await db.query(query, {
            type: db.QueryTypes.SELECT
        });

        // console.log('Query result:', result);

        // Pastikan result ada dan tidak kosong
        if (!result || result.length === 0 || !result[0].LOP_ID) {
            throw new Error('No LOP_ID generated from query');
        }

        const lopId = result[0].LOP_ID;
        // console.log('Generated LOP_ID:', lopId);
        return lopId;

    } catch (error) {
        console.error('Error generating LOP_ID:', error.message);

        // Fallback: Generate dengan format tahun.RKAP.N.XXXX
        const tahun = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        const fallbackLopId = `${tahun}.RKAP.N.${timestamp}`;

        console.warn('Using fallback LOP_ID:', fallbackLopId);
        return fallbackLopId;
    }
};

exports.insertHBilling = async (payload, transaction) => {
    try {
        const result = await model.h_billing.create(payload, { transaction });
        return result
    } catch (error) {
        console.error("Error inserting task:", error);
        throw new Error("Failed to insert task.");
    }
}

exports.updateHBilling = async (payload) => {
    const { billing_id } = payload
    const result = await model.h_billing.update(payload, { where: { billing_id } })
    return result
}

exports.insertProductOwner = async (payload, transaction) => {
    try {
        const { projectId, poList, pid, poKodeList, user } = payload;

        /* ===============================
           STEP 1: AMBIL DATA EXISTING
           =============================== */
        const existingRows = await model.d_project_po.findAll({
            where: { project_id: projectId },
            transaction,
        });

        // Map PO_ID → FLAG_AKTIF
        const existingMap = new Map();
        for (const row of existingRows) {
            existingMap.set(row.po_id, row.flag_aktif);
        }

        /* ===============================
           STEP 2: INSERT / AKTIFKAN
           =============================== */
        for (let i = 0; i < poList.length; i++) {
            const poId = poList[i];
            const poKode = poKodeList[i]; // ambil kode sesuai index

            if (!existingMap.has(poId)) {
                // Belum ada → insert baru
                await model.d_project_po.create(
                    {
                        project_id: projectId,
                        pid_po: pid + poId,
                        po_id: poId,
                        po_kode: poKode,   // <<< DITAMBAHKAN DI SINI
                        flag_aktif: "Y",
                        created_by: user,
                        created_at: new Date(),
                    },
                    { transaction }
                );
            } else if (existingMap.get(poId) === "N") {
                // Ada tapi nonaktif → aktifkan
                await model.d_project_po.update(
                    {
                        flag_aktif: "Y",
                        updated_by: user,
                        updated_at: new Date(),
                    },
                    {
                        where: {
                            project_id: projectId,
                            po_id: poId,
                        },
                        transaction,
                    }
                );
            }
            // Jika sudah aktif → tidak perlu apa-apa
        }

        /* ===============================
           STEP 3: NONAKTIFKAN PO TIDAK DIKIRIM
           =============================== */
        const poSet = new Set(poList);

        for (const row of existingRows) {
            if (!poSet.has(row.po_id) && row.flag_aktif === "Y") {
                await model.d_project_po.update(
                    {
                        flag_aktif: "N",
                        po_kode: row.po_kode, // 🔥 WAJIB supaya tidak terjadi UniqueConstraintError
                        updated_by: user,
                        updated_at: new Date(),
                    },
                    {
                        where: { project_id: projectId, po_id: row.po_id },
                        transaction,
                    }
                );
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error inserting task:", error);
        throw new Error("Failed to insert task.");
    }
}

exports.getProductOwnerByPID = async (projectId) => {
    try {
        const results = await model.d_project_po.findAll({
            where: { project_id: projectId, flag_aktif: 'Y' },
            order: [["project_po_id", "ASC"]]
        });

        return results;
    } catch (error) {
        console.error("Error fetching Product Owner:", error);
        throw new Error("Failed to fetch Product Owner.");
    }
};

exports.getSummaryRevenueLop = async (payload) => {
    try {
        console.log('payload_getSummaryRevenueLop:', payload);

        const { periode } = payload;
        const [tahun, bulan] = periode ? periode.split('-') : [null, null];

        // Konversi bulan dari '01', '02', ... '12' menjadi '1', '2', ... '12'
        const bulanTanpaLeadingZero = bulan ? bulan.replace(/^0+/, '') : null;

        console.log('Parameters processed:', {
            tahun,
            bulanFromFE: bulan,
            bulanToDB: bulanTanpaLeadingZero
        });

        // Gunakan query asli tanpa perubahan
        const QUERY = query.getListSummaryLop;

        // Eksekusi untuk MTD (Month-To-Date)
        const mtdResult = await db.query(QUERY, {
            replacements: {
                TAHUN_EST: tahun || null,
                BULAN_EST: bulanTanpaLeadingZero || null,
                MODE: 'M'
            },
            type: db.QueryTypes.SELECT,
            logging: console.log
        });

        // Eksekusi untuk YTD (Year-To-Date)
        const ytdResult = await db.query(QUERY, {
            replacements: {
                TAHUN_EST: tahun || null,
                BULAN_EST: bulanTanpaLeadingZero || null,
                MODE: 'Y'
            },
            type: db.QueryTypes.SELECT,
            logging: console.log
        });

        // Eksekusi untuk YTD_CUMULATIVE (Januari sampai bulan yang ditentukan)
        const ytdCumulativeResult = await db.query(QUERY, {
            replacements: {
                TAHUN_EST: tahun || null,
                BULAN_EST: bulanTanpaLeadingZero || null,
                MODE: 'A' // Mode cumulative baru
            },
            type: db.QueryTypes.SELECT,
            logging: console.log
        });

        console.log('MTD Result count:', mtdResult.length);
        console.log('YTD Result count:', ytdResult.length);
        console.log('YTD Cumulative Result count:', ytdCumulativeResult.length);

        return {
            mtd: mtdResult,
            ytd: ytdResult,
            ytd_cumulative: ytdCumulativeResult // Tambahkan result cumulative
        };

    } catch (err) {
        console.error('Error in getSummaryRevenueLop:', err);
        throw err;
    }
};

exports.generatePIDbyJenisKontrak = async (projectNo) => {
    try {
        const query = `
            SELECT DEPAN || LPAD(NO,2,0) || BELAKANG AS PROJECT_NO,
                   LPAD(NO,2,0) AS CONTRACT_TYPE
            FROM (
                SELECT COUNT(PROJECT_NO) AS NO,
                       SUBSTR(PROJECT_NO, 1, 5) AS DEPAN,
                       SUBSTR(PROJECT_NO, 8, 4) AS BELAKANG
                FROM N2N.D_PROJECT
                WHERE SUBSTR(PROJECT_NO, 1, 5) = SUBSTR(:PROJECT_NO, 1, 5)
                  AND SUBSTR(PROJECT_NO, 8, 4) = SUBSTR(:PROJECT_NO, 8, 4)
                GROUP BY SUBSTR(PROJECT_NO, 1, 5),
                         SUBSTR(PROJECT_NO, 8, 4)
            )
        `;

        const result = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements: { PROJECT_NO: projectNo }
        });

        if (!result || result.length === 0 || !result[0].PROJECT_NO) {
            throw new Error('test error');
        }

        return result[0].PROJECT_NO;

    } catch (error) {
        console.error('Error generating:', error.message);
        return error;
    }
};

exports.generateChangeNo = async (projectId) => {
    try {
        const query = `
            SELECT COUNT(PROJECT_ID) AS CHANGE_NO FROM H_PROJECT_NO WHERE PROJECT_ID = :PROJECT_ID
        `;

        const result = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements: { PROJECT_ID: projectId }
        });

        if (!result || result.length === 0 || !result[0].CHANGE_NO) {
            throw new Error('test error');
        }

        return result[0].CHANGE_NO;

    } catch (error) {
        console.error('Error generating:', error.message);
        return error;
    }
};

exports.generateNoRef = async (now) => {
    const QUERY = query.generateNoRef.replace(/:now/g, now)
    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.insertHDocReq = async (payload, transaction) => {
    const result = await model.h_doc_req.create(payload, { transaction })

    return {
        ...result.dataValues
    }
}

exports.updateHDocReq = async (payload) => {
    const { req_id } = payload
    const result = await model.h_doc_req.update(payload, { where: { req_id } })
    return await helpers.processUpdate(result)
}

exports.getListNoProject = async (payload) => {
    try {
        console.log('payload getListNoProject: ', payload);

        const { keyword } = payload;
        let conditionHeader = '';
        let replacements = {};

        if (keyword) {
            conditionHeader += ` AND upper(A.PROJECT_NO) LIKE upper(:keyword)`;
            replacements.keyword = `%${keyword}%`;
        }

        const QUERY = query.getListNoProject
            .replace(/:conditionHeader/g, conditionHeader);

        const result = await db.query(QUERY, {
            replacements,
            type: db.QueryTypes.SELECT
        });

        return result;

    } catch (err) {
        console.error(err);
        throw err;
    }
};

exports.createLOPFromProject = async (payload) => {
    const transaction = await db.transaction();

    try {
        const { paramsProjectNo } = payload;

        const [project] = await db.query(query.getProjectByNo, {
            replacements: { paramsProjectNo },
            type: db.QueryTypes.SELECT,
            transaction
        });

        if (!project) {
            throw new Error('PROJECT_NO tidak ditemukan');
        }

        // 🔥 Generate LOP_ID
        const [counter] = await db.query(
            `
            SELECT 
                TO_CHAR(SYSDATE,'YYYY') || '.RKAP.N.' ||
                LPAD(
                    NVL(
                        MAX(TO_NUMBER(SUBSTR(LOP_ID, -4))),
                        0
                    ) + 1,
                    4,
                    '0'
                ) AS LOP_ID
            FROM A_LOP
            WHERE LOP_ID LIKE TO_CHAR(SYSDATE,'YYYY') || '.RKAP.N.%'
            `,
            {
                type: db.QueryTypes.SELECT,
                transaction
            }
        );

        const lopId = counter.LOP_ID;

        // 🔥 Insert
        await db.query(query.createLOPFromProject, {
            replacements: {
                lop_id: lopId,
                paramsProjectNo
            },
            type: db.QueryTypes.INSERT,
            transaction
        });

        // 🔥 Update Project
        await db.query(query.updateProjectLOP, {
            replacements: {
                lop_id: lopId,
                project_id: project.PROJECT_ID
            },
            type: db.QueryTypes.UPDATE,
            transaction
        });

        await transaction.commit();

        return {
            LOP_ID: lopId,
            PROJECT_ID: project.PROJECT_ID
        };

    } catch (err) {
        await transaction.rollback();
        console.error(err);
        throw err;
    }
};

exports.exportBillingLOPExcel = async (params) => {
    const payload = { ...params, page: 1, limit: 1000000 }

    const data = await exports.getListBillingLOPNew(payload)

    if (!data?.list_data_header?.length) {
        throw new Error('Data Billing LOP kosong')
    }

    const workbook = new ExcelJS.Workbook()

    /* =======================
     * SHEET HEADER
     * ======================= */
    const sheetHeader = workbook.addWorksheet('HEADER')

    sheetHeader.columns = [
        { header: 'NO', key: 'NO', width: 6 },
        { header: 'LOP_ID_HEADER', key: 'LOP_ID', width: 20 },
        { header: 'PROJECT_ID', key: 'PROJECT_NO', width: 18 },
        { header: 'NAMA_PROJECT', key: 'PROJECT_NAME', width: 30 },
        { header: 'JENIS_LOP', key: 'JENIS_LOP', width: 14 },
        { header: 'CUSTOMER_ID', key: 'CUSTOMER_NAME', width: 30 },
        { header: 'PORTOFOLIO', key: 'PORTOFOLIO', width: 20 },
        { header: 'SPUC', key: 'KD_SPUC', width: 12 },
        { header: 'AM', key: 'AM', width: 15 },
        { header: 'CATEGORY', key: 'CATEGORY', width: 15 },
        { header: 'PRODUCT_OWNER', key: 'PRODUCT_OWNER', width: 20 },
        { header: 'NOMINAL_CONTRACT', key: 'NOMINAL_CONTRACT', width: 18 },
        { header: 'COGS_CONTRACT', key: 'COGS_CONTRACT', width: 18 },
        { header: 'MARGIN_CONTRACT', key: 'MARGIN_CONTRACT', width: 18 },
        { header: 'NILAI_REVENUE', key: 'NILAI_REVENUE', width: 18 },
        { header: 'NILAI_COGS', key: 'NILAI_COGS', width: 18 },
        { header: 'NILAI_LABA', key: 'NILAI_LABA', width: 18 }
    ]

    data.list_data_header.forEach((h, i) => {
        sheetHeader.addRow({
            NO: i + 1,
            LOP_ID: h.LOP_ID,
            PROJECT_NO: h.PROJECT_NO,
            PROJECT_NAME: h.PROJECT_NAME,
            JENIS_LOP: h.JENIS_LOP,
            CUSTOMER_NAME: h.CUSTOMER_NAME,
            PORTOFOLIO: h.PORTOFOLIO,
            KD_SPUC: h.KD_SPUC,
            AM: h.AM,
            CATEGORY: h.CATEGORY,
            PRODUCT_OWNER: h.PRODUCT_OWNER,
            NOMINAL_CONTRACT: h.NOMINAL_CONTRACT,
            COGS_CONTRACT: h.COGS_CONTRACT,
            MARGIN_CONTRACT: h.MARGIN_CONTRACT,
            NILAI_REVENUE: h.NILAI_REVENUE,
            NILAI_COGS: h.NILAI_COGS,
            NILAI_LABA: h.NILAI_LABA
        })
    })

    sheetHeader.getRow(1).font = { bold: true }

    /* =======================
     * SHEET DETAIL
     * ======================= */
    const sheetDetail = workbook.addWorksheet('DETAIL')

    /* HEADER ROW 1 */
    sheetDetail.addRow([
        'No',
        'LOP ID',
        'LOP ID DETAIL',
        'BILLING ID',
        'Project ID',
        'Nama Project',
        'Nama Customer',
        'Portfolio',
        'SPUC',
        'Status LOP',
        'Submit Potter',
        'Planning', '', '', '', '', '', '', '',
        'Realisasi', '', '', '', '', '', '', '', ''
    ])

    /* HEADER ROW 2 */
    sheetDetail.addRow([
        '', '', '', '', '', '', '', '', '', '', '',
        'Nilai Project',
        'COGS Project',
        'Margin Project',
        'Periode Revenue',
        'Termin',
        'Nilai Revenue Termin',
        'COGS Termin',
        'Laba Termin',

        'Periode Revenue',
        'Termin',
        'Nilai Revenue Termin',
        'COGS Termin',
        'Laba Termin',
        'Status Billing',
        'Status Revenue',
        'Keterangan',
        'Status Project'
    ])

    /* =========================
       MERGE HEADER
    ========================= */

    // kiri (11 kolom karena ada BILLING ID)
    for (let i = 1; i <= 11; i++) {
        sheetDetail.mergeCells(1, i, 2, i)
    }

    // Planning (shift +1)
    sheetDetail.mergeCells('L1:S1')

    // Realisasi (shift +1)
    sheetDetail.mergeCells('T1:AB1')

    /* =========================
       STYLE HEADER
    ========================= */
    const header1 = sheetDetail.getRow(1)
    const header2 = sheetDetail.getRow(2)

    header1.font = { bold: true }
    header2.font = { bold: true }

    header1.alignment = { vertical: 'middle', horizontal: 'center' }
    header2.alignment = { vertical: 'middle', horizontal: 'center' }

    /* =========================
       COLUMN WIDTH
    ========================= */
    sheetDetail.columns = [
        { key: 'NO', width: 6 },
        { key: 'LOP_ID', width: 20 },
        { key: 'LOP_DETAIL_ID', width: 22 },
        { key: 'BILLING_ID', width: 22 },
        { key: 'PROJECT_NO', width: 18 },
        { key: 'PROJECT_NAME', width: 35 },
        { key: 'CUSTOMER_NAME', width: 30 },
        { key: 'PORTOFOLIO', width: 18 },
        { key: 'KD_SPUC', width: 12 },
        { key: 'STATUS_LOP', width: 12 },
        { key: 'SUBMIT_POTTER', width: 15 },

        { key: 'NILAI_PROJECT_EST', width: 18 },
        { key: 'COGS_PROJECT_EST', width: 18 },
        { key: 'MARGIN_PROJECT_EST', width: 15 },
        { key: 'PERIODE_EST', width: 18 },
        { key: 'TERMIN_EST', width: 10 },
        { key: 'NILAI_EST', width: 18 },
        { key: 'COGS_EST', width: 18 },
        { key: 'LABA_EST', width: 18 },

        { key: 'PERIODE_REAL', width: 18 },
        { key: 'TERMIN_REAL', width: 10 },
        { key: 'NILAI_REAL', width: 18 },
        { key: 'COGS_REAL', width: 18 },
        { key: 'LABA_REAL', width: 18 },
        { key: 'STATUS_BILLING', width: 15 },
        { key: 'STATUS_REVENUE', width: 15 },
        { key: 'KETERANGAN', width: 25 },
        { key: 'STATUS_PROJECT', width: 15 }
    ]

    /* =========================
       DATA
    ========================= */
    let noDetail = 1

    data.list_data.forEach(h => {
        sheetDetail.addRow({
            NO: noDetail++,
            LOP_ID: h.LOP_ID,
            LOP_DETAIL_ID: h.LOP_DETAIL_ID,
            BILLING_ID: h.BILLING_CODE,
            PROJECT_NO: h.PROJECT_NO,
            PROJECT_NAME: h.PROJECT_NAME,
            CUSTOMER_NAME: h.CUSTOMER_NAME,
            PORTOFOLIO: h.PORTOFOLIO,
            KD_SPUC: h.KD_SPUC,
            STATUS_LOP: h.STATUS_LOP === 'Y' ? 'Yes' : 'No',
            SUBMIT_POTTER: h.SUBMIT_POTTER === 'Y' ? 'Yes' : 'No',

            NILAI_PROJECT_EST: h.NILAI_PROJECT_EST,
            COGS_PROJECT_EST: h.COGS_PROJECT_EST,
            MARGIN_PROJECT_EST: h.MARGIN_PROJECT_EST,

            PERIODE_EST: `${h.TAHUN_EST}-${String(h.BULAN_EST).padStart(2, '0')}`,
            TERMIN_EST: h.TERMIN,
            NILAI_EST: h.NILAI_EST,
            COGS_EST: h.COGS_EST,
            LABA_EST: h.LABA_EST,

            PERIODE_REAL: `${h.TAHUN_REAL}-${String(h.BULAN_REAL).padStart(2, '0')}`,
            TERMIN_REAL: h.TERMIN,
            NILAI_REAL: h.NILAI_REAL,
            COGS_REAL: h.COGS_REAL,
            LABA_REAL: h.LABA_REAL,

            STATUS_BILLING: h.STATUS_BILLING,
            STATUS_REVENUE: h.STATUS_REVENUE,
            KETERANGAN: h.KETERANGAN,
            STATUS_PROJECT: h.STATUS_PROJECT
        })
    })

    return workbook
}

exports.exportBillingLOPExcelNew = async (params) => {
    const payload = { ...params, page: 1, limit: 1000000 }

    const data = await exports.getListBillingLOPNew(payload)

    if (!data?.list_data_header?.length) {
        throw new Error('Data Billing LOP kosong')
    }

    const workbook = new ExcelJS.Workbook()

    /* =======================
     * SHEET HEADER
     * ======================= */
    const sheetHeader = workbook.addWorksheet('HEADER')

    sheetHeader.columns = [
        { header: 'NO', key: 'NO', width: 6 },
        { header: 'LOP_ID_HEADER', key: 'LOP_ID', width: 20 },
        { header: 'PROJECT_ID', key: 'PROJECT_NO', width: 18 },
        { header: 'NAMA_PROJECT', key: 'PROJECT_NAME', width: 30 },
        { header: 'JENIS_LOP', key: 'JENIS_LOP', width: 14 },
        { header: 'CUSTOMER_ID', key: 'CUSTOMER_NAME', width: 30 },
        { header: 'PORTOFOLIO', key: 'PORTOFOLIO', width: 20 },
        { header: 'SPUC', key: 'KD_SPUC', width: 12 },
        { header: 'AM', key: 'AM', width: 15 },
        { header: 'CATEGORY', key: 'CATEGORY', width: 15 },
        { header: 'PRODUCT_OWNER', key: 'PRODUCT_OWNER', width: 20 },
        { header: 'NOMINAL_CONTRACT', key: 'NOMINAL_CONTRACT', width: 18 },
        { header: 'COGS_CONTRACT', key: 'COGS_CONTRACT', width: 18 },
        { header: 'MARGIN_CONTRACT', key: 'MARGIN_CONTRACT', width: 18 },
        { header: 'NILAI_REVENUE', key: 'NILAI_REVENUE', width: 18 },
        { header: 'NILAI_COGS', key: 'NILAI_COGS', width: 18 },
        { header: 'NILAI_LABA', key: 'NILAI_LABA', width: 18 }
    ]

    data.list_data_header.forEach((h, i) => {
        sheetHeader.addRow({
            NO: i + 1,
            LOP_ID: h.LOP_ID,
            PROJECT_NO: h.PROJECT_NO,
            PROJECT_NAME: h.PROJECT_NAME,
            JENIS_LOP: h.JENIS_LOP,
            CUSTOMER_NAME: h.CUSTOMER_NAME,
            PORTOFOLIO: h.PORTOFOLIO,
            KD_SPUC: h.KD_SPUC,
            AM: h.AM,
            CATEGORY: h.CATEGORY,
            PRODUCT_OWNER: h.PRODUCT_OWNER,
            NOMINAL_CONTRACT: h.NOMINAL_CONTRACT,
            COGS_CONTRACT: h.COGS_CONTRACT,
            MARGIN_CONTRACT: h.MARGIN_CONTRACT,
            NILAI_REVENUE: h.NILAI_REVENUE,
            NILAI_COGS: h.NILAI_COGS,
            NILAI_LABA: h.NILAI_LABA
        })
    })

    sheetHeader.getRow(1).font = { bold: true }

    /* =======================
     * SHEET DETAIL
     * ======================= */
    const sheetDetail = workbook.addWorksheet('DETAIL')

    /*
     * Peta kolom final (total 23 kolom):
     *
     * Kolom tetap (A–I) = 9 kolom:
     *   A(1):  NO
     *   B(2):  No LOP
     *   B(3):  No PID
     *   C(4):  No LOP Detail
     *   D(5):  No Billing ID
     *   E(6):  Nama Project
     *   F(7):  SPUC
     *   G(8):  Customer
     *   H(9):  Portofolio
     *   I(10):  Status
     *
     * Planning RKAP (J–N) = 5 kolom:
     *   J(11): Periode
     *   K(12): Tahun
     *   L(13): Revenue
     *   M(14): COGS
     *   N(15): Laba
     *
     * Realisasi (O–V) = 8 kolom:
     *   O(16): Periode
     *   P(17): Tahun
     *   Q(18): Status Revenue (Yes/No)
     *   R(19): Revenue
     *   S(20): COGS
     *   T(21): Laba
     *   U(22): Nominal Invoice
     *   V(23): Deviasi
     */

    /* HEADER ROW 1
     * - Kolom tetap A–I diisi label (akan di-merge ke bawah)
     * - Kolom J diisi label group "Planning (RKAP)" (akan di-merge ke kanan s/d N)
     * - Kolom O diisi label group "Realisasi" (akan di-merge ke kanan s/d V)
     * - Sisanya kosong karena masuk area merge
     */
    sheetDetail.addRow([
        'NO',               // A1
        'No LOP',           // B1
        'No PID',           // C1
        'No LOP Detail',    // D1
        'No Billing ID',    // E1
        'Nama Project',     // F1
        'SPUC',             // G1
        'Customer',         // H1
        'Portofolio',       // I1
        'Status',           // J1
        'Planning (RKAP)',  // K1 — di-merge sampai N1
        '',                 // L1 (area merge)
        '',                 // M1 (area merge)
        '',                 // N1 (area merge)
        '',                 // O1 (area merge)
        'Realisasi',        // P1 — di-merge sampai V1
        '',                 // Q1 (area merge)
        '',                 // R1 (area merge)
        '',                 // S1 (area merge)
        '',                 // T1 (area merge)
        '',                 // U1 (area merge)
        '',                 // V1 (area merge)
        ''                  // W1 (area merge)
    ])

    /* HEADER ROW 2
     * - Kolom A–I kosong karena sudah di-merge dengan baris 1
     * - Sub-header Planning dan Realisasi diisi di kolom masing-masing
     */
    sheetDetail.addRow([
        '',                         // A2 (area merge dengan A1)
        '',                         // B2 
        '',                         // C2
        '',                         // D2
        '',                         // E2
        '',                         // F2
        '',                         // G2
        '',                         // H2
        '',                         // I2
        '',                         // J2
        'Periode',                  // K2
        'Tahun',                    // L2
        'Revenue',                  // M2
        'COGS',                     // N2
        'Laba',                     // O2
        'Periode',                  // P2
        'Tahun',                    // Q2
        'Status Revenue\n(Yes/No)', // R2
        'Revenue',                  // S2
        'COGS',                     // T2
        'Laba',                     // U2
        'Nominal Invoice',          // V2
        'Deviasi',                  // W2             
    ])

    /* =========================
       MERGE HEADER
       — Urutan: merge kolom tetap dulu (A–I),
         baru merge group header (J dan O).
         Tidak boleh ada sel yang di-merge dua kali.
    ========================= */

    // Kolom tetap A–I: merge row1 & row2 (kolom 1 s/d 9)
    for (let col = 1; col <= 9; col++) {
        sheetDetail.mergeCells(1, col, 2, col)
    }

    // Group "Planning (RKAP)": J1:N1 (kolom 10 s/d 14)
    sheetDetail.mergeCells('K1:M1')

    // Group "Realisasi": O1:V1 (kolom 15 s/d 22)
    sheetDetail.mergeCells('P1:W1')

    /* =========================
       STYLE HEADER
    ========================= */
    const header1 = sheetDetail.getRow(1)
    const header2 = sheetDetail.getRow(2)

    header1.font = { bold: true }
    header2.font = { bold: true }

    header1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    header2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    // Warna Planning (RKAP) — hijau, kolom J–N (10–14)
    const planningColor = 'baffc9'
    for (let col = 10; col <= 14; col++) {
        sheetDetail.getCell(1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: planningColor } }
        sheetDetail.getCell(2, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: planningColor } }
    }

    // Warna Realisasi — merah, kolom O–V (15–22)
    const realisasiColor = 'ffb3ba'
    for (let col = 15; col <= 23; col++) {
        sheetDetail.getCell(1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: realisasiColor } }
        sheetDetail.getCell(2, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: realisasiColor } }
    }

    sheetDetail.getRow(1).height = 30
    sheetDetail.getRow(2).height = 30

    /* =========================
       COLUMN WIDTH
       — Key harus unik. Untuk kolom Periode/Tahun
         yang muncul dua kali, gunakan key berbeda:
         PERIODE_EST / TAHUN_EST dan PERIODE_REAL / TAHUN_REAL
    ========================= */
    sheetDetail.columns = [
        { key: 'NO', width: 6 },             // A
        { key: 'LOP_ID', width: 20 },        // B
        { key: 'PROJECT_NO', width: 20 },        // B
        { key: 'LOP_DETAIL_ID', width: 22 }, // C
        { key: 'BILLING_ID', width: 22 },    // D
        { key: 'PROJECT_NAME', width: 35 },  // E
        { key: 'KD_SPUC', width: 12 },       // F
        { key: 'CUSTOMER_NAME', width: 30 }, // G
        { key: 'PORTOFOLIO', width: 18 },    // H
        { key: 'STATUS_LOP', width: 10 },    // I

        // Planning RKAP
        { key: 'PERIODE_EST', width: 14 },   // J
        { key: 'TAHUN_EST', width: 10 },     // K
        { key: 'REVENUE_PLAN', width: 18 },  // L
        { key: 'COGS_PLAN', width: 18 },     // M
        { key: 'LABA_PLAN', width: 18 },     // N

        // Realisasi
        { key: 'PERIODE_REAL', width: 14 },  // O
        { key: 'TAHUN_REAL', width: 10 },    // P
        { key: 'STATUS_REVENUE', width: 16 },// Q
        { key: 'REVENUE_REAL', width: 18 },  // R
        { key: 'COGS_REAL', width: 18 },     // S
        { key: 'LABA_REAL', width: 18 },     // T
        { key: 'NOMINAL_INVOICE', width: 18 },// U
        { key: 'DEVIASI', width: 18 }        // V
    ]

    /* =========================
       DATA
    ========================= */
    let noDetail = 1

    data.list_data.forEach(h => {
        sheetDetail.addRow({
            NO: noDetail++,
            LOP_ID: h.LOP_ID,
            PROJECT_NO: h.PROJECT_NO,
            LOP_DETAIL_ID: h.LOP_DETAIL_ID,
            BILLING_ID: h.BILLING_CODE,
            PROJECT_NAME: h.PROJECT_NAME,
            KD_SPUC: h.KD_SPUC,
            CUSTOMER_NAME: h.CUSTOMER_NAME,
            PORTOFOLIO: h.PORTOFOLIO,
            STATUS_LOP: h.STATUS_LOP === 'Y' ? 'Yes' : 'No',

            // Planning RKAP
            PERIODE_EST: h.BULAN_EST,
            TAHUN_EST: h.TAHUN_EST,
            REVENUE_PLAN: h.NILAI_EST,
            COGS_PLAN: h.COGS_EST,
            LABA_PLAN: h.LABA_EST,

            // Realisasi
            PERIODE_REAL: h.BULAN_REAL,
            TAHUN_REAL: h.TAHUN_REAL,
            STATUS_REVENUE: h.STATUS_REVENUE === 'Y' ? 'Yes' : 'No',
            REVENUE_REAL: h.NILAI_REAL,
            COGS_REAL: h.COGS_REAL,
            LABA_REAL: h.LABA_REAL,
            NOMINAL_INVOICE: h.NOMINAL_INVOICE,
            DEVIASI: h.DEVIASI
        })
    })

    return workbook
}

async function downloadFile(url, outputPath) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
}

exports.stampUlang = async (payload) => {
    try {
        const { unsigned_url, stamp_url } = payload;

        if (!unsigned_url || !stamp_url) {
            throw new Error('URL tidak lengkap');
        }

        // temp folder (boleh auto create)
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const unsignedTempPath = path.join(
            tempDir,
            path.basename(unsigned_url)
        );

        const stampTempPath = path.join(
            tempDir,
            path.basename(stamp_url)
        );

        // download file
        await downloadFile(unsigned_url, unsignedTempPath);
        await downloadFile(stamp_url, stampTempPath);

        // load PDF
        const pdfBytes = fs.readFileSync(unsignedTempPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // load image
        const stampBytes = fs.readFileSync(stampTempPath);
        const ext = path.extname(stampTempPath).toLowerCase();

        const stampImage =
            ext === '.png'
                ? await pdfDoc.embedPng(stampBytes)
                : await pdfDoc.embedJpg(stampBytes);

        const pages = pdfDoc.getPages();
        const page = pages[pages.length - 1];
        const { width } = page.getSize();

        page.drawImage(stampImage, {
            x: width - 265, // geser kiri 100px
            y: 80,
            width: 80,
            height: 80
        });

        // ===== SIMPAN KE SHAREFOLDER/SIGNED =====
        const signedDir = path.join(process.cwd(), 'sharefolder', 'SIGNED');

        if (!fs.existsSync(signedDir)) {
            throw new Error('Folder SIGNED tidak ditemukan');
        }

        // contoh nama: INV-XXXXXX.pdf
        const baseName = path.parse(unsignedTempPath).name;
        const signedName = `INV-${payload?.billing_code}-${payload?.waktu}.pdf`;
        const signedPath = path.join(signedDir, signedName);

        const signedPdf = await pdfDoc.save();
        fs.writeFileSync(signedPath, signedPdf);

        // cleanup
        fs.unlinkSync(unsignedTempPath);
        fs.unlinkSync(stampTempPath);

        return {
            message: 'PDF berhasil distamp',
            signed_file: signedName,
            signed_path: signedPath
        };

    } catch (err) {
        console.error(err);
        throw err;
    }
};

exports.getListBillingFakturPajak = async ({ keyword, page, limit, order = 'DESC', periode, kd_status }, body) => {
    let year = null;
    let month = null;

    if (periode) {
        const [mm, yyyy] = periode.split('-');
        month = mm;
        year = yyyy;
    }

    console.log("MONTH :", month)
    console.log("YEAR :", year)

    const QUERY = query.getListBillingFakturPajak;

    const result = await db.query(QUERY, {
        replacements: {
            year,
            month
        },
        type: db.QueryTypes.SELECT
    });

    const querySummary = query.getSummaryDendaFakturPajak;

    const summaryRaw = await db.query(querySummary, {
        replacements: {
            year,
            month
        },
        type: db.QueryTypes.SELECT
    });

    const summary = {
        CTDS: { monthly: 0, ytd: 0 },
        ETDS: { monthly: 0, ytd: 0 },
        LHDS: { monthly: 0, ytd: 0 },
        MPDS: { monthly: 0, ytd: 0 },
        MTDS: { monthly: 0, ytd: 0 },
        TOTAL: { monthly: 0, ytd: 0 }
    };

    summaryRaw.forEach(item => {
        const spuc = (item.SPUC || '').toUpperCase().trim();

        const monthly = Math.round(Number(item.TOTAL_DENDA_MONTHLY) || 0);
        const ytd = Math.round(Number(item.TOTAL_DENDA_YTD) || 0);

        if (summary[spuc]) {
            summary[spuc].monthly = monthly;
            summary[spuc].ytd = ytd;
        }

        summary.TOTAL.monthly += monthly;
        summary.TOTAL.ytd += ytd;
    });

    const statusData = result.length > 0;

    return statusData
        ? {
            data: result,
            summary
        }
        : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        };
};

exports.getListNoFakturExcel = async ({ keyword, page, limit, order = 'DESC', status, divisi, periode, statusDokumen, wajibFaktur, billing_id, stBilling }, body) => {
    let conditionPeriode = ''
    let mm = ''
    let yyyy = ''
    let kdStatusJurnal = ''
    let formattedPeriode = '';
    let billingCondition = '';

    status = status == "1" ? "AND B.NO_FAKTUR IS NOT NULL AND B.NO_FAKTUR <> '-'"
        : status === "0"
            ? "AND (B.NO_FAKTUR IS NULL OR B.NO_FAKTUR = '-')"
            : "";

    if (billing_id) {
        billingCondition += ` AND A.BILLING_ID = '${billing_id}' `
    }

    divisi = !divisi ? `` : `AND C.KD_SPUC LIKE '%${divisi}%'`
    if (periode && !keyword) {
        const [month, year] = periode.split('-');
        // console.log(year, "<<< year");
        // console.log(month, "<<< month");

        conditionPeriode = `AND TO_DATE('01-' || LPAD(NVL(A.REAL_BULAN_BILLING, '01'), 2, '0') || '-' || NVL(A.REAL_PERIODE_BILLING, '1900'), 'DD-MM-YYYY' ) = TO_DATE('01-'||'${month}-${year}', 'DD-MM-YYYY')`
        mm = month
        yyyy = year
    }
    // console.log("MM",mm)
    // console.log("YYYY",yyyy)

    let dokumen = statusDokumen == "1" ? "AND (DOK.URL_FAKTUR_PGNT IS NOT NULL OR DOK.URL_FAKTUR_AWAL IS NOT NULL)"
        : statusDokumen === "0"
            ? "AND (DOK.URL_FAKTUR_PGNT IS NULL OR DOK.URL_FAKTUR_AWAL IS NULL)"
            : "";

    let wajib_faktur = (wajibFaktur && wajibFaktur !== '') ? ` AND B.FLAG_FAKTUR = '${wajibFaktur}' ` : '';

    keyword = !keyword ? `` : `AND A.BILLING_CODE like '%${keyword}%'`
    console.log("CEK ST", stBilling)
    if (!mm && !yyyy) {
        mm = '10'
        yyyy = '2000'
    }
    if (stBilling) {
        kdStatusJurnal = `AND A.KD_STATUS IN ('402', '403')`

    }
    // console.log("PERIODE2 :", conditionPeriode)
    const QUERY = query.getListNoFakturExcel
        .replace(/:billingCondition/g, billingCondition)
        .replace(/:month/g, mm)
        .replace(/:periode/g, conditionPeriode)
        .replace(/:divisi/g, divisi)
        .replace(/:status/g, status)
        .replace(/:wajib_faktur/g, wajib_faktur)
        .replace(/:keyword/g, keyword)
        .replace(/:dokumen/g, dokumen)
        .replace(/:kdStatusJurnal/g, kdStatusJurnal)
        .replace(/:year/g, yyyy)


    const result = await db.query(QUERY, {
        replacements: {
            page: page,
            limit: limit
        },
        // logging: console.log,
        type: db.QueryTypes.SELECT
    })


    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            data: result
        } : {
            data: []
        }
};

exports.insertRKeuangan = async (payload, transaction) => {
    try {
        await db.query(
            `BEGIN
            SP_INSERT_R_KEUANGAN(:p1, :p2, :p3, :p4);
        END;`,
            {
                replacements: {
                    p1: payload?.no_dokumen,
                    p2: payload?.no_lampiran || '',
                    p3: payload?.jns_dokumen,
                    p4: payload?.event_code
                },
                transaction
            }
        );

        return {
            status: true,
            message: "Berhasil insert via SP"
        };
    } catch (error) {
        console.error("Error inserting r finance:", error);
        throw new Error("Failed to insert r keuangan.");
    }
}

exports.updateRKeuangan = async (payload) => {
    try {
        await db.query(
            `BEGIN
            SP_UPDATE_R_KEUANGAN(:p1, :p2, :p3, :p4, :p5);
        END;`,
            {
                replacements: {
                    p1: payload?.no_dokumen || '',
                    p2: payload?.no_ref || '',
                    p3: payload?.dokumen_id,
                    p4: moment().format("YYYY-MM-DD HH:mm:ss"),
                    p5: payload?.is_condition,
                }
            }
        );

        return {
            status: true,
            message: "Berhasil insert via SP"
        };
    } catch (error) {
        console.error("Error inserting r finance:", error);
        throw new Error("Failed to insert r keuangan.");
    }
}

exports.insertDokumenApproval = async (payload, transaction) => {
    try {
        const result = await model.d_dokumen_approval.create(payload, { transaction });
        return result
    } catch (error) {
        console.error("Error inserting dok approval:", error);
        throw new Error("Failed to insert dok approval.");
    }
}

exports.updateDokumenApproval = async (payloadData, whereCondition) => {
    const result = await model.d_dokumen_approval.update(
        payloadData,
        { where: whereCondition }
    );

    return result;
}

exports.getDokumenByNoRef = async (nomor_referensi) => {
    const result = await model.d_dokumen.findOne({
        where: {
            jns_dokumen: '08001',
            no_ref: nomor_referensi
        },
        raw: true
    });

    return result;
}

exports.getListBillingCode = async (payload) => {
    try {
        console.log('payload getListBillingCode: ', payload);

        const { billing_code } = payload;

        let condition = '';
        let replacements = {};

        if (billing_code) {
            condition += ` AND A.BILLING_CODE = :billing_code`;
            replacements.billing_code = billing_code;
        }

        const QUERY = query.getListBillingCode
            .replace(/:condition/g, condition);

        const result = await db.query(QUERY, {
            replacements,
            type: db.QueryTypes.SELECT
        });

        return result;

    } catch (err) {
        console.error(err);
        throw err;
    }
};

exports.getListPID = async (PID) => {
    try {

        const result = await db.query(`
            WITH AKSELERASI AS (SELECT PROJECT_ID, PROJECT_NO, PROJECT_NAME
                                FROM D_PROJECT
                                WHERE PROJECT_ACTUAL_ID = :project_id),
                PROJECT AS (SELECT PROJECT_ID, PROJECT_NO, PROJECT_NAME
                            FROM D_PROJECT
                            WHERE PROJECT_ID = :project_id)
            SELECT *
            FROM AKSELERASI
            UNION ALL
            SELECT *
            FROM PROJECT
            WHERE NOT EXISTS (SELECT 1 FROM AKSELERASI)
        `, {
            bind: {
                project_id: PID,
            },
            type: db.QueryTypes.SELECT,
            // logging: console.log,
        })


        return {
            "status": result.length ? true : false,
            "message": result.length ? "Success" : "Data Not Found",
            "data": result
        }
    } catch (error) {
        return {
            "status": false,
            "message": error.message,
            "data": []
        }
    }
}
exports.updateStokMaterai = async (payload) => {
    const data = await model.m_materai.findOne({ where: { jenis_materai: payload.jenis_materai }, raw: true })
    const result = await model.m_materai.update(payload, { where: { id_materai: data?.id_materai } })
    return await helpers.processUpdate(result)
}

exports.getListAllBillingForLop = async ({ keyword, project_id, project_no, billing_id }) => {
    const order_by = 'ORDER BY a.BILLING_CODE ASC';
    console.log("BILLING ID ", billing_id)
    let condition = '';
    if (keyword) {
        condition += ` AND (a.PROJECT_ID = '${project_id}' OR b.PROJECT_NO = '${project_no}') AND (upper(a.BILLING_CODE) like upper('%${keyword}%')) `
    }
    if (billing_id) {
        condition += ` AND a.BILLING_ID = '${billing_id}' `
    }


    const QUERY = query.getListAllBillingForLop
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const listBilling = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // logging: true,
    })

    return listBilling
}

exports.deleteRKeuangan = async (dokumen_id) => {
    const result = await model.r_keuangan.destroy({ where: { dokumen_id } })
    return await helpers.processDelete(result)
}

exports.getLayoutBeritaAcara = async (data) => {
    try {
        let html = `
            <table width="100%">
                <tr>
                    <td colspan="4" class="text-align: justify;">
                        Pada hari ini, ${data.hari_ini.hari}, tanggal ${data.hari_ini.tanggal} bulan ${data.hari_ini.bulan} tahun ${data.hari_ini.tahun} (${data.hari_ini.final_date}) yang bertanda tangan di bawah ini :
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td width="4%" class="text-align: right;">1.</td>
                    <td width="10%">Nama</td>
                    <td width="1%">:</td>
                    <td width="85%">${data.penandatangan_1.map((p) => p.nama).join(", ")}</td>
                </tr>
                <tr>
                    <td></td>
                    <td>Jabatan</td>
                    <td>:</td>
                    <td>${data.penandatangan_1.map((p) => p.jabatan).join(", ")}</td>
                </tr>
                <tr>
                    <td></td>
                    <td>Alamat</td>
                    <td>:</td>
                    <td>${data.penandatangan_1.map((p) => p.alamat).join(", ")}</td>
                </tr>

                <tr>
                    <td></td>
                    <td colspan="3" class="text-align: justify;">
                        Dalam hal ini bertindak untuk dan atas nama ${data.nama_customer || ""}, untuk selanjutnya disebut <b>PIHAK PERTAMA</b>.
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td class="text-align: right;">2.</td>
                    <td>Nama</td>
                    <td>:</td>
                    <td>${data.penandatangan_2.map((p) => p.nama).join(", ")}</td>
                </tr>
                <tr>
                    <td></td>
                    <td>Jabatan</td>
                    <td>:</td>
                    <td>${data.penandatangan_2.map((p) => p.jabatan).join(", ")}</td>
                </tr>
                <tr>
                    <td></td>
                    <td>Alamat</td>
                    <td>:</td>
                    <td>${data.penandatangan_2.map((p) => p.alamat).join(", ")}</td>
                </tr>

                <tr>
                    <td></td>
                    <td colspan="3" class="text-align: justify;">
                        Dalam hal ini bertindak untuk dan atas nama PT Integrasi Logistik Cipta Solusi, untuk selanjutnya disebut <b>PIHAK KEDUA</b>.
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td colspan="4" class="text-align: justify;">
                        <b>PIHAK PERTAMA</b> dan <b>PIHAK KEDUA</b> untuk selanjutnya secara bersama-sama disebut <b>PARA PIHAK</b>, dan secara individu disebut <b>PIHAK</b>.
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td width="4%">I.</td>
                    <td colspan="3"><b>BERDASARKAN</b></td>
                </tr>

                <tr>
                    <td></td>
                    <td colspan="3">
                        <table width="100%">
                            <tr>
                                <td width="2%" valign="top">a.</td>
                                <td>Surat Perjanjian Nomor : ${data.nomor_kontrak || ""} tanggal ${data.tanggal_kontrak || ""} tentang ${data.nama_pekerjaan || ""}.</td>
                            </tr>
                            <tr>
                                <td valign="top">b.</td>
                                <td>Berita Acara Nomor : ${data.nomor_bamk || ""} tanggal ${data.tanggal_bamk || ""} tentang Mulai Kerja ${data.nama_pekerjaan || ""}.</td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td colspan="4">PARA PIHAK terlebih dahulu menerangkan hal-hal sebagai berikut :</td>
                </tr>

                <tr>
                    <td></td>
                    <td colspan="3">
                        <table width="100%">
                            <tr>
                                <td width="2%" valign="top">a.</td>
                                <td>
                                    Bahwa <b>PIHAK KEDUA</b> telah melaksanakan pekerjaan ${data.nama_pekerjaan || ""} dari <b>PIHAK PERTAMA</b>
                                    sesuai dengan Surat Perjanjian ${data.nomor_kontrak || ""} dengan nilai pekerjaan sebesar Rp ${data.nilai_kontrak || ""}
                                    (${data.terbilang_nilai_kontrak || ""}).
                                </td>
                            </tr>
                            <tr>
                                <td valign="top">b.</td>
                                <td>
                                    Bahwa <b>PIHAK KEDUA</b> telah mulai melaksanakan pekerjaan ${data.nama_pekerjaan || ""}
                                    pada tanggal ${data.tanggal_bamk || ""} sesuai dengan Berita Acara Mulai Kerja nomor ${data.nomor_bamk || ""}.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td colspan="4" class="text-align: justify;">
                    Berdasarkan hal-hal tersebut di atas, <b>PARA PIHAK</b> menyepakati hal-hal sebagai berikut :
                    </td>
                </tr>

                <tr>
                    <td></td>
                    <td colspan="3">
                    <table width="100%">
                        <tr>
                            <td width="2%" valign="top">1.</td>
                            <td>
                                Kemajuan pekerjaan periode ${data.bulan_realisasi || ""} tahun ${data.tahun_realisasi || ""}
                                adalah sebesar ${data.presentase_kemajuan || ""}%,
                                dengan nilai sebesar Rp ${data.nilai_kemajuan || ""} (${data.terbilang_nilai_kemajuan || ""}).
                            </td>
                        </tr>
                        <tr>
                            <td valign="top">2.</td>
                            <td>
                                Kemajuan kumulatif pekerjaan sampai dengan periode ${data.bulan_realisasi || ""} tahun ${data.tahun_realisasi || ""}
                                adalah sebesar ${data.total_presentase_kemajuan || ""}%,
                                dengan nilai sebesar Rp ${data.total_nilai_kemajuan || ""} (${data.terbilang_total_kemajuan || ""}).
                            </td>
                        </tr>
                        <tr>
                            <td valign="top">3.</td>
                            <td>
                                Bahwa berdasarkan kemajuan pekerjaan periode ${data.bulan_realisasi || ""} tahun ${data.tahun_realisasi || ""},
                                <b>PIHAK KEDUA</b> akan mengakui sebagai pendapatan dan
                                <b>PIHAK PERTAMA</b> akan mengakui sebagai beban.
                            </td>
                        </tr>
                    </table>
                    </td>
                </tr>

                <tr><td colspan="4" height="10px"></td></tr>

                <tr>
                    <td colspan="4" style="text-align: justify;">
                        Demikian Berita Acara ini dibuat dan ditandatangani oleh <b>PARA PIHAK</b>
                        pada hari dan tanggal tersebut di atas, untuk dipergunakan sebagaimana mestinya.
                    </td>
                </tr>

            </table>
            `;
        return html;
    } catch (error) {
        console.log("ERROR getLayoutBeritaAcara : ", error.message)
        return null;
    }
}