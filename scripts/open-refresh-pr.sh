#!/usr/bin/env bash
# Commits refreshed files to a branch and opens a pull request for them, if
# one is not already open. Shared by the refresh-* workflows, each of which
# regenerates some files under config/ and asks for a review rather than
# pushing to the default branch.
#
#   scripts/open-refresh-pr.sh <branch> <title> <body> <file>...
#
# Only the files that differ from HEAD are committed. Needs GH_TOKEN,
# GITHUB_REPOSITORY and GITHUB_REF_NAME, which Actions provides.
set -euo pipefail
branch=$1 title=$2 body=$3
shift 3
repo=$GITHUB_REPOSITORY
base=$(git rev-parse HEAD)

# Through the contents API rather than `git push`: those commits are signed by
# GitHub, which the branch ruleset requires. The branch is reset to HEAD first,
# so a run replaces the last run's proposal rather than stacking on it.
gh api "repos/$repo/git/refs" -f ref="refs/heads/$branch" -f sha="$base" --silent \
  || gh api -X PATCH "repos/$repo/git/refs/heads/$branch" -f sha="$base" -F force=true --silent

for f in "$@"; do
  git diff --quiet -- "$f" && continue
  sha=$(gh api "repos/$repo/contents/$f?ref=$branch" -q .sha 2>/dev/null || true)
  gh api -X PUT "repos/$repo/contents/$f" \
    -f message="Refresh $(basename "$f")" \
    -f branch="$branch" \
    -f content="$(base64 < "$f" | tr -d '\n')" \
    ${sha:+-f sha="$sha"} --silent
done

# Compared as a string rather than piped to `grep -q`: under pipefail, grep
# closing the pipe early can fail the pipeline and open a duplicate PR.
state=$(gh pr view "$branch" --json state -q .state 2>/dev/null || true)
[ "$state" = OPEN ] \
  || gh pr create --base "$GITHUB_REF_NAME" --head "$branch" --title "$title" --body "$body"
