const supabase = require('./_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { deviceId, image, timestamp } = req.body;

    if (!deviceId || !image) {
        return res.status(400).json({ error: 'Missing deviceId or image' });
    }

    try {
        // Upload to Supabase Storage
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const ext = image.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
        const fileName = `${deviceId}_${Date.now()}.${ext}`;
        const fileBuffer = Buffer.from(base64Data, 'base64');

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('photos')
            .upload(fileName, fileBuffer, {
                contentType: `image/${ext}`,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            // Still save the base64 as fallback
            const { error: dbError } = await supabase
                .from('photos')
                .insert([{
                    device_id: deviceId,
                    timestamp: timestamp || Date.now(),
                    data_url: image.substring(0, 100) + '...',
                    file_path: null,
                    storage_path: null
                }]);

            if (dbError) throw dbError;
            return res.json({ success: true, storagePath: null, fallback: true });
        }

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('photos')
            .getPublicUrl(fileName);

        const publicUrl = urlData?.publicUrl || null;

        // Save to DB with storage path
        const { error: dbError } = await supabase
            .from('photos')
            .insert([{
                device_id: deviceId,
                timestamp: timestamp || Date.now(),
                data_url: null,
                file_path: null,
                storage_path: fileName
            }]);

        if (dbError) throw dbError;

        // Update last_seen
        await supabase
            .from('devices')
            .update({ last_seen: Date.now() })
            .eq('id', deviceId);

        res.json({ success: true, storagePath: fileName, publicUrl });
    } catch (e) {
        console.error('Photo error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
};