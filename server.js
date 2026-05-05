const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb'); // Utilisation de MariaDB
const mqtt = require('mqtt');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. CONNEXION À LA BASE DE DONNÉES (Configuration Pool MariaDB)
const pool = mariadb.createPool({
    host: '172.20.30.15',
    user: 'admin',
    password: 'fourcade',
    database: 'smartlamp_db'
});

// Test de la connexion
pool.getConnection()
    .then(conn => {
        console.log('✅ Connecté à MariaDB avec succès');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Erreur de connexion MariaDB:', err);
    });

// 2. CONNEXION À TTN VIA MQTT
const ttnMqttHost = 'mqtts://eu1.cloud.thethings.network:8883';
const ttnUser = 'projet-luminaire-tonnom@ttn'; 
const ttnPassword = 'NNSXS.PKBEA3CNHZVTJIRFO2KXXFUK7JHQ3VX4YGB27MI.FSQDKDZB5XO5SK4DFGCRFEYADL3UKW3NJ55XKS4CGYQOAAPAHICA';

const client = mqtt.connect(ttnMqttHost, {
    username: ttnUser,
    password: ttnPassword
});

client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT de TTN');
    client.subscribe('v3/+/devices/+/up'); 
});

// 3. RÉCEPTION ET INSERTION
client.on('message', async (topic, message) => {
    try {
        const json = JSON.parse(message.toString());
        
        if (json.uplink_message && json.uplink_message.decoded_payload) {
            const devId = json.end_device_ids.device_id;
            const data = json.uplink_message.decoded_payload;

            console.log(`--- Nouveau message de ${devId} ---`);

            const values = [
                devId, 
                data.batterie || 0, 
                parseFloat(data.puissance || 0).toFixed(1), 
                data.lux || 0, 
                parseFloat(data.temperature || 0).toFixed(1)
            ];

            // Insertion dans MariaDB en utilisant le tableau 'values'
            const sql = "INSERT INTO donnees_capteurs (device_id, batterie, puissance, lux, temperature) VALUES (?, ?, ?, ?, ?)";
            
            await pool.query(sql, values); 
            console.log("✅ Données stockées avec succès !");
        }
    } catch (err) {
        console.error("❌ Erreur lors du traitement du message :", err);
    }
});

// 4. API POUR LE DASHBOARD
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
    console.log(`✅ Serveur SmartLamp actif sur le port ${PORT}`);
});

//Simulation de données

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