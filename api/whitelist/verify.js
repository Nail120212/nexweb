export default async function handler(req, res){
  const hwid = req.query.hwid || '';
  if(!hwid) return res.status(400).send('no hwid');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if(!supabaseUrl) return res.status(200).send('ok');
  try{
    const r = await fetch(`${supabaseUrl}/rest/v1/whitelist?select=active&hwid=eq.${encodeURIComponent(hwid)}`,{
      headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}
    });
    const data = await r.json();
    if(!Array.isArray(data)||data.length===0) return res.status(200).send('not_whitelisted');
    if(data[0].active===false) return res.status(200).send('paused');
    return res.status(200).send('active');
  }catch(e){ return res.status(200).send('ok'); }
}
