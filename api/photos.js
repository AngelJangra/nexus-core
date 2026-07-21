const supabase = require('./_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { deviceId } = req.query;
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

    // Generate public URLs for storage_path
    const result = await Promise.all(data.map(async (p) => {
        if (p.storage_path) {
            const { data: urlData } = supabase
                .storage
                .from('photos')
                .getPublicUrl(p.storage_path);
            return { ...p, publicUrl: urlData?.publicUrl || null };
        }
        return p;
    }));

    res.json(result);
};