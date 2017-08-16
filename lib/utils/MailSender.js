
const nodemailer   = require('nodemailer');
const config = require('../../config');

const transporter = nodemailer.createTransport({
  port: process.env.X_SMTP_PORT || config.email.port || 465
  ,host: process.env.X_SMTP_HOST || config.email.host || 'smtp.mxhichina.com'
  ,secure: process.env.X_SMTP_SECURE || config.email.secure || true
  ,debug: process.env.X_SMTP_DEBUG || config.email.debug || false
  ,auth: {
    user: process.env.X_SMTP_USER || config.email.user,
    pass: process.env.X_SMTP_PASS || config.email.pass
  }
});

module.exports = function sendMail(subject, message, mailTo, mailFrom, cb){
  const mailOptions = {
      from: '"FASTCCM" ' + (mailFrom || process.env.X_SMTP_FROM  || config.email.from), // sender address
      to: [].concat(mailTo), // list of receivers
      subject: subject, // Subject line
      html: message // html body
  };

  transporter.sendMail(mailOptions, cb);
}
