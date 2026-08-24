/**
 * [채널 및 데이터 소스 설정 파일]
 * 사용자 채널 정보, 구글 시트 연동, 관리자 보안 PIN 설정
 */
const CONFIG = {
  // 1. 채널 프로필 정보
  //    시트의 settings 탭이 읽히면 그 값이 이깁니다. 여기 값은 시트를 못 읽었을 때
  //    쓰이는 폴백입니다. (settingsCsvUrl 이 비어 있으면 여기 값이 그대로 쓰입니다)
  channel: {
    name: "살림알파",
    handle: "@salim_alpha",
    tagline: "삶의 질을 높여주는 살림 꿀템 모음 💛",
    // 페이지에 정적으로 박혀 있는 파일과 같은 값이라, JS 가 덮어써도 다시 받지 않는다.
    avatar: "avatar.jpg",
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

  // 2. 관리자 보안 설정 (대시보드 접속 PIN 번호)
  //    PIN 은 시트에 두지 않는다. 게시 CSV 는 공개라서 그대로 노출되기 때문이다.
  admin: {
    pin: "7788" // 원하는 관리자 비밀번호 (변경 가능)
  },

  // 3. 데이터 연동 모드
  dataSource: {
    mode: "google_sheets", 
    googleSheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpvXQdFacfYtXR2MEsZ5eIVdsx0rtwOIX5SJzps_61qnkaRSxE85Q_IWj4grLlBLPbDCcaQL7cdm97/pub?gid=0&single=true&output=csv",

    // 채널 설정(이름/사진/소개글/SNS)이 담긴 'settings' 탭의 게시 CSV 주소.
    // 위 상품 주소에서 gid 만 설정 탭의 값으로 바꾼 것이다.
    // gid 는 Apps Script 편집기에서 설정시트준비() 를 실행하면 로그에 찍힌다.
    // 비워두면 아래 channel 기본값만 쓰인다.
    settingsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpvXQdFacfYtXR2MEsZ5eIVdsx0rtwOIX5SJzps_61qnkaRSxE85Q_IWj4grLlBLPbDCcaQL7cdm97/pub?gid=523731436&single=true&output=csv",

    apiEndpointUrl: ""
  },

  // 4. UI 설정
  ui: {
    theme: "light",
    defaultSort: "newest",
    searchPlaceholder: "🔍 영상 번호(예: 014) 또는 상품명 검색",
    topNoticeText: "쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
  }
};
