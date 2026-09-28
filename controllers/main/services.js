const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const stripHexPrefix = require('strip-hex-prefix')
const moment = require('moment')
const path = require('path')
const db = require('../../config/database/database')
const model = require('../../config/model')
const query = require('./raw_query')
const helpers = require('../../helpers/global_helpers')
const sequelize = require('../../config/database/database');
const chmodr = require('chmodr');
const axios = require('axios');
const { log, error } = require('console');
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");
const FormData = require("form-data");
const { randomBytes } = require('crypto');
const { autoCommit } = require('oracledb');
const { A_LOP_DETAIL } = require('../../config/model/costrack/costrack');
const ExcelJS = require('exceljs');
const fsPromises = require('fs/promises');
const { Op, fn, col, where, Sequelize } = require("sequelize");
const { PDFDocument } = require('pdf-lib');
const { title } = require('process');
// const LINK_QRCODE = process.env.URL_QRCODE
const LINK_QRCODE = 'https://costrack.kftd.co.id/validasi-approval'

exports.insertNotifikasi = async (payload, transaction) => {
    const insertNotif = await model.d_notifikasi.create(payload, { transaction })
    if (payload?.user && payload?.user?.length > 0) {
        for (const item of payload?.user) {
            const payPush = {
                notifikasi_push_id: uuidv4(),
                notifikasi_id: payload?.notifikasi_id,
                user_id: item
            }
            const insertNotifPush = await model.d_notifikasi_push.create(payPush, { transaction })
        }
    }

    return insertNotif
}

exports.insertNotifikasiPush = async (payload, transaction) => {
    if (payload?.user && payload?.user?.length > 0) {
        for (const item of payload?.user) {
            const payPush = {
                notifikasi_push_id: uuidv4(),
                notifikasi_id: payload?.notifikasi_id,
                user_id: item
            }
            const insertNotifPush = await model.d_notifikasi_push.create(payPush, { transaction })
        }
    }
}

exports.getReferensiByJenis = async (jns_ref, keyword, cabang_id, role_id) => {
    let condition = ``;
    // if (jns_ref === 'jenis_biaya_id' || jns_ref === 'jabatan_id') {
    //     if (cabang_id === '2000') {
    //         if (role_id !== 'RL00') {
    //             condition = ` AND a.sub_kd_ref = 'KP' `
    //         }
    //     } else {
    //         if (role_id !== 'RL00') {
    //             condition = ` AND a.sub_kd_ref = 'KC' `
    //         }
    //     }
    // }
    if (jns_ref === 'role_id') {
        if (cabang_id !== '2000') {
            if (role_id !== 'RL00') {
                condition = ` AND a.sub_kd_ref = 'KC' `
            }
        } else {
            condition = ``
        }
    }
    const QUERY = query.getReferensiByJenis
        .replace(/:condition/g, condition)

    const bind = {
        jns_ref: jns_ref,
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`
    }

    const result = await db.query(QUERY, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    return result
}

exports.getSubReferensiByJenis = async ({ jns_ref, kd_ref, keyword }) => {
    let condition = ``
    if (kd_ref) {
        condition += ` AND a.sub_kd_ref = '${kd_ref}' `
    }
    const QUERY = query.getSubReferensiByJenis
        .replace(/:condition/g, condition)
    const result = await db.query(QUERY, {
        replacements: { jns_ref, condition, keyword: `%${keyword}%` },
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    return result
}

exports.getReferensiByJenisGroup = async (keyword) => {
    let condition = ``;
    const QUERY = query.getReferensiByJenisGroup
    const bind = {
        keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`
    }

    const result = await db.query(QUERY, {
        replacements: bind,
        type: db.QueryTypes.SELECT
    })

    return result
}

// exports.uploadFile = async (lampiran, path_upload, file_name) => {
//     //concat dir and name upload
//     let full_path = path_upload + file_name;

//     // Check Directory
//     if (!fs.existsSync(path_upload)) {
//         // Move file upload
//         await fs.promises.mkdir(path_upload, { recursive: true }, (err) => {
//             if (err) console.error(err);
//         });

//         // Give privilege path folder
//         // fs.chmod(path_upload, 0o777, (err) => {
//         // 	if (err) console.log(err);
//         // });

//         //do upload file
//         lampiran.mv(full_path, (err) => {
//             if (err) console.error(err);
//         });
//     } else {
//         //check file in path exist or not
//         if (!fs.existsSync(full_path)) {
//             // Give privilege folder
//             // chmodr(path_upload, 0o777, (err) => {
//             // 	if (err) console.log(err);
//             // });

//             // Do upload file
//             lampiran.mv(full_path, (err) => {
//                 if (err) console.error(err);
//             });
//         } else {
//             // if path exist than access file
//             fs.access(full_path, fs.F_OK, (err) => {
//                 if (err) {
//                     return err
//                 }

//                 //give privilege to remove file
//                 // chmodr(full_path, 0o777, (err) => {
//                 // 	if (err) { console.log(err) }
//                 // });

//                 // Do remove file
//                 fs.unlink(full_path, (err) => {
//                     if (err) { console.error(err) }
//                 });

//                 //give privilege to folder
//                 // chmodr(path_upload, 0o777, (err) => {
//                 // 	if (err) { console.log(err) }
//                 // });

//                 // Do upload file again
//                 lampiran.mv(full_path, (err) => {
//                     if (err) console.error(err);
//                 });
//             });
//         }
//     }

//     return full_path;
// }

exports.uploadFile = async (lampiran, path_upload, file_name) => {
    const full_path = path.join(path_upload, file_name);

    try {
        // Pastikan directory tersedia
        await fs.promises.mkdir(path_upload, {
            recursive: true
        });

        // Kalau file sudah ada, hapus dulu
        if (fs.existsSync(full_path)) {
            await fs.promises.unlink(full_path);
        }

        // Upload/move file
        await new Promise((resolve, reject) => {
            lampiran.mv(full_path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        return full_path;

    } catch (error) {
        console.error('Upload file error:', error);
        throw error;
    }
};

exports.processUploadFile = async (data, files, transaction) => {
    const result = []
    for (const lampiran of files) {
        const name = lampiran.name
        const ext = path.extname(name).toLowerCase()
        const timestamp = moment().format('YYYYMMDD_HHmmss');
        const uniqueId = uuidv4();
        const file_name = name.replace(ext, '') + ' (' + timestamp + '_' + uniqueId + ')' + ext;
        const _date = moment().local('id');
        const _months = Number(_date.format("MM"));

        const path_upload = "files" + '/' + `${_date.year()}/${_months}/${_date.date()}/`;

        const full_path = await this.uploadFile(lampiran, path_upload, file_name)
        result.push({ path: full_path, name: name })
    }
    return result
}

exports.saveData = async (payloadData, full_path, transaction) => {
    const pengajuan_id = uuidv4()
    // Object.assign(payloadData, { pengajuan_id: pengajuan_id })
    // const simpanDataPengajuan = await model.d_pengajuan.create(payloadData, { transaction, returning: true })

    Object.assign(payloadData, { pengajuan_id: pengajuan_id, pembetulan_ke: 0 })
    const simpanDataPengajuan = await model.d_pengajuan.create(payloadData, { transaction, returning: true, raw: true })

    const payloadWhere = {
        jenis_biaya_id: payloadData.jenis_biaya_id,
        // ...(payloadData?.dataUser?.unit_kerja_id ? { unit_kerja_pemohon_id: payloadData?.dataUser?.unit_kerja_id } : {}),
        jabatan_pemohon_id: payloadData?.dataUser?.cabang_id !== '2000' ? payloadData?.dataUser?.jabatan_id : payloadData?.jabatan_id,
        flag_aktif: 'Y'
    }
    const dataFlow = await model.m_flow_approval.findAll({
        where: payloadWhere,
        order: [['no_urut', 'ASC']],
        raw: true
    })
    let dataStatus = [];
    if (payloadData?.jenis_biaya_id?.substring(0, 2) === 'KC') {
        // const dataRef = await this.getReferensiByJenis('batas_nominal_kc', '', '')
        for (const item of dataFlow) {
            if (item?.role_id === 'RL02') {
                const userToNotif = await model.m_role_user.findAll({ where: { role_id: item?.role_id, cabang_id: payloadData?.dataUser?.cabang_id }, returning: true })
                const payNotif = {
                    notifikasi_id: uuidv4(),
                    pengajuan_id: pengajuan_id,
                    no_pengajuan: simpanDataPengajuan?.no_pengajuan,
                    title: `Menunggu Persetujuan Anda`,
                    body: 'Satu pengajuan telah masuk ke antrian Anda dan menunggu proses persetujuan.',
                    created_by: payloadData?.created_by || '',
                    user: [...new Set(userToNotif.map(a => a.user_id))]
                }
                await this.insertNotifikasi(payNotif, transaction)
            }
            let unit_id = '';
            if (item?.unit_kerja_id) {
                const dataRef = await model.m_referensi.findOne({ where: { kd_ref: item?.unit_kerja_id }, returning: true, plain: true })
                unit_id = dataRef?.sub_kd_ref
            }
            const payloadFlow = {
                status_id: uuidv4(),
                pengajuan_id: pengajuan_id,
                no_urut: item.no_urut,
                role_id: item.role_id,
                unit_id: unit_id,
                unit_kerja_id: item.unit_kerja_id,
                jabatan_id: item.jabatan_id,
                jenis_user_id: item.jenis_user_id,
                target_sla: item?.target_sla,
                kd_status: item.no_urut === 1 ? 'S2' : null,
                approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                view_only: item?.view_only,
                flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                flag_action: item.no_urut === 2 ? 'Y' : 'T',
                // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                ...(item?.no_urut === 1 ? { date_status: new Date(), start_status: new Date(), end_status: new Date(), sla: 0 } : {}),
                ...(item?.no_urut === 2 ? { start_status: new Date() } : {}),
                // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                kegiatan: item?.kegiatan
            }

            // if (payloadData?.jenis_biaya_id && payloadData?.jenis_biaya_id?.substring(0, 2) === 'KC' && Number(payloadData?.nominal_dpp) < Number(dataRef[0]?.ur_ref) && item?.role_id === 'RL11') {
            //     continue;
            // }
            dataStatus.push(payloadFlow)
            const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
        }
    } else {
        let no_urut = 1;
        let atasanPemohonSama = false;
        for (const item of dataFlow) {
            const checkRoleDirektur = await model.m_flow_approval.count({ where: { jenis_biaya_id: payloadData?.jenis_biaya_id, jabatan_pemohon_id: payloadData?.jabatan_id, role_id: 'RL11' } })
            // if (item.no_urut === 2) {
            //     const payloadFlow = {
            //         status_id: uuidv4(),
            //         pengajuan_id: pengajuan_id,
            //         no_urut: item.no_urut,
            //         role_id: payloadData?.dataUser?.role_atasan_id,
            //         flow_id: null,
            //         kd_status: item.no_urut === 1 ? 'S2' : null,
            //         flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'N',
            //         flag_action: 'Y',
            //         ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
            //         ...(item?.no_urut === 1 ? { date_status: new Date() } : {}),
            //         start_status: new Date(),
            //         // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
            //         kegiatan: 'Approval Atasan'
            //     }
            //     const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
            // } else {
            if (item?.no_urut === 2 && item?.role_id === 'RL02') {
                const unit_kerja_id = payloadData?.dataUser?.unit_kerja_id
                // console.log(unit_kerja_id, 'flowKhusus unit');
                // console.log(payloadData?.jabatan_id, 'flowKhusus jabtan');
                const flowKhusus = await model.m_flow_khusus.findOne({ where: { unit_kerja_id: unit_kerja_id, jabatan_pemohon: payloadData?.jabatan_id }, raw: true })
                let jabatan_id = '';
                // console.log(flowKhusus, 'flowKhusus');

                if (flowKhusus) {
                    jabatan_id = flowKhusus?.atasan_pemohon
                } else {
                    jabatan_id = item?.jabatan_id
                }
                const unit_id = payloadData?.dataUser?.unit_id
                const jenis_biaya_id = payloadData?.jenis_biaya_id

                const checkUserApproval = await model.m_flow_approval.count({ where: { jenis_biaya_id, jabatan_id, unit_kerja_id } })
                const checkUser = await model.m_role_user.count({ where: { jabatan_id, unit_kerja_id } })
                const checkUserUnit = await model.m_role_user.count({ where: { jabatan_id, unit_id } })

                if (checkUserApproval > 0) {
                    // continue;
                    // console.log('masuk kondisi 1');

                    atasanPemohonSama = true
                    const dataUser = await model.m_role_user.findOne({ where: { jabatan_id, unit_kerja_id }, returning: true, plain: true })
                    const payloadFlow = {
                        status_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_urut: no_urut,
                        role_id: item?.role_id,
                        unit_id: dataUser.unit_id,
                        // unit_kerja_id: dataUser.unit_kerja_id,
                        unit_kerja_id: unit_kerja_id,
                        jabatan_id: dataUser.jabatan_id,
                        jenis_user_id: item.jenis_user_id,
                        approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                        kd_status: 'S1',
                        view_only: 'YY',
                        // wajib_verifikasi: 'T',
                        target_sla: item?.target_sla,
                        flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                        flag_action: 'T',
                        // status_verifikasi: 'Y',
                        start_status: new Date(),
                        end_status: new Date(),
                        date_status: new Date(),
                        // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                        kegiatan: item?.kegiatan
                    }
                    dataStatus.push(payloadFlow)
                    const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })

                    if (simpanStatus) {
                        const historyId = uuidv4()
                        const statusHistory = {
                            history_id: historyId,
                            status_id: simpanStatus?.status_id,
                            user_id: dataUser?.user_id,
                            role_user_id: dataUser?.role_user_id,
                            kd_status: 'S1',
                            created_by: 'AUTO APPROVE BY SISTEM',
                            qrcode: `${LINK_QRCODE}?status=${historyId}`
                        }
                        await model.d_status_pengajuan_history.create(statusHistory, { transaction })
                    }

                    const userToNotif = await model.m_role_user.findAll({ where: { jabatan_id: payloadFlow?.jabatan_id, unit_kerja_id: payloadFlow?.unit_kerja_id, jenis_user_id: payloadFlow?.jenis_user_id }, returning: true })
                    const payNotif = {
                        notifikasi_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_pengajuan: payloadData?.no_pengajuan,
                        title: `Menunggu Persetujuan Anda`,
                        body: 'Satu pengajuan telah masuk ke antrian Anda dan menunggu proses persetujuan.',
                        created_by: payloadData?.created_by || '',
                        user: [...new Set(userToNotif.map(a => a.user_id))]
                    }
                    await this.insertNotifikasi(payNotif, transaction)
                } else if (checkUser > 0 && checkUserApproval <= 0) {
                    const dataUser = await model.m_role_user.findOne({
                        where: { jabatan_id, unit_kerja_id },
                        order: [
                            ['created_at', 'DESC']
                        ], returning: true, plain: true
                    })
                    const payloadFlow = {
                        status_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_urut: no_urut,
                        role_id: item?.role_id,
                        unit_id: dataUser.unit_id,
                        // unit_kerja_id: dataUser.unit_kerja_id,
                        unit_kerja_id: unit_kerja_id,
                        jabatan_id: dataUser.jabatan_id,
                        jenis_user_id: item.jenis_user_id,
                        approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                        kd_status: item.no_urut === 1 ? 'S2' : null,
                        view_only: item?.view_only,
                        // wajib_verifikasi: item?.wajib_verifikasi,
                        target_sla: item?.target_sla,
                        flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                        flag_action: item.no_urut === 2 ? 'Y' : 'T',
                        // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                        ...(item?.no_urut === 1 ? { date_status: new Date() } : {}),
                        ...(item?.no_urut === 2 ? { start_status: new Date() } : {}),
                        // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                        kegiatan: item?.kegiatan
                    }
                    dataStatus.push(payloadFlow)
                    const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })

                    const userToNotif = await model.m_role_user.findAll({ where: { jabatan_id: payloadFlow?.jabatan_id, unit_kerja_id: payloadFlow?.unit_kerja_id, jenis_user_id: payloadFlow?.jenis_user_id }, returning: true })
                    const payNotif = {
                        notifikasi_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_pengajuan: payloadData?.no_pengajuan,
                        title: `Menunggu Persetujuan Anda`,
                        body: 'Satu pengajuan telah masuk ke antrian Anda dan menunggu proses persetujuan.',
                        created_by: payloadData?.created_by || '',
                        user: [...new Set(userToNotif.map(a => a.user_id))]
                    }
                    await this.insertNotifikasi(payNotif, transaction)
                } else if (checkUserUnit > 0 && checkUserApproval <= 0 && checkUser <= 0) {
                    const dataUser = await model.m_role_user.findOne({
                        where: { jabatan_id, unit_id },
                        order: [
                            ['created_at', 'DESC']
                        ], returning: true, plain: true
                    })
                    const payloadFlow = {
                        status_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_urut: no_urut,
                        role_id: item?.role_id,
                        unit_id: dataUser?.unit_id,
                        // unit_kerja_id: dataUser.unit_kerja_id,
                        unit_kerja_id: dataUser?.unit_kerja_id,
                        jabatan_id: dataUser.jabatan_id,
                        jenis_user_id: item.jenis_user_id,
                        approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                        kd_status: item.no_urut === 1 ? 'S2' : null,
                        view_only: item?.view_only,
                        // wajib_verifikasi: item?.wajib_verifikasi,
                        target_sla: item?.target_sla,
                        flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                        flag_action: item.no_urut === 2 ? 'Y' : 'T',
                        // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                        ...(item?.no_urut === 1 ? { date_status: new Date() } : {}),
                        ...(item?.no_urut === 2 ? { start_status: new Date() } : {}),
                        // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                        kegiatan: item?.kegiatan
                    }
                    dataStatus.push(payloadFlow)
                    const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })

                    const userToNotif = await model.m_role_user.findAll({ where: { jabatan_id: payloadFlow?.jabatan_id, unit_id: payloadFlow?.unit_id, jenis_user_id: payloadFlow?.jenis_user_id }, returning: true })
                    const payNotif = {
                        notifikasi_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_pengajuan: payloadData?.no_pengajuan,
                        title: `Menunggu Persetujuan Anda`,
                        body: 'Satu pengajuan telah masuk ke antrian Anda dan menunggu proses persetujuan.',
                        user: [...new Set(userToNotif.map(a => a.user_id))]
                    }
                    await this.insertNotifikasi(payNotif, transaction)
                } else {
                    const payloadFlow = {
                        status_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_urut: no_urut,
                        role_id: item?.role_id,
                        unit_id: payloadData?.dataUser.unit_id,
                        // unit_kerja_id: payloadData?.dataUser.unit_kerja_id,
                        unit_kerja_id: unit_kerja_id,
                        jabatan_id: item.jabatan_id,
                        jenis_user_id: item.jenis_user_id,
                        approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                        kd_status: no_urut === 1 ? 'S2' : null,
                        view_only: item?.view_only,
                        // wajib_verifikasi: item?.wajib_verifikasi,
                        target_sla: item?.target_sla,
                        flag_show: (no_urut === 1 || no_urut === 2) ? 'Y' : 'T',
                        flag_action: no_urut === 2 ? 'Y' : 'T',
                        // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                        ...(no_urut === 1 ? { date_status: new Date() } : {}),
                        ...(no_urut === 2 ? { start_status: new Date() } : {}),
                        // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                        kegiatan: item?.kegiatan
                    }
                    dataStatus.push(payloadFlow)
                    const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })

                    const userToNotif = await model.m_role_user.findAll({ where: { jabatan_id: payloadFlow?.jabatan_id, unit_kerja_id: payloadFlow?.unit_kerja_id, jenis_user_id: payloadFlow?.jenis_user_id }, returning: true })
                    const payNotif = {
                        notifikasi_id: uuidv4(),
                        pengajuan_id: pengajuan_id,
                        no_pengajuan: payloadData?.no_pengajuan,
                        title: `Menunggu Persetujuan Anda`,
                        body: 'Satu pengajuan telah masuk ke antrian Anda dan menunggu proses persetujuan.',
                        created_by: payloadData?.created_by || '',
                        user: [...new Set(userToNotif.map(a => a.user_id))]
                    }
                    await this.insertNotifikasi(payNotif, transaction)
                }
            } else if (!['KP05', 'KP06', 'KP07', 'KP11'].includes(payloadData?.jenis_biaya_id) && item?.role_id === 'RL10' && ((Number(payloadData?.nominal_dpp) > 20000000 && payloadData?.jenis_biaya_id?.substring(0, 2) === 'KC') || (Number(payloadData?.nominal_dpp) > 100000000 && payloadData?.jenis_biaya_id?.substring(0, 2) === 'KP')) && checkRoleDirektur === 0) {
                let unit_id = '';
                if (item?.no_urut !== 1 && item?.unit_kerja_id) {
                    const dataRef = await model.m_referensi.findOne({ where: { kd_ref: item?.unit_kerja_id }, returning: true, plain: true })
                    unit_id = dataRef?.sub_kd_ref || ''
                }
                if (item?.no_urut === 1) {
                    unit_id = payloadData?.dataUser?.unit_id
                }
                const payloadFlow = {
                    status_id: uuidv4(),
                    flow_id: item.flow_id,
                    pengajuan_id: pengajuan_id,
                    no_urut: no_urut,
                    role_id: item.role_id,
                    unit_id: unit_id,
                    unit_kerja_id: no_urut === 1 ? payloadData?.dataUser?.unit_kerja_id : item.unit_kerja_id,
                    jabatan_id: item.jabatan_id,
                    jenis_user_id: item.jenis_user_id,
                    approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                    kd_status: no_urut === 1 ? 'S2' : null,
                    view_only: item?.view_only,
                    // wajib_verifikasi: item?.wajib_verifikasi,
                    target_sla: item?.target_sla,
                    flag_show: (no_urut === 1 || no_urut === 2 || (no_urut === 3 && atasanPemohonSama === true)) ? 'Y' : 'T',
                    flag_action: (no_urut === 2 || (no_urut === 3 && atasanPemohonSama === true)) ? 'Y' : 'T',
                    // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                    ...(no_urut === 1 ? { date_status: new Date() } : {}),
                    ...(no_urut === 2 ? { start_status: new Date() } : {}),
                    // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                    kegiatan: item?.kegiatan
                }
                dataStatus.push(payloadFlow)
                const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
                if (simpanStatus) {
                    no_urut += 1
                    const payloadFlowDirektur = {
                        status_id: uuidv4(),
                        flow_id: item.flow_id,
                        pengajuan_id: pengajuan_id,
                        no_urut: no_urut,
                        role_id: 'RL11',
                        unit_id: 'U003',
                        unit_kerja_id: 'UK007',
                        jabatan_id: 'JB007',
                        jenis_user_id: '1',
                        approval: 'Y',
                        kd_status: null,
                        view_only: 'T',
                        // wajib_verifikasi: item?.wajib_verifikasi,
                        target_sla: item?.target_sla,
                        flag_show: 'T',
                        flag_action: 'T',
                        // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                        ...(no_urut === 1 ? { date_status: new Date() } : {}),
                        ...(no_urut === 2 ? { start_status: new Date() } : {}),
                        // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                        kegiatan: 'Approval Direktur'
                    }
                    dataStatus.push(payloadFlowDirektur)
                    const simpanStatusDirektur = await model.d_status_pengajuan.create(payloadFlowDirektur, { transaction, returning: true, plain: true })
                }
            } else {
                let unit_id = '';
                if (item?.no_urut !== 1 && item?.unit_kerja_id) {
                    const dataRef = await model.m_referensi.findOne({ where: { kd_ref: item?.unit_kerja_id }, returning: true, plain: true })
                    unit_id = dataRef?.sub_kd_ref || ''
                }
                if (item?.no_urut === 1) {
                    unit_id = payloadData?.dataUser?.unit_id
                }
                const payloadFlow = {
                    status_id: uuidv4(),
                    flow_id: item.flow_id,
                    pengajuan_id: pengajuan_id,
                    no_urut: no_urut,
                    role_id: item.role_id,
                    unit_id: unit_id,
                    unit_kerja_id: no_urut === 1 ? payloadData?.dataUser?.unit_kerja_id : item.unit_kerja_id,
                    jabatan_id: item.jabatan_id,
                    jenis_user_id: item.jenis_user_id,
                    approval: item?.jenis_user_id === '1' ? 'Y' : 'T',
                    kd_status: no_urut === 1 ? 'S2' : null,
                    view_only: item?.view_only,
                    // wajib_verifikasi: item?.wajib_verifikasi,
                    target_sla: item?.target_sla,
                    flag_show: (no_urut === 1 || no_urut === 2 || (no_urut === 3 && atasanPemohonSama === true)) ? 'Y' : 'T',
                    flag_action: (no_urut === 2 || (no_urut === 3 && atasanPemohonSama === true)) ? 'Y' : 'T',
                    // ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                    ...(no_urut === 1 ? { date_status: new Date() } : {}),
                    ...(no_urut === 2 ? { start_status: new Date() } : {}),
                    // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                    kegiatan: item?.kegiatan
                }
                dataStatus.push(payloadFlow)
                const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
            }
            no_urut += 1;
        }
        // }
    }

    const post_data = []
    for (let i = 0; i < full_path.length; i++) {
        // const data = payloadData[i]
        const payload = {
            pengajuan_id: pengajuan_id,
            dokumen_id: uuidv4(),
            nama_dokumen: full_path[i].name !== null ? full_path[i]?.name : "",
            url_file: full_path[i].path !== null ? full_path[i]?.path : "",
            created_by: payloadData?.dataUser?.role_id === 'RL01' ? 'Pemohon - ' + payloadData?.dataUser?.nama : 'Approval - ' + payloadData?.dataUser?.nama
        }
        const result = await model.d_pengajuan_dokumen.create(payload, { transaction, returning: true })
        post_data.push(result)
    }

    if (payloadData.updateData) {
        if (payloadData.updateData.coa && payloadData.updateData.coa.length > 0) {
            // await model.d_pengajuan_coa.destroy({ where: { pengajuan_id: payloadData?.updateData?.pengajuan_id } })
            for (const item of payloadData?.updateData?.coa) {
                if (item?.pengajuan_coa_id) {
                    await model.d_pemakaian_anggaran.destroy({ where: { pengajuan_coa_id: item?.pengajuan_coa_id } })
                }
            }
        }
    }
    if (payloadData.coa && payloadData.coa.length > 0) {
        for (const item of payloadData.coa) {
            const payCoa = {
                pengajuan_coa_id: uuidv4(),
                pengajuan_id: pengajuan_id,
                coa_id: item.coa_id,
                coa_detail_id: item.coa_detail_id,
                nominal: item.nominal,
                created_by: payloadData?.created_by
            }
            await model.d_pengajuan_coa.create(payCoa, { transaction })
            const payCoa2 = {
                pemakaian_anggaran_id: uuidv4(),
                anggaran_id: item?.anggaran_id,
                pengajuan_coa_id: payCoa?.pengajuan_coa_id,
                nominal: item?.nominal,
                created_by: payloadData?.created_by
            }
            await model.d_pemakaian_anggaran.create(payCoa2, { transaction })
        }
    }

    if (simpanDataPengajuan && payloadData.updateData) {
        const payloadUpdate = {
            pengajuan_id: payloadData?.updateData?.pengajuan_id,
            flag_aktif: payloadData?.updateData?.flag_aktif,
            parent_id: pengajuan_id
        }
        const updatePengajuan = await model.d_pengajuan.update(payloadUpdate, { where: { pengajuan_id: payloadUpdate?.pengajuan_id }, returning: true })
    }

    return {
        pengajuan: simpanDataPengajuan.get({ plain: true }),
        dokumen: post_data
    }
}

exports.savePenyelesaianKasbon = async (payloadData, full_path, transaction) => {
    const pengajuan_id = uuidv4()
    Object.assign(payloadData, { pengajuan_id: pengajuan_id, jenis_biaya_id: 'KP11' })
    const simpanDataPengajuan = await model.d_pengajuan.create(payloadData, { transaction, returning: true })
    const payloadWhere = {
        jenis_biaya_id: 'KP11',
        // ...(payloadData?.dataUser?.unit_kerja_id ? { unit_kerja_pemohon_id: payloadData?.dataUser?.unit_kerja_id } : {}),
        jabatan_pemohon_id: payloadData?.jabatan_id,
        flag_aktif: 'Y'
    }
    const dataFlow = await model.m_flow_approval.findAll({
        where: payloadWhere,
        order: [['no_urut', 'ASC']],
        raw: true
    })

    let no_urut = 1;
    let atasanPemohonSama = false
    for (const item of dataFlow) {
        // if (item.no_urut === 2) {
        //     const payloadFlow = {
        //         status_id: uuidv4(),
        //         pengajuan_id: pengajuan_id,
        //         no_urut: item.no_urut,
        //         role_id: payloadData?.dataUser?.role_atasan_id,
        //         flow_id: null,
        //         kd_status: item.no_urut === 1 ? 'S2' : null,
        //         flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'N',
        //         flag_action: 'Y',
        //         ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
        //         ...(item?.no_urut === 1 ? { date_status: new Date() } : {}),
        //         start_status: new Date(),
        //         // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
        //         kegiatan: 'Approval Atasan'
        //     }
        //     const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
        // } else {
        const jabatan_id = item?.jabatan_id
        const unit_kerja_id = payloadData?.dataUser?.unit_kerja_id
        const unit_id = payloadData?.dataUser?.unit_id
        const jenis_biaya_id = 'KP11'
        if (item?.no_urut === 2 && item?.role_id === 'RL02') {
            const checkUserApproval = await model.m_flow_approval.count({ where: { jenis_biaya_id, jabatan_id, unit_kerja_id } })
            const checkUser = await model.m_role_user.count({ where: { jabatan_id, unit_kerja_id } })
            const checkUserUnit = await model.m_role_user.count({ where: { jabatan_id, unit_id } })
            if (checkUserApproval > 0) {
                // continue;
                atasanPemohonSama = true
                const dataUser = await model.m_role_user.findOne({ where: { jabatan_id, unit_kerja_id }, returning: true, plain: true })
                const payloadFlow = {
                    status_id: uuidv4(),
                    pengajuan_id: pengajuan_id,
                    no_urut: no_urut,
                    role_id: item?.role_id,
                    unit_id: dataUser.unit_id,
                    unit_kerja_id: dataUser.unit_kerja_id,
                    jabatan_id: dataUser.jabatan_id,
                    jenis_user_id: item.jenis_user_id,
                    kd_status: 'S1',
                    view_only: 'YY',
                    wajib_verifikasi: 'T',
                    target_sla: item?.target_sla,
                    flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                    flag_action: 'N',
                    status_verifikasi: 'Y',
                    start_status: new Date(),
                    end_status: new Date(),
                    date_status: new Date(),
                    // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                    kegiatan: item?.kegiatan
                }
                const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
            } else if (checkUser > 0 && checkUserApproval <= 0) {
                const dataUser = await model.m_role_user.findOne({ where: { jabatan_id, unit_kerja_id }, returning: true, plain: true })
                const payloadFlow = {
                    status_id: uuidv4(),
                    pengajuan_id: pengajuan_id,
                    no_urut: no_urut,
                    role_id: item?.role_id,
                    unit_id: dataUser.unit_id,
                    unit_kerja_id: dataUser.unit_kerja_id,
                    jabatan_id: dataUser.jabatan_id,
                    jenis_user_id: item.jenis_user_id,
                    kd_status: item.no_urut === 1 ? 'S2' : null,
                    view_only: item?.view_only,
                    wajib_verifikasi: item?.wajib_verifikasi,
                    target_sla: item?.target_sla,
                    flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                    flag_action: item.no_urut === 2 ? 'Y' : 'N',
                    ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                    ...(item?.no_urut === 1 ? { date_status: new Date() } : {}),
                    ...(item?.no_urut === 2 ? { start_status: new Date() } : {}),
                    // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                    kegiatan: item?.kegiatan
                }
                const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
                // console.log('simpanStatus', simpanStatus);

            } else if (checkUserUnit > 0 && checkUserApproval <= 0 && checkUser <= 0) {
                const dataUser = await model.m_role_user.findOne({ where: { jabatan_id, unit_id }, returning: true, plain: true })
                const payloadFlow = {
                    status_id: uuidv4(),
                    pengajuan_id: pengajuan_id,
                    no_urut: no_urut,
                    role_id: item?.role_id,
                    unit_kerja_id: dataUser.unit_kerja_id,
                    jabatan_id: dataUser.jabatan_id,
                    jenis_user_id: item.jenis_user_id,
                    kd_status: item.no_urut === 1 ? 'S2' : null,
                    view_only: item?.view_only,
                    wajib_verifikasi: item?.wajib_verifikasi,
                    target_sla: item?.target_sla,
                    flag_show: (item.no_urut === 1 || item.no_urut === 2) ? 'Y' : 'T',
                    flag_action: item.no_urut === 2 ? 'Y' : 'N',
                    ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                    ...(item?.no_urut === 1 ? { date_status: new Date() } : {}),
                    ...(item?.no_urut === 2 ? { start_status: new Date() } : {}),
                    // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                    kegiatan: item?.kegiatan
                }
                const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
            } else {
                const payloadFlow = {
                    status_id: uuidv4(),
                    pengajuan_id: pengajuan_id,
                    no_urut: no_urut,
                    role_id: item?.role_id,
                    unit_kerja_id: payloadData?.dataUser.unit_kerja_id,
                    jabatan_id: item.jabatan_id,
                    kd_status: no_urut === 1 ? 'S2' : null,
                    view_only: item?.view_only,
                    wajib_verifikasi: item?.wajib_verifikasi,
                    target_sla: item?.target_sla,
                    jenis_user_id: item.jenis_user_id,
                    flag_show: (no_urut === 1 || no_urut === 2) ? 'Y' : 'T',
                    flag_action: no_urut === 2 ? 'Y' : 'N',
                    ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                    ...(no_urut === 1 ? { date_status: new Date() } : {}),
                    ...(no_urut === 2 ? { start_status: new Date() } : {}),
                    // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                    kegiatan: item?.kegiatan
                }
                const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
            }
        } else {
            let unit_id = '';
            if (item?.no_urut !== 1 && item?.unit_kerja_id) {
                const dataRef = await model.m_referensi.findOne({ where: { kd_ref: item?.unit_kerja_id }, returning: true, plain: true })
                unit_id = dataRef?.sub_kd_ref
            }
            if (item?.no_urut === 1) {
                unit_id = payloadData?.dataUser?.unit_id
            }
            const payloadFlow = {
                status_id: uuidv4(),
                flow_id: item.flow_id,
                pengajuan_id: pengajuan_id,
                no_urut: no_urut,
                role_id: item.role_id,
                unit_id: unit_id,
                unit_kerja_id: no_urut === 1 ? payloadData?.dataUser?.unit_kerja_id : item.unit_kerja_id,
                jabatan_id: item.jabatan_id,
                jenis_user_id: item.jenis_user_id,
                kd_status: no_urut === 1 ? 'S2' : null,
                view_only: item?.view_only,
                wajib_verifikasi: item?.wajib_verifikasi,
                target_sla: item?.target_sla,
                flag_show: (no_urut === 1 || no_urut === 2 || (no_urut === 3 && atasanPemohonSama === true)) ? 'Y' : 'T',
                flag_action: (no_urut === 2 || (no_urut === 3 && atasanPemohonSama === true)) ? 'Y' : 'N',
                ...(item?.wajib_verifikasi === 'T' ? { status_verifikasi: 'Y' } : {}),
                ...(no_urut === 1 ? { date_status: new Date() } : {}),
                ...(no_urut === 2 ? { start_status: new Date() } : {}),
                // ...(item?.no_urut === 1 ? { created_by: item.created_by || null } : {})
                kegiatan: item?.kegiatan
            }
            const simpanStatus = await model.d_status_pengajuan.create(payloadFlow, { transaction, returning: true, plain: true })
        }
        no_urut += 1;
    }

    const post_data = []
    for (let i = 0; i < full_path.length; i++) {
        // const data = payloadData[i]
        const payload = {
            pengajuan_id: pengajuan_id,
            dokumen_id: uuidv4(),
            nama_dokumen: full_path[i].name !== null ? full_path[i]?.name : "",
            url_file: full_path[i].path !== null ? full_path[i]?.path : ""
        }
        const result = await model.d_pengajuan_dokumen.create(payload, { transaction, returning: true })
        post_data.push(result)
    }
    const payloadUpdate = {
        pengajuan_id: payloadData?.updateData?.pengajuan_id,
        flag_aktif: payloadData?.updateData?.flag_aktif,
        parent_id: pengajuan_id
    }
    const updatePengajuan = await model.d_pengajuan.update(payloadUpdate, { where: { pengajuan_id: payloadUpdate?.pengajuan_id }, returning: true })
    return {
        pengajuan: simpanDataPengajuan.get({ plain: true }),
        dokumen: post_data,
        update_flag: updatePengajuan
    }
}

exports.updateData = async (payloadData, full_path, transaction) => {
    const dataPengajuan = await this.getDetailPengajuan(payloadData)
    if (payloadData?.dataUser?.role_id === 'RL04' && Number(dataPengajuan?.nominal_dpp) !== Number(payloadData?.nominal_dpp)) {
        if (dataPengajuan?.coa && dataPengajuan?.coa?.length > 0) {
            for (const item of dataPengajuan?.coa) {
                if (item?.pengajuan_coa_id) {
                    await model.d_pengajuan_coa.update({
                        nominal: payloadData?.nominal_dpp
                    }, {
                        where: {
                            pengajuan_coa_id: item?.pengajuan_coa_id
                        }
                    })
                    await model.d_pemakaian_anggaran.update({
                        nominal: payloadData?.nominal_dpp
                    }, {
                        where: {
                            pengajuan_coa_id: item?.pengajuan_coa_id
                        }
                    })
                }
            }
        }
    }
    const updateDataPengajuan = await model.d_pengajuan.update(payloadData, { where: { pengajuan_id: payloadData.pengajuan_id } })

    if (payloadData?.status_id && payloadData?.kd_status && payloadData?.kd_status === 'T') {
        let statusId = '';
        if (payloadData?.dataUser?.role_id === 'RL01') {
            const dataStatus = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payloadData?.pengajuan_id, role_id: 'RL01' }, returning: true, raw: true })
            statusId = dataStatus?.status_id
        } else {
            statusId = payloadData?.status_id
        }

        await this.insertStatusPengajuan({
            history_id: uuidv4(),
            pengajuan_id: payloadData?.pengajuan_id,
            user_id: payloadData?.user_id,
            role_user_id: payloadData?.role_user_id,
            status_id: statusId,
            no_urut: payloadData?.no_urut,
            pembetulan_ke: payloadData?.pembetulan_ke,
            jenis_biaya_id: payloadData?.jenis_biaya_id,
            kd_status: 'P',
            created_by: payloadData?.updated_by
        }, transaction)
        // await this.insertStatusPengajuan({
        //     history_id: uuidv4(),
        //     pengajuan_id: payloadData?.pengajuan_id,
        //     user_id: payloadData?.user_id,
        //     role_user_id: payloadData?.role_user_id,
        //     status_id: payloadData?.status_id,
        //     status_verifikasi: 'P',
        //     kd_status: 'P'
        // }, transaction)

        if (payloadData.coa && payloadData.coa.length > 0) {
            const dataCoa = await model.d_pengajuan_coa.findAll({ where: { pengajuan_id: payloadData?.pengajuan_id }, returning: true, raw: true })
            for (const item of dataCoa) {
                if (item?.pengajuan_coa_id) {
                    await model.d_pemakaian_anggaran.destroy({ where: { pengajuan_coa_id: item?.pengajuan_coa_id } })
                }
            }
            await model.d_pengajuan_coa.destroy({ where: { pengajuan_id: payloadData?.pengajuan_id } })
            for (const item of payloadData.coa) {
                const payCoa = {
                    pengajuan_coa_id: uuidv4(),
                    pengajuan_id: payloadData?.pengajuan_id,
                    coa_id: item.coa_id,
                    coa_detail_id: item.coa_detail_id,
                    nominal: item.nominal,
                    created_by: payloadData?.created_by
                }
                await model.d_pengajuan_coa.create(payCoa, { transaction })
                const payCoa2 = {
                    pemakaian_anggaran_id: uuidv4(),
                    anggaran_id: item?.anggaran_id,
                    pengajuan_coa_id: payCoa?.pengajuan_coa_id,
                    nominal: item?.nominal,
                    created_by: payloadData?.created_by
                }
                await model.d_pemakaian_anggaran.create(payCoa2, { transaction })
            }
        }
    }

    const post_data = []
    for (let i = 0; i < full_path.length; i++) {
        const data = payloadData[i]
        const payload = {
            pengajuan_id: payloadData.pengajuan_id,
            dokumen_id: uuidv4(),
            nama_dokumen: full_path[i].name !== null ? full_path[i]?.name : "",
            url_file: full_path[i].path !== null ? full_path[i]?.path : "",
            created_by: payloadData?.dataUser?.role_id === 'RL01' ? 'Pemohon - ' + payloadData?.dataUser?.nama : 'Approval - ' + payloadData?.dataUser?.nama
        }
        const result = await model.d_pengajuan_dokumen.create(payload, { transaction })
        post_data.push(result)
    }

    if (payloadData?.npwp_vendor && payloadData?.vendor_id) {
        await model.m_vendor.update({ vendor_id: payloadData?.vendor_id, npwp_vendor: payloadData?.npwp_vendor }, { where: { vendor_id: payloadData?.vendor_id } })
    }
    return { ...updateDataPengajuan, ...post_data }
}

exports.insertPengajuan = async (payloadData, files, transaction) => {
    if (payloadData?.no_memo) {
        const dataCheck = await model.d_pengajuan.count({ where: { no_memo: payloadData?.no_memo, flag_aktif: 'Y' } })
        if (dataCheck > 0 && ['KC03', 'KC06', 'KC08', 'KC09'].includes(payloadData?.jenis_biaya_id)) {
            throw Error('Nomor Memo Sudah Terdaftar !')
        }
    }

    if (['KP05', 'KP06', 'KP07'].includes(payloadData?.jenis_biaya_id)) {

        const unitKerja = await this.getReferensiByJenis('tidak_lock_kasbon', '', '', '')

        const dataUnit = unitKerja?.map((item) => {
            return item?.kd_ref
        })

        const dataCheckBiaya = await model.d_pengajuan.count({
            where: {
                role_pembuat_id: payloadData?.role_pembuat_id,
                flag_aktif: 'Y',
                jenis_biaya_id: {
                    [Op.in]: ['KP05', 'KP06', 'KP07'],
                },
            }
        })
        if (!dataUnit.includes(payloadData?.dataUser?.unit_kerja_id)) {
            if (dataCheckBiaya > 0) {
                throw Error('Tidak Dapat Disimpan, Masih Terdapat Pengajuan Kasbon Yang Belum Diselesaikan !')
            } else {
                const dataCheckPenyelesaian = await model.d_pengajuan.count({
                    where: {
                        role_pembuat_id: payloadData?.role_pembuat_id,
                        flag_aktif: 'Y',
                        jenis_biaya_id: {
                            [Op.in]: ['KP11'],
                        },
                    }
                })
                if (dataCheckPenyelesaian > 0) {
                    const dataBiaya = await model.d_pengajuan.findOne({
                        attributes: ['pengajuan_id'],
                        where: {
                            role_pembuat_id: payloadData?.role_pembuat_id,
                            flag_aktif: 'Y',
                            jenis_biaya_id: {
                                [Op.in]: ['KP11'],
                            },
                        },
                        order: [
                            ['created_at', 'DESC']
                        ],
                    });
                    const dataStatus = await model.d_status_pengajuan.count({
                        where: {
                            pengajuan_id: dataBiaya?.pengajuan_id,
                            role_id: 'RL03',
                            flag_show: 'Y',
                            no_urut: {
                                [Op.in]: [3, 4],
                            },
                        }
                    })
                    if (dataStatus === 0) {
                        throw Error('Tidak Dapat Disimpan, Penyelesaian Kasbon Belum Sampai Pada Role Unit Umum, Pengajuan Kasbon Dapat Diajukan Kembali Jika Penyelesaian Kasbon Sudah Di Approve Atasan Pemohon dan Sudah Sampai Pada Role Unit Umum !')
                    }
                }
            }
        }
    }
    const uploadDocument = await this.processUploadFile(payloadData, files, transaction);
    const dataRole = await model.m_role_user.findOne({
        where: { user_id: payloadData?.pemohon_id, is_aktif: 'Y' },
        raw: true
    })
    Object.assign(payloadData, { role_pemohon_id: dataRole?.role_user_id, jabatan_pemohon_id: dataRole?.jabatan_id })
    const saveDokumen = await this.saveData(payloadData, uploadDocument, transaction)
    return {
        d_pengajuan: saveDokumen,
        d_dokumen: uploadDocument,
        keterangan: "Data berhasil disimpan",
    }
}

exports.penyelesaianKasbon = async (payloadData, files, transaction) => {
    const uploadDocument = await this.processUploadFile(payloadData, files, transaction);
    const dataRole = await model.m_role_user.findOne({
        where: { user_id: payloadData?.pemohon_id, is_aktif: 'Y' },
        raw: true
    })
    Object.assign(payloadData, { role_pemohon_id: dataRole?.role_user_id, jabatan_pemohon_id: dataRole?.jabatan_id })
    const saveDokumen = await this.savePenyelesaianKasbon(payloadData, uploadDocument, transaction)
    return {
        d_pengajuan: saveDokumen,
        d_dokumen: uploadDocument,
        keterangan: "Data berhasil disimpan",
    }
}

exports.updatePengajuan = async (payloadData, files, transaction) => {
    if (payloadData?.flag_aktif === 'B') {
        const data = await this.getDetailPengajuan(payloadData)
        await model.d_pengajuan.update({ flag_aktif: 'B' }, { where: { pengajuan_id: payloadData?.pengajuan_id } })
        if (data?.coa && data?.coa?.length > 0) {
            for (const item of data?.coa) {
                // await model.d_pengajuan_coa.destroy({
                //     where: {
                //         pengajuan_coa_id: item?.pengajuan_coa_id
                //     }
                // })
                if (item?.pengajuan_coa_id) {
                    await model.d_pemakaian_anggaran.destroy({
                        where: {
                            pengajuan_coa_id: item?.pengajuan_coa_id
                        }
                    })
                }
            }
        }
        return {
            d_pengajuan: data,
            keterangan: 'Pengajuan Berhasil Dibatalkan'
        }
    } else {
        const uploadDocument = await this.processUploadFile(payloadData, files, transaction);

        // Object.assign(payloadData, { ppn: payloadData?.nominal_ppn && payloadData?.nominal_dpp ? (payloadData?.nominal_ppn / payloadData?.nominal_dpp * 100).toFixed(2) : null })
        const saveDokumen = await this.updateData(payloadData, uploadDocument, transaction)
        return {
            d_pengajuan: saveDokumen,
            d_dokumen: uploadDocument,
            keterangan: "Pengajuan Berhasil Disimpan",
        }
    }
}

exports.getPengajuanDokumen = async ({ pengajuan_id }) => {
    const result = await model.d_pengajuan_dokumen.findAll({
        where: {
            pengajuan_id: pengajuan_id
        },
        order: [['created_at', 'ASC']]
    })

    return result
}

exports.getChildPengajuan = async ({ pengajuan_id, condition, condSearch, order_by, condJabatanId }) => {
    const QUERY = query.getChildPengajuan
        // .replace(/:cte/g, cte)
        // .replace(/:condition/g, condition)
        .replace(/:condJabatanId/g, condJabatanId)
        // .replace(/:condSearch/g, condSearch)
        .replace(/:pengajuan_id/g, pengajuan_id)
        .replace(/:order/g, order_by)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    return result
}

exports.getSummaryPengajuan = async ({ role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id }) => {
    let condition = ``, condRole = ``, condUser = ``;
    if (!['RL00'].includes(role_id)) {
        // if (['RL01', 'RL02'].includes(role_id)) {
        //     condition += ` AND dsp.role_id = '${role_id}' AND mru.cabang_id = '${cabang_id}' `
        // } else {
        //     condition += ` AND dsp.role_id = '${role_id}' `
        // }
        // condition += ` AND shp.role_id = '${role_id}' `
        if (cabang_id === '2000') {
            // condition += ` AND mrx.cabang_id = '${cabang_id}' `
            if (unit_kerja_id) {
                // condition += ` AND shp.unit_kerja_id = '${unit_kerja_id}' `
                // condRole += ` AND spp.unit_kerja_id = '${unit_kerja_id}' AND spp.role_id not in ('RL01', 'RL02') `
                condRole += ` AND spp.unit_kerja_id = '${unit_kerja_id}' `
                condUser += ` AND spp.view_only = 'T' AND spp.jenis_user_id = '${jenis_user_id}' AND spp.unit_kerja_id = '${unit_kerja_id}' `
            }
        } else {
            condition += ` AND mru.cabang_id = '${cabang_id}' `
            if (unit_kerja_id && unit_kerja_id !== '') {
                // condition += ` AND shp.unit_kerja_id = '${unit_kerja_id}' `
                condRole += ` AND spp.unit_kerja_id = '${unit_kerja_id}' `
            } else {
                condRole += ` AND spp.jabatan_id = '${jabatan_id}' `
            }
        }
        // if (jabatan_id) {
        //     condition += ` AND shp.jabatan_id = '${jabatan_id}' `
        // }
    }

    const QUERY = query.getSummaryPengajuan
        .replace(/:condRole/g, condRole)
        .replace(/:condUser/g, condUser)
        .replace(/:condition/g, condition)

    const listSummary = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    return listSummary
}

exports.getListPengajuan = async ({ status = null, keyword, page, limit, pengajuan_id, sortBy = 'DESC', role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id, filter }) => {
    const order_row = `ORDER BY a.created_at ${sortBy}`;
    let order_by = ``, condSuperAdmin = ``;
    let condition = ``, condSearch = ``, condRole = ``, condJabatanId = ``;
    let cte = ``, role_user = ``;
    if (!['RL00', 'RL16', 'RL17'].includes(role_id)) {
        // if (['RL01', 'RL02'].includes(role_id)) {
        // if (cabang_id === '2000') {
        // condition += ` AND shp.role_id = '${role_id}' AND mru.cabang_id = '${cabang_id}' `
        // if (unit_kerja_id) {
        //     condition += `AND mru.unit_kerja_id = '${unit_kerja_id}'`
        // }
        // if (jabatan_id) {
        //     condition += `AND mru.jabatan_id = '${jabatan_id}'`
        // }
        // } else {
        // condition += ` AND shp.role_id = '${role_id}' `
        // if (cabang_id === '2000') {
        //     if (unit_kerja_id) {
        //         // condJabatanId += ` AND s.unit_kerja_id = '${unit_kerja_id}' `
        //         // condition += ` AND sa.unit_kerja_id = '${unit_kerja_id}' AND sa.jabatan_id = '${jabatan_id}' AND sa.jenis_user_id = '${jenis_user_id}'`
        //         // condJabatanId += `AND (CASE WHEN (SELECT COUNT(x.pengajuan_id) from d_status_pengajuan x where x.unit_kerja_id = '${unit_kerja_id}' and x.pengajuan_id = s.pengajuan_id) > 1 THEN (s.unit_kerja_id = '${unit_kerja_id}' AND s.jabatan_id = '${jabatan_id}') ELSE s.unit_kerja_id = '${unit_kerja_id}' END)`
        //         // if (jabatan_id) {
        //         //     condJabatanId += ` AND s.jabatan_id = '${jabatan_id}' `
        //         // }
        //     } else {
        //         // condJabatanId += ` AND s.jabatan_id = '${jabatan_id}' `
        //         condition += ` AND sa.jenis_user_id = '${jenis_user_id}' AND sa.jabatan_id = '${jabatan_id}' `
        //     }
        //     // condition += ` AND mru.cabang_id = '${cabang_id}' `
        //     // if (role_id !== 'RL01') {
        //     //     condRole += ` AND spp.unit_kerja_id = '${unit_kerja_id}' `
        //     // } else {
        //     //     condRole += ` AND spp.unit_kerja_id = '${unit_kerja_id}' AND spp.role_id = '${role_id}' `
        //     // }
        // } else {
        //     condition += ` AND mru.cabang_id = '${cabang_id}' AND sa.role_id = '${role_id}' `
        //     if (unit_kerja_id) {
        //         condRole += ` AND spp.unit_kerja_id = '${unit_kerja_id}' `
        //         // condJabatanId += ` AND s.unit_kerja_id = '${unit_kerja_id}' `
        //     } else {
        //         // condJabatanId += ` AND s.jabatan_id = '${jabatan_id}' `
        //     }

        //     condRole += ` AND spp.jabatan_id = '${jabatan_id}' `
        // }
        // cte += ` AND shp.jabatan_id = '${jabatan_id}' `
        // if (unit_kerja_id) {
        //     condition += ` AND shp.unit_kerja_id = '${unit_kerja_id}' `
        // }
        // if (jabatan_id) {
        //     condition += ` AND shp.jabatan_id = '${jabatan_id}' `
        // }
        // }
        // } else {
        //     condition += ` AND (
        //     CASE
        //         WHEN mr1.sub_kd_ref = 'KC' 
        //         THEN shp.role_id = '${role_id}' 
        //         WHEN (mr1.sub_kd_ref = 'KP' AND shp.no_urut > 2) 
        //         THEN shp.role_id = '${role_id}' 
        //         ELSE shp.role_id = '${role_id}' AND mru.cabang_id = '${cabang_id}' AND mru.unit_kerja_id = '${unit_kerja_id}' 
        //     END 
        //     ) `
        // }
    } else {
        // cte = `AND s.role_id = '${role_id}'`
    }

    if (cabang_id === '2000') {
        if (status !== 'ALL2') {
            if (unit_kerja_id && !['RL17'].includes(role_id)) {
                condition += ` AND sa.unit_kerja_id = '${unit_kerja_id}' `
            }
        }
        // else {
        //     condition += ` AND sa.jenis_user_id = '${jenis_user_id}' AND sa.jabatan_id = '${jabatan_id}' `
        // }
    } else {
        condition += ` AND mru.cabang_id = '${cabang_id}' AND sa.jabatan_id = '${jabatan_id}' `
        // if (jenis_user_id) {
        //     condition += ` AND sa.jenis_user_id = '${jenis_user_id}' `
        // }
    }
    if (status) {
        if (status === 'ALL') {
            if (['RL00', 'RL16', 'RL17'].includes(role_id)) {
                condSuperAdmin += ` WHERE rn = 1 `
            }
            // else {
            //     condition += ` AND sa.jenis_user_id = '${jenis_user_id}' AND sa.role_id = '${role_id}' `
            // }
            const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

            if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
            } else {
                if (jenis_user_id) {
                    if (jenis_user_id === '1') {
                        condition += ` AND sa.jenis_user_id = '${jenis_user_id}' AND sa.jabatan_id = '${jabatan_id}' `;
                        if (role_id !== 'RL01') {
                            condition += ` AND sa.role_id != 'RL01' `
                        }
                    } else {
                        condition += ` AND ((sa.role_id NOT IN ('RL02') AND sa.jenis_user_id != '1') OR (sa.role_id IN ('RL02') AND sa.jenis_user_id = '1') OR (
        sa.role_id NOT IN ('RL02')
        AND NOT EXISTS (
            SELECT 1
            FROM d_status_pengajuan x
            WHERE x.pengajuan_id = sa.pengajuan_id
              AND x.unit_kerja_id = sa.unit_kerja_id
              AND x.jenis_user_id != '1'
        )
    )) `;
                        // condition += ` AND sa.jenis_user_id = '1' `;
                    }
                } else {
                    if (role_id === 'RL01') {
                        condition += ` AND sa.role_id = '${role_id}' `
                    }
                }
            }
            sortBy = sortBy
        }
        if (status === 'PENDING_VERIFIKASI') {
            condition += ` AND sa.jenis_user_id <> '1' 
                            AND sa.unit_kerja_id = '${unit_kerja_id}'
                            AND (sa.kd_status is null or sa.kd_status = '') `;
            // order_by += ` CASE
            //                 WHEN sa.jenis_user_id <> '1' AND sa.unit_kerja_id = '${unit_kerja_id}'
            //                 AND (sa.kd_status IS NULL or sa.kd_status = '') AND sa.flag_action = 'Y'
            //                 THEN 0
            //                 ELSE 1
            //             END ASC, `;
            order_by += ` CASE
                            WHEN sa.flag_action = 'Y'
                            THEN 0
                            ELSE 1
                        END ASC, `;
            sortBy = sortBy
            // }
        }
        if (status === 'VERIFIED') {
            // condition += ` AND sa.jenis_user_id = '1' AND (sa.kd_status is null or sa.kd_status = '') AND (
            condition += ` AND (sa.kd_status is null or sa.kd_status = '') AND sa.view_only != 'YY' AND (
                        NOT EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = sa.pengajuan_id
                              AND x.unit_kerja_id = sa.unit_kerja_id 
                              AND x.jenis_user_id != '1'
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = sa.pengajuan_id
                              AND x.unit_kerja_id = sa.unit_kerja_id
                              AND x.jenis_user_id != '1'
                              AND x.kd_status IN ('VR','UR')
                        )
                     ) `;
            // order_by += ` CASE
            //                 WHEN sa.flag_action = 'Y' AND 
            //                     (
            //                     NOT EXISTS (
            //                         SELECT 1
            //                         FROM d_status_pengajuan x
            //                         WHERE x.pengajuan_id = sa.pengajuan_id
            //                         AND x.unit_kerja_id = sa.unit_kerja_id
            //                         AND x.jenis_user_id != '1'
            //                     )
            //                     OR EXISTS (
            //                         SELECT 1
            //                         FROM d_status_pengajuan x
            //                         WHERE x.pengajuan_id = sa.pengajuan_id
            //                         AND x.unit_kerja_id = sa.unit_kerja_id
            //                         AND x.jenis_user_id != '1'
            //                         AND x.kd_status IN ('VR','UR')
            //                     )
            //                 )
            //                 THEN 0
            //                 ELSE 1
            //             END ASC, `;
            order_by += ` CASE
                            WHEN sa.flag_action = 'Y' 
                            THEN 0
                            ELSE 1
                        END ASC, `;
            sortBy = sortBy;
        }
        if (status === 'APPROVED') {
            condition += ` AND sa.jenis_user_id = '1' AND sa.role_id != 'RL01' AND sa.view_only != 'YY' AND sa.kd_status IN ('S1', 'S2') `
        }
        if (status === 'REJECT') {
            condition += ` AND sa.jenis_user_id = '1' AND sa.kd_status = 'T' `
        }
        if (status === 'ALL2') {
            condSuperAdmin += ` WHERE rn = 1 `
            sortBy = sortBy
        }
    }

    if (keyword && (keyword !== null || keyword !== '')) {
        condSearch += ` AND
                            (a.no_pengajuan LIKE '%${keyword}%'
                            OR upper(v.nama_vendor) LIKE upper('%${keyword}%')
                            OR upper(a.no_kasbon_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_memo) LIKE upper('%${keyword}%')
                            OR upper(a.no_voucher_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_voucher_payment) LIKE upper('%${keyword}%')
                            OR upper(a.keterangan) LIKE upper('%${keyword}%')
                            OR upper(a.no_invoice) LIKE upper('%${keyword}%')
                            OR upper(a.no_faktur_pajak) LIKE upper('%${keyword}%')
                            OR upper(v.npwp_vendor) LIKE upper('%${keyword}%')
                            OR upper(mr1.ur_ref) LIKE upper('%${keyword}%') 
                            OR upper(mu.nip) LIKE upper('%${keyword}%') 
                            OR upper(mu.nama) LIKE upper('%${keyword}%') 
                            OR upper(mr3.ur_ref) LIKE upper('%${keyword}%') 
                            OR upper(mr4.ur_ref) LIKE upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1
                                FROM d_pengajuan X
                                WHERE X.parent_id = a.pengajuan_id 
                                AND X.flag_aktif = 'N'
                                AND (
                                    UPPER(X.no_pengajuan) LIKE UPPER('%${keyword}%')
                                )
                            )) `

    }

    // if (![null, undefined].includes(status)) {
    //     if (kd_status === '') {
    //         condition += `AND a.kd_status IS NULL`
    //     }
    //     if (kd_status) {
    //         condition += `AND a.kd_status = ${kd_status}`
    //     }
    // }

    if (role_user_id) {
        role_user += `'${role_user_id}'`
    }

    if (filter?.cabang) {
        const selectCabang = Object.values(filter?.cabang);
        if (selectCabang?.length > 0) {
            // if (selectCabang[0]?.value !== 'All') {
            const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
            condition += ` AND mru.cabang_id IN (${inCabang}) `;
        }
    }

    if (filter?.periode) {
        condition += ` AND TO_CHAR(a.created_at, 'YYYY-MM') = TO_CHAR(TO_DATE('${filter?.periode}', 'YYYY-MM-DD'), 'YYYY-MM') `
    }

    if (sortBy) {
        order_by += ` a.created_at ${sortBy} `
    }
    const QUERY = query.getListPengajuan
        .replace(/:cte/g, cte)
        .replace(/:condSuperAdmin/g, condSuperAdmin)
        .replace(/:role_user/g, role_user)
        .replace(/:condJabatanId/g, condJabatanId)
        .replace(/:order_row/g, order_row)
        .replace(/:order/g, order_by)
        .replace(/:condRole/g, condRole)
        .replace(/:condition/g, condition)
        .replace(/:condSearch/g, condSearch)

    const COUNT_QUERY = query.countListPengajuan
        .replace(/:cte/g, cte)
        .replace(/:condSuperAdmin/g, condSuperAdmin)
        .replace(/:role_user/g, role_user)
        .replace(/:condJabatanId/g, condJabatanId)
        .replace(/:condRole/g, condRole)
        .replace(/:condition/g, condition)
        .replace(/:condSearch/g, condSearch)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const listPengajuan = await db.query(QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    // console.log(listPengajuan.length, 'listtt');

    const listPengajuanFix = await Promise.all(
        listPengajuan.map(async (item) => {
            item.lampiran = await this.getPengajuanDokumen({
                pengajuan_id: item.pengajuan_id
            });
            item.child = await this.getChildPengajuan({
                pengajuan_id: item.pengajuan_id,
                // cte: cte,
                order_by: order_row,
                // condition: condition,
                // condSearch: condSearch,
                condJabatanId: condJabatanId
            });

            return item;
        })
    );

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = listPengajuanFix.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listPengajuanFix
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListPengajuanPriority = async ({ page, limit, sortBy = 'ASC', role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id }) => {
    const order_row = `ORDER BY a.created_at ${sortBy}`;
    let order_by = ``, condSuperAdmin = ``;
    let condition = ``, condSearch = ``, condRole = ``, condJabatanId = ``;
    let cte = ``, role_user = ``;

    if (cabang_id === '2000') {
        if (unit_kerja_id) {
            condition += ` AND sa.unit_kerja_id = '${unit_kerja_id}' `
        }
    } else {
        condition += ` AND mru.cabang_id = '${cabang_id}' AND sa.jabatan_id = '${jabatan_id}' `
    }

    if (jenis_user_id) {
        if (jenis_user_id === '1') {
            condition += ` AND sa.flag_action = 'Y' AND (sa.kd_status is null or sa.kd_status = '') AND sa.view_only = 'T' AND (
                        NOT EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = sa.pengajuan_id
                              AND x.unit_kerja_id = sa.unit_kerja_id 
                              AND x.jenis_user_id != '1'
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = sa.pengajuan_id
                              AND x.unit_kerja_id = sa.unit_kerja_id
                              AND x.jenis_user_id != '1'
                              AND x.kd_status IN ('VR','UR')
                        )
                     ) `;
            order_by += ` CASE
                            WHEN
                                (
                                NOT EXISTS (
                                    SELECT 1
                                    FROM d_status_pengajuan x
                                    WHERE x.pengajuan_id = sa.pengajuan_id
                                    AND x.unit_kerja_id = sa.unit_kerja_id
                                    AND x.jenis_user_id != '1'
                                )
                                OR EXISTS (
                                    SELECT 1
                                    FROM d_status_pengajuan x
                                    WHERE x.pengajuan_id = sa.pengajuan_id
                                    AND x.unit_kerja_id = sa.unit_kerja_id
                                    AND x.jenis_user_id != '1'
                                    AND x.kd_status IN ('VR','UR')
                                )
                            )
                            THEN 0
                            ELSE 1
                        END ASC, `;
            sortBy = `ASC`;
        } else {
            // condition += ` AND sa.flag_action = 'Y' AND sa.jenis_user_id <> '1' 
            //                 AND sa.unit_kerja_id = '${unit_kerja_id}'
            //                 AND (sa.kd_status is null or sa.kd_status = '') `;
            condition += ` AND sa.flag_action = 'Y' AND sa.jenis_user_id = '${jenis_user_id}' 
                            AND sa.unit_kerja_id = '${unit_kerja_id}'
                            AND (sa.kd_status is null or sa.kd_status = '') `;
            order_by += ` CASE
                            WHEN sa.jenis_user_id <> '1' AND sa.unit_kerja_id = '${unit_kerja_id}'
                            AND (sa.kd_status IS NULL or sa.kd_status = '') 
                            THEN 0
                            ELSE 1
                        END ASC, `;
            sortBy = `ASC`
            // }
        }
    }

    if (role_user_id) {
        role_user += `'${role_user_id}'`
    }

    if (sortBy) {
        order_by += ` a.created_at ${sortBy} `
    }
    const QUERY = query.getListPengajuanPriority
        .replace(/:cte/g, cte)
        .replace(/:condSuperAdmin/g, condSuperAdmin)
        .replace(/:role_user/g, role_user)
        .replace(/:condJabatanId/g, condJabatanId)
        .replace(/:order_row/g, order_row)
        .replace(/:order/g, order_by)
        .replace(/:condRole/g, condRole)
        .replace(/:condition/g, condition)
        .replace(/:condSearch/g, condSearch)

    const COUNT_QUERY = query.countListPengajuanPriority
        .replace(/:cte/g, cte)
        .replace(/:condSuperAdmin/g, condSuperAdmin)
        .replace(/:role_user/g, role_user)
        .replace(/:condJabatanId/g, condJabatanId)
        .replace(/:condRole/g, condRole)
        .replace(/:condition/g, condition)
        .replace(/:condSearch/g, condSearch)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const listPengajuan = await db.query(QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const listPengajuanFix = await Promise.all(
        listPengajuan.map(async (item) => {
            item.lampiran = await this.getPengajuanDokumen({
                pengajuan_id: item.pengajuan_id
            });
            item.child = await this.getChildPengajuan({
                pengajuan_id: item.pengajuan_id,
                // cte: cte,
                order_by: order_row,
                // condition: condition,
                // condSearch: condSearch,
                condJabatanId: condJabatanId
            });

            return item;
        })
    );

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = listPengajuanFix.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listPengajuanFix
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getDashboardSummary = async ({ role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id, unit_id, kategori, detailFilter, periode, ytd }) => {
    let condition = ``, conAnggaran = ``, conBulan = ``;

    if (cabang_id) {
        if (cabang_id !== '2000') {
            condition += ` AND mru.cabang_id = '${cabang_id}' `
        } else {
            if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
                if (!['RL00', 'RL16'].includes(role_id)) {
                    if (['RL01'].includes(role_id)) {
                        condition += ` AND a.role_pembuat_id = '${role_user_id}' `
                        // if (unit_kerja_id) {
                        //     // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                        //     condition += ` AND EXISTS (
                        //         SELECT 1 FROM d_status_pengajuan dsp 
                        //         WHERE dsp.pengajuan_id = a.pengajuan_id 
                        //         AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        //     ) `
                        // }
                    } else if (['RL02'].includes(role_id)) {
                        condition += ` AND mru.cabang_id = '${cabang_id}' `
                        if (unit_kerja_id) {
                            // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                            ) `
                        }
                    } else {
                        const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                        if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                            const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                        } else {
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                            ) `
                        }
                    }
                }
            }
        }
    }

    if (kategori) {
        if (kategori === 'pusat') {
            if (detailFilter) {
                const selectCabang = Object.values(detailFilter);
                if (selectCabang?.length > 0) {
                    // if (selectCabang[0]?.value !== 'All') {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    condition += ` AND mru.cabang_id = '2000' AND mru.unit_id IN (${inCabang}) `
                    // }
                } else {
                    condition += ` AND mru.cabang_id = '2000' `
                }
            } else {
                condition += ` AND mru.cabang_id = '2000' `
            }
        } else {
            if (detailFilter) {
                const selectCabang = Object.values(detailFilter);
                if (selectCabang?.length > 0) {
                    // if (selectCabang[0]?.value !== 'All') {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    condition += ` AND mru.cabang_id IN (${inCabang}) `
                    conAnggaran += ` AND sa.cabang_id IN (${inCabang}) `
                    // }
                }
            }
        }
    }

    if (periode) {
        // condition += ` AND TO_CHAR(a.created_at,'YYYY-MM') = '${periode}' `
        // conBulan += ` AND da.bulan BETWEEN
        //   TO_CHAR(DATE_TRUNC('year', TO_DATE('${periode}', 'YYYY-MM')), 'YYYY-MM')
        //   AND '${periode}' `
        if (ytd === 'false') {
            // condition += ` AND a.bulan = TO_CHAR(TO_DATE('${periode}', 'YYYY-MM'), 'YYYY-MM') `
            condition += ` AND TO_CHAR(a.created_at,'YYYY-MM') = '${periode}' `
            conBulan += ` AND TO_CHAR(TO_DATE(da.bulan, 'YYYY-MM'),'YYYY-MM') = '${periode}' `
            if (kategori === 'pusat') {
                conBulan += ` AND da.cabang_id = '2000' `
            } else {
                if (detailFilter) {
                    const selectCabang = Object.values(detailFilter);
                    if (selectCabang?.length > 0) {
                        const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                        conBulan += ` AND da.cabang_id IN (${inCabang}) `
                    }
                }
            }
        }
        if (ytd === 'true') {
            //     condition += ` AND a.created_at BETWEEN
            //   TO_CHAR(DATE_TRUNC('year', TO_DATE('${periode}', 'YYYY-MM')), 'YYYY-MM')
            //   AND '${periode}' `
            condition += `
                AND a.created_at >= DATE_TRUNC(
                    'year',
                    TO_DATE('${periode}', 'YYYY-MM')
                )
                AND a.created_at < (
                    TO_DATE('${periode}', 'YYYY-MM') + INTERVAL '1 month'
                )
            `
            conBulan += `
                    AND da.bulan BETWEEN
                        TO_CHAR(
                            DATE_TRUNC('year', TO_DATE('${periode}', 'YYYY-MM')),
                            'YYYY-MM'
                        )
                        AND '${periode}'
            `
            if (kategori === 'pusat') {
                conBulan += ` AND da.cabang_id = '2000' `
            } else {
                if (detailFilter) {
                    const selectCabang = Object.values(detailFilter);
                    if (selectCabang?.length > 0) {
                        const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                        conBulan += ` AND da.cabang_id IN (${inCabang}) `
                    }
                }
            }
        }
    } else {
        // conBulan += ` AND da.bulan BETWEEN
        //                 TO_CHAR(DATE_TRUNC('year', CURRENT_DATE), 'YYYY-MM')
        //                 AND TO_CHAR(CURRENT_DATE, 'YYYY-MM') `
        conBulan += ` AND da.bulan = TO_CHAR(CURRENT_DATE, 'YYYY-MM') `
    }

    const QUERY = query.getDashboardSummary
        .replace(/:condition/g, condition)
        .replace(/:conAnggaran/g, conAnggaran)
        .replace(/:conBulan/g, conBulan)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    return result
}

exports.getPengajuanSummary = async ({ kategori, detailFilter, periode, cabang_id, role_id, unit_id, unit_kerja_id, jabatan_id, user_id, ytd, role_user_id }) => {
    let condition = ``;

    if (cabang_id) {
        if (cabang_id !== '2000') {
            condition += ` AND mru.cabang_id = '${cabang_id}' `
        } else {
            if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
                // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
                if (!['RL00', 'RL16'].includes(role_id)) {
                    if (['RL01'].includes(role_id)) {
                        condition += ` AND a.role_pembuat_id = '${role_user_id}' `
                        // if (unit_kerja_id) {
                        //     // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                        //     condition += ` AND EXISTS (
                        //         SELECT 1 FROM d_status_pengajuan dsp 
                        //         WHERE dsp.pengajuan_id = a.pengajuan_id 
                        //         AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        //     ) `
                        // }
                    } else if (['RL02'].includes(role_id)) {
                        condition += ` AND mru.cabang_id = '${cabang_id}' `
                        if (unit_kerja_id) {
                            // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                            ) `
                        }
                    } else {
                        const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                        if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                            const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                        } else {
                            condition += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = a.pengajuan_id 
                            AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                        }
                    }
                }
            }
        }
    }

    if (kategori) {
        if (kategori === 'pusat') {
            if (detailFilter) {
                const selectCabang = Object.values(detailFilter);
                if (selectCabang?.length > 0) {
                    // if (selectCabang[0]?.value !== 'All') {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    condition += ` AND mru.cabang_id = '2000' AND mru.unit_id IN (${inCabang}) `
                    // }
                } else {
                    condition += ` AND mru.cabang_id = '2000' `
                }
            } else {
                condition += ` AND mru.cabang_id = '2000' `
            }
        } else {
            if (detailFilter) {
                const selectCabang = Object.values(detailFilter);
                if (selectCabang?.length > 0) {
                    // if (selectCabang[0]?.value !== 'All') {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    condition += ` AND mru.cabang_id IN (${inCabang}) `
                    // }
                }
            }
        }
    }

    if (periode) {
        // if (ytd === 'false') {
        //     // condition += ` AND a.bulan = TO_CHAR(TO_DATE('${periode}', 'YYYY-MM'), 'YYYY-MM') `
        //     condition += ` AND TO_CHAR(a.created_at,'YYYY-MM') = '${periode}' `
        // }
        // if (ytd === 'true') {
        //     condition += ` AND a.created_at BETWEEN
        //   TO_CHAR(DATE_TRUNC('year', TO_DATE('${periode}', 'YYYY-MM')), 'YYYY-MM')
        //   AND '${periode}' `
        // }

        if (ytd === 'false') {
            // condition += ` AND a.bulan = TO_CHAR(TO_DATE('${periode}', 'YYYY-MM'), 'YYYY-MM') `
            condition += ` AND TO_CHAR(a.created_at,'YYYY-MM') = '${periode}' `
        }
        if (ytd === 'true') {
            condition += `
                AND a.created_at >= DATE_TRUNC(
                    'year',
                    TO_DATE('${periode}', 'YYYY-MM')
                )
                AND a.created_at < (
                    TO_DATE('${periode}', 'YYYY-MM') + INTERVAL '1 month'
                )
            `
        }
    }

    const QUERY = query.getPengajuanSummary
        .replace(/:condition/g, condition)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    return result
}

exports.getMonitoringSummary = async ({ kategori, detailFilter, periode, cabang_id, role_id, unit_id, unit_kerja_id, jabatan_id, user_id, ytd }) => {
    let condition = ``;
    if (cabang_id) {
        if (cabang_id !== '2000') {
            condition += ` AND mru.cabang_id = '${cabang_id}' `
        } else {
            if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
                // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
                if (!['RL00', 'RL16'].includes(role_id)) {
                    if (['RL01'].includes(role_id)) {
                        condition += ` AND a.role_pembuat_id = '${role_user_id}' `
                        // if (unit_kerja_id) {
                        //     // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                        //     condition += ` AND EXISTS (
                        //         SELECT 1 FROM d_status_pengajuan dsp 
                        //         WHERE dsp.pengajuan_id = a.pengajuan_id 
                        //         AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        //     ) `
                        // }
                    } else if (['RL02'].includes(role_id)) {
                        condition += ` AND mru.cabang_id = '${cabang_id}' `
                        if (unit_kerja_id) {
                            // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                            ) `
                        }
                    } else {
                        const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                        if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                            const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                            condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                        } else {
                            condition += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = a.pengajuan_id 
                            AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                        }
                    }
                }
            }
        }
    }
    if (kategori) {
        if (kategori === 'pusat') {
            if (detailFilter) {
                const selectCabang = Object.values(detailFilter);
                if (selectCabang?.length > 0) {
                    // if (selectCabang[0]?.value !== 'All') {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    condition += ` AND mru.cabang_id = '2000' AND mru.unit_id IN (${inCabang}) `
                    // }
                } else {
                    condition += ` AND mru.cabang_id = '2000' `
                }
            } else {
                condition += ` AND mru.cabang_id = '2000' `
            }
        } else {
            if (detailFilter) {
                const selectCabang = Object.values(detailFilter);
                if (selectCabang?.length > 0) {
                    // if (selectCabang[0]?.value !== 'All') {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    condition += ` AND mru.cabang_id IN (${inCabang}) `
                    // }
                }
            }
        }
    }

    if (periode) {
        // condition += ` AND TO_CHAR(a.created_at,'YYYY') = '${periode?.substring(0, 4)}' `
        if (ytd === 'false') {
            condition += ` AND TO_CHAR(a.created_at,'YYYY-MM') = '${periode}' `
        }
        if (ytd === 'true') {
            condition += `
                AND a.created_at >= DATE_TRUNC(
                    'year',
                    TO_DATE('${periode}', 'YYYY-MM')
                )
                AND a.created_at < (
                    TO_DATE('${periode}', 'YYYY-MM') + INTERVAL '1 month'
                )
            `
        }
    } else {
        condition += ` AND EXTRACT(YEAR FROM a.created_at)=EXTRACT(YEAR FROM CURRENT_DATE) `
    }

    const QUERY = query.getMonitoringSummary
        .replace(/:condition/g, condition)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // logging: console.log

    })

    return result
}

exports.getPengajuanOmset = async ({ role_id, cabang_id, periode }) => {
    let cabang = ``, coa_detail = ``, bulan = ``;
    if (cabang_id) {
        const inCabang = cabang_id.map(item => `'${item.value}'`).join(",")
        cabang = `${inCabang}`
    } else {
        if (role_id === 'RL00') {
            cabang = `'2000'`
        }
    }

    // if (coa_detail_id) {
    //     coa_detail = ` AND a.coa_detail_id = '${coa_detail_id}' `
    // } else {
    //     coa_detail = ``
    // }

    if (periode) {
        bulan = periode
    } else {
        bulan = moment().format('YYYY-MM')
    }

    const QUERY = query.getPengajuanOmset
        .replace(/:cabang_id/g, cabang)
        // .replace(/:coa_detail_id/g, coa_detail)
        .replace(/:bulan/g, bulan)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    return result
}

exports.getMenungguPembayaran = async ({ page, limit, range, cabang_id, role_id, unit_kerja_id, jabatan_id, user_id }) => {
    let filterRange = ``;
    let condition = ``;

    if (range?.start && range?.end) {
        filterRange = ` and a.created_at between TO_DATE('${range?.start}', 'YYYY-MM-DD') AND TO_DATE('${range?.end}', 'YYYY-MM-DD') `
    }
    if (cabang_id !== '2000') {
        condition += ` AND b.cabang_id = '${cabang_id}' `
    } else {
        if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
            // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
            if (!['RL00', 'RL16'].includes(role_id)) {
                if (['RL01', 'RL02'].includes(role_id)) {
                    condition += ` AND b.cabang_id = '${cabang_id}' `
                    if (unit_kerja_id) {
                        condition += ` AND b.unit_kerja_id = '${unit_kerja_id}' `
                    }
                } else {
                    const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                    if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                        const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                    } else {
                        condition += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = a.pengajuan_id 
                            AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                    }
                }
            }
        }
    }

    const QUERY = query.getMenungguPembayaran
        .replace(/:range/g, filterRange)
        .replace(/:condition/g, condition)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const result = await db.query(QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const statusData = result.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: result[0].total_data,
                total_halaman: result[0].total_halaman,
                limit: limit,
                list_data: result
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getPengajuanDashboard = async ({ page, limit, status, cabang_id, role_id, unit_kerja_id, jabatan_id, user_id }) => {
    let condition = ``;
    let condition2 = ``;

    if (status) {
        if (status === 'DIAJUKAN') {
            condition += ` AND (sp.kd_status IS NULL OR sp.kd_status = '') AND sp.role_id = 'RL02' `
        }
        if (status === 'VERIFIKASI') {
            condition += ` AND (sp.kd_status IS NULL OR sp.kd_status = '') AND sp.jenis_user_id != '1' `
        }
        if (status === 'APPROVAL') {
            condition += ` AND (sp.kd_status IS NULL OR sp.kd_status = '') AND sp.role_id not in ('RL01', 'RL02') AND sp.jenis_user_id = '1' `
        }
        if (status === 'SELESAI') {
            condition += ` AND sp.kd_status = 'S2' AND sp.role_id != 'RL01' `
        }
        if (status === 'DITOLAK') {
            condition += ` AND sp.kd_status = 'T' `
        }
    }
    if (cabang_id !== '2000') {
        condition += ` AND b.cabang_id = '${cabang_id}' `
        condition2 += ` AND b.cabang_id = '${cabang_id}' `
    } else {
        if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
            // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
            if (!['RL00', 'RL16'].includes(role_id)) {
                if (['RL01', 'RL02'].includes(role_id)) {
                    condition += ` AND b.cabang_id = '${cabang_id}' `
                    condition2 += ` AND b.cabang_id = '${cabang_id}' `
                    if (unit_kerja_id) {
                        condition += ` AND b.unit_kerja_id = '${unit_kerja_id}' `
                        condition2 += ` AND b.unit_kerja_id = '${unit_kerja_id}' `
                    }
                } else {
                    const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                    if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                        const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                        condition2 += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                    } else {
                        condition += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = a.pengajuan_id 
                            AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                        condition2 += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = a.pengajuan_id 
                            AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                    }
                }
            }
        }
    }

    const QUERY = query.getPengajuanDashboard
        .replace(/:condition/g, condition)

    const QUERYSUMMARY = query.getSummaryPengajuanDashboard
        .replace(/:condition/g, condition2)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const result = await db.query(QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const resultSummary = await db.query(QUERYSUMMARY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = result.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                summary: resultSummary,
                total_data: result[0].total_data,
                total_halaman: result[0].total_halaman,
                limit: limit,
                list_data: result
            } : {
                summary: resultSummary,
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getTaskAktifMingguIni = async ({ page, limit, status, cabang_id, role_id, unit_kerja_id, jenis_user_id }) => {
    let condition = ``;
    let semua = ``;
    let menunggu_approval = ``;
    let diproses = ``;
    let ditolak = ``;

    if (status) {
        if (status === 'semua') {
            condition += ` AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}'`
        }
        if (status === 'menunggu_approval') {
            condition += ` AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}' AND (s.kd_status is null or s.kd_status = '') `
        }
        if (status === 'diproses') {
            condition += ` AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}' AND s.kd_status is not null `
        }
        if (status === 'ditolak') {
            condition += ` AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}' AND s.kd_status = 'T' `
        }
    }
    if (cabang_id !== '2000') {
        condition += ` AND b.cabang_id = '${cabang_id}' `
        // condition2 += ` AND b.cabang_id = '${cabang_id}' `
    }

    if (jenis_user_id && unit_kerja_id) {
        semua += `WHERE s.view_only = 'T' AND s.role_id != 'RL01' AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}'`
        menunggu_approval += `WHERE s.view_only = 'T' AND s.role_id != 'RL01' AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}' AND (s.kd_status is null or s.kd_status = '')`
        diproses += `WHERE s.view_only = 'T' AND s.role_id != 'RL01' AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}' AND s.kd_status is not null`
        ditolak += `WHERE s.view_only = 'T' AND s.role_id != 'RL01' AND s.unit_kerja_id = '${unit_kerja_id}' AND s.jenis_user_id = '${jenis_user_id}' AND s.kd_status = 'T'`
    }

    const QUERY = query.getTaskAktifMingguIni
        .replace(/:condition/g, condition)

    const QUERYSUMMARY = query.getSummaryTaskAktifMingguIni
        .replace(/:semua/g, semua)
        .replace(/:menunggu_approval/g, menunggu_approval)
        .replace(/:diproses/g, diproses)
        .replace(/:ditolak/g, ditolak)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const result = await db.query(QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const resultSummary = await db.query(QUERYSUMMARY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = result.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                summary: resultSummary,
                total_data: result[0].total_data,
                total_halaman: result[0].total_halaman,
                limit: limit,
                list_data: result
            } : {
                summary: resultSummary,
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getSLAOverview = async ({ cabang_id, coa_detail_id, periode }) => {

    const QUERY = query.getSLAOverview
    // .replace(/:cabang_id/g, cabang)
    // .replace(/:coa_detail_id/g, coa_detail)
    // .replace(/:bulan/g, bulan)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    return result
}

exports.getSLAPerformance = async ({ periode }) => {
    let condition = ``

    if (periode) {
        condition += ` AND TO_CHAR(d.start_status, 'YYYY-MM') = '${periode}'`
    }

    const QUERY = query.getSLAPerformance
        .replace(/:condition/g, condition)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    return result
}

exports.getListAllPengajuan = async ({ keyword, page, limit, sortBy = 'ASC', download, cabang_id, jabatan_id, user_id, role_id, unit_kerja_id }) => {
    // console.log(unit_kerja_id, 'unit_kerja_id');

    const order_row = `ORDER BY a.created_at ${sortBy}`;
    let order_by = ``, cabang = ``, bulan = ``, condition = ``;

    if (download?.selectedCabang) {
        // console.log('masuk pak eki');

        const selectCabang = Object.values(download?.selectedCabang);
        if (selectCabang && selectCabang.length > 0) {
            // if (download?.selectedCabang[0]?.value !== 'All') {
            if (cabang_id !== '2000') {
                cabang += ` AND mru.cabang_id = '${cabang_id}' `
            } else {
                if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
                    // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
                    if (!['RL00', 'RL16'].includes(role_id)) {
                        if (['RL01', 'RL02'].includes(role_id)) {
                            cabang += ` AND mru.cabang_id = '${cabang_id}' `
                            // console.log('masuk eko');

                            if (unit_kerja_id) {
                                // console.log('masuk eko2');
                                cabang += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                            }
                        } else {
                            const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                            if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                                const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                                cabang += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                            } else {
                                cabang += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                                ) `

                            }
                        }
                    }
                } else {
                    const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
                    cabang += ` AND mru.cabang_id IN (${inCabang}) `
                }
            }
            // }
        }
    } else {
        if (cabang_id !== '2000') {
            cabang += ` AND mru.cabang_id = '${cabang_id}' `
        } else {
            if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
                // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
                if (!['RL00', 'RL16'].includes(role_id)) {
                    if (['RL01', 'RL02'].includes(role_id)) {
                        cabang += ` AND mru.cabang_id = '${cabang_id}' `
                        // console.log('masuk eko');

                        if (unit_kerja_id) {
                            // console.log('masuk eko2');
                            cabang += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                        }
                    } else {
                        const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                        if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                            const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                            cabang += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                        } else {
                            cabang += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                                ) `

                        }
                    }
                }
            }
        }
    }

    if (download?.bulan) {
        bulan += ` AND TO_CHAR(a.created_at, 'YYYY-MM') = '${download?.bulan}' `
    }

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (a.no_pengajuan LIKE '%${keyword}%'
                            OR upper(v.nama_vendor) LIKE upper('%${keyword}%')
                            OR upper(a.no_kasbon_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_memo) LIKE upper('%${keyword}%')
                            OR upper(a.no_voucher_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_voucher_payment) LIKE upper('%${keyword}%')
                            OR upper(a.keterangan) LIKE upper('%${keyword}%')
                            OR upper(a.no_invoice) LIKE upper('%${keyword}%')
                            OR upper(a.no_faktur_pajak) LIKE upper('%${keyword}%')
                            OR upper(v.npwp_vendor) LIKE upper('%${keyword}%')
                            OR upper(mr1.ur_ref) LIKE upper('%${keyword}%') 
                            OR upper(mr3.ur_ref) LIKE upper('%${keyword}%') 
                            OR upper(mu.nip) LIKE upper('%${keyword}%') 
                            OR upper(mu.nama) LIKE upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1
                                FROM d_pengajuan X
                                WHERE X.parent_id = a.pengajuan_id 
                                AND X.flag_aktif = 'N'
                                AND (
                                    UPPER(X.no_pengajuan) LIKE UPPER('%${keyword}%')
                                )
                            )) `

    }

    const QUERY = query.getListAllPengajuan
        .replace(/:order/g, order_by)
        .replace(/:cabang/g, cabang)
        .replace(/:bulan/g, bulan)
        .replace(/:condition/g, condition)

    const QUERY_SUMMARY = query.getSummaryReport
        .replace(/:cabang/g, cabang)
        .replace(/:bulan/g, bulan)

    const COUNT_QUERY = query.countListAllPengajuan
        .replace(/:cabang/g, cabang)
        .replace(/:bulan/g, bulan)
        .replace(/:condition/g, condition)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const summaryData = await db.query(QUERY_SUMMARY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const listPengajuan = await db.query(QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = listPengajuan.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                summary: summaryData,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listPengajuan
            } : {
                total_data: 0,
                summary: {},
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListAllPengajuanDashboard = async ({ keyword, page, limit, tipe, download, cabang_id, role_id, unit_kerja_id, jabatan_id, user_id, role_user }) => {
    const order_row = `ORDER BY a.no_pengajuan ASC`;
    let order_by = ``, cabang = ``, bulan = ``, condition = ``;

    if (cabang_id !== '2000') {
        cabang += ` AND mru.cabang_id = '${cabang_id}' `
    } else {
        if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
            // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
            if (!['RL00', 'RL16'].includes(role_id)) {
                if (['RL01', 'RL02'].includes(role_id)) {
                    condition += ` AND mru.cabang_id = '${cabang_id}' `
                    if (unit_kerja_id) {
                        // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                            ) `
                    }
                } else {
                    const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                    if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                        const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                    } else {
                        condition += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = a.pengajuan_id 
                            AND dsp.role_id = '${role_id}' AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                    }
                }
            }
        }
    }

    if (role_user) {
        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.role_id = '${role_user}' AND dsp.start_status IS NOT NULL
                                AND dsp.view_only = 'T'
                                AND dsp.jenis_user_id = '1'
                                AND dsp.unit_id IS NOT NULL
                            ) `
    }

    if (tipe) {
        if (tipe === 'total_pengajuan') {
            condition += ``
        }
        if (tipe === 'sudah_dibayarkan') {
            condition += ` AND a.flag_aktif = 'Y' AND a.tgl_pembayaran IS NOT NULL `
        }
        if (tipe === 'pengajuan_baru') {
            condition += ` AND sp.flag_action='Y'
          AND sp.role_id='RL02' `
        }
        if (tipe === 'menunggu_verifikasi') {
            condition += ` AND a.tgl_pembayaran IS NULL
          AND sp.flag_action='Y'
          AND sp.role_id NOT IN ('RL15', 'RL01', 'RL02', 'RL09', 'RL10', 'RL11') `
        }
        if (tipe === 'menunggu_pembayaran') {
            condition += ` AND a.tgl_pembayaran IS NULL
          AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15') `;
        }
        if (tipe === 'ditolak') {
            condition += ` AND sp.kd_status='T' `
        }
        if (tipe === 'on_sla') {
            condition += ` AND ps.is_over = 0 `
        }
        if (tipe === 'over_sla') {
            condition += ` AND ps.is_over = 1 `
        }
    }

    if (keyword && (keyword !== null || keyword !== '') && download === 'false') {
        condition += ` AND
                            (a.no_pengajuan LIKE '%${keyword}%'
                            OR upper(v.nama_vendor) LIKE upper('%${keyword}%')
                            OR upper(a.no_kasbon_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_memo) LIKE upper('%${keyword}%')
                            OR upper(a.no_voucher_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_invoice) LIKE upper('%${keyword}%')
                            OR upper(a.no_faktur_pajak) LIKE upper('%${keyword}%')
                            OR upper(v.npwp_vendor) LIKE upper('%${keyword}%')
                            OR upper(mr1.ur_ref) LIKE upper('%${keyword}%') 
                            OR upper(mu.nip) LIKE upper('%${keyword}%') 
                            OR upper(mu.nama) LIKE upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1
                                FROM d_pengajuan X
                                WHERE X.parent_id = a.pengajuan_id 
                                AND X.flag_aktif = 'N'
                                AND (
                                    UPPER(X.no_pengajuan) LIKE UPPER('%${keyword}%')
                                )
                            )) `

    }

    const QUERY = download === 'true' ?
        query.getListAllPengajuanDashboardDownload
            .replace(/:cabang/g, cabang)
            .replace(/:condition/g, condition)
        :
        query.getListAllPengajuanDashboard
            .replace(/:order/g, order_by)
            .replace(/:cabang/g, cabang)
            .replace(/:condition/g, condition)
    // .replace(/:bulan/g, bulan)

    const COUNT_QUERY = query.countListAllPengajuanDashboard
        .replace(/:cabang/g, cabang)
        .replace(/:condition/g, condition)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const listPengajuan = await db.query(QUERY, {
        replacements: download === 'true' ? {} : bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = listPengajuan.length > 0 ? true : false

    return {
        status: statusData,
        data: download === 'true' ?
            listPengajuan
            :
            statusData ?
                {
                    total_data: countData.total_data,
                    total_halaman: countData.total_halaman,
                    limit: countData.limit,
                    list_data: listPengajuan
                } : {
                    total_data: 0,
                    total_halaman: null,
                    limit: null,
                    list_data: []
                }
    }
}

exports.getListAllPengajuanSLAPerformance = async ({ keyword, page, limit, tipe, download, cabang_id, role_id, unit_kerja_id, jabatan_id, user_id, role_user }) => {
    const order_row = `ORDER BY a.no_pengajuan ASC`;
    let order_by = ``, cabang = ``, bulan = ``, condition = ``, condSLA = ``;

    if (cabang_id !== '2000') {
        cabang += ` AND mru.cabang_id = '${cabang_id}' `
    } else {
        if (!['RL10', 'RL11', 'RL13'].includes(role_id)) {
            // condition += ` AND mru.cabang_id = '${cabang_id}' AND mru.unit_id = '${unit_id}' `
            if (!['RL00', 'RL16'].includes(role_id)) {
                if (['RL01', 'RL02'].includes(role_id)) {
                    condition += ` AND mru.cabang_id = '${cabang_id}' `
                    if (unit_kerja_id) {
                        // condition += ` AND mru.unit_kerja_id = '${unit_kerja_id}' `
                        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = d.pengajuan_id 
                                AND dsp.unit_kerja_id = '${unit_kerja_id}'
                            ) `
                    }
                } else {
                    const roleDirut = await model.m_direktur_unit.findAll({ where: { user_id: user_id } })

                    if (jabatan_id === 'JB007' && roleDirut?.length > 0) {
                        const inCabang = [...new Set(roleDirut.map(a => `'${a.unit_id}'`))].join(',')
                        condition += ` AND EXISTS (
                                SELECT 1 FROM d_status_pengajuan dsp 
                                WHERE dsp.pengajuan_id = a.pengajuan_id 
                                AND dsp.unit_id IN (${inCabang})
                                ) `
                    } else {
                        condition += ` AND EXISTS (
                            SELECT 1 FROM d_status_pengajuan dsp 
                            WHERE dsp.pengajuan_id = d.pengajuan_id 
                            AND dsp.role_id = '${role_id}' 
                            --AND dsp.unit_kerja_id = '${unit_kerja_id}'
                        ) `
                    }
                }
            }
        }
    }

    if (role_user) {
        condition += ` AND d.role_id = '${role_user}' `
    }

    if (tipe) {
        if (tipe === 'on_sla') {
            condSLA += ` AND ps.over_sla = 0 `
        }
        if (tipe === 'over_sla') {
            condSLA += ` AND ps.over_sla > 0 `
        }
    }

    if (keyword && (keyword !== null || keyword !== '') && download === 'false') {
        condition += ` AND
                            (a.no_pengajuan LIKE '%${keyword}%'
                            OR upper(v.nama_vendor) LIKE upper('%${keyword}%')
                            OR upper(a.no_kasbon_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_memo) LIKE upper('%${keyword}%')
                            OR upper(a.no_voucher_sap) LIKE upper('%${keyword}%')
                            OR upper(a.no_invoice) LIKE upper('%${keyword}%')
                            OR upper(a.no_faktur_pajak) LIKE upper('%${keyword}%')
                            OR upper(v.npwp_vendor) LIKE upper('%${keyword}%')
                            OR upper(mr1.ur_ref) LIKE upper('%${keyword}%') 
                            OR upper(mu.nip) LIKE upper('%${keyword}%') 
                            OR upper(mu.nama) LIKE upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1
                                FROM d_pengajuan X
                                WHERE X.parent_id = a.pengajuan_id 
                                AND X.flag_aktif = 'N'
                                AND (
                                    UPPER(X.no_pengajuan) LIKE UPPER('%${keyword}%')
                                )
                            )) `

    }

    const QUERY = download === 'true' ?
        query.getListAllPengajuanSLAPerformanceDownload
            // .replace(/:cabang/g, cabang)
            .replace(/:condition/g, condition)
            .replace(/:condSLA/g, condSLA)
        :
        query.getListAllPengajuanSLAPerformance
            // .replace(/:order/g, order_by)
            // .replace(/:cabang/g, cabang)
            .replace(/:condition/g, condition)
            .replace(/:condSLA/g, condSLA)
    // .replace(/:bulan/g, bulan)

    const COUNT_QUERY = query.countListAllPengajuanSLAPerformance
        // .replace(/:cabang/g, cabang)
        .replace(/:condition/g, condition)
        .replace(/:condSLA/g, condSLA)

    const bindListPengajuan = {
        page: page,
        limit: limit
    }

    const listPengajuan = await db.query(QUERY, {
        replacements: download === 'true' ? {} : bindListPengajuan,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindListPengajuan,
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const statusData = listPengajuan.length > 0 ? true : false

    return {
        status: statusData,
        data: download === 'true' ?
            listPengajuan
            :
            statusData ?
                {
                    total_data: countData.total_data,
                    total_halaman: countData.total_halaman,
                    limit: countData.limit,
                    list_data: listPengajuan
                } : {
                    total_data: 0,
                    total_halaman: null,
                    limit: null,
                    list_data: []
                }
    }
}

exports.getDetailPengajuan = async ({ pengajuan_id, role_id, user_id, role_user_id, cabang_id, unit_kerja_id, jabatan_id, jenis_user_id }) => {
    let condRole = ``;
    let condRole2 = ``;
    if (unit_kerja_id !== '' && unit_kerja_id !== null) {
        condRole = ` AND s.unit_kerja_id = '${unit_kerja_id}' `
        condRole2 = ` AND x.unit_kerja_id = '${unit_kerja_id}' `
    }

    const QUERY = query.getDetailPengajuan
        .replace(/:condRole/g, condRole)
        .replace(/:condRol2/g, condRole2)

    const result = await db.query(QUERY, {
        replacements: { pengajuan_id, role_user_id },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const resultDok = await db.query(query.getDokumen, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const resultCoa = await db.query(query.getCoaPengajuan, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const resultOmset = await db.query(query.getOmset, {
        replacements: { pengajuan_id, cabang_id: result?.cabang_id, bulan: result?.created_at },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const resultStatus = await db.query(query.getStatusPengajuan, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const resultStatusPenolakan = await db.query(query.getStatusPenolakan, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const status_history = await Promise.all(
        resultStatus.map(async (item) => {
            let condition = ``
            const dataHistory = await model.d_status_pengajuan_history.findOne({
                where: {
                    status_id: item?.status_id,
                },
                order: [["created_at", "DESC"]],
            });

            item.history = dataHistory;
            if (dataHistory) {
                if (result?.jenis_biaya_id?.substring(0, 2) === 'KC') {
                    if (['RL01', 'RL02'].includes(item?.role_id)) {
                        condition = ` AND b.role_id = '${item?.role_id}' AND b.cabang_id = '${result?.cabang_id}' `
                    } else {
                        condition = ` AND b.role_id = '${item?.role_id}' AND b.unit_kerja_id = '${item?.unit_kerja_id}' AND b.jabatan_id = '${item?.jabatan_id}' AND b.jenis_user_id = '1' `
                    }
                } else {
                    if (['RL02'].includes(item?.role_id)) {
                        condition = ` AND b.unit_kerja_id = '${item?.unit_kerja_id}' AND b.jabatan_id = '${item?.jabatan_id}' `
                    } else {
                        condition = ` AND b.role_id = '${item?.role_id}' AND b.unit_kerja_id = '${item?.unit_kerja_id}' AND b.jabatan_id = '${item?.jabatan_id}' `
                    }
                }
                const USER_AKTIF = query.getUserStatus
                    .replace(/:condition/g, condition)
                const userAktif = await db.query(USER_AKTIF, {
                    replacements: {},
                    type: db.QueryTypes.SELECT,
                    plain: true
                })
                const dataUser = await model.m_user.findOne({
                    attributes: ['nip', 'nama'],
                    where: {
                        user_id: dataHistory?.user_id,
                    },
                    plain: true,
                });
                if (dataUser?.nip === userAktif?.nip) {
                    item.user = dataUser;
                } else {
                    item.user = userAktif;
                }
            } else {
                if (result?.jenis_biaya_id?.substring(0, 2) === 'KC') {
                    if (['RL01', 'RL02'].includes(item?.role_id)) {
                        condition = ` AND b.role_id = '${item?.role_id}' AND b.cabang_id = '${result?.cabang_id}' `
                    } else {
                        condition = ` AND b.role_id = '${item?.role_id}' AND b.unit_kerja_id = '${item?.unit_kerja_id}' AND b.jabatan_id = '${item?.jabatan_id}' AND b.jenis_user_id = '1' `
                    }
                } else {
                    if (['RL02'].includes(item?.role_id)) {
                        condition = ` AND b.unit_kerja_id = '${item?.unit_kerja_id}' AND b.jabatan_id = '${item?.jabatan_id}' `
                    } else {
                        condition = ` AND b.role_id = '${item?.role_id}' AND b.unit_kerja_id = '${item?.unit_kerja_id}' AND b.jabatan_id = '${item?.jabatan_id}' `
                    }
                }
                const QUERY_USER = query.getUserStatus
                    .replace(/:condition/g, condition)
                item.user = await db.query(QUERY_USER, {
                    replacements: {},
                    type: db.QueryTypes.SELECT,
                    plain: true
                })
            }
            return item;
        })
    );

    return {
        ...result,
        lampiran: resultDok,
        coa: resultCoa,
        status_history: status_history,
        history_penolakan: resultStatusPenolakan,
        summary_info: resultOmset
    }
}

exports.getDetailPengajuanNoAuth = async ({ pengajuan_id }) => {
    let condRole = ``;
    let condRole2 = ``;

    const QUERY = query.getDetailPengajuanNoAuth
        .replace(/:condRole/g, condRole)
        .replace(/:condRol2/g, condRole2)

    const result = await db.query(QUERY, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const resultDok = await db.query(query.getDokumen, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const resultCoa = await db.query(query.getCoaPengajuan, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const resultStatus = await db.query(query.getStatusPengajuan, {
        replacements: { pengajuan_id },
        type: db.QueryTypes.SELECT
    })

    const status_history = await Promise.all(
        resultStatus.map(async (item) => {
            item.history = await model.d_status_pengajuan_history.findOne({
                where: {
                    status_id: item?.status_id,
                },
                order: [["created_at", "DESC"]],
            });
            return item;
        })
    );

    return {
        ...result,
        lampiran: resultDok,
        coa: resultCoa,
        status_history: status_history
    }
}

exports.getDetailUser = async ({ user_id }) => {
    const result = await db.query(query.getDetailUser, {
        replacements: { user_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const resultRole = await db.query(query.getRoleUser, {
        replacements: { user_id },
        type: db.QueryTypes.SELECT
    })

    return {
        ...result,
        role: resultRole
    }
}

exports.getDetailStatus = async ({ status }) => {
    const result = await db.query(query.getDetailStatus, {
        replacements: { status },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    return result
}

exports.getDataUser = async ({ tipe_user, cabang_id, role_id, unit_kerja_id }) => {
    let condition = ``;
    if (role_id !== 'RL00') {
        if (cabang_id !== '2000') {
            condition = ` AND b.cabang_id = '${cabang_id}' AND b.jabatan_id = 'JB002' `
        } else {
            condition = ` AND b.unit_kerja_id = '${unit_kerja_id}' AND (a.tipe_user IN ('1','2') OR b.role_id = 'RL01') `
        }
    }
    const QUERY = query.getDataUser.replace(/:condition/g, condition)
    const result = await db.query(QUERY, {
        replacements: { tipe_user, condition },
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    return result
}

exports.getDataMasterApprovalByHeader = async ({ header_jenis_biaya_id, nominal, jabatan_pemohon_id }) => {
    let header_jenis_biaya = ``, jenis_biaya = ``, unit_kerja = ``, jabatan = ``;
    if (jenis_biaya_id) {
        jenis_biaya += `and a.jenis_biaya_id = '${jenis_biaya_id}'`
    }
    if (unit_kerja_pemohon_id) {
        unit_kerja += `and a.unit_kerja_pemohon_id = '${unit_kerja_pemohon_id}'`
    }
    if (jabatan_pemohon_id) {
        jabatan += `and a.jabatan_pemohon_id = '${jabatan_pemohon_id}'`
    }

    const QUERY_HEADER = query.getDataMasterApproval
        .replace(/:header_jenis_biaya/g, jenis_biaya)
        .replace(/:nominal/g, unit_kerja)

    const result = await db.query(QUERY_HEADER, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    const QUERY = query.getDataMasterApproval
        .replace(/:jenis_biaya/g, jenis_biaya)
        .replace(/:nominal/g, unit_kerja)
        .replace(/:jabatan/g, jabatan)

    const result2 = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    // return result
}

exports.getDataMasterApproval = async ({ jenis_biaya_id, unit_kerja_pemohon_id, jabatan_pemohon_id }) => {
    let jenis_biaya = ``, unit_kerja = ``, jabatan = ``;
    if (jenis_biaya_id) {
        jenis_biaya += `and a.jenis_biaya_id = '${jenis_biaya_id}'`
    }
    if (unit_kerja_pemohon_id) {
        unit_kerja += `and a.unit_kerja_pemohon_id = '${unit_kerja_pemohon_id}'`
    }
    if (jabatan_pemohon_id) {
        jabatan += `and a.jabatan_pemohon_id = '${jabatan_pemohon_id}'`
    }

    const QUERY = query.getDataMasterApproval
        .replace(/:jenis_biaya/g, jenis_biaya)
        .replace(/:unit_kerja/g, unit_kerja)
        .replace(/:jabatan/g, jabatan)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    return result
}

exports.getDataMasterApprovalAll = async ({ jenis_biaya_id, unit_kerja_pemohon_id, jabatan_pemohon_id }) => {
    let jenis_biaya = ``, unit_kerja = ``, jabatan = ``;
    if (jenis_biaya_id) {
        jenis_biaya += `and a.jenis_biaya_id = '${jenis_biaya_id}'`
    }
    if (unit_kerja_pemohon_id) {
        unit_kerja += `and a.unit_kerja_pemohon_id = '${unit_kerja_pemohon_id}'`
    }
    if (jabatan_pemohon_id) {
        jabatan += `and a.jabatan_pemohon_id = '${jabatan_pemohon_id}'`
    }

    const QUERY = query.getDataMasterApprovalAll
        .replace(/:jenis_biaya/g, jenis_biaya)
        .replace(/:unit_kerja/g, unit_kerja)
        .replace(/:jabatan/g, jabatan)

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    return result
}

exports.getDetailMasterData = async ({ ref_id }) => {
    const result = await model.m_referensi.findOne({ where: { ref_id } })
    return result
}

exports.getDetailJenisPajak = async ({ jenis_pajak_id }) => {
    const result = await db.query(query.getDetailJenisPajak, {
        replacements: { jenis_pajak_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    return result
}

exports.getDetailVendor = async ({ vendor_id }) => {
    const result = await db.query(query.getDetailVendor, {
        replacements: { vendor_id },
        type: db.QueryTypes.SELECT,
        plain: true
    })
    return result
}

exports.getDetailAnggaran = async ({ anggaran_id }) => {
    const result = await db.query(query.getDetailAnggaran, {
        replacements: { anggaran_id },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })
    // const resultHistory = await model.d_penambahan_anggaran.findAll({ where: { anggaran_id } })
    return { ...result }
}

exports.getDetailAnggaranByCoa = async ({ coa_detail_id, cabang_id, pengajuan_id }) => {
    let bulan = moment().format('YYYY-MM');
    if (pengajuan_id) {
        const pengajuan = await model.d_pengajuan.findOne({ where: { pengajuan_id }, attributes: ['created_at'], raw: true })
        bulan = moment(pengajuan.created_at).format('YYYY-MM')
    } else {
        bulan = moment().format('YYYY-MM')
    }
    const result = await db.query(query.getDetailAnggaranByCoa, {
        replacements: { coa_detail_id, cabang_id, bulan },
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    })

    return result
}

exports.getDataVendor = async () => {
    const result = await model.m_vendor.findAll({ raw: true })
    return result
}

exports.insertStatusPengajuan = async (payload, transaction) => {
    Object.assign(payload, { qrcode: `${LINK_QRCODE}?status=${payload?.history_id}` })
    const saveData = await model.d_status_pengajuan_history.create(payload, { transaction, returning: true })

    if (payload?.status_verifikasi) {
        const updateFlagAction = await model.d_status_pengajuan.update({ flag_action: 'T' }, { where: { pengajuan_id: payload?.pengajuan_id } })
        const dataPengajuan = await model.d_status_pengajuan.findOne({ where: { status_id: payload?.status_id }, raw: true })
        // const payUpdate = {
        //     status_id: payload?.status_id,
        //     // ...((dataCheck?.view_only === 'T' || dataCheck?.wajib_verifikasi === 'Y') ? { status_verifikasi: payload?.status_verifikasi === 'P' ? null : payload?.status_verifikasi } : {}),
        //     // ...(payload?.status_verifikasi === 'P' && (dataCheck?.view_only === 'T' || dataCheck?.wajib_verifikasi === 'Y') ? { tgl_verifikasi: null } : {}),
        //     // ...(payload?.status_verifikasi === 'Y' ? { tgl_verifikasi: moment().format('YYYY-MM-DD HH:mm:ss') } : {}),
        //     notes: payload?.catatan,
        //     end_status: moment().format('YYYY-MM-DD HH:mm:ss'),
        //     date_status: moment().format('YYYY-MM-DD HH:mm:ss'),
        //     kd_status: payload?.kd_status
        // }
        // await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
        if (updateFlagAction) {
            if (['VR', 'UR'].includes(payload?.kd_status) === true) {
                if (dataPengajuan?.no_urut) {
                    const totalData = await model.d_status_pengajuan.count({ where: { pengajuan_id: payload?.pengajuan_id } })
                    if (dataPengajuan?.no_urut === totalData) {
                        const slaHari = moment().diff(
                            moment(dataPengajuan?.start_status),
                            'days'
                        );
                        const payUpdate = {
                            status_id: payload?.status_id,
                            kd_status: payload?.kd_status,
                            date_status: new Date(),
                            end_status: new Date(),
                            sla: slaHari,
                            notes: payload?.catatan,
                            created_by: payload?.created_by
                        }
                        await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
                        // const payUpdate2 = {
                        //     pengajuan_id: payload?.pengajuan_id,
                        //     no_urut: Number(payload?.no_urut) + 1,
                        //     start_status: new Date(),
                        //     flag_show: 'Y',
                        //     flag_action: 'Y'
                        // }
                        // await model.d_status_pengajuan.update(payUpdate2, { where: { pengajuan_id: payUpdate2?.pengajuan_id, no_urut: payUpdate2?.no_urut } })
                        if (payload?.tgl_pembayaran) {
                            await model.d_pengajuan.update({
                                tgl_pembayaran: payload?.tgl_pembayaran
                            }, { where: { pengajuan_id: payload?.pengajuan_id } })
                        }
                    } else {
                        const slaHari = moment().diff(
                            moment(dataPengajuan?.start_status),
                            'days'
                        );
                        const payUpdate = {
                            status_id: payload?.status_id,
                            kd_status: payload?.kd_status,
                            date_status: new Date(),
                            end_status: new Date(),
                            sla: slaHari,
                            notes: payload?.catatan,
                            created_by: payload?.created_by
                        }
                        await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
                        const dataCheck = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: Number(dataPengajuan?.no_urut) + 1 }, raw: true })
                        if (['Y', 'YY'].includes(dataCheck?.view_only) === true) {
                            const payUpdate2 = {
                                pengajuan_id: payload?.pengajuan_id,
                                no_urut: Number(dataPengajuan?.no_urut) + 1,
                                start_status: new Date(),
                                flag_show: 'Y',
                                flag_action: 'T'
                            }
                            await model.d_status_pengajuan.update(payUpdate2, { where: { pengajuan_id: payUpdate2?.pengajuan_id, no_urut: payUpdate2?.no_urut } })
                            const payUpdate3 = {
                                pengajuan_id: payload?.pengajuan_id,
                                no_urut: Number(dataPengajuan?.no_urut) + 2,
                                start_status: new Date(),
                                flag_show: 'Y',
                                flag_action: 'Y'
                            }
                            await model.d_status_pengajuan.update(payUpdate3, { where: { pengajuan_id: payUpdate3?.pengajuan_id, no_urut: payUpdate3?.no_urut } })

                            const dataNotif = await model.d_notifikasi.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })
                            if (dataNotif) {
                                const dataStatus = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: payUpdate3?.no_urut } })

                                const userToNotif = await model.m_role_user.findAll({ where: { unit_kerja_id: dataStatus?.unit_kerja_id, jabatan_id: dataStatus?.jabatan_id, jenis_user_id: dataStatus?.jenis_user_id }, returning: true })
                                const payNotif = {
                                    notifikasi_id: dataNotif?.notifikasi_id,
                                    user: [...new Set(userToNotif.map(a => a.user_id))]
                                }
                                await this.insertNotifikasiPush(payNotif, transaction)
                            }
                        } else {
                            const payUpdate2 = {
                                pengajuan_id: payload?.pengajuan_id,
                                no_urut: Number(dataPengajuan?.no_urut) + 1,
                                start_status: new Date(),
                                flag_show: 'Y',
                                flag_action: 'Y'
                            }
                            await model.d_status_pengajuan.update(payUpdate2, { where: { pengajuan_id: payUpdate2?.pengajuan_id, no_urut: payUpdate2?.no_urut } })

                            const dataNotif = await model.d_notifikasi.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })
                            if (dataNotif) {
                                const dataStatus = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: payUpdate2?.no_urut } })

                                const userToNotif = await model.m_role_user.findAll({ where: { unit_kerja_id: dataStatus?.unit_kerja_id, jabatan_id: dataStatus?.jabatan_id, jenis_user_id: dataStatus?.jenis_user_id }, returning: true })
                                const payNotif = {
                                    notifikasi_id: dataNotif?.notifikasi_id,
                                    user: [...new Set(userToNotif.map(a => a.user_id))]
                                }
                                await this.insertNotifikasiPush(payNotif, transaction)
                            }
                        }
                        if (payload?.tgl_pembayaran) {
                            await model.d_pengajuan.update({
                                tgl_pembayaran: payload?.tgl_pembayaran
                            }, { where: { pengajuan_id: payload?.pengajuan_id } })
                        }
                    }
                }
            }
        }
    } else {
        const updateFlagAction = await model.d_status_pengajuan.update({ flag_action: 'T' }, { where: { pengajuan_id: payload?.pengajuan_id } })
        const dataPengajuan = await model.d_status_pengajuan.findOne({ where: { status_id: payload?.status_id }, raw: true })
        if (updateFlagAction) {
            if (payload?.kd_status === 'P') {
                const [updateKdStatus] = await model.d_status_pengajuan.update({ kd_status: null, flag_action: 'T', flag_show: 'T' }, { where: { pengajuan_id: payload?.pengajuan_id } })
                if (updateKdStatus > 0) {
                    const payUpdate = {
                        pengajuan_id: payload?.pengajuan_id,
                        kd_status: 'S2',
                        date_status: new Date(),
                        flag_show: 'Y',
                        start_status: new Date(),
                        end_status: new Date(),
                        notes: null,
                        created_by: payload?.created_by
                    }
                    const [update1] = await model.d_status_pengajuan.update(payUpdate, { where: { no_urut: 1, pengajuan_id: payload?.pengajuan_id } })
                    if (update1 > 0) {
                        const dataCheck = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: 2 }, raw: true })
                        // if (['Y', 'YY'].includes(dataCheck?.view_only) === true) 
                        const payUpdate2 = {
                            pengajuan_id: payload?.pengajuan_id,
                            flag_action: payload?.jenis_biaya_id && payload?.jenis_biaya_id === 'KP11' ? 'T' : ['Y', 'YY'].includes(dataCheck?.view_only) ? 'T' : 'Y',
                            flag_show: 'Y',
                            kd_status: payload?.jenis_biaya_id && payload?.jenis_biaya_id === 'KP11' ? 'S1' : ['Y', 'YY'].includes(dataCheck?.view_only) ? 'S1' : null,
                            start_status: new Date(),
                            end_status: payload?.jenis_biaya_id && payload?.jenis_biaya_id === 'KP11' ? new Date() : null,
                            notes: null
                        }
                        const [simpanStatus, rows] = await model.d_status_pengajuan.update(payUpdate2, { where: { no_urut: 2, pengajuan_id: payload?.pengajuan_id }, returning: true })

                        if (payload?.jenis_biaya_id && payload?.jenis_biaya_id === 'KP11' && simpanStatus > 0) {
                            const dataUser = await model.m_role_user.findOne({ where: { jabatan_id: rows[0]?.jabatan_id, unit_kerja_id: rows[0]?.unit_kerja_id }, returning: true, plain: true })

                            const historyId = uuidv4()
                            const statusHistory = {
                                history_id: historyId,
                                status_id: rows[0].status_id,
                                user_id: dataUser?.user_id,
                                role_user_id: dataUser?.role_user_id,
                                kd_status: 'S1',
                                created_by: 'AUTO APPROVE BY SISTEM',
                                qrcode: `${LINK_QRCODE}?status=${historyId}`
                            }
                            await model.d_status_pengajuan_history.create(statusHistory)
                        }

                        if ((payload?.jenis_biaya_id && payload?.jenis_biaya_id === 'KP11') || ['Y', 'YY'].includes(dataCheck?.view_only)) {
                            const payUpdate3 = {
                                pengajuan_id: payload?.pengajuan_id,
                                flag_action: 'Y',
                                flag_show: 'Y',
                                start_status: new Date(),
                                end_status: null,
                                notes: null
                            }
                            await model.d_status_pengajuan.update(payUpdate3, { where: { no_urut: 3, pengajuan_id: payload?.pengajuan_id }, returning: true, raw: true })

                            const dataNotif = await model.d_notifikasi.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })
                            if (dataNotif) {
                                const dataStatus = await model.d_status_pengajuan.findOne({ where: { no_urut: 3, pengajuan_id: payload?.pengajuan_id } })
                                const userToNotif = await model.d_status_pengajuan_history.findAll({ where: { status_id: dataStatus?.status_id }, returning: true })
                                const payNotif = {
                                    notifikasi_id: dataNotif?.notifikasi_id,
                                    user: [...new Set(userToNotif.map(a => a.user_id))]
                                }
                                await this.insertNotifikasiPush(payNotif, transaction)
                            }
                        } else {
                            const dataNotif = await model.d_notifikasi.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })
                            if (dataNotif) {
                                const dataStatus = await model.d_status_pengajuan.findOne({ where: { no_urut: 2, pengajuan_id: payload?.pengajuan_id } })
                                const userToNotif = await model.d_status_pengajuan_history.findAll({ where: { status_id: dataStatus?.status_id }, returning: true })
                                const payNotif = {
                                    notifikasi_id: dataNotif?.notifikasi_id,
                                    user: [...new Set(userToNotif.map(a => a.user_id))]
                                }
                                await this.insertNotifikasiPush(payNotif, transaction)
                            }
                        }


                        await model.d_pengajuan.update({ pembetulan_ke: Number(payload?.pembetulan_ke) + 1 }, { where: { pengajuan_id: payUpdate2?.pengajuan_id } })
                    }
                }
            }
            if (payload?.kd_status === 'T') {
                const slaHari = moment().diff(
                    moment(dataPengajuan?.start_status),
                    'days'
                );
                const payUpdate = {
                    status_id: payload?.status_id,
                    kd_status: payload?.kd_status,
                    date_status: new Date(),
                    end_status: new Date(),
                    sla: slaHari,
                    notes: payload?.catatan,
                    created_by: payload?.created_by
                }
                await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
                const payUpdate2 = {
                    pengajuan_id: payload?.pengajuan_id,
                    no_urut: 1,
                    flag_action: 'Y'
                }
                await model.d_status_pengajuan.update(payUpdate2, { where: { pengajuan_id: payUpdate2?.pengajuan_id, no_urut: payUpdate2?.no_urut } })


                const dataStatus = await model.d_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })

                const userToNotif = await model.m_role_user.findAll({ where: { role_user_id: dataStatus?.role_pembuat_id }, returning: true })
                const payNotif = {
                    notifikasi_id: uuidv4(),
                    pengajuan_id: payload?.pengajuan_id,
                    title: `Pengajuan Anda Ditolak (${payload?.no_pengajuan})`,
                    body: payload?.catatan,
                    no_pengajuan: payload?.no_pengajuan,
                    created_by: payload?.created_by || '',
                    user: [...new Set(userToNotif.map(a => a.user_id))]
                }
                await this.insertNotifikasi(payNotif, transaction)

            }
            if (payload?.kd_status === 'S1') {
                if (dataPengajuan?.no_urut) {
                    const totalData = await model.d_status_pengajuan.count({ where: { pengajuan_id: payload?.pengajuan_id } })
                    if (dataPengajuan?.no_urut === totalData) {
                        const slaHari = moment().diff(
                            moment(dataPengajuan?.start_status),
                            'days'
                        );
                        const payUpdate = {
                            status_id: payload?.status_id,
                            kd_status: 'S2',
                            date_status: new Date(),
                            end_status: new Date(),
                            sla: slaHari,
                            notes: payload?.catatan,
                            created_by: payload?.created_by
                        }
                        await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
                        const payUpdate2 = {
                            pengajuan_id: payload?.pengajuan_id,
                            no_urut: Number(payload?.no_urut) + 1,
                            start_status: new Date(),
                            flag_show: 'Y',
                            flag_action: 'Y'
                        }
                        await model.d_status_pengajuan.update(payUpdate2, { where: { pengajuan_id: payUpdate2?.pengajuan_id, no_urut: payUpdate2?.no_urut } })
                        if (payload?.tgl_pembayaran) {
                            await model.d_pengajuan.update({
                                tgl_pembayaran: payload?.tgl_pembayaran
                            }, { where: { pengajuan_id: payload?.pengajuan_id } })
                        }

                        const dataStatus = await model.d_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })

                        if (['KP05', 'KP06', 'KP07'].includes(dataStatus?.jenis_biaya_id)) {
                            const userToNotif = await model.m_role_user.findAll({ where: { role_user_id: dataStatus?.role_pembuat_id }, returning: true })
                            const payNotif = {
                                notifikasi_id: uuidv4(),
                                pengajuan_id: payload?.pengajuan_id,
                                title: `Silakan Lakukan Penyelesaian Kasbon (${payload?.no_pengajuan})`,
                                body: 'Pengajuan Kasbon Anda Sebelumnya Sudah Selesai',
                                no_pengajuan: payload?.no_pengajuan,
                                created_by: payload?.created_by || '',
                                user: [...new Set(userToNotif.map(a => a.user_id))]
                            }
                            await this.insertNotifikasi(payNotif, transaction)
                        } else {
                            const userToNotif = await model.m_role_user.findAll({ where: { role_user_id: dataStatus?.role_pembuat_id }, returning: true })
                            const payNotif = {
                                notifikasi_id: uuidv4(),
                                pengajuan_id: payload?.pengajuan_id,
                                title: `Pengajuan Anda Sudah Terselesaikan (${payload?.no_pengajuan})`,
                                body: 'Terima Kasih',
                                no_pengajuan: payload?.no_pengajuan,
                                created_by: payload?.created_by || '',
                                user: [...new Set(userToNotif.map(a => a.user_id))]
                            }
                            await this.insertNotifikasi(payNotif, transaction)
                        }

                    } else {
                        const slaHari = moment().diff(
                            moment(dataPengajuan?.start_status),
                            'days'
                        );
                        const payUpdate = {
                            status_id: payload?.status_id,
                            kd_status: payload?.kd_status,
                            date_status: new Date(),
                            end_status: new Date(),
                            sla: slaHari,
                            notes: payload?.catatan,
                            created_by: payload?.created_by
                        }
                        await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
                        const dataCheck = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: Number(payload?.no_urut) + 1 }, raw: true })
                        if (['Y', 'YY'].includes(dataCheck?.view_only) === true) {
                            const payUpdate3 = {
                                pengajuan_id: payload?.pengajuan_id,
                                no_urut: Number(payload?.no_urut) + 2,
                                start_status: new Date(),
                                flag_show: 'Y',
                                flag_action: 'Y'
                            }
                            await model.d_status_pengajuan.update(payUpdate3, { where: { pengajuan_id: payUpdate3?.pengajuan_id, no_urut: payUpdate3?.no_urut } })

                            const dataNotif = await model.d_notifikasi.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })
                            if (dataNotif) {
                                const dataStatus = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: payUpdate3?.no_urut } })

                                const userToNotif = await model.m_role_user.findAll({ where: { unit_kerja_id: dataStatus?.unit_kerja_id, jabatan_id: dataStatus?.jabatan_id, jenis_user_id: dataStatus?.jenis_user_id }, returning: true })
                                const payNotif = {
                                    notifikasi_id: dataNotif?.notifikasi_id,
                                    user: [...new Set(userToNotif.map(a => a.user_id))]
                                }
                                await this.insertNotifikasiPush(payNotif, transaction)
                            }
                        } else {
                            const payUpdate2 = {
                                pengajuan_id: payload?.pengajuan_id,
                                no_urut: Number(payload?.no_urut) + 1,
                                start_status: new Date(),
                                flag_show: 'Y',
                                flag_action: 'Y'
                            }
                            await model.d_status_pengajuan.update(payUpdate2, { where: { pengajuan_id: payUpdate2?.pengajuan_id, no_urut: payUpdate2?.no_urut } })

                            const dataNotif = await model.d_notifikasi.findOne({ where: { pengajuan_id: payload?.pengajuan_id } })
                            if (dataNotif) {
                                const dataStatus = await model.d_status_pengajuan.findOne({ where: { pengajuan_id: payload?.pengajuan_id, no_urut: payUpdate2?.no_urut } })

                                const userToNotif = await model.m_role_user.findAll({ where: { unit_kerja_id: dataStatus?.unit_kerja_id, jabatan_id: dataStatus?.jabatan_id, jenis_user_id: dataStatus?.jenis_user_id }, returning: true })
                                const payNotif = {
                                    notifikasi_id: dataNotif?.notifikasi_id,
                                    user: [...new Set(userToNotif.map(a => a.user_id))]
                                }

                                await this.insertNotifikasiPush(payNotif, transaction)
                            }
                        }
                        if (payload?.tgl_pembayaran) {
                            await model.d_pengajuan.update({
                                tgl_pembayaran: payload?.tgl_pembayaran
                            }, { where: { pengajuan_id: payload?.pengajuan_id } })
                        }
                    }
                }
            }
            if (payload?.kd_status === 'B') {
                const payUpdate = {
                    status_id: payload?.status_id,
                    kd_status: payload?.kd_status,
                    date_status: new Date(),
                    start_status: null,
                    end_status: null,
                    notes: payload?.catatan
                }
                await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
            }
            if (payload?.kd_status === 'S2') {
                const slaHari = moment().diff(
                    moment(dataPengajuan?.start_status),
                    'days'
                );
                const payUpdate = {
                    status_id: payload?.status_id,
                    kd_status: payload?.kd_status,
                    date_status: new Date(),
                    end_status: new Date(),
                    sla: slaHari,
                    notes: payload?.catatan,
                    created_by: payload?.created_by
                }
                await model.d_status_pengajuan.update(payUpdate, { where: { status_id: payUpdate?.status_id } })
                // if (payload?.coa && payload?.coa.length > 0) {
                //     for (const item of payload?.coa) {
                //         const payCoa = {
                //             pemakaian_anggaran_id: uuidv4(),
                //             anggaran_id: item?.anggaran_id,
                //             pengajuan_coa_id: item?.pengajuan_coa_id,
                //             nominal: item?.nominal,
                //             created_by: payload?.created_by
                //         }
                //         await model.d_pemakaian_anggaran.create(payCoa, { transaction })
                //     }
                // }
            }
        }
    }

    return saveData
}

exports.insertCoaPengajuan = async (payload, transaction) => {
    const saveData = await model.d_pengajuan_coa.create(payload, { transaction, returning: true, raw: true })

    const payCoa2 = {
        pemakaian_anggaran_id: uuidv4(),
        anggaran_id: payload?.anggaran_id,
        pengajuan_coa_id: saveData?.pengajuan_coa_id,
        nominal: payload?.nominal,
        created_by: payload?.created_by
    }
    await model.d_pemakaian_anggaran.create(payCoa2, { transaction })

    return saveData
}

exports.updateCoaPengajuan = async (payload) => {
    const saveData = await model.d_pengajuan_coa.update(payload, { where: { pengajuan_coa_id: payload?.pengajuan_coa_id }, returning: true })

    const dataAnggaran = await model.d_anggaran.findOne({ where: { cabang_id: payload?.cabang_id, coa_detail_id: payload?.coa_detail_id }, raw: true })

    const dataPemAnggaran = await model.d_pemakaian_anggaran.findOne({ where: { pengajuan_coa_id: payload?.pengajuan_coa_id }, raw: true })

    if (dataAnggaran && dataPemAnggaran) {
        await model.d_pemakaian_anggaran.update({
            anggaran_id: dataAnggaran?.anggaran_id,
            nominal: Number(payload?.nominal)
        }, { where: { pemakaian_anggaran_id: dataPemAnggaran?.pemakaian_anggaran_id } })
    }

    return saveData
}

exports.insertUser = async (payload, transaction) => {
    const checkData = await model.m_user.count({ where: { nip: payload?.nip } })
    if (checkData > 0) {
        throw Error('NIP Sudah Terdaftar !')
    }
    const checkDataUsername = await model.m_user.count({ where: { username: payload?.username } })
    if (checkDataUsername > 0) {
        throw Error('Username Sudah Terdaftar !')
    }
    if (payload?.username && payload?.password) {
        const password = await helpers.encodedJwt(payload?.password)
        Object.assign(payload, { username: payload?.username, password: password })
    }
    const saveData = await model.m_user.create(payload, { transaction, returning: true })
    if (saveData) {
        await model.m_role_user.create(payload, { transaction })
    }
    return saveData
}

exports.insertMasterApproval = async (payload, dataUser, transaction) => {
    const result = []
    const countData = await model.m_flow_approval.count({
        where: {
            jenis_biaya_id: payload[0]?.jenis_biaya_id,
            // ...(payload[0]?.unit_kerja_pemohon_id ? { unit_kerja_pemohon_id: payload[0]?.unit_kerja_pemohon_id } : {}),
            jabatan_pemohon_id: payload[0]?.jabatan_pemohon_id,
        }
    })

    if (countData > 0) {
        throw Error('Jenis Biaya, Unit Kerja Pemohon dan Jabatan Pemohon Ini Sudah Terdaftar !')
    }

    let no_urut = 1;
    for (const item of payload) {
        const flow_id = uuidv4()
        delete item?.no_urut
        Object.assign(item, { no_urut: no_urut, flow_id: flow_id, created_by: dataUser?.nama })
        const res = await model.m_flow_approval.create(item, { transaction, returning: true })
        result.push(res)
        no_urut += 1;
    }
    return result
}

exports.insertMasterData = async (payload, transaction) => {
    const result = await model.m_referensi.create(payload, { transaction, returning: true })
    return result
}

exports.insertJenisPajak = async (payload, transaction) => {
    const result = await model.m_jenis_pajak.create(payload, { transaction, returning: true })
    return result
}

exports.insertVendor = async (payload, transaction) => {
    const result = await model.m_vendor.create(payload, { transaction, returning: true })
    return result
}

exports.insertJenisPajakArray = async (payload, transaction) => {
    const dataRef = await this.getReferensiByJenis("jenis_pph_id");

    const dataMax = await model.m_referensi.findOne({
        where: {
            jns_ref: "jenis_pph_id",
        },
        order: [["kd_ref", "DESC"]],
        transaction,
    });

    let lastNumber = dataMax
        ? parseInt(dataMax.kd_ref.replace("PJK", ""), 10)
        : 0;

    const result = [];

    for (const item of payload) {
        const jenisPph = item?.jenis_pph?.trim();

        const dataReff = dataRef.find(
            (a) =>
                a?.ur_ref?.trim()?.toLowerCase() ===
                jenisPph?.toLowerCase()
        );

        let kd_ref;

        if (dataReff) {
            // Referensi sudah ada
            kd_ref = dataReff.kd_ref;
        } else {
            // Generate kd_ref baru
            lastNumber++;
            kd_ref = `PJK${String(lastNumber).padStart(2, "0")}`;

            // Insert referensi baru
            await model.m_referensi.create(
                {
                    kd_ref,
                    jns_ref: "jenis_pph_id",
                    ur_ref: jenisPph,
                    ur_jns_ref: "Jenis Pph",
                    flag_show: "Y",
                    flag_aktif: "Y",
                },
                { transaction }
            );

            // Tambahkan ke dataRef agar iterasi berikutnya mengenali data ini
            dataRef.push({
                kd_ref,
                ur_ref: jenisPph,
            });
        }

        // Insert ke tabel m_jenis_pajak
        const data = await model.m_jenis_pajak.create(
            {
                ...item,
                jenis_pph: jenisPph,
                jenis_pph_id: kd_ref,
            },
            {
                transaction,
                returning: true,
            }
        );

        result.push(data);
    }

    return result;
};

exports.insertVendorArray = async (payload, transaction) => {
    const result = [];
    for (const item of payload) {
        const data = await model.m_vendor.create(
            item,
            {
                transaction,
                returning: true,
            }
        );

        result.push(data);
    }

    return result;
};

exports.insertAnggaran = async (payload, transaction) => {
    const checkData = await model.d_anggaran.count({
        where: {
            cabang_id: payload?.cabang_id,
            coa_detail_id: payload?.coa_detail_id,
            bulan: payload?.bulan
        }
    })
    if (checkData > 0) {
        throw Error('Data Anggaran Sudah Terdaftar !')
    }
    const result = await model.d_anggaran.create(payload, { transaction, returning: true })
    return result
}

exports.insertAnggaranArray = async (isAdjustment, payload, nama, transaction) => {

    const result = {
        total_data: payload.length,
        total_success: 0,
        total_error: 0,
        data_error: []
    };

    // =========================
    // MASTER DATA
    // =========================

    const [dataRef, coaList, anggaranList] = await Promise.all([
        model.m_referensi.findAll({
            where: { jns_ref: 'cabang_id' },
            raw: true
        }),

        model.m_coa_detail.findAll({
            raw: true
        }),

        model.d_anggaran.findAll({
            raw: true
        })
    ]);

    // =========================
    // MAP
    // =========================

    const cabangMap = new Map();

    dataRef.forEach(item => {
        cabangMap.set(item.kd_ref.trim(), item);
    });

    const coaMap = new Map();

    coaList.forEach(item => {
        coaMap.set(item.gl_account.trim(), item);
    });

    const anggaranMap = new Map();

    anggaranList.forEach(item => {

        const key =
            `${item.coa_detail_id}_${item.cabang_id}_${item.bulan}`;

        anggaranMap.set(key, item);

    });

    // =========================
    // BULK INSERT
    // =========================

    const insertAnggaran = [];
    const insertPenambahan = [];
    const insertPemakaian = [];
    const anggaranIds = new Set();

    // =========================

    for (const item of payload) {

        const kdCabang = item.profit_center?.trim();
        const glAccount = item.account?.trim();

        const dataCabang = cabangMap.get(kdCabang);
        const dataCoa = coaMap.get(glAccount);

        if (!dataCabang || !dataCoa) {

            result.total_error++;

            result.data_error.push({
                ...item,
                keterangan: !dataCabang
                    ? "Profit Center tidak ditemukan"
                    : "GL Account tidak ditemukan"
            });

            continue;

        }

        const convertBulan =
            await helpers.convertMonthYear(item.bulan);

        const key =
            `${dataCoa.coa_detail_id}_${dataCabang.kd_ref}_${convertBulan}`;

        const anggaranExist =
            anggaranMap.get(key);

        // ==========================================
        // DATA SUDAH ADA
        // ==========================================

        if (anggaranExist) {

            anggaranIds.add(anggaranExist.anggaran_id);

            const countData = await model.d_penambahan_anggaran.sum('besar_budget', { where: { anggaran_id: anggaranExist.anggaran_id } }) || 0;
            if (Number(item.budget_biaya) !== 0) {

                insertPenambahan.push({

                    penambahan_anggaran_id: uuidv4(),

                    anggaran_id: anggaranExist.anggaran_id,

                    besar_budget: item.budget_biaya,

                    created_by: item.created_by,

                    keterangan:
                        `Budget Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`

                });

            } else if (isAdjustment === 'Y' && Number(item.budget_biaya) === 0 && countData > 0 && Number(item.budget_biaya) - Number(countData) !== 0) {
                insertPenambahan.push({

                    penambahan_anggaran_id: uuidv4(),

                    anggaran_id: anggaranExist.anggaran_id,

                    besar_budget: 0,

                    created_by: item.created_by,

                    keterangan:
                        `Budget Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`

                });
            }

            const countData2 = await model.d_pemakaian_anggaran.sum('nominal', {
                where: {
                    anggaran_id: anggaranExist.anggaran_id
                }
            }) || 0;
            if (Number(item.realisasi_biaya) !== 0) {

                insertPemakaian.push({

                    pemakaian_anggaran_id: uuidv4(),

                    anggaran_id: anggaranExist.anggaran_id,

                    nominal: item.realisasi_biaya,

                    created_by: item.created_by,

                    keterangan:
                        `Realisasi Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`

                });

            } else if (isAdjustment === 'Y' && Number(item.realisasi_biaya) === 0 && countData2 > 0 && Number(item.realisasi_biaya) - Number(countData2) !== 0) {
                insertPemakaian.push({

                    pemakaian_anggaran_id: uuidv4(),

                    anggaran_id: anggaranExist.anggaran_id,

                    nominal: 0,

                    created_by: item.created_by,

                    keterangan:
                        `Realisasi Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`

                });
            }

        }

        // ==========================================
        // DATA BARU
        // ==========================================

        else {

            const anggaranId = uuidv4();

            anggaranIds.add(anggaranId);

            insertAnggaran.push({

                ...item,

                anggaran_id: anggaranId,

                cabang_id: dataCabang.kd_ref,

                coa_detail_id: dataCoa.coa_detail_id,

                bulan: convertBulan

            });

            if (Number(item.budget_biaya) !== 0) {

                insertPenambahan.push({

                    penambahan_anggaran_id: uuidv4(),

                    anggaran_id: anggaranId,

                    besar_budget: item.budget_biaya,

                    created_by: item.created_by,

                    keterangan:
                        `Budget Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`

                });

            }

            if (Number(item.realisasi_biaya) !== 0) {

                insertPemakaian.push({

                    pemakaian_anggaran_id: uuidv4(),

                    anggaran_id: anggaranId,

                    nominal: item.realisasi_biaya,

                    created_by: item.created_by,

                    keterangan:
                        `Realisasi Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`

                });

            }

            // supaya duplicate pada file upload tidak insert lagi
            anggaranMap.set(key, {
                anggaran_id: anggaranId
            });

        }

        result.total_success++;

    }

    // =========================
    // BULK INSERT
    // =========================

    if (insertAnggaran.length) {

        await model.d_anggaran.bulkCreate(
            insertAnggaran,
            { transaction }
        );

    }

    if (insertPenambahan.length) {

        await model.d_penambahan_anggaran.bulkCreate(
            insertPenambahan,
            { transaction }
        );

    }

    if (insertPemakaian.length) {

        await model.d_pemakaian_anggaran.bulkCreate(
            insertPemakaian,
            { transaction }
        );

    }

    if (isAdjustment === 'Y' && anggaranIds.size > 0) {

        const updatePemakaian = await db.query(`
        UPDATE d_pemakaian_anggaran a
        SET nominal = b.nominal_baru
        FROM (
            SELECT
                z.pemakaian_anggaran_id,
                (z.nominal -
                COALESCE((
                    SELECT SUM(c.nominal)
                    FROM d_pemakaian_anggaran c
                    WHERE c.anggaran_id = z.anggaran_id
                      AND COALESCE(c.keterangan, '') NOT ILIKE '%Realisasi Biaya From Uploaded%'
                      AND (
                            c.pengajuan_coa_id IS NOT NULL
                         OR c.to_anggaran_id IS NOT NULL
                      )
                ),0)) AS nominal_baru
            FROM d_pemakaian_anggaran z
            WHERE z.keterangan ILIKE '%Realisasi Biaya From Uploaded%'
              AND z.anggaran_id IN (:anggaranIds)
        ) b
        WHERE a.pemakaian_anggaran_id = b.pemakaian_anggaran_id AND a.anggaran_id IN (:anggaranIds);
    `, {
            replacements: {
                anggaranIds: [...anggaranIds]
            },
            // logging:console.log,
            transaction
        });

        const updatePenambahan = await db.query(`
        UPDATE d_penambahan_anggaran a
        SET besar_budget = b.budget_baru
        FROM (
            SELECT
                z.penambahan_anggaran_id,
                GREATEST(
                    z.besar_budget -
                    COALESCE((
                        SELECT SUM(c.besar_budget)
                        FROM d_penambahan_anggaran c
                        WHERE c.anggaran_id = z.anggaran_id
                        AND COALESCE(c.keterangan, '') NOT ILIKE '%Budget Biaya From Uploaded%' 
                    ),0),
                    0
                ) AS budget_baru
            FROM d_penambahan_anggaran z
            WHERE z.keterangan ILIKE '%Budget Biaya From Uploaded%'
            AND z.anggaran_id IN (:anggaranIds)
        ) b
        WHERE a.penambahan_anggaran_id = b.penambahan_anggaran_id AND a.anggaran_id IN (:anggaranIds);
    `, {
            replacements: {
                anggaranIds: [...anggaranIds]
            },
            transaction
        });

    }

    return result;

};

exports.updateAnggaranArray = async (payload, nama) => {

    for (const item of payload) {

        const kdCabang = item.profit_center?.trim();
        const glAccount = item.account?.trim();
        const convertBulan =
            await helpers.convertMonthYear(item.bulan);
        const dataDetail = await model.m_coa_detail.findOne({ where: { gl_account: glAccount } })
        const dataAnggaran = await model.d_anggaran.findOne({ where: { cabang_id: kdCabang, coa_detail_id: dataDetail?.coa_detail_id, bulan: convertBulan } })

        if (dataAnggaran?.anggaran_id) {
            model.d_penambahan_anggaran.destroy({
                where: {
                    anggaran_id: dataAnggaran?.anggaran_id,
                    keterangan: {
                        [Op.like]: 'Budget Biaya From Uploaded%'
                    }
                }
            })

            model.d_pemakaian_anggaran.destroy({
                where: {
                    anggaran_id: dataAnggaran?.anggaran_id,
                    keterangan: {
                        [Op.like]: 'Realisasi Biaya From Uploaded%'
                    }
                }
            })
        }
    }

    // const deleteAllData = await Promise.all([

    //     model.d_penambahan_anggaran.destroy({
    //         where: {
    //             keterangan: {
    //                 [Op.like]: 'Budget Biaya From Uploaded%'
    //             }
    //         },
    //         transaction
    //     }),

    //     model.d_pemakaian_anggaran.destroy({
    //         where: {
    //             keterangan: {
    //                 [Op.like]: 'Realisasi Biaya From Uploaded%'
    //             }
    //         },
    //         transaction
    //     })

    // ]);

};

exports.insertHariLiburArray = async (payload, transaction) => {

    for (const item of payload) {
        const checkData = await model.m_hari_libur.count({ where: { tanggal: item?.tanggal } })

        if (checkData > 0) {
            const delData = await model.m_hari_libur.destroy({
                where: {
                    tanggal: item?.tanggal
                }
            })

            if (delData > 0) {
                await model.m_hari_libur.create(item, transaction)
            }
        } else {
            await model.m_hari_libur.create(item, transaction)
        }

    }
};

// exports.insertAnggaranArray = async (payload, transaction) => {

//     const result = {
//         total_data: payload.length,
//         total_success: 0,
//         total_error: 0,
//         data_error: []
//     };

//     const dataRef = await model.m_referensi.findAll({ where: { jns_ref: 'cabang_id' }, returning: true, raw: true });

//     for (const item of payload) {

//         const kdCabang = item?.profit_center?.trim();
//         const glAccount = item?.account?.trim();

//         const dataCabang = dataRef.find(
//             (x) => x?.kd_ref?.trim().toString() === kdCabang.toString()
//         );

//         const dataCoa = await model.m_coa_detail.findOne({
//             where: {
//                 gl_account: glAccount
//             },
//             raw: true
//         });

//         if (!dataCabang || !dataCoa) {
//             result.total_error++;

//             result.data_error.push({
//                 ...item,
//                 keterangan: !dataCabang
//                     ? "Profit Center tidak ditemukan"
//                     : "GL Account tidak ditemukan"
//             });

//             continue;
//         }

//         const convertBulan = await helpers.convertMonthYear(item?.bulan)

//         const cekDataAnggaran = await model.d_anggaran.findOne({
//             where: {
//                 coa_detail_id: dataCoa?.coa_detail_id,
//                 cabang_id: dataCabang?.kd_ref,
//                 bulan: convertBulan
//             }
//         })

//         if (cekDataAnggaran) {
//             if (item?.budget_biaya && Number(item?.budget_biaya) !== 0) {
//                 const payloadPenambahan = {
//                     penambahan_anggaran_id: uuidv4(),
//                     anggaran_id: cekDataAnggaran?.anggaran_id,
//                     besar_budget: item?.budget_biaya,
//                     created_by: item?.created_by,
//                     keterangan: `Budget Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`
//                 }
//                 await model.d_penambahan_anggaran.create(payloadPenambahan, { transaction })
//             }

//             if (item?.realisasi_biaya && Number(item?.realisasi_biaya) !== 0) {
//                 const payloadPemakaian = {
//                     pemakaian_anggaran_id: uuidv4(),
//                     anggaran_id: cekDataAnggaran?.anggaran_id,
//                     nominal: item?.realisasi_biaya,
//                     created_by: item?.created_by,
//                     keterangan: `Realisasi Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`
//                 }
//                 await model.d_pemakaian_anggaran.create(payloadPemakaian, { transaction })
//             }
//         } else {
//             await model.d_anggaran.create(
//                 {
//                     ...item,
//                     cabang_id: dataCabang.kd_ref,
//                     coa_detail_id: dataCoa.coa_detail_id,
//                     bulan: convertBulan
//                 },
//                 {
//                     transaction
//                 }
//             );

//             if (item?.budget_biaya && Number(item?.budget_biaya) !== 0) {
//                 const payloadPenambahan = {
//                     penambahan_anggaran_id: uuidv4(),
//                     anggaran_id: item?.anggaran_id,
//                     besar_budget: item?.budget_biaya,
//                     created_by: item?.created_by,
//                     keterangan: `Budget Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`
//                 }
//                 await model.d_penambahan_anggaran.create(payloadPenambahan, { transaction })
//             }

//             if (item?.realisasi_biaya && Number(item?.realisasi_biaya) !== 0) {
//                 const payloadPemakaian = {
//                     pemakaian_anggaran_id: uuidv4(),
//                     anggaran_id: item?.anggaran_id,
//                     nominal: item?.realisasi_biaya,
//                     created_by: item?.created_by,
//                     keterangan: `Realisasi Biaya From Uploaded (${moment().format('DD/MM/YYYY')})`
//                 }
//                 await model.d_pemakaian_anggaran.create(payloadPemakaian, { transaction })
//             }
//         }


//         result.total_success++;
//     }

//     return result;
// };

exports.insertPenjualanArray = async (payload, transaction) => {

    const result = {
        total_data: payload.length,
        total_success: 0,
        total_error: 0,
        data_error: []
    };

    const dataRef = await model.m_referensi.findAll({ where: { jns_ref: 'cabang_id' }, returning: true, raw: true });

    for (const item of payload) {

        const kdCabang = item?.profit_center?.trim();

        const dataCabang = dataRef.find(
            (x) => x?.kd_ref?.trim().toString() === kdCabang.toString()
        );

        if (!dataCabang) {
            result.total_error++;

            result.data_error.push({
                ...item,
                keterangan: "Profit Center tidak ditemukan"
            });

            continue;
        }

        const convertBulan = await helpers.convertMonthYear(item?.bulan)

        const cekDataPenjualan = await model.d_penjualan.findOne({
            where: {
                cabang_id: dataCabang?.kd_ref,
                bulan: convertBulan
            }
        })

        if (cekDataPenjualan) {
            await model.d_penjualan.update(
                {
                    updated_by: item?.created_by,
                    updated_at: new Date(),
                    target_omset: item?.target_omset_ytd,
                    realisasi_omset: item?.realisasi_omset_ytd,
                    persen_omset: (item?.realisasi_omset_ytd / item?.target_omset_ytd * 100).toFixed(2),
                    keterangan: `Uploaded Penjualan (${moment().format('DD/MM/YYYY')})`
                }, {
                where: {
                    cabang_id: dataCabang.kd_ref,
                    bulan: convertBulan,
                },
                transaction
            }
            );
        } else {
            await model.d_penjualan.create(
                {
                    penjualan_id: item?.penjualan_id,
                    created_by: item?.created_by,
                    cabang: dataCabang?.ur_ref,
                    cabang_id: dataCabang.kd_ref,
                    target_omset: item?.target_omset_ytd,
                    realisasi_omset: item?.realisasi_omset_ytd,
                    persen_omset: (item?.realisasi_omset_ytd / item?.target_omset_ytd * 100).toFixed(2),
                    bulan: convertBulan,
                    keterangan: `Uploaded Penjualan (${moment().format('DD/MM/YYYY')})`
                },
                {
                    transaction
                }
            );
        }


        result.total_success++;
    }

    return result;
};

exports.AddAnggaran = async (payload, transaction) => {
    const result = await model.d_penambahan_anggaran.create(payload, { transaction, returning: true })
    return result
}

exports.MinusAnggaran = async (payload, transaction) => {
    const result = await model.d_pemakaian_anggaran.create(payload, { transaction, returning: true })
    return result
}

exports.updateMasterData = async (payload) => {
    const ref_id = payload?.ref_id
    delete payload?.ref_id
    const result = await model.m_referensi.update(payload, { where: { ref_id: ref_id }, returning: true })
    return result
}

exports.updateJenisPajak = async (payload) => {
    const jenis_pajak_id = payload?.jenis_pajak_id
    delete payload?.jenis_pajak_id
    const result = await model.m_jenis_pajak.update(payload, { where: { jenis_pajak_id: jenis_pajak_id }, returning: true })
    return result
}

exports.updateVendor = async (payload) => {
    const vendor_id = payload?.vendor_id
    delete payload?.vendor_id
    const result = await model.m_vendor.update(payload, { where: { vendor_id: vendor_id }, returning: true })
    return result
}

exports.updateNotifikasiPush = async (payload) => {
    const result = await model.d_notifikasi_push.update(payload, { where: { notifikasi_push_id: payload?.notifikasi_push_id }, returning: true })
    return result
}

exports.readAllNotification = async (payload) => {
    const result = await model.d_notifikasi_push.update({ is_read: 'Y' }, { where: { user_id: payload?.user_id } })
    return result
}

exports.updateMasterApproval = async (payload, dataUser, transaction) => {
    const result = []
    let countDelete = 0;
    for (const item of payload?.detailOld) {
        const deleteData = await model.m_flow_approval.destroy({
            where: {
                flow_id: item?.flow_id
            }
        })
        countDelete += Number(deleteData)
    }

    // if (countDelete > 0) {
    let no_urut = 1
    for (const item of payload?.detail) {
        const flow_id = uuidv4()
        delete item?.no_urut
        Object.assign(item, { no_urut: no_urut, flow_id: flow_id, created_by: dataUser?.nama })
        const res = await model.m_flow_approval.create(item, { transaction, returning: true })
        result.push(res)
        no_urut += 1;
    }
    // }
    return result
}

exports.updateUser = async (payload, transaction) => {
    if (payload?.cabang_id && payload?.jabatan_id && payload?.tgl_aktif_bekerja) {
        await model.m_role_user.update({ is_aktif: 'T' }, { where: { user_id: payload?.user_id } })
    }
    if (!payload?.password && payload?.tipe_user === '2') {
        delete payload.password
        delete payload.username
    }
    if (payload.password) {
        const password = await helpers.encodedJwt(payload?.password)
        delete payload.password
        Object.assign(payload, { password: password })
    }
    if (payload?.tipe_user === '1') {
        payload.password = ''
        payload.username = ''
    }
    const result = await model.m_user.update(payload, { where: { user_id: payload?.user_id } })
    payload.role_user_id = uuidv4()
    delete payload.created_at
    let result2
    if (payload?.cabang_id && payload?.jabatan_id && payload?.tgl_aktif_bekerja) {
        result2 = await model.m_role_user.create(payload, { transaction, returning: true })
    }

    return {
        user: result,
        role: result2
    }
}

exports.deleteDokumen = async (dokumen_id, aktor) => {
    const result = await model.d_pengajuan_dokumen.destroy({ where: { dokumen_id } })
    return await helpers.processDelete(result)
}

exports.deleteCoaPengajuan = async (pengajuan_coa_id) => {
    const result = await model.d_pengajuan_coa.destroy({ where: { pengajuan_coa_id } })
    if (pengajuan_coa_id) {
        await model.d_pemakaian_anggaran.destroy({ where: { pengajuan_coa_id } })
    }
    return await helpers.processDelete(result)
}

exports.deletePenjualan = async (penjualan_id) => {
    const result = await model.d_penjualan.destroy({ where: { penjualan_id } })
    return await helpers.processDelete(result)
}

exports.deleteMasterApproval = async (payload) => {
    const result = await model.m_flow_approval.destroy({ where: { jenis_biaya_id: payload?.jenis_biaya_id, jabatan_pemohon_id: payload?.jabatan_pemohon_id } })
    return await helpers.processDelete(result)
}

exports.getListCoa = async (keyword) => {
    const result = await db.query(query.getListCoa, {
        replacements: {
            keyword: `%${keyword || ''}%`
        },
        type: db.QueryTypes.SELECT
    });

    return result;
}

// exports.getListCoaDetail = async (coa_id) => {
//     const result = await model.m_coa_detail.findAll({ where: { coa_id } })

//     return result;

exports.getListCoaDetail = async (keyword) => {
    const result = await db.query(query.getListCoaDetail, {
        replacements: {
            keyword: `%${keyword || ''}%`
        },
        type: db.QueryTypes.SELECT
    });

    return result;
}

exports.getListCoaDetailByCabang = async ({ cabang_id, keyword }) => {
    const result = await db.query(query.getListCoaDetailByCabang, {
        replacements: {
            cabang_id,
            keyword: `%${keyword || ''}%`
        },
        type: db.QueryTypes.SELECT,
        // logging: console.log
    });

    return result;
}

exports.getListCoaDetailByDashboard = async ({ cabang_id, keyword }) => {
    let condition = ``;
    if (cabang_id !== '2000') {
        condition += ` da.cabang_id = '${cabang_id}' `
    }
    const QUERY = query.getListCoaDetailByDashboard
        .replace(/:condition/g, condition)

    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword || ''}%`
        },
        type: db.QueryTypes.SELECT,
        // logging: console.log
    });

    return result;
}

exports.getListCoaDetailDashboard = async ({ page, limit, role_id, cabang_id, periode, ytd }) => {
    let condition = ``;
    let condPenjualan = ``;

    if (cabang_id) {
        const selectCabang = Object.values(cabang_id);
        if (selectCabang?.length > 0) {
            // if (selectCabang[0]?.value !== 'All') {
            const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",");
            condition += ` AND a.cabang_id IN (${inCabang}) `
            // }
        } else {
            // if (role_id === 'RL00') {
            //     condition += ` AND a.cabang_id IN ('2000') `
            // }
        }
    }
    if (periode) {
        if (ytd === 'false') {
            condition += ` AND a.bulan = TO_CHAR(TO_DATE('${periode}', 'YYYY-MM'), 'YYYY-MM') `
        }
        if (ytd === 'true') {
            condition += ` AND a.bulan BETWEEN
          TO_CHAR(DATE_TRUNC('year', TO_DATE('${periode}', 'YYYY-MM')), 'YYYY-MM')
          AND '${periode}' `
        }
    }

    if (!periode && !cabang_id) {
        condition += `
            AND a.bulan BETWEEN
                TO_CHAR(DATE_TRUNC('year', CURRENT_DATE), 'YYYY-MM')
                AND TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `;
    }
    // if (coa_id) {
    //     condition += ` AND c.coa_id = '${coa_id}' `
    // }
    const QUERY_PENJUALAN = query.getPenjualan
        .replace(/:condition/g, condition)

    const QUERY = query.getListCoaKlasifikasiDashboard
        .replace(/:condition/g, condition)

    // const bindListPengajuan = {
    //     page: page,
    //     limit: limit
    // }

    const result_penjualan = await db.query(QUERY_PENJUALAN, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true,
        // logging: console.log
    });

    const result = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        // logging: console.log
    });

    const listData = await Promise.all(
        result.map(async (item) => {
            const QUERY2 = query.getListCoaDetailDashboard
                .replace(/:condition/g, condition)

            const result2 = await db.query(QUERY2, {
                replacements: { klasifikasi_coa_id: item?.klasifikasi_coa_id },
                type: db.QueryTypes.SELECT,
                // logging: console.log
            });

            item.coa = result2

            return item;
        })
    );

    // const statusData = result.length > 0 ? true : false

    return { penjualan: result_penjualan, list_data: listData }
    // {
    //     status: statusData,
    //     data: statusData ?
    //         {
    //             total_data: result[0].total_data,
    //             total_halaman: result[0].total_halaman,
    //             limit: limit,
    //             list_data: result
    //         } : {
    //             total_data: 0,
    //             total_halaman: null,
    //             limit: null,
    //             list_data: []
    //         }
    // }
}

exports.getListUserManagement = async ({ status = null, keyword, page, limit, pengajuan_id, sortBy = 'DESC', role_id, user_id, role_user_id, cabang_id, unit_kerja_id }) => {
    const order_by = `ORDER BY mu.nama ${sortBy}`;
    let condition = ``

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(mu.nama) ILIKE upper('%${keyword}%')
                            OR upper(mu.username) ILIKE upper('%${keyword}%')
                            OR upper(mu.nip) ILIKE upper('%${keyword}%')
                            OR upper(mu.email) ILIKE upper('%${keyword}%')
                            OR upper(m1.ur_ref) ILIKE upper('%${keyword}%')
                            OR upper(m2.ur_ref) ILIKE upper('%${keyword}%')
                            OR upper(m3.ur_ref) ILIKE upper('%${keyword}%')
                            OR upper(m4.ur_ref) ILIKE upper('%${keyword}%') 
                            ) `

    }

    const QUERY = query.getListUserManagement
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListUserManagement
        .replace(/:condition/g, condition)

    const bindList = {
        page: page,
        limit: limit
    }

    const listUser = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })


    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listUser.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listUser
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListMasterApproval = async ({ keyword, page, limit, sortBy = 'DESC' }) => {
    const order_by = `ORDER BY jb.ur_ref ${sortBy}`;
    let condition = ``

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(jb.ur_ref) LIKE upper('%${keyword}%')
                            OR upper(uk.ur_ref) LIKE upper('%${keyword}%')
                            OR upper(jp.ur_ref) LIKE upper('%${keyword}%')
                            OR upper(jpe.ur_ref) LIKE upper('%${keyword}%')
                            OR upper(ju.ur_ref) LIKE upper('%${keyword}%')
                            ) `

    }

    const QUERY = query.getListMasterApproval
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListMasterApproval
        .replace(/:condition/g, condition)

    const bindList = {
        page: page,
        limit: limit
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListMasterData = async ({ keyword, page, limit, sortBy = 'DESC' }) => {
    const order_by = `ORDER BY a.ur_ref ${sortBy}`;
    let condition = ``

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(a.kd_ref) LIKE upper('%${keyword}%')
                            OR upper(a.ur_ref) LIKE upper('%${keyword}%')
                            OR upper(a.ur_jns_ref) LIKE upper('%${keyword}%')
                            OR upper(a.keterangan) LIKE upper('%${keyword}%')
                            ) `

    }

    const QUERY = query.getListMasterData
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListMasterData
        .replace(/:condition/g, condition)

    const bindList = {
        page: page,
        limit: limit
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListManajemenSession = async ({ keyword, page, limit, sortBy = 'DESC' }) => {
    const order_by = `ORDER BY a.created_at ${sortBy}`;
    let condition = ``

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(a.username) LIKE upper('%${keyword}%')
                            OR upper(b.nama) LIKE upper('%${keyword}%')
                            ) `

    }

    const QUERY = query.getListManajemenSession
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListManajemenSession
        .replace(/:condition/g, condition)

    const bindList = {
        page: page,
        limit: limit
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListJenisPajak = async ({ keyword, page, limit, sortBy = 'ASC' }) => {
    const order_by = `ORDER BY a.kode_objek ${sortBy}`;
    let condition = ``

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(a.kode_objek) LIKE upper('%${keyword}%')
                            OR upper(a.jenis_jasa) LIKE upper('%${keyword}%')
                            OR upper(m1.ur_ref) LIKE upper('%${keyword}%')
                            ) `

    }

    const QUERY = query.getListJenisPajak
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListJenisPajak
        .replace(/:condition/g, condition)

    const bindList = {
        page: page,
        limit: limit
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListVendor = async ({ keyword, page, limit, sortBy = 'ASC' }) => {
    const order_by = `ORDER BY a.nama_vendor ${sortBy}`;
    let condition = ``

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(a.nama_vendor) LIKE upper('%${keyword}%')
                            OR upper(a.npwp_vendor) LIKE upper('%${keyword}%')
                            OR upper(a.alamat_vendor) LIKE upper('%${keyword}%')
                            ) `

    }

    const QUERY = query.getListVendor
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListVendor
        .replace(/:condition/g, condition)

    const bindList = {
        page: page,
        limit: limit
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListAnggaran = async ({ keyword, page, limit, sortBy = 'ASC', filter }) => {
    const order_by = `ORDER BY a.bulan ${sortBy}, a.created_at ${sortBy}`;
    let condition = ``

    if (filter?.cabang) {
        const selectCabang = Object.values(filter?.cabang);
        if (selectCabang?.length > 0) {
            // if (selectCabang[0]?.value !== 'All') {
            const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
            condition += ` AND a.cabang_id IN (${inCabang}) `;
        }
    }

    if (filter?.periode) {
        condition += ` AND a.bulan = TO_CHAR(TO_DATE('${filter?.periode}', 'YYYY-MM-DD'), 'YYYY-MM') `
    }

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(a.bulan) LIKE upper('%${keyword}%')
                            OR upper(c.ur_ref) LIKE upper('%${keyword}%')
                            OR upper(d.gl_account) LIKE upper('%${keyword}%')
                            OR upper(d.detail_coa) LIKE upper('%${keyword}%') 
                            OR EXISTS (
                                SELECT 1 FROM d_anggaran aa 
                                left join d_pemakaian_anggaran b ON 
                                aa.anggaran_id = b.anggaran_id 
                                left join d_penambahan_anggaran c ON 
                                aa.anggaran_id = c.anggaran_id where aa.anggaran_id = a.anggaran_id AND  
                                (upper(b.keterangan) LIKE upper('%${keyword}%') OR 
                                upper(c.keterangan) LIKE upper('%${keyword}%'))
                                )
                            ) `

    }

    const QUERY = query.getListAnggaran
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListAnggaran
        .replace(/:condition/g, condition)

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const bindList = {
        page: pageNumber,
        limit: limitNumber
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    // console.log(countData, 'countData');


    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListPenjualan = async ({ keyword, page, limit, sortBy = 'ASC', filter }) => {
    const order_by = `ORDER BY a.bulan ${sortBy}, a.created_at ${sortBy}`;
    let condition = ``

    if (filter?.cabang) {
        const selectCabang = Object.values(filter?.cabang);
        if (selectCabang?.length > 0) {
            // if (selectCabang[0]?.value !== 'All') {
            const inCabang = selectCabang?.map(item => `'${item.value}'`).join(",")
            condition += ` AND a.cabang_id IN (${inCabang}) `;
        }
    }

    if (filter?.periode) {
        condition += ` AND a.bulan = TO_CHAR(TO_DATE('${filter?.periode}', 'YYYY-MM-DD'), 'YYYY-MM') `
    }

    if (keyword && (keyword !== null || keyword !== '')) {
        condition += ` AND
                            (
                            upper(a.bulan) LIKE upper('%${keyword}%')
                            OR upper(a.cabang) LIKE upper('%${keyword}%')
                            OR upper(a.created_by) LIKE upper('%${keyword}%')
                            OR upper(a.updated_by) LIKE upper('%${keyword}%')
                            ) `

    }

    const QUERY = query.getListPenjualan
        .replace(/:condition/g, condition)
        .replace(/:order/g, order_by)

    const COUNT_QUERY = query.countListPenjualan
        .replace(/:condition/g, condition)

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const bindList = {
        page: pageNumber,
        limit: limitNumber
    }

    const listData = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        // logging: console.log
    })

    const countData = await db.query(COUNT_QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT,
        plain: true,
    })

    const statusData = listData.length > 0 ? true : false

    return {
        status: statusData,
        data: statusData ?
            {
                total_data: countData.total_data,
                total_halaman: countData.total_halaman,
                limit: countData.limit,
                list_data: listData
            } : {
                total_data: 0,
                total_halaman: null,
                limit: null,
                list_data: []
            }
    }
}

exports.getListNotification = async ({ user_id, page, limit }) => {
    const QUERY = query.getListNotification

    // console.log(user_id, 'user_id');

    const bindList = {
        user_id: String(user_id),
        page: page,
        limit: limit
    }

    const listNotification = await db.query(QUERY, {
        replacements: bindList,
        type: db.QueryTypes.SELECT
    })

    return listNotification
}

exports.clearSession = async () => {
    let result = false;

    try {
        await db.query(query.clearSession, {
            type: db.QueryTypes.UPDATE
        });

        result = true;
    } catch (error) {
        console.error(error);
        result = false;
    }

    if (result === true) {
        return {
            status: true,
            message: 'Clear session berhasil'
        };
    }

    return {
        status: false,
        message: 'Clear session gagal'
    };
}

exports.getListHariLibur = async ({ keyword, page, limit, order = 'DESC' }) => {
    const QUERY = query.getListHariLibur.replace(/:order/g, order)
    const result = await db.query(QUERY, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT
    })

    const resultCount = await db.query(query.countListHariLibur, {
        replacements: {
            keyword: `%${keyword ? keyword.toUpperCase() : keyword}%`,
            page: page,
            limit: limit
        },
        type: db.QueryTypes.SELECT,
        plain: true
    })

    const statusData = result.length > 0 ? true : false

    return statusData ?
        {
            total_data: resultCount.total_data,
            total_halaman: resultCount.total_halaman,
            limit: resultCount.limit,
            list_data: result
        } : {
            total_data: 0,
            total_halaman: null,
            limit: null,
            list_data: []
        }
}

exports.deleteHariLibur = async (id) => {
    const result = await model.m_hari_libur.destroy({ where: { m_h_id: id } })
    return await helpers.processDelete(result)
}

exports.createHariLibur = async (payload, transaction) => {
    // const { customer_id } = payload
    const checkData = await model.m_hari_libur.count({ where: { tanggal: payload?.tanggal } })
    if (checkData > 0) {
        throw Error('Tanggal Ini Sudah Terdaftar !')
    } else {
        const result = await model.m_hari_libur.create(payload, { transaction })
        return {
            ...result.dataValues,
        }
    }
}