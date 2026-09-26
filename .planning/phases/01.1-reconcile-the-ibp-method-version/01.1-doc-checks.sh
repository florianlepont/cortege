#!/usr/bin/env bash
# Phase 01.1 (reconcile the IBP method version): re-runnable D-08 document checks.
# Run from the repository root:
#   bash .planning/phases/01.1-reconcile-the-ibp-method-version/01.1-doc-checks.sh
# Prints one "FAIL: <reason>" line per failed check, exits 1 if any failed,
# otherwise prints "ALL DOC CHECKS PASSED" as its last line.
set -u
export LC_ALL=C.UTF-8

BASE=a674354
CMP=docs/technical/ibp-version-comparison-v3.0-v3.2.md
ADR=docs/technical/adr-003-ibp-method-version-v1.md
ADR2=docs/technical/adr-002-on-device-species-recognition-v1.md
SPIKE=docs/technical/species-recognition-spike-measurements-v1.md
MAT=docs/technical/ibp-validation-matrix-v1.md
REFS=docs/references/README.md
SPEC=docs/specs/ibp-form-spec.md
ROADMAP=.planning/ROADMAP.md
V32_SHA=f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001
V32_URL=IBP_FR_v3_2_260202.pdf
ROW_RE='^\| *(CLS|A|B|CD|E|F|G|H|I|J|GS)-[0-9]+ *\|'

failures=0
fail() {
  echo "FAIL: $*"
  failures=$((failures + 1))
}

if [ ! -f CLAUDE.md ] || [ ! -d .planning ]; then
  echo "FAIL: run this script from the repository root"
  exit 1
fi

for f in "$CMP" "$ADR" "$ADR2" "$SPIKE" "$MAT" "$REFS" "$SPEC" "$ROADMAP" docs/README.md; do
  [ -f "$f" ] || fail "missing file $f"
done

# 1. Comparison document (criteria 1 and 2, D-03, D-04)
if [ -f "$CMP" ]; then
  for x in A B C D E F G H I J; do
    grep -qE "^## Factor $x — " "$CMP" || fail "comparison: no '## Factor $x — ' section"
  done
  grep -qiE '^##+ .*(genus|genre)' "$CMP" || fail "comparison: no genus-list section"
  grep -qiE '^##+ .*global' "$CMP" || fail "comparison: no global-score section"
  for g in Abies Acer Alnus Arbutus Betula Carpinus Castanea Celtis Cupressus Fagus Fraxinus \
    Juglans Juniperus Larix Malus Ostrya Pinus Picea Populus Prunus Pyrus Quercus Salix Sorbus \
    Tamarix Taxus Tilia Ulmus Ceratonia Cercis Olea Phillyrea Pistacia; do
    grep -q "$g" "$CMP" || fail "comparison: genus $g missing"
  done
  grep -q "$V32_SHA" "$CMP" || fail "comparison: v3.2 SHA-256 missing"
  rows=$(grep -cE "$ROW_RE" "$CMP")
  [ "$rows" -ge 56 ] || fail "comparison: $rows difference rows, expected at least 56"
  ! grep -qF '\|' "$CMP" || fail "comparison: escaped pipe inside a table cell"
  out=$(awk -F'|' '/^\| *(CLS|A|B|CD|E|F|G|H|I|J|GS|BUG|DRIFT)-[0-9]+ *\|/ {
      n = 0
      for (i = 2; i < NF; i++) { c = $i; gsub(/^ +| +$/, "", c); if (c != "") n++ }
      if (n < 7) print "incomplete row: " $2
    }' "$CMP")
  [ -z "$out" ] || fail "comparison: $out"
  out=$(awk -F'|' '/^\| *(CLS|A|B|CD|E|F|G|H|I|J|GS)-[0-9]+ *\|/ {
      if ($4 !~ /p\. ?[0-9]/) print "no v3.2 page: " $2
    }' "$CMP")
  [ -z "$out" ] || fail "comparison: $out"
  for m in MAT-A-01 MAT-A-02 MAT-B-01 MAT-C-01 MAT-D-01 MAT-E-01 MAT-F-01 MAT-F-02 MAT-G-01 \
    MAT-H-01 MAT-I-01 MAT-I-02 MAT-J-01 MAT-CONS-01 MAT-CONS-02 MAT-SUBMIT-01 MAT-SUBMIT-02; do
    grep -q "$m" "$CMP" || fail "comparison: matrix case $m missing"
  done
  [ -z "$(grep -oE '«[^»]{120,}»' "$CMP")" ] || fail "comparison: a « » quote of 120+ characters"
fi

# 2. ADR-003 (criteria 3 and 4)
if [ -f "$ADR" ]; then
  grep -qE '^\*\*Decision:\*\* Migrate the app to IBP FR v3\.2 in this milestone \(phase 01\.8\)' "$ADR" ||
    fail "ADR-003: Decision line missing or reworded"
  for w in "method version" "submitted" "drafts" "prepareUpsert"; do
    grep -qi "$w" "$ADR" || fail "ADR-003: '$w' missing (D-07 statement)"
  done
  grep -qiE "missing (method[- ])?version (means|=) ?v3\.0" "$ADR" ||
    fail "ADR-003: missing-version rule absent"
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    grep -qE "^\| *CH-$i *\|" "$ADR" || fail "ADR-003: change-list row CH-$i missing"
  done
  sql=$(awk '/^ *```sql/ { on = 1; next } on && /^ *```/ { on = 0 } on' "$ADR")
  [ -n "$sql" ] || fail "ADR-003: no sql block"
  [ -z "$(printf '%s\n' "$sql" | grep -iwE 'INSERT|UPDATE|DELETE|ALTER|DROP')" ] ||
    fail "ADR-003: owner SQL contains a write or DDL keyword"
fi

# 3. Criterion 5: citation files name the implemented version
for f in "$REFS" "$SPEC"; do
  [ -f "$f" ] || continue
  grep -iE 'v3\.0' "$f" | grep -qiE 'implement' || fail "$f: no line naming v3.0 as implemented"
  grep -q "ADR-003" "$f" || fail "$f: ADR-003 not named"
  grep -q "$V32_URL" "$f" || fail "$f: v3.2 URL missing"
  [ -z "$(grep -iE "(implements|implemented:?|conformant with|conforms to) (the )?(IBP )?(FR |Fr )?v3\.2" "$f")" ] ||
    fail "$f: claims that v3.2 is implemented"
done

# 4. Validation matrix: 17 baseline rows verbatim, v3.2 target section
if [ -f "$MAT" ]; then
  t=$(mktemp)
  git show "$BASE:$MAT" | grep '^| MAT-' >"$t"
  [ "$(wc -l <"$t")" -eq 17 ] || fail "matrix: baseline at $BASE does not have 17 rows"
  while IFS= read -r r; do
    grep -Fxq -- "$r" "$MAT" || fail "matrix: baseline row changed: ${r:0:40}"
  done <"$t"
  rm -f "$t"
  grep -qE '^## v3\.2 target cases \(not implemented yet\)' "$MAT" ||
    fail "matrix: 'v3.2 target cases (not implemented yet)' heading missing"
fi

# 5. Indexes (D-05) and ROADMAP bindings
for f in CLAUDE.md docs/README.md; do
  grep -q "adr-003-ibp-method-version-v1.md" "$f" || fail "$f: ADR-003 not indexed"
  grep -q "ibp-version-comparison-v3.0-v3.2.md" "$f" || fail "$f: comparison not indexed"
done
e18=$(sed -n '/^### Phase 01.8:/,/^### Phase 01.9:/p' "$ROADMAP")
printf '%s\n' "$e18" | grep -qE '^\*\*Input from Phase 01\.1\*\*:.*CH-6' ||
  fail "ROADMAP: phase 01.8 has no 'Input from Phase 01.1' line"
printf '%s\n' "$e18" | grep -qE '^  6\. .*IBP FR v3\.2.*ADR-003' ||
  fail "ROADMAP: phase 01.8 criterion 6 missing"
[ "$(printf '%s\n' "$e18" | grep -E '^  [1-5]\. ')" = \
  "$(git show "$BASE:$ROADMAP" | sed -n '/^### Phase 01.8:/,/^### Phase 01.9:/p' | grep -E '^  [1-5]\. ')" ] ||
  fail "ROADMAP: phase 01.8 criteria 1-5 changed"
sed -n '/^### Phase 2:/,/^### Phase 3/p' "$ROADMAP" | grep -qE '^\*\*Input from Phase 01\.1\*\*:.*CH-12' ||
  fail "ROADMAP: phase 2 has no 'Input from Phase 01.1' line"

# 6. Spike doc and ADR-002 pointers, v3.2 page numbers
if [ -f "$SPIKE" ]; then
  sec2=$(sed -n '/^## 2\. Genus label set/,/^## 3\. /p' "$SPIKE")
  [ -z "$(printf '%s\n' "$sec2" | grep -nE '\(p\. 2[,)]|\(p\. 9[,)]|p\. 9–10')" ] ||
    fail "spike doc §2: stale v3.2 page citation (p. 2, p. 9 or p. 9–10)"
  [ -z "$(grep -nE 'v3\.2 p\.2|on p\.2[ ,.]' "$SPIKE")" ] || fail "spike doc: stale 'p.2' citation"
  printf '%s\n' "$sec2" | grep -q "adr-003-ibp-method-version-v1.md" || fail "spike doc §2: no ADR-003 link"
  sed -n '/^\*\*9\. First-hand confirmation/,/^\*\*10\./p' "$SPIKE" | grep -q "adr-003-ibp-method-version-v1.md" ||
    fail "spike doc §9 gap 9: no ADR-003 link"
fi
[ "$(grep -c "adr-003-ibp-method-version-v1.md" "$ADR2")" -ge 3 ] || fail "ADR-002: fewer than 3 ADR-003 links"

# 7. Relative Markdown links resolve
for f in "$CMP" "$ADR" "$ADR2" "$SPIKE" "$MAT" "$REFS" "$SPEC" docs/README.md; do
  [ -f "$f" ] || continue
  d=$(dirname "$f")
  while IFS= read -r target; do
    case "$target" in http* | mailto:* | '#'*) continue ;; esac
    p=${target%%#*}
    p=${p%% *}
    [ -n "$p" ] || continue
    [ -e "$d/$p" ] || fail "$f: broken relative link ($target)"
  done < <(grep -oE '\]\([^)]+\)' "$f" | sed -E 's/^\]\((.*)\)$/\1/')
done

# 8. Hygiene: no code, package or PDF change in the phase
[ -z "$(git diff --name-only "$BASE" -- api mobile packages .github infra package.json package-lock.json)" ] ||
  fail "code or package files differ from $BASE"
[ -z "$(git status --porcelain -- api mobile packages .github infra package.json package-lock.json)" ] ||
  fail "uncommitted or untracked code or package files"
[ -z "$(git ls-files '*.pdf')" ] || fail "a PDF is tracked"

# 9. Cross-references: every row, bug and change ID cited in the phase documents exists
row_ids=$(grep -oE "$ROW_RE" "$CMP" | tr -d '| ' | sort -u)
bug_ids=$(grep -oE '^\| *(BUG|DRIFT)-[0-9]+ *\|' "$CMP" | tr -d '| ' | sort -u)
ch_ids=$(grep -oE '^\| *CH-[0-9]+ *\|' "$ADR" | tr -d '| ' | sort -u)
known=$(printf '%s\n%s\n%s\n' "$row_ids" "$bug_ids" "$ch_ids")
for f in "$CMP" "$ADR" "$ADR2" "$SPIKE" "$MAT" "$REFS" "$SPEC" "$ROADMAP"; do
  cited=$(grep -oE '(^|[^A-Za-z0-9-])(CLS|A|B|CD|E|F|G|H|I|J|GS|BUG|DRIFT|CH)-[0-9]+\b' "$f" |
    sed -E 's/^[^A-Z]//' | sort -u)
  for id in $cited; do
    printf '%s\n' "$known" | grep -qx "$id" || fail "$f: cites $id, which is not defined"
  done
done
mat_ids=$(grep -oE 'MAT-[A-Z]+-[0-9]+' "$MAT" | sort -u)
for f in "$CMP" "$ADR"; do
  for id in $(grep -oE 'MAT-[A-Z]+-[0-9]+' "$f" | sort -u); do
    printf '%s\n' "$mat_ids" | grep -qx "$id" || fail "$f: cites $id, which is not in the matrix"
  done
done

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "ALL DOC CHECKS PASSED"
