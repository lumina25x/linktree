# [n8n 연동 가이드] 쿠팡 파트너스 자동화 ➡️ 인포링크 실시간 등록

이 문서는 **n8n**에서 쿠팡 파트너스 상품을 수집한 뒤, 대표님의 **인포링크 웹사이트에 100% 무인으로 자동 등록**하는 방법을 설명합니다.

---

## 1. 전체 자동화 흐름

```
[n8n 워크플로우]
1. [Schedule Trigger] (예: 매일 오전 9시 또는 수동 실행)
   ⬇️
2. [Coupang Partners API / 크롤링] (상품 검색 및 제휴 링크 발급)
   ⬇️
3. [Code Node] (자동으로 다음 상품 번호 생성: #15, #16 ...)
   ⬇️
4. [Google Sheets Node] (새로운 상품 정보를 구글 시트에 1행 추가)
   ⬇️
5. [완료] ➡️ 인포링크 사이트에 새로고침 없이 0초 만에 실시간 반영!
```

---

## 2. 구글 스프레드시트 준비 (1분 완성)

1. **Google Sheets**에 새 시트를 하나 만듭니다.
2. **1행(헤더)**에 아래 컬럼명을 순서대로 입력합니다:
   ```csv
   id,number_badge,title,category,price,original_price,discount,image_url,affiliate_url,highlight_tag,views,created_at
   ```
3. **웹에 게시 설정**:
   - 구글 시트 상단 메뉴: `[파일]` ➡️ `[공유]` ➡️ `[웹에 게시]` 클릭
   - `[전체 문서]`를 `[쉼표로 구분된 값(.csv)]`로 선택 후 **[게시]** 버튼 클릭
   - 생성된 URL을 복사하여 `js/config.js`의 `googleSheetCsvUrl`에 붙여넣고 `mode: "google_sheets"`로 변경하면 연동 끝!

---

## 3. n8n 워크플로우 노드 구성법

### ① Coupang Partners API 호출 (HTTP Request Node)
- **Method**: `POST`
- **URL**: `https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`
- **Headers**:
  - `Authorization`: `[쿠팡 파트너스 HMAC-SHA256 시그니처]`
  - `Content-Type`: `application/json`
- **Body Parameters**:
  ```json
  {
    "coupangUrls": ["https://www.coupang.com/vp/products/..."]
  }
  ```

### ② 상품 번호 자동 발급 (Code Node)
구글 시트의 기존 마지막 번호를 읽어와서 `+1`을 해주는 간단한 자바스크립트 코드입니다:

```javascript
// n8n Code Node (Run Once for All Items)
const lastId = $items("Get Last Row")[0]?.json?.id || 0;
const nextId = Number(lastId) + 1;

return items.map((item, index) => {
  const currentId = nextId + index;
  return {
    json: {
      id: currentId,
      number_badge: `#${String(currentId).padStart(2, '0')}`,
      title: item.json.title,
      category: item.json.category || "생활/리빙",
      price: item.json.price + "원",
      original_price: item.json.original_price ? item.json.original_price + "원" : "",
      discount: item.json.discount ? item.json.discount + "%" : "",
      image_url: item.json.image_url,
      affiliate_url: item.json.shortenUrl,
      highlight_tag: "🔥 영상 속 화제템",
      views: "1.0만회",
      created_at: new Date().toISOString().split('T')[0]
    }
  };
});
```

### ③ 구글 시트에 행 추가 (Google Sheets Node)
- **Operation**: `Append Row`
- **Document**: 위에서 만든 스프레드시트 선택
- **Sheet**: `Sheet1`
- **Columns**: `id`, `number_badge`, `title`, `category`, `price`, `image_url`, `affiliate_url` 등을 자동 매핑

---

## 4. 영상 제작 시스템과의 연결

- n8n 워크플로우에서 구글 시트에 저장된 `number_badge` (예: `#15`)를 영상 렌더링 스크립트나 AI 음성/자막 생성 노드로 넘겨주면, 영상 자막에 **"[15번] 제품은 프로필 링크에서 확인하세요"**가 자동으로 합성됩니다.
