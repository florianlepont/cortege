import type { LocalSurvey } from "../../storage"
import { buildListItems, isSectionHeader, keyExtractor } from "./list-items"

const survey = (id: string, status: string, updatedAt: string): LocalSurvey =>
  ({ id, status, updated_at: updatedAt, site_name: id }) as unknown as LocalSurvey

describe("buildListItems (OA-55: À terminer, then Terminés)", () => {
  it("puts every unsubmitted survey under À terminer and the submitted ones under Terminés, newest first", () => {
    const { items, toFinishCount } = buildListItems([
      survey("old-draft", "draft", "2026-09-01T10:00:00.000Z"),
      survey("done", "submitted", "2026-09-20T10:00:00.000Z"),
      survey("new-draft", "draft", "2026-10-02T10:00:00.000Z"),
      survey("expired", "expired", "2026-09-15T10:00:00.000Z"),
      survey("older-done", "submitted", "2026-09-10T10:00:00.000Z"),
    ])
    expect(toFinishCount).toBe(3)
    expect(
      items.map((item) => (isSectionHeader(item) ? `# ${item.key} ${item.count}` : item.id)),
    ).toEqual([
      "# toFinish 3",
      "new-draft",
      "expired",
      "old-draft",
      "# finished 2",
      "done",
      "older-done",
    ])
  })

  it("omits a section that has no survey", () => {
    expect(buildListItems([survey("a", "draft", "2026-09-01T10:00:00.000Z")]).items).toHaveLength(2)
    const finishedOnly = buildListItems([survey("a", "submitted", "2026-09-01T10:00:00.000Z")])
    expect(finishedOnly.toFinishCount).toBe(0)
    expect(isSectionHeader(finishedOnly.items[0])).toBe(true)
    expect(buildListItems([]).items).toEqual([])
  })

  it("keys a header by its section and a survey by its id", () => {
    const { items } = buildListItems([survey("a", "draft", "2026-09-01T10:00:00.000Z")])
    expect(items.map(keyExtractor)).toEqual(["section:toFinish", "a"])
  })
})
