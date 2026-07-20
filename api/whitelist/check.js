
// /api/whitelist/check.js - used internally, same as me but lighter
import crypto from 'crypto';
function verifySession(v,s){ if(!v) return null; const [b64,sig]=v.split('.'); if(!b64||!sig) return null; const exp=crypto.createHmac('sha256',s).update(b64).digest('hex'); if(sig!==exp) return null; try{ const p=JSON.parse(Buffer.from(b64,'base64url').toString()); if(p.exp<Date.now()) return null; return p; }catch{return null;} }
function getCookie(req,n){ const c=req.headers.cookie||''; const m=c.match(new RegExp('(?:^|; )'+n+'=([^;]+)')); return m?decodeURIComponent(m[1]):null; }

export default async function handler(req,res){
  const secret = process.env.SESSION_SECRET || process.env.DISCORD_CLIENT_SECRET || 'fallback';
  const sess = getCookie(req,'nexxto_session');
  const payload = verifySession(sess, secret);
  if(!payload) return res.status(401).json({error:'Not authenticated'});
  // delegate to me logic but just return whitelist
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if(!supabaseUrl) return res.status(500).json({error:'Supabase not configured'});
  const r = await fetch(`${supabaseUrl}/rest/v1/whitelist?select=*&discord_id=eq.${payload.id}`,{headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}});
  const data = await r.json();
  res.json({whitelisted: Array.isArray(data)&&data.length>0, data:data[0]||null});
}
