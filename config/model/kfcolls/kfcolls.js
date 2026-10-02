const { Sequelize, DataTypes } = require('sequelize');
const db = require('../../database/database');

exports.D_BILLING = db.define('D_BILLING',
    {
        billing_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "BILLING_ID"
        },
        billing_code: {
            type: DataTypes.STRING,
            field: 'BILLING_CODE'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        termin: {
            type: DataTypes.STRING,
            field: 'TERMIN'
        },
        divisi_id: {
            type: DataTypes.STRING,
            field: 'DIVISI_ID'
        },
        portofolio_id: {
            type: DataTypes.STRING,
            field: 'PORTFOLIO_ID'
        },
        est_periode_billing: {
            type: DataTypes.STRING,
            field: 'EST_PERIODE_BILLING'
        },
        est_bulan_billing: {
            type: DataTypes.STRING,
            field: 'EST_BULAN_BILLING'
        },
        est_billing: {
            type: DataTypes.NUMBER,
            field: 'EST_BILLING'
        },
        real_periode_billing: {
            type: DataTypes.STRING,
            field: 'REAL_PERIODE_BILLING'
        },
        real_bulan_billing: {
            type: DataTypes.STRING,
            field: 'REAL_BULAN_BILLING'
        },
        real_billing: {
            type: DataTypes.NUMBER,
            field: 'REAL_BILLING'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'KD_STATUS'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        kategori_billing: {
            type: DataTypes.STRING,
            field: 'KATEGORI_BILLING'
        },
        desc_termin: {
            type: DataTypes.STRING,
            field: 'DESC_TERMIN'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        parent_id: {
            type: DataTypes.STRING,
            field: 'PARENT_ID'
        },
        flag_parent: {
            type: DataTypes.NUMBER,
            field: 'FLAG_PARENT'
        },
        no_integrasi: {
            type: DataTypes.STRING,
            field: 'NO_INTEGRASI'
        },
        doc_number: {
            type: DataTypes.STRING,
            field: 'DOC_NUMBER'
        },
        int_number: {
            type: DataTypes.STRING,
            field: 'INT_NUMBER'
        },
        source_project_id: {
            type: DataTypes.STRING,
            field: 'SOURCE_PROJECT_ID'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_BILLING_DOKUMEN = db.define('D_BILLING_DOKUMEN',
    {
        billing_detail_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "BILLING_DETAIL_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
        dokumen_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_ID'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_BILLING_REVENUE = db.define('D_BILLING_REVENUE',
    {
        billing_revenue_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "BILLING_REVENUE_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
        status_pymad: {
            type: DataTypes.STRING,
            field: 'STATUS_PYMAD'
        },
        nominal_pymad: {
            type: DataTypes.NUMBER,
            field: 'NOMINAL_PYMAD'
        },
        tanggal_bast: {
            type: DataTypes.DATE,
            field: 'TANGGAL_BAST'
        },
        no_invoice: {
            type: DataTypes.STRING,
            field: 'NO_INVOICE'
        },
        tanggal_invoice: {
            type: DataTypes.DATE,
            field: 'TANGGAL_INVOICE'
        },
        status_invoice: {
            type: DataTypes.STRING,
            field: 'STATUS_INVOICE'
        },
        nominal_invoice: {
            type: DataTypes.NUMBER,
            field: 'NOMINAL_INVOICE'
        },
        no_faktur: {
            type: DataTypes.STRING,
            field: 'NO_FAKTUR'
        },
        tanggal_faktur: {
            type: DataTypes.DATE,
            field: 'TANGGAL_FAKTUR'
        },
        status_pelunasan: {
            type: DataTypes.STRING,
            field: 'STATUS_PELUNASAN'
        },
        nominal_pelunasan: {
            type: DataTypes.NUMBER,
            field: 'NOMINAL_PELUNASAN'
        },
        tanggal_pelunasan: {
            type: DataTypes.DATE,
            field: 'TANGGAL_PELUNASAN'
        },
        denda_pajak: {
            type: DataTypes.NUMBER,
            field: 'DENDA_PAJAK'
        },
        pph: {
            type: DataTypes.NUMBER,
            field: 'PPH'
        },
        ppn: {
            type: DataTypes.NUMBER,
            field: 'PPN'
        },
        ppn_tarif: {
            type: DataTypes.NUMBER,
            field: 'PPN_TARIF'
        },
        wapu: {
            type: DataTypes.STRING,
            field: 'WAPU'
        },
        biaya_lain: {
            type: DataTypes.NUMBER,
            field: 'BIAYA_LAIN'
        },
        outstanding: {
            type: DataTypes.NUMBER,
            field: 'OUTSTANDING'
        },
        nominal_dpp: {
            type: DataTypes.NUMBER,
            field: 'NOMINAL_DPP'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
        status_kelengkapan_dokumen: {
            type: DataTypes.STRING,
            field: 'STATUS_KELENGKAPAN_DOKUMEN'
        },
        tanggal_posting: {
            type: DataTypes.DATE,
            field: 'TANGGAL_POSTING'
        },
        customer_id_to_sap: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_ID_TO_SAP'
        },
        no_ttb: {
            type: DataTypes.STRING,
            field: 'NO_TTB'
        },
        status_ssc: {
            type: DataTypes.STRING,
            field: 'STATUS_SSC'
        },
        aging_invoice: {
            type: DataTypes.STRING,
            field: 'AGING_INVOICE'
        },
        supply_status: {
            type: DataTypes.STRING,
            field: 'SUPPLY_STATUS'
        },
        tanggal_selesai_ssc: {
            type: DataTypes.DATE,
            field: 'TANGGAL_SELESAI_SSC'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        kode_bayar: {
            type: DataTypes.STRING,
            field: 'KODE_BAYAR'
        },
        url_merge: {
            type: DataTypes.STRING,
            field: 'URL_MERGE'
        },
        flag_faktur: {
            type: DataTypes.STRING,
            field: 'FLAG_FAKTUR'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_COST_OPR = db.define('D_COST_OPR',
    {
        cost_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "COST_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        tanggal_cost: {
            type: DataTypes.DATE,
            field: 'TANGGAL_COST'
        },
        kategori_cost: {
            type: DataTypes.STRING,
            field: 'KATEGORI_COST'
        },
        mata_anggaran: {
            type: DataTypes.STRING,
            field: 'MATA_ANGGARAN'
        },
        divisi_id: {
            type: DataTypes.STRING,
            field: 'DIVISI_ID'
        },
        jenis_cost: {
            type: DataTypes.STRING,
            field: 'JENIS_COST'
        },
        nilai_cost: {
            type: DataTypes.NUMBER,
            field: 'NILAI_COST'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_COST_OPR_DETAIL = db.define('D_COST_OPR_DETAIL',
    {
        cost_detail_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "COST_DETAIL_ID"
        },
        cost_id: {
            type: DataTypes.STRING,
            field: 'COST_ID'
        },
        dokumen_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_ID'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_COST_REVENUE = db.define('D_COST_REVENUE',
    {
        cost_revenue_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "COST_REVENUE_ID"
        },
        cost_id: {
            type: DataTypes.STRING,
            field: 'COST_ID'
        },
        nilai_realisasi: {
            type: DataTypes.NUMBER,
            field: 'NILAI_REALISASI'
        },
        aging_ca: {
            type: DataTypes.NUMBER,
            field: 'AGING_CA'
        },
        satuan_ca: {
            type: DataTypes.STRING,
            field: 'SATUAN_CA'
        },
        nilai_pelunasan: {
            type: DataTypes.NUMBER,
            field: 'NILAI_PELUNASAN'
        },
        status_invoice: {
            type: DataTypes.STRING,
            field: 'STATUS_INVOICE'
        },
        status_pelunasan: {
            type: DataTypes.STRING,
            field: 'STATUS_PELUNASAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_DOKUMEN = db.define('D_DOKUMEN',
    {
        dokumen_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "DOKUMEN_ID"
        },
        tipe_dokumen: {
            type: DataTypes.STRING,
            field: 'TIPE_DOKUMEN'
        },
        jns_dokumen: {
            type: DataTypes.STRING,
            field: 'JNS_DOKUMEN'
        },
        no_dokumen: {
            type: DataTypes.STRING,
            field: 'NO_DOKUMEN'
        },
        tgl_dokumen: {
            type: DataTypes.DATE,
            field: 'TGL_DOKUMEN'
        },
        url_dokumen: {
            type: DataTypes.STRING(4000),
            field: 'URL_DOKUMEN'
        },
        notes: {
            type: DataTypes.STRING,
            field: 'NOTES'
        },
        value_dok: {
            type: DataTypes.NUMBER,
            field: 'VALUE_DOK'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        flag_url: {
            type: DataTypes.STRING,
            field: 'FLAG_URL'
        },
        json_dok: {
            type: DataTypes.TEXT('long'),
            field: 'JSON_DOK'
        },
        flag_delete: {
            type: DataTypes.STRING,
            field: 'FLAG_DELETE'
        },
        no_ref: {
            type: DataTypes.STRING,
            field: 'NO_REF'
        },
        name_peo: {
            type: DataTypes.STRING,
            field: 'NAME_PEO'
        },
        perihal: {
            type: DataTypes.STRING,
            field: 'PERIHAL'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PERSONIL = db.define('D_PERSONIL',
    {
        personel_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "PERSONEL_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        position_id: {
            type: DataTypes.STRING,
            field: 'POSITION_ID'
        },
        kualifikasi_id: {
            type: DataTypes.STRING,
            field: 'KUALIFIKASI_ID'
        },
        qty_person: {
            type: DataTypes.NUMBER,
            field: 'QTY_PERSON'
        },
        satuan_person: {
            type: DataTypes.STRING,
            field: 'SATUAN_PERSON'
        },
        qty_date: {
            type: DataTypes.NUMBER,
            field: 'QTY_DATE'
        },
        satuan_date: {
            type: DataTypes.STRING,
            field: 'SATUAN_DATE'
        },
        cost_unit: {
            type: DataTypes.NUMBER,
            field: 'COST_UNIT'
        },
        cost_total: {
            type: DataTypes.NUMBER,
            field: 'COST_TOTAL'
        },
        divisi_id: {
            type: DataTypes.STRING,
            field: 'DIVISI_ID'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PERSONIL_DETAIL = db.define('D_PERSONIL_DETAIL',
    {
        dpersonel_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "DPERSONEL_ID"
        },
        sub_dpersonel_id: {
            type: DataTypes.STRING,
            field: 'SUB_DPERSONEL_ID'
        },
        personel_id: {
            type: DataTypes.STRING,
            field: 'PERSONEL_ID'
        },
        user_id: {
            type: DataTypes.STRING,
            field: 'USER_ID'
        },
        nik: {
            type: DataTypes.STRING,
            field: 'NIK'
        },
        nama_personil: {
            type: DataTypes.STRING,
            field: 'NAMA_PERSONIL'
        },
        divisi_id: {
            type: DataTypes.STRING,
            field: 'DIVISI_ID'
        },
        qty_date: {
            type: DataTypes.NUMBER,
            field: 'QTY_DATE'
        },
        satuan_date: {
            type: DataTypes.STRING,
            field: 'SATUAN_DATE'
        },
        flag_personil: {
            type: DataTypes.STRING,
            field: 'FLAG_PERSONIL'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PROJECT = db.define('D_PROJECT',
    {
        project_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "PROJECT_ID"
        },
        project_kategori_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_KATEGORI_ID'
        },
        project_type_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_TYPE_ID'
        },
        project_actual_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ACTUAL_ID'
        },
        project_no: {
            type: DataTypes.STRING,
            field: 'PROJECT_NO'
        },
        project_name: {
            type: DataTypes.STRING(4000),
            field: 'PROJECT_NAME'
        },
        portofolio_id: {
            type: DataTypes.INTEGER,
            field: 'PORTOFOLIO_ID'
        },
        category_id: {
            type: DataTypes.STRING,
            field: 'CATEGORY_ID'
        },
        est_nilai_penawaran: {
            type: DataTypes.INTEGER,
            field: 'EST_NILAI_PENAWARAN'
        },
        est_cogs: {
            type: DataTypes.INTEGER,
            field: 'EST_COGS'
        },
        customer_id: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_ID'
        },
        kd_area: {
            type: DataTypes.STRING,
            field: 'KD_AREA'
        },
        nilai_kontrak: {
            type: DataTypes.INTEGER,
            field: 'NILAI_KONTRAK'
        },
        cogs: {
            type: DataTypes.INTEGER,
            field: 'COGS'
        },
        contract_start: {
            type: DataTypes.DATE,
            field: 'CONTRACT_START'
        },
        contract_end: {
            type: DataTypes.DATE,
            field: 'CONTRACT_END'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'KD_STATUS'
        },
        kd_archive: {
            type: DataTypes.STRING,
            field: 'KD_ARCHIVE'
        },
        contract_no: {
            type: DataTypes.STRING,
            field: 'CONTRACT_NO'
        },
        contract_date: {
            type: DataTypes.DATE,
            field: 'CONTRACT_DATE'
        },
        dokumen_bamk_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_BAMK_ID'
        },
        dokumen_cbb_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_CBB_ID'
        },
        total_direct_cost: {
            type: DataTypes.INTEGER,
            field: 'TOTAL_DIRECT_COST'
        },
        total_indirect_cost: {
            type: DataTypes.INTEGER,
            field: 'TOTAL_INDIRECT_COST'
        },
        nilai_penawaran: {
            type: DataTypes.INTEGER,
            field: 'NILAI_PENAWARAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        margin_presentase: {
            type: DataTypes.NUMBER,
            field: 'MARGIN_PRESENTASE'
        },
        nip_sales: {
            type: DataTypes.STRING,
            field: 'NIP_SALES'
        },
        nama_sales: {
            type: DataTypes.STRING,
            field: 'NAMA_SALES'
        },
        margin_penawaran: {
            type: DataTypes.INTEGER,
            field: 'MARGIN_PENAWARAN'
        },
        margin_kontrak: {
            type: DataTypes.INTEGER,
            field: 'MARGIN_KONTRAK'
        },
        persentase_penawaran: {
            type: DataTypes.INTEGER,
            field: 'PERSENTASE_PENAWARAN'
        },
        persentase_kontrak: {
            type: DataTypes.INTEGER,
            field: 'PERSENTASE_KONTRAK'
        },
        project_owner: {
            type: DataTypes.STRING,
            field: 'PROJECT_OWNER'
        },
        role_user: {
            type: DataTypes.STRING,
            field: 'ROLE_USER'
        },
        kd_incoterm: {
            type: DataTypes.STRING,
            field: 'KD_INCOTERM'
        },
        val_incoterm: {
            type: DataTypes.STRING,
            field: 'VAL_INCOTERM'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        },
        keterangan: {
            type: DataTypes.STRING(4000),
            field: 'KETERANGAN'
        },
        kd_spuc: {
            type: DataTypes.STRING,
            field: 'KD_SPUC'
        },
        kd_sub_portofolio: {
            type: DataTypes.STRING,
            field: 'KD_SUB_PORTOFOLIO'
        },
        kd_cat_product: {
            type: DataTypes.STRING,
            field: 'KD_CAT_PRODUCT'
        },
        type_validasi_id: {
            type: DataTypes.STRING,
            field: 'TYPE_VALIDASI_ID'
        },
        po_number: {
            type: DataTypes.STRING,
            field: 'PO_NUMBER'
        },
        flag_lop: {
            type: DataTypes.STRING,
            field: 'FLAG_LOP'
        },
        lop_id: {
            type: DataTypes.STRING,
            field: 'LOP_ID'
        },
        project_model_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_MODEL_ID'
        },
        contract_type: {
            type: DataTypes.STRING,
            field: 'CONTRACT_TYPE'
        },
        kategori_revenue: {
            type: DataTypes.STRING,
            field: 'KATEGORI_REVENUE'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.D_PROJECT_CBB = db.define('D_PROJECT_CBB',
    {
        cbb_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "CBB_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        divisi_id: {
            type: DataTypes.STRING,
            field: 'DIVISI_ID'
        },
        coa_id: {
            type: DataTypes.STRING,
            field: 'COA_ID'
        },
        direct_cost: {
            type: DataTypes.NUMBER,
            field: 'DIRECT_COST'
        },
        indirect_cost: {
            type: DataTypes.NUMBER,
            field: 'INDIRECT_COST'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PROJECT_STATUS = db.define('D_PROJECT_STATUS',
    {
        status_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "STATUS_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'KD_STATUS'
        },
        date_status: {
            type: DataTypes.DATE,
            field: 'DATE_STATUS'
        },
        notes: {
            type: DataTypes.STRING,
            field: 'NOTES'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        type_status: {
            type: DataTypes.STRING,
            field: 'TYPE_STATUS'
        },
        id_tab_status: {
            type: DataTypes.STRING,
            field: 'ID_TAB_STATUS'
        },
        flag_new_dok: {
            type: DataTypes.STRING,
            field: 'FLAG_NEW_DOK'
        },
        alasan: {
            type: DataTypes.STRING,
            field: 'ALASAN'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.D_PROJECT_VENDOR = db.define('D_PROJECT_VENDOR',
    {
        project_vendor_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "PROJECT_VENDOR_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        vendor_id: {
            type: DataTypes.NUMBER,
            field: 'VENDOR_ID'
        },
        nilai_kontrak: {
            type: DataTypes.NUMBER,
            field: 'NILAI_KONTRAK'
        },
        no_kontrak: {
            type: DataTypes.STRING,
            field: 'NO_KONTRAK'
        },
        judul_kontrak: {
            type: DataTypes.STRING,
            field: 'JUDUL_KONTRAK'
        },
        start_date: {
            type: DataTypes.DATE,
            field: 'START_DATE'
        },
        end_date: {
            type: DataTypes.DATE,
            field: 'END_DATE'
        },
        flag_final: {
            type: DataTypes.STRING,
            field: 'FLAG_FINAL'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        flag_reject: {
            type: DataTypes.STRING,
            field: 'FLAG_REJECT'
        },
        reason_reject: {
            type: DataTypes.STRING,
            field: 'REASON_REJECT'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_REMIND = db.define('D_REMIND',
    {
        remind_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "REMIND_ID"
        },
        remind_type: {
            type: DataTypes.STRING,
            field: 'REMIND_TYPE'
        },
        limit_time: {
            type: DataTypes.NUMBER,
            field: 'LIMIT_TIME'
        },
        limit_unit: {
            type: DataTypes.STRING,
            field: 'LIMIT_UNIT'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        project_kategori_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_KATEGORI_ID'
        },
        subyek: {
            type: DataTypes.STRING,
            field: 'SUBYEK'
        },
        content: {
            type: DataTypes.STRING,
            field: 'CONTENT'
        },
        email_send: {
            type: DataTypes.STRING,
            field: 'EMAIL_SEND'
        },
        email_send_cc: {
            type: DataTypes.STRING,
            field: 'EMAIL_SEND_CC'
        },
        flag_send: {
            type: DataTypes.STRING,
            field: 'FLAG_SEND'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.H_LOG = db.define('H_LOG',
    {
        id_log: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "ID_LOG"
        },
        id_project: {
            type: DataTypes.STRING,
            field: 'ID_PROJECT'
        },
        dest: {
            type: DataTypes.STRING,
            field: 'DEST'
        },
        nama_service: {
            type: DataTypes.STRING,
            field: 'NAMA_SERVICE'
        },
        method_service: {
            type: DataTypes.STRING,
            field: 'METHOD_SERVICE'
        },
        payload_sender: {
            type: DataTypes.TEXT,
            field: 'PAYLOAD_SENDER'
        },
        payload_receiver: {
            type: DataTypes.TEXT,
            field: 'PAYLOAD_RECEIVER'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_CUSTOMER = db.define('M_CUSTOMER',
    {
        customer_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "CUSTOMER_ID"
        },
        kode_akun: {
            type: DataTypes.STRING,
            field: 'KODE_AKUN'
        },
        customer_name: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_NAME'
        },
        npwp: {
            type: DataTypes.STRING,
            field: 'NPWP'
        },
        address: {
            type: DataTypes.STRING,
            field: 'ADDRESS'
        },
        email: {
            type: DataTypes.STRING,
            field: 'EMAIL'
        },
        fax: {
            type: DataTypes.STRING,
            field: 'FAX'
        },
        telp: {
            type: DataTypes.STRING,
            field: 'TELP'
        },
        description: {
            type: DataTypes.STRING,
            field: 'DESCRIPTION'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        },
        customer_mdm: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_MDM'
        },
        customer_sap_ar: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_SAP_AR'
        },
        comp_code: {
            type: DataTypes.STRING,
            field: 'COMP_CODE'
        },
        kota: {
            type: DataTypes.STRING,
            field: 'KOTA'
        },
        wapu: {
            type: DataTypes.STRING,
            field: 'WAPU'
        },
        kd_jabatan: {
            type: DataTypes.STRING,
            field: 'KD_JABATAN'
        },
        ur_kd_jabatan: {
            type: DataTypes.STRING,
            field: 'UR_KD_JABATAN'
        },
        kd_jabatan2: {
            type: DataTypes.STRING,
            field: 'KD_JABATAN2'
        },
        ur_kd_jabatan2: {
            type: DataTypes.STRING,
            field: 'UR_KD_JABATAN2'
        },
        nilai_tagihan: {
            type: DataTypes.NUMBER,
            field: 'NILAI_TAGIHAN'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        profit_center: {
            type: DataTypes.STRING,
            field: 'PROFIT_CENTER'
        },
        nitku: {
            type: DataTypes.STRING,
            field: 'NITKU'
        },
        tin: {
            type: DataTypes.STRING,
            field: 'TIN'
        },
        pelindo_group: {
            type: DataTypes.STRING,
            field: 'PELINDO_GROUP'
        },
        trading_partner: {
            type: DataTypes.STRING,
            field: 'TRADING_PARTNER'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.M_CUSTOMER_CONTACT = db.define('M_CUSTOMER_CONTACT',
    {
        customer_contact_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "CUSTOMER_CONTACT_ID"
        },
        nama_contact: {
            type: DataTypes.STRING,
            field: 'NAMA_CONTACT'
        },
        address: {
            type: DataTypes.STRING,
            field: 'ADDRESS'
        },
        email: {
            type: DataTypes.STRING,
            field: 'EMAIL'
        },
        phone: {
            type: DataTypes.STRING,
            field: 'PHONE'
        },
        jabatan: {
            type: DataTypes.STRING,
            field: 'JABATAN'
        },
        gender: {
            type: DataTypes.STRING,
            field: 'GENDER'
        },
        birthdate: {
            type: DataTypes.DATE,
            field: 'BIRTHDATE'
        },
        membawahi: {
            type: DataTypes.STRING,
            field: 'MEMBAWAHI'
        },
        description: {
            type: DataTypes.STRING,
            field: 'DESCRIPTION'
        },
        customer_id: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_ID'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        kd_jabatan: {
            type: DataTypes.STRING,
            field: 'KD_JABATAN'
        },
        ur_kd_jabatan: {
            type: DataTypes.STRING,
            field: 'UR_KD_JABATAN'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.M_MENU = db.define('M_MENU',
    {
        id_menu: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "ID_MENU"
        },
        menu_text: {
            type: DataTypes.STRING,
            field: "MENU_TEXT"
        },
        menu_url: {
            type: DataTypes.STRING,
            field: "MENU_URL"
        },
        id_parent_menu: {
            type: DataTypes.NUMBER,
            field: "ID_PARENT_MENU"
        },
        icon: {
            type: DataTypes.STRING,
            field: "ICON"
        },
        order_position: {
            type: DataTypes.NUMBER,
            field: "ORDER_POSITION"
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_PORTOFOLIO = db.define('M_PORTOFOLIO',
    {
        portofolio_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "PORTOFOLIO_ID"
        },
        tahun: {
            type: DataTypes.STRING,
            field: 'TAHUN'
        },
        kode: {
            type: DataTypes.STRING,
            field: 'KODE'
        },
        kode_akun: {
            type: DataTypes.STRING,
            field: 'KODE_AKUN'
        },
        portofolio: {
            type: DataTypes.STRING,
            field: 'PORTOFOLIO'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.M_VENDOR_KONTAK = db.define("M_VENDOR_KONTAK",
    {
        vendor_kontak_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "VENDOR_KONTAK_ID"
        },
        vendor_id: {
            type: DataTypes.NUMBER,
            field: 'VENDOR_ID'
        },
        nama: {
            type: DataTypes.STRING,
            field: 'NAMA'
        },
        no_telp: {
            type: DataTypes.STRING,
            field: 'NO_TELP'
        },
        email: {
            type: DataTypes.STRING,
            field: 'EMAIL'
        },
        jabatan: {
            type: DataTypes.STRING,
            field: 'JABATAN'
        },
        status: {
            type: DataTypes.STRING,
            field: 'STATUS'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        alamat: {
            type: DataTypes.STRING,
            field: 'ALAMAT'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_VENDOR_PT = db.define("M_VENDOR_PT",
    {
        vendor_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "VENDOR_ID"
        },
        nama_perusahaan: {
            type: DataTypes.STRING,
            field: 'NAMA_PERUSAHAAN'
        },
        alamat_perusahaan: {
            type: DataTypes.STRING,
            field: 'ALAMAT_PERUSAHAAN'
        },
        npwp: {
            type: DataTypes.STRING,
            field: 'NPWP'
        },
        no_telp: {
            type: DataTypes.STRING,
            field: 'NO_TELP'
        },
        email: {
            type: DataTypes.STRING,
            field: 'EMAIL'
        },
        status: {
            type: DataTypes.STRING,
            field: 'STATUS'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_USER_ACTIVITY = db.define("D_USER_ACTIVITY",
    {
        activity_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "ACTIVITY_ID"
        },
        tanggal: {
            type: DataTypes.DATE,
            field: 'TANGGAL'
        },
        nip: {
            type: DataTypes.STRING,
            field: 'NIP'
        },
        nama: {
            type: DataTypes.STRING,
            field: 'NAMA'
        },
        login: {
            type: DataTypes.DATE,
            field: 'LOGIN'
        },
        logout: {
            type: DataTypes.DATE,
            field: 'LOGOUT'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_PEGAWAI = db.define("M_PEGAWAI",
    {
        pegawai_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "PEGAWAI_ID"
        },
        nrp: {
            type: DataTypes.STRING,
            field: 'NRP'
        },
        nama: {
            type: DataTypes.STRING,
            field: 'NAMA'
        },
        alamat: {
            type: DataTypes.STRING,
            field: 'ALAMAT'
        },
        gender: {
            type: DataTypes.STRING,
            field: 'GENDER'
        },
        department_id: {
            type: DataTypes.STRING,
            field: 'DEPARTMENT_ID'
        },
        jabatan: {
            type: DataTypes.STRING,
            field: 'JABATAN'
        },
        kelas: {
            type: DataTypes.STRING,
            field: 'KELAS'
        },
        jenis_pegawai: {
            type: DataTypes.STRING,
            field: 'JENIS_PEGAWAI'
        },
        email: {
            type: DataTypes.STRING,
            field: 'EMAIL'
        },
        telepon: {
            type: DataTypes.STRING,
            field: 'TELEPON'
        },
        whatsapp: {
            type: DataTypes.STRING,
            field: 'WHATSAPP'
        },
        username: {
            type: DataTypes.STRING,
            field: 'USERNAME'
        },
        jenis_perusahaan_id: {
            type: DataTypes.STRING,
            field: 'JENIS_PERUSAHAAN_ID'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_LOKASI = db.define("M_LOKASI",
    {
        lokasi_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "LOKASI_ID"
        },
        regional: {
            type: DataTypes.STRING,
            field: 'REGIONAL'
        },
        kota: {
            type: DataTypes.STRING,
            field: 'KOTA'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.N_PUSH_CLIENT = db.define("NOTIFICATION_PUSH_CLIENT",
    {
        notification_push_client_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "NOTIFICATION_PUSH_CLIENT_ID"
        },
        notification_event_id: {
            type: DataTypes.STRING,
            field: 'NOTIFICATION_EVENT_ID'
        },
        fcm_token: {
            type: DataTypes.TEXT,
            field: 'FCM_TOKEN'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.N_EVENT = db.define("NOTIFICATION_EVENT",
    {
        notification_event_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "NOTIFICATION_EVENT_ID"
        },
        category: {
            type: DataTypes.NUMBER,
            field: 'NOTIFICATION_CATEGORY_ID'
        },
        channel: {
            type: DataTypes.NUMBER,
            field: 'NOTIFICATION_CHANNEL_ID'
        },
        title: {
            type: DataTypes.STRING,
            field: 'PUSH_TITLE_TEMPLATE'
        },
        body: {
            type: DataTypes.TEXT,
            field: 'PUSH_BODY_TEMPLATE'
        },
        slack_channel: {
            type: DataTypes.STRING,
            field: 'SLACK_CHANNEL'
        },
        slack_template_file: {
            type: DataTypes.STRING,
            field: 'SLACK_TEMPLATE_FILE'
        },
        link: {
            type: DataTypes.STRING,
            field: 'LINK'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        navigate_to: {
            type: DataTypes.STRING,
            field: 'NAVIGATE_TO'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.N_STATUS = db.define("NOTIFICATION_STATUS",
    {
        notification_status_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "NOTIFICATION_STATUS_ID"
        },
        notification_event_id: {
            type: DataTypes.STRING,
            field: "NOTIFICATION_EVENT_ID"
        },
        nip_tujuan: {
            type: DataTypes.STRING,
            field: 'NIP_TUJUAN'
        },
        is_send: {
            type: DataTypes.STRING,
            field: 'IS_SEND'
        },
        is_read: {
            type: DataTypes.STRING,
            field: 'IS_READ'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_TASK = db.define("D_TASK",
    {
        task_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "TASK_ID"
        },
        notification_status_id: {
            type: DataTypes.STRING,
            field: "NOTIFICATION_STATUS_ID"
        },
        notification_event_id: {
            type: DataTypes.STRING,
            field: "NOTIFICATION_EVENT_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        title_task: {
            type: DataTypes.STRING,
            field: 'TITLE_TASK'
        },
        task_detail: {
            type: DataTypes.STRING,
            field: 'TASK_DETAIL'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        assign_by: {
            type: DataTypes.STRING,
            field: 'ASSIGN_BY'
        },
        assign_to: {
            type: DataTypes.STRING,
            field: 'ASSIGN_TO'
        },
        start_date: {
            type: DataTypes.DATE,
            field: 'START_DATE'
        },
        end_date: {
            type: DataTypes.DATE,
            field: 'END_DATE'
        },
        task_category: {
            type: DataTypes.STRING,
            field: 'TASK_CATEGORY'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_TASK_ASSIGN = db.define("D_TASK_ASSIGN",
    {
        id_task_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "ID_TASK_ASSIGN"
        },
        task_id: {
            type: DataTypes.STRING,
            field: "TASK_ID"
        },
        assign_to: {
            type: DataTypes.STRING,
            field: "ASSIGN_TO"
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_REMARKS = db.define("D_REMARKS",
    {
        remark_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "REMARK_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: "PROJECT_ID"
        },
        desc_remark: {
            type: DataTypes.STRING,
            field: "DESC_REMARK"
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_KARYAWAN = db.define("M_KARYAWAN",
    {
        karyawan_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "KARYAWAN_ID"
        },
        nik: {
            type: DataTypes.STRING,
            field: 'NIK'
        },
        nama: {
            type: DataTypes.STRING,
            field: 'NAMA'
        },
        email: {
            type: DataTypes.STRING,
            field: 'EMAIL'
        },
        alamat: {
            type: DataTypes.STRING,
            field: 'ALAMAT'
        },
        tanggal_lahir: {
            type: DataTypes.STRING,
            field: 'TANGGAL_LAHIR'
        },
        kualifikasi: {
            type: DataTypes.STRING,
            field: 'KUALIFIKASI'
        },
        jabatan_id: {
            type: DataTypes.NUMBER,
            field: 'JABATAN_ID'
        },
        band: {
            type: DataTypes.STRING,
            field: 'BAND'
        },
        aktif: {
            type: DataTypes.STRING,
            field: 'AKTIF'
        },
        status_karyawan: {
            type: DataTypes.STRING,
            field: 'STATUS_KARYAWAN'
        },
        status_kepegawaian: {
            type: DataTypes.STRING,
            field: 'STATUS_KEPEGAWAIAN'
        },
        tanggal_masuk_kerja: {
            type: DataTypes.DATE,
            field: 'TANGGAL_MASUK_KERJA'
        },
        kelas_jabatan: {
            type: DataTypes.NUMBER,
            field: 'KELAS_JABATAN'
        },
        no_rekening: {
            type: DataTypes.STRING,
            field: 'NO_REKENING'
        },
        bank: {
            type: DataTypes.NUMBER,
            field: 'BANK'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        absensi_type_id: {
            type: DataTypes.NUMBER,
            field: 'ABSENSI_TYPE_ID'
        },
        department_id: {
            type: DataTypes.STRING,
            field: 'DEPARTMENT_ID'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_ASSIGN_PROJECT = db.define("D_ASSIGN_PROJECT",
    {
        assign_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "ASSIGN_ID"
        },
        nip: {
            type: DataTypes.STRING,
            field: 'NIP'
        },
        role_project: {
            type: DataTypes.STRING,
            field: 'ROLE_PROJECT'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_TASK.hasMany(exports.D_TASK_ASSIGN, {
    foreignKey: "task_id",  // Foreign Key di tabel D_TASK_ASSIGN
    sourceKey: "task_id",   // Primary Key di tabel D_TASK
    as: "assignments"       // Alias untuk relasi
});

exports.D_TASK_ASSIGN.belongsTo(exports.D_TASK, {
    foreignKey: "task_id",
    targetKey: "task_id",
    as: "task"
});

exports.D_TASK_ASSIGN.belongsTo(exports.M_KARYAWAN, {
    foreignKey: "assign_to",
    targetKey: "nik",
    as: "karyawan"
});

exports.M_KARYAWAN.hasMany(exports.D_TASK_ASSIGN, {
    foreignKey: "assign_to",
    sourceKey: "nik",
    as: "assignments"
});

exports.D_PROJECT_PROGRESS = db.define("D_PROJECT_PROGRESS",
    {
        progress_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "PROGRESS_ID"
        },
        status_progress_id: {
            type: DataTypes.STRING,
            field: 'STATUS_PROGRESS_ID'
        },
        percentage: {
            type: DataTypes.STRING,
            field: 'PERCENTAGE'
        },
        remark: {
            type: DataTypes.STRING,
            field: 'REMARK'
        },
        dok_pendukung: {
            type: DataTypes.STRING,
            field: 'DOK_PENDUKUNG'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        due_date: {
            type: DataTypes.DATE,
            field: 'DUE_DATE'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        periode_pelaporan: {
            type: DataTypes.STRING,
            field: 'PERIODE_PELAPORAN'
        },
        nilai_pelaporan: {
            type: DataTypes.NUMBER,
            field: 'NILAI_PELAPORAN'
        },
        billing_id: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.R_DATA_MASTER = db.define("R_DATA_MASTER",
    {
        master_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "MASTER_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: "BILLING_ID"
        },
        comp_code: {
            type: DataTypes.STRING,
            field: 'COMPANY_CODE'
        },
        be_id: {
            type: DataTypes.STRING,
            field: 'BE_ID'
        },
        profit_center: {
            type: DataTypes.STRING,
            field: 'PROFIT_CENTER'
        },
        service_group: {
            type: DataTypes.STRING,
            field: 'SERVICE_GROUP'
        },
        service_name: {
            type: DataTypes.STRING,
            field: 'SERVICE_NAME'
        },
        gl_account: {
            type: DataTypes.STRING,
            field: 'GL_ACCOUNT'
        },
        ur_gl_account: {
            type: DataTypes.STRING,
            field: 'UR_GL_ACCOUNT'
        },
        unit: {
            type: DataTypes.STRING,
            field: 'UNIT'
        },
        tax_code: {
            type: DataTypes.STRING,
            field: 'TAX_CODE'
        },
        service_code: {
            type: DataTypes.STRING,
            field: 'SERVICE_CODE'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.R_DATA_MASTER_DETAIL = db.define("R_DATA_MASTER_DETAIL",
    {
        master_detail_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "MASTER_DETAIL_ID"
        },
        master_id: {
            type: DataTypes.STRING,
            field: "MASTER_ID"
        },
        unit: {
            type: DataTypes.STRING,
            field: "UNIT"
        },
        price: {
            type: DataTypes.NUMBER,
            field: 'PRICE'
        },
        multiply_factor: {
            type: DataTypes.STRING,
            field: 'MULTIPLY_FUNCTION'
        },
        valid_form: {
            type: DataTypes.DATE,
            field: 'VALID_FORM'
        },
        valid_to: {
            type: DataTypes.DATE,
            field: 'VALID_TO'
        },
        legal_contract_no: {
            type: DataTypes.STRING,
            field: 'LEGAL_CONTRACT_NO'
        },
        contract_date: {
            type: DataTypes.DATE,
            field: 'CONTRACT_DATE'
        },
        contract_validity: {
            type: DataTypes.DATE,
            field: 'CONTRACT_VALIDITY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.R_TRANSACTION = db.define("R_TRANSACTION",
    {
        transaction_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "TRANSACTION_ID"
        },
        trans_id: {
            type: DataTypes.STRING,
            field: "TRANS_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: "BILLING_ID"
        },
        comp_code: {
            type: DataTypes.STRING,
            field: 'COMP_CODE'
        },
        profit_center: {
            type: DataTypes.STRING,
            field: 'PROFIT_CENTER'
        },
        services_group: {
            type: DataTypes.STRING,
            field: 'SERVICES_GROUP'
        },
        tax_code: {
            type: DataTypes.STRING,
            field: 'TAX_CODE'
        },
        customer_mdm: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_MDM'
        },
        customer_sap_ar: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_SAP_AR'
        },
        faktur_pajak: {
            type: DataTypes.STRING,
            field: 'FAKTUR_PAJAK'
        },
        nama_kapal: {
            type: DataTypes.STRING,
            field: 'NAMA_KAPAL'
        },
        posting_date: {
            type: DataTypes.DATE,
            field: 'POSTING_DATE'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        posting_response: {
            type: DataTypes.STRING,
            field: 'POSTING_RESPONSE'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.R_TRANSACTION_DETAIL = db.define("R_TRANSACTION_DETAIL",
    {
        transaction_detail_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "TRANSACTION_DETAIL_ID"
        },
        transaction_id: {
            type: DataTypes.STRING,
            field: "TRANSACTION_ID"
        },
        start_date: {
            type: DataTypes.DATE,
            field: "START_DATE"
        },
        end_date: {
            type: DataTypes.DATE,
            field: "END_DATE"
        },
        service_code: {
            type: DataTypes.STRING,
            field: 'SERVICE_CODE'
        },
        profit_center: {
            type: DataTypes.STRING,
            field: 'PROFIT_CENTER'
        },
        quantity: {
            type: DataTypes.NUMBER,
            field: 'QUANTITY'
        },
        admin_fee: {
            type: DataTypes.NUMBER,
            field: 'ADMIN_FEE'
        },
        diskon: {
            type: DataTypes.NUMBER,
            field: 'DISKON'
        },
        diskon_nominal: {
            type: DataTypes.NUMBER,
            field: 'DISKON_NOMINAL'
        },
        price: {
            type: DataTypes.NUMBER,
            field: 'PRICE'
        },
        remark: {
            type: DataTypes.STRING,
            field: 'REMARK'
        },
        coa_produksi: {
            type: DataTypes.STRING,
            field: 'COA_PRODUKSI'
        },
        jenis_pph: {
            type: DataTypes.STRING,
            field: 'JENIS_PPH'
        },
        kode_io: {
            type: DataTypes.STRING,
            field: 'KODE_IO'
        },
        ur_kode_io: {
            type: DataTypes.STRING,
            field: 'UR_KODE_IO'
        },
        gl_account: {
            type: DataTypes.STRING,
            field: 'GL_ACCOUNT'
        },
        amount_idr: {
            type: DataTypes.NUMBER,
            field: 'AMOUNT_IDR'
        },
        amount_after_disc: {
            type: DataTypes.NUMBER,
            field: 'AMOUNT_AFTER_DISC'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.INTEGRASI_LOG = db.define('INTEGRASI_LOG',
    {
        id_log: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
            field: "ID_LOG"
        },
        log_date: {
            type: DataTypes.DATE,
            field: 'LOG_DATE'
        },
        end_point: {
            type: DataTypes.STRING,
            field: 'END_POINT'
        },
        modul: {
            type: DataTypes.STRING,
            field: 'MODUL'
        },
        method: {
            type: DataTypes.STRING,
            field: 'METHOD'
        },
        req: {
            type: DataTypes.TEXT,
            field: 'REQ'
        },
        res: {
            type: DataTypes.TEXT,
            field: 'RES'
        },
        status: {
            type: DataTypes.STRING,
            field: 'STATUS'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_BILLING_ADJUSTMENT = db.define('D_BILLING_ADJUSTMENT',
    {
        adjustment_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: "ADJUSTMENT_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: "BILLING_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        project_name: {
            type: DataTypes.STRING,
            field: 'PROJECT_NAME'
        },
        customer_id: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_ID'
        },
        real_periode_billing: {
            type: DataTypes.STRING,
            field: 'REAL_PERIODE_BILLING'
        },
        real_bulan_billing: {
            type: DataTypes.STRING,
            field: 'REAL_BULAN_BILLING'
        },
        real_billing: {
            type: DataTypes.STRING,
            field: 'REAL_BILLING'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'KD_STATUS'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        jns_adjust: {
            type: DataTypes.STRING,
            field: 'JNS_ADJUST'
        },
        billing_code: {
            type: DataTypes.STRING,
            field: 'BILLING_CODE'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.D_SURAT_TAGIHAN_STATUS = db.define('D_SURAT_TAGIHAN_STATUS',
    {
        billing_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: "BILLING_ID"
        },
        no_ref: {
            type: DataTypes.STRING,
            field: 'NO_REF'
        },
        status: {
            type: DataTypes.STRING,
            field: 'STATUS'
        },
        catatan: {
            type: DataTypes.STRING,
            field: 'CATATAN'
        },
        nip_aksi: {
            type: DataTypes.STRING,
            field: 'NIP_AKSI'
        },
        nama_aksi: {
            type: DataTypes.STRING,
            field: 'NAMA_AKSI'
        },
        waktu_aksi: {
            type: DataTypes.DATE,
            field: 'WAKTU_AKSI'
        },
        nomor_surat: {
            type: DataTypes.STRING,
            field: 'NOMOR_SURAT'
        },
        link_surat: {
            type: DataTypes.STRING,
            field: 'LINK_SURAT'
        },
        link_surat_pdf: {
            type: DataTypes.STRING,
            field: 'LINK_SURAT_PDF'
        },
        link_surat_disposisi: {
            type: DataTypes.STRING,
            field: 'LINK_SURAT_DISPOSISI'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.D_STAMP = db.define('D_STAMP',
    {
        stamp_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            field: "STAMP_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
        dokumen_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_ID'
        },
        sn: {
            type: DataTypes.STRING,
            field: 'SN'
        },
        materai: {
            type: DataTypes.TEXT('long'),
            field: 'MATERAI'
        },
        jwtoken: {
            type: DataTypes.STRING(4000),
            field: 'JWTOKEN'
        },
        flag_unsigned: {
            type: DataTypes.STRING,
            field: 'FLAG_UNSIGNED'
        },
        flag_stamp: {
            type: DataTypes.STRING,
            field: 'FLAG_STAMP'
        },
        flag_signed: {
            type: DataTypes.STRING,
            field: 'FLAG_SIGNED'
        },
        kode_proses: {
            type: DataTypes.STRING,
            field: 'KODE_PROSES'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        file_draft: {
            type: DataTypes.STRING,
            field: 'FILE_DRAFT'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
);

exports.D_LOP = db.define('D_LOP',
    {
        lop_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: "LOP_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        project_no: {
            type: DataTypes.STRING,
            field: 'PROJECT_NO'
        },
        project_name: {
            type: DataTypes.BLOB,
            field: 'PROJECT_NAME'
        },
        nilai_project_est: {
            type: DataTypes.NUMBER,
            field: 'NILAI_PROJECT_EST'
        },
        cogs_project_est: {
            type: DataTypes.NUMBER,
            field: 'COGS_PROJECT_EST'
        },
        margin_project_est: {
            type: DataTypes.DECIMAL(10, 4),
            field: 'MARGIN_PROJECT_EST'
        },
        customer_id: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_ID'
        },
        portofolio_id: {
            type: DataTypes.STRING,
            field: 'PORTOFOLIO_ID'
        },
        kd_spuc: {
            type: DataTypes.STRING,
            field: 'KD_SPUC'
        },
        status_project: {
            type: DataTypes.STRING,
            field: 'STATUS_PROJECT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.A_LOP = db.define('A_LOP',
    {
        LOP_ID: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: "LOP_ID"
        },
        PROJECT_ID: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        PROJECT_NO: {
            type: DataTypes.STRING,
            field: 'PROJECT_NO'
        },
        // PROJECT_NAME: {
        //     type : DataTypes.BLOB,
        //     field: 'PROJECT_NAME'
        // },
        PROJECT_NAME: {
            type: DataTypes.STRING(1000),
            field: 'PROJECT_NAME'
        },
        CATEGORY_ID: {
            type: DataTypes.STRING,
            field: 'CATEGORY_ID'
        },
        NAMA_SALES: {
            type: DataTypes.STRING,
            field: 'NAMA_SALES'
        },
        JENIS_LOP: {
            type: DataTypes.STRING,
            field: 'JENIS_LOP'
        },
        PROJECT_OWNER: {
            type: DataTypes.STRING,
            field: 'PROJECT_OWNER'
        },
        NILAI_PROJECT_EST: {
            type: DataTypes.NUMBER,
            field: 'NILAI_PROJECT_EST'
        },
        COGS_PROJECT_EST: {
            type: DataTypes.NUMBER,
            field: 'COGS_PROJECT_EST'
        },
        MARGIN_PROJECT_EST: {
            type: DataTypes.DECIMAL(10, 4),
            field: 'MARGIN_PROJECT_EST'
        },
        CUSTOMER_ID: {
            type: DataTypes.STRING,
            field: 'CUSTOMER_ID'
        },
        PORTOFOLIO_ID: {
            type: DataTypes.STRING,
            field: 'PORTOFOLIO_ID'
        },
        KD_SPUC: {
            type: DataTypes.STRING,
            field: 'KD_SPUC'
        },
        STATUS_PROJECT: {
            type: DataTypes.STRING,
            field: 'STATUS_PROJECT'
        },
        NILAI_REVENUE: {
            type: DataTypes.NUMBER,
            field: 'NILAI_REVENUE'
        },
        CREATED_BY: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        UPDATED_BY: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        CREATED_DATE: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        UPDATED_DATE: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
        NILAI_LABA: {
            type: DataTypes.NUMBER,
            field: 'NILAI_LABA'
        },
        NILAI_COGS: {
            type: DataTypes.NUMBER,
            field: 'NILAI_COGS'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_LOP_DETAIL = db.define('D_LOP_DETAIL',
    {
        lop_detail_id: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: "LOP_DETAIL_ID"
        },
        lop_id: {
            type: DataTypes.STRING,
            field: 'LOP_ID'
        },
        lop_no: {
            type: DataTypes.STRING,
            field: 'LOP_NO'
        },
        termin: {
            type: DataTypes.STRING,
            field: 'TERMIN'
        },
        flag_delete: {
            type: DataTypes.STRING,
            field: 'FLAG_DELETE'
        },
        cogs_est: {
            type: DataTypes.FLOAT,
            field: 'COGS_EST'
        },
        bulan_est: {
            type: DataTypes.STRING,
            field: 'BULAN_EST'
        },
        tahun_est: {
            type: DataTypes.STRING,
            field: 'TAHUN_EST'
        },
        nilai_est: {
            type: DataTypes.FLOAT,
            field: 'NILAI_EST'
        },
        bulan_real: {
            type: DataTypes.STRING,
            field: 'BULAN_REAL'
        },
        tahun_real: {
            type: DataTypes.STRING,
            field: 'TAHUN_REAL'
        },
        nilai_real: {
            type: DataTypes.FLOAT,
            field: 'NILAI_REAL'
        },
        jenis_lop: {
            type: DataTypes.STRING,
            field: 'JENIS_LOP'
        },
        billing_id: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        submit_potter: {
            type: DataTypes.STRING,
            field: 'SUBMIT_POTTER'
        },
        status_lop: {
            type: DataTypes.STRING,
            field: 'STATUS_LOP'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.A_LOP_DETAIL = db.define('A_LOP_DETAIL',
    {
        LOP_DETAIL_ID: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: "LOP_DETAIL_ID"
        },
        LOP_ID: {
            type: DataTypes.STRING,
            field: 'LOP_ID'
        },
        TERMIN: {
            type: DataTypes.STRING,
            field: 'TERMIN'
        },
        STATUS_BILLING: {
            type: DataTypes.STRING,
            field: 'STATUS_BILLING'
        },
        FLAG_DELETE: {
            type: DataTypes.STRING,
            field: 'FLAG_DELETE'
        },
        COGS_EST: {
            type: DataTypes.FLOAT,
            field: 'COGS_EST'
        },
        BULAN_EST: {
            type: DataTypes.STRING,
            field: 'BULAN_EST'
        },
        TAHUN_EST: {
            type: DataTypes.STRING,
            field: 'TAHUN_EST'
        },
        NILAI_EST: {
            type: DataTypes.FLOAT,
            field: 'NILAI_EST'
        },
        BULAN_REAL: {
            type: DataTypes.STRING,
            field: 'BULAN_REAL'
        },
        TAHUN_REAL: {
            type: DataTypes.STRING,
            field: 'TAHUN_REAL'
        },
        NILAI_REAL: {
            type: DataTypes.FLOAT,
            field: 'NILAI_REAL'
        },
        STATUS_LOP: {
            type: DataTypes.STRING,
            field: 'STATUS_LOP'
        },
        BILLING_ID: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
        KETERANGAN: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        SUBMIT_POTTER: {
            type: DataTypes.STRING,
            field: 'SUBMIT_POTTER'
        },
        COGS_REAL: {
            type: DataTypes.FLOAT,
            field: 'COGS_REAL'
        },
        LABA_REAL: {
            type: DataTypes.FLOAT,
            field: 'LABA_REAL'
        },
        LABA_EST: {
            type: DataTypes.FLOAT,
            field: 'LABA_EST'
        },
        CREATED_BY: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        UPDATED_BY: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        CREATED_DATE: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        UPDATED_DATE: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.H_AUDIT = db.define('H_AUDIT',
    {
        audit_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "AUDIT_ID"
        },
        nip: {
            type: DataTypes.STRING,
            field: 'NIP'
        },
        table_name: {
            type: DataTypes.STRING,
            field: 'TABLE_NAME'
        },
        primary_key: {
            type: DataTypes.STRING,
            field: 'PRIMARY_KEY'
        },
        action_type: {
            type: DataTypes.STRING,
            field: 'ACTION_TYPE'
        },
        old_data: {
            type: DataTypes.TEXT,
            field: 'OLD_DATA'
        },
        new_data: {
            type: DataTypes.TEXT,
            field: 'NEW_DATA'
        },
        remarks: {
            type: DataTypes.STRING,
            field: 'REMARKS'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.H_BILLING = db.define('H_BILLING',
    {
        billing_h_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "BILLING_H_ID"
        },
        billing_id: {
            type: DataTypes.STRING,
            field: 'BILLING_ID'
        },
        billing_id_actual: {
            type: DataTypes.STRING,
            field: 'BILLING_ID_ACTUAL'
        },
        billing_code: {
            type: DataTypes.STRING,
            field: 'BILLING_CODE'
        },
        doc_cancel: {
            type: DataTypes.STRING,
            field: 'DOC_CANCEL'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PROJECT_PO = db.define('D_PROJECT_PO',
    {
        project_po_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "PROJECT_PO_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        pid_po: {
            type: DataTypes.STRING,
            field: 'PID_PO'
        },
        po_id: {
            type: DataTypes.STRING,
            field: 'PO_ID'
        },
        po_kode: {
            type: DataTypes.STRING,
            field: 'PO_KODE'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.H_PROJECT_NO = db.define('H_PROJECT_NO',
    {
        log_pid_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "LOG_PID_ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        project_no: {
            type: DataTypes.STRING,
            field: 'PROJECT_NO'
        },
        project_type_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_TYPE_ID'
        },
        contract_type: {
            type: DataTypes.STRING,
            field: 'CONTRACT_TYPE'
        },
        project_contract_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_CONTRACT_ID'
        },
        change_no: {
            type: DataTypes.NUMBER,
            field: 'CHANGE_NO'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        },
        is_current: {
            type: DataTypes.STRING,
            field: 'IS_CURRENT'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.H_DOKUMEN = db.define('H_DOKUMEN',
    {
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "ID"
        },
        action_date: {
            type: DataTypes.DATE,
            field: 'ACTION_DATE'
        },
        method: {
            type: DataTypes.STRING,
            field: 'METHOD'
        },
        aktor: {
            type: DataTypes.STRING,
            field: 'AKTOR'
        },
        json_data: {
            type: DataTypes.TEXT('long'),
            field: 'JSON_DATA'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.J_HEADER = db.define('J_HEADER',
    {
        header_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            field: 'HEADER_ID',
            autoIncrement: true
        },
        accrual_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'ACCRUAL_TYPE'
        },
        accrual_no: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'ACCRUAL_NO'
        },
        source_table: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'SOURCE_TABLE'
        },
        source_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'SOURCE_ID'
        },
        total_amount: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false,
            field: 'TOTAL_AMOUNT'
        },
        document_date: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'DOCUMENT_DATE'
        },
        posting_date: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'POSTING_DATE'
        },
        fiscal_year: {
            type: DataTypes.STRING(4),
            allowNull: false,
            field: 'FISCAL_YEAR'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT',
            defaultValue: db.literal('SYSTIMESTAMP')
        },
        status: {
            type: DataTypes.STRING(20),
            field: 'STATUS',
            defaultValue: 'OPEN'
        },
        reverse_date: {
            type: DataTypes.DATE,
            field: 'REVERSE_DATE'
        },
        previous_header_id: {
            type: DataTypes.NUMBER,
            field: 'PREVIOUS_HEADER_ID'
        },
        company_code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            field: 'COMPANY_CODE'
        },
        sap_doc_no: {
            type: DataTypes.STRING(50),
            field: 'SAP_DOC_NO'
        },
        payload: {
            type: DataTypes.TEXT, // CLOB
            field: 'PAYLOAD'
        },
        created_by: {
            type: DataTypes.STRING(50),
            field: 'CREATED_BY'
        }
    },
    {
        schema: 'N2N',
        freezeTableName: true,
        timestamps: false
    }
);

exports.J_DETAIL = db.define('J_DETAIL',
    {
        detail_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            field: 'DETAIL_ID',
            autoIncrement: true
        },
        header_id: {
            type: DataTypes.NUMBER,
            allowNull: false,
            field: 'HEADER_ID'
        },
        item_no: {
            type: DataTypes.NUMBER,
            allowNull: false,
            field: 'ITEM_NO'
        },
        gl_account_no: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'GL_ACCOUNT_NO'
        },
        gl_account_name: {
            type: DataTypes.STRING(200),
            field: 'GL_ACCOUNT_NAME'
        },
        assignment_no: {
            type: DataTypes.STRING(50),
            field: 'ASSIGNMENT_NO'
        },
        cost_center: {
            type: DataTypes.STRING(50),
            field: 'COST_CENTER'
        },
        io_number: {
            type: DataTypes.STRING(50),
            field: 'IO_NUMBER'
        },
        profit_center: {
            type: DataTypes.STRING(50),
            field: 'PROFIT_CENTER'
        },
        amount: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false,
            field: 'AMOUNT'
        },
        currency: {
            type: DataTypes.STRING(10),
            field: 'CURRENCY'
        },
        description: {
            type: DataTypes.STRING(400),
            field: 'DESCRIPTION'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        payload: {
            type: DataTypes.TEXT, // CLOB
            field: 'PAYLOAD'
        }
    },
    {
        schema: 'N2N',
        freezeTableName: true,
        timestamps: false
    }
);

exports.H_DOC_REQ = db.define('H_DOC_REQ',
    {
        req_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            field: 'REQ_ID',
            autoIncrement: true
        },
        target_type: {
            type: DataTypes.STRING,
            field: 'TARGET_TYPE'
        },
        target_id: {
            type: DataTypes.NUMBER,
            allowNull: false,
            field: 'TARGET_ID'
        },
        context_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'CONTEXT_CODE'
        },
        message: {
            type: DataTypes.STRING(500),
            field: 'MESSAGE'
        },
        is_active: {
            type: DataTypes.STRING(50),
            field: 'IS_ACTIVE'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        resolved_at: {
            type: DataTypes.DATE,
            field: 'RESOLVED_AT'
        },
        resolved_by: {
            type: DataTypes.STRING,
            field: 'RESOLVED_BY'
        },
    },
    {
        schema: 'N2N',
        freezeTableName: true,
        timestamps: false
    }
);

exports.R_KEUANGAN = db.define('R_KEUANGAN',
    {
        reporting_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "REPORTING_ID"
        },
        sub_reporting_id: {
            type: DataTypes.NUMBER,
            field: "SUB_REPORTING_ID"
        },
        source_table: {
            type: DataTypes.STRING,
            field: 'SOURCE_TABLE'
        },
        source_id: {
            type: DataTypes.STRING,
            field: 'SOURCE_ID'
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        event_code: {
            type: DataTypes.STRING,
            field: 'EVENT_CODE'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'KD_STATUS'
        },
        tgl_event: {
            type: DataTypes.DATE,
            field: 'TGL_EVENT'
        },
        periode: {
            type: DataTypes.STRING,
            field: 'PERIODE'
        },
        nilai_kontrak: {
            type: DataTypes.NUMBER,
            field: 'NILAI_KONTRAK'
        },
        dpp: {
            type: DataTypes.NUMBER,
            field: 'DPP'
        },
        ppn_tarif: {
            type: DataTypes.NUMBER,
            field: 'PPN_TARIF'
        },
        nilai_ppn: {
            type: DataTypes.NUMBER,
            field: 'NILAI_PPN'
        },
        nilai_invoice: {
            type: DataTypes.NUMBER,
            field: 'NILAI_INVOICE'
        },
        nilai_pymad: {
            type: DataTypes.NUMBER,
            field: 'NILAI_PYMAD'
        },
        revenue: {
            type: DataTypes.NUMBER,
            field: 'REVENUE'
        },
        cogs: {
            type: DataTypes.NUMBER,
            field: 'COGS'
        },
        laba: {
            type: DataTypes.NUMBER,
            field: 'LABA'
        },
        margin_percent: {
            type: DataTypes.NUMBER,
            field: 'MARGIN_PERCENT'
        },
        dokumen_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_ID'
        },
        no_dokumen: {
            type: DataTypes.STRING,
            field: 'NO_DOKUMEN'
        },
        jns_dokumen: {
            type: DataTypes.STRING,
            field: 'JNS_DOKUMEN'
        },
        no_ref: {
            type: DataTypes.STRING,
            field: 'NO_REF'
        },
        tgl_dokumen: {
            type: DataTypes.DATE,
            field: 'TGL_DOKUMEN'
        },
        is_condition: {
            type: DataTypes.STRING,
            field: 'IS_CONDITION'
        },
        active_date: {
            type: DataTypes.DATE,
            field: 'ACTIVE_DATE'
        },
        inactive_date: {
            type: DataTypes.DATE,
            field: 'INACTIVE_DATE'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'UPDATED_BY'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_DOKUMEN_APPROVAL = db.define('D_DOKUMEN_APPROVAL',
    {
        dokumen_approval_id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "DOKUMEN_APPROVAL_ID"
        },
        dokumen_id: {
            type: DataTypes.STRING,
            field: 'DOKUMEN_ID'
        },
        jenis_approval: {
            type: DataTypes.STRING,
            field: 'JENIS_APPROVAL'
        },
        no_urut: {
            type: DataTypes.NUMBER,
            field: 'NO_URUT'
        },
        nipp: {
            type: DataTypes.STRING,
            field: 'NIPP'
        },
        kode_jabatan: {
            type: DataTypes.STRING,
            field: 'KODE_JABATAN'
        },
        nama_pegawai: {
            type: DataTypes.STRING,
            field: 'NAMA_PEGAWAI'
        },
        nama_jabatan: {
            type: DataTypes.STRING,
            field: 'NAMA_JABATAN'
        },
        approval: {
            type: DataTypes.STRING,
            field: 'APPROVAL'
        },
        approval_date: {
            type: DataTypes.DATE,
            field: 'APPROVAL_DATE'
        },
        approval_alasan: {
            type: DataTypes.STRING,
            field: 'APPROVAL_ALASAN'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'CREATED_BY'
        },
        cretaed_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        updated_date: {
            type: DataTypes.DATE,
            field: 'UPDATED_DATE'
        },
        err_code: {
            type: DataTypes.NUMBER,
            field: 'ERR_CODE'
        },
        err_message: {
            type: DataTypes.STRING,
            field: 'ERR_MESSAGE'
        },
        error_date: {
            type: DataTypes.DATE,
            field: 'ERROR_DATE'
        },
        solve_date: {
            type: DataTypes.DATE,
            field: 'SOLVE_DATE'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_MATERAI = db.define('M_MATERAI',
    {
        id_materai: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "ID_MATERAI"
        },
        jenis_materai: {
            type: DataTypes.STRING,
            field: 'JENIS_MATERAI'
        },
        stok: {
            type: DataTypes.NUMBER,
            field: 'STOK'
        },
        satuan: {
            type: DataTypes.STRING,
            field: 'SATUAN'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'KETERANGAN'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'CREATED_AT'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'UPDATED_AT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_SAP_PO = db.define('D_SAP_PO',
    {
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "ID"
        },
        project_id: {
            type: DataTypes.STRING,
            field: 'PROJECT_ID'
        },
        nomor_po: {
            type: DataTypes.STRING,
            field: 'NOMOR_PO'
        },
        nomor_pr: {
            type: DataTypes.STRING,
            field: 'NOMOR_PR'
        },
        ekpo_ebelp: {
            type: DataTypes.STRING,
            field: 'EKPO_EBELP'
        },
        desc_item: {
            type: DataTypes.STRING,
            field: 'DESC_ITEM'
        },
        created_date: {
            type: DataTypes.DATE,
            field: 'CREATED_DATE'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'FLAG_AKTIF'
        },
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_SAP_PO_ITEM = db.define('D_SAP_PO_ITEM',
    {
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "ID"
        },
        po_id: {
            type: DataTypes.NUMBER,
            field: 'PO_ID'
        },
        ekpo_ebeln: {
            type: DataTypes.STRING,
            field: 'EKPO_EBELN'
        },
        ekpo_ebelp: {
            type: DataTypes.STRING,
            field: 'EKPO_EBELP'
        },
        ekpo_txz01: {
            type: DataTypes.STRING,
            field: 'EKPO_TXZ01'
        },
        ekpo_matkl: {
            type: DataTypes.STRING,
            field: 'EKPO_MATKL'
        },
        ekpo_werks: {
            type: DataTypes.STRING,
            field: 'EKPO_WERKS'
        },
        ekpo_menge: {
            type: DataTypes.NUMBER,
            field: 'EKPO_MENGE'
        },
        ekpo_meins: {
            type: DataTypes.STRING,
            field: 'EKPO_MEINS'
        },
        ekpo_netpr: {
            type: DataTypes.NUMBER,
            field: 'EKPO_NETPR'
        },
        ekpo_banfn: {
            type: DataTypes.STRING,
            field: 'EKPO_BANFN'
        },
        ekpo_bnfpo: {
            type: DataTypes.STRING,
            field: 'EKPO_BNFPO'
        },
        ekpo_packno: {
            type: DataTypes.STRING,
            field: 'EKPO_PACKNO'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_SAP_PO_SERVICE = db.define('D_SAP_PO_SERVICE',
    {
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            autoIncrement: true,
            field: "ID"
        },
        po_id: {
            type: DataTypes.NUMBER,
            field: 'PO_ID'
        },
        ekpo_ebeln: {
            type: DataTypes.STRING,
            field: 'EKPO_EBELN'
        },
        ekpo_ebelp: {
            type: DataTypes.STRING,
            field: 'EKPO_EBELP'
        },
        ekpo_packno: {
            type: DataTypes.STRING,
            field: 'EKPO_PACKNO'
        },
        esuh_sumlimit: {
            type: DataTypes.NUMBER,
            field: 'ESUH_SUMLIMIT'
        },
        esuh_sumnolim: {
            type: DataTypes.NUMBER,
            field: 'ESUH_SUMNOLIM'
        },
        esuh_commitment: {
            type: DataTypes.NUMBER,
            field: 'ESUH_COMMITMENT'
        }
    }, {
    schema: 'N2N',
    freezeTableName: true,
    timestamps: false
}
)

// YANG DIPAKAI
exports.D_ANGGARAN = db.define('d_anggaran',
    {
        anggaran_id: {
            type: DataTypes.STRING,
            field: 'anggaran_id',
            primaryKey: true,
        },
        cabang_id: {
            type: DataTypes.STRING,
            field: 'cabang_id'
        },
        coa_detail_id: {
            type: DataTypes.STRING,
            field: 'coa_detail_id'
        },
        bulan: {
            type: DataTypes.STRING,
            field: 'bulan'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_NOTIFIKASI = db.define('d_notifikasi',
    {
        notifikasi_id: {
            type: DataTypes.STRING,
            field: 'notifikasi_id',
            primaryKey: true,
        },
        pengajuan_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_id'
        },
        no_pengajuan: {
            type: DataTypes.STRING,
            field: 'no_pengajuan'
        },
        title: {
            type: DataTypes.STRING,
            field: 'title'
        },
        body: {
            type: DataTypes.STRING,
            field: 'body'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_NOTIFIKASI_PUSH = db.define('d_notifikasi_push',
    {
        notifikasi_push_id: {
            type: DataTypes.STRING,
            field: 'notifikasi_push_id',
            primaryKey: true,
        },
        notifikasi_id: {
            type: DataTypes.STRING,
            field: 'notifikasi_id'
        },
        username: {
            type: DataTypes.STRING,
            field: 'username'
        },
        user_id: {
            type: DataTypes.STRING,
            field: 'user_id'
        },
        is_read: {
            type: DataTypes.STRING,
            field: 'is_read'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PENAMBAHAN_ANGGARAN = db.define('d_penambahan_anggaran',
    {
        penambahan_anggaran_id: {
            type: DataTypes.STRING,
            field: 'penambahan_anggaran_id',
            primaryKey: true,
        },
        anggaran_id: {
            type: DataTypes.STRING,
            field: 'anggaran_id'
        },
        besar_budget: {
            type: DataTypes.FLOAT,
            field: 'besar_budget'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        keterangan: {
            type: DataTypes.TEXT,
            field: 'keterangan'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        from_anggaran_id: {
            type: DataTypes.STRING,
            field: 'from_anggaran_id'
        },
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PEMAKAIAN_ANGGARAN = db.define('d_pemakaian_anggaran',
    {
        pemakaian_anggaran_id: {
            type: DataTypes.STRING,
            field: 'pemakaian_anggaran_id',
            primaryKey: true,
        },
        anggaran_id: {
            type: DataTypes.STRING,
            field: 'anggaran_id'
        },
        pengajuan_coa_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_coa_id'
        },
        nominal: {
            type: DataTypes.FLOAT,
            field: 'nominal'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        keterangan: {
            type: DataTypes.TEXT,
            field: 'keterangan'
        },
        to_anggaran_id: {
            type: DataTypes.STRING,
            field: 'to_anggaran_id'
        },

    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PENGAJUAN = db.define('d_pengajuan',
    {
        pengajuan_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_id',
            primaryKey: true,
        },
        no_pengajuan: {
            type: DataTypes.STRING,
            field: 'no_pengajuan'
        },
        pemohon_id: {
            type: DataTypes.STRING,
            field: 'pemohon_id'
        },
        role_pemohon_id: {
            type: DataTypes.STRING,
            field: 'role_pemohon_id'
        },
        jenis_biaya_id: {
            type: DataTypes.STRING,
            field: 'jenis_biaya_id'
        },
        tipe_ppn: {
            type: DataTypes.STRING,
            field: 'tipe_ppn'
        },
        nominal_dpp: {
            type: DataTypes.FLOAT,
            field: 'nominal_dpp'
        },
        ppn: {
            type: DataTypes.FLOAT,
            field: 'ppn'
        },
        nominal_ppn: {
            type: DataTypes.FLOAT,
            field: 'nominal_ppn'
        },
        pph: {
            type: DataTypes.FLOAT,
            field: 'pph'
        },
        nominal_pph: {
            type: DataTypes.FLOAT,
            field: 'nominal_pph'
        },
        total_dibayarkan: {
            type: DataTypes.FLOAT,
            field: 'total_dibayarkan'
        },
        vendor_id: {
            type: DataTypes.STRING,
            field: 'vendor_id'
        },
        no_kasbon_sap: {
            type: DataTypes.STRING,
            field: 'no_kasbon_sap'
        },
        no_voucher_payment: {
            type: DataTypes.STRING,
            field: 'no_voucher_payment'
        },
        no_invoice: {
            type: DataTypes.STRING,
            field: 'no_invoice'
        },
        status_pkp: {
            type: DataTypes.STRING,
            field: 'status_pkp'
        },
        no_faktur_pajak: {
            type: DataTypes.STRING,
            field: 'no_faktur_pajak'
        },
        no_memo: {
            type: DataTypes.STRING,
            field: 'no_memo'
        },
        no_voucher_sap: {
            type: DataTypes.STRING,
            field: 'no_voucher_sap'
        },
        tgl_pembayaran: {
            type: DataTypes.DATE,
            field: 'tgl_pembayaran'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'flag_aktif'
        },
        parent_id: {
            type: DataTypes.STRING,
            field: 'parent_id'
        },
        keterangan: {
            type: DataTypes.TEXT,
            field: 'keterangan'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        },
        role_pembuat_id: {
            type: DataTypes.STRING,
            field: 'role_pembuat_id'
        },
        jenis_pajak_id: {
            type: DataTypes.STRING,
            field: 'jenis_pajak_id'
        },
        pembetulan_ke: {
            type: DataTypes.FLOAT,
            field: 'pembetulan_ke'
        },
        bruto: {
            type: DataTypes.FLOAT,
            field: 'bruto'
        },
        metode_pengisian_ppn: {
            type: DataTypes.STRING,
            field: 'metode_pengisian_ppn'
        },
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PENGAJUAN_COA = db.define('d_pengajuan_coa',
    {
        pengajuan_coa_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_coa_id',
            primaryKey: true,
        },
        pengajuan_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_id'
        },
        coa_id: {
            type: DataTypes.STRING,
            field: 'coa_id'
        },
        coa_detail_id: {
            type: DataTypes.STRING,
            field: 'coa_detail_id'
        },
        nominal: {
            type: DataTypes.FLOAT,
            field: 'nominal'
        },
        flag_delete: {
            type: DataTypes.STRING,
            field: 'flag_delete'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PENGAJUAN_DOKUMEN = db.define('d_pengajuan_dokumen',
    {
        dokumen_id: {
            type: DataTypes.STRING,
            field: 'dokumen_id',
            primaryKey: true,
        },
        pengajuan_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_id'
        },
        nama_dokumen: {
            type: DataTypes.STRING,
            field: 'nama_dokumen'
        },
        url_file: {
            type: DataTypes.TEXT,
            field: 'url_file'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_PENJUALAN = db.define(
    'd_penjualan',
    {
        penjualan_id: {
            type: DataTypes.UUID,
            field: 'penjualan_id',
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        sales_office: {
            type: DataTypes.STRING,
            field: 'sales_office'
        },

        desc_s_office: {
            type: DataTypes.STRING,
            field: 'desc_s_office'
        },

        posting_date: {
            type: DataTypes.DATEONLY,
            field: 'posting_date'
        },

        billing_no: {
            type: DataTypes.STRING,
            field: 'billing_no'
        },

        posting_status: {
            type: DataTypes.STRING,
            field: 'posting_status'
        },

        bill_cancel: {
            type: DataTypes.STRING,
            field: 'bill_cancel'
        },

        bill_to_party: {
            type: DataTypes.STRING,
            field: 'bill_to_party'
        },

        name_bill_to: {
            type: DataTypes.STRING,
            field: 'name_bill_to'
        },

        address: {
            type: DataTypes.STRING,
            field: 'address'
        },

        material: {
            type: DataTypes.STRING,
            field: 'material'
        },

        material_group_1: {
            type: DataTypes.STRING,
            field: 'material_group_1'
        },

        desc_material_group_1: {
            type: DataTypes.STRING,
            field: 'desc_material_group_1'
        },

        text_material: {
            type: DataTypes.STRING,
            field: 'text_material'
        },

        quantity: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'quantity'
        },

        sales_unit: {
            type: DataTypes.STRING,
            field: 'sales_unit'
        },

        unit_price_penjualan: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'unit_price_penjualan'
        },

        dis_pct_zd01: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd01'
        },

        dis_amt_zd01: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd01'
        },

        dis_pct_zd02: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd02'
        },

        dis_amt_zd02: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd02'
        },

        dis_pct_zd03: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd03'
        },

        dis_amt_zd03: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd03'
        },

        dis_pct_zd04: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd04'
        },

        dis_amt_zd04: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd04'
        },

        dis_pct_zd05: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd05'
        },

        dis_amt_zd05: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd05'
        },

        dis_pct_zd06: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd06'
        },

        dis_amt_zd06: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd06'
        },

        disc_upfront_pct_zd07: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'disc_upfront_pct_zd07'
        },

        disc_upfront_amt_zd07: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'disc_upfront_amt_zd07'
        },

        disc_beban_kftd_upf_pct_zd08: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'disc_beban_kftd_upf_pct_zd08'
        },

        disc_beban_kftd_upf_amt_zd08: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'disc_beban_kftd_upf_amt_zd08'
        },

        disc_beban_principle_upf_pct_zd09: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'disc_beban_principle_upf_pct_zd09'
        },

        disc_beban_principle_upf_amt_zd09: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'disc_beban_principle_upf_amt_zd09'
        },

        disc_pengembalian_upf_pct_zd10: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'disc_pengembalian_upf_pct_zd10'
        },

        disc_pengembalian_upf_amt_zd10: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'disc_pengembalian_upf_amt_zd10'
        },

        dis_pct_zd12: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd12'
        },

        dis_amt_zd12: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd12'
        },

        dis_pct_zd14: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd14'
        },

        dis_amt_zd14: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd14'
        },

        dis_pct_zd15: {
            type: DataTypes.DECIMAL(10, 2),
            field: 'dis_pct_zd15'
        },

        dis_amt_zd15: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'dis_amt_zd15'
        },

        total_discount: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'total_discount'
        },

        total_penjualan: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'total_penjualan'
        },

        tax_amount: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'tax_amount'
        },

        total_cogs: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'total_cogs'
        },

        unit_price_pembelian: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'unit_price_pembelian'
        },

        bill_qty_in_sku: {
            type: DataTypes.DECIMAL(20, 2),
            field: 'bill_qty_in_sku'
        },

        uom_sku: {
            type: DataTypes.STRING,
            field: 'uom_sku'
        },

        code_pelayanan: {
            type: DataTypes.STRING,
            field: 'code_pelayanan'
        },

        dec_pelayanan: {
            type: DataTypes.STRING,
            field: 'dec_pelayanan'
        },

        prod_hierarchy3: {
            type: DataTypes.STRING,
            field: 'prod_hierarchy3'
        },

        principle: {
            type: DataTypes.STRING,
            field: 'principle'
        },

        name_principle: {
            type: DataTypes.STRING,
            field: 'name_principle'
        },

        desc_cust_grp4: {
            type: DataTypes.STRING,
            field: 'desc_cust_grp4'
        },

        salesman: {
            type: DataTypes.STRING,
            field: 'salesman'
        },

        name_salesman: {
            type: DataTypes.STRING,
            field: 'name_salesman'
        },

        po_number: {
            type: DataTypes.STRING,
            field: 'po_number'
        },

        quotation_number: {
            type: DataTypes.STRING,
            field: 'quotation_number'
        },

        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },

        created_at: {
            type: DataTypes.DATE,
            field: 'created_at',
            defaultValue: DataTypes.NOW
        },

        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },

        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    },
    {
        schema: 'public',
        freezeTableName: true,
        timestamps: false
    }
);

exports.D_STATUS_PENGAJUAN = db.define('d_status_pengajuan',
    {
        status_id: {
            type: DataTypes.STRING,
            field: 'status_id',
            primaryKey: true,
        },
        pengajuan_id: {
            type: DataTypes.STRING,
            field: 'pengajuan_id'
        },
        no_urut: {
            type: DataTypes.INTEGER,
            field: 'no_urut'
        },
        role_id: {
            type: DataTypes.STRING,
            field: 'role_id'
        },
        unit_id: {
            type: DataTypes.STRING,
            field: 'unit_id'
        },
        unit_kerja_id: {
            type: DataTypes.STRING,
            field: 'unit_kerja_id'
        },
        jabatan_id: {
            type: DataTypes.STRING,
            field: 'jabatan_id'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'kd_status'
        },
        date_status: {
            type: DataTypes.DATE,
            field: 'date_status'
        },
        notes: {
            type: DataTypes.TEXT,
            field: 'notes'
        },
        status_verifikasi: {
            type: DataTypes.STRING,
            field: 'status_verifikasi'
        },
        tgl_verifikasi: {
            type: DataTypes.DATE,
            field: 'tgl_verifikasi'
        },
        flag_show: {
            type: DataTypes.STRING,
            field: 'flag_show'
        },
        flag_action: {
            type: DataTypes.STRING,
            field: 'flag_action'
        },
        view_only: {
            type: DataTypes.STRING,
            field: 'view_only'
        },
        jenis_user_id: {
            type: DataTypes.STRING,
            field: 'jenis_user_id'
        },
        approval: {
            type: DataTypes.STRING,
            field: 'approval'
        },
        start_status: {
            type: DataTypes.DATE,
            field: 'start_status'
        },
        end_status: {
            type: DataTypes.DATE,
            field: 'end_status'
        },
        sla: {
            type: DataTypes.FLOAT,
            field: 'sla'
        },
        target_sla: {
            type: DataTypes.FLOAT,
            field: 'target_sla'
        },
        kegiatan: {
            type: DataTypes.STRING,
            field: 'kegiatan'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.D_STATUS_PENGAJUAN_HISTORY = db.define('d_status_pengajuan_history',
    {
        history_id: {
            type: DataTypes.STRING,
            field: 'history_id',
            primaryKey: true,
        },
        status_id: {
            type: DataTypes.STRING,
            field: 'status_id'
        },
        user_id: {
            type: DataTypes.STRING,
            field: 'user_id'
        },
        role_user_id: {
            type: DataTypes.STRING,
            field: 'role_user_id'
        },
        kd_status: {
            type: DataTypes.STRING,
            field: 'kd_status'
        },
        catatan: {
            type: DataTypes.TEXT,
            field: 'catatan'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        qrcode: {
            type: DataTypes.TEXT,
            field: 'qrcode'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_FLOW_APPROVAL = db.define('m_flow_approval',
    {
        flow_id: {
            type: DataTypes.STRING,
            field: 'flow_id',
            primaryKey: true,
        },
        jenis_biaya_id: {
            type: DataTypes.STRING,
            field: 'jenis_biaya_id'
        },
        role_pemohon_id: {
            type: DataTypes.STRING,
            field: 'role_pemohon_id'
        },
        unit_kerja_pemohon_id: {
            type: DataTypes.STRING,
            field: 'unit_kerja_pemohon_id'
        },
        jabatan_pemohon_id: {
            type: DataTypes.STRING,
            field: 'jabatan_pemohon_id'
        },
        no_urut: {
            type: DataTypes.INTEGER,
            field: 'no_urut'
        },
        role_id: {
            type: DataTypes.STRING,
            field: 'role_id'
        },
        unit_kerja_id: {
            type: DataTypes.STRING,
            field: 'unit_kerja_id'
        },
        jabatan_id: {
            type: DataTypes.STRING,
            field: 'jabatan_id'
        },
        jenis_user_id: {
            type: DataTypes.STRING,
            field: 'jenis_user_id'
        },
        kegiatan: {
            type: DataTypes.STRING,
            field: 'kegiatan'
        },
        view_only: {
            type: DataTypes.STRING,
            field: 'view_only'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'flag_aktif'
        },
        target_sla: {
            type: DataTypes.INTEGER,
            field: 'target_sla'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_FLOW_KHUSUS = db.define('m_flow_khusus',
    {
        flow_id: {
            type: DataTypes.STRING,
            field: 'flow_id',
            primaryKey: true,
        },
        jenis_biaya_id: {
            type: DataTypes.STRING,
            field: 'jenis_biaya_id'
        },
        unit_kerja_id: {
            type: DataTypes.STRING,
            field: 'unit_kerja_id'
        },
        jabatan_pemohon: {
            type: DataTypes.STRING,
            field: 'jabatan_pemohon'
        },
        atasan_pemohon: {
            type: DataTypes.STRING,
            field: 'atasan_pemohon'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_REFERENSI = db.define('m_referensi',
    {
        ref_id: {
            type: DataTypes.INTEGER,
            field: 'ref_id',
            autoIncrement: true,
            primaryKey: true
        },
        kd_ref: {
            type: DataTypes.STRING,
            field: 'kd_ref',
        },
        ur_ref: {
            type: DataTypes.STRING,
            field: 'ur_ref'
        },
        jns_ref: {
            type: DataTypes.STRING,
            field: 'jns_ref'
        },
        ur_jns_ref: {
            type: DataTypes.STRING,
            field: 'ur_jns_ref'
        },
        sub_kd_ref: {
            type: DataTypes.STRING,
            field: 'sub_kd_ref'
        },
        sub_jns_ref: {
            type: DataTypes.INTEGER,
            field: 'sub_jns_ref'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'flag_aktif'
        },
        flag_show: {
            type: DataTypes.STRING,
            field: 'flag_show'
        },
        keterangan: {
            type: DataTypes.STRING,
            field: 'keterangan'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_JENIS_PAJAK = db.define('m_jenis_pajak',
    {
        jenis_pajak_id: {
            type: DataTypes.STRING,
            field: 'jenis_pajak_id',
            primaryKey: true,
        },
        jenis_jasa: {
            type: DataTypes.STRING,
            field: 'jenis_jasa'
        },
        kode_objek: {
            type: DataTypes.STRING,
            field: 'kode_objek'
        },
        jenis_pph_id: {
            type: DataTypes.STRING,
            field: 'jenis_pph_id'
        },
        persen_tarif: {
            type: DataTypes.FLOAT,
            field: 'persen_tarif'
        },
        tarif: {
            type: DataTypes.FLOAT,
            field: 'persen_tarif'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_PENANDATANGAN = db.define('m_penandatangan',
    {
        penandatangan_id: {
            type: DataTypes.STRING,
            field: 'penandatangan_id',
            primaryKey: true,
        },
        jenis_biaya_id: {
            type: DataTypes.STRING,
            field: 'jenis_biaya_id'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_PENANDATANGAN_DETAIL = db.define('m_penandatangan_detail',
    {
        penandatangan_detail_id: {
            type: DataTypes.STRING,
            field: 'penandatangan_detail_id',
            primaryKey: true,
        },
        penandatangan_id: {
            type: DataTypes.STRING,
            field: 'penandatangan_id'
        },
        tipe_penandatangan: {
            type: DataTypes.STRING,
            field: 'tipe_penandatangan'
        },
        no_urut: {
            type: DataTypes.INTEGER,
            field: 'no_urut'
        },
        nik: {
            type: DataTypes.STRING,
            field: 'nik'
        },
        nama: {
            type: DataTypes.STRING,
            field: 'nama'
        },
        jabatan: {
            type: DataTypes.STRING,
            field: 'jabatan'
        },
        qrcode: {
            type: DataTypes.TEXT,
            field: 'qrcode'
        },
        flag_delete: {
            type: DataTypes.STRING,
            field: 'flag_delete'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_ROLE_USER = db.define('m_role_user',
    {
        role_user_id: {
            type: DataTypes.STRING,
            field: 'role_user_id',
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.STRING,
            field: 'user_id'
        },
        jabatan_id: {
            type: DataTypes.STRING,
            field: 'jabatan_id'
        },
        cabang_id: {
            type: DataTypes.STRING,
            field: 'cabang_id'
        },
        role_id: {
            type: DataTypes.STRING,
            field: 'role_id'
        },
        is_aktif: {
            type: DataTypes.STRING,
            field: 'is_aktif'
        },
        tgl_aktif_bekerja: {
            type: DataTypes.DATE,
            field: 'tgl_aktif_bekerja'
        },
        unit_id: {
            type: DataTypes.STRING,
            field: 'unit_id'
        },
        unit_kerja_id: {
            type: DataTypes.STRING,
            field: 'unit_kerja_id'
        },
        jenis_user_id: {
            type: DataTypes.STRING,
            field: 'jenis_user_id'
        },
        role_atasan_id: {
            type: DataTypes.STRING,
            field: 'role_atasan_id'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_USER = db.define('m_user',
    {
        user_id: {
            type: DataTypes.STRING,
            field: 'user_id',
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            field: 'username'
        },
        password: {
            type: DataTypes.STRING,
            field: 'password'
        },
        nip: {
            type: DataTypes.STRING,
            field: 'nip'
        },
        nama: {
            type: DataTypes.STRING,
            field: 'nama'
        },
        tgl_lahir: {
            type: DataTypes.DATE,
            field: 'tgl_lahir'
        },
        email: {
            type: DataTypes.STRING,
            field: 'email'
        },
        tipe_user: {
            type: DataTypes.STRING,
            field: 'tipe_user'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'flag_aktif'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_VENDOR = db.define('m_vendor',
    {
        vendor_id: {
            type: DataTypes.STRING,
            field: 'vendor_id',
            primaryKey: true,
        },
        nama_vendor: {
            type: DataTypes.STRING,
            field: 'nama_vendor'
        },
        npwp_vendor: {
            type: DataTypes.STRING,
            field: 'npwp_vendor'
        },
        no_rekening: {
            type: DataTypes.STRING,
            field: 'no_rekening'
        },
        alamat_vendor: {
            type: DataTypes.TEXT,
            field: 'alamat_vendor'
        },
        flag_aktif: {
            type: DataTypes.STRING,
            field: 'flag_aktif'
        },
        created_by: {
            type: DataTypes.STRING,
            field: 'created_by'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updated_by: {
            type: DataTypes.STRING,
            field: 'updated_by'
        },
        updated_at: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_COA = db.define('m_coa',
    {
        vendor_id: {
            type: DataTypes.STRING,
            field: 'coa_id',
            primaryKey: true,
        },
        coa_header: {
            type: DataTypes.STRING,
            field: 'header_coa'
        }
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_COA_DETAIL = db.define('m_coa_detail',
    {
        coa_detail_id: {
            type: DataTypes.STRING,
            field: 'coa_detail_id',
            primaryKey: true,
        },
        coa_id: {
            type: DataTypes.STRING,
            field: 'coa_id'
        },
        detail_coa: {
            type: DataTypes.STRING,
            field: 'detail_coa'
        },
        gl_account: {
            type: DataTypes.STRING,
            field: 'gl_account'
        },
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_DIREKTUR_UNIT = db.define('m_direktur_unit',
    {
        m_id: {
            type: DataTypes.NUMBER,
            field: 'm_id',
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.STRING,
            field: 'user_id'
        },
        unit_id: {
            type: DataTypes.STRING,
            field: 'unit_id'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
)

exports.M_HARI_LIBUR = db.define('m_hari_libur',
    {
        m_h_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "m_h_id"
        },
        tanggal: {
            type: DataTypes.DATE,
            field: 'tanggal'
        },
        deskripsi: {
            type: DataTypes.STRING,
            field: 'deskripsi'
        },
        created_at: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
);

exports.H_UPLOAD_DATA = db.define('h_upload_data',
    {
        h_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "h_id"
        },
        upload_by: {
            type: DataTypes.STRING,
            field: 'upload_by'
        },
        upload_at: {
            type: DataTypes.DATE,
            field: 'upload_at'
        },
        table_name: {
            type: DataTypes.STRING,
            field: 'table_name'
        },
        action: {
            type: DataTypes.STRING,
            field: 'action'
        },
    }, {
    schema: 'public',
    freezeTableName: true,
    timestamps: false
}
);