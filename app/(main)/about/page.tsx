import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Github, ExternalLink, Mail } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "關於",
  description: "fanhao.men 是一個開源的番號收藏管理工具。了解這個專案的理念與聯絡方式。",
  alternates: { canonical: "/about" },
}

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回我的清單
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">關於 / About</h1>
        <p className="text-slate-600">
          了解這個專案的更多資訊 / Learn more about this project
        </p>
      </div>

      <div className="space-y-6">
        {/* Contact & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Mail className="h-5 w-5" />
              聯絡與支援 / Contact & Support
            </CardTitle>
            <CardDescription className="text-gray-700">
              遇到問題或有建議嗎？歡迎與我聯絡
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">如有任何問題、建議或需要協助，請透過電子郵件聯絡：</p>
              <p className="text-sm text-gray-600 mb-3">For any questions, suggestions, or assistance, please contact via email:</p>
              <a
                href="mailto:wayntingliu@gmail.com"
                className="inline-flex items-center gap-2 text-gray-900 hover:text-gray-700 font-medium transition-colors"
              >
                <Mail className="h-4 w-4" />
                wayntingliu@gmail.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-gray-500">
              💡 提示：請在郵件中清楚描述您的問題或建議，我會盡快回覆。
              <br />
              💡 Tip: Please describe your issue or suggestion clearly in the email, and I will respond as soon as possible.
            </p>
          </CardContent>
        </Card>

        {/* GitHub Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Open Source Project
            </CardTitle>
            <CardDescription>
              這是一個開源專案，歡迎查看原始碼和貢獻
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="https://github.com/Waynting/fanhao.men"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                className="w-full sm:w-auto"
              >
                <Github className="h-4 w-4 mr-2" />
                View on GitHub
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Why I Built This - Chinese */}
        <Card>
          <CardHeader>
            <CardTitle>為什麼要做這個專案？</CardTitle>
            <CardDescription>建立這個工具的動機與理念</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              <strong>番號管理的困境：</strong>
              當你收藏了大量的番號，你可能會遇到以下問題：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>影片網站經常更換網域或關閉，保存的連結會失效</li>
              <li>分散在不同平台的收藏難以統一管理</li>
              <li>想要分享清單給朋友，但不同人使用的網站不同</li>
              <li>沒有一個簡單的方式來整理和搜尋你的收藏</li>
            </ul>

            <p>
              <strong>以番號為核心的解決方案：</strong>
              這個專案採用「番號優先」的理念，讓你：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>永久保存</strong>：只記錄番號，不依賴任何特定網站</li>
              <li><strong>靈活切換</strong>：可以隨時切換到不同的影片網站</li>
              <li><strong>輕鬆分享</strong>：分享番號清單，讓朋友自行選擇觀看網站</li>
              <li><strong>簡單管理</strong>：建立多個播放清單，輕鬆分類整理</li>
            </ul>

            <p className="pt-2">
              <strong>技術實作：</strong>
              使用 Next.js 15 打造，不登入也能使用。
            </p>
          </CardContent>
        </Card>

        {/* Why I Built This - English */}
        <Card>
          <CardHeader>
            <CardTitle>Why I Built This</CardTitle>
            <CardDescription>The motivation and philosophy behind this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              <strong>The Problem with Video Link Management:</strong>
              When you have a large collection of AV codes, you might face these challenges:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Video sites frequently change domains or shut down, breaking your saved links</li>
              <li>Collections scattered across different platforms are hard to manage</li>
              <li>Sharing lists with friends is difficult when everyone uses different sites</li>
              <li>No simple way to organize and search your collection</li>
            </ul>

            <p>
              <strong>A Code-First Solution:</strong>
              This project adopts a "code-first" philosophy, allowing you to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Permanent Storage</strong>: Save only the codes, independent of any specific site</li>
              <li><strong>Flexible Switching</strong>: Switch between different video sites anytime</li>
              <li><strong>Easy Sharing</strong>: Share code lists and let friends choose their preferred site</li>
              <li><strong>Simple Management</strong>: Create multiple playlists to organize easily</li>
            </ul>

            <p className="pt-2">
              <strong>Technical Stack:</strong>
              Built with Next.js 15. No login required: all data stays in your own browser on this device.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
