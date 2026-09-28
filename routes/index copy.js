const express = require('express');
const router = express.Router();
const controller = require('../controllers/index')
const authorization = require('../middlewares/authorization')
const swagger = require('../middlewares/swagger')
const bodyParser = require("body-parser");

/* GET home page. */
router.get('/getListMenu', swagger.getListMenu, authorization.doAuth, controller.main.getListMenu);
router.get('/getAcl', swagger.getAcl, controller.main.getAcl)
router.get('/getPermissionCrud', swagger.getPermissionCrud, authorization.doAuth, controller.main.getPermissionCrud);

// Project
router.post('/insertNewProject', swagger.insertNewProject, authorization.doAuth, controller.main.insertNewProject);
router.post('/insertNewProjectPID', swagger.insertNewProjectPID, authorization.doAuth, controller.main.insertNewProjectPID);
router.put('/updateProject', swagger.updateProject, authorization.doAuth, controller.main.updateProject)
router.put('/updateProjectNewPID', swagger.updateProject, authorization.doAuth, controller.main.updateProjectNewPID)
router.get('/getListProject', swagger.getListProject, authorization.doAuth, controller.main.getListProject);
router.get('/searchProject', authorization.doAuth, controller.main.searchProject);
router.post('/postListProject', controller.main.postListProject);
router.get('/getLogActivity', swagger.getLogActivity, authorization.doAuth, controller.main.getLogActivity);
router.get('/getLogBillingActivity', authorization.doAuth, controller.main.getLogBillingActivity);
router.get('/getLogBillingSuratTagihan', authorization.doAuth, controller.main.getLogBillingSuratTagihan);
router.get('/getDetailProject', swagger.getDetailProject, authorization.doAuth, controller.main.getDetailProject)
router.get('/getDetailProjectByNo', swagger.getDetailProjectByNo, authorization.doAuth, controller.main.getDetailProjectByNo)
router.post('/markAsProject', swagger.markAsProject, authorization.doAuth, controller.main.markAsProject)
router.post('/markAsArchive', swagger.markAsArchive, authorization.doAuth, controller.main.markAsArchive)
router.post('/markAsUnarchive', swagger.markAsUnarchive, authorization.doAuth, controller.main.markAsUnarchive)
router.post('/markAsClone', swagger.markAsClone, authorization.doAuth, controller.main.markAsClone)
router.post('/markAsActualID', swagger.markAsActualID, authorization.doAuth, controller.main.markAsActualID)
router.post('/markAsActualIDNew', swagger.markAsActualID, authorization.doAuth, controller.main.markAsActualIDNew)
router.post('/markAsAcceleration', swagger.markAsAcceleration, authorization.doAuth, controller.main.markAsAcceleration)
router.post('/insertProjectStatus', swagger.insertProjectStatus, authorization.doAuth, controller.main.insertProjectStatus)
router.put('/updateProjectStatus', swagger.updateProjectStatus, authorization.doAuth, controller.main.updateProjectStatus)
router.post('/insertProductOwner', swagger.insertProductOwner, authorization.doAuth, controller.main.insertProductOwner)
router.get('/getProductOwnerByPID', swagger.getProductOwnerByPID, authorization.doAuth, controller.main.getProductOwnerByPID)

// get project for cost personil
router.get('/getListProjectForCostPersonil', swagger.getListProjectForCostPersonil, authorization.doAuth, controller.main.getListProjectForCostPersonil);
// get detail cost personil & operasional
router.get('/getDetailCostPersonil', swagger.getDetailCostPersonil, controller.main.getDetailCostPersonil);
router.get('/getDetailCostPersonilDetail', swagger.getDetailCostPersonilDetail, controller.main.getDetailCostPersonilDetail);
router.get('/getDetailCostOperasional', swagger.getDetailCostOperasional, controller.main.getDetailCostOperasional);
router.get('/getDetailVendorProjectBilling', swagger.getDetailVendorProjectBilling, controller.main.getDetailVendorProjectBilling);
router.get('/getDetailCostOperasionalWithDokumenByCostId', swagger.getDetailCostOperasionalWithDokumenByCostId, controller.main.getDetailCostOperasionalWithDokumenByCostId);
// get project for cost operasional
router.get('/getListProjectForCostOperasional', swagger.getListProjectForCostOperasional, authorization.doAuth, controller.main.getListProjectForCostOperasional);
router.get('/getListProjectForVendorProjectBilling', swagger.getListProjectForVendorProjectBilling, authorization.doAuth, controller.main.getListProjectForVendorProjectBilling);
// get project billing - cost stream
router.get('/getListProjectForCostAdvanced', swagger.getListProjectForCostAdvanced, controller.main.getListProjectForCostAdvanced);
router.get('/getDetailCostAdvance', swagger.getDetailCostAdvance, controller.main.getDetailCostAdvance);
router.get('/getListProjectForTagihanVendor', swagger.getListProjectForTagihanVendor, controller.main.getListProjectForTagihanVendor);
router.get('/getDetailTagihanVendor', swagger.getDetailTagihanVendor, controller.main.getDetailTagihanVendor);
// personil detail && operational detail
router.delete('/deletePersonilDetail/:dpersonel_id', swagger.deletePersonilDetail, authorization.doAuth, controller.main.deletePersonilDetail)
router.delete('/deleteOperationalDetail/:cost_id', swagger.deleteOperationalDetail, authorization.doAuth, controller.main.deleteOperationalDetail)
// insert personil detail && operational detail
router.put('/updatePersonilDetail', swagger.updatePersonilDetail, authorization.doAuth, controller.main.updatePersonilDetail)
router.post('/insertPersonilDetail', swagger.insertPersonilDetail, authorization.doAuth, controller.main.insertPersonilDetail)
router.post('/insertOperationalDetail', swagger.insertOperationalDetail, authorization.doAuth, controller.main.insertOperationalDetail)
router.post('/insertOperationalDetailDokumen', swagger.insertOperationalDetailDokumen, authorization.doAuth, controller.main.insertOperationalDetailDokumen)
router.post('/insertBillingDokumen', swagger.insertBillingDokumen, authorization.doAuth, controller.main.insertBillingDokumen)

// Dokumen
router.post('/uploadDokumen', swagger.uploadDokumen, authorization.doAuth, controller.main.insertDokumen)
router.post('/uploadDokumenMaterai', authorization.doAuth, controller.main.uploadDokumenMaterai)
router.post('/stampMaterai', authorization.doAuth, controller.mainIntegrasi.stampMaterai)
router.post('/stampDokumen', authorization.doAuth, controller.mainIntegrasi.stampDokumen)
router.put('/updateDokumen', swagger.updateDokumen, authorization.doAuth, controller.main.updateDokumen)
router.put('/updateDokumenNoFile', authorization.doAuth, controller.main.updateDokumenNoFile)
router.post('/insertDokumenNoFile', authorization.doAuth, controller.main.insertDokumenNoFile)
router.delete('/deleteDokumen/:dokumen_id', swagger.deleteDokumen, authorization.doAuth, controller.main.deleteDokumen)
router.post('/uploadDokumenBAMK', swagger.uploadDokumenBAMK, authorization.doAuth, controller.main.insertDokumenBAMK)
router.delete('/deleteDokumenBAMK', swagger.deleteDokumenBAMK, authorization.doAuth, controller.main.deleteDokumenBAMK)

// Billing
router.post('/billingCollection', swagger.billingCollection, authorization.doAuth, controller.main.postBillingCollection)
router.get('/getBillingCollection', swagger.getBillingCollection, controller.main.getBillingCollection)
router.get('/getBillingCollectionProjectActual', swagger.getBillingCollectionProjectActual, controller.main.getBillingCollectionProjectActual)
router.get('/getStatusBilling', swagger.getStatusBilling, controller.main.getStatusBilling)
router.delete('/deleteBillingCollection/:billing_id', swagger.deleteBillingCollection, authorization.doAuth, controller.main.deleteBillingCollection)
router.delete('/deleteBillingDokumen/:billing_detail_id', swagger.deleteBillingDokumen, authorization.doAuth, controller.main.deleteBillingDokumen)
router.put('/updateKdStatus', swagger.updateKdStatus, authorization.doAuth, controller.main.updateKdStatus)
router.get('/getListBillingByTermin', swagger.getListBillingByTermin, authorization.doAuth, controller.main.getListBillingByTermin);
router.get('/getListBillingProjectAkselerasi', swagger.getListBillingProjectAkselerasi, authorization.doAuth, controller.main.getListBillingProjectAkselerasi);
router.get('/getListBillingRealization', swagger.getListBillingRealization, authorization.doAuth, controller.main.getListBillingRealization);
router.post('/getListBillingCollections', swagger.getListBillingCollections, authorization.doAuth, controller.main.getListBillingCollections);
router.get('/getListAllBilling', authorization.doAuth, controller.main.getListAllBilling);

// Vendor
router.post('/vendorPlanning', swagger.vendorPlanning, authorization.doAuth, controller.main.postVendorPlanning)
router.post('/vendorRemind', swagger.vendorRemind, authorization.doAuth, controller.main.vendorRemind)
router.get('/getVendorPlanning', swagger.getVendorPlanning, controller.main.getVendorPlanning)
router.delete('/deleteVendorPlanning/:project_vendor_id', swagger.deleteVendorPlanning, authorization.doAuth, controller.main.deleteVendorPlanning)

// CBB
router.post('/CBBPlanning', swagger.CBBPlanning, authorization.doAuth, controller.main.postCBBPlanning)
router.get('/getCBBPlanning', swagger.getCBBPlanning, controller.main.getCBBPlanning)
router.delete('/deleteCBBPlanning/:cbb_id', authorization.doAuth, controller.main.deleteCBBPlanning)

// Cost Personil
router.post('/costPersonilPlanning', swagger.costPersonilPlanning, authorization.doAuth, controller.main.costPersonilPlanning)
router.get('/getCostPersonilPlanning', swagger.getCostPersonilPlanning, controller.main.getCostPersonilPlanning)
router.delete('/deleteCostPersonilPlanning/:personel_id', controller.main.deleteCostPersonilPlanning)

//Master Vendor
router.get('/getListVendor', swagger.getListVendor, controller.main.getListVendor)
router.get('/getListVendorPt', swagger.getListVendorPt, controller.main.getListVendorPt)
router.get('/getDetailVendorPt', swagger.getDetailVendorPt, controller.main.getDetailVendorPt)
router.get('/getListProjectVendor', swagger.getListProjectVendor, controller.main.getListProjectVendor)
router.get('/getDetailProjectVendor', swagger.getDetailProjectVendor, controller.main.getDetailProjectVendor)
router.post('/insertVendorPt', swagger.insertVendorPt, authorization.doAuth, controller.main.insertVendorPt)
router.post('/insertContactVendorPt', swagger.insertContactVendorPt, authorization.doAuth, controller.main.insertContactVendorPt);
router.delete('/deleteContactVendorPt/:vendor_kontak_id', controller.main.deleteContactVendorPt)
router.put('/updateVendorPt', swagger.updateVendorPt, authorization.doAuth, controller.main.updateVendorPt)

router.get('/getProjectByType', swagger.getProjectByType, authorization.doAuth, controller.main.getProjectByType)

// Projec Billing
router.get('/getDetailVendorRealization', swagger.getDetailVendorRealization, controller.main.getDetailVendorRealization)
router.post('/dataRevenueStream', swagger.dataRevenueStream, authorization.doAuth, controller.main.dataRevenueStream)
// router.get('/getBillingRealization', swagger.getBillingRealization, controller.main.getBillingRealization)
router.get('/getBillingDocument', swagger.getBillingDocument, controller.main.getBillingDocument)
router.post('/getListBillingRevenue', swagger.getListBillingRevenue, controller.main.getListBillingRevenue)
router.post('/getListBillingMonitoring', swagger.getListBillingMonitoring, controller.main.getListBillingMonitoring)
router.post('/getListBillingNonProject', swagger.getListBillingNonProject, controller.main.getListBillingNonProject)
router.post('/getListDetailBillingMonitoring', swagger.getListDetailBillingMonitoring, controller.main.getListDetailBillingMonitoring)
router.post('/getListDetailPerCustomer', swagger.getListDetailPerCustomer, controller.main.getListDetailPerCustomer)
router.post('/getListNoFaktur', swagger.getListNoFaktur, controller.main.getListNoFaktur)
router.get('/getDetailBillingRevenue', swagger.getDetailBillingRevenue, controller.main.getDetailBillingRevenue)
router.get('/getReportBillingRevenue', swagger.getReportBillingRevenue, controller.main.getReportBillingRevenue)
//Master Customer
router.get('/getListCustomer', swagger.getListCustomer, controller.main.getListCustomer)
router.get('/getDetailCustomer', swagger.getDetailCustomer, controller.main.getDetailCustomer)
router.post('/insertCustomer', swagger.insertCustomer, authorization.doAuth, controller.main.insertCustomer);
router.put('/updateCustomer', swagger.updateCustomer, authorization.doAuth, controller.main.updateCustomer)
router.post('/insertContactCustomer', swagger.insertContactCustomer, authorization.doAuth, controller.main.insertContactCustomer);
router.delete('/deleteContactCustomer/:customer_contact_id', controller.main.deleteContactCustomer)
//Master Referensi
router.post('/insertReferensi', swagger.insertReferensi, authorization.doAuth, controller.main.insertReferensi);
router.get('/getListReferensi', swagger.getListReferensi, controller.main.getListReferensi)
router.get('/getDetailReferensi', authorization.doAuth, swagger.getDetailReferensi, controller.main.getDetailReferensi)
//Master Portofolio
router.post('/insertPortofolio', swagger.insertPortofolio, authorization.doAuth, controller.main.insertPortofolio);
router.put('/updatePortofolio', swagger.updatePortofolio, authorization.doAuth, controller.main.updatePortofolio)
router.get('/getListPortofolio', swagger.getListPortofolio, controller.main.getListPortofolio);
router.get('/getDetailPortofolio', swagger.getDetailPortofolio, authorization.doAuth, controller.main.getDetailPortofolio)
//Master Employee
router.get('/getListKaryawan', swagger.getListKaryawan, controller.main.getListKaryawan)
router.post('/insertKaryawan', swagger.insertKaryawan, authorization.doAuth, controller.main.insertKaryawan);
router.put('/updateKaryawan', swagger.updateKaryawan, authorization.doAuth, controller.main.updateKaryawan)
// Master Hari Libur
router.get('/getListHariLibur', controller.main.getListHariLibur)
router.post('/insertHariLibur', authorization.doAuth, controller.main.insertHariLibur);
router.put('/updateHariLibur', authorization.doAuth, controller.main.updateHariLibur)
router.delete('/deleteHariLibur/:hari_libur_id', authorization.doAuth, controller.main.deleteHariLibur)

// Add on
router.get('/getReferensiByJenis', swagger.getReferensiByJenis, controller.main.getReferensiByJenis)
router.get('/getSubReferensiByJenis', swagger.getSubReferensiByJenis, controller.main.getSubReferensiByJenis)
router.get('/getSubReferensiByJenis2', swagger.getSubReferensiByJenis2, controller.main.getSubReferensiByJenis2)
router.get('/getValidasi', swagger.getValidasi, controller.main.getValidasi)
router.get('/getRefStatusProject', swagger.getRefStatusProject, authorization.doAuth, controller.main.getRefStatusProject)
router.get('/getRefStatusRevenue', swagger.getRefStatusRevenue, authorization.doAuth, controller.main.getRefStatusRevenue)
router.get('/getRefStatus', swagger.getRefStatus, controller.main.getRefStatus)
router.get('/getRefStatusInvoiceNonProject', swagger.getRefStatusInvoiceNonProject, authorization.doAuth, controller.main.getRefStatusInvoiceNonProject)
router.get('/getPortofolio', swagger.getPortofolio, controller.main.getPortofolio)
router.get('/getCustomers', swagger.getCustomers, controller.main.getCustomers)
router.get('/getStartDate', swagger.getStartDate, controller.main.getStartDate)

router.get('/getLinkedPID', swagger.getLinkedPID, controller.main.getLinkedPID)
router.get('/getListDokumen', authorization.doAuth, controller.main.getListDokumen)

router.post('/getListPegawai', swagger.getListPegawai, authorization.doAuth, controller.main.getListPegawai);
router.get('/getRefDepartment', swagger.getRefDepartment, authorization.doAuth, controller.main.getRefDepartment)
router.get('/getCustomerBySpuc', swagger.getCustomerBySpuc, authorization.doAuth, controller.main.getCustomerBySpuc)


// router.post('/insertLogIntegrasi', controller.main.insertLogIntegrasi)
router.get('/getDetailProjectProfile', swagger.getDetailProjectProfile, authorization.doAuth, controller.main.getDetailProjectProfile)
router.get('/getProjectLog', swagger.getLogActivity, authorization.doAuth, controller.main.getProjectLog);
router.get('/getListBillingProject', swagger.getListBillingProject, authorization.doAuth, controller.main.getListBillingProject);

//router integrasi
// router.get('/getIntegrasiDataProject', authorization.doAuth, controller.main.getIntegrasiDataProject)
router.get('/getDataRemote', authorization.doAuth, controller.mainIntegrasi.getDataRemote)
router.get('/getDataIntegrasi', authorization.doAuth, controller.mainIntegrasi.getDataRemote)
router.post('/addMasterData', authorization.doAuth, controller.mainIntegrasi.addMasterData)
// router.post('/sendInvoice', authorization.doAuth, controller.mainIntegrasi.postingInvoice)
router.post('/sendInvoice', authorization.doAuth, controller.mainIntegrasi.createNota)
router.put('/updateTransaction', authorization.doAuth, controller.main.updateTransaction);
router.post('/addSuratTagihan', authorization.doAuth, controller.mainIntegrasi.addSuratTagihan)
router.get('/getLogApprovalSuratTagihan', authorization.doAuth, controller.mainIntegrasi.getLogApprovalSuratTagihan)
router.post('/inboundPeo', authorization.doAuthPeo, controller.mainIntegrasi.inboundPeo)
router.post('/inboundPeoProdToCloud', authorization.doAuthPeo, controller.mainIntegrasi.inboundPeoProdToCloud)
router.get('/getDataPeo', authorization.doAuth, controller.mainIntegrasi.getDataPeo)
router.post('/addBeritaAcara', authorization.doAuth, controller.mainIntegrasi.addBeritaAcara)
router.post('/outboundBatalNota', authorization.doAuth, controller.mainIntegrasi.outboundBatalNota)
router.get('/getListUserActivity', swagger.getListUserActivity, authorization.doAuth, controller.main.getListUserActivity);
router.get('/getListApproval', swagger.getListApproval, authorization.doAuth, controller.main.getListApproval);
router.get('/getListLokasi', swagger.getListLokasi, authorization.doAuth, controller.main.getListLokasi);

//notification
router.get('/getListNIPByRole', swagger.getListNIPByRole, authorization.doAuth, controller.main.getListNIPByRole);
router.get('/getNIPByRoleId', authorization.doAuth, controller.main.getNIPByRoleId);
router.get('/getListNotification', swagger.getListNotification, authorization.doAuth, controller.main.getListNotification);
router.get('/getNotificationFaktur', swagger.getNotificationFaktur, authorization.doAuth, controller.main.getNotificationFaktur);
router.post('/insertNotification', swagger.insertNotification, authorization.doAuth, controller.main.insertNotification);
router.put('/updateNotification', swagger.updateNotification, authorization.doAuth, controller.main.updateNotification);

//task
router.get('/getListTask', swagger.getListTask, authorization.doAuth, controller.main.getListTask);
router.post('/insertTask', swagger.insertTask, authorization.doAuth, controller.main.insertTask);
router.get('/getTaskDetail', swagger.TaskDetail, authorization.doAuth, controller.main.getTaskDetail);
router.put('/updateTask', swagger.updateTask, authorization.doAuth, controller.main.updateTask);
router.delete('/deleteTask/:task_id', swagger.deleteTask, authorization.doAuth, controller.main.deleteTask);

//remarks
router.get('/getListRemarks', swagger.getListRemarks, authorization.doAuth, controller.main.getListRemarks);
router.post('/insertRemark', swagger.insertRemarks, authorization.doAuth, controller.main.insertRemarks);

//assign team
router.post('/assignTeam', authorization.doAuth, controller.main.assignTeam);
router.delete('/deleteAssignTeam/:assign_id', authorization.doAuth, controller.main.deleteAssignTeam)

//m_user
router.get('/getListUser', authorization.doAuth, controller.main.getListUser);
router.post('/insertUser', authorization.doAuth, controller.main.insertUser);
// router.put('/updateUser', authorization.doAuth, controller.main.updateUser);

//progress project
router.post('/insertProgressProject', authorization.doAuth, controller.main.insertProgressProject);
router.get('/getListProgressProject', authorization.doAuth, controller.main.getListProgressProject);
router.get('/getListProgressProjectBilling', authorization.doAuth, controller.main.getListProgressProjectBilling);

router.post('/insertProgressBilling', authorization.doAuth, controller.main.insertProgressBilling);
// router.get('/getListProgressProject', authorization.doAuth, controller.main.getListProgressProject);
// Dashboard
router.get('/getOverall', authorization.doAuth, controller.main.getOverall);
//chart 
router.get('/getDataAreaChart', authorization.doAuth, controller.main.getDataAreaChart);
router.get('/getDataRadialChart', authorization.doAuth, controller.main.getDataRadialChart);

router.post("/gantipassword-user", authorization.doAuth, controller.main.changePassword)
router.post("/register-user", controller.main.registerUser)
router.get('/getSettingDok', authorization.doAuth, controller.main.getSettingDok);

router.get('/getListBillingAdjustment', authorization.doAuth, controller.main.getListBillingAdjustment)
router.post('/insertBillingAdjustment', authorization.doAuth, controller.main.insertBillingAdjustment);
router.put('/updateBillingAdjustment', authorization.doAuth, controller.main.updateBillingAdjustment)
router.delete('/deleteBillingAdjustment/:billing_id', authorization.doAuth, controller.main.deleteBillingAdjustment)
router.get('/getDetailBillingAdjustment', authorization.doAuth, controller.main.getDetailBillingAdjustment)
router.post('/insertHBilling', authorization.doAuth, controller.main.insertHBilling);
router.put('/updateHBilling', authorization.doAuth, controller.main.updateHBilling);

//integrasi lark
router.get('/listProject', swagger.listProject, authorization.doAuth, controller.mainIntegrasi.listProject);

// router.post('/generatePdf', authorization.doAuth, controller.main.generatePdf);
router.post('/stampingCloud', 
  authorization.doAuth,
  // bodyParser.text({ limit: "10mb", type: "text/html" }),
  bodyParser.text({ limit: "10mb" }),
  controller.main.stampingCloud
);
// sementara (utk prod)
router.post('/stampingProd', 
  authorization.doAuth,
  // bodyParser.text({ limit: "10mb", type: "text/html" }),
  bodyParser.text({ limit: "10mb" }),
  controller.main.stampingProd
);
router.post('/uploadDokumenUnsigned', 
  authorization.doAuth,
  // bodyParser.text({ limit: "10mb", type: "text/html" }),
  bodyParser.text({ limit: "10mb" }),
  controller.main.uploadDokumenUnsigned
);
router.post('/stampUlang', authorization.doAuth, controller.main.stampUlang)

router.get('/', (req, res) => {
    res.json({ message: "API v1 N2N is running!" });
});

router.post('/dataRevenueLOP', authorization.doAuth, controller.main.dataRevenueLOP)
router.post('/dataRevenueLOPGroup', authorization.doAuth, controller.main.dataRevenueLOPGroup)
router.get('/getListBillingLOP', authorization.doAuth, controller.main.getListBillingLOP)
router.get('/getDetailBillingLOP', authorization.doAuth, controller.main.getDetailBillingLOP)
router.get('/getSummaryRevenue', authorization.doAuth, controller.main.getSummaryRevenue)
router.post('/getDetailLOP', authorization.doAuth, controller.main.getDetailLOP)
router.post('/softDeleteLop', authorization.doAuth, controller.main.softDeleteLop)
router.post('/autogenerateLOP', authorization.doAuth, controller.main.autogenerateLOP)
router.post('/uploadLOPExcel', authorization.doAuth, controller.main.uploadLOPExcel)
router.get('/getRefLop', authorization.doAuth, controller.main.getRefLop)
router.post('/getListLOPID', authorization.doAuth, controller.main.getListLOPID)
router.post('/getListSummaryLop', authorization.doAuth, controller.main.getSummaryRevenueLop)
router.get('/generateNoRef', authorization.doAuth, controller.main.generateNoRef)
router.post('/sendAccrual', authorization.doAuth, controller.mainIntegrasi.sendAccrual)
router.post('/getDataRemoteScheduler', controller.mainIntegrasi.getDataRemoteScheduler)
router.post('/insertHDocReq', authorization.doAuth, controller.main.insertHDocReq)
router.put('/updateHDocReq', authorization.doAuth, controller.main.updateHDocReq)
router.post('/getListNoProject', authorization.doAuth, controller.main.getListNoProject)
router.post('/createLOPFromProject', authorization.doAuth, controller.main.createLOPFromProject)
router.get('/exportBillingLOPExcel', authorization.doAuth, controller.main.exportBillingLOPExcel)
router.get('/getListBillingFakturPajak', swagger.getListBillingFakturPajak, controller.main.getListBillingFakturPajak)
router.post('/sendAccrualBeban', authorization.doAuth, controller.mainIntegrasi.sendAccrualBeban)
router.post('/getListNoFakturExcel', swagger.getListNoFakturExcel, controller.main.getListNoFakturExcel)
router.post('/sendJurnalReverse', controller.mainIntegrasi.sendJurnalReverse)
router.post('/InboundSimtax', authorization.doAuth, controller.mainIntegrasi.InboundSimtax)
router.post('/autoApprovePeo', controller.mainIntegrasi.autoApprovePeo)
router.post('/insertRKeuangan', authorization.doAuth, controller.main.insertRKeuangan)
router.post('/updateRKeuangan', authorization.doAuth, controller.main.updateRKeuangan)
router.delete('/deleteRKeuangan', authorization.doAuth, controller.main.deleteRKeuangan)
router.post('/autoSendAccrualPymad', controller.mainIntegrasi.autoSendAccrualPymad)
router.post('/autoSendAccrualBeban', controller.mainIntegrasi.autoSendAccrualBeban)
router.post('/autoApprovePeoNew', controller.mainIntegrasi.autoApprovePeoNew)
router.post('/getListBillingCode', authorization.doAuth, controller.main.getListBillingCode)
router.get('/getListPID', authorization.doAuth, controller.main.getListPID)
router.put('/updateStokMaterai', authorization.doAuth, controller.main.updateStokMaterai)
router.get('/getStokMaterai', authorization.doAuth, controller.main.getStokMaterai)
router.post('/sendBatalNota', authorization.doAuth, controller.mainIntegrasi.sendBatalNota)
router.get('/getListAllBillingForLOP', authorization.doAuth, controller.main.getListAllBillingForLop);
router.post('/insertBillingPromote', controller.mainIntegrasi.insertBillingPromote);
router.post('/inboundDokPromote', authorization.doAuthPeo, controller.mainIntegrasi.inboundDokPromote)

module.exports = router;