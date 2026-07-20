
// /api/whitelist/submit.js
import crypto from 'crypto';

function verifySession(v,s){ if(!v) return null; const [b64,sig]=v.split('.'); if(!b64||!sig) return null; const exp=crypto.createHmac('sha256',s).update(b64).digest('hex'); if(sig!==exp) return null; try{ const p=JSON.parse(Buffer.from(b64,'base64url').toString()); if(p.exp<Date.now()) return null; return p; }catch{return null;} }
function getCookie(req,n){ const c=req.headers.cookie||''; const m=c.match(new RegExp('(?:^|; )'+n+'=([^;]+)')); return m?decodeURIComponent(m[1]):null; }

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const secret = process.env.SESSION_SECRET || process.env.DISCORD_CLIENT_SECRET || 'fallback';
  const sess = getCookie(req,'nexxto_session');
  const payload = verifySession(sess, secret);
  if(!payload) return res.status(401).json({error:'Not authenticated - login with OAuth2'});

  const { hwid } = req.body || {};
  if(!hwid || typeof hwid!=='string' || hwid.trim().length<4) return res.status(400).json({error:'Invalid HWID'});
  const cleanHwid = hwid.trim().slice(0,128);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  const botToken = process.env.BOT_TOKEN;
  const guildId = process.env.GUILD_ID || '1503342956080267394';
  const webhookUrl = process.env.WEBHOOK_URL;
  const REQUIRED_STATUS = 'https://dsc.gg/nexxto';

  if(!supabaseUrl || !supabaseKey) return res.status(500).json({error:'Supabase not configured'});

  // check blacklist
  try{
    const bl = await fetch(`${supabaseUrl}/rest/v1/blacklist?select=*&discord_id=eq.${payload.id}`,{headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}});
    const blData = await bl.json();
    if(Array.isArray(blData)&&blData.length>0) return res.status(403).json({error:'You are blacklisted', reason:blData[0].reason});
  }catch(e){ console.error(e); }

  // check guild membership via bot token if available
  if(botToken){
    try{
      const gm = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${payload.id}`,{headers:{Authorization:`Bot ${botToken}`}});
      if(!gm.ok) return res.status(403).json({error:'You must be in the Discord server first'});
      // Note: presence not available via REST, so we skip strict status check here - bot's statusMonitor will handle it
    }catch{}
  }

  // upsert whitelist
  try{
    const existing = await fetch(`${supabaseUrl}/rest/v1/whitelist?select=*&discord_id=eq.${payload.id}`,{headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}});
    const exData = await existing.json();
    let method='POST';
    let url = `${supabaseUrl}/rest/v1/whitelist`;
    let body = {discord_id: payload.id, hwid: cleanHwid, added_at: new Date().toISOString()};
    let headers = {apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`, 'Content-Type':'application/json'};
    if(Array.isArray(exData)&&exData.length>0){
      method='PATCH';
      url = `${supabaseUrl}/rest/v1/whitelist?discord_id=eq.${payload.id}`;
      body = {hwid: cleanHwid};
    } else {
      headers.Prefer='return=representation';
    }
    const up = await fetch(url,{method, headers, body: JSON.stringify(body)});
    if(!up.ok){
      const txt = await up.text();
      throw new Error(txt);
    }

    // send webhook
    if(webhookUrl){
      try{
        await fetch(webhookUrl,{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({embeds:[{title:`NexxTo Webhook (Whitelist via Website)`,description:`**Discord Id** = <@${payload.id}>\n**HWID** = \`${cleanHwid}\`\n**Username** = ${payload.username}\nTimestamp = ${new Date().toISOString()}`,color:0x57f287}]} )});
      }catch{}
    }

    return res.status(200).json({ok:true, message: Array.isArray(exData)&&exData.length>0?'HWID updated':'You are whitelisted'});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:'Failed to whitelist: '+e.message});
  }
}
