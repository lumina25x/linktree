/**
 * [설정 병합 규칙 - 공용]
 *
 * 설정값의 출처가 세 군데라 우선순위를 한 곳에 모아둔다.
 * app.js 와 admin.js 가 같은 규칙을 쓰게 하려는 것이다.
 *
 *   1) js/config.js          가장 약함. 시트를 못 읽었을 때의 폴백.
 *   2) 구글 시트 settings 탭  진짜 소스. 모든 방문자가 보는 값.
 *   3) localStorage 미리보기  가장 셈. 단 저장 직후 잠깐만.
 *
 * 3번이 '잠깐만' 이어야 하는 이유: 게시 CSV 가 수 분간 캐시돼서 저장 직후에는
 * 시트에서 새 값을 못 읽어온다. 그 사이를 메우는 용도다. 계속 이기게 두면
 * 시트를 고쳐도 그 브라우저만 옛 값을 보게 되는, 원래의 그 문제로 돌아간다.
 */
const InfolinkSettings = {
  STORAGE_KEY: "infolink_custom_config",

  // 게시 CSV 캐시가 풀리는 시간보다 넉넉하게 잡는다.
  PREVIEW_TTL_MS: 10 * 60 * 1000,

  /** 얕은 병합이되 channel.socials 까지는 파고든다. 시트가 SNS 일부만 채울 수 있어서다. */
  merge(base, patch) {
    if (!patch) return base;

    const baseChannel = base.channel || {};
    const patchChannel = patch.channel || {};

    return {
      ...base,
      ...patch,
      channel: {
        ...baseChannel,
        ...patchChannel,
        socials: { ...(baseChannel.socials || {}), ...(patchChannel.socials || {}) }
      },
      admin: { ...(base.admin || {}), ...(patch.admin || {}) },
      dataSource: { ...(base.dataSource || {}), ...(patch.dataSource || {}) },
      ui: { ...(base.ui || {}), ...(patch.ui || {}) }
    };
  },

  /**
   * 저장 직후의 임시 미리보기를 읽는다. 유효기간이 지났거나 형식이 옛것이면 null.
   *
   * 옛 형식(설정 객체가 그대로 들어 있던 것)을 일부러 버린다. 그 값들은 시트가
   * 진짜 소스가 되기 전에 저장된 것이라, 살려두면 시트를 고쳐도 이 브라우저만
   * 계속 옛 이름을 보여준다.
   */
  readPreview() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.savedAt !== "number" || !parsed.config) return null;
      if (Date.now() - parsed.savedAt > this.PREVIEW_TTL_MS) return null;

      return parsed.config;
    } catch (e) {
      return null;
    }
  },

  writePreview(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), config }));
      return true;
    } catch (e) {
      // 저장소가 꽉 찼거나 시크릿 모드라 막힌 경우. 미리보기가 안 될 뿐
      // 시트에는 이미 저장됐으므로 실패로 취급하지 않는다.
      console.warn("미리보기 저장 실패(시트 저장에는 영향 없음):", e);
      return false;
    }
  },

  clearPreview() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
  },

  /** config.js(폴백) → 시트 → 미리보기 순으로 겹쳐 최종 설정을 만든다. */
  resolve(baseConfig, sheetSettings) {
    return this.merge(this.merge(baseConfig, sheetSettings), this.readPreview());
  }
};
