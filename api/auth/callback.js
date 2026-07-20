
// /api/auth/callback.js
import crypto from 'crypto';

function sign(data, secret){
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export default async function handler(req, res){
  const { code, state } = req.query;
  const cookies = Object.fromEntries((req.headers.cookie||'').split(';').map(c=>{const [k,...v]=c.trim().split('='); return [k, v.join('=')]}).filter(x=>x[0]));
  const expectedState = cookies.oauth_state;
  // verify state if present
  if(expectedState && state !== expectedState){
    return res.status(400).send('Invalid state');
  }
  if(!code) return res.status(400).send('No code');

  const clientId = process.env.DISCORD_CLIENT_ID || '1528748471673290984';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`;

  if(!clientSecret) return res.status(500).send('DISCORD_CLIENT_SECRET not set in Vercel env');

  try{
    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    const tokenData = await tokenRes.json();
    if(!tokenRes.ok) return res.status(400).json(tokenData);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{Authorization: `Bearer ${tokenData.access_token}`}
    });
    const user = await userRes.json();
    if(!userRes.ok) return res.status(400).json(user);

    // create session cookie (simple signed JWT like)
    const sessionSecret = process.env.SESSION_SECRET || clientSecret;
    const payload = {
      id: user.id,
      username: user.username,
      global_name: user.global_name,
      avatar: user.avatar,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      exp: Date.now()+ 7*24*60*60*1000
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = sign(payloadB64, sessionSecret);
    const sessionCookie = `${payloadB64}.${sig}`;

    // clear state cookie, set session
    res.setHeader('Set-Cookie', [
      `oauth_state=; Path=/; Max-Age=0`,
      `nexxto_session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*3600}`
    ]);
    // redirect to main with whitelist open
    res.redirect(302, '/main.html?oauth=success#whitelist');
  }catch(e){
    console.error(e);
    res.status(500).send('OAuth error: '+e.message);
  }
}
