const controller = {}
const user = require('./user/user')
const main = require('./main/main')

controller.main = main
controller.user = user

module.exports = controller