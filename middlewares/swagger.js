exports.login = async (req, res, next) => {
    /* 
        #swagger.tags = ['Users'] 
    */
    next()
}

exports.getListMenu = async (req, res, next) => {
    /*
         #swagger.tags = ['Index']
     */
    const { kd_ref } = req.query
    next()
}

exports.getAcl = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['id_acl'] = { type: 'string' }
    */
    next()
}

exports.getReferensiByJenis = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { jns_ref, keyword } = req.query
    next()
}

exports.getPermissionCrud = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['jns_ref'] = { type: 'string' }
    */
    next()
}

exports.insertNewProject = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                project_kategori_id: '',
                project_type_id: '',  
                project_no: '',  
                project_name: '',  
                portofolio_id: '',  
                category_id: '', 
                est_nilai_penawaran: '',  
                est_cogs: '', 
                customer_id: '', 
                kd_area: '',  
                kd_status: '',
            }
        }
    */
    const {
        project_kategori_id,
        project_type_id,
        project_no,
        project_name,
        portofolio_id,
        category_id,
        est_nilai_penawaran,
        est_cogs,
        customer_id,
        kd_area,
        kd_status,
    } = req.body
    next()
}

exports.insertCustomer = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new customer',
            schema: {
                kode_akun: '204',
                customer_name: '',
                npwp: '',
                address: '',
                email: '',
                fax: '',
                telp: '',
                description: ''
            }
        }
    */
    const {
        kode_akun,
        customer_name,
        npwp,
        address,
        email,
        fax,
        telp,
        description
    } = req.body
    next()
}

exports.insertVendorPt = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new vendor PT',
            schema: {
                nama_perusahaan: '',
                alamat_perusahaan: '',
                npwp: '',
                no_telp: '',
                email: '',
                status: '',
                keterangan: ''
            }
        }
    */
    const {
        nama_perusahaan,
        alamat_perusahaan,
        npwp,
        no_telp,
        email,
        status,
        keterangan
    } = req.body
    next()
}

exports.insertPortofolio = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new portofolio',
            schema: {
                kode_akun: '',
                tahun: '',
                kode: '',
                portofolio: '',
                keterangan: ''
            }
        }
    */
    const {
        kode_akun,
        tahun,
        kode,
        portofolio,
        keterangan
    } = req.body
    next()
}

exports.insertKaryawan = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new portofolio',
            schema: {
                kode_akun: '',
                tahun: '',
                kode: '',
                portofolio: '',
                keterangan: ''
            }
        }
    */
    const {
        nik,
        nama,
        alamat,
        status,
        email
    } = req.body
    next()
}

exports.insertContactCustomer = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a contact customer',
            schema: {
                customer_id: '',
                nama_contact: '',
                address: '',
                email: '',
                phone: '',
                jabatan: '',
                gender: '',
                birthdate: '',
                membawahi: '',
                description: ''
            }
        }
    */
    const {
        customer_id,
        nama_contact,
        address,
        email,
        phone,
        jabatan,
        gender,
        birthdate,
        membawahi,
        description
    } = req.body
    next()
}

exports.insertContactVendorPt = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a contact customer',
            schema: {
                vendor_id: '',
                nama: '',
                no_telp: '',
                email: '',
                jabatan: '',
                status: '',
                keterangan: '',
                alamat: ''
            }
        }
    */
    const {
        vendor_id,
        nama,
        no_telp,
        email,
        jabatan,
        status,
        keterangan,
        alamat
    } = req.body
    next()
}

exports.insertReferensi = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new referensi',
            schema: {
                kd_ref: '',
                ur_ref: '',
                jns_ref: '',
                sub_kd_ref: '',
                sub_jns_ref: '',
                start_date: '',
                end_date: ''
            }
        }
    */
    const {
        kd_ref,
        ur_ref,
        jns_ref,
        sub_kd_ref,
        sub_jns_ref,
        start_date,
        end_date
    } = req.body
    next()
}

exports.insertPersonilDetail = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a detail personil',
            schema: {
                sub_dpersonel_id: '',
                personel_id: '',
                user_id: '',
                nik: '',
                nama_personil: '',
                divisi_id: '',
                qty_date: '',
                satuan_date: '',
                flag_personil: ''
            }
        }
    */
    const {
        sub_dpersonel_id,
        personel_id,
        user_id,
        nik,
        nama_personil,
        divisi_id,
        qty_date,
        satuan_date,
        flag_personil
    } = req.body
    next()
}

exports.updatePersonilDetail = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a detail personil',
            schema: {
                sub_dpersonel_id: '',
                personel_id: '',
                user_id: '',
                nik: '',
                nama_personil: '',
                divisi_id: '',
                qty_date: '',
                satuan_date: '',
                flag_personil: ''
            }
        }
    */
    const {
        sub_dpersonel_id,
        personel_id,
        user_id,
        nik,
        nama_personil,
        divisi_id,
        qty_date,
        satuan_date,
        flag_personil
    } = req.body
    next()
}

exports.insertOperationalDetail = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a cost operational',
            schema: {
                project_id: '',
                kategori_cost: '',
                mata_anggaran: '',
                divisi_id: '',
                jenis_cost: '',
                nilai_cost: '',
                tanggal_cost: '',
                no_pr: '',
                no_nodin: '',
                status: ''
            }
        }
    */
    const {
        project_id,
        kategori_cost,
        mata_anggaran,
        divisi_id,
        jenis_cost,
        nilai_cost,
        tanggal_cost,
        no_pr,
        no_nodin,
        status
    } = req.body
    next()
}

exports.insertOperationalDetailDokumen = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a dokumen cost operational',
            schema: {
                cost_id: '',
                dokumen_id: ''
            }
        }
    */
    const {
        cost_id,
        dokumen_id
    } = req.body
    next()
}

exports.insertBillingDokumen = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                billing_id: '',
                dokumen_id: ''
            }
        }
    */
    const {
        billing_id,
        dokumen_id
    } = req.body
    next()
}

exports.getListProject = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.listProject = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword, page, limit, created } = req.query
    next()
}

exports.getListBillingRealization = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.getListBillingCollections = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, monthYear } = req.query
    next()
}

exports.getListBillingProject = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, project_id } = req.query
    next()
}

exports.getLogActivity = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { project_id } = req.query
    next()
}

exports.getListPortofolio = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword, page, limit } = req.query
    next()
}

exports.getListProjectForCostPersonil = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.getDetailCostPersonil = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { project_id } = req.query
    next()
}

exports.getDetailCostAdvance = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { cost_revenue_id } = req.query
    next()
}

exports.getDetailTagihanVendor = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { billing_revenue_id } = req.query
    next()
}

exports.getDetailCostPersonilDetail = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { personel_id } = req.query
    next()
}

exports.getDetailCostOperasional = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { project_id } = req.query
    next()
}

exports.getDetailVendorProjectBilling = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { billing_id } = req.query
    next()
}

exports.getDetailCostOperasionalWithDokumenByCostId = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { cost_id } = req.query
    next()
}

exports.getListProjectForCostOperasional = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.getListProjectForVendorProjectBilling = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.getListProjectForTagihanVendor = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.getListProjectForCostAdvanced = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, startDate, endDate } = req.query
    next()
}

exports.getListBillingByTermin = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { status, keyword, page, limit, project_id, billing_id } = req.query
    next()
}

exports.getListBillingProjectAkselerasi = (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { project_id } = req.query
    next()
}

exports.getRefStatusProject = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getRefStatusRevenue = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getRefStatusInvoiceNonProject = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getRefStatus = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}


exports.markAsProject = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                $project_id: [],
                $status: ''
            }                   
        }
    */
    next()
}

exports.getPortofolio = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getLinkedPID = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword } = req.query;
    next()
}

exports.getCustomers = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword } = req.query
    next()
}

exports.getListKaryawan = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword } = req.query
    next()
}

exports.getStartDate = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword } = req.query
    next()
}

exports.markAsArchive = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                $project_id: [],
                $archive: ''
            }                   
        }
    */
    next()
}

exports.markAsUnarchive = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                $project_id: []
            }                   
        }
    */
    next()
}

exports.getDetailProject = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['project_id'] = { type: 'string' }
        #swagger.parameters['kode'] = { type: 'string' }
    */
    const {
        project_id,
        kode
    } = req.body
    next()
}

exports.getDetailProjectByNo = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['project_no'] = { type: 'string' }
        #swagger.parameters['kode'] = { type: 'string' }
    */
    const {
        project_no,
        kode
    } = req.body
    next()
}

exports.getDetailProjectProfile = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['project_id'] = { type: 'string' }
    */
    const {
        project_id
    } = req.body
    next()
}

exports.uploadDokumen = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                $project_id: []
            }                   
        }
    */
    next()
}

exports.updateDokumen = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                dokumen_id: '',
                lampiran: '',
            }                   
        }
    */
    next()
}

exports.updateDokumenNoFile = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                dokumen_id: '',
            }                   
        }
    */
    next()
}

exports.deleteDokumen = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['dokumen_id'] = { type: 'string' }
    */
    next()
}

exports.deletePersonilDetail = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['dpersonel_id'] = { type: 'string' }
    */
    next()
}

exports.deleteContactCustomer = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['customer_contact_id'] = { type: 'string' }
    */
    next()
}

exports.deleteOperationalDetail = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['cost_id'] = { type: 'string' }
    */
    next()
}

exports.updateProject = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                project_id: '',
                project_kategori_id: '',
                project_type_id: '',  
                project_no: '',  
                project_name: '',  
                portofolio_id: '',  
                category_id: '', 
                est_nilai_penawaran: '',  
                est_cogs: '', 
                customer_id: '', 
                kd_area: '',  
                kd_status: '',
            }
        }
    */
    const {
        project_id,
        project_kategori_id,
        project_type_id,
        project_no,
        project_name,
        portofolio_id,
        category_id,
        est_nilai_penawaran,
        est_cogs,
        customer_id,
        kd_area,
        kd_status,
    } = req.body
    next()
}

exports.updateCustomer = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new customer',
            schema: {
                kode_akun: '204',
                customer_name: '',
                npwp: '',
                address: '',
                email: '',
                fax: '',
                telp: '',
                description: ''
            }
        }
    */
    const {
        kode_akun,
        customer_name,
        npwp,
        address,
        email,
        fax,
        telp,
        description
    } = req.body
    next()
}

exports.updateVendorPt = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new customer',
            schema: {
                nama_perusahaan: '',
                alamat_perusahaan: '',
                npwp: '',
                no_telp: '',
                email: '',
                status: '',
                keterangan: ''
            }
        }
    */
    const {
        nama_perusahaan,
        alamat_perusahaan,
        npwp,
        no_telp,
        email,
        status,
        keterangan
    } = req.body
    next()
}

exports.updatePortofolio = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new portoflio',
            schema: {
                kode_akun: '',
                tahun: '',
                kode: '',
                portofolio: '',
                keterangan: ''
            }
        }
    */
    const {
        kode_akun,
        tahun,
        kode,
        portofolio,
        keterangan
    } = req.body
    next()
}

exports.updateKaryawan = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new portoflio',
            schema: {
                kode_akun: '',
                tahun: '',
                kode: '',
                portofolio: '',
                keterangan: ''
            }
        }
    */
    const {
        nama,
        nik,
        alamat,
        email,
        status
    } = req.body
    next()
}

exports.uploadDokumenBAMK = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                $project_id: []
            }                   
        }
    */
    next()
}

exports.deleteDokumenBAMK = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['dokumen_id'] = { type: 'string' }
    */
    next()
}

exports.billingCollection = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new Billing Collection',
            schema: {
                project_id: '',
                termin: '',  
                divisi_id: '',    
                portofolio_id: '',  
                est_periode_billing: '',
                est_bulan_billing: '', 
                est_billing: '',  
                real_periode_billing: '', 
                real_bulan_billing: '', 
                real_billing: '',  
                kd_status: '',
                kategori_billing: '',
                created_by: ''
            }
        }
    */
    next()
}

exports.vendorPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new Vendor Planning',
            schema: {
                project_id: '',
                vendor_id: '',  
                nilai_kontrak: '',    
                no_kontrak: '',  
                judul_kontrak: '',
                flag_final: '', 
                created_by: ''
            }
        }
    */
    next()
}

exports.vendorRemind = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new Remind',
            schema: {
                remind_type: '',
                limit_time: '',  
                limit_unit: '',    
                project_id: '',  
                project_type: '',
                subyek: '', 
                content: '', 
                email_send: '', 
                email_send_cc: ''
            }
        }
    */
    next()
}

exports.CBBPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new CBB Planning',
            schema: {
                project_id: '',  
                divisi_id: '',    
                coa_id: '',  
                direct_cost: '',
                indirect_cost: '', 
            }
        }
    */
    next()
}

exports.deleteBillingCollection = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['billing_id'] = { type: 'string' }
    */
    next()
}

exports.deleteBillingDokumen = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['billing_id'] = { type: 'string' }
    */
    next()
}

exports.deleteVendorPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['project_vendor_id'] = { type: 'string' }
    */
    next()
}

exports.costPersonilPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new Cost Personil Planning',
            schema: {
                project_id: '',  
                role_id: '',    
                kualifikasi_id: '',  
                qty_person: '',
                satuan_person: '', 
                qty_date: '',
                satuan_date: '',
                cost_unit: '',
                cost_total: '',
                divisi_id: '',
            }
        }
    */
    next()
}

exports.getCBBPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getCostPersonilPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getBillingCollection = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getBillingCollectionProjectActual = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getStatusBilling = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getVendorPlanning = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getSubReferensiByJenis = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { jns_ref, kd_ref, keyword } = req.query
    next()
}

exports.getSubReferensiByJenis2 = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { jns_ref, kd_ref, keyword } = req.query
    next()
}

exports.getValidasi = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { jns_ref, kd_ref, keyword } = req.query
    next()
}

exports.getListVendor = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword } = req.query
    next()
}

exports.getListVendorPt = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    const { keyword } = req.query
    next()
}

exports.markAsActualID = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Mark As Actual Id',
            schema: {
                project_actual_id: '',  
                project_id: []
            }
        }
    */
    next()
}

exports.getListProjectVendor = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getDetailProjectVendor = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['project_id'] = { type: 'string' }
    */
    next()
}

exports.getProjectByType = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['type'] = { type: 'string' }
        #swagger.parameters['keyword'] = { type: 'string' }
    */
    next()
}

exports.markAsAcceleration = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Mark As Acceleration',
            schema: { 
                project_id: []
            }
        }
    */
    next()
}

exports.insertProjectStatus = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                project_id: '',
                id_tab_status: '',  
                kd_status: '',
                billing_id: ''
            }
        }
    */

    next()
}

exports.updateProjectStatus = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Update a project status',
            schema: {
                status_id: '',  
                flag_new_dok: '',
            }
        }
    */

    next()
}

exports.getDetailVendorRealization = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['project_vendor_id'] = { type: 'string' }
    */
    next()
}

exports.dataRevenueStream = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new billing revenue',
            schema: {
                billing_id: '',
                status_pymad: '',  
                status_kelengkapan_dokumen: '',  
                nominal_pymad: '',
                tanggal_bast: '',
                no_invoice: '',
                tanggal_invoice: '',
                status_invoice: '',
                nominal_invoice: '',
                no_faktur: '',
                tanggal_faktur: '',
                status_pelunasan: '',
                nominal_pelunasan: '',
                tanggal_pelunasan: '',
                denda_pajak: '',
                pph: '',
                ppn: '',
                ppn_tarif: '',
                wapu: '',
                biaya_lain: '',
                outstanding: '',
                nominal_dpp: '',
            }
        }
    */

    next()
}

exports.getBillingRealization = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getBillingDocument = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['billing_id'] = { type: 'string' }
    */
    next()
}

exports.getListBillingRevenue = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListBillingNonProject = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListBillingMonitoring = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}
exports.getListDetailBillingMonitoring = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListDetailPerCustomer = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListNoFaktur = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getDetailReferensi = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListCustomer = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListReferensi = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getDetailBillingRevenue = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
       #swagger.parameters['billing_id'] = { type: 'string' }
   */
    next()
}

exports.getReportBillingRevenue = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
       #swagger.parameters['billing_id'] = { type: 'string' }
   */
    next()
}

exports.getDetailCustomer = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
       #swagger.parameters['customer_id'] = { type: 'string' }
   */
    next()
}

exports.getDetailVendorPt = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
       #swagger.parameters['customer_id'] = { type: 'string' }
   */
    next()
}

exports.getDetailPortofolio = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
       #swagger.parameters['customer_id'] = { type: 'string' }
   */
    next()
}

exports.updateKdStatus = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Update Kode Status',
            schema: {
                billing_id: '',
                kd_status: ''
            }
        }
    */
    const {
        billing_id,
        kd_status
    } = req.body
    next()
}


exports.markAsClone = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',                                             
            required: true,  
            schema: {
                $project_id: []
            }                   
        }
    */
    next()
}

exports.getListUserActivity = async (req, res, next) => {
    /*
         #swagger.tags = ['Index']
     */
    //  const { kd_ref } = req.query
    next()
}

exports.getListApproval = async (req, res, next) => {
    /*
         #swagger.tags = ['Index']
     */
    //  const { kd_ref } = req.query
    next()
}

exports.getListLokasi = async (req, res, next) => {
    /*
         #swagger.tags = ['Index']
     */
    //  const { kd_ref } = req.query
    next()
}

exports.insertNotification = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.insertTask = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.updateTask = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.deleteTask = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.TaskDetail = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.updateNotification = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.getListNotification = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}
exports.getNotificationFaktur = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.getListTask = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.getListPegawai = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getRefDepartment = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getCustomerBySpuc = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
    */
    next()
}

exports.getListNIPByRole = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.getListRemarks = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.insertRemarks = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new notification',
            schema: {
                pengirim: '',
                penerima: '',
                title: '',
                text: '',
                channel: '',
            }
        }
    */
    const {
        
    } = req.body
    next()
}

exports.insertProductOwner = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                project_id: '',
                id_tab_status: '',  
                kd_status: '',
                billing_id: ''
            }
        }
    */

    next()
}

exports.getProductOwnerByPID = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                project_id: '',
                id_tab_status: '',  
                kd_status: '',
                billing_id: ''
            }
        }
    */

    next()
}

exports.insertNewProjectPID = async (req, res, next) => {
    /*
        #swagger.tags = ['Index']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a new project',
            schema: {
                project_kategori_id: '',
                project_type_id: '',  
                project_no: '',  
                project_name: '',  
                portofolio_id: '',  
                category_id: '', 
                est_nilai_penawaran: '',  
                est_cogs: '', 
                customer_id: '', 
                kd_area: '',  
                kd_status: '',
            }
        }
    */
    const {
        project_kategori_id,
        project_type_id,
        project_no,
        project_name,
        portofolio_id,
        category_id,
        est_nilai_penawaran,
        est_cogs,
        customer_id,
        kd_area,
        kd_status,
    } = req.body
    next()
}

exports.getListBillingFakturPajak = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}

exports.getListNoFakturExcel = async (req, res, next) => {
    /*
       #swagger.tags = ['Index']
   */
    next()
}