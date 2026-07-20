// /api/stats.js - returns members count + executes count (global)
let execCountMemory = 0;

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  const guildInvite = 'GtbrFrcU5z';
  const guildId = process.env.GUILD_ID || '1503342956080267394';

  let members = null;
  let executes = null;

  // members: try invite API
  try{
    const inv = await fetch(`https://discord.com/api/v10/invites/${guildInvite}?with_counts=true`);
    if(inv.ok){
      const j = await inv.json();
      members = j.approximate_member_count || j.approximate_presence_count || null;
    }
  }catch{}

  // executes: try supabase whitelist count + exec table
  if(supabaseUrl && supabaseKey){
    try{
      // whitelist count as proxy
      const r = await fetch(`${supabaseUrl}/rest/v1/whitelist?select=count`,{
        headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`, Prefer:'count=exact'},
        method:'HEAD'
      });
      // HEAD with count=exact returns content-range header
      const cr = r.headers.get('content-range');
      if(cr){
        const m = cr.match(/\/([0-9]+)/) || cr.match(/([0-9]+)$/);
        // actually format "0-0/123"
        const parts = cr.split('/');
        if(parts[1]) executes = parseInt(parts[1],10);
      }
      // try exec_stats table if exists
      try{
        const er = await fetch(`${supabaseUrl}/rest/v1/exec_stats?select=count&id=eq.1`,{
          headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`}
        });
        if(er.ok){
          const ej = await er.json();
          if(Array.isArray(ej)&&ej[0]?.count) executes = Math.max(executes||0, ej[0].count);
        }
      }catch{}
    }catch(e){ console.error(e.message); }
  }

  // POST = increment exec (called from loader or frontend)
  if(req.method==='POST'){
    execCountMemory++;
    if(supabaseUrl && supabaseKey){
      try{
        // upsert increment via rpc or simple table
        await fetch(`${supabaseUrl}/rest/v1/exec_stats`,{
          method:'POST',
          headers:{apikey:supabaseKey, Authorization:`Bearer ${supabaseKey}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates'},
          body: JSON.stringify({id:1, count: (executes||0)+1 + execCountMemory, updated_at: new Date().toISOString()})
        });
      }catch{}
    }
    if(executes!==null) executes = executes + 1;
    else executes = execCountMemory;
    return res.status(200).json({members: members||0, executes, incremented:true});
  }

  return res.status(200).json({members: members|| 0, executes: executes ?? 0});
    }

