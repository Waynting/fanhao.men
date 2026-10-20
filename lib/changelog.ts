import { readFile } from "node:fs/promises"
import path from "node:path"

// CHANGELOG.md at the repo root is the single source; the /changelog page renders it at build time.
// Only the subset the file uses is parsed: "# title", intro paragraphs, "## <version> - <date>" (version optional),
// "### <group>", "- item".

export type ChangelogGroup = { label: string; items: string[] }
export type ChangelogRelease = { version?: string; date: string; groups: ChangelogGroup[] }
export type Changelog = { title: string; intro: string[]; releases: ChangelogRelease[] }

export async function loadChangelog(): Promise<Changelog> {
  const source = await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8")
  const log: Changelog = { title: "", intro: [], releases: [] }

  for (const raw of source.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const release = log.releases.at(-1)
    if (line.startsWith("### ")) {
      release?.groups.push({ label: line.slice(4), items: [] })
    } else if (line.startsWith("## ")) {
      const [, version, date] = line.slice(3).match(/^(?:(\d+\.\d+\.\d+)\s+-\s+)?(.+)$/)!
      log.releases.push({ version, date, groups: [] })
    } else if (line.startsWith("# ")) {
      log.title = line.slice(2)
    } else if (line.startsWith("- ")) {
      release?.groups.at(-1)?.items.push(line.slice(2))
    } else if (!release) {
      log.intro.push(line)
    }
  }
  return log
}
