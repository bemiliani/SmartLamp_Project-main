/*
 * SMART LAMP - MAP SCRIPT (Version Automatisée avec Simulation Multicapteurs)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. GESTION DU THÈME ---
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

    // --- 2. INITIALISATION DE LA CARTE SATELLITE ---
    // Coordonnées de base (Centre de Gardanne)
    const basePos = [43.4545, 5.4749]; 
    const map = L.map('map-container').setView(basePos, 16); // Zoom un peu plus large pour voir les 10 points

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // --- 3. LOGIQUE D'ANALYSE D'ÉTAT ---
    function getStatusInfo(data, isSimulated = false) {
        if (!data) return { state: 'Panne', color: '#f44336', label: 'Aucune donnée' };

        const lastSeen = new Date(data.date);
        const diffMinutes = (Date.now() - lastSeen) / 60000;

        // Règle 1 : Capteur HS (plus de 10 min sans nouvelles) - Uniquement pour le vrai capteur
        if (!isSimulated && diffMinutes > 10) {
            return { state: 'Erreur', color: '#ff9800', label: 'Capteur HS (Déconnecté)' };
        }
        
        // Règle 2 : Panne Critique (Lumière à 0)
        if (parseFloat(data.lux) <= 0) {
            return { state: 'Panne', color: '#f44336', label: 'Panne : Aucune lumière émise' };
        }

        // Règle 3 : Batterie Faible (< 15%)
        if (parseFloat(data.batterie) < 15) {
            return { state: 'Faible', color: '#ffeb3b', label: 'Batterie Faible' };
        }

        // Règle 4 : Tout est OK
        return { state: 'OK', color: '#4caf50', label: 'Fonctionnement Normal' };
    }

    // --- 4. RÉCUPÉRATION DES DONNÉES ET AFFICHAGE ---
    try {
        const response = await fetch('http://localhost:3000/api/donnees');
        const history = await response.json();

        // Création d'un groupe de marqueurs pour ajuster le zoom automatiquement
        const markerGroup = L.featureGroup().addTo(map);

        // --- A. GESTION DU LAMPADAIRE RÉEL (BDD) ---
        if (history.length > 0) {
            const lastData = history[history.length - 1];
            const info = getStatusInfo(lastData, false);

            // Coordonnées : BDD si présentes, sinon basePos
            const lat = lastData.latitude || basePos[0];
            const lon = lastData.longitude || basePos[1];

            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${info.color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lon], { icon: customIcon }).addTo(markerGroup);

            marker.bindPopup(`
                <div style="font-family: 'Montserrat', sans-serif;">
                    <strong style="color: ${info.color}">${info.label} (RÉEL)</strong><br>
                    <b>ID:</b> ${lastData.device_id}<br>
                    <b>Batterie:</b> ${Math.round(lastData.batterie)}%<br>
                    <b>Lumière:</b> ${lastData.lux} lux<br>
                    <b>Température:</b> ${lastData.temperature}°C<br>
                    <small>Dernière mise à jour : ${new Date(lastData.date).toLocaleTimeString()}</small>
                </div>
            `);
        }

        // --- B. GESTION DES 9 LAMPADAIRES SIMULÉS ---
        for (let i = 1; i <= 9; i++) {
            // Génération de coordonnées aléatoires autour de basePos
            const simLat = basePos[0] + (Math.random() - 0.5) * 0.005; 
            const simLon = basePos[1] + (Math.random() - 0.5) * 0.005; 

            // Génération de données aléatoires pour l'état
            const simBatt = Math.floor(Math.random() * 90) + 5; // Entre 5 et 95%
            const simLux = Math.floor(Math.random() * 100);    // Entre 0 et 99 lux
            
            // Création d'un objet de données fictif
            const simData = {
                device_id: `lampadaire-sim-${String(i).padStart(2, '0')}`,
                batterie: simBatt,
                lux: simLux,
                temperature: Math.floor(Math.random() * 10) + 15, // 15-24°C
                date: new Date()
            };

            // Calcul du statut (isSimulated = true pour désactiver le test Capteur HS)
            const simInfo = getStatusInfo(simData, true);

            const simIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${simInfo.color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const simMarker = L.marker([simLat, simLon], { icon: simIcon }).addTo(markerGroup);

            simMarker.bindPopup(`
                <div style="font-family: 'Montserrat', sans-serif;">
                    <strong style="color: ${simInfo.color}">${simInfo.label} (SIMULÉ)</strong><br>
                    <b>ID:</b> ${simData.device_id}<br>
                    <b>Batterie:</b> ${simBatt}%<br>
                    <b>Lumière:</b> ${simLux} lux<br>
                    <b>Température:</b> ${simData.temperature}°C<br>
                    <small>Donnée simulée le : ${simData.date.toLocaleTimeString()}</small>
                </div>
            `);
        }

        // Ajuster la vue de la carte pour englober tous les marqueurs (réel + simulés)
        if (markerGroup.getLayers().length > 0) {
            map.fitBounds(markerGroup.getBounds());
        }

    } catch (err) {
        console.error("Erreur lors du chargement de la carte :", err);
    }
});