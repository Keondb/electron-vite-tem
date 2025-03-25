// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin, bytecodePlugin, swcPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin(), swcPlugin()],
    build: {
      rollupOptions: {
        external: ["sqlite3"]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  renderer: {
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          //生产环境时移除console
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@": resolve("src/renderer/src"),
        "@store": resolve("src/renderer/src/store/modules"),
        "@api": resolve("src/renderer/src/api"),
        "electron-store": resolve("src/renderer/electron-store.d.ts")
      }
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()]
      }),
      Components({
        resolvers: [ElementPlusResolver()]
      })
    ],
    server: {
      /** 设置 host: true 才可以使用 Network 的形式，以 IP 访问项目 */
      host: true,
      // host: "0.0.0.0"
      /** 端口号 */
      port: 1e4,
      /** 是否自动打开浏览器 */
      open: false,
      /** 跨域设置允许 */
      cors: true,
      /** 端口被占用时，是否直接退出 */
      strictPort: false,
      /** 接口代理 */
      proxy: {
        "/electron": {
          // target: 'http://47.103.137.203/',
          target: "http://localhost:8888/",
          // target: "https://www.fastmock.site/mock/761e2dda2b8890ab86c928a74e8f6538",
          ws: true,
          /** 是否允许跨域 */
          changeOrigin: true
        }
      }
    },
    envDir: resolve("src/renderer/env"),
    envPrefix: "VITE_"
  }
});
export {
  electron_vite_config_default as default
};
