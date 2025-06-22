require('dotenv').config();
const fs = require('fs');
const juice = require('juice');

const nodemailer = require('nodemailer');


// Créer un transporteur SMTP
const transporter = nodemailer.createTransport({
  service: process.env.mailService,
  auth: {
    user: process.env.mailUser,        // Remplace par ton adresse
    pass: process.env.mailPass // Utilise un mot de passe d'application
  }
});

function sendMailTpl(to, subject, tplHtml, tplCss, variable) {
  let html = fs.readFileSync(require.resolve(`@mail/${tplHtml}.html`), 'utf8');
  const css = fs.readFileSync(require.resolve(`@mail/${tplCss}.css`), 'utf8');

  html = html.replace('<style>', `<style>${css}`);
  sendMail(to, subject, juice(html))
}


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

module.exports = { sendMail, sendMailTpl };

