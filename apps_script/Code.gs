/**
 * [인포링크 상품 등록 엔드포인트] Google Apps Script 웹앱
 *
 * 무엇을 하는가
 *   app_build 파이프라인(파스2)이 쿠팡 매칭을 끝낸 뒤 이 엔드포인트로 상품 한 건을
 *   POST 하면, 이 스크립트가 붙어 있는 스프레드시트에 1행을 추가한다.
 *   사이트(js/data-source.js)는 그 시트를 CSV 로 읽으므로 몇 분 안에 자동 반영된다.
 *
 * 왜 번호(id) 를 여기서 발급하는가
 *   클라이언트가 게시 CSV 를 읽어 max(id)+1 을 계산하면 번호가 겹친다.
 *   구글의 '웹에 게시' CSV 는 수 분간 캐시돼서, 방금 추가한 행이 아직 안 보이기
 *   때문이다. 배치로 3편을 연달아 돌리면 셋 다 같은 번호를 받는다.
 *   시트를 직접 읽는 이쪽에서 LockService 로 잠그고 발급해야 안 겹친다.
 *
 * 헤더 이름으로 쓴다
 *   1행(헤더)을 읽어 컬럼 이름 → 위치를 만든 뒤 그 자리에만 값을 넣는다.
 *   시트 컬럼 순서를 바꾸거나 컬럼을 추가해도 코드를 고칠 필요가 없고,
 *   모르는 필드는 조용히 버린다.
 *
 * ─────────────────────────────────────────────────────────────
 * 설치 (5분) — 자세한 건 이 폴더의 README.md 참고
 *   1. 상품 구글 시트 열기 → 확장 프로그램 → Apps Script
 *   2. 이 파일 내용을 통째로 붙여넣기
 *   3. 아래 TOKEN 을 아무도 모르는 긴 문자열로 바꾸기
 *   4. 배포 → 새 배포 → 유형: 웹 앱
 *        실행: 나(본인 계정)   /   액세스 권한: 모든 사용자
 *   5. 나온 웹앱 URL 과 TOKEN 을 app_build/.env 에 넣기
 *        LINKTREE_APPS_SCRIPT_URL=...
 *        LINKTREE_APPS_SCRIPT_TOKEN=...
 * ─────────────────────────────────────────────────────────────
 */

// 반드시 바꿀 것. 웹앱 URL 은 '모든 사용자' 공개라서 이 토큰이 유일한 자물쇠다.
// (스크립트 속성에 INFOLINK_TOKEN 을 넣어두면 그쪽이 우선한다 — 코드에 안 남기고 싶을 때)
var TOKEN = 'CHANGE-ME-TO-A-LONG-RANDOM-STRING';

// 상품이 쌓이는 시트 탭 이름. 클라이언트가 sheet 를 보내면 그쪽이 우선한다.
var DEFAULT_SHEET_NAME = 'Sheet1';

// 번호를 몇 자리로 채울지. '014. 상품명' / '#014' 형태를 만든다.
// (사이트 검색창 안내문이 "영상 번호(예: 014)" 라서 3자리에 맞춘다)
var NUMBER_PAD = 3;


/* ===================== 진입점 ===================== */

function doGet(e) {
  // 배포가 살아 있는지 확인하는 용도. 토큰 없이도 200 을 준다(정보는 안 준다).
  return _json({ ok: true, service: 'infolink-registrar' });
}

function doPost(e) {
  try {
    var body = _parseBody(e);
    if (_token() === 'CHANGE-ME-TO-A-LONG-RANDOM-STRING') {
      return _json({ ok: false, error: 'TOKEN 을 기본값에서 바꾸지 않았습니다.' });
    }
    if (String(body.token || '') !== _token()) {
      return _json({ ok: false, error: '토큰이 일치하지 않습니다.' });
    }

    var action = body.action || 'append';
    if (action === 'ping')   return _json({ ok: true, action: 'ping' });
    if (action === 'list')   return _json(_list(body));
    if (action === 'append') return _json(_append(body));

    return _json({ ok: false, error: '알 수 없는 action: ' + action });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}


/* ===================== 동작 ===================== */

function _append(body) {
  var product = body.product || {};
  var lock = LockService.getScriptLock();

  // 번호 발급과 행 추가는 반드시 한 덩어리로 묶는다. 안 묶으면 동시에 들어온
  // 두 요청이 같은 번호를 읽고 둘 다 그 번호로 쓴다.
  lock.waitLock(30000);
  try {
    var sheet = _sheet(body.sheet);
    var map = _headerMap(sheet);
    if (!map.hasOwnProperty('id')) {
      throw new Error("1행에 'id' 헤더가 없습니다. 시트 첫 줄에 헤더를 먼저 넣어주세요.");
    }

    // 같은 영상을 두 번 등록하지 않는다 (source_id 컬럼이 있을 때만).
    var sourceId = String(product.source_id || '');
    if (sourceId && map.hasOwnProperty('source_id')) {
      var dup = _findBySourceId(sheet, map, sourceId);
      if (dup) {
        return { ok: true, duplicate: true, id: dup.id,
                 number_badge: _badge(dup.id), row: dup.row,
                 message: '이미 등록된 영상입니다 (source_id=' + sourceId + ')' };
      }
    }

    var id = _nextId(sheet, map);
    var values = _buildRow(sheet, map, product, id);

    sheet.appendRow(values);

    return {
      ok: true,
      duplicate: false,
      id: id,
      number_badge: _badge(id),
      title: map.hasOwnProperty('title') ? values[map.title] : '',
      row: sheet.getLastRow()
    };
  } finally {
    lock.releaseLock();
  }
}

function _list(body) {
  var sheet = _sheet(body.sheet);
  var map = _headerMap(sheet);
  var last = sheet.getLastRow();
  if (last < 2) return { ok: true, count: 0, items: [] };

  var width = sheet.getLastColumn();
  var rows = sheet.getRange(2, 1, last - 1, width).getValues();
  var items = rows.map(function (r) {
    var o = {};
    Object.keys(map).forEach(function (k) { o[k] = r[map[k]]; });
    return o;
  }).filter(function (o) { return String(o.id || '').trim() !== ''; });

  return { ok: true, count: items.length, items: items };
}


/* ===================== 헬퍼 ===================== */

function _sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 시트에 '붙어 있는' 스크립트가 아니면 여기가 null 이다.
  // script.google.com 에서 '새 프로젝트'로 만들면 이렇게 된다 — 반드시 시트 안에서
  // [확장 프로그램 → Apps Script] 로 열어야 그 시트에 연결된 프로젝트가 만들어진다.
  if (!ss) {
    throw new Error(
      '이 스크립트가 스프레드시트에 연결돼 있지 않습니다.\n' +
      '상품 구글 시트를 연 뒤 [확장 프로그램 → Apps Script] 로 열어서 ' +
      '거기에 이 코드를 붙여넣어 주세요. ' +
      '(script.google.com 에서 만든 새 프로젝트는 시트를 찾지 못합니다)');
  }

  var target = name || DEFAULT_SHEET_NAME;
  var sheet = ss.getSheetByName(target);
  if (!sheet) {
    // 이름이 틀렸을 때 조용히 엉뚱한 탭에 쓰는 것보다, 첫 번째 탭으로
    // 떨어지되 무엇을 썼는지 알려주는 편이 낫다.
    sheet = ss.getSheets()[0];
    if (!sheet) throw new Error('시트를 찾을 수 없습니다: ' + target);
  }
  return sheet;
}

function _headerMap(sheet) {
  var width = sheet.getLastColumn();
  if (width < 1) throw new Error('시트가 비어 있습니다. 1행에 헤더를 넣어주세요.');
  var headers = sheet.getRange(1, 1, 1, width).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) {
    var key = String(h || '').trim();
    if (key && !map.hasOwnProperty(key)) map[key] = i;   // 0-based
  });
  return map;
}

function _nextId(sheet, map) {
  var last = sheet.getLastRow();
  if (last < 2) return 1;
  var col = map.id + 1;                                  // getRange 는 1-based
  var vals = sheet.getRange(2, col, last - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < vals.length; i++) {
    var n = parseInt(String(vals[i][0]).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function _findBySourceId(sheet, map, sourceId) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var width = sheet.getLastColumn();
  var rows = sheet.getRange(2, 1, last - 1, width).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][map.source_id] || '').trim() === sourceId) {
      return { id: rows[i][map.id], row: i + 2 };
    }
  }
  return null;
}

function _badge(id) {
  return '#' + _pad(id);
}

function _pad(id) {
  var s = String(parseInt(String(id).replace(/[^0-9]/g, ''), 10) || 0);
  while (s.length < NUMBER_PAD) s = '0' + s;
  return s;
}

/**
 * 시트 폭에 맞춘 행 배열을 만든다.
 *
 * id / number_badge / title 은 여기서 완성한다 — 번호를 발급한 쪽이 이 스크립트라
 * '014. 상품명' 같은 번호 접두사도 여기서만 붙일 수 있다.
 * 나머지 컬럼은 클라이언트가 보낸 값을 헤더 이름이 맞을 때만 채운다.
 */
function _buildRow(sheet, map, product, id) {
  var width = sheet.getLastColumn();
  var row = new Array(width).fill('');

  function put(key, value) {
    if (map.hasOwnProperty(key) && value !== undefined && value !== null && value !== '') {
      row[map[key]] = value;
    }
  }

  var baseTitle = String(product.title || '').trim();
  // 클라이언트가 이미 '014. ' 를 붙여 보냈더라도 번호는 서버가 정한 값이 맞다.
  baseTitle = baseTitle.replace(/^\s*#?\d{1,4}\s*[.．]\s*/, '');

  put('id', id);
  put('number_badge', _badge(id));
  put('title', _pad(id) + '. ' + baseTitle);

  ['category', 'price', 'original_price', 'discount', 'image_url',
   'affiliate_url', 'highlight_tag', 'views', 'source_id', 'source_url',
   'video_path'].forEach(function (k) {
    put(k, product[k]);
  });

  put('created_at', product.created_at ||
      Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'));

  return row;
}

function _token() {
  var prop = PropertiesService.getScriptProperties().getProperty('INFOLINK_TOKEN');
  return prop ? String(prop) : TOKEN;
}

function _parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('요청 본문이 비어 있습니다.');
  }
  return JSON.parse(e.postData.contents);
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ===================== 설치 확인용 ===================== */

/**
 * 편집기에서 이 함수를 한 번 실행하면 권한 승인 창이 뜬다.
 * 승인해두면 웹앱 배포가 바로 동작한다. 실행 로그에 헤더와 다음 번호가 찍힌다.
 */
function 설치확인() {
  var sheet = _sheet(null);
  var map = _headerMap(sheet);

  // 숫자를 %s 로 넘기면 Logger 가 '15.0' 으로 찍는다. 정수로 보이게 문자열로 만든다.
  Logger.log('시트 탭: ' + sheet.getName());
  Logger.log('헤더: ' + Object.keys(map).join(', '));
  Logger.log('다음 발급 번호: ' + String(_nextId(sheet, map)));

  if (sheet.getName() !== DEFAULT_SHEET_NAME) {
    // 지금은 '이름 못 찾음 → 첫 번째 탭' 폴백으로 맞은 것이다. 탭이 늘어나면
    // 순서가 바뀌어 엉뚱한 곳에 쓸 수 있으니 클라이언트에 이름을 박아둔다.
    Logger.log("주의: 탭 이름이 '" + DEFAULT_SHEET_NAME + "' 이 아닙니다. " +
               "app_build/.env 에 LINKTREE_SHEET_NAME=" + sheet.getName() + " 를 넣어주세요.");
  }
  if (!map.hasOwnProperty('source_id')) {
    Logger.log("참고: 'source_id' 헤더가 없습니다. 있으면 같은 영상 중복 등록을 막아줍니다.");
  }
}
