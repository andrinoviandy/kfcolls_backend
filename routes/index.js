const express = require('express');
const router = express.Router();
const controller = require('../controllers/index')
const authorization = require('../middlewares/authorization')
const swagger = require('../middlewares/swagger')
const bodyParser = require("body-parser");

/* GET home page. */
// router.get('/getListMenu', swagger.getListMenu, authorization.doAuth, controller.main.getListMenu);
// router.get('/getAcl', swagger.getAcl, controller.main.getAcl)
// router.get('/getPermissionCrud', swagger.getPermissionCrud, authorization.doAuth, controller.main.getPermissionCrud);

// Referensi
router.get('/getReferensiByJenis', authorization.doAuth, controller.main.getReferensiByJenis)
router.get('/getSubReferensiByJenis', swagger.getSubReferensiByJenis, controller.main.getSubReferensiByJenis)
router.get('/getReferensiByJenisGroup', authorization.doAuth, controller.main.getReferensiByJenisGroup)

// Get List Data
router.get('/getSummaryPengajuan', authorization.doAuth, controller.main.getSummaryPengajuan)
router.get('/getListPengajuan', authorization.doAuth, controller.main.getListPengajuan)
router.get('/getListPengajuanPriority', authorization.doAuth, controller.main.getListPengajuanPriority)
router.get('/getDashboardSummary', authorization.doAuth, controller.main.getDashboardSummary)
router.get('/getPengajuanSummary', authorization.doAuth, controller.main.getPengajuanSummary)
router.get('/getMonitoringSummary', authorization.doAuth, controller.main.getMonitoringSummary)
router.get('/getPengajuanOmset', authorization.doAuth, controller.main.getPengajuanOmset)
router.get('/getMenungguPembayaran', authorization.doAuth, controller.main.getMenungguPembayaran)
router.get('/getPengajuanDashboard', authorization.doAuth, controller.main.getPengajuanDashboard)
router.get('/getTaskAktifMingguIni', authorization.doAuth, controller.main.getTaskAktifMingguIni)
router.get('/getSLAOverview', authorization.doAuth, controller.main.getSLAOverview)
router.get('/getSLAPerformance', authorization.doAuth, controller.main.getSLAPerformance)
router.get('/getListAllPengajuan', authorization.doAuth, controller.main.getListAllPengajuan)
router.get('/getListAllPengajuanDashboard', authorization.doAuth, controller.main.getListAllPengajuanDashboard)
router.get('/getListAllPengajuanSLAPerformance', authorization.doAuth, controller.main.getListAllPengajuanSLAPerformance)
router.get('/getDetailPengajuan', authorization.doAuth, controller.main.getDetailPengajuan)
router.get('/getDetailPengajuanNoAuth', controller.main.getDetailPengajuanNoAuth)
router.get('/getDetailUser', authorization.doAuth, controller.main.getDetailUser)
router.get('/getDataUser', authorization.doAuth, controller.main.getDataUser)
router.get('/getDataMasterApprovalByHeader', authorization.doAuth, controller.main.getDataMasterApprovalByHeader)
router.get('/getDataMasterApproval', authorization.doAuth, controller.main.getDataMasterApproval)
router.get('/getDataMasterApprovalAll', authorization.doAuth, controller.main.getDataMasterApprovalAll)
router.get('/getDetailMasterData', authorization.doAuth, controller.main.getDetailMasterData)
router.get('/getDetailJenisPajak', authorization.doAuth, controller.main.getDetailJenisPajak)
router.get('/getDetailVendor', authorization.doAuth, controller.main.getDetailVendor)
router.get('/getDetailAnggaran', authorization.doAuth, controller.main.getDetailAnggaran)
router.get('/getDetailAnggaranByCoa', authorization.doAuth, controller.main.getDetailAnggaranByCoa)
router.get('/getDataVendor', authorization.doAuth, controller.main.getDataVendor)
router.get('/getDetailStatus', controller.main.getDetailStatus)
router.get('/getListCoa', authorization.doAuth, controller.main.getListCoa)
router.get('/getListCoaDetail', authorization.doAuth, controller.main.getListCoaDetail)
router.get('/getListCoaDetailByCabang', authorization.doAuth, controller.main.getListCoaDetailByCabang)
router.get('/getListCoaDetailByDashboard', authorization.doAuth, controller.main.getListCoaDetailByDashboard)
router.get('/getListCoaDetailDashboard', authorization.doAuth, controller.main.getListCoaDetailDashboard)
router.get('/getListUserManagement', authorization.doAuth, controller.main.getListUserManagement)
router.get('/getListMasterApproval', authorization.doAuth, controller.main.getListMasterApproval)
router.get('/getListMasterData', authorization.doAuth, controller.main.getListMasterData)
router.get('/getListManajemenSession', authorization.doAuth, controller.main.getListManajemenSession)
router.get('/getListJenisPajak', authorization.doAuth, controller.main.getListJenisPajak)
router.get('/getListVendor', authorization.doAuth, controller.main.getListVendor)
router.get('/getListAnggaran', authorization.doAuth, controller.main.getListAnggaran)
router.get('/getListPenjualan', authorization.doAuth, controller.main.getListPenjualan)
router.get('/getListNotification', authorization.doAuth, controller.main.getListNotification);
router.get('/getListHariLibur',authorization.doAuth, controller.main.getListHariLibur)

// Insert Data
router.post('/penyelesaianKasbon', authorization.doAuth, controller.main.penyelesaianKasbon)
router.post('/insertPengajuan', authorization.doAuth, controller.main.insertPengajuan)
router.post('/insertStatusPengajuan', authorization.doAuth, controller.main.insertStatusPengajuan)
router.post('/insertCoaPengajuan', authorization.doAuth, controller.main.insertCoaPengajuan)
router.post('/insertUser', authorization.doAuth, controller.main.insertUser)
router.post('/insertMasterApproval', authorization.doAuth, controller.main.insertMasterApproval)
router.post('/insertMasterData', authorization.doAuth, controller.main.insertMasterData)
router.post('/insertJenisPajak', authorization.doAuth, controller.main.insertJenisPajak)
router.post('/insertJenisPajakArray', authorization.doAuth, controller.main.insertJenisPajakArray)
router.post('/insertVendor', authorization.doAuth, controller.main.insertVendor)
router.post('/insertVendorArray', authorization.doAuth, controller.main.insertVendorArray)
router.post('/insertAnggaran', authorization.doAuth, controller.main.insertAnggaran)
router.post('/insertAnggaranArray', authorization.doAuth, controller.main.insertAnggaranArray)
router.post('/updateAnggaranArray', authorization.doAuth, controller.main.updateAnggaranArray)
router.post('/insertHariLiburArray', authorization.doAuth, controller.main.insertHariLiburArray)
router.post('/insertPenjualanArray', authorization.doAuth, controller.main.insertPenjualanArray)
router.post('/addAnggaran', authorization.doAuth, controller.main.AddAnggaran)
router.post('/minusAnggaran', authorization.doAuth, controller.main.MinusAnggaran)
router.post("/gantipassword-user", authorization.doAuth, controller.main.changePassword)
router.post("/killSession", authorization.doAuth, controller.main.killSession)
router.post('/insertHariLibur', authorization.doAuth, controller.main.insertHariLibur);

// UPDATE DATA
router.put('/updatePengajuan', authorization.doAuth, controller.main.updatePengajuan)
router.put('/updateUser', authorization.doAuth, controller.main.updateUser)
router.put('/updateMasterApproval', authorization.doAuth, controller.main.updateMasterApproval)
router.put('/updateMasterData', authorization.doAuth, controller.main.updateMasterData)
router.put('/updateJenisPajak', authorization.doAuth, controller.main.updateJenisPajak)
router.put('/updateVendor', authorization.doAuth, controller.main.updateVendor)
router.put('/updateNotifikasiPush', authorization.doAuth, controller.main.updateNotifikasiPush);
router.put('/readAllNotification', authorization.doAuth, controller.main.readAllNotification);

// Delete Data
router.post('/deleteMasterApproval', authorization.doAuth, controller.main.deleteMasterApproval)
router.delete('/deleteDokumen/:dokumen_id', authorization.doAuth, controller.main.deleteDokumen)
router.delete('/deleteCoaPengajuan/:pengajuan_coa_id', authorization.doAuth, controller.main.deleteCoaPengajuan)
router.delete('/deletePenjualan/:penjualan_id', authorization.doAuth, controller.main.deletePenjualan)
router.delete('/deleteHariLibur/:m_h_id', authorization.doAuth, controller.main.deleteHariLibur)

// Download
// router.post('/downloadPdf', authorization.doAuth, controller.main.downloadPdf)
router.get(
  '/download-pdf/:pengajuan_id',
  controller.main.downloadPdf
);

module.exports = router;