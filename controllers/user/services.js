const jwt = require('jsonwebtoken');
const api = require('./api')
const helpers = require('./../../helpers/global_helpers')
const db = require('../../config/database/database')
const model = require('../../config/model')
const { v4: uuidv4 } = require('uuid');

exports.getExpiredDate = (addHours = 8) => {
    const now = new Date();

    // Konversi ke waktu Jakarta
    const jakarta = new Date(
        now.toLocaleString("en-US", {
            timeZone: "Asia/Jakarta"
        })
    );

    // Tambah jam
    jakarta.setHours(jakarta.getHours() + addHours);

    return jakarta;
};

exports.doLogin = async (payload, host) => {
    const password = await helpers.encodedJwt(payload?.user_password)
    
    const QUERY = `
    SELECT 
        COUNT(*) OVER() AS data, 
        a.*, 
        b.*,
        m1.ur_ref as jabatan, 
        m2.ur_ref as cabang, 
        m3.ur_ref as role, 
        m4.ur_ref as unit_kerja,
        m5.ur_ref as unit,
        m6.ur_ref as jenis_user 
    FROM 
        m_user a JOIN m_role_user b ON a.user_id = b.user_id 
        left join m_referensi m1 ON b.jabatan_id = m1.kd_ref 
        and m1.jns_ref = 'jabatan_id' 
        left join m_referensi m2 ON b.cabang_id = m2.kd_ref 
        and m2.jns_ref = 'cabang_id' 
        left join m_referensi m3 ON b.role_id = m3.kd_ref 
        and m3.jns_ref = 'role_id' 
        left join m_referensi m4 ON b.unit_kerja_id = m4.kd_ref 
        and m4.jns_ref = 'unit_kerja_id' 
        left join m_referensi m5 ON b.unit_id = m5.kd_ref 
        and m5.jns_ref = 'unit_id' 
        left join m_referensi m6 ON b.jenis_user_id = m6.kd_ref 
        and m6.jns_ref = 'jenis_user_id' 
    WHERE a.username = :username
    AND a.password = :password AND a.flag_aktif = 'Y' AND b.is_aktif = 'Y'
    `;

    const data = await db.query(QUERY, {
        replacements: {
            username: payload.user_name,
            password: password
        },
        type: db.QueryTypes.SELECT,
        plain: true
    });

    if (Number(data?.data) <= 0 || !data) {
        return {
            status: false,
            message: "AKSES LOGIN TIDAK DIIJINKAN"
        };
    }

    const user = {
        user_id: data.user_id,
        role_user_id: data.role_user_id,
        username: data.username,
        nip: data.nip,
        nama: data.nama,
        tgl_lahir: data.tgl_lahir,
        email: data.email,
        jabatan_id: data.jabatan_id,
        jabatan: data.jabatan,
        cabang_id: data.cabang_id,
        cabang: data.cabang,
        role_id: data.role_id,
        role_atasan_id: data.role_atasan_id,
        role: data.role,
        unit_id: data.unit_id,
        unit: data.unit,
        unit_kerja_id: data.unit_kerja_id,
        unit_kerja: data.unit_kerja,
        verifikator: data.jenis_user_id === "1" ? "T" : "Y",
        jenis_user_id: data.jenis_user_id,
        jenis_user: data.jenis_user
    };

    const session = await db.query(`
        SELECT *
        FROM s_users
        WHERE username = :username
            AND is_active = 'Y'
            AND jwt_expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    `, {
        replacements: {
            username: user.username
        },
        type: db.QueryTypes.SELECT,
        plain: true
    });

    if (session) {

        return {
            status: false,
            message: `Akun Anda Masih Login Di Perangkat Lain.`
        };

    }

    // ==================================================
    // Bersihkan Session Lama
    // ==================================================

    await db.query(`
        UPDATE s_users
        SET is_active = 'T'
        WHERE username = :username
    `, {
        replacements: {
            username: user.username
        },
        type: db.QueryTypes.UPDATE
    });

    // ==================================================
    // Generate JWT Baru
    // ==================================================

    const token = await this.encodedJwt(user);

    // Misal JWT berlaku 8 jam
    const expiresAt = this.getExpiredDate(8);

    // ==================================================
    // Simpan Session Baru
    // ==================================================

    await db.query(`
        INSERT INTO s_users
        (
            username,
            session_token,
            jwt_expires_at,
            is_active
        )
        VALUES
        (
            :username,
            :token,
            :expired,
            'Y'
        )
    `, {
        replacements: {
            username: user.username,
            token,
            expired: expiresAt
        },
        type: db.QueryTypes.INSERT
    });

    return {
        status: true,
        token
    };

    // if (Number(data?.data) > 0) {
    //     const user = {
    //         user_id: data?.user_id,
    //         role_user_id: data?.role_user_id,
    //         username: data?.username,
    //         nip: data?.nip,
    //         nama: data?.nama,
    //         tgl_lahir: data?.tgl_lahir,
    //         email: data?.email,
    //         jabatan_id: data?.jabatan_id,
    //         jabatan: data?.jabatan,
    //         cabang_id: data?.cabang_id,
    //         cabang: data?.cabang,
    //         role_id: data?.role_id,
    //         role_atasan_id: data?.role_atasan_id,
    //         role: data?.role,
    //         unit_id: data?.unit_id,
    //         unit: data?.unit,
    //         unit_kerja_id: data?.unit_kerja_id,
    //         unit_kerja: data?.unit_kerja,
    //         verifikator: data?.jenis_user_id === '1' ? 'T' : 'Y',
    //         jenis_user_id: data?.jenis_user_id,
    //         jenis_user: data?.jenis_user
    //     };
    //     // const simpanLog = await insertUserActivity(user)
    //     const token = await this.encodedJwt(user)
    //     return {
    //         status: true,
    //         token: token
    //     }

    // } else {
    //     return {
    //         status: false,
    //         kode: 'E',
    //         message: 'AKSES LOGIN TIDAK DIIJINKAN'
    //     }
    // }
}

exports.doLogout = async (payload) => {
    const password = await helpers.encodedJwt(payload?.user_password)

    const QUERY = `
    SELECT 
        COUNT(*) OVER() AS data, 
        a.*, 
        b.*,
        m1.ur_ref as jabatan, 
        m2.ur_ref as cabang, 
        m3.ur_ref as role, 
        m4.ur_ref as unit_kerja,
        m5.ur_ref as unit,
        m6.ur_ref as jenis_user 
    FROM 
        m_user a JOIN m_role_user b ON a.user_id = b.user_id 
        left join m_referensi m1 ON b.jabatan_id = m1.kd_ref 
        and m1.jns_ref = 'jabatan_id' 
        left join m_referensi m2 ON b.cabang_id = m2.kd_ref 
        and m2.jns_ref = 'cabang_id' 
        left join m_referensi m3 ON b.role_id = m3.kd_ref 
        and m3.jns_ref = 'role_id' 
        left join m_referensi m4 ON b.unit_kerja_id = m4.kd_ref 
        and m4.jns_ref = 'unit_kerja_id' 
        left join m_referensi m5 ON b.unit_id = m5.kd_ref 
        and m5.jns_ref = 'unit_id' 
        left join m_referensi m6 ON b.jenis_user_id = m6.kd_ref 
        and m6.jns_ref = 'jenis_user_id' 
    WHERE a.username = :username
    AND a.password = :password AND a.flag_aktif = 'Y' AND b.is_aktif = 'Y'
    `;

    const data = await db.query(QUERY, {
        replacements: {
            username: payload.user_name,
            password: password
        },
        type: db.QueryTypes.SELECT,
        plain: true
    });
    await db.query(`
        UPDATE s_users
        SET is_active = 'T'
        WHERE username = :username
    `, {
        replacements: {
            username: payload.user_name
        },
        type: db.QueryTypes.UPDATE
    });
    return {
        status: true
    }
}

exports.encodedJwt = async (data) => {
    const result = await jwt.sign(data, process.env.COSTRACK_SALT, { algorithm: 'HS256' })
    return result
}

exports.decodedJwt = async (data) => {
    let result;
    await jwt.verify(data, process.env.COSTRACK_SALT, function (err, decoded) {
        // console.log(err, decoded, "DECODED <<<<<<<<")
        if (err) throw {
            name: 'JsonWebTokenError',
            message: 'jwt malformed'
        }
        else result = decoded
    })

    return result
}

exports.checkAccess = async (payload) => {
    const password = await helpers.encodedJwt(payload?.user_password)

    const QUERY = `SELECT COUNT(*) OVER() AS DATA, ROLE FROM M_USER WHERE USERNAME = '${payload.user_name}' AND PASSWORD = '${password}'`;

    const data = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    if (data?.DATA > 0) {
        const formatIn = data?.ROLE.split(",").map(item => `'${item}'`).join(",");

        const QUERY_ACCESS = `SELECT "RoleId" AS "kode", "RoleName" AS "uraian" FROM M_ROLE a WHERE a."RoleId" in (${formatIn})`;

        const access = await db.query(QUERY_ACCESS, {
            replacements: {},
            type: db.QueryTypes.SELECT
        })

        return {
            count: data?.DATA,
            access: access
        }
    } else {
        return {
            count: 0,
            access: []
        }
    }

}

exports.checkMaintenance = async () => {
    const QUERY = `SELECT COUNT(*) OVER() AS DATA FROM M_INTEGRASI WHERE MODUL = 'MAINTENANCE' AND FLAG_AKTIF = 'T'`;

    const data = await db.query(QUERY, {
        replacements: {},
        type: db.QueryTypes.SELECT,
        plain: true
    })

    if (data?.DATA > 0) {
        return {
            count: data?.DATA,
            access: "MAINTENANCE"
        }
    } else {
        return {
            count: 0,
            access: ""
        }
    }
}