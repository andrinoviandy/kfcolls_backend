const nodemailer = require('nodemailer');

// Konfigurasi transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.ilcs.id', // ganti dengan domain Zimbra Anda
    port: 465, // port untuk SSL
    secure: true, // true untuk SSL
    auth: {
        user: "potter@ilcs.co.id", // email Zimbra Anda
        pass: "f=[28wQ'" // password Zimbra Anda
    },
    tls: {
        rejectUnauthorized: false // jika Anda menggunakan sertifikat self-signed
    }
    // service: 'gmail', // Gunakan layanan email sesuai dengan kebutuhan Anda
    // auth: {
    //     user: '', // Ganti dengan alamat email Anda
    //     pass: ''    // Ganti dengan password email Anda
    // }
});


exports.sendEmail = async (item) => {
    let message = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width,initial-scale=1'>
        <meta name='x-apple-disable-message-reformatting'>
        <title></title>
        <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
        <style>
            table,
            td,
            div,
            h1,
            p {
                font-family: Arial, sans-serif;
            }

            .demo {
                border: 0px ridge #D2D0D0;
                border-collapse: collapse;
                padding: 0px 0px 0px 0px;
            }

            .demo td {
                border: 0px ridge #D2D0D0;
                padding: 5px;
                text-align: left;
                font-size: 16px;
                color: #153643;
                vertical-align: top;
            }
        </style>
    </head>

    <body style='margin:0;padding:0;'>
        <table role='presentation'
            style='width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#ffffff;'>
            <tr>
                <td align='center' style='padding:0;'>
                    <table role='presentation'
                        style='width:602px;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;'>
                        <tr>
                            <td
                                style='padding:36px 30px 36px 30px; background-image:url(10.90.239.38:3000/img/kop_n2n.jpg); background-size:contain; background-repeat:no-repeat; background-position:top'>
                                <table role='presentation'
                                    style='width:100%;border-collapse:collapse;border:0;border-spacing:0;'>
                                    <tr>
                                        <td style='padding:0 0 36px 0;color:#153643;text-align:center;'>
                                            <h1
                                                style='font-size:24px;margin:0 0 20px 0;font-family:Arial,sans-serif;text-decoration:underline;'>
                                            </h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='padding:50px 0 10px 0;color:#153643;'>
                                            <p style='margin:0 0 0px 0;font-size:16px;font-family:Arial,sans-serif;'>Hi,
                                                kami informasikan bahwa data kontrak yang terlampir di bawah ini :</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='padding:0;'>
                                            <table role='presentation' style='width:100%;border:0px;border-spacing:0;'>
                                                <tr>
                                                    <table role='presentation' class='demo'>
                                                        <tr>
                                                            <td style='width:30%'>Nomor Kontrak</td>
                                                            <td>:</td>
                                                            <td>${item?.NO_KONTRAK}</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Judul Pengerjaan</td>
                                                            <td>:</td>
                                                            <td>${item?.JUDUL_KONTRAK}</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Akhir Kontrak</td>
                                                            <td>:</td>
                                                            <td>${item?.END_DATE}</td>
                                                        </tr>
                                                    </table>
                                                </tr>
                                                <tr>
                                                    <td style='width:20px;padding:0;font-size:0;line-height:10px;'>&nbsp;
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style='padding:10px 0 10px 0;color:#153643;'>
                                                        <p
                                                            style='margin:0;font-size:16px;line-height:24px;font-family:Arial,sans-serif;color:#153643;'>
                                                            <font style='font-weight:bold'>${item?.CONTENT}</font>. Atas perhatiannya kami ucapkan terima
                                                            kasih.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td
                                style='padding:30px; background-image:url(10.90.239.38:3000/img/BATIK.png); background-size:contain; background-repeat:no-repeat; background-position:right'>
                                <table role='presentation'
                                    style='width:100%;border-collapse:collapse;border:0;border-spacing:0;font-size:9px;font-family:Arial,sans-serif;'>
                                    <tr>
                                        <td style='padding:0;width:50%;color:#153643;' align='left'>
                                            <a href='https://potter.ilcs.co.id' target='_blank' style='margin:0;font-size:14px;font-family:Arial,sans-serif;'>https://potter.ilcs.co.id/</a><br/>
                                            <p style='margin:0;font-size:14px;font-family:Arial,sans-serif;'>Regards Admin
                                            </p>
                                            <p><em>This is autogenerated email, please do not reply.</em></p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    const mailOptions = {
        from: 'noreply@ilcs.co.id', // Alamat email pengirim noreply
        to: item?.EMAIL_SEND,
        cc: item?.EMAIL_SEND_CC,  // Daftar email CC
        subject: item?.SUBYEK,
        html: message
    };

    try {
        const info = await transporter.sendMail(mailOptions);        
        return info;
    } catch (error) {
        return "Error";
    }
}