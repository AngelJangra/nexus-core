const supabase = require('./_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('first_seen', { ascending: false });

    if (error) {
        console.error('Devices error:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};