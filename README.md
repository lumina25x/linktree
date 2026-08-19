# 🚀 숏폼 자동화 전용 커머스 인포링크 (Bio-Commerce)

틱톡, 인스타그램(릴스), 스레드 영상 설명에 언급되는 **"프로필 링크에서 O번 제품 확인"**과 100% 연동되는 **쿠팡 파트너스 전용 모바일 최적화 인포링크 웹사이트**입니다.

---

## ✨ 핵심 기능

1. **상단 실시간 번호 검색창**: 시청자가 영상 속 번호(예: `15`, `#15`)를 입력하면 즉시 0.1초 만에 해당 상품만 필터링.
2. **커머스 카드형 UI**: 고화질 썸네일 + 번호 뱃지(`#15`) + 할인가격 + "쿠팡 최저가 보러가기" 바로가기 버튼.
3. **카테고리 필터 & 정렬**: 전체, 생활/리빙, 디지털/가전, 주방용품 등 탭 필터링 및 최신순/인기순 정렬.
4. **n8n / 구글 시트 실시간 무인 자동화**: n8n이 구글 스프레드시트에 상품을 1행 추가하면 사이트에 실시간 자동 반영.
5. **쿠팡 파트너스 공정위 필수 문구 준수**: 하단 공정위 문구 기본 탑재.
6. **서버 비용 0원**: Vercel, Cloudflare Pages, GitHub Pages로 평생 무료 운영 가능.

---

## 📁 폴더 구조

```
├── index.html            # 모바일 반응형 메인 웹페이지
├── css/
│   └── style.css         # 모던 글래스모피즘 & 커머스 카드 스타일시트
├── js/
│   ├── config.js         # 채널 프로필 & 데이터 소스 설정 파일
│   ├── data-source.js    # 구글 시트 / API / JSON 실시간 데이터 파서
│   └── app.js            # 검색, 필터링, 정렬, 딥링크 엔진
├── data/
│   └── products.json     # 초기 샘플 및 로컬 백업 상품 데이터
├── n8n/
│   └── n8n_workflow_guide.md  # n8n 자동화 워크플로우 설정 가이드
└── README.md
```

---

## ⚙️ 1분 설정 방법

### 1. 내 채널 정보 변경 (`js/config.js`)
`js/config.js` 파일을 열고 채널명, 프로필 사진, 한 줄 소개, SNS 주소를 변경합니다:
```javascript
const CONFIG = {
  channel: {
    name: "꿀템창고 @hot_items",
    tagline: "영상 속 화제의 꿀템 최저가 좌표 모음 ✨",
    avatar: "내_프로필_이미지_URL",
    socials: {
      tiktok: "https://www.tiktok.com/@내아이디",
      instagram: "https://www.instagram.com/내아이디",
      threads: "https://www.threads.net/@내아이디"
    }
  }
};
```

### 2. 구글 스프레드시트 실시간 연동
1. 구글 스프레드시트에 헤더 작성: `id,number_badge,title,category,price,original_price,discount,image_url,affiliate_url,highlight_tag,views,created_at`
2. `[파일]` ➡️ `[공유]` ➡️ `[웹에 게시]` ➡️ `[CSV]` 선택 후 게시 URL 복사
3. `js/config.js`의 `mode: "google_sheets"`, `googleSheetCsvUrl: "복사한URL"` 입력!

---

## 🌐 0원 무료 배포 방법

### 옵션 A: Vercel (추천, 30초 배포)
1. [Vercel](https://vercel.com) 로그인
2. GitHub 저장소 연결 또는 이 폴더를 Vercel CLI(`npx vercel`)로 즉시 배포
3. 나만의 고유 도메인(예: `my-pick.vercel.app` 또는 개인 도메인) 무료 연결

### 옵션 B: Cloudflare Pages / GitHub Pages
- GitHub 저장소 생성 후 `Settings` ➡️ `Pages`에서 `main` 브랜치를 활성화하면 끝!
