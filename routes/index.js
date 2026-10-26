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
router.get('/getDataPenjualan', authorization.doAuth, controller.main.getDataPenjualan);
router.get('/getDataPiutang', authorization.doAuth, controller.main.getDataPiutang);
router.get('/getDataKreasiFaktur', authorization.doAuth, controller.main.getDataKreasiFaktur);
router.get('/getDataReportSales', authorization.doAuth, controller.main.getDataReportSales);
router.get('/getDataPelanggan', authorization.doAuth, controller.main.getDataPelanggan);
router.get('/getListPrinciple', authorization.doAuth, controller.main.getListPrinciple);
router.get('/getListUserManagement', authorization.doAuth, controller.main.getListUserManagement)
router.get('/getListDataCod', authorization.doAuth, controller.main.getListDataCod)
router.get('/getDataFakturPetugas', authorization.doAuth, controller.main.getDataFakturPetugas)
router.get('/getDataTukarFaktur', authorization.doAuth, controller.main.getDataTukarFaktur)
router.get('/getDataVerifikasiTukarFaktur', authorization.doAuth, controller.main.getDataVerifikasiTukarFaktur)
router.get('/getDataVerifikasiPembayaran', authorization.doAuth, controller.main.getDataVerifikasiPembayaran)
router.get('/getDataBayarFaktur', authorization.doAuth, controller.main.getDataBayarFaktur)
router.get('/getMonitoringPenugasan', authorization.doAuth, controller.main.getMonitoringPenugasan)
router.get('/getDetailPenjualan', authorization.doAuth, controller.main.getDetailPenjualan)
router.get('/getDetailPencairan', authorization.doAuth, controller.main.getDetailPencairan)
router.get('/getDataKonfirmasiPiutang', authorization.doAuth, controller.main.getDataKonfirmasiPiutang)
router.get('/getDataLaporan', authorization.doAuth, controller.main.getDataLaporan);
router.get('/getDataKonfirmasiCustomer', controller.main.getDataKonfirmasiCustomer)
router.get('/getDataPenerimaanLain', controller.main.getDataPenerimaanLain)
router.get('/getListNotification', authorization.doAuth, controller.main.getListNotification);
// =====================================================
// DASHBOARD PIUTANG
// =====================================================
router.get(
    '/getSummaryPiutangDashboard',
    authorization.doAuth,
    controller.main.getSummaryPiutangDashboard
);

router.get(
    '/getTrendSaldoPiutangDashboard',
    authorization.doAuth,
    controller.main.getTrendSaldoPiutangDashboard
);

router.get(
    '/getDetailPiutangDashboard',
    authorization.doAuth,
    controller.main.getDetailPiutangDashboard
);

router.get(
    '/getSalesOpenInvoiceDashboard',
    authorization.doAuth,
    controller.main.getSalesOpenInvoiceDashboard
);

router.get(
    '/getAnalisisPiutangDashboard',
    authorization.doAuth,
    controller.main.getAnalisisPiutangDashboard
);

router.get(
    '/getCollectionByCustomerDashboard',
    authorization.doAuth,
    controller.main.getCollectionByCustomerDashboard
);

router.get(
    '/getPerformaPiutangProdukDashboard',
    authorization.doAuth,
    controller.main.getPerformaPiutangProdukDashboard
);

// =====================================================
// MASTER FILTER DASHBOARD
// =====================================================
router.get(
    '/getReferensiDashboard',
    authorization.doAuth,
    controller.main.getReferensiDashboard
);

router.get(
    '/getPrincipleDashboard',
    authorization.doAuth,
    controller.main.getPrincipleDashboard
);

router.get(
    '/getCustomerDashboard',
    authorization.doAuth,
    controller.main.getCustomerDashboard
);

router.get(
    '/getProdukDashboard',
    authorization.doAuth,
    controller.main.getProdukDashboard
);

router.get(
    '/getSaldoAkhirJatuhTempoDashboard',
    authorization.doAuth,
    controller.main.getSaldoAkhirJatuhTempoDashboard
);

router.get(
    '/getAgingPiutangDashboard',
    authorization.doAuth,
    controller.main.getAgingPiutangDashboard
);

// Insert Data
router.post('/insertPenjualanArray', authorization.doAuth, controller.main.insertPenjualanArray)
router.post('/uploadPenjualanExcel', authorization.doAuth, controller.main.uploadPenjualanExcel)
router.post('/insertDataCod', authorization.doAuth, controller.main.insertDataCod)
router.post('/insertUser', authorization.doAuth, controller.main.insertUser)
router.post('/insertFakturPetugas', authorization.doAuth, controller.main.insertFakturPetugas)
router.post('/insertTukarFaktur', authorization.doAuth, controller.main.insertTukarFaktur)
router.post('/insertBayarFaktur', authorization.doAuth, controller.main.insertBayarFaktur)
router.post('/insertPenerimaanLain', authorization.doAuth, controller.main.insertPenerimaanLain)
router.post('/verifikasiTukarFaktur', authorization.doAuth, controller.main.verifikasiTukarFaktur)
router.post('/verifikasiBayarFaktur', authorization.doAuth, controller.main.verifikasiBayarFaktur)
router.post('/konfirmasiPiutang', authorization.doAuth, controller.main.konfirmasiPiutang)
router.post('/konfirmasiCustomer', controller.main.konfirmasiCustomer)
router.post('/alokasiPenerimaanLain', authorization.doAuth, controller.main.alokasiPenerimaanLain)
router.post('/terimaFaktur', authorization.doAuth, controller.main.terimaFaktur)

// UPDATE DATA
router.put('/updateUser', authorization.doAuth, controller.main.updateUser)
router.put('/editDataCod', authorization.doAuth, controller.main.editDataCod)
router.post("/gantipassword-user", authorization.doAuth, controller.main.changePassword)
router.put('/updateFakturPetugas', authorization.doAuth, controller.main.updateFakturPetugas)
router.put('/updateNotifikasiPush', authorization.doAuth, controller.main.updateNotifikasiPush);
router.put('/readAllNotification', authorization.doAuth, controller.main.readAllNotification);

// Delete Data
router.delete('/deleteDataCod/:cod_id', authorization.doAuth, controller.main.deleteDataCod)
router.delete('/deleteUser/:user_id', authorization.doAuth, controller.main.deleteUser)

// Download
// router.post('/downloadPdf', authorization.doAuth, controller.main.downloadPdf)
// router.get(
//   '/download-pdf/:pengajuan_id',
//   controller.main.downloadPdf
// );

module.exports = router;