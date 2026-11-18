// 여수 언니김치 주문 접수 · 개인정보 AES-GCM 암호화 저장
function json(o,s){return new Response(JSON.stringify(o),{status:s||200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function same(a,b){a=String(a||'');b=String(b||'');if(!a||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function clean(v,n){return String(v==null?'':v).replace(/[\\u0000-\\u001f<>]/g,'').trim().slice(0,n);}
function rand(n){return [...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();}
async function key(env){if(!env.ORDER_DATA_KEY)return null;const raw=Uint8Array.from(atob(env.ORDER_DATA_KEY),c=>c.charCodeAt(0));if(raw.length!==32)return null;return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
async function seal(k,value){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(value))));const all=new Uint8Array(iv.length+ct.length);all.set(iv);all.set(ct,iv.length);return btoa(String.fromCharCode(...all));}
async function open(k,value){const all=Uint8Array.from(atob(value),c=>c.charCodeAt(0));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},k,all.slice(12));return JSON.parse(new TextDecoder().decode(plain));}
async function ensure(db){await db.prepare("CREATE TABLE IF NOT EXISTS kimchi_orders (id TEXT PRIMARY KEY, data TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new')").run();}
export async function onRequest({request,env}){
 const db=env.DB;if(!db)return json({error:'no-db'},503);
 if(request.method!=='POST')return json({error:'method'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);
 let b={};try{const raw=await request.text();if(raw.length>12000)return json({error:'large'},413);b=JSON.parse(raw);}catch(e){return json({error:'bad'},400);}
 await ensure(db);
 if(b.action==='create'){
   const k=await key(env);if(!k)return json({error:'setup'},503);
   const o=b.order||{};
   const order={buyer:clean(o.buyer,40),phone:clean(o.phone,30),orderType:o.orderType==='선물 보내기'?'선물 보내기':'우리 집 받기',recipient:clean(o.recipient,40),recipientPhone:clean(o.recipientPhone,30),address:clean(o.address,300),giftMessage:clean(o.giftMessage,300),memo:clean(o.memo,300),payment:clean(o.payment,120),quantity:Math.max(1,Math.min(50,Number(o.quantity)||1)),amount:Math.max(0,Math.min(3000000,Number(o.amount)||0))};
   if(!order.buyer||!order.phone||!order.address||(order.orderType==='선물 보내기'&&(!order.recipient||!order.recipientPhone)))return json({error:'required'},400);
   const ip=request.headers.get('cf-connecting-ip')||'unknown';const now=Date.now();
   await db.prepare('CREATE TABLE IF NOT EXISTS kimchi_order_rate (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)').run();
   const rr=await db.prepare('SELECT n,until FROM kimchi_order_rate WHERE ip=?').bind(ip).first();
   if(rr&&rr.until>now&&rr.n>=8)return json({error:'slow'},429);
   if(!rr||rr.until<=now)await db.prepare('INSERT OR REPLACE INTO kimchi_order_rate (ip,n,until) VALUES (?,1,?)').bind(ip,now+3600000).run();
   else await db.prepare('UPDATE kimchi_order_rate SET n=n+1 WHERE ip=?').bind(ip).run();
   const id='YK-'+rand(5);await db.prepare('INSERT INTO kimchi_orders (id,data,created,status) VALUES (?,?,?,?)').bind(id,await seal(k,order),now,'new').run();
   return json({ok:true,orderNo:id});
 }
 if(!env.ADMIN_KEY||!same(b.admin,env.ADMIN_KEY))return json({error:'key'},403);
 const k=await key(env);if(!k)return json({error:'setup'},503);
 if(b.action==='status'){
   const allowed=['new','paid','preparing','shipped','done','canceled'];if(!allowed.includes(b.status))return json({error:'status'},400);
   await db.prepare('UPDATE kimchi_orders SET status=? WHERE id=?').bind(b.status,String(b.id||'')).run();return json({ok:true});
 }
 if(b.action==='list'){
   const {results}=await db.prepare('SELECT id,data,created,status FROM kimchi_orders ORDER BY created DESC LIMIT 500').all();
   const items=[];for(const r of results||[]){try{items.push({id:r.id,created:r.created,status:r.status,order:await open(k,r.data)});}catch(e){}}
   return json({ok:true,items});
 }
 return json({error:'bad-action'},400);
}