const serviceMain = require('./services')
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

// BATAS YANG DIPAKAI
exports.getReferensiByJenis = async (req, res) => {
    try {
        const { jns_ref, keyword, cabang_id } = req.query
        const { role_id } = req.user

        const result = await serviceMain.getReferensiByJenis(jns_ref, keyword, cabang_id, role_id)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getReferensiByJenisGroup = async (req, res) => {
    try {
        const { keyword } = req.query
        const { role_id } = req.user

        const result = await serviceMain.getReferensiByJenisGroup(keyword)

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
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

exports.insertPengajuan = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { nip, nama, role_user_id } = req.user

        const files = req?.files?.lampiran ? (Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)) : []

        Object.assign(payload, { created_by: `${nip} - ${nama}`, role_pembuat_id: role_user_id, dataUser: req.user });

        const result = await serviceMain.insertPengajuan(payload, files, transaction)
        await transaction.commit()

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        if (transaction) await transaction.rollback()
        console.log(error, "ERROR INSERT PENGAJUAN <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage('', error.message))
    }
}

exports.penyelesaianKasbon = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { nip, nama, role_user_id } = req.user

        const files = req?.files?.lampiran ? (Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)) : []

        Object.assign(payload, { created_by: `${nip} - ${nama}`, role_pembuat_id: role_user_id, dataUser: req.user });

        const result = await serviceMain.penyelesaianKasbon(payload, files, transaction)
        await transaction.commit()

        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        if (transaction) await transaction.rollback()
        console.log(error, "ERROR INSERT PENGAJUAN <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage('', error.message))
    }
}

exports.updatePengajuan = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = (JSON.parse(req.body.payload))
        const { nip, nama, user_id, role_user_id } = req.user

        const files = req?.files?.lampiran ? (Array.isArray(req.files.lampiran) ? req.files.lampiran : new Array(req.files.lampiran)) : [];

        Object.assign(payload, { user_id, role_user_id, updated_by: `${nip} - ${nama}`, updated_at: moment().format('YYYY-MM-DD HH:mm:ss'), dataUser: req.user });

        const result = await serviceMain.updatePengajuan(payload, files, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR INSERT PENGAJUAN <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage('', error.message))
    }
}

exports.getSummaryPengajuan = async (req, res) => {
    try {
        const params = {}
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id
        const result = await serviceMain.getSummaryPengajuan(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET SUMMARY PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListPengajuan = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getListPengajuan(params)
        res.status(statusCode.success).json(successMessage(result.data))
    } catch (error) {
        console.log(error, "ERROR GET LIST PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListPengajuanPriority = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getListPengajuanPriority(params)
        res.status(statusCode.success).json(successMessage(result.data))
    } catch (error) {
        console.log(error, "ERROR GET PENGAJUAN PRIORITY <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDashboardSummary = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_id = req?.user?.unit_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getDashboardSummary(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DASHBOARD SUMMARY <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getPengajuanSummary = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_id = req?.user?.unit_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id
        const result = await serviceMain.getPengajuanSummary(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET PENGAJUAN SUMMARY <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getMonitoringSummary = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_id = req?.user?.unit_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id
        const result = await serviceMain.getMonitoringSummary(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET MONITORING SUMMARY <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getPengajuanOmset = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        const result = await serviceMain.getPengajuanOmset(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET PENGAJUAN OMSET <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getMenungguPembayaran = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_id = req?.user?.unit_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id
        const result = await serviceMain.getMenungguPembayaran(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR GET MENUNGGU PEMBAYARAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getPengajuanDashboard = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_id = req?.user?.unit_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getPengajuanDashboard(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR GET PENGAJUAN DASHBOARD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getTaskAktifMingguIni = async (req, res) => {
    try {
        const params = { ...req.query }
        params.cabang_id = req?.user?.cabang_id
        params.role_id = req?.user?.role_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getTaskAktifMingguIni(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR GET TASK AKTIF <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getSLAOverview = async (req, res) => {
    try {
        const params = { ...req.query }
        const result = await serviceMain.getSLAOverview(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET SLA OVERVIEW <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getSLAPerformance = async (req, res) => {
    try {
        const params = { ...req.query }
        const result = await serviceMain.getSLAPerformance(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET SLA PERFORMANCE <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListAllPengajuan = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        // params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        // params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getListAllPengajuan(params)
        res.status(statusCode.success).json(successMessage(result.data))
    } catch (error) {
        console.log(error, "ERROR GET LIST ALL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListAllPengajuanDashboard = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getListAllPengajuanDashboard(params)
        res.status(statusCode.success).json(successMessage(result.data))
    } catch (error) {
        console.log(error, "ERROR GET LIST ALL PENGAJUAN DASHBOARD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListAllPengajuanSLAPerformance = async (req, res) => {
    try {
        const params = { ...req.query }
        params.role_id = req?.user?.role_id
        params.user_id = req?.user?.user_id
        params.role_user_id = req?.user?.role_user_id
        params.cabang_id = req?.user?.cabang_id
        params.unit_kerja_id = req?.user?.unit_kerja_id
        params.jabatan_id = req?.user?.jabatan_id
        params.jenis_user_id = req?.user?.jenis_user_id

        const result = await serviceMain.getListAllPengajuanSLAPerformance(params)
        res.status(statusCode.success).json(successMessage(result.data))
    } catch (error) {
        console.log(error, "ERROR GET LIST ALL PENGAJUAN DASHBOARD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailPengajuan = async (req, res) => {
    try {
        const { pengajuan_id } = req.query
        const { role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id } = req.user
        const result = await serviceMain.getDetailPengajuan({ pengajuan_id, role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailPengajuanNoAuth = async (req, res) => {
    try {
        const { pengajuan_id } = req.query
        const result = await serviceMain.getDetailPengajuanNoAuth({ pengajuan_id })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailUser = async (req, res) => {
    try {
        const { user_id } = req.query
        const result = await serviceMain.getDetailUser({ user_id })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailStatus = async (req, res) => {
    try {
        const { status } = req.query
        const result = await serviceMain.getDetailStatus({ status })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataUser = async (req, res) => {
    try {
        const { tipe_user } = req.query
        const result = await serviceMain.getDataUser({ ...tipe_user, ...req.user })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataMasterApprovalByHeader = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDataMasterApprovalByHeader(params?.payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataMasterApproval = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDataMasterApproval(params?.payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataMasterApprovalAll = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDataMasterApprovalAll(params?.payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailMasterData = async (req, res) => {
    try {
        const params = req.query
        const result = await serviceMain.getDetailMasterData(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailJenisPajak = async (req, res) => {
    try {
        const { jenis_pajak_id } = req.query

        const result = await serviceMain.getDetailJenisPajak({ jenis_pajak_id })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL JENIS PAJAK <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailVendor = async (req, res) => {
    try {
        const { vendor_id } = req.query

        const result = await serviceMain.getDetailVendor({ vendor_id })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL JENIS PAJAK <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailAnggaran = async (req, res) => {
    try {
        const { anggaran_id } = req.query

        const result = await serviceMain.getDetailAnggaran({ anggaran_id })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL JENIS PAJAK <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDetailAnggaranByCoa = async (req, res) => {
    try {
        const payload = req.query

        const result = await serviceMain.getDetailAnggaranByCoa(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL JENIS PAJAK <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataVendor = async (req, res) => {
    try {
        const result = await serviceMain.getDataVendor()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR GET DETAIL PENGAJUAN <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.deleteDokumen = async (req, res) => {
    try {
        const dokumen_id = req.params.dokumen_id
        const { nip, nama } = req.user
        const aktor = nip + ' - ' + nama;
        const result = await serviceMain.deleteDokumen(dokumen_id, aktor)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR DELETE DOKUMEN <<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteCoaPengajuan = async (req, res) => {
    try {
        const pengajuan_coa_id = req.params.pengajuan_coa_id
        const result = await serviceMain.deleteCoaPengajuan(pengajuan_coa_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR DELETE DOKUMEN <<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deletePenjualan = async (req, res) => {
    try {
        const penjualan_id = req.params.penjualan_id
        const result = await serviceMain.deletePenjualan(penjualan_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR DELETE DOKUMEN <<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.deleteMasterApproval = async (req, res) => {
    try {
        const payload = req.body
        const result = await serviceMain.deleteMasterApproval(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR DELETE APPROVAL <<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertStatusPengajuan = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama, user_id, role_user_id } = req.user

        Object.assign(payload, { user_id, role_user_id, history_id: uuidv4(), created_by: `${nip} - ${nama}` });

        const result = await serviceMain.insertStatusPengajuan(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Status History")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

// exports.downloadPdf = async (req, res) => {
//     try {
//         const { pengajuan_id } = req.params
//         const data = await serviceMain.getDetailPengajuan({ pengajuan_id })

//         if (process.env.NODE_ENV === 'local') {
//             const browser = await puppeteer.launch({
//                 headless: true
//             });
//             const page = await browser.newPage();

//             const html = `
//         <!DOCTYPE html>
//         <html lang="id">

//             <head>
//             <meta charset="UTF-8" />
//             <title>Dokumen Pengajuan</title>

//             <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>

//             <style>
//                 body {
//                 font-family: Arial, sans-serif;
//                 margin: 40px;
//                 color: #333;
//                 }

//                 .header {
//                 display: flex;
//                 justify-content: space-between;
//                 align-items: center;
//                 border-bottom: 2px solid #000;
//                 padding-bottom: 10px;
//                 margin-bottom: 20px;
//                 }

//                 .title {
//                 font-size: 18px;
//                 font-weight: bold;
//                 }

//                 .sub {
//                 font-size: 12px;
//                 color: #666;
//                 }

//                 /* INFO TABLE (NO BORDER) */
//                 .info-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 font-size: 12px;
//                 margin-bottom: 20px;
//                 }

//                 .info-table td {
//                 padding: 4px;
//                 }

//                 .label {
//                 width: 120px;
//                 color: #555;
//                 }

//                 /* DETAIL TABLE (WITH BORDER) */
//                 .detail-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 font-size: 12px;
//                 margin-top: 10px;
//                 }

//                 .detail-table th,
//                 .detail-table td {
//                 border: 1px solid #000;
//                 padding: 6px;
//                 }

//                 .detail-table th {
//                 background: #eee;
//                 }

//                 .right {
//                 text-align: right;
//                 }

//                 .total {
//                 margin-top: 10px;
//                 text-align: right;
//                 font-weight: bold;
//                 }

//                 .footer {
//                 margin-top: 60px;
//                 display: flex;
//                 justify-content: space-between;
//                 text-align: center;
//                 font-size: 12px;
//                 }

//                 .ttd {
//                 width: 22%;
//                 }

//                 .space {
//                 height: 60px;
//                 }

//                 @media print {
//                 body {
//                     margin: 30px;
//                 }
//                 }
//             </style>
//             </head>

//             <body>

//             <!-- HEADER -->
//             <div class="header">
//                 <div>
//                 <div class="title">Dokumen Pengajuan</div>
//                 <div class="sub">Ringkasan Data Pengajuan dan Detail Transaksi</div>
//                 </div>

//                 <canvas id="qrcode"></canvas>
//             </div>

//             <!-- INFO (NO BORDER) -->
//             <table class="info-table">
//                 <tr>
//                 <td class="label">No Pengajuan</td>
//                 <td>: ${data?.no_pengajuan}</td>

//                 <td class="label">Jabatan Pembuat</td>
//                 <td>: ${data?.ur_jabatan_id}</td>
//                 </tr>

//                 <tr>
//                 <td class="label">Jenis</td>
//                 <td>: ${data?.ur_jenis_biaya_id}</td>

//                 <td class="label">Cabang Pembuat</td>
//                 <td>: ${data?.ur_cabang_id}</td>
//                 </tr>

//                 <tr>
//                 <td class="label">Tanggal</td>
//                 <td>: ${formatDate(data?.created_at)}</td>

//                 <td class="label">Nama</td>
//                 <td>: ${data?.nama_pemohon}</td>
//                 </tr>

//                 <tr>
//                 <td class="label"></td>
//                 <td></td>

//                 <td></td>
//                 <td></td>
//                 </tr>
//             </table>

//             <!-- DETAIL BIAYA (WITH BORDER) -->
//             <table class="detail-table">
//                 <thead>
//                 <tr>
//                     <th>No</th>
//                     <th>GL Account</th>
//                     <th>Account Description</th>
//                     <th class="right">Nominal</th>
//                 </tr>
//                 </thead>
//                 <tbody>
//                 ${data?.coa?.map(item => (
//                 `<tr>
//                     <td align="center">1</td>
//                     <td>${item?.gl_account}</td>
//                     <td>${item?.ur_coa_detail_id}</td>
//                     <td class="right">${formatCurrency(item?.nominal)}</td>
//                 </tr>`
//             ))}
//                 </tbody>
//             </table>

//             <!-- TOTAL -->
//             <div class="total">
//                 Total: ${formatCurrency(data?.nominal_dpp)}
//             </div>

//             <!-- FOOTER -->
//             <div class="footer">
//                 <div class="ttd">
//                 Dibuat Oleh
//                 <div class="space"></div>
//                 (${data?.created_by.split("- ")[1]})
//                 </div>

//                 <div class="ttd">
//                 Diperiksa
//                 <div class="space"></div>
//                 (........................)
//                 </div>

//                 <div class="ttd">
//                 Disetujui
//                 <div class="space"></div>
//                 (........................)
//                 </div>

//                 <div class="ttd">
//                 Mengetahui
//                 <div class="space"></div>
//                 (........................)
//                 </div>
//             </div>

//             <script>
//                 QRCode.toCanvas(document.getElementById("qrcode"), '${'http://173.212.225.28:8001/verifikasi-dokumen?status='}${pengajuan_id}', {
//                 width: 80
//                 });
//             </script>

//             </body>

// </html>
//         `;

//             await page.setContent(html, {
//                 waitUntil: 'networkidle0'
//             });

//             const pdf = await page.pdf({
//                 format: 'A4',
//                 printBackground: true
//             });

//             // await browser.close();

//             // res.set({
//             //     'Content-Type': 'application/pdf',
//             //     'Content-Disposition':
//             //         'attachment; filename=dokumen-pengajuan.pdf'
//             // });

//             res.removeHeader('X-Frame-Options');
//             res.set({
//                 'Content-Type': 'application/pdf',
//                 'Content-Length': pdf.length,
//                 'Content-Disposition': 'inline; filename="dokumen-pengajuan.pdf"',
//                 'Content-Security-Policy': 'frame-ancestors *'
//             });
//             return res.end(pdf);

//             // res.send(pdf);
//         } else {
//             const browser = await puppeteer.launch({
//                 headless: true,
//                 executablePath:
//                     "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
//                 args: [
//                     "--no-sandbox",
//                     "--disable-setuid-sandbox",
//                     "--disable-dev-shm-usage"
//                 ]
//             });
//             const page = await browser.newPage();

//             const html = `
//         <!DOCTYPE html>
//         <html lang="id">

//             <head>
//             <meta charset="UTF-8" />
//             <title>Dokumen Pengajuan</title>

//             <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>

//             <style>
//                 body {
//                 font-family: Arial, sans-serif;
//                 margin: 40px;
//                 color: #333;
//                 }

//                 .header {
//                 display: flex;
//                 justify-content: space-between;
//                 align-items: center;
//                 border-bottom: 2px solid #000;
//                 padding-bottom: 10px;
//                 margin-bottom: 20px;
//                 }

//                 .title {
//                 font-size: 18px;
//                 font-weight: bold;
//                 }

//                 .sub {
//                 font-size: 12px;
//                 color: #666;
//                 }

//                 /* INFO TABLE (NO BORDER) */
//                 .info-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 font-size: 12px;
//                 margin-bottom: 20px;
//                 }

//                 .info-table td {
//                 padding: 4px;
//                 }

//                 .label {
//                 width: 120px;
//                 color: #555;
//                 }

//                 /* DETAIL TABLE (WITH BORDER) */
//                 .detail-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 font-size: 12px;
//                 margin-top: 10px;
//                 }

//                 .detail-table th,
//                 .detail-table td {
//                 border: 1px solid #000;
//                 padding: 6px;
//                 }

//                 .detail-table th {
//                 background: #eee;
//                 }

//                 .right {
//                 text-align: right;
//                 }

//                 .total {
//                 margin-top: 10px;
//                 text-align: right;
//                 font-weight: bold;
//                 }

//                 .footer {
//                 margin-top: 60px;
//                 display: flex;
//                 justify-content: space-between;
//                 text-align: center;
//                 font-size: 12px;
//                 }

//                 .ttd {
//                 width: 22%;
//                 }

//                 .space {
//                 height: 60px;
//                 }

//                 @media print {
//                 body {
//                     margin: 30px;
//                 }
//                 }
//             </style>
//             </head>

//             <body>

//             <!-- HEADER -->
//             <div class="header">
//                 <div>
//                 <div class="title">Dokumen Pengajuan</div>
//                 <div class="sub">Ringkasan Data Pengajuan dan Detail Transaksi</div>
//                 </div>

//                 <canvas id="qrcode"></canvas>
//             </div>

//             <!-- INFO (NO BORDER) -->
//             <table class="info-table">
//                 <tr>
//                 <td class="label">No Pengajuan</td>
//                 <td>: ${data?.no_pengajuan}</td>

//                 <td class="label">Jabatan Pembuat</td>
//                 <td>: ${data?.ur_jabatan_id}</td>
//                 </tr>

//                 <tr>
//                 <td class="label">Jenis</td>
//                 <td>: ${data?.ur_jenis_biaya_id}</td>

//                 <td class="label">Cabang Pembuat</td>
//                 <td>: ${data?.ur_cabang_id}</td>
//                 </tr>

//                 <tr>
//                 <td class="label">Tanggal</td>
//                 <td>: ${formatDate(data?.created_at)}</td>

//                 <td class="label">Nama</td>
//                 <td>: ${data?.nama_pemohon}</td>
//                 </tr>

//                 <tr>
//                 <td class="label"></td>
//                 <td></td>

//                 <td></td>
//                 <td></td>
//                 </tr>
//             </table>

//             <!-- DETAIL BIAYA (WITH BORDER) -->
//             <table class="detail-table">
//                 <thead>
//                 <tr>
//                     <th>No</th>
//                     <th>Jenis Biaya</th>
//                     <th>Deskripsi</th>
//                     <th class="right">Nominal</th>
//                 </tr>
//                 </thead>
//                 <tbody>
//                 <tr>
//                     <td align="center">1</td>
//                     <td>${data?.ur_jenis_biaya_id}</td>
//                     <td>${data?.keterangan}</td>
//                     <td class="right">${formatCurrency(data?.nominal_dpp)}</td>
//                 </tr>
//                 </tbody>
//             </table>

//             <!-- TOTAL -->
//             <div class="total">
//                 Total: ${formatCurrency(data?.nominal_dpp)}
//             </div>

//             <!-- FOOTER -->
//             <div class="footer">
//                 <div class="ttd">
//                 Dibuat Oleh
//                 <div class="space"></div>
//                 (${data?.created_by.split("- ")[1]})
//                 </div>

//                 <div class="ttd">
//                 Diperiksa
//                 <div class="space"></div>
//                 (........................)
//                 </div>

//                 <div class="ttd">
//                 Disetujui
//                 <div class="space"></div>
//                 (........................)
//                 </div>

//                 <div class="ttd">
//                 Mengetahui
//                 <div class="space"></div>
//                 (........................)
//                 </div>
//             </div>

//             <script>
//                 QRCode.toCanvas(document.getElementById("qrcode"), '${'http://173.212.225.28:8001/verifikasi-dokumen?status='}${pengajuan_id}', {
//                 width: 80
//                 });
//             </script>

//             </body>

// </html>
//         `;

//             await page.setContent(html, {
//                 waitUntil: 'networkidle0'
//             });

//             const pdf = await page.pdf({
//                 format: 'A4',
//                 printBackground: true
//             });

//             // await browser.close();

//             // res.set({
//             //     'Content-Type': 'application/pdf',
//             //     'Content-Disposition':
//             //         'attachment; filename=dokumen-pengajuan.pdf'
//             // });

//             res.removeHeader('X-Frame-Options');
//             res.set({
//                 'Content-Type': 'application/pdf',
//                 'Content-Length': pdf.length,
//                 'Content-Disposition': 'inline; filename="dokumen-pengajuan.pdf"',
//                 'Content-Security-Policy': 'frame-ancestors *'
//             });
//             return res.end(pdf);

//             // res.send(pdf);
//         }
//     } catch (err) {
//         res.status(500).json({
//             status: false,
//             message: err.message
//         });
//     }
// };

// exports.downloadPdf = async (req, res) => {
//   const pdf = fs.readFileSync('./test.pdf');

//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader(
//     'Content-Disposition',
//     'inline; filename=test.pdf'
//   );

//   return res.end(pdf);
// };

// exports.downloadPdf = async (req, res) => {
//   let browser;

//   try {
//     const { pengajuan_id } = req.params;
//     const data = await serviceMain.getDetailPengajuan({ pengajuan_id });

//     const executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

//     browser = await puppeteer.launch({
//       headless: true,
//       executablePath,
//       args: [
//         "--no-sandbox",
//         "--disable-setuid-sandbox",
//         "--disable-dev-shm-usage"
//       ].filter(Boolean)
//     });

//     const page = await browser.newPage();

//     const coaRows = (data?.coa || []).map((item, index) => `
//       <tr>
//         <td align="center">${index + 1}</td>
//         <td>${item?.gl_account ?? ""}</td>
//         <td>${item?.ur_coa_detail_id ?? ""}</td>
//         <td class="right">${formatCurrency(item?.nominal)}</td>
//       </tr>
//     `).join("");

//     const html = `
//       <!DOCTYPE html>
//       <html lang="id">
//       <head>
//         <meta charset="UTF-8" />
//         <title>Dokumen Pengajuan</title>
//         <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
//           .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
//           .title { font-size: 18px; font-weight: bold; }
//           .sub { font-size: 12px; color: #666; }
//           .info-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
//           .info-table td { padding: 4px; }
//           .label { width: 120px; color: #555; }
//           .detail-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
//           .detail-table th, .detail-table td { border: 1px solid #000; padding: 6px; }
//           .detail-table th { background: #eee; }
//           .right { text-align: right; }
//           .total { margin-top: 10px; text-align: right; font-weight: bold; }
//           .footer { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; }
//           .ttd { width: 22%; }
//           .space { height: 60px; }
//           @media print { body { margin: 30px; } }
//         </style>
//       </head>
//       <body>
//         <div class="header">
//           <div>
//             <div class="title">Dokumen Pengajuan</div>
//             <div class="sub">Ringkasan Data Pengajuan dan Detail Transaksi</div>
//           </div>
//           <canvas id="qrcode"></canvas>
//         </div>

//         <table class="info-table">
//           <tr>
//             <td class="label">No Pengajuan</td>
//             <td>: ${data?.no_pengajuan ?? ""}</td>
//             <td class="label">Jabatan Pembuat</td>
//             <td>: ${data?.ur_jabatan_id ?? ""}</td>
//           </tr>
//           <tr>
//             <td class="label">Jenis</td>
//             <td>: ${data?.ur_jenis_biaya_id ?? ""}</td>
//             <td class="label">Cabang Pembuat</td>
//             <td>: ${data?.ur_cabang_id ?? ""}</td>
//           </tr>
//           <tr>
//             <td class="label">Tanggal</td>
//             <td>: ${formatDate(data?.created_at) ?? ""}</td>
//             <td class="label">Nama</td>
//             <td>: ${data?.nama_pemohon ?? ""}</td>
//           </tr>
//         </table>

//         <table class="detail-table">
//           <thead>
//             <tr>
//               <th>No</th>
//               <th>GL Account</th>
//               <th>Account Description</th>
//               <th class="right">Nominal</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${coaRows}
//           </tbody>
//         </table>

//         <div class="total">Total: ${formatCurrency(data?.nominal_dpp)}</div>

//         <div class="footer">
//           <div class="ttd">
//             Dibuat Oleh
//             <div class="space"></div>
//             (${data?.created_by?.split("- ")[1] ?? ""})
//           </div>
//           <div class="ttd">Diperiksa<div class="space"></div>(........................)</div>
//           <div class="ttd">Disetujui<div class="space"></div>(........................)</div>
//           <div class="ttd">Mengetahui<div class="space"></div>(........................)</div>
//         </div>

//         <script>
//           QRCode.toCanvas(
//             document.getElementById("qrcode"),
//             'http://173.212.225.28:8001/verifikasi-dokumen?status=${pengajuan_id}',
//             { width: 80 }
//           );
//         </script>
//       </body>
//       </html>
//     `;

//     await page.setContent(html, { waitUntil: 'networkidle0' });

//     const pdf = await page.pdf({
//       format: 'A4',
//       printBackground: true
//     });

//     res.removeHeader('X-Frame-Options');
//     res.removeHeader('Content-Security-Policy');
//     res.set({
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': 'inline; filename="dokumen-pengajuan.pdf"',
//       'Content-Security-Policy': 'frame-ancestors *'
//     });

//     return res.status(200).send(pdf);
//   } catch (err) {
//     console.error('downloadPdf error:', err);
//     return res.status(500).json({
//       status: false,
//       message: err.message
//     });
//   } finally {
//     if (browser) {
//       await browser.close().catch(() => {});
//     }
//   }
// };


exports.downloadPdf = async (req, res) => {
    let browser;

    try {
        const path = require("path");

        console.log("1. Launch browser");

        browser = await puppeteer.launch({
            headless: "new",

            executablePath:
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",

            timeout: 120000,

            userDataDir: path.join(__dirname, "chrome-profile"),

            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--no-first-run",
                "--no-default-browser-check"
            ]
        });

        console.log("2. Browser launched");

        const page = await browser.newPage();

        console.log("3. Set content");

        await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test PDF</title>
      </head>
      <body>
        <h1>Hello World</h1>
        <p>PDF berhasil dibuat dari Puppeteer.</p>
        <p>${new Date().toISOString()}</p>
      </body>
      </html>
    `);

        console.log("4. Generate PDF");

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
        });

        console.log("5. PDF generated");

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="test.pdf"',
        });

        return res.send(pdf);
    } catch (err) {
        console.error("ERROR:", err);

        return res.status(500).json({
            status: false,
            message: err.message,
            stack: err.stack,
        });
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
};

exports.getListCoa = async (req, res) => {
    try {
        const keyword = req?.query?.keyword || '';
        const result = await serviceMain.getListCoa(keyword)
        if (result?.length) {
            res.status(statusCode.success).json(successMessage(result))
        } else {
            res.status(statusCode.notfound).json(successMessage([], 'Data not found'))
        }
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListCoaDetail = async (req, res) => {
    try {
        // const { coa_id } = req?.query;
        // const result = await serviceMain.getListCoaDetail(coa_id)
        // if (result?.length) {
        //     res.status(statusCode.success).json(successMessage(result))
        // } else {
        //     res.status(statusCode.notfound).json(successMessage([], 'Data not found'))
        // }
        const keyword = req?.query?.keyword || '';
        const result = await serviceMain.getListCoaDetail(keyword)
        if (result?.length) {
            res.status(statusCode.success).json(successMessage(result))
        } else {
            res.status(statusCode.notfound).json(successMessage([], 'Data not found'))
        }
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListCoaDetailByCabang = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListCoaDetailByCabang(params)
        if (result?.length) {
            res.status(statusCode.success).json(successMessage(result))
        } else {
            res.status(statusCode.notfound).json(successMessage([], 'Data not found'))
        }
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListCoaDetailDashboard = async (req, res) => {
    try {
        const params = req?.query;
        params.role_id = req.user.role_id
        const result = await serviceMain.getListCoaDetailDashboard(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListCoaDetailByDashboard = async (req, res) => {
    try {
        const params = req?.query;
        params.cabang_id = req.user.cabang_id
        const result = await serviceMain.getListCoaDetailByDashboard(params)
        if (result?.length) {
            res.status(statusCode.success).json(successMessage(result))
        } else {
            res.status(statusCode.notfound).json(successMessage([], 'Data not found'))
        }
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListUserManagement = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListUserManagement(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListMasterApproval = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListMasterApproval(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListMasterData = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListMasterData(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListManajemenSession = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListManajemenSession(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListJenisPajak = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListJenisPajak(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListVendor = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListVendor(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST COA <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListAnggaran = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListAnggaran(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST Anggaran <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getListPenjualan = async (req, res) => {
    try {
        const params = req?.query;
        const result = await serviceMain.getListPenjualan(params)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST Anggaran <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertCoaPengajuan = async (req, res) => {
    let transaction
    try {
        const payload = req.body
        const { nip, nama } = req.user

        if (!payload?.pengajuan_coa_id) {
            transaction = await db.transaction()
            Object.assign(payload, { pengajuan_coa_id: uuidv4(), created_by: `${nip} - ${nama}` });
            const result = await serviceMain.insertCoaPengajuan(payload, transaction)
            await transaction.commit()
            return res.status(statusCode.success).json(successMessage(result))
        } else {
            Object.assign(payload, { updated_at: new Date(), updated_by: `${nip} - ${nama}` });
            const result = await serviceMain.updateCoaPengajuan(payload)
            return res.status(statusCode.success).json(successMessage(result))
        }
    } catch (error) {
        console.log(error, "Error Insert Status History")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertUser = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { user_id: uuidv4(), role_user_id: uuidv4(), created_by: `${nip} - ${nama}` });

        const result = await serviceMain.insertUser(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert User")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertMasterApproval = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user

        const result = await serviceMain.insertMasterApproval(payload, req.user, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertMasterData = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { created_by: nama })

        const result = await serviceMain.insertMasterData(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertJenisPajak = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { jenis_pajak_id: uuidv4(), created_by: nama })

        const result = await serviceMain.insertJenisPajak(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertVendor = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { vendor_id: uuidv4(), created_by: nama })

        const result = await serviceMain.insertVendor(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertJenisPajakArray = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        const data = payload.map(item => ({
            ...item,
            jenis_pajak_id: uuidv4(),
            created_by: nip + ' - ' + nama
        }));

        const result = await serviceMain.insertJenisPajakArray(data, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertVendorArray = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        const data = payload.map(item => ({
            ...item,
            vendor_id: uuidv4(),
            created_by: nip + ' - ' + nama
        }));

        const result = await serviceMain.insertVendorArray(data, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertAnggaran = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { anggaran_id: uuidv4(), created_by: nama })
        const result = await serviceMain.insertAnggaran(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Anggaran Baru")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertHariLiburArray = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const data = req.body
        const { nip, nama } = req.user
        const result = await serviceMain.insertHariLiburArray(data, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Anggaran Baru")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertAnggaranArray = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const { isAdjustment, data } = req.body
        const { nip, nama } = req.user
        await model.h_upload_data.create({
            upload_by: nama,
            table_name: 'd_pemakaian_anggaran, d_penambahan_anggaran',
            action: 'INSERT'
        })
        const dataX = data.map(item => ({
            ...item,
            anggaran_id: uuidv4(),
            created_by: nama
        }));
        const result = await serviceMain.insertAnggaranArray(isAdjustment, dataX, nama, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Anggaran Baru")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateAnggaranArray = async (req, res) => {
    // let transaction
    try {
        // transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        await model.h_upload_data.create({
            upload_by: nama,
            table_name: 'd_pemakaian_anggaran, d_penambahan_anggaran',
            action: 'UPDATE'
        })
        // const result = await serviceMain.updateAnggaranArray(payload, transaction)
        const result = await serviceMain.updateAnggaranArray(payload, nama)
        // await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Anggaran Baru")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertPenjualanArray = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        const data = payload.map(item => ({
            ...item,
            penjualan_id: uuidv4(),
            created_by: nama
        }));
        const result = await serviceMain.insertPenjualanArray(data, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Anggaran Baru")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.AddAnggaran = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { penambahan_anggaran_id: uuidv4(), created_by: nama })
        const result = await serviceMain.AddAnggaran(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Add ANggaran")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.MinusAnggaran = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { pemakaian_anggaran_id: uuidv4(), created_by: nama })
        const result = await serviceMain.MinusAnggaran(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Insert Add ANggaran")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateMasterApproval = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user

        const result = await serviceMain.updateMasterApproval(payload, req.user, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))

    } catch (error) {
        console.log(error, "Error Update Master Approval")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateMasterData = async (req, res) => {
    try {
        const payload = req.body
        const { nip, nama } = req.user
        const { created_at, created_by, flag_show, kd_ref, updated_at, updated_by, ...payUpdate } = payload
        Object.assign(payUpdate, { updated_by: nama, updated_at: moment().format('YYYY-MM-DD HH:mm:ss') })
        console.log('payUpdate', payUpdate);

        const result = await serviceMain.updateMasterData(payUpdate)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error Update Master Data")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateJenisPajak = async (req, res) => {
    try {
        const payload = req.body
        const { nip, nama } = req.user
        const { created_at, created_by, updated_at, updated_by, ...payUpdate } = payload
        Object.assign(payUpdate, { updated_by: nama, updated_at: moment().format('YYYY-MM-DD HH:mm:ss') })

        const result = await serviceMain.updateJenisPajak(payUpdate)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error Update Master Data")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateVendor = async (req, res) => {
    try {
        const payload = req.body
        const { nip, nama } = req.user
        const { created_at, created_by, updated_at, updated_by, ...payUpdate } = payload
        Object.assign(payUpdate, { updated_by: nama, updated_at: moment().format('YYYY-MM-DD HH:mm:ss') })

        const result = await serviceMain.updateVendor(payUpdate)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error Update Master Data")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateNotifikasiPush = async (req, res) => {
    try {
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { updated_by: nama, updated_at: moment().format('YYYY-MM-DD HH:mm:ss') })

        const result = await serviceMain.updateNotifikasiPush(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error Update Master Data")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.readAllNotification = async (req, res) => {
    try {
        const payload = req.body
        const { nip, nama, user_id } = req.user
        Object.assign(payload, { updated_by: nama, user_id: user_id, updated_at: moment().format('YYYY-MM-DD HH:mm:ss') })

        const result = await serviceMain.readAllNotification(payload)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "Error Update Master Data")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.updateUser = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const payload = req.body
        const { nip, nama } = req.user
        Object.assign(payload, { updated_by: `${nip} - ${nama}`, updated_at: moment().format('YYYY-MM-DD HH:mm:ss') });

        const result = await serviceMain.updateUser(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR INSERT PENGAJUAN <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage('', error.message))
    }
}

exports.getListNotification = async (req, res) => {
    try {
        const params = { ...req.query }
        params.user_id = req?.user?.user_id
        const result = await serviceMain.getListNotification(params)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.changePassword = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ status: false, message: "Username dan password wajib diisi." });
    }

    try {
        //   const hashedPassword = await hashPassword(password);
        const hashedPassword = await encodedJwt(password);

        const [results] = await db.query(
            `UPDATE m_user SET password = :password WHERE username = :identifier`,
            {
                replacements: { password: hashedPassword, identifier },
            }
        );

        if (results.rowsAffected === 0 || results === 0) {
            return res.status(statusCode.notfound).json(errorMessage({}, "User tidak ditemukan."));
        }

        res.status(statusCode.success).json(successMessage({}, "Password Berhasil Diubah."));
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(statusCode.error).json(errorMessage({}, "Gagal Mengganti Password."));
    }
};

exports.killSession = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ status: false, message: "Id wajib diisi." });
    }

    try {
        const [results] = await db.query(
            `UPDATE s_users SET is_active = 'T' WHERE s_id = :id`,
            {
                replacements: { id: id },
            }
        );

        if (results.rowsAffected === 0 || results === 0) {
            return res.status(statusCode.notfound).json(errorMessage({}, "User tidak ditemukan."));
        }

        res.status(statusCode.success).json(successMessage({}, "Berhasil Di Kill."));
    } catch (err) {
        console.error("Kill Error:", err);
        res.status(statusCode.error).json(errorMessage({}, "Gagal di Kill."));
    }
};

exports.clearSession = async () => {
    const result = await serviceMain.clearSession();
    return result;
}

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
        const id = req.params.m_h_id
        const result = await serviceMain.deleteHariLibur(id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        res.status(statusCode.bad).json(errorMessage(error.message))
    }
}

exports.insertHariLibur = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()
        const dataUser = req.user
        const payload = req.body
        const result = await serviceMain.createHariLibur(payload, transaction)
        await transaction.commit()
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<<")
        if (transaction) await transaction.rollback()
        res.status(statusCode.error).json(errorMessage('', error?.message))
    }
}