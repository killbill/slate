#!/usr/bin/env bash

# Check if Gemfile exists (do nothing on gh-pages)
if [ -f Gemfile ]
then
  bundle exec middleman build

  # Generate LLM artifacts (Cloudflare Pages has Node.js available)
  npm ci --ignore-scripts
  node scripts/generate-llm-artifacts.js
else
  mkdir build
  mv fonts images javascripts stylesheets *.html docs.jsonl docs-index.json llms.txt build/
fi
