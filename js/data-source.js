/**
 * [데이터 소스 매니저 - 간소화 버전]
 * Google Sheets (CSV), Supabase, 또는 Local JSON으로부터 핵심 상품 정보(상품명, 가격, 썸네일, 링크)를 실시간 로드합니다.
 */
class DataSourceManager {
  constructor(config) {
    this.config = config;
  }

  async fetchProducts() {
    const { mode, googleSheetCsvUrl, apiEndpointUrl } = this.config.dataSource;

    try {
      if (mode === "google_sheets" && googleSheetCsvUrl) {
        return await this.fetchFromGoogleSheetCsv(googleSheetCsvUrl);
      } else if (mode === "supabase" && apiEndpointUrl) {
        return await this.fetchFromApi(apiEndpointUrl);
      } else {
        return await this.fetchFromLocalJson();
      }
    } catch (error) {
      console.warn("데이터 로드 실패, 로컬 백업 데이터를 로드합니다:", error);
      return await this.fetchFromLocalJson();
    }
  }

  async fetchFromLocalJson() {
    const response = await fetch("./data/products.json?t=" + Date.now());
    if (!response.ok) {
      throw new Error(`로컬 JSON 로드 실패: ${response.status}`);
    }
    const data = await response.json();
    return this.normalizeProducts(data);
  }

  async fetchFromGoogleSheetCsv(csvUrl) {
    const response = await fetch(csvUrl + (csvUrl.includes("?") ? "&" : "?") + "t=" + Date.now());
    if (!response.ok) {
      throw new Error(`구글 시트 로드 실패: ${response.status}`);
    }
    const csvText = await response.text();
    return this.parseCsvToProducts(csvText);
  }

  async fetchFromApi(endpoint) {
    const response = await fetch(endpoint, {
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) {
      throw new Error(`API 로드 실패: ${response.status}`);
    }
    const data = await response.json();
    return this.normalizeProducts(data);
  }

  parseCsvToProducts(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvRow(lines[i]);
      if (!row || row.length === 0 || !row[0]) continue;

      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] ? row[index].trim() : "";
      });

      products.push({
        id: parseInt(item.id || i, 10),
        title: item.title || "상품명 없음",
        price: item.price ? (String(item.price).includes("원") ? item.price : `${Number(item.price).toLocaleString()}원`) : "",
        image_url: item.image_url || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80",
        affiliate_url: item.affiliate_url || "#",
        created_at: item.created_at || new Date().toISOString().split("T")[0]
      });
    }

    return this.normalizeProducts(products);
  }

  /**
   * 'settings' 탭(key | value 2열)을 읽어 CONFIG 와 같은 모양으로 되돌린다.
   * 시트를 못 읽거나 탭이 비어 있으면 null 을 돌려준다 — 호출한 쪽이 config.js
   * 기본값을 그대로 쓰게 하려는 것이다. 설정을 못 읽었다고 사이트가 비면 안 된다.
   */
  async fetchSettings() {
    const url = this.config.dataSource.settingsCsvUrl;
    if (!url) return null;

    try {
      const response = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
      if (!response.ok) throw new Error(`설정 시트 로드 실패: ${response.status}`);

      const rows = this.parseCsvRows(await response.text());
      if (rows.length < 2) return null;

      // 1행은 헤더(key,value)라 건너뛴다.
      const kv = {};
      for (let i = 1; i < rows.length; i++) {
        const key = (rows[i][0] || "").trim();
        if (key) kv[key] = (rows[i][1] || "").trim();
      }

      return this.settingsToConfig(kv);
    } catch (error) {
      console.warn("설정 시트 로드 실패, config.js 기본값을 사용합니다:", error);
      return null;
    }
  }

  /**
   * 빈 칸은 키 자체를 넣지 않는다. 그래야 병합할 때 config.js 기본값이 살아남는다.
   * (빈 문자열을 넣으면 채널명이 빈 화면으로 덮인다)
   */
  settingsToConfig(kv) {
    const channel = {};
    const socials = {};
    const ui = {};

    const put = (target, key, value) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        target[key] = String(value).trim();
      }
    };

    put(channel, "name", kv.channel_name);
    put(channel, "handle", kv.channel_handle);
    put(channel, "tagline", kv.tagline);
    put(channel, "avatar", kv.avatar_url);
    put(channel, "businessEmail", kv.business_email);

    put(socials, "tiktok", kv.sns_tiktok);
    put(socials, "instagram", kv.sns_instagram);
    put(socials, "threads", kv.sns_threads);
    put(socials, "youtube", kv.sns_youtube);

    put(ui, "topNoticeText", kv.top_notice);

    if (Object.keys(socials).length > 0) channel.socials = socials;

    const result = {};
    if (Object.keys(channel).length > 0) result.channel = channel;
    if (Object.keys(ui).length > 0) result.ui = ui;

    return Object.keys(result).length > 0 ? result : null;
  }

  /** CSV 전체를 2차원 배열로. 상품 파서와 설정 파서가 같은 규칙을 쓰게 한다. */
  parseCsvRows(csvText) {
    return csvText
      .trim()
      .split("\n")
      .map((line) => this.parseCsvRow(line))
      .filter((row) => row && row.length > 0);
  }

  parseCsvRow(rowText) {
    const result = [];
    let insideQuote = false;
    let entry = "";

    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        result.push(entry.trim().replace(/^["']|["']$/g, ""));
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim().replace(/^["']|["']$/g, ""));
    return result;
  }

  normalizeProducts(rawList) {
    if (!Array.isArray(rawList)) return [];

    return rawList.map((p, idx) => {
      const id = p.id !== undefined ? Number(p.id) : idx + 1;
      let priceStr = p.price ? String(p.price) : "";
      if (priceStr && !priceStr.includes("원") && !isNaN(Number(priceStr))) {
        priceStr = `${Number(priceStr).toLocaleString()}원`;
      }

      return {
        id: id,
        title: p.title || "상품명 없음",
        price: priceStr,
        image_url: p.image_url || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80",
        affiliate_url: p.affiliate_url || "#",
        created_at: p.created_at || "2026-08-20"
      };
    });
  }
}
