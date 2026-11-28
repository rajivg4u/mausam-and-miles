import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { createClient } from '@supabase/supabase-js';
loadEnvConfig(process.cwd(), true);
const [city='Chennai', latArg='13.0827', lonArg='80.2707', radiusArg='30'] = process.argv.slice(2);
const lat=Number(latArg), lon=Number(lonArg), radius=Number(radiusArg);
if (![lat,lon,radius].every(Number.isFinite)||Math.abs(lat)>80||Math.abs(lon)>180||radius<1||radius>50) throw Error('Invalid coordinates or radius (1–50 km)');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw Error('Missing Supabase configuration');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wiki(params){
 for(let i=0;i<3;i++){
  await sleep(1100);
  try{
   const res=await fetch('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',maxlag:'5',...params}),{headers:{'User-Agent':'MausamAndMiles/3.0 (https://github.com/rajivg4u/mausam-and-miles)',Accept:'application/json'},signal:AbortSignal.timeout(20000)});
   if(!res.ok){const retry=Number(res.headers.get('retry-after')); if(retry>120) throw Object.assign(Error('Provider requests long cooldown; rerun later'),{fatal:true}); if(retry>0) await sleep(retry*1000); throw Error('HTTP '+res.status);}
   const data=await res.json(); if(data.error) throw Error(data.error.info); return data;
  }catch(e){if(i===2||e.fatal)throw e; await sleep(3000*2**i);}
 }
}
const reject=/\b(constituenc(?:y|ies)|neighbou?rhoods?|suburbs?|districts?|villages?|municipalities|stations?|airports?|railway lines?|schools?|colleges?|universities|roads?|streets?|disambiguation|localit(?:y|ies)|townships?)\b/i;
const rules=[['temple',/\b(temple|mandir|hindu shrine)\b/i],['religious',/\b(church|mosque|cathedral|synagogue|gurdwara|gurudwara|monastery|basilica)\b/i],['museum',/\b(museum|art gallery|planetarium)\b/i],['sports',/\b(stadium|sports venue)\b/i],['beach',/\bbeach\b/i],['park',/\b(public park|urban park|national park|botanical garden|zoo|garden|park)\b/i],['historic',/\b(fort|palace|monument|memorial|statue|archaeological site|historic building|tomb|mausoleum)\b/i],['landmark',/\b(lighthouse|public hall|aquarium|tourist attraction|amusement park)\b/i]];
function classify(title,desc){if(!desc||reject.test(title)||reject.test(desc))return null; return rules.find(([,r])=>r.test(desc))?.[0]??null;}
const distance=(a,b)=>{const r=x=>x*Math.PI/180;return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(r(a-lat)/2)**2+Math.cos(r(lat))*Math.cos(r(a))*Math.sin(r(b-lon)/2)**2)));};
const seen=new Set(); let accepted=0,failed=0,tiles=0;
for(let n=-Math.ceil(radius/8);n<=Math.ceil(radius/8);n++)for(let e=-Math.ceil(radius/8);e<=Math.ceil(radius/8);e++){
 if(Math.hypot(n*8,e*8)>radius+6)continue;
 const a=lat+n*8/111.2,b=((lon+e*8/(111.2*Math.cos(lat*Math.PI/180))+540)%360)-180;
 if(Math.abs(a)>90)continue;
 tiles++; console.log(`${city}: tile ${tiles} (${a.toFixed(3)}, ${b.toFixed(3)})`);
 try{
  let cont={}; let pages=0;
  do{
   const data=await wiki({generator:'geosearch',ggscoord:`${a}|${b}`,ggsradius:'6000',ggslimit:'50',prop:'coordinates|description',...cont});
   const rows=[];
   for(const p of data.query?.pages??[]){
    if(seen.has(p.pageid))continue;
    const c=p.coordinates?.find(x=>x.primary!==undefined)??p.coordinates?.[0];
    if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||distance(c.lat,c.lon)>radius)continue;
    const category=classify(p.title,p.description); if(!category)continue;
    rows.push({source:'wikipedia',source_id:String(p.pageid),name:p.title,category,latitude:c.lat,longitude:c.lon,website:`https://en.wikipedia.org/?curid=${p.pageid}`,is_verified:true,updated_at:new Date().toISOString()});
   }
   if(rows.length){
    const {data:blocked,error:be}=await db.from('attraction_import_exclusions').select('source_id').eq('source','wikipedia').in('source_id',rows.map(x=>x.source_id));if(be)throw be;
    const ids=new Set(blocked.map(x=>x.source_id)); const clean=rows.filter(x=>!ids.has(x.source_id));
    if(clean.length){const {error}=await db.from('attractions').upsert(clean,{onConflict:'source,source_id',ignoreDuplicates:true});if(error)throw error;
    // Promote previously unverified records only; preserve manual verified classifications.
    for(const row of clean){const {error}=await db.from('attractions').update(row).eq('source',row.source).eq('source_id',row.source_id).eq('is_verified',false);if(error)throw error;seen.add(Number(row.source_id));} accepted+=clean.length;}
   }
   cont=data.continue; pages++; if(cont&&pages>=10){console.warn('Tile page cap reached; coverage incomplete');break;}
  }while(cont);
 }catch(err){failed++;console.error('Tile failed:',err.message??err); if(err.fatal)throw err;}
}
console.log({city,tiles,accepted,failed}); if(failed)process.exitCode=1;
