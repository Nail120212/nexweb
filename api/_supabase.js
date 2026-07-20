
export function getSupabaseConfig(){
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  }
}
export async function supabaseQuery(table, method='GET', {eq={}, body=null, select='*'}={}){
  const cfg = getSupabaseConfig();
  if(!cfg.url || !cfg.key) throw new Error('Supabase env missing');
  let url = `${cfg.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  for(const [k,v] of Object.entries(eq)){
    url+=`&${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`;
  }
  const headers = {
    'apikey': cfg.key,
    'Authorization': `Bearer ${cfg.key}`,
    'Content-Type':'application/json'
  };
  if(method==='GET') headers['Range']='0-100';
  const res = await fetch(url, {method, headers, body: body?JSON.stringify(body):undefined});
  const text = await res.text();
  let json;
  try{ json = JSON.parse(text); }catch{ json = text; }
  if(!res.ok) throw new Error(`Supabase ${table} ${method} failed: ${text}`);
  return json;
}
