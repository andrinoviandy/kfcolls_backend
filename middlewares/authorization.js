const jwt = require('jsonwebtoken')
const { statusCode, errorMessage } = require('../helpers/status');
const db = require('../config/database/database');

// exports.doAuth = async (req, res, next) => {
//     try {
//         let result;
//         if (!req.headers.authorization) throw { message: "Token Invalid" }
//         await jwt.verify(req.headers.authorization, process.env.COSTRACK_SALT, function (err, decoded) {
//             if (err) {
//                 res.status(statusCode.error).json(errorMessage({ error: 'invalid_token', error_description: 'Token is missing' }))
//             } else {
//                 result = decoded
//             }
//         })

//         req.user = result
//         next()
//     } catch (error) {
//         console.log(error, "ERROR <<<<<<<<")
//         res.status(statusCode.error).json(errorMessage(error))
//     }
// }

exports.doAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Token tidak ditemukan"
            });
        }

        // ============================
        // Verify JWT
        // ============================

        const decoded = jwt.verify(
            token,
            process.env.COSTRACK_SALT
        );

        // ============================
        // Cek Session di Database
        // ============================

        const session = await db.query(`
            SELECT *
            FROM s_users
            WHERE
                username = :username
                AND session_token = :token
                AND is_active = 'Y'
                AND jwt_expires_at > NOW()
            LIMIT 1
        `, {
            replacements: {
                username: decoded.username,
                token
            },
            type: db.QueryTypes.SELECT,
            plain: true
        });

        if (!session) {

            return res.status(401).json({
                status: false,
                code: "SESSION_EXPIRED",
                message: "Session telah berakhir atau akun sedang digunakan di perangkat lain."
            });

        }

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(500).json({
            status: false,
            // code: "SESSION_EXPIRED",
            message: error?.message
        });

    }
};