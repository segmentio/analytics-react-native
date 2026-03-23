#!/usr/bin/env sh
#
# Pre-commit hook: reviews agent-authored commits against agents.md rules.
# Skips review for human-only commits (no Co-Authored-By agent trailer).
#

REPO_ROOT="$(git rev-parse --show-toplevel)"
RULES_FILE="$REPO_ROOT/agents.md"

# Called from commit-msg hook with $1 = path to commit message file
COMMIT_MSG_FILE="$1"

if [ -z "$COMMIT_MSG_FILE" ] || [ ! -f "$COMMIT_MSG_FILE" ]; then
  # No message file provided — not called from commit-msg context, skip
  exit 0
fi

# Check for agent co-author patterns (case-insensitive)
if ! grep -qi 'Co-Authored-By:.*\(Claude\|Copilot\|Cursor\|AI\|noreply@anthropic\)' "$COMMIT_MSG_FILE"; then
  # Not an agent commit, skip review
  exit 0
fi

echo "🤖 Agent commit detected — reviewing against agents.md rules..."

# --- 2. Check line count (<500 lines of code/test changes, excluding docs) ---
CHANGED_LINES=$(git diff --cached --numstat -- \
  ':!*.md' ':!*.mdx' ':!*.txt' ':!*.json' ':!*.lock' ':!*.yaml' ':!*.yml' \
  | awk '{ added += $1; deleted += $2 } END { print added + deleted }')

CHANGED_LINES=${CHANGED_LINES:-0}

if [ "$CHANGED_LINES" -ge 500 ]; then
  echo ""
  echo "❌ AGENT REVIEW FAILED"
  echo ""
  echo "  Commit has $CHANGED_LINES lines of code/test changes (limit: 500)."
  echo "  Split the task into smaller chunks and retry."
  echo ""
  exit 1
fi

# --- 3. Run Claude review ---
if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  claude CLI not found, skipping agent review"
  exit 0
fi

if [ ! -f "$RULES_FILE" ]; then
  echo "⚠️  agents.md not found, skipping agent review"
  exit 0
fi

DIFF=$(git diff --cached -- ':!*.lock')
RULES=$(cat "$RULES_FILE")
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

JSON_SCHEMA='{"type":"object","properties":{"pass":{"type":"boolean"},"message":{"type":"string"}},"required":["pass","message"]}'

REVIEW_PROMPT="You are a commit reviewer. Review this agent-authored commit against the rules below.

RULES:
$RULES

COMMIT MESSAGE:
$COMMIT_MSG

CHANGED LINES (code/test, excluding docs): $CHANGED_LINES

DIFF:
$DIFF

Review the diff against EVERY rule. If all rules pass, return {\"pass\": true, \"message\": \"ok\"}. If any rule is violated, return {\"pass\": false, \"message\": \"<concise explanation of which rules were violated and why>\"}.

Be strict but fair. Only flag clear violations, not borderline cases."

RESULT=$(echo "$REVIEW_PROMPT" | claude -p \
  --model haiku \
  --output-format json \
  --json-schema "$JSON_SCHEMA" \
  --allowedTools "" \
  --no-session-persistence \
  2>/dev/null)

CLAUDE_EXIT=$?

if [ $CLAUDE_EXIT -ne 0 ]; then
  echo "⚠️  Claude review failed to run (exit $CLAUDE_EXIT), skipping"
  exit 0
fi

PASS=$(echo "$RESULT" | jq -r '.result.pass // .pass // empty' 2>/dev/null)
MESSAGE=$(echo "$RESULT" | jq -r '.result.message // .message // empty' 2>/dev/null)

if [ "$PASS" = "false" ]; then
  echo ""
  echo "❌ AGENT REVIEW FAILED"
  echo ""
  echo "  $MESSAGE"
  echo ""
  exit 1
fi

echo "✅ Agent review passed"
exit 0
