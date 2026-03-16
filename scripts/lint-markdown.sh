#!/bin/bash
# Lint markdown content for common Craft CMS migration artifacts
# Usage: ./scripts/lint-markdown.sh [--fix]

FIX=false
if [ "$1" = "--fix" ]; then
  FIX=true
fi

ERRORS=0

echo "Checking for markdown formatting issues..."
echo ""

# 1. Unresolved Craft tags
COUNT=$(grep -rn '{asset:\|{entry:\|{url:' src/content/ --include="*.md" | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== Unresolved Craft CMS tags: $COUNT =="
  grep -rn '{asset:\|{entry:\|{url:' src/content/ --include="*.md"
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

# 2. Asterisk glued to preceding word (broken italic open): word*Title
COUNT=$(grep -rn '[a-z],\*[A-Z]\|[a-z]\.\*[A-Z]\|[a-z])\*[A-Z]' src/content/ --include="*.md" | grep -v 'books:' | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== Missing space before italic asterisk: $COUNT =="
  grep -rn '[a-z],\*[A-Z]\|[a-z]\.\*[A-Z]\|[a-z])\*[A-Z]' src/content/ --include="*.md" | grep -v 'books:'
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

# 3. Space after opening asterisk: "* Title" (breaks italic)
COUNT=$(grep -rn '^\* [A-Z]\| \* [A-Z]' src/content/ --include="*.md" | grep -v '^\-\|^  \*\|^src/content/.*/[0-9]' | grep -v 'list\|bullet' | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== Space after opening asterisk (may break italic): $COUNT =="
  grep -rn ' \* [A-Z]' src/content/ --include="*.md" | head -20
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

# 4. Triple/quadruple asterisks (broken bold/italic nesting)
COUNT=$(grep -rn '\*\*\*' src/content/ --include="*.md" | grep -v 'books:\|videoEmbed' | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== Triple asterisks (broken formatting): $COUNT =="
  grep -rn '\*\*\*' src/content/ --include="*.md" | grep -v 'books:\|videoEmbed'
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

# 5. Bold wrapping links: **[text](url)**
COUNT=$(grep -rn '\*\*\[.*\](.*)\*\*' src/content/ --include="*.md" | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== Bold-wrapped links (should be plain links): $COUNT =="
  grep -rn '\*\*\[.*\](.*)\*\*' src/content/ --include="*.md"
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

# 6. HTML entities that should be plain text
COUNT=$(grep -rn '&amp;\|&lt;\|&gt;\|&quot;' src/content/ --include="*.md" | grep -v 'videoEmbed\|embedCode' | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== HTML entities in content: $COUNT =="
  grep -rn '&amp;\|&lt;\|&gt;\|&quot;' src/content/ --include="*.md" | grep -v 'videoEmbed\|embedCode'
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

# 7. Asterisk glued to following word without space: word**Text or ,**Text
COUNT=$(grep -rn '[a-z,]\*\*[A-Z]' src/content/ --include="*.md" | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "== Bold marker glued to text: $COUNT =="
  grep -rn '[a-z,]\*\*[A-Z]' src/content/ --include="*.md" | head -20
  echo ""
  ERRORS=$((ERRORS + COUNT))
fi

echo "================================"
if [ "$ERRORS" -eq 0 ]; then
  echo "No issues found."
else
  echo "Found $ERRORS issues."
fi
exit $ERRORS
