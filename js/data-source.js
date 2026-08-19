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
