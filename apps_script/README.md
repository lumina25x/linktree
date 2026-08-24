# 상품 등록 엔드포인트 설치

영상 제작 파이프라인(`app_build`)이 쿠팡 매칭을 끝낸 뒤, 이 엔드포인트로 상품을
1건씩 보내면 구글 시트에 행이 추가되고 사이트에 자동 반영된다.

```
[app_build 파이프라인]
  쿠팡 레퍼럴 링크 확보
        ↓  HTTPS POST (JSON + 토큰)
[Apps Script 웹앱]  ← 이 폴더
  번호 발급 + 시트에 1행 추가
        ↓  '웹에 게시' CSV
[인포링크 사이트]  자동 반영
```

---

## 1. 시트 헤더 확인

상품 시트 **1행**에 컬럼명이 있어야 한다. 순서는 상관없고, 스크립트가 헤더
*이름*으로 자리를 찾아 **있는 컬럼만** 채운다. 없는 컬럼은 조용히 건너뛴다.

**최소** — 사이트(`js/data-source.js`)가 실제로 읽는 건 이 6개뿐이다:

```
id,title,price,image_url,affiliate_url,created_at
```

**전체** — 원래 설계된 컬럼:

```
id,number_badge,title,category,price,original_price,discount,image_url,affiliate_url,highlight_tag,views,created_at
```

**추가로 권장하는 3개** (없어도 동작하지만, 있으면 쓸모가 있다):

| 컬럼 | 쓰임 |
|---|---|
| `source_id` | 샤오홍슈 원본 글 ID. **같은 영상 중복 등록을 막는다.** |
| `source_url` | 원본 영상 주소. 나중에 어디서 온 상품인지 추적용 |
| `video_path` | 만들어진 완제품 mp4 경로 |

사이트(`js/data-source.js`)는 모르는 컬럼을 그냥 무시하므로 추가해도 안전하다.

---

## 2. 스크립트 붙여넣기

1. 상품 구글 시트 열기
2. 상단 메뉴 **확장 프로그램 → Apps Script**
3. 기본으로 있는 `myFunction() {}` 을 지우고 [`Code.gs`](Code.gs) 내용을 **통째로** 붙여넣기
4. 맨 위 `var TOKEN = 'CHANGE-ME-TO-A-LONG-RANDOM-STRING';` 을 **아무도 모르는 긴 문자열**로 교체

   > 웹앱 URL 은 '모든 사용자' 공개라서 이 토큰이 유일한 자물쇠다.
   > 20자 이상 무작위로. 예: `openssl rand -hex 24` 또는 비밀번호 생성기.
   >
   > 코드에 남기기 싫으면 **프로젝트 설정 → 스크립트 속성**에
   > `INFOLINK_TOKEN` 으로 넣어도 된다. 그쪽이 우선한다.

5. 저장(💾)
6. 함수 선택 상자에서 **`설치확인`** 을 골라 ▶ 실행 → 권한 승인 창이 뜨면 승인
   - "이 앱은 확인되지 않았습니다" 경고가 나오면
     **고급 → (프로젝트 이름)(으)로 이동** 을 눌러 진행한다. 내가 만든 스크립트가 맞다.
   - 실행 로그에 시트 탭 이름 / 헤더 목록 / 다음 발급 번호가 찍히면 성공

---

## 3. 웹앱 배포

1. 우측 상단 **배포 → 새 배포**
2. 톱니바퀴 ⚙️ → **웹 앱** 선택
3. 설정:
   - **설명**: 아무거나 (예: `infolink v1`)
   - **다음 사용자로 실행**: **나** (본인 계정)
   - **액세스 권한이 있는 사용자**: **모든 사용자**

   > '모든 사용자'가 아니면 파이썬에서 호출할 때 구글 **로그인 HTML 페이지**가
   > 돌아온다. 클라이언트가 이 경우를 잡아서 안내 메시지를 내지만,
   > 애초에 이 설정을 맞춰두는 게 맞다.

4. **배포** → 나온 **웹 앱 URL** 복사
   (`https://script.google.com/macros/s/AKfy.../exec` 형태)

---

## 4. app_build 에 연결

`app_build/.env` 에 두 줄을 넣는다:

```env
LINKTREE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfy.../exec
LINKTREE_APPS_SCRIPT_TOKEN=위에서_정한_긴_토큰
```

연결 확인:

```bash
cd app_build
python linktree_sheet.py ping     # 배포가 살아 있는지 + 토큰이 맞는지
python linktree_sheet.py list     # 시트에 이미 있는 상품 목록
```

---

## 5. 코드를 고친 뒤에는

Apps Script 는 **저장만으로는 웹앱에 반영되지 않는다.**
**배포 → 배포 관리 → ✏️(연필) → 버전: 새 버전 → 배포** 를 해야 URL 이 새 코드를 쓴다.
이때 URL 은 그대로 유지되므로 `.env` 는 안 건드려도 된다.

---

## API 요약

모두 `POST` + `Content-Type: application/json`.

| action | 본문 | 응답 |
|---|---|---|
| `ping` | `{token, action:"ping"}` | `{ok:true}` |
| `list` | `{token, action:"list"}` | `{ok:true, count, items:[...]}` |
| `append` | `{token, action:"append", product:{...}}` | `{ok:true, id, number_badge, title, row, duplicate}` |
| `getSettings` | `{token, action:"getSettings"}` | `{ok:true, settings:{...}, gid}` |
| `saveSettings` | `{token, action:"saveSettings", settings:{...}}` | `{ok:true, saved:[...], skipped:[...]}` |

`product` 에 넣을 수 있는 키 — 시트 헤더에 같은 이름이 있을 때만 쓰인다:

```
title, category, price, original_price, discount, image_url,
affiliate_url, highlight_tag, views, created_at,
source_id, source_url, video_path
```

`id` / `number_badge` / `title` 의 번호 접두사(`014. `)는 **서버가 정한다.**
클라이언트가 계산하면 안 되는 이유는 [`Code.gs`](Code.gs) 맨 위 주석에 적어뒀다
(게시 CSV 캐시 때문에 번호가 겹친다).

---

## 채널 설정(settings 탭) 연동

채널명·프로필 사진·소개글·SNS 주소를 **모든 방문자에게** 반영하려면 시트에 둬야 한다.
관리자 페이지의 저장 버튼이 이 엔드포인트로 POST 한다.

> 예전에는 이 값들이 브라우저 `localStorage` 에만 저장돼서, 설정을 바꿔도
> 방문자 화면은 그대로였고 브라우저가 저장소를 비우면 원래대로 돌아갔다.

### 1. 설정 탭 만들기

Apps Script 편집기에서 함수 선택 상자에서 **`설정시트준비`** 를 골라 ▶ 실행한다.
`settings` 탭이 생기고 키가 채워지며, 실행 로그에 **gid** 가 찍힌다.

| key | 쓰임 |
|---|---|
| `channel_name` | 채널 이름 |
| `channel_handle` | 핸들 (`@myid`) |
| `tagline` | 한 줄 소개 |
| `avatar_url` | 프로필 이미지 주소 |
| `business_email` | 비즈니스 문의 메일 |
| `sns_tiktok` / `sns_instagram` / `sns_threads` / `sns_youtube` | SNS 주소 |
| `top_notice` | 상단 공정위 문구 |

**관리자 PIN 은 여기 두지 않는다.** 게시 CSV 는 공개라서 그대로 노출된다. PIN 은
`js/config.js` 에 남긴다.

### 2. 웹에 게시 (전체 문서로)

`[파일 → 공유 → 웹에 게시]` 에서 **전체 문서**를 CSV 로 게시한다.
상품 탭만 게시돼 있으면 설정 탭 주소가 404 가 된다.

### 3. config.js 에 주소 넣기

상품용 CSV 주소에서 `gid` 만 설정 탭의 gid 로 바꿔 `js/config.js` 의
`settingsCsvUrl` 에 넣는다.

```javascript
googleSheetCsvUrl: ".../pub?gid=0&single=true&output=csv",        // 상품
settingsCsvUrl:    ".../pub?gid=1234567&single=true&output=csv",  // 설정
```

### 4. 관리자 페이지에 연동 정보 입력

관리자 페이지 → 설정 탭 → **🔗 시트 저장 연동** 에 웹앱 URL 과 토큰을 넣는다.
이 두 값은 **그 브라우저에만** 저장되고 사이트 소스에는 들어가지 않는다.
기기를 바꾸면 다시 입력해야 한다.

### 반영까지 걸리는 시간

게시 CSV 는 수 분간 캐시된다. 저장 직후 방문자 화면은 아직 옛 값이다.
관리자 본인 화면은 그동안 `localStorage` 미리보기로 새 값을 보여주고,
**10분이 지나면 미리보기를 버리고 시트 값을 따른다** — 시트를 직접 고쳤을 때
그 브라우저만 옛 값을 계속 보는 일을 막기 위해서다.
