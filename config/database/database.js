const Sequelize = require('sequelize');

const db = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASS,
	{
		dialect: 'postgres',
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		logging: false,
		timezone: "+07:00",
		// dialectOptions: {
		// 	ssl: {
		// 		require: true,
		// 		rejectUnauthorized: false,
		// 	},
		// },
		pool: {
			max: 60,
			min: 10,
			acquire: 60000,
			idle: 10000
		}
	}
);

db.authenticate()
	.then(() => {
		console.log('Connection database has been established successfully.');
	})
	.catch(err => {
		console.error('Unable to connect to the database:', err);
	});

module.exports = db;