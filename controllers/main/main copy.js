const serviceMain = require('./services')
const serviceIntegrasi = require('../integrasi/services')
const db = require('../../config/database/database')
const { validasiFile, validasiFileSize, validasiFormatFile, getDataUser, parseUserError, formatSummaryData } = require('../../helpers/global_helpers')
const { statusCode, successMessage, errorMessage } = require('../../helpers/status')
const { v4: uuidv4 } = require('uuid');
const moment = require('moment')
const { encodedJwt } = require('../user/services')
const model = require('../../config/model')
const pm2 = require('pm2')
const ExcelJS = require('exceljs');

const updatePayloadReceiverHLog = async (req, result) => {
    const paylogHLog = {
        id_log: req.id_log,
        payload_receiver: JSON.stringify(result)
    }
    return await serviceMain.updateHLog(paylogHLog)
}

exports.getListMenu = async (req, res) => {
    try {
        const dataUser = await getDataUser(req.user)
        const { kd_ref } = req.query
        const find = dataUser.HAKAKSES.find((kd) => kd == kd_ref)
        if (!find) {
            res.status(statusCode.forbidden).json(errorMessage("USER TIDAK MEMILIKI HAK AKSES!!"))
        } else {
            const result = await serviceMain.getListMenu(kd_ref)
            res.status(statusCode.success).json(successMessage(result))
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getAcl = async (req, res) => {
    try {
        const { id_acl } = req.query
        const result = await serviceMain.getAcl(id_acl)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getReferensiByJenis = async (req, res) => {
    try {
        const { jns_ref, keyword } = req.query
        const result = await serviceMain.getReferensiByJenis(jns_ref, keyword)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getPermissionCrud = async (req, res) => {
    try {
        const { jns_ref } = req.query
        const { HAKAKSES } = req.user
        const result = await serviceMain.getPermissionCrud(jns_ref, HAKAKSES)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertNewProject = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const project_id = uuidv4()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            project_id: project_id,
            // project_no: await serviceMain.generateNoProject(project_id),
            project_no: (payload?.project_no && (payload?.project_no !== '' || payload?.project_no !== null)) ? payload?.project_no : await serviceMain.generateProjectNo(payload?.portofolio_id, payload?.customer_id),
            nip_sales: dataUser?.USERNAME || null,
            nama_sales: dataUser?.NAMA || null,
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })

        const result = await serviceMain.createDProject(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertNewProjectPID = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const project_id = uuidv4()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            project_id: project_id,
            project_no: (payload?.project_no && (payload?.project_no !== '' || payload?.project_no !== null)) ? payload?.project_no : await serviceMain.generateProjectNoNew(payload?.portofolio_id, payload?.customer_id, payload?.project_type_id, payload?.project_model_id),
            nip_sales: dataUser?.USERNAME || null,
            nama_sales: dataUser?.NAMA || null,
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })

        if (payload?.flag_lop === 'F' && payload?.project_type_id === '1') {
            const resultLopId = await serviceMain.generateLopId()

            const payloadAlop = {
                LOP_ID: resultLopId,
                JENIS_LOP: 'RKAP',
                PROJECT_ID: payload?.project_id,
                PROJECT_NO: payload?.project_no,
                PROJECT_NAME: payload?.project_name,
                CUSTOMER_ID: payload?.customer_id,
                PORTOFOLIO_ID: payload?.portofolio_id,
                KD_SPUC: payload?.kd_spuc,
                CATEGORY_ID: payload?.category_id,
                NAMA_SALES: payload?.nama_sales,
                CREATED_BY: payload?.nama_sales,
                CREATED_DATE: new Date(),
            }

            const result = await model.a_lop.create(payloadAlop, { transaction })
        } else {
            await model.a_lop.update(
                {
                    PROJECT_NO: payload?.project_no,
                    PROJECT_ID: project_id,
                    UPDATED_DATE: new Date()
                },
                {
                    where: { LOP_ID: payload?.lop_id },
                    transaction
                }
            );
        }

        const result = await serviceMain.createDProject(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertCustomer = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        payload.customer_id = uuidv4()
        const result = await serviceMain.createCustomer(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertVendorPt = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        const result = await serviceMain.createVendorPt(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        if (transaction) await transaction.rollback();

        // console.error("ERROR insertVendorPt:", error?.message || error);

        const userFriendlyMsg = parseUserError(error);

        const responseError = {
            status: false,
            message: userFriendlyMsg,
        };

        updatePayloadReceiverHLog(req, errorMessage(responseError));
        return res.status(statusCode.error).json(errorMessage(responseError));
    }
}

exports.insertPortofolio = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        const result = await serviceMain.createPortofolio(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertKaryawan = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        payload.karyawan_id = uuidv4()
        const result = await serviceMain.createKaryawan(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateCustomer = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.updateCustomer(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.updateVendorPt = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.updateVendorPt(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.updatePortofolio = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.updatePortofolio(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.updateKaryawan = async (req, res) => {
    try {
        const payload = req.body
        const result = await serviceMain.updateKaryawan(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.insertReferensi = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        const result = await serviceMain.createReferensi(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertContactCustomer = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const customer_contact_id = uuidv4()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            customer_contact_id: customer_contact_id,
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        const result = await serviceMain.createContactCustomer(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertContactVendorPt = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        const result = await serviceMain.createContactVendorPt(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertPersonilDetail = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dpersonel_id = uuidv4()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            dpersonel_id: dpersonel_id
        })

        const result = await serviceMain.createDPersonilDetail(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updatePersonilDetail = async (req, res) => {
    try {
        const payload = req.body
        const result = await serviceMain.updatePersonilDetail(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.insertOperationalDetail = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user

        if (payload?.cost_id) {
            Object.assign(payload, {
                updated_at: Date.now(),
                updated_by: `${USERNAME} - ${NAMA}`
            })
            const result = await serviceMain.updateOperationalDetail(payload)
            updatePayloadReceiverHLog(req, successMessage(result))
            res.status(statusCode.success).json({
                status: true,
                message: result
            })
        } else {
            const cost_id = uuidv4()
            Object.assign(payload, {
                cost_id: cost_id,
                created_by: `${USERNAME} - ${NAMA}`
            })
            const result = await serviceMain.createOperationalDetail(payload, transaction)
            await transaction.commit()
            updatePayloadReceiverHLog(req, successMessage(result))
            res.status(statusCode.success).json(successMessage(result))
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertOperationalDetailDokumen = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const cost_detail_id = uuidv4()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            cost_detail_id: cost_detail_id
        })
        const result = await serviceMain.createOperationalDetailDokumen(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertBillingDokumen = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const billing_detail_id = uuidv4()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            billing_detail_id: billing_detail_id,
            created_by: dataUser.IDUSER
        })
        const result = await serviceMain.insertBillingDokumen(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateProject = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        const dataproject = await model.d_project.findOne({ where: { project_no: payload.project_no }, raw: true })
        const projectIdIsChange = payload?.portofolio_id ? dataproject.portofolio_id != payload.portofolio_id : false;

        // handle perubahan project_no
        let newProjectNo = dataproject.project_no;
        if (projectIdIsChange) {
            // pecah project_no lama
            const parts = dataproject.project_no.split("-");
            if (parts.length > 1) {
                // ganti prefix dengan portofolio_id baru
                parts[0] = String(payload.portofolio_id);
                newProjectNo = parts.join("-");
            }
        }

        Object.assign(payload,
            {
                ...(projectIdIsChange && {
                    // project_no: await serviceMain.generateProjectNo(payload?.portofolio_id, payload?.customer_id)
                    project_no: newProjectNo
                }),
                updated_by: `${USERNAME} - ${NAMA}`
            })
        const result = await serviceMain.updateProject(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json({
            status: true,
            message: result
        })
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.updateKdStatus = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.updateKdStatus(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json({
            status: true,
            message: result
        })
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.getListProject = async (req, res) => {
    try {
        const params = { ...req.query }
        const { KD_SUB, USERNAME, HAKAKSES } = req.user;
        params.kd_spuc = KD_SUB;
        params.username = USERNAME;
        params.hak_akses = HAKAKSES;

        const result = await serviceMain.getListProject(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.searchProject = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.searchProject(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.postListProject = async (req, res) => {
    try {
        const params = req.query
        const body = req.body
        console.log("Paramss ==== ", params)
        console.log("Paramss ++++ ", body)
        const result = await serviceMain.postListProject(body, body.searchHeader)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingRealization = async (req, res) => {
    try {
        const params = { ...req.query }
        const { KD_SUB } = req.user;

        params.kd_spuc = params?.nik === '' ? KD_SUB : '';

        const result = await serviceMain.getListBillingRealization(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingCollections = async (req, res) => {
    try {
        const params = req.query
        const body = req.body
        const user = req.user
        
        const result = await serviceMain.getListBillingCollections(params, body.searchHeader, user)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListAllBilling = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListAllBilling(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingProject = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListBillingProject(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getLogActivity = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getLogActivity(project_id)
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getLogBillingActivity = async (req, res) => {
    try {
        const { billing_id } = req.query
        const result = await serviceMain.getLogBillingActivity(billing_id)
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getLogBillingSuratTagihan = async (req, res) => {
    try {
        const { billing_id } = req.query
        const result = await serviceMain.getLogBillingSuratTagihan(billing_id)
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getProjectLog = async (req, res) => {
    try {
        const { project_id, keyword } = req.query
        const result = await serviceMain.getProjectLog(project_id, keyword)
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListProjectForCostPersonil = async (req, res) => {
    try {
        const params = { ...req.query }
        const { KD_SUB } = req.user;

        params.kd_spuc = KD_SUB;

        const result = await serviceMain.getListProjectForCostPersonil(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailCostPersonil = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailCostPersonil(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailCostAdvance = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailCostAdvance(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailTagihanVendor = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailTagihanVendor(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailCostPersonilDetail = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailCostPersonilDetail(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailCostOperasional = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailCostOperasional(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailVendorProjectBilling = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailVendorProjectBilling(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailCostOperasionalWithDokumenByCostId = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailCostOperasionalWithDokumenByCostId(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListProjectForCostOperasional = async (req, res) => {
    try {
        const params = { ...req.query }
        const { KD_SUB } = req.user;

        params.kd_spuc = KD_SUB;

        const result = await serviceMain.getListProjectForCostOperasional(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListProjectForVendorProjectBilling = async (req, res) => {
    try {
        const params = { ...req.query }
        const { KD_SUB } = req.user;

        params.kd_spuc = KD_SUB;

        const result = await serviceMain.getListProjectForVendorProjectBilling(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListProjectForCostAdvanced = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListProjectForCostAdvanced(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListProjectForTagihanVendor = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListProjectForTagihanVendor(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingByTermin = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListBillingByTermin(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingProjectAkselerasi = async (req, res) => {
    try {
        const { project_id } = req.query

        const result = await serviceMain.getListBillingProjectAkselerasi(project_id)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.deletePersonilDetail = async (req, res) => {
    try {
        const dpersonel_id = req.params.dpersonel_id
        const result = await serviceMain.deletePersonilDetail(dpersonel_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteOperationalDetail = async (req, res) => {
    try {
        const cost_id = req.params.cost_id
        const result = await serviceMain.deleteOperationalDetail(cost_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getRefStatusProject = async (req, res) => {
    try {
        const params = { ...req.query }
        const { KD_SUB, USERNAME, HAKAKSES } = req.user;
        params.kd_spuc = KD_SUB;
        params.username = USERNAME;
        params.hak_akses = HAKAKSES;

        const result = await serviceMain.getRefStatusProject(params)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getRefStatusRevenue = async (req, res) => {
    try {
        const params = { ...req.query }
        const result = await serviceMain.getRefStatusRevenue(params)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getRefStatus = async (req, res) => {
    try {
        const id_tab_status = req.query.id_tab_status
        const result = await serviceMain.getRefStatus(id_tab_status)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.markAsProject = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.markAsProject(payload, transaction)
        await transaction.commit()

        result.status ?
            res.status(statusCode.success).json(successMessage(result.data, result.message)) :
            res.status(statusCode.bad).json(errorMessage(undefined, result.message))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getPortofolio = async (req, res) => {
    try {
        const result = await serviceMain.getPortofolio()

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getLinkedPID = async (req, res) => {
    try {
        const { keyword } = req.query;
        const result = await serviceMain.getLinkedPID(keyword);

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListDokumen = async (req, res) => {
    try {
        const { jns_dok, tipe_dok } = req.query;
        const result = await serviceMain.getListDokumen({ jns_dok, tipe_dok });

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getCustomers = async (req, res) => {
    try {
        const { keyword } = req.query
        const result = await serviceMain.getCustomers(keyword)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getStartDate = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getStartDate(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.markAsArchive = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.markAsArchive(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result.data, result.message))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.markAsUnarchive = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.markAsUnarchive(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result.data, result.message))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailProject = async (req, res) => {
    try {
        const { project_id, kode } = req.query
        const { USERNAME } = req.user
        const result = await serviceMain.getDetailProject(project_id, USERNAME, kode)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error <<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailProjectByNo = async (req, res) => {
    try {
        const { project_no, kode } = req.query
        const { USERNAME } = req.user
        const result = await serviceMain.getDetailProjectByNo(project_no, USERNAME, kode)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error <<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailProjectProfile = async (req, res) => {
    try {
        const { project_id } = req.query
        const { USERNAME } = req.user
        const result = await serviceMain.getDetailProjectProfile(project_id, USERNAME)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error <<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertDokumen = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { USERNAME, NAMA } = req.user
        const payloadData = Array.isArray(payload) ? payload : new Array(payload)

        const files = req.body.lampiran === '' ? null : Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)

        payloadData.forEach(data => Object.assign(data, { created_by: `${USERNAME} - ${NAMA}` }));

        // const validasi = await validasiFile(files)
        // if (validasi && !validasi.valid) {
        //     res.status(statusCode.success).json(validasi.data)
        // }
        // else {
        const result = await serviceMain.insertDokumen(payloadData, files, transaction)
        await transaction.commit()
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
        // }

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.uploadDokumenMaterai = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { USERNAME, NAMA } = req.user
        const payloadData = Array.isArray(payload) ? payload : new Array(payload)

        const files = req.body.lampiran === '' ? null : Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)

        payloadData.forEach(data => Object.assign(data, { created_by: `${USERNAME} - ${NAMA}` }));

        // const validasi = await validasiFile(files)
        // if (validasi && !validasi.valid) {
        //     res.status(statusCode.success).json(validasi.data)
        // }
        // else {
        const result = await serviceMain.insertDokumenMaterai(payloadData, files, transaction)
        await transaction.commit()
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
        // }

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateDokumen = async (req, res) => {
    try {
        const payload = (JSON.parse(req.body.payload))
        const { USERNAME, NAMA } = req.user
        const files = Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)

        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}`, updated_at: Date.now() });

        // const validasi = await validasiFile(files)
        // if (validasi && !validasi.valid) {
        //     res.status(statusCode.success).json(validasi.data)
        // }
        // else {
        const result = await serviceMain.updateDokumen(payload, files)
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
        // }

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateDokumenNoFile = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user

        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}`, updated_at: Date.now() });

        // const validasi = await validasiFile(files)
        // if (validasi && !validasi.valid) {
        //     res.status(statusCode.success).json(validasi.data)
        // }
        // else {
        const result = await serviceMain.updateDokumenNoFile(payload)
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
        // }

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertDokumenNoFile = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        const payloadData = Array.isArray(payload) ? payload : new Array(payload)

        payloadData.forEach(data => Object.assign(data, { created_by: `${USERNAME} - ${NAMA}` }));

        console.log('payloadData', payloadData);

        // const validasi = await validasiFile(files)
        // if (validasi && !validasi.valid) {
        //     res.status(statusCode.success).json(validasi.data)
        // }
        // else {
        const result = await serviceMain.insertDokumenNoFile(payloadData, transaction)
        await transaction.commit()
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
        // }

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.uploadDokumen = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const form = JSON.parse(req.body.dataForm)
        const data = form.data;
        const file = form.file;
        const lampiran = req.files.lampiran
        const ext = file.ext.toLowerCase()

        if (await validasiFileSize(file.size) == true) {
            if (await validasiFormatFile(ext) == true) {
                const result = await serviceMain.processUploadFile(data, lampiran, ext, file);
                res.status(statusCode.success).json({
                    code: '01',
                    message: 'Upload File Sukses',
                    data: result
                })
            } else {
                res.status(statusCode.success).json({
                    code: '02',
                    message: 'Format File Tidak Diizinkan',
                    data: []
                })
            }
        } else {
            res.status(statusCode.success).json({
                code: '02',
                message: 'Ukuran File Melebihi 50 MB',
                data: []
            })
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json({
            code: '02',
            message: 'Upload File Gagal',
            data: error
        })
    }
}

exports.deleteDokumen = async (req, res) => {
    try {
        const dokumen_id = req.params.dokumen_id
        const dataUser = req.user
        const aktor = dataUser?.USERNAME + ' - ' + dataUser?.NAMA;
        const result = await serviceMain.deleteDokumen(dokumen_id, aktor)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertDokumenBAMK = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { USERNAME, NAMA } = req.user
        const payloadData = Array.isArray(payload) ? payload : new Array(payload)
        const files = Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)

        payloadData.forEach(data => Object.assign(data, { created_by: `${USERNAME} - ${NAMA}` }));

        for (const payload of payloadData) {
            const dataProject = payload.project_vendor_id !== '' ? await serviceMain.getDetailProjectVendor(payload.project_id) : await serviceMain.getDetailProject(payload.project_id, USERNAME, payload.kode)

            if (dataProject && dataProject.DOKUMEN_BAMK_ID != null) res.status(statusCode.bad).json({
                code: '02',
                message: 'Dokumen BAMK Sudah Terisi!',
                data: []
            })
        }

        // const validasi = await validasiFile(files)
        // if (validasi && !validasi.valid) {
        //     res.status(statusCode.success).json(validasi.data)
        // } else {
        const saveDokumen = await serviceMain.insertDokumen(payloadData, files, transaction)
        const result = await serviceMain.saveDokumenBAMK(saveDokumen, payloadData)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage({ saveDokumen, update_project: result }))
        // }

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteDokumenBAMK = async (req, res) => {
    try {
        const { dokumen_id, project_id } = req.query
        const dataUser = req.user
        const aktor = dataUser?.USERNAME + ' - ' + dataUser?.NAMA;
        if (!dokumen_id && !project_id) res.status(statusCode.error).json(errorMessage("Dokumen ID / Project ID Tidak Boleh Kosong!"))

        const result = await serviceMain.deleteDokumen(dokumen_id, aktor)
        const payloadProject = { dokumen_bamk_id: null, project_id: project_id }
        const updateProject = await serviceMain.updateProject(payloadProject)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage({ delete_dokumen: result, update_project: updateProject }))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.postBillingCollection = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.postBillingCollection(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getBillingCollection = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getBillingCollection(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getBillingCollectionProjectActual = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getBillingCollectionProjectActual(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getStatusBilling = async (req, res) => {
    try {
        const { billing_id } = req.query
        const result = await serviceMain.getStatusBilling(billing_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteBillingCollection = async (req, res) => {
    try {
        const billing_id = req.params.billing_id
        const result = await serviceMain.deleteBillingCollection(billing_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteBillingDokumen = async (req, res) => {
    try {
        const billing_detail_id = req.params.billing_detail_id
        const result = await serviceMain.deleteBillingDokumen(billing_detail_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.postVendorPlanning = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, payload.project_vendor_id ? { updated_by: `${USERNAME} - ${NAMA}` } : { created_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.postVendorPlanning(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.vendorRemind = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, payload.remind_id !== "" ? { updated_by: `${USERNAME} - ${NAMA}` } : { created_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.vendorRemind(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getVendorPlanning = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getVendorPlanning(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteVendorPlanning = async (req, res) => {
    try {
        const project_vendor_id = req.params.project_vendor_id
        const result = await serviceMain.deleteVendorPlanning(project_vendor_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.postCBBPlanning = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.postCBBPlanning(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getCBBPlanning = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getCBBPlanning(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteCBBPlanning = async (req, res) => {
    try {
        const cbb_id = req.params.cbb_id
        const result = await serviceMain.deleteCBBPlanning(cbb_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.costPersonilPlanning = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.costPersonilPlanning(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getCostPersonilPlanning = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getCostPersonilPlanning(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteCostPersonilPlanning = async (req, res) => {
    try {
        const personel_id = req.params.personel_id
        const result = await serviceMain.deleteCostPersonilPlanning(personel_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteContactCustomer = async (req, res) => {
    try {
        const customer_contact_id = req.params.customer_contact_id
        const result = await serviceMain.deleteContactCustomer(customer_contact_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteContactVendorPt = async (req, res) => {
    try {
        const vendor_kontrak_id = req.params.vendor_kontrak_id
        const result = await serviceMain.deleteContactVendorPt(vendor_kontrak_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getSubReferensiByJenis = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getSubReferensiByJenis(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getSubReferensiByJenis2 = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getSubReferensiByJenis2(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getValidasi = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getValidasi(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListVendor = async (req, res) => {
    try {
        const { keyword } = req.query
        const result = await serviceMain.getListVendor(keyword)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListVendorPt = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListVendorPt(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.markAsActualID = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const validasi = await serviceMain.validasiPayloadMarkAsActualID(payload)
        if (!validasi.valid) res.status(statusCode.bad).json(errorMessage(validasi.message))
        const result = await serviceMain.markAsActualID(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        if (transaction) await transaction.rollback()
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
        pm2.restart('n2n', function (err) {
            console.log('restart backend....');
            if (err) console.log(err);
        });
    }
}

exports.markAsActualIDNew = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const validasi = await serviceMain.validasiPayloadMarkAsActualID(payload)
        if (!validasi.valid) res.status(statusCode.bad).json(errorMessage(validasi.message))
        const result = await serviceMain.markAsActualIDNew(payload, transaction)

        if (payload?.new_project?.flag_lop === 'T') {
            await model.a_lop.update(
                {
                    PROJECT_NO: payload?.new_project?.project_no,
                    PROJECT_ID: result?.project?.project?.project_id,
                    UPDATED_DATE: new Date()
                },
                {
                    where: { LOP_ID: payload?.new_project?.lop_id },
                    transaction
                }
            );
        }
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        if (transaction) await transaction.rollback()
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
        pm2.restart('n2n', function (err) {
            console.log('restart backend....');
            if (err) console.log(err);
        });
    }
}

exports.getListProjectVendor = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListProjectVendor(params)
        res.status(statusCode.success).json(successMessage(result.data))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailProjectVendor = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getDetailProjectVendor(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getProjectByType = async (req, res) => {
    try {
        const { type, keyword, kd_status } = req.query
        const result = await serviceMain.getProjectByType(type, keyword, kd_status)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.markAsAcceleration = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const validasi = await serviceMain.validasiProjectAkselerasi(payload, '1')
        if (!validasi.valid) res.status(statusCode.bad).json(errorMessage(validasi.message))
        const result = await serviceMain.markAsAcceleration(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateProjectStatus = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        if (!payload.finance) {
            Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}`, updated_at: Date.now() })
        }
        const result = await serviceMain.updateProjectStatus(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}


exports.insertProjectStatus = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}`, date_status: payload.date_status ? payload.date_status : Date.now() })
        if (!payload.project_id) res.status(statusCode.notfound).json(errorMessage("Invalid Project ID cannot be empty!"))
        const result = await serviceMain.insertProjectStatus(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        if (transaction) await transaction.rollback()
        console.log(error, "ERROR <<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailVendorRealization = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailVendorRealization(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.dataRevenueStream = async (req, res) => {
    let transaction
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        if (payload.billing_revenue_id == '' || !payload.billing_revenue_id) {
            Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` })
            transaction = await db.transaction()
            const result = await serviceMain.dataRevenueStream(payload, transaction)
            await transaction.commit()
            updatePayloadReceiverHLog(req, successMessage(result))
            res.status(statusCode.success).json(successMessage(result))
        } else {
            Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
            const result = await serviceMain.dataRevenueStreamUpdate(payload, transaction)
            updatePayloadReceiverHLog(req, successMessage(result))
            // if (payload.status_invoice == 'T') {
            //     const payloadStatus = { billing_id: payload.billing_id, kd_status: "401" }
            //     await serviceMain.updateKdStatus(payloadStatus)
            // }
            if (payload.status_pelunasan == 'T') {
                const payloadStatus = { billing_id: payload.billing_id, kd_status: "401" }
                await serviceMain.updateKdStatus(payloadStatus)
            }
            res.status(statusCode.success).json(successMessage(result))
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getBillingRealization = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getBillingRealization(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getBillingDocument = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getBillingDocument(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListBillingRevenue = async (req, res) => {
    try {
        const params = req.query
        const body = req.body
        const result = await serviceMain.getListBillingRevenue(params, body.searchHeader)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListBillingMonitoring = async (req, res) => {
    try {
        const params = req.query
        const body = req.body
        // console.log("PARAMS", params)
        const result = await serviceMain.getListBillingMonitoring(params)
        // console.log("RESS : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListDetailBillingMonitoring = async (req, res) => {
    try {
        const params = req.query
        // console.log("PARAMS", params)
        const result = await serviceMain.getListDetailBillingMonitoring(params)
        // console.log("RESS DETAIL : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}
exports.getListDetailPerCustomer = async (req, res) => {
    try {
        const params = req.query
        // console.log("PARAMS", params)
        const result = await serviceMain.getListDetailPerCustomer(params)
        // console.log("RESS DETAIL : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListNoFaktur = async (req, res) => {
    try {
        const params = req.query
        // console.log("PARAMS", params)
        const result = await serviceMain.getListNoFaktur(params)
        // console.log("RESS DETAIL : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailBillingRevenue = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailBillingRevenue(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getReportBillingRevenue = async (req, res) => {
    try {
        // console.log("MASUK REPORT")
        const params = req.query
        const result = await serviceMain.getReportBillingRevenue(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailCustomer = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailCustomer(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailVendorPt = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailVendorPt(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailPortofolio = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailPortofolio(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListCustomer = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListСustomer(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListKaryawan = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListKaryawan(params)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListPortofolio = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListPortofolio(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListReferensi = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListReferensi(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailReferensi = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailReferensi(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.checkRemind = async () => {
    const result = await serviceMain.getRemind();
    return result;
}

exports.updateRemind = async (item) => {
    try {
        const payload = {
            remind_id: item?.REMIND_ID,
            flag_send: 'T'
        }
        const result = await serviceMain.updateRemind(payload)
        return result;
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        return 'Gagal';

    }
}


exports.markAsClone = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.markAsClone(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result.data, result.message))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

// controller integrasi
exports.getIntegrasiDataProject = async (req, res) => {
    try {
        const payload = req.body
        Object.assign(payload, {
            method: req.method
        })

        const config = await serviceMain.checkConfig(payload)

        if (config > 0) {
            const result = await serviceIntegrasi.getIntegrasiDataProject(payload)
            res.status(statusCode.success).json(successMessage(result))
        } else {
            res.status(statusCode.error).json(errorMessage('Tidak Ada Config'))
        }
    } catch (error) {
        console.log(error)
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListUserActivity = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListUserActivity(params)
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListApproval = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListApproval(params)
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListLokasi = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListLokasi(params)
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

const flagNotificationCategory = async (id) => {
    const result = await serviceMain.flagNotificationCategory(id)
    return result?.flag_aktif
}

exports.insertNotification = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        if (payload?.fcm === 'Y') {
            Object.assign(payload, {
                fcm_token: dataUser?.token
            })
        }

        Object.assign(payload, {
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        payload.notification_event_id = uuidv4()

        const flagCategory = await flagNotificationCategory(payload?.category);

        if (flagCategory === 'Y') {
            const result = await serviceMain.insertNotification(payload, transaction)
            await transaction.commit()
            res.status(statusCode.success).json(successMessage(result))
        }
        else {
            res.status(statusCode.error).json(errorMessage('Notification Tidak Aktif'))
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateNotification = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        Object.assign(payload, {
            updated_date: now,
            updated_by: `${USERNAME} - ${NAMA}`
        })

        const result = await serviceMain.updateNotification(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.getListNotification = async (req, res) => {
    try {
        const { USERNAME } = req.user
        const result = await serviceMain.getListNotification(USERNAME)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
        pm2.restart('n2n', function (err) {
            // pm2.disconnect();   // Disconnects from PM2
            if (err) console.log(err);
        });
    }
}

exports.insertTask = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            assign_by: dataUser?.USERNAME,
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.insertTask(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateTask = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            assign_by: dataUser?.USERNAME,
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.updateTask(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListTask = async (req, res) => {
    try {
        const { USERNAME } = req.user
        const { keyword } = req.query

        const result = await serviceMain.getListTask(USERNAME, keyword)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getTaskDetail = async (req, res) => {
    try {
        const params = req.query

        const result = await serviceMain.getTaskDetail(params);
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.deleteTask = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const task_id = req.params.task_id
        const result = await serviceMain.deleteTask(task_id, transaction)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListPegawai = async (req, res) => {
    try {
        const limitPage = req?.body?.limit || 0;
        const numPage = req?.body?.page || 0;
        const kelasList = Array.isArray(req?.body?.kelas) ?
            req?.body?.kelas : req?.body?.kelas ? [req?.body?.kelas] : [];
        const payloadList = {
            departmentId: req?.body?.departmentId || '',
            kelas: kelasList,
            limit: limitPage,
            page: numPage,
            sort: req?.body?.sort || 'ASC',
            end: numPage * limitPage,
            start: 0 + (numPage - 1) * limitPage,
        }
        const result = await serviceMain.getListPegawai(payloadList)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getRefDepartment = async (req, res) => {
    try {
        const result = await serviceMain.getRefDepartment()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getCustomerBySpuc = async (req, res) => {
    try {
        // const portofolio_id = req?.query?.portofolio_id || '';
        const divisi = req?.query?.divisi || '';
        const keyword = req?.query?.keyword || '';
        const sort = req?.query?.sort || 'ASC';
        // if (!portofolio_id) return res.status(statusCode.notfound).json(successMessage([], 'Portofolio id cannot be empty'))
        if (!divisi) return res.status(statusCode.notfound).json(successMessage([], 'Divisi cannot be empty'))
        const payloadList = {
            // portofolio_id: portofolio_id,
            divisi: divisi,
            keyword: keyword,
            sort: sort,
        }
        const result = await serviceMain.getCustomerBySpuc(payloadList)
        if (result?.length) {
            res.status(statusCode.success).json(successMessage(result))
        } else {
            res.status(statusCode.notfound).json(successMessage([], 'Data not found'))
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListNotificationByNIP = async (nip) => {
    try {
        const result = await serviceMain.getListNotification(nip)
        return result
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        return null
    }
}
// exports.getNotificationFaktur = async (id) => {
//     try {
//         const result = await serviceMain.getNotificationFaktur(id)
//         return result
//     } catch (error) {
//         return null
//     }
// }
exports.getNotificationFaktur = async (req, res) => {
    // console.log("MASUK NOTIF FAKTUR")
    try {
        const { id } = req.query;
        const result = await serviceMain.getNotificationFaktur(id);
        //   console.log(result, "RESULT <<<<<<<<<");
        res.json(result);
    } catch (err) {
        console.log(err, "ERROR <<<<<<<<<")
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getListNIPByRole = async (req, res) => {
    try {
        const { role } = req.query
        const result = await serviceMain.getListNIPByRole(role)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getNIPByRoleId = async (req, res) => {
    try {
        const { role } = req.query
        const result = await serviceMain.getNIPByRoleId(role)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListRemarks = async (req, res) => {
    try {
        const { project_id } = req.query
        const result = await serviceMain.getListRemarks(project_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertRemarks = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.insertRemarks(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.assignTeam = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            assign_id: uuidv4(),
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.addAssignTeam(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.deleteAssignTeam = async (req, res) => {
    try {
        const assign_id = req.params.assign_id
        const result = await serviceMain.deleteAssignTeam(assign_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListUser = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListUser(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result.data))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertUser = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        const passwordEncode = await encodedJwt(payload.password)
        delete payload.password

        Object.assign(payload, {
            user_id: uuidv4(),
            password: passwordEncode,
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.insertUser(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}


exports.insertProgressProject = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { USERNAME, NAMA } = req.user
        
        const files = req.files ? (Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)) : null
        
        Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` });

        const result = await serviceMain.insertProgressProject(payload, files, transaction)
        await transaction.commit()
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}
exports.insertProgressBilling = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { USERNAME, NAMA } = req.user
        // const files = Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)

        Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` });
        console.log("PAYLOAD : ", payload)
        const result = await serviceMain.insertProgressBilling(payload, transaction)
        console.log("RESULT : ", result)
        await transaction.commit()
        // updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        // updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListProgressProject = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListProgressProject(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}
exports.getListProgressProjectBilling = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListProgressProjectBilling(params)
        console.log("RESULT PROGRESS getListProgressProjectBilling : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getOverall = async (req, res) => {
    try {
        // const { USERNAME } = req.user
        const result = await serviceMain.getOverall()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataAreaChart = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDataAreaChart(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataRadialChart = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDataRadialChart(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.registerUser = async (req, res) => {
    const { nama, nipp, email, password, role } = req.body;

    if (!nama || !nipp || !email || !password || !role) {
        return res.status(400).json({ message: "Semua field harus diisi." });
    }

    try {
        const hashedPassword = await hashPassword(password);

        await db.query(
            `INSERT INTO users (nama, nipp, email, password, role) VALUES (:nama, :nipp, :email, :password, :role)`,
            {
                replacements: { nama, nipp, email, password: hashedPassword, role },
            }
        );

        res.status(200).json({ message: "Registrasi berhasil!" });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Gagal melakukan registrasi." });
    }
};

exports.changePassword = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: "NIPP dan password wajib diisi." });
    }

    try {
        //   const hashedPassword = await hashPassword(password);
        const hashedPassword = await encodedJwt(password);

        const [results] = await db.query(
            `UPDATE M_USER SET password = :password WHERE username = :identifier`,
            {
                replacements: { password: hashedPassword, identifier },
            }
        );

        if (results.rowsAffected === 0 || results === 0) {
            return res.status(statusCode.notfound).json(errorMessage({}, "User tidak ditemukan."));
        }

        res.status(statusCode.success).json(successMessage({}, "Password berhasil diubah."));
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(statusCode.error).json(errorMessage({}, "Gagal mengganti password."));
    }
};

exports.checkPelunasan = async () => {
    const result = await serviceMain.checkPelunasan();
}

exports.checkPelunasanFromSAP = async () => {
    const result = await serviceMain.checkPelunasanFromSAP();
}

exports.updateTransaction = async (req, res) => {
    try {
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            updated_at: Date.now(),
            updated_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.updateTransaction(payload)
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getSettingDok = async (req, res) => {
    try {
        const { jenis_dok } = req.query
        const result = await serviceMain.getSettingDok(jenis_dok)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingAdjustment = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListBillingAdjustment(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertBillingAdjustment = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        payload.adjustment_id = uuidv4()
        const result = await serviceMain.createBillingAdjustment(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateBillingAdjustment = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.updateBillingAdjustment(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.deleteBillingAdjustment = async (req, res) => {
    try {
        const id = req.params.adjustment_id
        const result = await serviceMain.deleteBillingAdjustment(id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailBillingAdjustment = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailBillingAdjustment(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}


exports.getRefStatusInvoiceNonProject = async (req, res) => {
    try {
        const params = { ...req.query }
        const result = await serviceMain.getRefStatusInvoiceNonProject(params)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListBillingNonProject = async (req, res) => {
    try {
        const params = req.query
        const body = req.body
        const result = await serviceMain.getListBillingNonProject(params, body.searchHeader)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.stampingCloud = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        // STEP 1 START (Upload Dokumen Yang Ingin DiStamp)
        const { USERNAME, NAMA } = req.user
        let htmlContent = req.body.html;
        let data = req.body.data;
        if (data?.stamp_id) {
            Object.assign(data, { updated_by: USERNAME + ' - ' + NAMA, updated_date: Date.now() })
        } else {
            Object.assign(data, { created_by: USERNAME + ' - ' + NAMA })
        }
        const result = await serviceMain.stampingCloud(htmlContent, data, transaction)
        await transaction.commit()
        // const result = await serviceMain.updateDokumenStamp(data, files)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "PDF generation failed", error });
    }
};

exports.stampingProd = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        // STEP 1 START (Upload Dokumen Yang Ingin DiStamp)
        const { USERNAME, NAMA } = req.user
        let htmlContent = req.body.html;
        let data = req.body.data;
        if (data?.stamp_id) {
            Object.assign(data, { updated_by: USERNAME + ' - ' + NAMA, updated_date: Date.now() })
        } else {
            Object.assign(data, { created_by: USERNAME + ' - ' + NAMA })
        }
        const result = await serviceMain.stampingProd(htmlContent, data, transaction)
        await transaction.commit()
        // const result = await serviceMain.updateDokumenStamp(data, files)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, '<<<< ERRORR');
        return res.status(500).json({ message: error?.message, status: false });
    }
};

exports.uploadDokumenUnsigned = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        // STEP 1 START (Upload Dokumen Yang Ingin DiStamp)
        const { USERNAME, NAMA } = req.user
        let htmlContent = req.body.html;
        let data = req.body.data;
        if (data?.stamp_id) {
            Object.assign(data, { updated_by: USERNAME + ' - ' + NAMA, updated_date: Date.now() })
        } else {
            Object.assign(data, { created_by: USERNAME + ' - ' + NAMA })
        }
        const result = await serviceMain.uploadDokumenUnsigned(htmlContent, data, transaction)
        await transaction.commit()
        // const result = await serviceMain.updateDokumenStamp(data, files)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, '<<<< ERRORR');
        return res.status(500).json({ message: error?.message, status: false });
    }
};

exports.getListHariLibur = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListHariLibur(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteHariLibur = async (req, res) => {
    try {
        const id = req.params.hari_libur_id
        const result = await serviceMain.deleteHariLibur(id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertHariLibur = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME} - ${dataUser?.NAMA}` || null
        })
        const result = await serviceMain.createHariLibur(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateHariLibur = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
        const result = await serviceMain.updateHariLibur(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.dataRevenueLOP = async (req, res) => {
    let transaction
    try {
        const payload = req.body
        console.log("PAYLOAD LOP : ", payload)
        const { USERNAME, NAMA } = req.user;

        if (payload.DETAIL && payload.DETAIL.BULAN_REAL) {
            // Hapus leading zero
            payload.DETAIL.BULAN_REAL = String(parseInt(payload.DETAIL.BULAN_REAL, 10))
        }
        // return payload;

        // transaction = await db.transaction()
        // const result = await serviceMain.saveLopDetail(payload, transaction)
        // await transaction.commit()
        // updatePayloadReceiverHLog(req, successMessage(result))
        // res.status(statusCode.success).json(successMessage(result))
        if (payload?.LOP_DETAIL_ID == '' || !payload?.LOP_DETAIL_ID) {
            // if (!payload.lop_no) {
            console.log("INSERT LOP")
            Object.assign(payload, { created_by: `${USERNAME} - ${NAMA}` })
            transaction = await db.transaction()
            const result = await serviceMain.dataRevenueLOP(payload, transaction)
            await transaction.commit()
            updatePayloadReceiverHLog(req, successMessage(result))
            res.status(statusCode.success).json(successMessage(result))
        } else {
            console.log("UPDATE LOP")
            Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}` })
            const result = await serviceMain.dataRevenueLOPUpdate(payload)
            updatePayloadReceiverHLog(req, successMessage(result))
            res.status(statusCode.success).json(successMessage(result))
        }
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.dataRevenueLOPGroup = async (req, res) => {
    let transaction
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        const created_by = `${USERNAME} - ${NAMA}`
        transaction = await db.transaction()
        const result = await serviceMain.dataRevenueLOPGroup(payload, created_by, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListBillingLOP = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListBillingLOPNew(params)
        // const result = await serviceMain.getListBillingLOP(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getSummaryRevenue = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getSummaryRevenue(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getDetailBillingLOP = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailBillingLOP(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}
exports.getDetailLOP = async (req, res) => {
    try {
        const params = req.body
        console.log("PARAMS : ", params)
        const result = await serviceMain.getDetailLOP(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}
exports.softDeleteLop = async (req, res) => {
    try {
        const params = req.body
        console.log("PARAMS : ", params)
        const result = await serviceMain.softDeleteLop(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}
exports.autogenerateLOP = async (req, res) => {
    try {
        const params = req.body
        console.log("PARAMS : ", params)
        const result = await serviceMain.autogenerateLOP(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}
exports.uploadLOPExcel = async (req, res) => {
    try {
        await serviceMain.uploadLOPExcel(req, res);

    } catch (error) {
        console.error('Route handler error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Route handler error',
                error: error.message
            });
        }
    }
}

exports.getRefLop = async (req, res) => {
    try {
        const keyword = req?.query?.keyword || '';
        const kd_spuc = req?.query?.kd_spuc || '';

        const payloadList = {
            keyword: keyword,
            kd_spuc: kd_spuc,
        }
        const result = await serviceMain.getRefLop(payloadList)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListLOPID = async (req, res) => {
    try {
        console.log("KEYWORD LOPID II : ", req.body)
        const keyword = req?.body?.keyword || '';
        console.log("KEYWORD LOPID : ", keyword)
        const payloadList = {
            keyword: keyword,
        }
        const result = await serviceMain.getListLOPID(payloadList)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertHBilling = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.insertHBilling(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateHBilling = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, { updated_by: `${USERNAME} - ${NAMA}`, updated_at: Date.now() })
        const result = await serviceMain.updateHBilling(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertProductOwner = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            user: dataUser?.USERNAME
        })

        const result = await serviceMain.insertProductOwner(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getProductOwnerByPID = async (req, res) => {
    try {
        const { projectId } = req.query

        const result = await serviceMain.getProductOwnerByPID(projectId)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error <<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getSummaryRevenueLop = async (req, res) => {
    try {
        console.log("Payload Summary Revenue:", req.body);
        const { periode } = req.body;

        if (!periode) {
            return res.status(400).json({
                success: false,
                message: "Periode harus diisi (format: YYYY-MM)"
            });
        }

        // Validasi format periode
        const periodeRegex = /^\d{4}-\d{2}$/;
        if (!periodeRegex.test(periode)) {
            return res.status(400).json({
                success: false,
                message: "Format periode tidak valid. Gunakan format YYYY-MM"
            });
        }

        const payload = { periode };

        // Panggil service
        const result = await serviceMain.getSummaryRevenueLop(payload);

        // Format response untuk FE
        const formattedData = await formatSummaryData(result);

        res.status(200).json({
            success: true,
            data: formattedData,
            message: "Data summary revenue berhasil diambil"
        });
    } catch (error) {
        console.error("Error in getSummaryRevenue:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Terjadi kesalahan pada server"
        });
    }
};

exports.updateProjectNewPID = async (req, res) => {
    try {
        const payload = req.body;
        const { USERNAME, NAMA } = req.user;

        // 1. Ambil data project lama
        const dataproject = await model.d_project.findOne({
            where: { project_id: payload.project_id },
            raw: true
        });

        const oldPID = dataproject.project_no; // PID lama untuk update h_project_no

        // Validasi apakah contract_type berubah → PID berubah
        const projectIdIsChange =
            payload?.contract_type
                ? dataproject.contract_type !== payload.contract_type
                : false;

        // 2. Jika PID berubah → generate PID baru
        if (projectIdIsChange) {
            payload.project_no = await serviceMain.generatePIDbyJenisKontrak(payload.contract_select);
        }

        payload.updated_by = `${USERNAME} - ${NAMA}`;

        // 3. Update d_project (PID sudah diganti)
        const result = await serviceMain.updateProject(payload);

        // 4. Update h_project_no yang lama (berdasarkan oldPID)
        await model.h_project_no.update(
            {
                flag_aktif: 'N',
                updated_by: `${USERNAME} - ${NAMA}`,
                updated_at: new Date()
            },
            {
                where: { project_no: oldPID }
            }
        );

        // 5. Jika PID berubah → create history baru
        if (projectIdIsChange) {
            // Query untuk mendapatkan CHANGE_NO
            const change_no = await serviceMain.generateChangeNo(payload.project_id)

            console.log('change_no', change_no);

            await model.h_project_no.create({
                project_id: payload.project_id,
                project_no: payload.project_no,
                project_type_id: dataproject.project_type_id,
                project_contract_id: payload.select_id,
                created_by: `${USERNAME} - ${NAMA}`,
                contract_type: payload?.contract_type,
                change_no: change_no, // Tambahkan change_no di sini
                created_at: new Date()
            });
        }

        updatePayloadReceiverHLog(req, successMessage(result));

        res.status(statusCode.success).json({
            status: true,
            message: result
        });

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<");
        updatePayloadReceiverHLog(req, errorMessage(error));

        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        });
    }
};

exports.generateNoRef = async (req, res) => {
    try {
        const now = new Date()

        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const result = await serviceMain.generateNoRef(yyyy + '' + mm + '' + dd)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.error("Error : ", error);
        res.status(statusCode.error).json(successMessage(error))
    }
};

exports.insertHDocReq = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            created_by: `${dataUser?.USERNAME}` || null
        })

        const result = await serviceMain.insertHDocReq(payload, transaction)
        await transaction.commit()
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateHDocReq = async (req, res) => {
    try {
        const payload = req.body
        const { USERNAME, NAMA } = req.user
        Object.assign(payload, {
            resolved_by: `${USERNAME} - ${NAMA}`,
            resolved_at: new Date()
        })
        const result = await serviceMain.updateHDocReq(payload)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.getListNoProject = async (req, res) => {
    try {
        console.log("KEYWORD NO PROJECT : ", req.body)
        const keyword = req?.body?.keyword || '';
        console.log("KEYWORD NO PROJECT : ", keyword)
        const payloadList = {
            keyword: keyword,
        }
        const result = await serviceMain.getListNoProject(payloadList)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.createLOPFromProject = async (req, res) => {
    try {
        console.log('BODY createLOPFromProject:', req.body);

        const paramsProjectNo = req?.body?.paramsProjectNo;

        if (!paramsProjectNo) {
            return res
                .status(statusCode.badRequest)
                .json(errorMessage('PROJECT_NO wajib diisi'));
        }

        const payload = {
            paramsProjectNo
        };

        const result = await serviceMain.createLOPFromProject(payload);

        res.status(statusCode.success).json(successMessage(result));
    } catch (error) {
        console.error('ERROR createLOPFromProject:', error);
        res.status(statusCode.error).json(errorMessage(error));
    }
};

exports.exportBillingLOPExcel = async (req, res) => {
    try {
        const workbook = await serviceMain.exportBillingLOPExcelNew(req.query)

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Billing_LOP.xlsx'
        )

        await workbook.xlsx.write(res)
        res.end()
    } catch (err) {
        console.error('[EXPORT EXCEL ERROR]', err)
        res.status(500).json(errorMessage(err.message))
    }
}

exports.stampUlang = async (req, res) => {
    try {
        const payload = req.body
        const result = await serviceMain.stampUlang(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListBillingFakturPajak = async (req, res) => {
    try {
        const params = req.query
        const body = req.body
        // console.log("PARAMS", params)
        const result = await serviceMain.getListBillingFakturPajak(params)
        // console.log("RESS : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListNoFakturExcel = async (req, res) => {
    try {
        const params = req.query
        // console.log("PARAMS", params)
        const result = await serviceMain.getListNoFakturExcel(params)
        // console.log("RESS DETAIL : ", result)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertRKeuangan = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            created_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.insertRKeuangan(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.updateRKeuangan = async (req, res) => {
    try {
        const dataUser = req.user
        const payload = req.body

        Object.assign(payload, {
            updated_by: dataUser?.USERNAME + ' - ' + dataUser?.NAMA
        })

        const result = await serviceMain.updateRKeuangan(payload)
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.deleteRKeuangan = async (req, res) => {
    try {
        const { dokumen_id } = req.query
        const result = await serviceMain.deleteRKeuangan(dokumen_id)
        updatePayloadReceiverHLog(req, successMessage(result))
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.getListBillingCode = async (req, res) => {
    try {
        console.log("KEYWORD NO PROJECT : ", req.body)
        const keyword = req?.body?.billing_code || '';
        console.log("KEYWORD NO PROJECT : ", keyword)
        const payloadList = {
            billing_code: keyword,
        }
        const result = await serviceMain.getListBillingCode(payloadList)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListPID = async (req, res) => {
    try {
        const { PID } = req.query;
        const result = await serviceMain.getListPID(PID);
        res.status(result.status == true ? statusCode.success : statusCode.error).json(result)
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}
exports.updateStokMaterai = async (req, res) => {
    try {
        const payload = req.body           
        const result = await serviceMain.updateStokMaterai(payload)
        res.status(statusCode.success).json({
            status: true,
            message: result
        })
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        updatePayloadReceiverHLog(req, errorMessage(error))
        res.status(statusCode.error).json({
            status: false,
            message: "Gagal Update"
        })
    }
}

exports.getStokMaterai = async (req, res) => {
    try {
        const payload = req.query
        const result = await model.m_materai.findOne({ where: { jenis_materai: payload.jenis_materai } })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.error("Error : ", error);
        res.status(statusCode.error).json(successMessage(error))
    }
};

exports.getListAllBillingForLop = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getListAllBillingForLop(params)

        // result.status ? 
        res.status(statusCode.success).json(successMessage(result))
        // : 
        // res.status(statusCode.bad).json(errorMessage(result.data, "Failed"))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}