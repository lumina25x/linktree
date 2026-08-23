/**
 * [Infolink Admin Analytics & Settings Logic]
 * 1. PIN 보안 인증
 * 2. 통계 대시보드 (KPI, 상품별 클릭 랭킹, 유입 채널)
 * 3. 채널 프로필, 문구, SNS 링크, 비즈니스 이메일, PIN 설정 관리
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Config Manager Helper: localStorage 우선 로드
  function getEffectiveConfig() {
    const custom = localStorage.getItem("infolink_custom_config");
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        return {
          ...CONFIG,
          ...parsed,
          channel: { ...CONFIG.channel, ...(parsed.channel || {}) },
          admin: { ...CONFIG.admin, ...(parsed.admin || {}) },
          dataSource: { ...CONFIG.dataSource, ...(parsed.dataSource || {}) },
          ui: { ...CONFIG.ui, ...(parsed.ui || {}) }
        };
      } catch (e) {}
    }
    return CONFIG;
  }

  let activeConfig = getEffectiveConfig();
  const dataSource = new DataSourceManager(activeConfig);

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
  const settingSheetUrl = document.getElementById("setting-sheet-url");
  const settingAdminPin = document.getElementById("setting-admin-pin");

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
    activeConfig = getEffectiveConfig();
    const ch = activeConfig.channel || {};
    const socials = ch.socials || {};
    const ui = activeConfig.ui || {};
    const ds = activeConfig.dataSource || {};
    const admin = activeConfig.admin || {};

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

    settingSheetUrl.value = ds.googleSheetCsvUrl || "";
    settingAdminPin.value = admin.pin || "7788";
  }

  // 4. 설정 폼 저장
  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const updated = {
      channel: {
        name: settingChannelName.value.trim(),
        handle: settingChannelHandle.value.trim(),
        tagline: settingChannelTagline.value.trim(),
        avatar: settingChannelAvatar.value.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        badge: "공식 파트너스",
        businessEmail: settingBusinessEmail.value.trim(),
        socials: {
          tiktok: settingSocialTiktok.value.trim(),
          instagram: settingSocialInstagram.value.trim(),
          threads: settingSocialThreads.value.trim(),
          youtube: settingSocialYoutube.value.trim()
        }
      },
      admin: {
        pin: settingAdminPin.value.trim() || "7788"
      },
      dataSource: {
        mode: "google_sheets",
        googleSheetCsvUrl: settingSheetUrl.value.trim()
      },
      ui: {
        theme: "light",
        defaultSort: "newest",
        searchPlaceholder: "🔍 영상 번호(예: 014) 또는 상품명 검색",
        topNoticeText: settingTopNotice.value.trim()
      }
    };

    localStorage.setItem("infolink_custom_config", JSON.stringify(updated));
    activeConfig = getEffectiveConfig();
    applyBranding();

    showToast("💾 설정이 성공적으로 저장되었습니다! 메인 사이트에 즉시 반영됩니다.");
  });

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

  applyBranding();
  checkAuth();
});
