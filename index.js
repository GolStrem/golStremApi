const {hashing, check} = require('./lib/Crypt');
const Database = require('./lib/DataBase');
const db = new Database();

const express = require('express');
const app = express();
app.use(express.json());
const port = 8000;

app.get('/hello', async (req, res) => {
    const users = await db.query('SELECT * FROM login WHERE login = ?', 'invite');
    console.log(users)
});


app.post('/login', async (req, res) => {
    const jsonData = req.body; // JSON envoyé par le client
        if (!('login' in jsonData && 'password' in jsonData)) {
                return res.status(400).send('Malformation');
        }
		const login = await db.query('SELECT password FROM login WHERE login = ?', jsonData.login);
		if (!login || login.length === 0) {
		  return res.status(401).send('Identifiants incorrects');
		}
		hash = await hashing(jsonData.password)
		if(!await check(login[0].password,jsonData.password)) {
			return res.status(401).send('Identifiants incorrecte');
		}
		return res.send("success");
		

});

app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
