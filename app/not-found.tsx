import "./globals.css"

// Only reached for paths the middleware skips (see middleware.ts); everything else gets the
// localized app/[locale]/not-found.tsx. The root layout renders no <html>, so this page does.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans">
        <div className="text-center px-4">
          <h1 className="text-6xl font-bold text-zinc-900 mb-4">404</h1>
          <p className="text-zinc-600 mb-8">Page not found</p>
          <a href="/" className="text-zinc-900 underline">
            fanhao.men
          </a>
        </div>
      </body>
    </html>
  )
}
