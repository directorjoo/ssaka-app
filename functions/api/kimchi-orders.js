// 싸바 앱 통합 갓김치 주문 API
// 고객은 싸바 회원 로그인 후 주문하고, 본인 주문만 조회한다.
// 관리자 권한은 SAVA_ADMIN_UID에 지정된 싸바 회원 ID로 판정한다.
import { currentUser } from './auth/[[path]].js';

const json = (o, s=200) => new Response(JSON.stringify(o), {
  status:s, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const clean = (v,n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
const rand = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
async function getKey(env) {
  if (!env.ORDER_DATA_KEY) return null;
  try {
    const raw=Uint8Array.from(atob(env.ORDER_DATA_KEY),c=>c.charCodeAt(0));
    if(raw.length!==32)return null;
    return await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
  } catch(e){return null;}
}
async function seal(k,v){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(v))));
  const all=new Uint8Array(iv.length+ct.length);all.set(iv);all.set(ct,iv.length);
  return btoa(String.fromCharCode(...all));
}
async function unseal(k,v){
  const a=Uint8Array.from(atob(v),c=>c.charCodeAt(0));
  const p=await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(0,12)},k,a.slice(12));
  return JSON.parse(new TextDecoder().decode(p));
}
async function ensure(db){
  await db.prepare("CREATE TABLE IF NOT EXISTS kimchi_orders (id TEXT PRIMARY KEY, uid INTEGER NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new')").run();
  try{await db.prepare('ALTER TABLE kimchi_orders ADD COLUMN uid INTEGER NOT NULL DEFAULT 0').run();}catch(e){}
}
const statuses=['new','paid','preparing','shipped','done','canceled'];
export async function onRequest({request,env}){
  if(request.method!=='POST')return json({error:'method'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);
  if(!env.DB)return json({error:'no-db'},503);
  await ensure(env.DB);
  const user=await currentUser(request,env.DB);
  if(!user)return json({error:'login'},401);
  let b={};try{const raw=await request.text();if(raw.length>16000)return json({error:'large'},413);b=JSON.parse(raw);}catch(e){return json({error:'bad'},400);}
  const admin=String(user.id)===String(env.SAVA_ADMIN_UID||'');
  if(b.action==='create'){
    const k=await getKey(env);if(!k)return json({error:'setup'},503);
    const o=b.order||{};
    const order={
      buyer:clean(o.buyer,40),phone:clean(o.phone,30),
      orderType:o.orderType==='선물 보내기'?'선물 보내기':'우리 집 받기',
      recipient:clean(o.recipient,40),recipientPhone:clean(o.recipientPhone,30),
      address:clean(o.address,300),giftMessage:clean(o.giftMessage,300),
      memo:clean(o.memo,300),payment:clean(o.payment,120),
      quantity:Math.max(1,Math.min(50,Number(o.quantity)||1))
    };
    order.amount=order.quantity*60000;
    if(!order.buyer||!order.phone||!order.address||(order.orderType==='선물 보내기'&&(!order.recipient||!order.recipientPhone)))return json({error:'required'},400);
    const now=Date.now(),id='YK-'+rand(5);
    await env.DB.prepare('INSERT INTO kimchi_orders (id,uid,data,created,status) VALUES (?,?,?,?,?)').bind(id,user.id,await seal(k,order),now,'new').run();
    return json({ok:true,orderNo:id,created:now,order,status:'new'});
  }
  if(b.action==='mine'){
    const k=await getKey(env);if(!k)return json({error:'setup'},503);
    const {results}=await env.DB.prepare('SELECT id,data,created,status FROM kimchi_orders WHERE uid=? ORDER BY created DESC LIMIT 100').bind(user.id).all();
    const items=[];for(const r of results||[]){try{items.push({id:r.id,created:r.created,status:r.status,order:await unseal(k,r.data)});}catch(e){}}
    return json({ok:true,items});
  }
  if(!admin)return json({error:'forbidden'},403);
  if(b.action==='list'){
    const k=await getKey(env);if(!k)return json({error:'setup'},503);
    const {results}=await env.DB.prepare('SELECT id,data,created,status FROM kimchi_orders ORDER BY created DESC LIMIT 500').all();
    const items=[];for(const r of results||[]){try{items.push({id:r.id,created:r.created,status:r.status,order:await unseal(k,r.data)});}catch(e){}}
    return json({ok:true,items});
  }
  if(b.action==='status'){
    if(!statuses.includes(b.status))return json({error:'status'},400);
    await env.DB.prepare('UPDATE kimchi_orders SET status=? WHERE id=?').bind(b.status,clean(b.id,40)).run();
    return json({ok:true});
  }
  return json({error:'bad-action'},400);
}
