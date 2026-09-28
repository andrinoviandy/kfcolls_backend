require("dotenv").config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const fileUpload = require('express-fileupload');
const { createServer } = require("http");
// const { Server } = require("socket.io");

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const logging = require('./middlewares/logging');
const { checkRemind, updateRemind, getListNotificationByNIP, checkPelunasan, checkPelunasanFromSAP, clearSession } = require("./controllers/main/main");
const { sendEmail } = require("./controllers/main/sendMail");

const cron = require('node-cron');

const app = express();

const server = createServer(app); // Gunakan HTTP server untuk Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Izinkan akses dari semua domain (ubah jika perlu)
//   },
// });

const whitelist = [
  "https://costrack.kftd.co.id",
  "http://localhost:8001"
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
}));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api/v1/costrack/files', express.static(path.join(__dirname, 'files')));
app.use('/api/v1/costrack/sharefolder', express.static(path.join(__dirname, 'sharefolder')));
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use('/sharefolder', express.static(path.join(__dirname, 'sharefolder')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/api/v1/costrack/download-pdf', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  next();
});
app.use('/api/v1/costrack', logging.doLogging, indexRouter);
app.use('/api/v1/costrack/users', logging.doLogging, usersRouter);
// app.use('/api/v1/n2n', indexRouter);
// app.use('/api/v1/n2n/users', usersRouter);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// const userSockets = {};
// 🔥 Handling Socket.IO
// io.on("connection", async (socket) => {
//   // Menerima pesan dari client
//   socket.on("nip", async (nip) => {
//     userSockets[nip] = socket.id;
//     const result = await getListNotificationByNIP(nip)
//     io.to(socket.id).emit("message", result); // Kirim ke semua client
//   });
//   // socket.on("message", (data) => {
//   //   io.emit("message", data); // Kirim ke semua client
//   // });

//   socket.on("disconnect", () => {
//     const userNIP = Object.keys(userSockets).find(
//       (key) => userSockets[key] === socket.id
//     );
//     if (userNIP) {
//       delete userSockets[userNIP];
//     }
//   });
// });

app.get("/", (req, res) => {
  res.status(200).json({ message: "Server is running!" });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).send({ code: '02', error: 'Not Found' });
});

// error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Cron job untuk pengiriman email
cron.schedule('30 17 * * *', async () => {
  try {
    const result = await clearSession();
  } catch (error) {
    console.log(error);
  }
}, {
  timezone: 'Asia/Jakarta'
});

// cron.schedule('0 0 * * *', async () => {
//   console.log('.................Check Pelunasan Invoice...............');
//   await checkPelunasan();
//   // await checkPelunasanFromSAP();
// });

const PORT = process.env.PORT || 5001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// module.exports = { app, io };// Pastikan hanya mengekspor `app`, tanpa listen
module.exports = { app };// Pastikan hanya mengekspor `app`, tanpa listen
