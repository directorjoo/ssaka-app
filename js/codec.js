/* 싸카 카드 데이터 ↔ 링크 변환
 * 카드 내용(JSON)을 링크 안에 넣어서, 서버나 DB 없이도 카드를 만들고 열 수 있게 합니다.
 * JSON → UTF-8 → base64url
 */
(function (global) {
  function clean(v) {
    if (Array.isArray(v)) {
      var a = v.map(clean).filter(function (x) { return x !== undefined; });
      return a.length ? a : undefined;
    }
    if (v && typeof v === 'object') {
      var o = {}, any = false;
      Object.keys(v).forEach(function (k) {
        var c = clean(v[k]);
        if (c !== undefined) { o[k] = c; any = true; }
      });
      return any ? o : undefined;
    }
    if (typeof v === 'string') { v = v.trim(); return v ? v : undefined; }
    if (v === false || v === null) return undefined;
    return v;
  }

  function encode(card) {
    var json = JSON.stringify(clean(card) || {});
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(str) {
    try {
      var b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var obj = JSON.parse(decodeURIComponent(escape(atob(b64))));
      return obj && typeof obj === 'object' ? obj : null;
    } catch (e) { return null; }
  }

  var api = { encode: encode, decode: decode, clean: clean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SsakaCodec = api;
})(typeof window !== 'undefined' ? window : globalThis);
