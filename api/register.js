const supabase = require('./_lib/supabase');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fingerprint, permissions } = req.body;

    if (!fingerprint) {
        return res.status(400).json({ error: 'Missing fingerprint' });
    }

    const deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

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
        console.error('Register error:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, deviceId });
};