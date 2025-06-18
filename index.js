const express = require('express');
const app = express();
app.use(express.json());
const port = 8000;

app.use('/user', require('./routes/User'));
app.use('/userInfo', require('./routes/UserInfo'));

app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
