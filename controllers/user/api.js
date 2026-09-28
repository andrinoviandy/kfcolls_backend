const axios = require('axios').default;

exports.portalsiLogin = async(payload) => {
    const data = JSON.stringify(payload);
    try {
        let result, error
        const url = process.env.PORTALSI
        const url_alter = process.env.PORTALSI_ALTER
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: url,
            headers: { 
              'Content-Type': 'application/json'
            },
            data : data
          }

         await axios.request(config)
         .then((res) => result = res.data)
         .catch(async(err) => {
            error = err.message
            console.log(err, "ERROR PORTALSI 1")

            Object.assign(config, { url: url_alter })
            await axios.request(config)
            .then(res2 => result = res2.data)
            .catch(err2 => {
              error = err2.message
              console.log(err2, "ERROR PORTALSI 2")
            })
         })

         if(result) return result
         else throw new Error(`ERROR To Access PORTALSI: ${error}`)
    } catch (error) {
        throw new Error(`ERROR To Access PORTALSI: ${error.message}`)
    }
}