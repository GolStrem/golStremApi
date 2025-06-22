require('dotenv').config();
const fs = require('fs');
const juice = require('juice');
const handlebars = require('handlebars');
const nodemailer = require('nodemailer');
const { trad, changeLang } = require('@lib/Trad');

// Créer un transporteur SMTP
const transporter = nodemailer.createTransport({
  service: process.env.mailService,
  auth: {
    user: process.env.mailUser,        // Remplace par ton adresse
    pass: process.env.mailPass // Utilise un mot de passe d'application
  }
});

async function resolveTranslate(listTranslate) {
  const translatedValues = trad(listTranslate); // ← doit renvoyer un tableau de traductions

  const result = Object.fromEntries(
    listTranslate.map((key, i) => [key, translatedValues[i]])
  );
  return result
}

async function renderRecursive(templateStr, initialContext = {}) {
  let context = { ...initialContext };
  let compiledStr = templateStr;
  let iteration = 0;
  const maxIterations = 10; // Sécurité anti-boucle infinie

  while (iteration++ < maxIterations) {
    const missingVars = [...compiledStr.matchAll(/{{\s*([\w.]+)\s*}}/g)].map(m => m[1]);
    if (missingVars.length === 0) break;

    const filtered = missingVars.filter(key => !(key in context));
    const resolved = await resolveTranslate(filtered);
    context = { ...context, ...resolved };
    const template = handlebars.compile(compiledStr);
    compiledStr = template(context);
  }

  return compiledStr;
}

async function sendMailTpl(to, subject, tplHtml, tplCss, variable, lang) {
  await changeLang(lang)
  let html = fs.readFileSync(require.resolve(`@mail/${tplHtml}.html`), 'utf8');
  html = await renderRecursive(html, variable)

  const css = fs.readFileSync(require.resolve(`@mail/${tplCss}.css`), 'utf8');
  html = html.replace('<style>', `<style>${css}`);
  sendMail(to, subject, juice(html))
  await changeLang('fr')
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

