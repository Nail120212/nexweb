// /api/loader endpoint - returns Lua with active check
export default async function handler(req, res) {
  const hwid = req.query.hwid || req.headers['x-hwid'] || '';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // If hwid provided, verify active whitelist
  if (hwid && supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/whitelist?select=*&hwid=eq.${encodeURIComponent(hwid)}&active=eq.true`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(200).send(`warn("[Nexxto] Whitelist paused or not found. Make sure you are online with https://dsc.gg/nexxto in status. HWID: ${hwid}") return`);
      }
    } catch {}
  }

  // Return actual loader
  const lua = `-- Nexxto Hub
print("[Nexxto] Loaded - HWID: ${hwid}")
-- Put your main hub code URL here
loadstring(game:HttpGet("https://nexxtohub.vercel.app/main.lua"))()
`;
  return res.status(200).send(lua);
}
