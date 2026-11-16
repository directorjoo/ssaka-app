// Public order intake. Never expose the service-role key to the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sava.kr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://sava.kr" && origin !== "https://www.sava.kr") {
    return json({ error: "허용되지 않은 요청입니다." }, 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST 요청만 허용됩니다." }, 405);

  try {
    const body = await req.json();
    // Honeypot: quiet success for simple automated spam.
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true });

    const clean = (v: unknown, max: number) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";
    const order_type = clean(body.order_type, 20);
    const buyer_name = clean(body.buyer_name, 30);
    const buyer_phone = clean(body.buyer_phone, 20).replace(/[^0-9]/g, "");
    const quantity = Number(body.quantity);
    const payment_method = clean(body.payment_method, 80);
    const delivery_memo = clean(body.delivery_memo, 300);
    const gift_message = clean(body.gift_message, 200);
    const isGift = order_type === "선물하기";
    const delivery_name = isGift ? clean(body.delivery_name, 30) : buyer_name;
    const delivery_phone = (isGift ? clean(body.delivery_phone, 20) : buyer_phone).replace(/[^0-9]/g, "");
    const delivery_address = clean(body.delivery_address, 300);

    if (!["내가 먹기", "선물하기"].includes(order_type)) return json({ error: "주문 방식을 확인해 주세요." }, 400);
    if (!buyer_name || !/^01[016789][0-9]{7,8}$/.test(buyer_phone)) return json({ error: "주문자 이름과 휴대폰 번호를 확인해 주세요." }, 400);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return json({ error: "주문 수량은 1~50박스입니다." }, 400);
    if (!delivery_address) return json({ error: "배송 주소를 입력해 주세요." }, 400);
    if (isGift && (!delivery_name || !/^01[016789][0-9]{7,8}$/.test(delivery_phone))) return json({ error: "선물 받는 분 정보를 확인해 주세요." }, 400);
    if (!payment_method) return json({ error: "결제 방법을 선택해 주세요." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase.from("kimchi_orders").insert({
      order_type, buyer_name, buyer_phone, delivery_name, delivery_phone,
      delivery_address, gift_message, quantity, unit_price: 60000,
      payment_method, delivery_memo,
    }).select("order_no, quantity, total_amount").single();

    if (error) {
      console.error("kimchi order insert failed", error);
      return json({ error: "주문 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
    }
    return json({ ok: true, order: data }, 201);
  } catch (error) {
    console.error("kimchi order request failed", error);
    return json({ error: "주문 내용을 확인해 주세요." }, 400);
  }
});
