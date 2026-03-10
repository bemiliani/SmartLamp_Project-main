const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let history = [];

// Génération : 1 mesure par minute (1440 points pour couvrir 24h)
function initData() {
    let now = Date.now();
    for (let i = 0; i < 1440; i++) {
        history.push({
            date: new Date(now - i * 60000).toISOString(), // -1 minute à chaque itération
            batterie: Math.floor(Math.random() * 20) + 70,
            puissance: Math.floor(Math.random() * 10) + 37, // Autour de 42W
            lux: Math.floor(Math.random() * 10) + 15,       // Autour de 20 lux
            temperature: Math.floor(Math.random() * 5) + 18 // Autour de 18°C
        });
    }
    history.reverse();
}

initData();

app.get('/api/donnees', (req, res) => {
    res.json(history);
});

// Simulation de la nouvelle minute qui passe
setInterval(() => {
    const newEntry = {
        date: new Date().toISOString(),
        batterie: Math.floor(Math.random() * 20) + 70,
        puissance: Math.floor(Math.random() * 10) + 37,
        lux: Math.floor(Math.random() * 10) + 15,
        temperature: Math.floor(Math.random() * 5) + 18
    };
    history.push(newEntry);
    if (history.length > 2000) history.shift();
}, 60000);

app.listen(PORT, () => {
    console.log(`✅ Serveur SmartLamp : http://localhost:${PORT}`);
});