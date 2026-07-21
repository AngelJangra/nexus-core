module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            error: 'Missing Supabase environment variables',
            SUPABASE_URL: supabaseUrl ? '✅ set' : '❌ missing',
            SUPABASE_KEY: supabaseKey ? '✅ set' : '❌ missing'
        });
    }

    try {
        const resp = await fetch(`${supabaseUrl}/rest/v1/devices?limit=1`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': 'Bearer ' + supabaseKey
            }
        });

        if (!resp.ok) {
            return res.status(500).json({
                error: 'Supabase query failed',
                status: resp.status,
                statusText: resp.statusText,
                url: `${supabaseUrl}/rest/v1/devices?limit=1`
            });
        }

        const data = await resp.json();
        res.json({
            success: true,
            message: 'Supabase connection successful!',
            deviceCount: data.length,
            sample: data.slice(0, 2)
        });

    } catch (err) {
        res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
};
