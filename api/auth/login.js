
// /api/auth/login.js
export default async function handler(req, res){
  const clientId = process.env.DISCORD_CLIENT_ID || '1528748471673290984';
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`;
  const state = Math.random().toString(36).substring(2)+Date.now().toString(36);
  // set state cookie httpOnly
  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const scope = encodeURIComponent('identify guilds');
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&prompt=consent`;
  res.redirect(302, url);
}
