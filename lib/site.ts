// Site identity, shared by metadata, the manifest, robots/sitemap and the UI.
export const SITE_NAME = "fanhao.men"
/**
 * Canonical origin for metadata, robots and sitemap. Set NEXT_PUBLIC_SITE_URL per environment;
 * on Vercel it falls back to the project's production domain, locally to localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "")
export const SITE_TITLE = "fanhao.men｜番號收藏清單管理"
export const SITE_DESCRIPTION =
  "免費的番號收藏管理工具：建立播放清單、批次加入番號並自動格式化、一鍵生成影片網址、以連結分享清單。不需註冊，登入後可跨裝置同步。"
