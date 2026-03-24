/*
 * SMART LAMP - MAP SCRIPT
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. SYNC THEME
    const applyTheme = (mode) => {
        document.body.classList.toggle('mode-nuit', mode === 'nuit');
        const check = document.getElementById('theme-checkbox');
        if (check) check.checked = (mode === 'nuit');
        localStorage.setItem('smartlamp-theme', mode);
    };

    applyTheme(localStorage.getItem('smartlamp-theme') || 'jour');

    document.getElementById('theme-checkbox').addEventListener('change', (e) => {
        applyTheme(e.target.checked ? 'nuit' : 'jour');
    });

    // 2. CARTE SATELLITE
    const map = L.map('map-container').setView([43.735, 5.301], 17);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // 3. CHARGEMENT DATA
    try {
        const response = await fetch('http://localhost:3000/api/donnees');
        const history = await response.json();
        const api = history[history.length - 1];

        const lampadaires = [
            { id: 1, pos: [43.7352, 5.3012], state: 'OK' },
            { id: 2, pos: [43.7355, 5.3015], state: 'OK' },
            { id: 3, pos: [43.7348, 5.3008], state: 'Faible' },
            { id: 4, pos: [43.7345, 5.3020], state: 'OK' },
            { id: 5, pos: [43.7358, 5.3005], state: 'Erreur' },
            { id: 6, pos: [43.7351, 5.3025], state: 'OK' },
            { id: 7, pos: [43.7340, 5.3010], state: 'Panne' },
            { id: 8, pos: [43.7342, 5.3000], state: 'OK' },
            { id: 9, pos: [43.7360, 5.3012], state: 'OK' },
            { id: 10, pos: [43.7353, 5.3002], state: 'OK' }
        ];

        const statusStyle = {
            'OK': { c: '#4caf50', t: 'Tout est OK' },
            'Faible': { c: '#ffeb3b', t: 'Batterie faible' },
            'Erreur': { c: '#ff9800', t: 'Capteur HS' },
            'Panne': { c: '#f44336', t: 'CRITIQUE' }
        };

        lampadaires.forEach(l => {
            const s = statusStyle[l.state];
            let popup = `<b>Lampadaire #${l.id}</b><br><span style="color:${s.c}">${s.t}</span>`;
            
            if (l.state !== 'Panne') {
                popup += `<hr>⚡ ${api.batterie.toFixed(1)}% | ↓ ${api.puissance.toFixed(1)}W<br>💡 ${api.lux.toFixed(1)} lux | 🌡️ ${api.temperature.toFixed(1)}°C`;
            }

            L.circleMarker(l.pos, { radius: 11, fillColor: s.c, color: "#fff", weight: 2, fillOpacity: 0.9 })
             .addTo(map).bindPopup(popup);
        });
    } catch (err) { console.error("Erreur Map API", err); }
});