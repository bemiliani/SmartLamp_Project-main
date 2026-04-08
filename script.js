/**
 * SMART LAMP - DASHBOARD SCRIPT
 * Gère l'affichage, le thème et l'agrégation des données (moyennes).
 */

let mainChart;
let currentView = 'batterie';
let currentTimeScale = 1440; // Par défaut 24h
let allData = [];

// --- 1. INITIALISATION ---
function init() {
    initChart();
    setupEventListeners();
    applySavedTheme();
    refreshData();
    setInterval(refreshData, 30000); // Refresh toutes les 30s
}

function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Valeur', data: [], borderColor: '#26c6da', backgroundColor: 'rgba(38, 198, 218, 0.1)', fill: true, tension: 0.3 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { x: { ticks: { maxTicksLimit: 10 } } } 
        }
    });
}

// --- 2. CALCUL DES MOYENNES (AGRÉGATION) ---
function aggregateData(rawData, interval) {
    if (interval === 1) return rawData; // Mode 1min : Données brutes

    let aggregated = [];
    for (let i = 0; i < rawData.length; i += interval) {
        let chunk = rawData.slice(i, i + interval);
        if (chunk.length === 0) continue;

        // Calcul de la moyenne pour chaque clé numérique
        let avgPoint = {
            date: chunk[chunk.length - 1].date, // On prend la date de fin du bloc
            batterie: chunk.reduce((sum, d) => sum + d.batterie, 0) / chunk.length,
            puissance: chunk.reduce((sum, d) => sum + d.puissance, 0) / chunk.length,
            lux: chunk.reduce((sum, d) => sum + d.lux, 0) / chunk.length,
            temperature: chunk.reduce((sum, d) => sum + d.temperature, 0) / chunk.length
        };
        aggregated.push(avgPoint);
    }
    return aggregated;
}

// --- 3. MISE À JOUR DU GRAPHIQUE ---
function updateChart() {
    if (allData.length === 0) return;

    const now = new Date();
    // 1. Filtrer les données selon la plage de temps (Ex: les dernières 24h)
    let filtered = allData.filter(d => (now - new Date(d.date)) / 60000 <= currentTimeScale);

    // 2. Appliquer l'agrégation selon ton échelle
    let interval = 1;
    if (currentTimeScale === 10) interval = 1;  // On veut voir chaque minute sur les 10 dernières minutes
    if (currentTimeScale === 60) interval = 10; // 1 point = moyenne de 10 min
    if (currentTimeScale === 1440) interval = 60; // 1 point = moyenne de 1h

    let displayData = aggregateData(filtered, interval);

    // 3. Envoyer au graphique
    mainChart.data.labels = displayData.map(d => 
        new Date(d.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
    mainChart.data.datasets[0].data = displayData.map(d => d[currentView].toFixed(1));
    mainChart.data.datasets[0].label = `Moyenne (${currentView})`;
    mainChart.update();
}

// --- 4. ACTIONS UTILISATEUR ---
window.setTimeScale = function(minutes, btn) {
    currentTimeScale = minutes;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateChart();
};

function setupEventListeners() {
    const cardMap = { 'btn-battery': 'batterie', 'btn-power': 'puissance', 'btn-lux': 'lux', 'btn-temp': 'temperature' };
    Object.keys(cardMap).forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
            currentView = cardMap[id];
            document.getElementById('chart-title').innerText = "Historique " + currentView;
            updateChart();
        });
    });

    document.getElementById('theme-checkbox').addEventListener('change', (e) => {
        toggleTheme(e.target.checked ? 'nuit' : 'jour');
    });
}

// --- 5. SYNC API & THEME ---
async function refreshData() {
    try {
        const res = await fetch('http://localhost:3000/api/donnees');
        allData = await res.json();

        if (allData.length > 0) {
            // Fonction de calcul de moyenne sur tout le tableau allData
            const getAvg = (prop) => {
                const sum = allData.reduce((acc, curr) => acc + parseFloat(curr[prop] || 0), 0);
                return (sum / allData.length).toFixed(1);
            };

            // Mise à jour des cartes avec les moyennes
            document.getElementById('val-battery').innerText = Math.round(getAvg('batterie')) + "%";
            document.getElementById('val-power').innerText = getAvg('puissance') + "W";
            document.getElementById('val-lux').innerText = Math.round(getAvg('lux')) + " lux";
            document.getElementById('val-temp').innerText = getAvg('temperature') + "°C";
        }
        
        updateChart(); // Le graphique utilisera currentTimeScale qui est déjà à 1440
    } catch (e) { 
        console.error("Erreur Fetch Dashboard", e); 
    }
}

function toggleTheme(mode) {
    document.body.classList.toggle('mode-nuit', mode === 'nuit');
    localStorage.setItem('smartlamp-theme', mode);
}

function applySavedTheme() {
    const saved = localStorage.getItem('smartlamp-theme') || 'jour';
    document.getElementById('theme-checkbox').checked = (saved === 'nuit');
    toggleTheme(saved);
}

window.onload = init;