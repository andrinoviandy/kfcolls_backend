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

// exports.insertPenjualanArray = async (req, res) => {
//     let transaction
//     try {
//         transaction = await db.transaction()
//         const payload = req.body
//         const { nip, nama } = req.user
//         const data = payload.map(item => ({
//             ...item,
//             penjualan_id: uuidv4(),
//             created_by: nama
//         }));
//         const result = await serviceMain.insertPenjualanArray(data, transaction)
//         await transaction.commit()
//         res.status(statusCode.success).json(successMessage(result))

//     } catch (error) {
//         console.log(error, "Error Insert Anggaran Baru")
//         if (transaction && !transaction.finished) {
//             await transaction.rollback();
//         }
//         res.status(statusCode.bad).json(errorMessage({}, error.message))
//     }
// }
exports.insertPenjualanArray = async (req, res) => {
    let transaction;

    try {
        const payload = req.body;
        const { nama } = req.user || {};

        // Validasi payload
        if (!Array.isArray(payload)) {
            return res.status(statusCode.bad).json(
                errorMessage({}, "Payload harus berupa array data penjualan.")
            );
        }

        if (payload.length === 0) {
            return res.status(statusCode.bad).json(
                errorMessage({}, "Data penjualan tidak boleh kosong.")
            );
        }

        // Maksimal 1.000 data per request
        if (payload.length > 1000) {
            return res.status(statusCode.bad).json(
                errorMessage(
                    {},
                    "Maksimal 1.000 data penjualan per request."
                )
            );
        }

        console.log(
            `[INSERT PENJUALAN] Mulai memproses ${payload.length} data`
        );

        const startTime = Date.now();

        transaction = await db.transaction();

        // Generate ID dan informasi pembuat untuk setiap data
        const data = payload.map((item) => ({
            ...item,
            penjualan_id: uuidv4(),
            created_by: nama || item?.created_by || null,
        }));

        const result = await serviceMain.insertPenjualanArray(
            data,
            transaction
        );

        await transaction.commit();

        console.log("[INSERT PENJUALAN] Selesai", {
            total_data: result.total_data,
            total_success: result.total_success,
            total_error: result.total_error,
            duration_ms: Date.now() - startTime,
        });

        return res.status(statusCode.success).json(
            successMessage(result)
        );

    } catch (error) {
        if (transaction && !transaction.finished) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "[INSERT PENJUALAN] Gagal rollback:",
                    rollbackError
                );
            }
        }

        console.error("[INSERT PENJUALAN] ERROR:", {
            message: error.message,
            name: error.name,
            detail: error.parent?.detail,
            code: error.parent?.code,
        });

        return res.status(statusCode.bad).json(
            errorMessage(
                {
                    total_data: Array.isArray(req.body)
                        ? req.body.length
                        : 0,
                    total_success: 0,
                    total_error: Array.isArray(req.body)
                        ? req.body.length
                        : 0,
                    data_error: [
                        {
                            message: error.message,
                            detail: error.parent?.detail || null,
                            code: error.parent?.code || null,
                        },
                    ],
                },
                error.message || "Gagal menyimpan data penjualan."
            )
        );
    }
};

exports.uploadPenjualanExcel = async (req, res) => {
    let transaction;
    const startTime = Date.now();
    console.log(`[UPLOAD PENJUALAN] Mulai: ${new Date().toISOString()}`);
    try {
        const file = Array.isArray(req?.files?.file)
            ? req.files.file[0]
            : req?.files?.file;
        if (!file) {
            return res.status(statusCode.bad).json(
                errorMessage('File Excel wajib diunggah.')
            );
        }
        console.log('[UPLOAD PENJUALAN] File:', {
            name: file.name,
            sizeMB: (file.size / (1024 * 1024)).toFixed(2)
        });
        transaction = await db.transaction();
        console.log('[UPLOAD PENJUALAN] Transaksi database dibuat');
        const result = await serviceMain.uploadPenjualanExcel(
            file,
            req?.user?.nama,
            transaction
        );
        console.log('[UPLOAD PENJUALAN] Service selesai:', {
            durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2),
            total: result.total,
            success: result.success,
            failed: result.failed,
            totalPiutang: result.total_piutang
        });
        await transaction.commit();
        console.log('[UPLOAD PENJUALAN] Commit berhasil');
        return res.status(statusCode.success).json(successMessage(result));
    } catch (error) {
        if (transaction && !transaction.finished) {
            try {
                await transaction.rollback();
                console.log('[UPLOAD PENJUALAN] Rollback berhasil');
            } catch (rollbackError) {
                console.error('[UPLOAD PENJUALAN] Rollback gagal:', rollbackError);
            }
        }
        console.error('[UPLOAD PENJUALAN] Gagal:', {
            durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2),
            message: error.message,
            stack: error.stack
        });
        return res.status(statusCode.bad).json(errorMessage(error.message));
    }
};

exports.getDataPenjualan = async (req, res) => {
    try {
        const params = { ...req.query }

        console.log(params, 'paramss');

        const result = await serviceMain.getDataPenjualan(params)

        res.status(statusCode.success).json(
            successMessage(result)
        )
    } catch (error) {
        console.log(
            error,
            "ERROR GET DATA PENJUALAN <<<<<<<<<"
        )

        res.status(statusCode.error).json(
            errorMessage(error)
        )
    }
}

exports.getDataPiutang = async (req, res) => {
    try {
        const params = {
            ...req.query
        }

        console.log(
            params,
            'params getDataPiutang'
        )

        const result =
            await serviceMain.getDataPiutang(
                params
            )

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        )

    } catch (error) {
        console.log(
            error,
            "ERROR GET DATA PIUTANG <<<<<<<<<"
        )

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        )
    }
}

exports.getDataReportSales = async (req, res) => {
    try {
        const params = {
            ...req.query
        }

        console.log(
            params,
            'params getDataReportSales'
        )

        const result =
            await serviceMain.getDataReportSales(
                params
            )

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        )

    } catch (error) {
        console.log(
            error,
            "ERROR GET DATA REPORT SALES <<<<<<<<<"
        )

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        )
    }
}

exports.getListPrinciple = async (req, res) => {
    try {
        const params = { ...req.query }

        const result = await serviceMain.getListPrinciple(params)

        res.status(statusCode.success).json(
            successMessage(result)
        )
    } catch (error) {
        console.log(
            error,
            "ERROR GET LIST PRINCIPLE <<<<<<<<<"
        )

        res.status(statusCode.error).json(
            errorMessage(error)
        )
    }
}

exports.getDataPelanggan = async (
    req,
    res
) => {
    try {
        const params = {
            ...req.query
        }

        const result =
            await serviceMain.getDataPelanggan(
                params
            )

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        )

    } catch (error) {
        console.log(
            error,
            "ERROR GET DATA PELANGGAN <<<<<<<<<"
        )

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        )
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

exports.insertUser = async (req, res) => {
    let transaction;
    try {
        transaction = await db.transaction();
        const { nip, nama } = req?.user || {};
        const payload = {
            ...req.body,
            user_id: uuidv4(),
            role_user_id: uuidv4(),
            created_by: `${nip} - ${nama}`
        };
        const result = await serviceMain.insertUser(payload, transaction);
        await transaction.commit();
        res.status(statusCode.success).json(successMessage(result));
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.log(error, "ERROR INSERT USER <<<<<<<<<");
        res.status(statusCode.bad).json(errorMessage(error.message));
    }
};

exports.updateUser = async (req, res) => {
    let transaction;
    try {
        transaction = await db.transaction();
        const { nip, nama } = req?.user || {};
        const result = await serviceMain.updateUser({
            ...req.body,
            updated_by: `${nip} - ${nama}`
        }, transaction);
        await transaction.commit();
        res.status(statusCode.success).json(successMessage(result));
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.log(error, "ERROR UPDATE USER <<<<<<<<<");
        res.status(statusCode.bad).json(errorMessage(error.message));
    }
};

exports.deleteUser = async (req, res) => {
    let transaction;
    try {
        transaction = await db.transaction();
        const result = await serviceMain.deleteUser(req?.params?.user_id, transaction);
        await transaction.commit();
        res.status(statusCode.success).json(successMessage(result));
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.log(error, "ERROR DELETE USER <<<<<<<<<");
        res.status(statusCode.bad).json(errorMessage(error.message));
    }
};

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

exports.getListDataCod = async (req, res) => {
    try {
        const result = await serviceMain.getListDataCod(req?.query)
        res.status(statusCode.success).json(successMessage(result?.data))
    } catch (error) {
        console.log(error, "ERROR LIST DATA COD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.insertDataCod = async (req, res) => {
    try {
        const result = await serviceMain.insertDataCod({
            ...req.body,
            created_by: req?.user?.nama
        })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR INSERT DATA COD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.editDataCod = async (req, res) => {
    try {
        const result = await serviceMain.editDataCod({
            ...req.body,
            updated_by: req?.user?.nama
        })
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR EDIT DATA COD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.deleteDataCod = async (req, res) => {
    try {
        const result = await serviceMain.deleteDataCod(req?.params?.cod_id)
        res.status(statusCode.success).json(successMessage(result))
    } catch (error) {
        console.log(error, "ERROR DELETE DATA COD <<<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

exports.getDataPiutang = async (req, res) => {
    try {
        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataPiutang'
        );

        const result =
            await serviceMain.getDataPiutang(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DATA PIUTANG <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};


exports.getDataFakturPetugas = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataFakturPetugas'
        );

        const result =
            await serviceMain.getDataFakturPetugas(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DATA FAKTUR PETUGAS <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};


exports.insertFakturPetugas = async (req, res) => {
    let transaction
    try {
        transaction = await db.transaction()

        const payload = {
            ...req.body
        };

        console.log(
            payload,
            'payload insertFakturPetugas'
        );

        const result =
            await serviceMain.insertFakturPetugas(
                payload
            );
        await transaction.commit()

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR INSERT FAKTUR PETUGAS <<<<<<<<<'
        );
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        res.status(
            statusCode.error
        ).json(
            errorMessage({}, error?.message)
        );
    }
};


exports.updateFakturPetugas = async (req, res) => {
    try {

        const payload = {
            ...req.body
        };

        console.log(
            payload,
            'payload updateFakturPetugas'
        );

        const result =
            await serviceMain.updateFakturPetugas(
                payload
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR UPDATE FAKTUR PETUGAS <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDataTukarFaktur = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataTukarFaktur'
        );

        const result =
            await serviceMain.getDataTukarFaktur(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DATA TUKAR FAKTUR <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDataVerifikasiTukarFaktur = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataVerifikasiTukarFaktur'
        );

        const result =
            await serviceMain.getDataVerifikasiTukarFaktur(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DATA VERIFIKASI TUKAR FAKTUR <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDataVerifikasiPembayaran = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataVerifikasiPembayaran'
        );

        const result =
            await serviceMain.getDataVerifikasiPembayaran(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DATA VERIFIKASI PEMBAYARAN <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDataBayarFaktur = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataBayarFaktur'
        );

        const result =
            await serviceMain.getDataBayarFaktur(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DATA BAYAR FAKTUR <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.insertTukarFaktur = async (req, res) => {
    let transaction;

    try {
        transaction = await db.transaction();

        const payload = JSON.parse(req.body.payload || '{}');
        const { nip, nama, role_user_id } = req.user;

        const files = req?.files?.lampiran
            ? (Array.isArray(req.files.lampiran)
                ? req.files.lampiran
                : [req.files.lampiran])
            : [];

        Object.assign(payload, {
            created_by: `${nip} - ${nama}`,
            role_pembuat_id: role_user_id,
            dataUser: req.user
        });

        const result = await serviceMain.insertTukarFaktur(
            payload,
            files,
            transaction
        );

        await transaction.commit();

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR INSERT TUKAR FAKTUR <<<<<<<<<'
        );

        if (
            transaction &&
            !transaction.finished
        ) {
            await transaction.rollback();
        }

        res.status(
            statusCode.error
        ).json(
            errorMessage(
                {},
                error?.message
            )
        );
    }
};

exports.insertBayarFaktur = async (req, res) => {
    let transaction;

    try {
        transaction = await db.transaction();

        const payload = JSON.parse(
            req.body.payload || '{}'
        );

        const {
            nip,
            nama,
            role_user_id
        } = req.user;

        const files = req?.files?.lampiran
            ? (
                Array.isArray(req.files.lampiran)
                    ? req.files.lampiran
                    : [req.files.lampiran]
            )
            : [];

        Object.assign(
            payload,
            {
                created_by: `${nip} - ${nama}`,
                role_pembuat_id: role_user_id,
                dataUser: req.user
            }
        );

        const result =
            await serviceMain.insertBayarFaktur(
                payload,
                files,
                transaction
            );

        await transaction.commit();

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR INSERT BAYAR FAKTUR'
        );

        if (
            transaction &&
            !transaction.finished
        ) {
            await transaction.rollback();
        }

        res.status(
            statusCode.error
        ).json(
            errorMessage(
                {},
                error?.message
            )
        );
    }
};

exports.verifikasiTukarFaktur = async (req, res) => {
    let transaction;

    try {
        transaction = await db.transaction();

        const payload = req.body || {};
        const { nip, nama, role_user_id } = req.user;

        Object.assign(payload, {
            created_by: `${nip} - ${nama}`,
            role_pembuat_id: role_user_id,
            dataUser: req.user
        });

        const result = await serviceMain.verifikasiTukarFaktur(
            payload,
            transaction
        );

        await transaction.commit();

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR VERIFIKASI TUKAR FAKTUR <<<<<<<<<'
        );

        if (
            transaction &&
            !transaction.finished
        ) {
            await transaction.rollback();
        }

        res.status(
            statusCode.error
        ).json(
            errorMessage(
                {},
                error?.message
            )
        );
    }
};

exports.verifikasiBayarFaktur = async (req, res) => {
    let transaction;

    try {
        transaction = await db.transaction();

        const payload = req.body || {};
        const { nip, nama, role_user_id } = req.user;

        Object.assign(payload, {
            created_by: `${nip} - ${nama}`,
            role_pembuat_id: role_user_id,
            dataUser: req.user
        });

        const result = await serviceMain.verifikasiBayarFaktur(
            payload,
            transaction
        );

        await transaction.commit();

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR VERIFIKASI BAYAR FAKTUR <<<<<<<<<'
        );

        if (
            transaction &&
            !transaction.finished
        ) {
            await transaction.rollback();
        }

        res.status(
            statusCode.error
        ).json(
            errorMessage(
                {},
                error?.message
            )
        );
    }
};

exports.getMonitoringPenugasan = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getMonitoringPenugasan'
        );

        const result =
            await serviceMain.getMonitoringPenugasan(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET MONITORING PENUGASAN <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDetailPenjualan = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDetailPenjualan'
        );

        const result =
            await serviceMain.getDetailPenjualan(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DETAIL PENJUALAN <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDetailPencairan = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDetailPencairan'
        );

        const result =
            await serviceMain.getDetailPencairan(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET DETAIL PENCAIRAN <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};

exports.getDataKonfirmasiPiutang = async (req, res) => {
    try {

        const params = {
            ...req.query
        };

        console.log(
            params,
            'params getDataKonfirmasiPiutang'
        );

        const result =
            await serviceMain.getDataKonfirmasiPiutang(
                params
            );

        res.status(
            statusCode.success
        ).json(
            successMessage(result)
        );

    } catch (error) {

        console.log(
            error,
            'ERROR GET MONITORING PENUGASAN <<<<<<<<<'
        );

        res.status(
            statusCode.error
        ).json(
            errorMessage(error)
        );
    }
};