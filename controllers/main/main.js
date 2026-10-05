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

exports.uploadPenjualanExcel = async (req, res) => {
    let transaction;
    try {
        const file = Array.isArray(req?.files?.file)
            ? req.files.file[0]
            : req?.files?.file;
        if (!file) {
            return res.status(statusCode.bad).json(errorMessage('File Excel wajib diunggah.'));
        }

        transaction = await db.transaction();
        const result = await serviceMain.uploadPenjualanExcel(
            file,
            req?.user?.nama,
            transaction
        );
        await transaction.commit();
        res.status(statusCode.success).json(successMessage(result));
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('ERROR UPLOAD PENJUALAN EXCEL:', error);
        res.status(statusCode.bad).json(errorMessage(error.message));
    }
}

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