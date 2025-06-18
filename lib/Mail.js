require('dotenv').config();

const nodemailer = require('nodemailer');


// Créer un transporteur SMTP
const transporter = nodemailer.createTransport({
  service: process.env.mailService,
  auth: {
    user: process.env.mailUser,        // Remplace par ton adresse
    pass: process.env.mailPass // Utilise un mot de passe d'application
  }
});


function sendMail(to, subject, html){

  const mailOptions = {
    from:  process.env.mailFrom,
    to: to,
    subject: subject,
    html: html
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.error(error);
    }
  });
}

module.exports = { sendMail };

