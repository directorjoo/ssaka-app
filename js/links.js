/* 업종별 공식 사이트 바로가기 (무료) — 카드를 만드는 사람에게 보여줌
 * 주소가 바뀌면 여기만 고치면 됩니다.
 */
(function (global) {
  var L = {
    gov24: ['정부24 민원', 'https://www.gov.kr', '🏛️'],
    hometax: ['홈택스 (세금 신고)', 'https://www.hometax.go.kr', '🧾'],
    insure4: ['4대보험 신고', 'https://www.4insure.or.kr', '🩺'],
    sbiz: ['소상공인24 (지원사업)', 'https://www.sbiz24.kr', '🏪'],
    food: ['식품안전나라', 'https://www.foodsafetykorea.go.kr', '🍽️'],
    neis: ['나이스 (교육 민원)', 'https://www.neis.go.kr', '🏫'],
    jne: ['전남교육청', 'https://www.jne.go.kr', '🏫'],
    gen: ['광주교육청', 'https://www.gen.go.kr', '🏫'],
    kofic: ['영화진흥위원회', 'https://www.kofic.or.kr', '🎞️'],
    kobis: ['KOBIS 영화사·영화인 찾기', 'https://www.kobis.or.kr', '🔎'],
    fmCast: ['필름메이커스 배우 모집', 'https://www.filmmakers.co.kr/performerCasting', '🎬'],
    fm: ['필름메이커스', 'https://www.filmmakers.co.kr', '🎥'],
    car365: ['자동차365 (차량 이력)', 'https://www.car365.go.kr', '🚗'],
    rt: ['실거래가 공개시스템', 'https://rt.molit.go.kr', '🏠'],
    klia: ['생명보험협회', 'https://www.klia.or.kr', '🛡️'],
    knia: ['손해보험협회', 'https://www.knia.or.kr', '🛡️']
  };
  var BIZ = ['hometax', 'gov24', 'insure4', 'sbiz'];
  var BY = {
    actor: ['fmCast', 'kobis', 'fm', 'kofic'],
    director: ['fm', 'kobis', 'kofic', 'hometax'],
    freelancer: ['hometax', 'gov24', 'insure4'],
    insurance: ['klia', 'knia', 'hometax'],
    newcar: ['car365', 'hometax', 'gov24'],
    usedcar: ['car365', 'hometax', 'gov24'],
    sales: ['hometax', 'gov24', 'insure4'],
    realty: ['rt', 'hometax', 'gov24', 'sbiz'],
    restaurant: ['food', 'hometax', 'sbiz', 'insure4'],
    cafe: ['food', 'hometax', 'sbiz', 'insure4'],
    toefl: ['neis', 'jne', 'gen', 'hometax'],
    bigacademy: ['neis', 'jne', 'gen', 'hometax'],
    academy: ['neis', 'jne', 'gen', 'hometax'],
    entrance: ['neis', 'jne', 'gen', 'hometax'],
    tutor: ['neis', 'hometax', 'gov24'],
    arts: ['neis', 'jne', 'gen', 'hometax']
  };
  function forIndustry(id) {
    var keys = BY[id] || BIZ;
    return keys.map(function (k) { var x = L[k]; return { label: x[0], url: x[1], icon: x[2] }; });
  }
  global.SsakaLinks = { forIndustry: forIndustry, all: L };
})(typeof window !== 'undefined' ? window : globalThis);
