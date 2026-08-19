/**
 * [Infolink Admin Analytics Logic - PIN 보안 인증 탑재]
 * PIN 인증 후 방문자 수, 번호별 쿠팡 클릭 수, 유입 경로 실시간 통계 집계
 */

document.addEventListener("DOMContentLoaded", async () => {
  const dataSource = new DataSourceManager(CONFIG);
  
  // Auth Elements
  const pinModal = document.getElementById("pin-modal");
  const pinInput = document.getElementById("pin-input");
  const btnPinSubmit = document.getElementById("btn-pin-submit");
  const pinError = document.getElementById("pin-error");
  const adminContent = document.getElementById("admin-content");
  const btnLogout = document.getElementById("btn-logout");

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

  // 1. PIN 보안 인증 확인
  function checkAuth() {
    const isAuth = sessionStorage.getItem("salim_admin_auth") === "true";
    if (isAuth) {
      pinModal.style.display = "none";
      adminContent.style.display = "block";
      renderDashboard();
    } else {
      pinModal.style.display = "flex";
      adminContent.style.display = "none";
      pinInput.focus();
    }
  }

  function handlePinSubmit() {
    const enteredPin = pinInput.value.trim();
    const correctPin = (CONFIG.admin && CONFIG.admin.pin) ? String(CONFIG.admin.pin) : "7788";

    if (enteredPin === correctPin) {
      sessionStorage.setItem("salim_admin_auth", "true");
      pinError.style.display = "none";
      pinModal.style.display = "none";
      adminContent.style.display = "block";
      renderDashboard();
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

  // 2. 통계 데이터 로드
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

  function saveStatsData(data) {
    localStorage.setItem("infolink_analytics", JSON.stringify(data));
  }

  // 3. 대시보드 렌더링
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
      saveStatsData({
        views: 0,
        clicks: {},
        sources: { tiktok: 0, instagram: 0, threads: 0, direct: 0 }
      });
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
    link.download = `살림알파_클릭통계_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  });

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // 실행
  checkAuth();
});
