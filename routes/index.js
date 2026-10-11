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
router.get('/getDataPelanggan', authorization.doAuth, controller.main.getDataPelanggan);
router.get('/getListPrinciple', authorization.doAuth, controller.main.getListPrinciple);
router.get('/getListUserManagement', authorization.doAuth, controller.main.getListUserManagement)
router.get('/getListDataCod', authorization.doAuth, controller.main.getListDataCod)
router.get('/getDataFakturPetugas', authorization.doAuth, controller.main.getDataFakturPetugas)
router.get('/getDataTukarFaktur', authorization.doAuth, controller.main.getDataTukarFaktur)
router.get('/getDataVerifikasiTukarFaktur', authorization.doAuth, controller.main.getDataVerifikasiTukarFaktur)
router.get('/getDataVerifikasiPembayaran', authorization.doAuth, controller.main.getDataVerifikasiPembayaran)
router.get('/getDataBayarFaktur', authorization.doAuth, controller.main.getDataBayarFaktur)

// Insert Data
router.post('/insertPenjualanArray', authorization.doAuth, controller.main.insertPenjualanArray)
router.post('/uploadPenjualanExcel', authorization.doAuth, controller.main.uploadPenjualanExcel)
router.post('/insertDataCod', authorization.doAuth, controller.main.insertDataCod)
router.post('/insertUser', authorization.doAuth, controller.main.insertUser)
router.post('/insertFakturPetugas', authorization.doAuth, controller.main.insertFakturPetugas)
router.post('/insertTukarFaktur', authorization.doAuth, controller.main.insertTukarFaktur)
router.post('/insertBayarFaktur', authorization.doAuth, controller.main.insertBayarFaktur)
router.post('/verifikasiTukarFaktur', authorization.doAuth, controller.main.verifikasiTukarFaktur)
router.post('/verifikasiBayarFaktur', authorization.doAuth, controller.main.verifikasiBayarFaktur)

// UPDATE DATA
router.put('/updateUser', authorization.doAuth, controller.main.updateUser)
router.put('/editDataCod', authorization.doAuth, controller.main.editDataCod)
router.post("/gantipassword-user", authorization.doAuth, controller.main.changePassword)
router.put('/updateFakturPetugas', authorization.doAuth, controller.main.updateFakturPetugas)

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