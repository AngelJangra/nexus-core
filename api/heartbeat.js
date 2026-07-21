const supabase = require('./_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { deviceId, timestamp } = req.body;
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

    res.json({ success: true });
};