// ============================================================
//  TEST FILE — Supabase Connection & API Health Check
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
    // Set CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================================
    //  BUILD TEST RESULTS
    // ============================================================
    const results = {
        timestamp: new Date().toISOString(),
        status: 'ok',
        environment: {
            SUPABASE_URL: supabaseUrl ? '✅ set' : '❌ missing',
            SUPABASE_KEY: supabaseKey ? '✅ set' : '❌ missing',
            NODE_ENV: process.env.NODE_ENV || 'not set',
            VERCEL_ENV: process.env.VERCEL_ENV || 'not set'
        },
        supabase: {
            status: 'not tested',
            error: null
        },
        bucket: {
            name: 'photos',
            exists: false,
            error: null
        },
        tables: {
            devices: 'not tested',
            photos: 'not tested',
            logs: 'not tested',
            locations: 'not tested',
            heartbeats: 'not tested'
        },
        endpoints: [
            { path: '/api/register', method: 'POST', status: 'available' },
            { path: '/api/photo', method: 'POST', status: 'available' },
            { path: '/api/log', method: 'POST', status: 'available' },
            { path: '/api/location', method: 'POST', status: 'available' },
            { path: '/api/heartbeat', method: 'POST', status: 'available' },
            { path: '/api/devices', method: 'GET', status: 'available' },
            { path: '/api/photos?deviceId=xxx', method: 'GET', status: 'available' },
            { path: '/api/logs?deviceId=xxx', method: 'GET', status: 'available' },
            { path: '/api/locations?deviceId=xxx', method: 'GET', status: 'available' },
            { path: '/api/test', method: 'GET', status: 'available' }
        ]
    };

    // ============================================================
    //  TEST 1: SUPABASE CONNECTION
    // ============================================================
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('devices')
                .select('count', { count: 'exact', head: true });

            if (error) {
                results.supabase.status = '❌ connection failed';
                results.supabase.error = error.message;
            } else {
                results.supabase.status = '✅ connected';
                results.supabase.deviceCount = data?.length || 0;
            }
        } catch (e) {
            results.supabase.status = '❌ exception';
            results.supabase.error = e.message;
        }
    } else {
        results.supabase.status = '❌ not configured';
        results.supabase.error = 'Missing SUPABASE_URL or SUPABASE_KEY';
    }

    // ============================================================
    //  TEST 2: BUCKET EXISTS
    // ============================================================
    if (supabase) {
        try {
            const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
            if (bucketError) {
                results.bucket.error = bucketError.message;
            } else {
                const found = buckets.some(b => b.name === 'photos');
                results.bucket.exists = found;
                results.bucket.buckets = buckets.map(b => b.name);
            }
        } catch (e) {
            results.bucket.error = e.message;
        }
    }

    // ============================================================
    //  TEST 3: TABLES EXIST
    // ============================================================
    if (supabase) {
        const tables = ['devices', 'photos', 'logs', 'locations', 'heartbeats'];
        for (const table of tables) {
            try {
                const { error } = await supabase
                    .from(table)
                    .select('count', { count: 'exact', head: true });

                if (error) {
                    results.tables[table] = `❌ ${error.message}`;
                } else {
                    results.tables[table] = '✅ exists';
                }
            } catch (e) {
                results.tables[table] = `❌ ${e.message}`;
            }
        }
    }

    // ============================================================
    //  TEST 4: SAMPLE DATA (if devices exist)
    // ============================================================
    if (supabase && results.supabase.status === '✅ connected') {
        try {
            const { data, error } = await supabase
                .from('devices')
                .select('id, ip, platform, last_seen')
                .order('last_seen', { ascending: false })
                .limit(5);

            if (error) {
                results.sample = { error: error.message };
            } else {
                results.sample = {
                    count: data?.length || 0,
                    devices: data || []
                };
            }
        } catch (e) {
            results.sample = { error: e.message };
        }
    }

    // ============================================================
    //  TEST 5: RECENT ACTIVITY
    // ============================================================
    if (supabase && results.supabase.status === '✅ connected') {
        try {
            // Get latest photo
            const { data: latestPhoto } = await supabase
                .from('photos')
                .select('device_id, timestamp, storage_path')
                .order('timestamp', { ascending: false })
                .limit(1);

            // Get latest log
            const { data: latestLog } = await supabase
                .from('logs')
                .select('device_id, message, timestamp')
                .order('timestamp', { ascending: false })
                .limit(1);

            // Get latest location
            const { data: latestLocation } = await supabase
                .from('locations')
                .select('device_id, lat, lon, timestamp')
                .order('timestamp', { ascending: false })
                .limit(1);

            results.recent = {
                latestPhoto: latestPhoto?.length > 0 ? latestPhoto[0] : null,
                latestLog: latestLog?.length > 0 ? latestLog[0] : null,
                latestLocation: latestLocation?.length > 0 ? latestLocation[0] : null
            };
        } catch (e) {
            results.recent = { error: e.message };
        }
    }

    // ============================================================
    //  FINAL STATUS
    // ============================================================
    const allGreen = results.supabase.status === '✅ connected' &&
                     results.bucket.exists === true &&
                     Object.values(results.tables).every(v => v === '✅ exists');

    results.overall = allGreen ? '✅ All systems ready' : '⚠️ Some issues detected';

    // ============================================================
    //  RETURN RESPONSE
    // ============================================================
    return res.status(200).json(results);
};
