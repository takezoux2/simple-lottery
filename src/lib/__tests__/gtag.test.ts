import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("gtag utility", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("when NEXT_PUBLIC_GA_ID is set", () => {
    const TEST_GA_ID = "G-TEST123456";

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_ID", TEST_GA_ID);
    });

    it("should call window.gtag on pageview if gtag function exists", async () => {
      const mockGtag = vi.fn();
      vi.stubGlobal("window", { gtag: mockGtag });

      const { pageview, GA_TRACKING_ID } = await import("../gtag");
      expect(GA_TRACKING_ID).toBe(TEST_GA_ID);

      pageview("/test-page");
      expect(mockGtag).toHaveBeenCalledWith("config", TEST_GA_ID, {
        page_path: "/test-page",
      });
    });

    it("should not throw on pageview if window.gtag is not defined", async () => {
      vi.stubGlobal("window", {});

      const { pageview } = await import("../gtag");
      expect(() => pageview("/test-page")).not.toThrow();
    });

    it("should not throw on pageview if window is undefined", async () => {
      vi.stubGlobal("window", undefined);

      const { pageview } = await import("../gtag");
      expect(() => pageview("/test-page")).not.toThrow();
    });

    it("should call window.gtag on event with provided parameters", async () => {
      const mockGtag = vi.fn();
      vi.stubGlobal("window", { gtag: mockGtag });

      const { event } = await import("../gtag");
      event({
        action: "draw_lottery",
        category: "lottery",
        label: "大吉",
        value: 1,
        config_id: "default-fortune",
        custom_param: "custom_value",
      });

      expect(mockGtag).toHaveBeenCalledWith("event", "draw_lottery", {
        event_category: "lottery",
        event_label: "大吉",
        value: 1,
        config_id: "default-fortune",
        custom_param: "custom_value",
      });
    });

    it("should not throw on event if window.gtag is not defined", async () => {
      vi.stubGlobal("window", {});

      const { event } = await import("../gtag");
      expect(() =>
        event({
          action: "draw_lottery",
        }),
      ).not.toThrow();
    });
  });

  describe("when NEXT_PUBLIC_GA_ID is not set", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    });

    it("should not call window.gtag on pageview", async () => {
      const mockGtag = vi.fn();
      vi.stubGlobal("window", { gtag: mockGtag });

      const { pageview, GA_TRACKING_ID } = await import("../gtag");
      expect(GA_TRACKING_ID).toBeFalsy();

      pageview("/test-page");
      expect(mockGtag).not.toHaveBeenCalled();
    });

    it("should not call window.gtag on event", async () => {
      const mockGtag = vi.fn();
      vi.stubGlobal("window", { gtag: mockGtag });

      const { event } = await import("../gtag");
      event({
        action: "draw_lottery",
        category: "lottery",
      });
      expect(mockGtag).not.toHaveBeenCalled();
    });
  });
});
