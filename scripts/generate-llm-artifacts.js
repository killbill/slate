#!/usr/bin/env node
'use strict';

/**
 * generate-llm-artifacts.js
 *
 * Post-build script that reads Kill Bill Slate source markdown files and
 * produces machine-consumable artifacts for LLM retrieval and MCP servers:
 *
 *   build/docs.jsonl        – chunked retrieval corpus (NDJSON)
 *   build/docs-index.json   – lightweight search index
 *   build/llms.txt          – machine-readable site descriptor
 *
 * Usage:
 *   node scripts/generate-llm-artifacts.js
 *
 * Environment:
 *   BASE_URL  – override the canonical site URL (default: https://apidocs.killbill.io)
 *   VERSION   – override the version string (default: latest)
 */

const fs = require('fs');
const path = require('path');
const { unified } = require('unified');
const remarkParse = require('remark-parse');
const { toString } = require('mdast-util-to-string');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.BASE_URL || 'https://apidocs.killbill.io').replace(/\/+$/, '');
const VERSION = process.env.VERSION || 'latest';
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const SOURCE_DIR = path.resolve(__dirname, '..', 'source');
const INCLUDES_DIR = path.join(SOURCE_DIR, 'includes');
const BUILD_DIR = path.resolve(__dirname, '..', 'build');

const TARGET_MIN_TOKENS = 400;
const TARGET_MAX_TOKENS = 1200;
const HARD_MAX_TOKENS = 1500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rough token estimate: ~4 chars per token for English + code. */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/** Replicate Slate's heading-id parameterization (see lib/unique_head.rb). */
function parameterize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Extract first 1-2 sentences of prose from markdown (skip code, tables, HTML). */
function extractSummary(markdown, maxLen = 200) {
  const lines = markdown.split('\n');
  const prose = [];
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('|')) continue;
    if (line.startsWith('<')) continue;
    if (line.startsWith('>')) continue;
    if (line.trim() === '') continue;

    prose.push(line.trim());
    const joined = prose.join(' ');
    // Stop after 2 sentences or maxLen
    const sentences = joined.match(/[.!?]\s/g);
    if ((sentences && sentences.length >= 2) || joined.length >= maxLen) {
      return joined.slice(0, maxLen).replace(/\s+$/, '');
    }
  }
  return prose.join(' ').slice(0, maxLen).replace(/\s+$/, '');
}

/** Convert relative links in markdown to absolute URLs. */
function absolutifyLinks(markdown, baseUrl) {
  // [text](relative.html) → [text](BASE_URL/relative.html)
  // [text](relative.html#anchor) → [text](BASE_URL/relative.html#anchor)
  return markdown.replace(
    /\[([^\]]*)\]\((?!https?:\/\/|#|mailto:)([^)]+)\)/g,
    (match, text, href) => `[${text}](${baseUrl}/${href})`
  );
}

/** Strip HTML aside blocks and normalize whitespace. */
function cleanContent(markdown) {
  let result = markdown;
  // Convert <aside> blocks to plain text
  result = result.replace(
    /<aside[^>]*>\s*<span[^>]*>([^<]*)<\/span>\s*<span[^>]*>([^<]*)<\/span>\s*<\/aside>/g,
    (_, label, content) => `**${label.trim()}** ${content.trim()}`
  );
  // Remove any remaining HTML tags (but preserve content within)
  result = result.replace(/<\/?[^>]+>/g, '');
  // Normalize multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

/**
 * Extract keywords from headings, HTTP methods, and identifiable terms.
 */
function extractKeywords(headings, content) {
  const kw = new Set();

  // Words from headings
  for (const h of headings) {
    for (const word of h.toLowerCase().split(/\s+/)) {
      const clean = word.replace(/[^a-z0-9-]/g, '');
      if (clean.length > 2) kw.add(clean);
    }
  }

  // HTTP methods mentioned
  const methods = content.match(/\b(GET|POST|PUT|DELETE|PATCH)\s+http/gi);
  if (methods) {
    for (const m of methods) {
      kw.add(m.split(/\s/)[0].toLowerCase());
    }
  }

  // API path segments
  const paths = content.match(/\/1\.0\/kb\/([a-z-]+)/gi);
  if (paths) {
    for (const p of paths) {
      const segments = p.split('/').filter(Boolean);
      for (const s of segments) {
        if (s.length > 2 && s !== '1.0' && s !== 'kb') kw.add(s.toLowerCase());
      }
    }
  }

  return [...kw].sort();
}

// ---------------------------------------------------------------------------
// Source file discovery
// ---------------------------------------------------------------------------

/**
 * Discover source markdown files and their page mappings.
 * Returns array of { page, includeFile, section }.
 */
function discoverSources() {
  const sources = [];
  const pageFiles = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.html.md'));

  for (const pageFile of pageFiles) {
    const frontmatterRaw = fs.readFileSync(path.join(SOURCE_DIR, pageFile), 'utf8');
    const match = frontmatterRaw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;

    const fm = match[1];
    // Extract includes list
    const includesMatch = fm.match(/includes:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (!includesMatch) continue;

    const includes = includesMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean);

    // Extract current_page
    const cpMatch = fm.match(/current_page:\s*(.+)/);
    const currentPage = cpMatch ? cpMatch[1].trim() : pageFile.replace('.html.md', '');

    for (const inc of includes) {
      const includeFile = path.join(INCLUDES_DIR, `_${inc}.md`);
      if (fs.existsSync(includeFile)) {
        sources.push({
          page: currentPage,
          includeFile,
          section: titleCase(inc.replace(/-/g, ' ').replace(/_/g, ' '))
        });
      }
    }
  }

  return sources;
}

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Markdown chunking
// ---------------------------------------------------------------------------

/**
 * Split a markdown string into chunks based on headings.
 * Primary split: H2. Sub-split on H3 if H2 chunk exceeds TARGET_MAX_TOKENS.
 * Never splits code blocks or tables.
 *
 * Returns array of { depth, title, headings, content }.
 */
function chunkMarkdown(markdown, sectionTitle) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      const depth = headingMatch[1].length;
      const title = headingMatch[2].trim();

      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        depth,
        title,
        headings: depth === 1 ? [title]
          : depth === 2 ? [sectionTitle, title]
          : [sectionTitle, null, title], // placeholder for H2 parent
        contentLines: []
      };
    } else {
      if (!currentSection) {
        // Content before any heading — create an intro section
        currentSection = {
          depth: 0,
          title: sectionTitle,
          headings: [sectionTitle],
          contentLines: []
        };
      }
      currentSection.contentLines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Fill in H2 parent names for H3 sections
  let lastH2 = sectionTitle;
  for (const sec of sections) {
    if (sec.depth <= 2 && sec.depth > 0) {
      lastH2 = sec.title;
    }
    if (sec.depth === 3) {
      sec.headings[1] = lastH2;
    }
    // Remove null placeholders
    sec.headings = sec.headings.filter(Boolean);
  }

  // Now merge or split to get good chunk sizes
  return buildChunks(sections, sectionTitle);
}

/**
 * Merge small sections, split oversized ones.
 * Returns final chunks with content as a single markdown string.
 */
function buildChunks(sections, sectionTitle) {
  const chunks = [];
  let pendingMerge = null;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const content = sec.contentLines.join('\n').trim();
    const tokens = estimateTokens(content);

    if (tokens === 0 && sec.depth > 0) {
      // Empty section heading only — will be merged with next
      if (pendingMerge) {
        pendingMerge.contentLines.push('', `${'#'.repeat(sec.depth)} ${sec.title}`);
        pendingMerge.headings = [...new Set([...pendingMerge.headings, ...sec.headings])];
      } else {
        pendingMerge = { ...sec };
      }
      continue;
    }

    // If there's a pending small section, try merging
    if (pendingMerge) {
      const mergedContent = pendingMerge.contentLines.join('\n').trim()
        + '\n\n' + `${'#'.repeat(sec.depth)} ${sec.title}` + '\n' + content;
      const mergedTokens = estimateTokens(mergedContent);

      if (mergedTokens <= TARGET_MAX_TOKENS) {
        // Merge
        pendingMerge.contentLines = mergedContent.split('\n');
        pendingMerge.headings = [...new Set([...pendingMerge.headings, ...sec.headings])];
        continue;
      } else {
        // Flush pending, start fresh
        const pc = pendingMerge.contentLines.join('\n').trim();
        if (pc.length > 0) {
          chunks.push(...finalizeSection(pendingMerge, sectionTitle));
        }
        pendingMerge = null;
      }
    }

    if (tokens < TARGET_MIN_TOKENS && sec.depth > 0) {
      // Too small — hold for merging with next
      pendingMerge = { ...sec, contentLines: [...sec.contentLines] };
      continue;
    }

    chunks.push(...finalizeSection(sec, sectionTitle));
  }

  // Flush any remaining pending
  if (pendingMerge) {
    const pc = pendingMerge.contentLines.join('\n').trim();
    if (pc.length > 0) {
      chunks.push(...finalizeSection(pendingMerge, sectionTitle));
    }
  }

  return chunks;
}

function finalizeSection(sec, sectionTitle) {
  const content = sec.contentLines.join('\n').trim();
  const tokens = estimateTokens(content);

  // If the section is oversized, try to split on code-block boundaries
  if (tokens > HARD_MAX_TOKENS) {
    const subChunks = splitOversizedChunk(sec, sectionTitle);
    if (subChunks.length > 1) return subChunks;
    // If still oversized after split attempt, return as-is with warning logged upstream
  }

  return [{
    depth: sec.depth,
    title: sec.title,
    headings: sec.headings,
    content,
    tokens
  }];
}

/**
 * Split an oversized section by grouping content between code blocks.
 * Strategy: split at logical boundaries — before markers like "Example Request",
 * "Example Response", "**HTTP Request**", or between consecutive code fences.
 * If a single code block is itself oversized (e.g. huge JSON response), split
 * between each code block rather than grouping them.
 */
function splitOversizedChunk(sec, sectionTitle) {
  const lines = sec.contentLines;
  const content = lines.join('\n').trim();

  // Find split points: lines that start a new logical sub-section
  const splitMarkers = /^(\*\*HTTP Request\*\*|>\s*Example\s+(Request|Response)|>\s*Example|>\s*Response|\*\*Request Body\*\*|\*\*Query Parameters\*\*|\*\*Returns\*\*|\*\*Response\*\*)/i;

  // Segment by: (1) logical markers, and (2) each code block boundary (close → next open)
  const segments = [];
  let currentSegment = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Closing fence — include it in current segment
        currentSegment.push(lines[i]);
        inCodeBlock = false;
        // Always split after closing a code fence (more aggressive)
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        continue;
      } else {
        inCodeBlock = true;
      }
    }

    // Split at logical markers (only outside code blocks)
    if (!inCodeBlock && splitMarkers.test(line) && currentSegment.length > 0) {
      segments.push(currentSegment);
      currentSegment = [];
    }

    currentSegment.push(lines[i]);
  }
  if (currentSegment.length > 0) segments.push(currentSegment);

  if (segments.length <= 1) {
    // Can't split meaningfully — check if content has a large table we can split
    const tableChunks = splitOnTableBoundary(sec);
    if (tableChunks.length > 1) return tableChunks;

    return [{
      depth: sec.depth,
      title: sec.title,
      headings: sec.headings,
      content,
      tokens: estimateTokens(content)
    }];
  }

  // Merge segments into chunks that stay under TARGET_MAX_TOKENS
  const result = [];
  let accumLines = [];
  let partNum = 0;

  for (const seg of segments) {
    const combined = [...accumLines, ...seg].join('\n').trim();
    if (estimateTokens(combined) > TARGET_MAX_TOKENS && accumLines.length > 0) {
      partNum++;
      const c = accumLines.join('\n').trim();
      result.push({
        depth: sec.depth,
        title: partNum === 1 ? sec.title : `${sec.title} (part ${partNum})`,
        headings: sec.headings,
        content: c,
        tokens: estimateTokens(c)
      });
      accumLines = [...seg];
    } else {
      accumLines.push(...seg);
    }
  }

  if (accumLines.length > 0) {
    partNum++;
    const c = accumLines.join('\n').trim();
    result.push({
      depth: sec.depth,
      title: partNum === 1 ? sec.title : `${sec.title} (part ${partNum})`,
      headings: sec.headings,
      content: c,
      tokens: estimateTokens(c)
    });
  }

  return result;
}

/**
 * Split a section that contains a large table (many rows).
 * Splits at table row boundaries, keeping the header in each part.
 */
function splitOnTableBoundary(sec) {
  const lines = sec.contentLines;
  // Find table boundaries: header row | separator | data rows
  let tableStart = -1;
  let tableHeaderLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (tableStart === -1) {
        tableStart = i;
        tableHeaderLines = [lines[i]];
        // Next line should be separator
        if (i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s:-]+\|/)) {
          tableHeaderLines.push(lines[i + 1]);
        }
      }
    }
  }

  if (tableStart === -1) return [sec]; // No table found

  // Split: content before table, then table in parts, then content after
  const beforeTable = lines.slice(0, tableStart);
  let tableRows = [];
  let tableEnd = tableStart;
  for (let i = tableStart; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
      tableRows.push(lines[i]);
      tableEnd = i;
    } else if (tableRows.length > 0) {
      break;
    }
  }
  const afterTable = lines.slice(tableEnd + 1);

  // If table is small, don't split
  const fullContent = lines.join('\n').trim();
  if (estimateTokens(fullContent) <= HARD_MAX_TOKENS) return [sec];

  // Split table rows (skip header + separator)
  const dataRows = tableRows.slice(tableHeaderLines.length);
  const rowsPerPart = Math.ceil(dataRows.length / Math.ceil(estimateTokens(tableRows.join('\n')) / TARGET_MAX_TOKENS));

  const results = [];
  let partNum = 0;

  // Before-table content as its own chunk if substantial
  if (beforeTable.join('\n').trim().length > 0) {
    partNum++;
    const c = beforeTable.join('\n').trim();
    results.push({
      depth: sec.depth,
      title: sec.title,
      headings: sec.headings,
      content: c,
      tokens: estimateTokens(c)
    });
  }

  // Table parts
  for (let i = 0; i < dataRows.length; i += rowsPerPart) {
    partNum++;
    const partRows = dataRows.slice(i, i + rowsPerPart);
    const tableChunk = [...tableHeaderLines, ...partRows].join('\n');
    results.push({
      depth: sec.depth,
      title: `${sec.title} (table part ${partNum})`,
      headings: sec.headings,
      content: tableChunk,
      tokens: estimateTokens(tableChunk)
    });
  }

  // After-table content
  if (afterTable.join('\n').trim().length > 0) {
    partNum++;
    const c = afterTable.join('\n').trim();
    results.push({
      depth: sec.depth,
      title: `${sec.title} (part ${partNum})`,
      headings: sec.headings,
      content: c,
      tokens: estimateTokens(c)
    });
  }

  return results.length > 1 ? results : [sec];
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function main() {
  // Ensure build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  const sources = discoverSources();
  if (sources.length === 0) {
    console.error('ERROR: No source files discovered in', INCLUDES_DIR);
    process.exit(1);
  }

  console.log(`Discovered ${sources.length} source file(s)`);

  const allChunks = [];
  const usedIds = new Set();
  let warnings = 0;

  for (const source of sources) {
    const raw = fs.readFileSync(source.includeFile, 'utf8');
    const cleaned = cleanContent(raw);
    const chunks = chunkMarkdown(cleaned, source.section);

    for (const chunk of chunks) {
      // Generate chunk ID
      let id = `${source.page}-${parameterize(chunk.title)}`;
      // Deduplicate IDs
      if (usedIds.has(id)) {
        let suffix = 2;
        while (usedIds.has(`${id}-${suffix}`)) suffix++;
        id = `${id}-${suffix}`;
      }
      usedIds.add(id);

      // Build URL with fragment
      const fragment = chunk.depth > 0 ? `#${parameterize(chunk.title)}` : '';
      const url = `${BASE_URL}/${source.page}.html${fragment}`;

      // Absolutify links in content
      const absoluteContent = absolutifyLinks(chunk.content, BASE_URL);

      // Token check
      if (chunk.tokens > HARD_MAX_TOKENS) {
        console.warn(`  WARN: chunk "${id}" is ~${chunk.tokens} tokens (exceeds ${HARD_MAX_TOKENS})`);
        warnings++;
      }

      allChunks.push({
        id,
        title: chunk.title,
        url,
        section: source.section,
        version: VERSION,
        headings: chunk.headings,
        content: absoluteContent,
        keywords: extractKeywords(chunk.headings, absoluteContent),
        lastUpdated: TODAY,
        _tokens: estimateTokens(absoluteContent)
      });
    }
  }

  // --- Emit docs.jsonl ---
  const jsonlPath = path.join(BUILD_DIR, 'docs.jsonl');
  const jsonlLines = allChunks.map(c => {
    // Strip internal _tokens field from output
    const { _tokens, ...output } = c;
    return JSON.stringify(output);
  });
  fs.writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n', 'utf8');

  // --- Emit docs-index.json ---
  const indexPath = path.join(BUILD_DIR, 'docs-index.json');
  const indexEntries = allChunks.map(c => ({
    id: c.id,
    title: c.title,
    url: c.url,
    keywords: c.keywords,
    summary: extractSummary(c.content),
    headings: c.headings
  }));
  fs.writeFileSync(indexPath, JSON.stringify(indexEntries, null, 2) + '\n', 'utf8');

  // --- Emit llms.txt ---
  const llmsTxtPath = path.join(BUILD_DIR, 'llms.txt');
  const llmsTxt = `# Kill Bill Documentation for AI Systems

Canonical docs:
${BASE_URL}/

LLM corpus:
${BASE_URL}/docs.jsonl

Search index:
${BASE_URL}/docs-index.json

Preferred version:
${VERSION}
`;
  fs.writeFileSync(llmsTxtPath, llmsTxt, 'utf8');

  // --- Summary ---
  const totalTokens = allChunks.reduce((sum, c) => sum + (c._tokens || 0), 0);
  const avgTokens = Math.round(totalTokens / allChunks.length);
  const oversized = allChunks.filter(c => (c._tokens || 0) > HARD_MAX_TOKENS).length;

  console.log('');
  console.log('=== LLM Artifact Generation Complete ===');
  console.log(`  Files processed : ${sources.length}`);
  console.log(`  Chunks generated: ${allChunks.length}`);
  console.log(`  Avg chunk size  : ~${avgTokens} tokens`);
  console.log(`  Oversized chunks: ${oversized}`);
  console.log(`  Warnings        : ${warnings}`);
  console.log(`  Version         : ${VERSION}`);
  console.log(`  Base URL        : ${BASE_URL}`);
  console.log('');
  console.log(`  ${jsonlPath}`);
  console.log(`  ${indexPath}`);
  console.log(`  ${llmsTxtPath}`);

  // --- Validation ---
  let valid = true;

  // Validate JSONL
  const jsonlContent = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
  for (let i = 0; i < jsonlContent.length; i++) {
    try {
      const obj = JSON.parse(jsonlContent[i]);
      if (!obj.id || !obj.title || !obj.url || !obj.content) {
        console.error(`  VALIDATION ERROR: line ${i + 1} missing required fields`);
        valid = false;
      }
    } catch (e) {
      console.error(`  VALIDATION ERROR: line ${i + 1} is not valid JSON: ${e.message}`);
      valid = false;
    }
  }

  // Validate index
  try {
    const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (!Array.isArray(idx) || idx.length !== allChunks.length) {
      console.error('  VALIDATION ERROR: docs-index.json entry count mismatch');
      valid = false;
    }
  } catch (e) {
    console.error(`  VALIDATION ERROR: docs-index.json is not valid JSON: ${e.message}`);
    valid = false;
  }

  if (valid) {
    console.log('\n  ✓ All artifacts validated successfully');
  } else {
    console.error('\n  ✗ Validation failed');
    process.exit(1);
  }
}

main();
