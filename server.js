const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const mqtt = require('mqtt');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. CONNEXION À LA BASE DE DONNÉES
const db = mysql.createConnection({
    host: '172.20.30.15',
    user: 'admin',      // Ton utilisateur BDD
    password: 'fourcade',      // Ton mot de passe BDD
    database: 'smartlamp_db',
    connectionLimit: 5 // Limite le nombre de connexions simultanées
});

// Test de la connexion
pool.getConnection()
    .then(conn => {
        console.log('✅ Connecté à MariaDB avec succès');
        conn.release(); // On libère la connexion après le test
    })
    .catch(err => {
        console.error('❌ Erreur de connexion MariaDB:', err);
    });

// 2. CONNEXION À TTN VIA MQTT
const ttnMqttHost = 'mqtts://eu1.cloud.thethings.network:8883';
const ttnUser = 'nox-ayrox@ttn'; 
const ttnPassword = 'NNSXS.O4QKUJDXGJMWBG76L5SMVVNUPDGE63U4JV6VCLI.CLLLFLRHDDHYLIJXHCPWSJ7ZJHSSWFE6KZKXGTNVW5GY3EBY3QKQ';

const client = mqtt.connect(ttnMqttHost, {
    username: ttnUser,
    password: ttnPassword
});

client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT de TTN');
    // On s'abonne aux messages "uplink" de tous les devices de l'application
    client.subscribe('v3/+/devices/+/up'); 
});

// 3. RÉCEPTION DES DONNÉES TTN ET INSERTION EN BDD
client.on('message', async (topic, message) => {
    try {
        const json = JSON.parse(message.toString());
        
        // On vérifie si le message contient bien des données décodées
        if (json.uplink_message && json.uplink_message.decoded_payload) {
            const devId = json.end_device_ids.device_id;
            const data = json.uplink_message.decoded_payload;

            console.log(`--- Nouveau message de ${devId} ---`);
            console.log(`Batterie: ${data.batterie}%, Temp: ${data.temperature}°C`);

            // Insertion dans MariaDB
            const sql = "INSERT INTO donnees_capteurs (device_id, batterie, puissance, lux, temperature) VALUES (?, ?, ?, ?, ?)";
            const values = [
                devId, 
                data.batterie || 0, 
                data.puissance || 0, 
                data.lux || 0, 
                data.temperature || 0
            ];

            await pool.query(sql, values);
            console.log("✅ Données stockées en BDD !");
        }
    } catch (err) {
        console.error("❌ Erreur de réception :", err);
    }
});

// 4. API POUR LE DASHBOARD FRONT-END
app.get('/api/donnees', async (req, res) => {
    try {
        const sql = `SELECT * FROM donnees_capteurs ORDER BY date ASC LIMIT 1440`;
        const results = await pool.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Erreur lecture BDD:', err);
        res.status(500).send('Erreur serveur');
    }
});

app.listen(PORT, () => {
    console.log(`✅ Serveur SmartLamp : http://localhost:${PORT}`);
});


// Projet V2 Génération de données

/*let history = [];

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
});*/