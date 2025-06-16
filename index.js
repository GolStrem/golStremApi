// index.js
const express = require('express');
const app = express();
const port = 8000;

app.get('/hello', (req, res) => {
  res.send('helloworld');
});

app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});

