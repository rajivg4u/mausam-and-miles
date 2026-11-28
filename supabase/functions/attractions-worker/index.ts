import { createClient } from 'npm:@supabase/supabase-js@2';
const reject = /\b(constituenc(?:y|ies)|neighbou?rhoods?|suburbs?|districts?|villages?|municipalities|stations?|airports?|railway lines?|schools?|colleges?|universities|roads?|streets?|disambiguation|localit(?:y|ies)|townships?)\b/i;
const rules: [string, RegExp][] = [['temple',/\b(temple|mandir|hindu shrine)\b/i],['religious',/\b(church|mosque|cathedral|synagogue|gurdwara|monastery|basilica)\b/i],['museum',/\b(museum|art gallery|planetarium)\b/i],['sports',/\bstadium\b/i],['beach',/\bbeach\b/i],['park',/\b(public park|urban park|national park|botanical garden|zoo)\b/i],['historic',/\b(fort|palace|monument|memorial|statue|archaeological site|historic building|tomb|mausoleum)\b/i],['landmark',/\b(lighthouse|public hall|aquarium|tourist attraction|amusement park)\b/i]];
Deno.serve(async req => {
 const secret=Deno.env.get('ATTRACTIONS_WORKER_TOKEN');
 if(req.method!=='POST'||!secret||req.headers.get('x-worker-token')!==secret) return new Response('Unauthorized',{status:401});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('claim_attraction_tile');
 if(error)return Response.json({error:error.message},{status:500});
 const j=data?.[0]; if(!j)return Response.json({status:'idle'});
 const args={p_x:j.tile_x,p_y:j.tile_y,p_token:j.lease_token};
 try {
 const lat=(j.tile_y+0.5)*0.05,lon=(j.tile_x+0.5)*0.05;
 const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',maxlag:'5',generator:'geosearch',ggscoord:`${lat}|${lon}`,ggsradius:'4500',ggslimit:'50',prop:'coordinates|description|info',...j.cursor_data});
 const res=await fetch('https://en.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':'MausamAndMiles/4.0 (https://github.com/rajivg4u/mausam-and-miles)',Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('Wikipedia HTTP '+res.status);
 const body=await res.json(); if(body.error)throw Error(body.error.info); if(body.warnings)throw Error('Wikipedia query warning: '+JSON.stringify(body.warnings));
 const rows=[]; const seen=new Set();
 for(const p of body.query?.pages??[]){
 const c=p.coordinates?.find((v:{primary?:unknown})=>v.primary!==undefined)??p.coordinates?.[0];
 if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||!p.description||reject.test(p.title)||reject.test(p.description)||seen.has(p.pageid))continue;
 if(Math.floor(c.lat/0.05)!==j.tile_y||Math.floor(c.lon/0.05)!==j.tile_x)continue;
 const category=rules.find(([,r])=>r.test(p.description))?.[0]; if(!category||!Number.isSafeInteger(p.lastrevid))continue;
 seen.add(p.pageid);rows.push({source_id:String(p.pageid),name:p.title,category,latitude:c.lat,longitude:c.lon,website:`https://en.wikipedia.org/?curid=${p.pageid}`,source_revision:p.lastrevid});
 }
 const result=await db.rpc('finish_attraction_page',{...args,p_rows:rows,p_cursor:body.continue??null,p_error:null});
 if(result.error||!result.data)throw Error(result.error?.message??'Lease expired');
 return Response.json({status:body.continue?'more':'completed',accepted:rows.length});
 }catch(e){const message=e instanceof Error?e.message:String(e);const result=await db.rpc('finish_attraction_page',{...args,p_rows:[],p_cursor:null,p_error:message});return Response.json({error:message,recorded:result.data===true},{status:503});}
});
