import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    // 아직 테스트 파일이 없는 초기 스캐폴딩 단계에서도 정상 종료하도록 허용.
    passWithNoTests: true,
  },
});
