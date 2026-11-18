// 싸바 앱 통합 갓김치 주문 API — 비회원 주문 허용, 관리자만 전체 관리
import { currentUser } from './auth/[[path]].js';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n)=>String(v??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
const digits=v=>String(v||'').replace(/\D/g,'');
const rand=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
// 암호화 열쇠: Cloudflare 비밀 ORDER_DATA_KEY 가 있으면 그것, 없으면 처음 한 번 만들어 R2(주문 DB와 다른 곳)에 보관
async function keyB64(env){if(env.ORDER_DATA_KEY)return env.ORDER_DATA_KEY;if(!env.VIDEO)return null;
 const o=await env.VIDEO.get('secret/order-data-key');if(o)return (await o.text()).trim();
 const k=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
 await env.VIDEO.put('secret/order-data-key',k,{onlyIf:{etagDoesNotMatch:'*'}}).catch(()=>{});
 const again=await env.VIDEO.get('secret/order-data-key');return again?(await again.text()).trim():null;}
async function getKey(env){const b64=await keyB64(env);if(!b64)return null;try{const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));if(raw.length!==32)return null;return await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}catch(e){return null;}}
async function seal(k,v){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(v))));const a=new Uint8Array(12+ct.length);a.set(iv);a.set(ct,12);return btoa(String.fromCharCode(...a));}
async function unseal(k,v){const a=Uint8Array.from(atob(v),c=>c.charCodeAt(0));const p=await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(0,12)},k,a.slice(12));return JSON.parse(new TextDecoder().decode(p));}
async function ensure(db){await db.prepare("CREATE TABLE IF NOT EXISTS kimchi_orders (id TEXT PRIMARY KEY, uid INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new')").run();try{await db.prepare('ALTER TABLE kimchi_orders ADD COLUMN uid INTEGER NOT NULL DEFAULT 0').run();}catch(e){}}
const statuses=['new','paid','preparing','shipped','done','canceled'];
export async function onRequest({request,env}){
 if(request.method!=='POST')return json({error:'method'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);
 if(!env.DB)return json({error:'no-db'},503);
 await ensure(env.DB);
 let b={};try{const raw=await request.text();if(raw.length>16000)return json({error:'large'},413);b=JSON.parse(raw);}catch(e){return json({error:'bad'},400);}
 const user=await currentUser(request,env.DB);
 const admin=!!user&&String(user.id)===String(env.SAVA_ADMIN_UID||'');
 if(b.action==='create'){
  const k=await getKey(env);if(!k)return json({error:'setup'},503);
  if(!b.agree)return json({error:'agree'},400);
  // 장난 주문 막기: 같은 접속 주소에서 하루 10건까지
  try{await env.DB.prepare('CREATE TABLE IF NOT EXISTS blog_use (k TEXT, day TEXT, n INTEGER, PRIMARY KEY (k, day))').run();
   const ip=request.headers.get('cf-connecting-ip')||'x',h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ko|'+ip)))].slice(0,10).map(x=>x.toString(16).padStart(2,'0')).join('');
   const day=new Date(Date.now()+9*3600e3).toISOString().slice(0,10),kk='kimchi:'+h;
   const r=await env.DB.prepare('SELECT n FROM blog_use WHERE k=? AND day=?').bind(kk,day).first();if(r&&r.n>=10)return json({error:'limit'},429);
   await env.DB.prepare('INSERT INTO blog_use (k,day,n) VALUES (?,?,1) ON CONFLICT(k,day) DO UPDATE SET n=n+1').bind(kk,day).run();}catch(e){}
  const o=b.order||{},order={buyer:clean(o.buyer,40),phone:clean(o.phone,30),orderType:o.orderType==='선물 보내기'?'선물 보내기':'우리 집 받기',recipient:clean(o.recipient,40),recipientPhone:clean(o.recipientPhone,30),address:clean(o.address,300),giftMessage:clean(o.giftMessage,300),memo:clean(o.memo,300),payment:clean(o.payment,120),quantity:Math.max(1,Math.min(50,Number(o.quantity)||1))};
  order.amount=order.quantity*60000;
  if(!order.buyer||digits(order.phone).length<9||!order.address||(order.orderType==='선물 보내기'&&(!order.recipient||digits(order.recipientPhone).length<9)))return json({error:'required'},400);
  const now=Date.now(),id='YK-'+rand(5);
  await env.DB.prepare('INSERT INTO kimchi_orders (id,uid,data,created,status) VALUES (?,?,?,?,?)').bind(id,user?user.id:0,await seal(k,order),now,'new').run();
  return json({ok:true,orderNo:id,created:now,order,status:'new'});
 }
 if(b.action==='lookup'){
  const k=await getKey(env);if(!k)return json({error:'setup'},503);
  const id=clean(b.orderNo,30),phone=digits(b.phone);
  if(!id||phone.length<9)return json({error:'required'},400);
  const r=await env.DB.prepare('SELECT id,data,created,status FROM kimchi_orders WHERE id=?').bind(id).first();
  if(!r)return json({error:'not-found'},404);
  let o;try{o=await unseal(k,r.data);}catch(e){return json({error:'not-found'},404);}
  if(digits(o.phone)!==phone)return json({error:'not-found'},404);
  return json({ok:true,item:{id:r.id,created:r.created,status:r.status,order:{orderType:o.orderType,quantity:o.quantity,amount:o.amount,recipient:o.recipient,address:o.address}}});
 }
 // 내 주문: 로그인한 회원이 낸 주문 (어느 기기에서든)
 if(b.action==='mine'){
  if(!user)return json({ok:true,items:[],login:0});
  const k=await getKey(env);if(!k)return json({error:'setup'},503);
  const {results}=await env.DB.prepare('SELECT id,data,created,status FROM kimchi_orders WHERE uid=? ORDER BY created DESC LIMIT 50').bind(user.id).all();
  const items=[];for(const r of results||[]){try{const o=await unseal(k,r.data);items.push({id:r.id,created:r.created,status:r.status,order:{orderType:o.orderType,quantity:o.quantity,amount:o.amount,recipient:o.recipient,address:o.address}});}catch(e){}}
  return json({ok:true,items,login:1});
 }
 if(!admin)return json({error:'forbidden'},403);
 if(b.action==='list'){
  const k=await getKey(env);if(!k)return json({error:'setup'},503);
  const {results}=await env.DB.prepare('SELECT id,data,created,status FROM kimchi_orders ORDER BY created DESC LIMIT 500').all();
  const items=[];for(const r of results||[]){try{items.push({id:r.id,created:r.created,status:r.status,order:await unseal(k,r.data)});}catch(e){}}
  return json({ok:true,items});
 }
 if(b.action==='status'){if(!statuses.includes(b.status))return json({error:'status'},400);await env.DB.prepare('UPDATE kimchi_orders SET status=? WHERE id=?').bind(b.status,clean(b.id,40)).run();return json({ok:true});}
 return json({error:'bad-action'},400);
}
