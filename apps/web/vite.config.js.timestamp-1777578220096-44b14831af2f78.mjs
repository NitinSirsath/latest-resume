// vite.config.js
import { defineConfig } from "file:///Users/nitinsirsath/Documents/GitHub/latest-resume/node_modules/.pnpm/vite@5.4.21_@types+node@25.6.0/node_modules/vite/dist/node/index.js";
import react from "file:///Users/nitinsirsath/Documents/GitHub/latest-resume/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@25.6.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import { TanStackRouterVite } from "file:///Users/nitinsirsath/Documents/GitHub/latest-resume/node_modules/.pnpm/@tanstack+router-plugin@1.167.14_@tanstack+react-router@1.168.15_react-dom@18.3.1_react@18.3._3r46wx7sawocvk2eg2rdahc2ee/node_modules/@tanstack/router-plugin/dist/esm/vite.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/nitinsirsath/Documents/GitHub/latest-resume/apps/web";
var vite_config_default = defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@resumetailor/ui": path.resolve(__vite_injected_original_dirname, "../../packages/ui/src"),
      "@resumetailor/types": path.resolve(__vite_injected_original_dirname, "../../packages/types/src"),
      "@resumetailor/shared": path.resolve(__vite_injected_original_dirname, "../../packages/shared/src")
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbml0aW5zaXJzYXRoL0RvY3VtZW50cy9HaXRIdWIvbGF0ZXN0LXJlc3VtZS9hcHBzL3dlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL25pdGluc2lyc2F0aC9Eb2N1bWVudHMvR2l0SHViL2xhdGVzdC1yZXN1bWUvYXBwcy93ZWIvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL25pdGluc2lyc2F0aC9Eb2N1bWVudHMvR2l0SHViL2xhdGVzdC1yZXN1bWUvYXBwcy93ZWIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBUYW5TdGFja1JvdXRlclZpdGUgfSBmcm9tICdAdGFuc3RhY2svcm91dGVyLXBsdWdpbi92aXRlJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgcGx1Z2luczogW1xuICAgICAgICBUYW5TdGFja1JvdXRlclZpdGUoKSxcbiAgICAgICAgcmVhY3QoKVxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICAgICAgICBcIkByZXN1bWV0YWlsb3IvdWlcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy91aS9zcmNcIiksXG4gICAgICAgICAgICBcIkByZXN1bWV0YWlsb3IvdHlwZXNcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy90eXBlcy9zcmNcIiksXG4gICAgICAgICAgICBcIkByZXN1bWV0YWlsb3Ivc2hhcmVkXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4vcGFja2FnZXMvc2hhcmVkL3NyY1wiKSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgICBwb3J0OiA1MTczLFxuICAgICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVcsU0FBUyxvQkFBb0I7QUFDaFksT0FBTyxXQUFXO0FBQ2xCLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTO0FBQUEsSUFDTCxtQkFBbUI7QUFBQSxJQUNuQixNQUFNO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ0wsT0FBTztBQUFBLE1BQ0gsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3BDLG9CQUFvQixLQUFLLFFBQVEsa0NBQVcsdUJBQXVCO0FBQUEsTUFDbkUsdUJBQXVCLEtBQUssUUFBUSxrQ0FBVywwQkFBMEI7QUFBQSxNQUN6RSx3QkFBd0IsS0FBSyxRQUFRLGtDQUFXLDJCQUEyQjtBQUFBLElBQy9FO0FBQUEsRUFDSjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2hCO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
