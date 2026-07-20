
// /api/auth/me.js - returns auth status + whitelist info
import crypto from 'crypto';

function verifySession(cookieVal, secret){
  if(!cookieVal) return null;
  const [b64, sig] = cookieVal.split('.');
  if(!b64||!sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(b64).digest('hex');
  if(sig!==expected) return null;
  try{
    const payload = JSON.parse(Buffer.from(b64,'base64url').toString());
    if(payload.exp < Date.now()) return null;
    return payload;
  }catch{ return null; }
}

function getCookie(req,name){
  const c = req.headers.cookie||'';
  const m = c.match(new RegExp('(?:^|; )'+name+'=([^;]+)'));
  return m?decodeURIComponent(m[1]):null;
}

export default async function handler(req,res){
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET || clientSecret || 'fallback-secret';
  const sessionCookie = getCookie(req,'nexxto_session');
  const payload = verifySession(sessionCookie, sessionSecret);

  if(!payload){
    return res.status(200).json({authenticated:false});
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  const botToken = process.env.BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID || '1503342956080267394';

  let inGuild = false;
  let hasStatus = null; // null = unknown (REST can't get presence)
  let whitelisted = false;
  let hwid = null;
  let added_at = null;
  let blacklisted = false;
  let blacklistReason = null;

  // check supabase whitelist/blacklist
  if(supabaseUrl && supabaseKey){
    try{
      const q = await fetch(`${supabaseUrl}/rest/v1/whitelist?select=*&discord_id=eq.${payload.id}`,{
        headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}
      });
      const wl = await q.json();
      if(Array.isArray(wl) && wl.length>0){
        whitelisted=true; hwid=wl[0].hwid; added_at=wl[0].added_at||wl[0].created_at;
      }
      const qb = await fetch(`${supabaseUrl}/rest/v1/blacklist?select=*&discord_id=eq.${payload.id}`,{
        headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}
      });
      const bl = await qb.json();
      if(Array.isArray(bl) && bl.length>0){ blacklisted=true; blacklistReason=bl[0].reason; }
    }catch(e){ console.error('supabase check', e.message); }
  }

  // check guild membership via bot token
  if(botToken){
    try{
      const gm = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${payload.id}`,{
        headers:{Authorization:`Bot ${botToken}`}
      });
      if(gm.ok){ inGuild=true; }
    }catch(e){ console.error('guild check', e.message); }
  } else {
    // fallback: try with user token via /users/@me/guilds - check if in guild
    try{
      const guildsRes = await fetch('https://discord.com/api/users/@me/guilds',{
        headers:{Authorization:`Bearer ${payload.access_token}`}
      });
      if(guildsRes.ok){
        const guilds = await guildsRes.json();
        inGuild = guilds.some(g=>g.id===guildId);
      }
    }catch{}
  }

  const avatarURL = payload.avatar ? `https://cdn.discordapp.com/avatars/${payload.id}/${payload.avatar}.png?size=128` : null;

  return res.status(200).json({
    authenticated:true,
    user:{ id: payload.id, username: payload.global_name || payload.username, avatarURL },
    inGuild,
    hasStatus, // always null for now - bot gateway checks
    whitelisted,
    hwid,
    added_at,
    blacklisted,
    blacklistReason
  });
}
