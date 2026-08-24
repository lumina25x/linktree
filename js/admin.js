/**
 * [Infolink Admin Analytics & Settings Logic]
 * 1. PIN 보안 인증
 * 2. 통계 대시보드 (KPI, 상품별 클릭 랭킹, 유입 채널)
 * 3. 채널 프로필/문구/SNS 설정 — 구글 시트의 settings 탭에 저장한다
 *
 * 설정 우선순위는 js/settings.js 참고.
 * 저장은 Apps Script 웹앱으로 POST 한다. 그래야 모든 방문자에게 반영된다.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Apps Script 접속 정보는 이 브라우저에만 둔다. 소스에 박으면 공개 저장소와
  // 배포된 사이트에 토큰이 그대로 노출돼 누구나 시트에 쓸 수 있게 된다.
  const ENDPOINT_KEY = "infolink_endpoint";

  function readEndpoint() {
    try {
      const raw = localStorage.getItem(ENDPOINT_KEY);
      if (!raw) return { url: "", token: "" };
      const parsed = JSON.parse(raw);
      return { url: parsed.url || "", token: parsed.token || "" };
    } catch (e) {
      return { url: "", token: "" };
    }
  }

  function writeEndpoint(endpoint) {
    try {
      localStorage.setItem(ENDPOINT_KEY, JSON.stringify(endpoint));
    } catch (e) {
      console.warn("연동 정보 저장 실패:", e);
    }
  }

  let activeConfig = CONFIG;
  let sheetSettings = null;
  const dataSource = new DataSourceManager(CONFIG);

  async function refreshConfig() {
    sheetSettings = await dataSource.fetchSettings();
    activeConfig = InfolinkSettings.resolve(CONFIG, sheetSettings);
  }

  // Auth Elements
  const pinModal = document.getElementById("pin-modal");
  const pinInput = document.getElementById("pin-input");
  const btnPinSubmit = document.getElementById("btn-pin-submit");
  const pinError = document.getElementById("pin-error");
  const adminContent = document.getElementById("admin-content");
  const adminTitle = document.getElementById("admin-title");
  const btnLogout = document.getElementById("btn-logout");

  // Tab Elements
  const tabBtnStats = document.getElementById("tab-btn-stats");
  const tabBtnSettings = document.getElementById("tab-btn-settings");
  const tabContentStats = document.getElementById("tab-content-stats");
  const tabContentSettings = document.getElementById("tab-content-settings");
  const toast = document.getElementById("toast");

  // Dashboard Elements
  const statTotalViews = document.getElementById("stat-total-views");
  const statTotalClicks = document.getElementById("stat-total-clicks");
  const statCtr = document.getElementById("stat-ctr");
  const statTopItem = document.getElementById("stat-top-item");
  const statTopClicks = document.getElementById("stat-top-clicks");
  const rankingTableBody = document.getElementById("ranking-table-body");
  const btnResetStats = document.getElementById("btn-reset-stats");
  const btnExportCsv = document.getElementById("btn-export-csv");

  const sourceTiktok = document.getElementById("source-tiktok");
  const sourceInstagram = document.getElementById("source-instagram");
  const sourceThreads = document.getElementById("source-threads");
  const sourceDirect = document.getElementById("source-direct");

  // Settings Form Elements
  const settingsForm = document.getElementById("settings-form");
  const settingChannelName = document.getElementById("setting-channel-name");
  const settingChannelHandle = document.getElementById("setting-channel-handle");
  const settingChannelTagline = document.getElementById("setting-channel-tagline");
  const settingChannelAvatar = document.getElementById("setting-channel-avatar");
  const settingBusinessEmail = document.getElementById("setting-business-email");
  const settingTopNotice = document.getElementById("setting-top-notice");
  const settingSocialTiktok = document.getElementById("setting-social-tiktok");
  const settingSocialInstagram = document.getElementById("setting-social-instagram");
  const settingSocialThreads = document.getElementById("setting-social-threads");
  const settingSocialYoutube = document.getElementById("setting-social-youtube");
  const settingEndpointUrl = document.getElementById("setting-endpoint-url");
  const settingEndpointToken = document.getElementById("setting-endpoint-token");
  const btnSaveSettings = document.getElementById("btn-save-settings");

  // 0. 채널명 반영: 탭 제목과 대시보드 상단 제목이 설정을 따라간다
  function applyBranding() {
    const channelName = (activeConfig.channel && activeConfig.channel.name) || "";
    document.title = channelName ? `${channelName} | 관리자 & 설정 대시보드` : "관리자 & 설정 대시보드";
    if (adminTitle) {
      adminTitle.textContent = channelName ? `📊 ${channelName} 관리 센터` : "📊 관리 센터";
    }
  }

  // 1. PIN 보안 인증 확인
  function checkAuth() {
    const isAuth = sessionStorage.getItem("salim_admin_auth") === "true";
    if (isAuth) {
      pinModal.style.display = "none";
      adminContent.style.display = "block";
      initTabs();
      renderDashboard();
      populateSettingsForm();
    } else {
      pinModal.style.display = "flex";
      adminContent.style.display = "none";
      pinInput.focus();
    }
  }

  function handlePinSubmit() {
    const enteredPin = pinInput.value.trim();
    const correctPin = (activeConfig.admin && activeConfig.admin.pin) ? String(activeConfig.admin.pin) : "7788";

    if (enteredPin === correctPin) {
      sessionStorage.setItem("salim_admin_auth", "true");
      pinError.style.display = "none";
      pinModal.style.display = "none";
      adminContent.style.display = "block";
      initTabs();
      renderDashboard();
      populateSettingsForm();
    } else {
      pinError.style.display = "block";
      pinInput.value = "";
      pinInput.focus();
    }
  }

  btnPinSubmit.addEventListener("click", handlePinSubmit);
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handlePinSubmit();
  });

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      sessionStorage.removeItem("salim_admin_auth");
      window.location.reload();
    });
  }

  // 2. 탭 전환 기능
  function initTabs() {
    tabBtnStats.addEventListener("click", () => {
      tabBtnStats.classList.add("active");
      tabBtnSettings.classList.remove("active");
      tabContentStats.style.display = "block";
      tabContentSettings.style.display = "none";
    });

    tabBtnSettings.addEventListener("click", () => {
      tabBtnSettings.classList.add("active");
      tabBtnStats.classList.remove("active");
      tabContentSettings.style.display = "block";
      tabContentStats.style.display = "none";
      populateSettingsForm();
    });
  }

  // 3. 설정 폼 데이터 채우기
  function populateSettingsForm() {
    const ch = activeConfig.channel || {};
    const socials = ch.socials || {};
    const ui = activeConfig.ui || {};

    settingChannelName.value = ch.name || "";
    settingChannelHandle.value = ch.handle || "";
    settingChannelTagline.value = ch.tagline || "";
    settingChannelAvatar.value = ch.avatar || "";
    settingBusinessEmail.value = ch.businessEmail || "";
    settingTopNotice.value = ui.topNoticeText || "";

    settingSocialTiktok.value = socials.tiktok || "";
    settingSocialInstagram.value = socials.instagram || "";
    settingSocialThreads.value = socials.threads || "";
    settingSocialYoutube.value = socials.youtube || "";

    const endpoint = readEndpoint();
    settingEndpointUrl.value = endpoint.url;
    settingEndpointToken.value = endpoint.token;
  }

  // 4. 설정 폼 저장 — 구글 시트에 쓴다
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 연동 정보는 저장이 실패하더라도 남겨둔다. 매번 다시 입력하게 하면 안 된다.
    const endpoint = {
      url: settingEndpointUrl.value.trim(),
      token: settingEndpointToken.value.trim()
    };
    writeEndpoint(endpoint);

    if (!endpoint.url || !endpoint.token) {
      showToast("⚠️ Apps Script 웹앱 URL 과 쓰기 토큰을 먼저 입력해 주세요.");
      return;
    }

    // 빈 칸은 빈 값 그대로 보낸다. 예전처럼 기본 이미지 주소로 바꿔치기하면
    // 이름만 고치고 저장했을 때 사진이 멋대로 되돌아간다.
    const settings = {
      channel_name: settingChannelName.value.trim(),
      channel_handle: settingChannelHandle.value.trim(),
      tagline: settingChannelTagline.value.trim(),
      avatar_url: settingChannelAvatar.value.trim(),
      business_email: settingBusinessEmail.value.trim(),
      sns_tiktok: settingSocialTiktok.value.trim(),
      sns_instagram: settingSocialInstagram.value.trim(),
      sns_threads: settingSocialThreads.value.trim(),
      sns_youtube: settingSocialYoutube.value.trim(),
      top_notice: settingTopNotice.value.trim()
    };

    setSaving(true);
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        // text/plain 이라야 브라우저가 프리플라이트(OPTIONS)를 보내지 않는다.
        // Apps Script 웹앱은 OPTIONS 를 처리하지 못해서 application/json 으로
        // 보내면 CORS 단계에서 막힌다. 본문은 그대로 JSON 으로 파싱된다.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: endpoint.token, action: "saveSettings", settings })
      });

      if (!response.ok) throw new Error(`서버 응답 ${response.status}`);

      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "알 수 없는 오류");

      // 게시 CSV 는 수 분간 캐시돼서 방금 쓴 값을 아직 못 읽는다.
      // 그 사이 관리자 화면이 옛 값으로 보이지 않도록 미리보기를 남긴다.
      InfolinkSettings.writePreview(dataSource.settingsToConfig(settings) || {});
      activeConfig = InfolinkSettings.resolve(CONFIG, sheetSettings);
      applyBranding();

      showToast("💾 시트에 저장했습니다. 방문자 화면에는 몇 분 뒤 반영됩니다.");
    } catch (err) {
      console.error("설정 저장 실패:", err);
      showToast("⚠️ 저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  });

  function setSaving(isSaving) {
    if (!btnSaveSettings) return;
    btnSaveSettings.disabled = isSaving;
    btnSaveSettings.innerHTML = isSaving
      ? "<span>저장 중…</span>"
      : "<span>💾 구글 시트에 저장하기</span>";
  }

  // 5. 통계 대시보드 렌더링
  function getStatsData() {
    const raw = localStorage.getItem("infolink_analytics");
    if (!raw) {
      return {
        views: 0,
        clicks: {},
        sources: { tiktok: 0, instagram: 0, threads: 0, direct: 0 }
      };
    }
    return JSON.parse(raw);
  }

  async function renderDashboard() {
    const stats = getStatsData();
    const products = await dataSource.fetchProducts();

    const totalViews = stats.views || 0;
    let totalClicks = 0;
    Object.values(stats.clicks || {}).forEach((c) => (totalClicks += c));

    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;

    statTotalViews.textContent = totalViews.toLocaleString() + "회";
    statTotalClicks.textContent = totalClicks.toLocaleString() + "회";
    statCtr.textContent = ctr + "%";

    sourceTiktok.textContent = (stats.sources?.tiktok || 0) + "건";
    sourceInstagram.textContent = (stats.sources?.instagram || 0) + "건";
    sourceThreads.textContent = (stats.sources?.threads || 0) + "건";
    sourceDirect.textContent = (stats.sources?.direct || 0) + "건";

    const rankedProducts = products.map((p) => {
      const clickCount = stats.clicks?.[p.id] || 0;
      const share = totalClicks > 0 ? ((clickCount / totalClicks) * 100).toFixed(1) : 0;
      return {
        ...p,
        clicks: clickCount,
        share: share
      };
    });

    rankedProducts.sort((a, b) => b.clicks - a.clicks);

    if (rankedProducts.length > 0 && rankedProducts[0].clicks > 0) {
      statTopItem.textContent = rankedProducts[0].title;
      statTopClicks.textContent = `누적 ${rankedProducts[0].clicks}회 클릭 (점유율 ${rankedProducts[0].share}%)`;
    } else {
      statTopItem.textContent = "클릭 데이터 없음";
      statTopClicks.textContent = "-";
    }

    if (rankedProducts.length === 0) {
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            구글 시트에 등록된 상품이 없습니다. 시트에 상품을 추가해 보세요!
          </td>
        </tr>
      `;
      return;
    }

    rankingTableBody.innerHTML = rankedProducts
      .map((p, idx) => {
        let rankBadgeClass = "badge-rank";
        if (idx === 0) rankBadgeClass += " badge-rank-1";
        else if (idx === 1) rankBadgeClass += " badge-rank-2";
        else if (idx === 2) rankBadgeClass += " badge-rank-3";

        return `
          <tr>
            <td style="text-align: center;"><span class="${rankBadgeClass}">${idx + 1}</span></td>
            <td style="text-align: center; white-space: nowrap;"><strong>#${String(p.id).padStart(2, "0")}</strong></td>
            <td>
              <div class="prod-cell">
                <img 
                  class="prod-thumb-mini" 
                  src="${p.image_url}" 
                  alt="" 
                  onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&auto=format&fit=crop&q=80';"
                />
                <span class="prod-title-text">${escapeHtml(p.title)}</span>
              </div>
            </td>
            <td style="text-align: right; font-weight: 800; color: var(--coupang-red); white-space: nowrap;">${p.clicks.toLocaleString()}회</td>
            <td style="text-align: right; color: var(--text-sub); white-space: nowrap;">${p.share}%</td>
            <td style="text-align: center; white-space: nowrap;">
              <a href="${p.affiliate_url}" target="_blank" rel="noopener" class="btn-test-link">
                <span>쿠팡 열기</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  btnResetStats.addEventListener("click", () => {
    if (confirm("모든 클릭 통계 데이터를 초기화하시겠습니까?")) {
      localStorage.setItem("infolink_analytics", JSON.stringify({
        views: 0,
        clicks: {},
        sources: { tiktok: 0, instagram: 0, threads: 0, direct: 0 }
      }));
      renderDashboard();
    }
  });

  btnExportCsv.addEventListener("click", async () => {
    const stats = getStatsData();
    const products = await dataSource.fetchProducts();

    let csvContent = "\uFEFF순위,상품번호,상품명,클릭수,쿠팡링크\n";
    const rankedProducts = products.map((p) => ({
      ...p,
      clicks: stats.clicks?.[p.id] || 0
    })).sort((a, b) => b.clicks - a.clicks);

    rankedProducts.forEach((p, idx) => {
      csvContent += `"${idx + 1}","${p.id}","${p.title.replace(/"/g, '""')}","${p.clicks}","${p.affiliate_url}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const channelName = ((activeConfig.channel && activeConfig.channel.name) || "인포링크")
      .replace(/[\/:*?"<>|]/g, "")
      .trim() || "인포링크";
    link.download = `${channelName}_클릭통계_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  });

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  await refreshConfig();
  applyBranding();
  checkAuth();
});
