const model = require('../config/model')
const { statusCode, successMessage, errorMessage } = require('../helpers/status')
const { v4: uuidv4 } = require('uuid');

exports.doLogging = async(req, res, next) => {
    try {
        switch (req.method) {
            case "POST":
            case "PUT":
            case "DELETE":
            break;
        }

        next()
    } catch (error) {
        console.log(error, "ERROR <<<<<<<<")
        res.status(statusCode.error).json(errorMessage(error))
    }
}

// module.exports.doLogging = async (req, res, next) => {
//     console.log('[LOGGING] content-type:', req.headers['content-type']);
//     if (req.is('multipart/form-data')) {
//       return next();
//     }
  
//     try {
//                 switch (req.method) {
//                     case "POST":
//                     case "PUT":
//                     case "DELETE":
//                         const payload_sender = {
//                             headers: req.headers || null,
//                             parameters: req.query || null,
//                             body: req.body,
//                         }
                
//                         const payload = {
//                             // id_project: null,
//                             id_log: uuidv4(),
//                             dest: req.protocol + '://' + req.get('host') + req.originalUrl,
//                             nama_service: req.url,
//                             method_service: req.method,
//                             payload_sender: JSON.stringify(payload_sender, null, 2),
//                             created_by: req.ip || null
//                         }
                
//                         const createdLog = await model.h_log.create(payload)
                
//                         req.id_log = payload?.id_log
//                         break;
//                 }
        
//                 next()
//             } catch (error) {
//                 console.log(error, "ERROR <<<<<<<<")
//                 res.status(statusCode.error).json(errorMessage(error))
//             }
//   };