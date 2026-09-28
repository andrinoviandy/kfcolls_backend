const serviceUser = require('./services')
const { statusCode, successMessage, errorMessage } = require('../../helpers/status')
const pm2 = require('pm2')
const { encodedJwt } = require('../../helpers/global_helpers')

exports.getExpiredDate = (hours = 8) => {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
};

exports.login = async (req, res) => {
    try {
        const payload = req.headers.authorization        
        const decodedPayload = await serviceUser.decodedJwt(payload)       
        const host = `${req.protocol}://${req.get('host')}`;
        const result = await serviceUser.doLogin(decodedPayload, host)

        if (result?.status) {

            res.cookie("accountAccess", result.token, {
                expires: this.getExpiredDate(8),
            });
            res.cookie("loginData", decodedPayload, {
                expires: this.getExpiredDate(8),
            });

            return res.status(statusCode.success).json({
                status: true,
                message: 'Success',
                // data: result.token
            })
        } else {
            res.status(statusCode.unauthorized).json(errorMessage(result?.message))
        }
    } catch (error) {      
        // console.log(error, 'errorrr');
        res.status(statusCode.error).json(errorMessage(error.message))
    }
}

exports.logout = async (req, res) => {
    try {
        const payload = req.body
        await serviceUser.doLogout(payload)

        res.status(statusCode.success).json({
            status: true,
            message: 'Success'
        })
    } catch (error) {
        // console.log(error);
        res.status(statusCode.error).json({
            status: false,
            message: 'Failed'
        })
    }
}

exports.maintenance = async (req, res) => {
    try {
        const akses = await serviceUser.checkMaintenance();

        if (akses?.count > 0) {
            // ADA MAINTENANCE
            return res.status(200).json({
                status: true,
                maintenance: true,
                message: 'Aplikasi sedang maintenance',
                data: akses
            });
        } else {
            // TIDAK MAINTENANCE
            return res.status(200).json({
                status: true,
                maintenance: false,
                message: 'Aplikasi normal'
            });
        }
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });

        pm2.restart('n2n', function (err) {
            if (err) console.log(err);
        });
    }
};