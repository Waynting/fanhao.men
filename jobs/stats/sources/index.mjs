// Every data source the trending ranking is built from.
//
// A source is { name, weight, collect(db, { from, to }) } where collect returns
// [{ code, users }]: distinct contributors per normalized code inside [from, to).
// `name` becomes the key in trending_codes.counts; `weight` scales it into the score.
// To add a source, create a file next to this one and list it here.

import saves from "./saves.mjs"
import clicks from "./clicks.mjs"

export const sources = [saves, clicks]
