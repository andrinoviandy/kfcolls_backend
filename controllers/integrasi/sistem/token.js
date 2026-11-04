const { default: axios } = require("axios");
const serviceIntegrasi = require('../services')

exports.getTokenDwh = async () => {
    const masterAuth = await serviceIntegrasi.getMasterIntegrasi({
        entitas: "dwh",
        modul: "get_token",
        method: "post"
    })

    const auth = masterAuth?.auth_akses
    const result = await axios.post(
        masterAuth?.url_akses,
        {},
        {
            maxBodyLength: Infinity,
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                "x-api-key": auth
            }
        }
    );

    return result?.data?.token
}