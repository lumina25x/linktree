/**
 * [Infolink Application Main Logic - Ultra Clean Inpocklink Style]
 * 구글 시트 설정 연동, 상품명·가격·썸네일 렌더링 및 번호 검색 엔진
 *
 * 채널 설정의 우선순위는 js/settings.js 에 정리돼 있다.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 시트를 읽어오기 전 임시값. 아래 시작 블록에서 시트 값으로 다시 만든다.
  let activeConfig = CONFIG;
  const dataSource = new DataSourceManager(CONFIG);
  let allProducts = [];
  let searchQuery = "";
  let currentSort = CONFIG.ui.defaultSort || "newest";

  // DOM Elements
  const channelAvatar = document.getElementById("channel-avatar");
  const channelTitle = document.getElementById("channel-title");
  const channelTagline = document.getElementById("channel-tagline");
  const btnBusiness = document.getElementById("btn-business");
  const btnShare = document.getElementById("btn-share");
  const socialLinksContainer = document.getElementById("social-links-container");
  const topNoticeText = document.getElementById("top-notice-text");
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const sortSelect = document.getElementById("sort-select");
  const productsContainer = document.getElementById("products-container");
  const productCountSpan = document.getElementById("product-count");
  const emptyState = document.getElementById("empty-state");
  const copyrightText = document.getElementById("copyright-text");
  const toast = document.getElementById("toast");

  // 1. 유입 채널 & 방문자 통계 실시간 집계
  function trackPageView() {
    const raw = localStorage.getItem("infolink_analytics");
    let stats = raw ? JSON.parse(raw) : { views: 0, clicks: {}, sources: { tiktok: 0, instagram: 0, threads: 0, direct: 0 } };

    stats.views = (stats.views || 0) + 1;
    if (!stats.sources) stats.sources = { tiktok: 0, instagram: 0, threads: 0, direct: 0 };

    const params = new URLSearchParams(window.location.search);
    const refParam = (params.get("ref") || params.get("utm_source") || params.get("source") || "").toLowerCase();
    const refHeader = document.referrer.toLowerCase();

    if (refParam === "tiktok" || refParam === "tt" || refHeader.includes("tiktok")) {
      stats.sources.tiktok = (stats.sources.tiktok || 0) + 1;
    } else if (refParam === "instagram" || refParam === "insta" || refParam === "ig" || refHeader.includes("instagram")) {
      stats.sources.instagram = (stats.sources.instagram || 0) + 1;
    } else if (refParam === "threads" || refParam === "th" || refHeader.includes("threads")) {
      stats.sources.threads = (stats.sources.threads || 0) + 1;
    } else {
      stats.sources.direct = (stats.sources.direct || 0) + 1;
    }

    localStorage.setItem("infolink_analytics", JSON.stringify(stats));
  }

  // 2. 프로필 & 채널 정보 초기화
  function initProfile() {
    const channelName = activeConfig.channel.name || "";
    const tagline = activeConfig.channel.tagline || "";

    channelAvatar.src = activeConfig.channel.avatar;
    channelAvatar.title = channelName;
    channelTitle.textContent = channelName;
    channelTagline.textContent = tagline;
    topNoticeText.textContent = activeConfig.ui.topNoticeText;
    searchInput.placeholder = activeConfig.ui.searchPlaceholder;

    // 탭 제목과 푸터 카피라이트도 채널명 설정을 따라간다.
    // (og:title 은 크롤러가 JS 없이 읽으므로 index.html 쪽 정적 값이 따로 쓰인다)
    document.title = tagline ? `${channelName} | ${tagline}` : channelName;
    if (copyrightText) {
      const year = new Date().getFullYear();
      copyrightText.textContent = channelName
        ? `© ${year} ${channelName}. All rights reserved.`
        : `© ${year}. All rights reserved.`;
    }

    if (activeConfig.channel.businessEmail) {
      btnBusiness.href = `mailto:${activeConfig.channel.businessEmail}?subject=[비즈니스 제안] ${activeConfig.channel.name} 제휴 문의`;
      btnBusiness.style.display = "inline-flex";
    } else {
      btnBusiness.style.display = "none";
    }

    renderSocials();
    btnShare.addEventListener("click", handleShare);

    // [히든 관리자 진입 트릭]: 프로필 사진 3회 연속 클릭 시 관리자 페이지로 이동
    let avatarClicks = 0;
    let clickTimer = null;
    channelAvatar.addEventListener("click", () => {
      avatarClicks++;
      clearTimeout(clickTimer);
      if (avatarClicks >= 3) {
        avatarClicks = 0;
        window.location.href = "admin.html";
      } else {
        clickTimer = setTimeout(() => {
          avatarClicks = 0;
        }, 1200);
      }
    });
  }

  function renderSocials() {
    const socials = activeConfig.channel.socials || {};
    const icons = {
      tiktok: `<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.16 1.18 2.09 2.35 2.27.79.13 1.62-.02 2.29-.46.74-.47 1.2-1.26 1.28-2.13.06-2.61.03-5.22.04-7.83 0-3.34-.02-6.68.01-10.02z"/></svg>`,
      instagram: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
      threads: `<svg viewBox="0 0 24 24"><path d="M12.186 24C5.454 24 0 18.57 0 11.865 0 5.16 5.454-.27 12.186-.27c6.732 0 12.186 5.43 12.186 12.135 0 2.055-.495 4.02-1.44 5.79-1.275 2.37-3.375 4.14-5.91 4.965-.63.21-1.305.105-1.845-.27-.54-.39-.855-.99-.87-1.65-.015-.66.27-1.29.78-1.71.51-.42 1.17-.555 1.815-.375 1.635-.45 3.015-1.575 3.84-3.12.63-1.185.96-2.505.96-3.885 0-5.145-4.14-9.33-9.225-9.33-5.085 0-9.225 4.185-9.225 9.33s4.14 9.33 9.225 9.33c1.785 0 3.51-.51 4.995-1.485.57-.375 1.305-.39 1.89-.03.585.345.9 1 .81 1.68-.09.675-.54 1.245-1.17 1.515-1.995 1.29-4.32 1.98-6.72 1.98z"/></svg>`,
      youtube: `<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
    };

    socialLinksContainer.innerHTML = "";
    Object.keys(socials).forEach((key) => {
      if (socials[key] && icons[key]) {
        const a = document.createElement("a");
        a.href = socials[key];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "social-btn";
        a.setAttribute("aria-label", key);
        a.innerHTML = icons[key];
        socialLinksContainer.appendChild(a);
      }
    });
  }

  // 공유하기 기능
  async function handleShare() {
    const shareData = {
      title: `${activeConfig.channel.name} | 영상 속 꿀템 좌표`,
      text: `${activeConfig.channel.name} 프로필 링크입니다. 영상 속 번호를 검색해 보세요!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("🔗 링크가 클립보드에 복사되었습니다!");
    }
  }

  // 3. 상품 컴팩트 리스트 렌더링
  function renderProducts() {
    let filtered = allProducts.filter((product) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const numOnlyQuery = query.replace(/[^0-9]/g, "");
      const productNumStr = String(product.id);
      const titleStr = (product.title || "").toLowerCase();

      const matchNumber = numOnlyQuery && (
        productNumStr === numOnlyQuery || 
        titleStr.startsWith(numOnlyQuery) ||
        titleStr.startsWith(`0${numOnlyQuery}`)
      );
      const matchTitle = titleStr.includes(query);

      return matchNumber || matchTitle;
    });

    filtered.sort((a, b) => {
      if (currentSort === "newest") return b.id - a.id;
      if (currentSort === "price_asc") {
        const priceA = parseInt(String(a.price).replace(/[^0-9]/g, ""), 10) || 0;
        const priceB = parseInt(String(b.price).replace(/[^0-9]/g, ""), 10) || 0;
        return priceA - priceB;
      }
      if (currentSort === "price_desc") {
        const priceA = parseInt(String(a.price).replace(/[^0-9]/g, ""), 10) || 0;
        const priceB = parseInt(String(b.price).replace(/[^0-9]/g, ""), 10) || 0;
        return priceB - priceA;
      }
      return 0;
    });

    productCountSpan.textContent = filtered.length;

    if (filtered.length === 0) {
      productsContainer.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    productsContainer.innerHTML = filtered.map((p) => createCleanRowCardHtml(p)).join("");
  }

  function createCleanRowCardHtml(p) {
    const priceHtml = p.price
      ? `<div class="row-price-line"><span class="row-price">${escapeHtml(p.price)}</span></div>`
      : "";

    return `
      <a 
        href="${p.affiliate_url}" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="product-row-card" 
        id="item-${p.id}"
        onclick="trackClick(${p.id}, '${escapeHtml(p.title)}')"
      >
        <!-- 좌측 썸네일 -->
        <div class="row-thumb-wrapper">
          <img 
            class="row-thumb-img" 
            src="${p.image_url}" 
            alt="${escapeHtml(p.title)}" 
            loading="lazy"
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';"
          />
        </div>

        <!-- 중앙 정보 영역 (상품명 + 가격) -->
        <div class="row-info-area">
          <h2 class="row-title">${escapeHtml(p.title)}</h2>
          ${priceHtml}
        </div>

        <!-- 우측 바로가기 화살표 -->
        <div class="row-action-area">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </a>
    `;
  }

  // 4. 클릭 트래킹
  window.trackClick = function(id, title) {
    const raw = localStorage.getItem("infolink_analytics");
    let stats = raw ? JSON.parse(raw) : { views: 0, clicks: {}, sources: { tiktok: 0, instagram: 0, threads: 0, direct: 0 } };

    if (!stats.clicks) stats.clicks = {};
    stats.clicks[id] = (stats.clicks[id] || 0) + 1;

    localStorage.setItem("infolink_analytics", JSON.stringify(stats));
  };

  // 검색창 이벤트
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? "block" : "none";
    renderProducts();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.style.display = "none";
    searchInput.focus();
    renderProducts();
  });

  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderProducts();
  });

  function checkUrlDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const num = params.get("num") || params.get("id");
    if (num) {
      searchInput.value = num;
      searchQuery = num;
      clearSearchBtn.style.display = "block";
      renderProducts();

      setTimeout(() => {
        const targetCard = document.getElementById(`item-${num}`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
          targetCard.style.outline = "2px solid #3b82f6";
        }
      }, 300);
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // 앱 시작
  try {
    trackPageView();

    // 설정과 상품을 같이 받아온다. 설정을 기다렸다 그리는 건 기본 채널명이
    // 잠깐 보였다가 바뀌는 깜빡임을 없애기 위해서다. 병렬이라 왕복은 한 번이다.
    const [sheetSettings, products] = await Promise.all([
      dataSource.fetchSettings(),
      dataSource.fetchProducts()
    ]);

    activeConfig = InfolinkSettings.resolve(CONFIG, sheetSettings);
    currentSort = activeConfig.ui.defaultSort || "newest";

    initProfile();
    allProducts = products;
    renderProducts();
    checkUrlDeepLink();
  } catch (err) {
    console.error("앱 초기화 오류:", err);
  }
});
