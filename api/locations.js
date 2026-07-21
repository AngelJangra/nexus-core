const supabase = require('./_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { deviceId } = req.query;
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

    res.json(data);
};