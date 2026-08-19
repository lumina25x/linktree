/**
 * [채널 및 데이터 소스 설정 파일]
 * 사용자 채널 정보와 구글 스프레드시트 연동 정보를 설정합니다.
 */
const CONFIG = {
  // 1. 채널 프로필 정보
  channel: {
    name: "살림알파",
    handle: "@salim_alpha",
    tagline: "삶의 질을 높여주는 살림 꿀템 모음 💛",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    badge: "공식 파트너스",
    businessEmail: "salim_alpha@gmail.com",
    
    // SNS 바로가기 링크
    socials: {
      tiktok: "https://www.tiktok.com",
      instagram: "https://www.instagram.com",
      threads: "https://www.threads.net",
      youtube: "https://www.youtube.com"
    }
  },

  // 2. 데이터 연동 모드 ('google_sheets' | 'local_json')
  dataSource: {
    mode: "google_sheets", 
    googleSheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpvXQdFacfYtXR2MEsZ5eIVdsx0rtwOIX5SJzps_61qnkaRSxE85Q_IWj4grLlBLPbDCcaQL7cdm97/pub?gid=0&single=true&output=csv",
    apiEndpointUrl: ""
  },

  // 3. UI 및 테마 설정
  ui: {
    theme: "light",
    defaultSort: "newest",
    searchPlaceholder: "🔍 영상 번호(예: 014) 또는 상품명 검색",
    topNoticeText: "쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
  }
};
