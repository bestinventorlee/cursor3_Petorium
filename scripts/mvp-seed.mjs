#!/usr/bin/env node
/**
 * Petorium MVP 테스트용 시드: 테스트 유저 생성 + 숏폼 업로드
 *
 * 전제:
 * - 영상은 사용·재배포가 허용된 파일 또는 직접 호스팅 URL(예: mp4 직링크)만 사용
 * - 서버 업로드: 기본 길이 제한 없음(최대 100MB). VIDEO_*_DURATION_SECONDS 로 제한 가능
 * - 로컬: npm run dev 후 실행. 프로덕션 배포 시 publicBasePath 를 NEXT_PUBLIC_BASE_PATH 와 동일하게 설정
 *
 * 로컬 폴더 (localMedia): src/pet_shorts 등 — 유저별 업로드 후 파일 삭제 가능
 *
 * 자동 소스 (Pexels): 환경 변수 PEXELS_API_KEY + 설정의 autoMedia 사용 시
 * 검색어로 허용 라이선스 스톡 영상을 받아 15~60초만 골라 업로드합니다.
 * https://www.pexels.com/api/ · https://www.pexels.com/license/
 *
 * 사용법:
 *   npm run mvp-seed -- --config scripts/mvp-seed.config.json
 *
 * 옵션:
 *   --config <path>   설정 JSON (기본: scripts/mvp-seed.config.json)
 *   --dry-run         회원가입/로그인/업로드만 출력, 네트워크 호출 없음
 *   --verbose         응답 로그
 */

import { readFile, readdir, unlink, stat, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve, basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 프로젝트 루트 .env 에서 아직 없는 키만 process.env 에 채움 (외부 의존성 없음) */
async function loadDotenvIfPresent() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const text = await readFile(envPath, "utf8");
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* .env 없음 */
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const out = { config: resolve(__dirname, "mvp-seed.config.json"), dryRun: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config" && argv[i + 1]) {
      out.config = resolve(process.cwd(), argv[++i]);
    } else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--verbose") out.verbose = true;
  }
  return out;
}

/** @param {Map<string,string>} jar @param {Headers} headers */
function mergeSetCookies(jar, headers) {
  const list =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (list.length === 0) {
    const single = headers.get("set-cookie");
    if (single) list.push(single);
  }
  for (const line of list) {
    const first = line.split(";")[0];
    const eq = first.indexOf("=");
    if (eq === -1) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    jar.set(name, value);
  }
}

/** @param {Map<string,string>} jar */
function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function apiPrefix(cfg) {
  const bp = (cfg.publicBasePath || "").replace(/\/$/, "");
  return `${cfg.baseUrl.replace(/\/$/, "")}${bp}`;
}

/** 응답 본문 앞쪽 JSON만 파싱 (뒤에 HTML이 붙는 경우 대비) */
function parseJsonBody(text) {
  const trimmed = String(text).trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const lastBrace = trimmed.lastIndexOf("}");
  if (lastBrace > 0) {
    try {
      return JSON.parse(trimmed.slice(0, lastBrace + 1));
    } catch {
      return null;
    }
  }
  return null;
}

/** API가 HTML(404 페이지)로 응답하면 basePath 불일치 안내 */
function formatApiError(label, status, body, prefix) {
  const isHtml =
    typeof body === "string" &&
    (body.includes("<!DOCTYPE") || body.includes("<html"));
  if (status === 404 && isHtml) {
    const hint =
      body.includes("/petorium/") && !prefix.includes("/petorium")
        ? '\n  → publicBasePath 를 "/petorium" 로 바꿔 보세요. (npm start / 프로덕션 빌드 기본값)'
        : body.includes("/petorium/") === false && prefix.includes("/petorium")
          ? '\n  → publicBasePath 를 "" 로 바꿔 보세요. (npm run dev 로컬 기본값)'
          : '\n  → baseUrl·publicBasePath 가 브라우저 접속 URL과 같은지 확인하세요.';
    return `${label} ${status}: HTML 페이지가 반환됨 (API 경로 불일치)${hint}`;
  }
  return `${label} ${status}: ${String(body).slice(0, 400)}`;
}

/**
 * @param {string} prefix
 * @param {{ cookie: Map<string,string>, verbose: boolean }} opts
 */
async function nextAuthCredentialsSignIn(prefix, email, password, callbackUrl, opts) {
  const jar = opts.cookie;
  const csrfUrl = `${prefix}/api/auth/csrf`;
  const r1 = await fetch(csrfUrl, {
    headers: { Accept: "application/json", Cookie: cookieHeader(jar) },
  });
  mergeSetCookies(jar, r1.headers);
  if (!r1.ok) {
    const t = await r1.text();
    throw new Error(`CSRF 요청 실패 ${r1.status}: ${t.slice(0, 500)}`);
  }
  const { csrfToken } = await r1.json();
  if (!csrfToken) throw new Error("CSRF 토큰을 받지 못했습니다");

  const body = new URLSearchParams({
    csrfToken,
    callbackUrl,
    json: "true",
    email: email.trim().toLowerCase(),
    password,
  });

  const r2 = await fetch(`${prefix}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: body.toString(),
    redirect: "manual",
  });
  mergeSetCookies(jar, r2.headers);

  const text = await r2.text();
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    /* ignore */
  }

  if (opts.verbose) {
    console.log(
      "[verbose] credentials",
      r2.status,
      r2.headers.get("location") || "",
      j?.url || text.slice(0, 120)
    );
  }

  if (j?.url) {
    const u = j.url;
    if (u.includes("error=") || u.includes("csrf=true")) {
      throw new Error(`로그인 실패: ${u}`);
    }
    return;
  }

  if (r2.status === 302 || r2.status === 301) {
    const loc = r2.headers.get("location") || "";
    if (loc.includes("error=") || loc.includes("csrf=true")) {
      throw new Error(`로그인 실패(리다이렉트): ${loc}`);
    }
    return;
  }

  if (!r2.ok) {
    throw new Error(`로그인 실패 HTTP ${r2.status}: ${text.slice(0, 600)}`);
  }
}

/** 로그인 후 세션 쿠키가 유효한지 확인 */
async function verifySession(prefix, jar) {
  const r = await fetch(`${prefix}/api/auth/session`, {
    headers: { Accept: "application/json", Cookie: cookieHeader(jar) },
  });
  const text = await r.text();
  const data = parseJsonBody(text);
  if (!r.ok || !data?.user) {
    throw new Error(
      `세션 확인 실패 (${r.status}). 로그인 쿠키가 업로드 API에 전달되지 않을 수 있습니다.`
    );
  }
  return data.user;
}

async function loadVideoBytes(item, configDir) {
  const filePath = item.absolutePath || item.file;
  if (filePath) {
    const p =
      item.absolutePath ||
      (filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath)
        ? filePath
        : resolve(configDir, filePath));
    return { buf: await readFile(p), fileName: basename(p), path: p };
  }
  if (item.url) {
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`URL 다운로드 실패 ${res.status}: ${item.url}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    let fileName = "video.mp4";
    try {
      const u = new URL(item.url);
      const last = u.pathname.split("/").filter(Boolean).pop();
      if (last && /\.(mp4|webm|mov)$/i.test(last)) fileName = last;
    } catch {
      /* ignore */
    }
    return { buf, fileName };
  }
  throw new Error("items 항목에 file, absolutePath 또는 url 이 필요합니다");
}

/** 파일명에서 업로드 제목 생성 */
function titleFromFileName(fileName) {
  const base = basename(fileName, extname(fileName));
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Pet short").slice(0, 100);
}

const DEFAULT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".mkv", ".m4v"];
/** Petorium 업로드 API 와 동일 (app/api/videos/upload/route.ts) */
function resolveFfprobePath() {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  const plat =
    process.platform === "win32"
      ? "win32"
      : process.platform === "darwin"
        ? "darwin"
        : "linux";
  const arch = process.arch === "x64" || process.arch === "arm64" ? "x64" : process.arch;
  const bin = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
  return join(process.cwd(), "node_modules", "ffprobe-static", "bin", plat, arch, bin);
}

/** @returns {Promise<number|null>} 초 단위 길이 */
function probeDurationSeconds(filePath) {
  const ffprobe = resolveFfprobePath();
  if (!existsSync(ffprobe)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const proc = spawn(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        filePath,
      ],
      { windowsHide: true }
    );
    let out = "";
    proc.stdout?.on("data", (d) => {
      out += d;
    });
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code !== 0) return resolve(null);
      try {
        const j = JSON.parse(out);
        const sec = parseFloat(j.format?.duration);
        resolve(Number.isFinite(sec) ? sec : null);
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * 길이 규칙에 맞지 않는 파일을 격리 폴더로 이동 (재시도 시 같은 실패 방지)
 */
async function quarantineInvalidFile(filePath, quarantineDir, reason) {
  if (!filePath || !existsSync(filePath)) return;
  await mkdir(quarantineDir, { recursive: true });
  const dest = join(quarantineDir, basename(filePath));
  let finalDest = dest;
  if (existsSync(finalDest)) {
    finalDest = join(
      quarantineDir,
      `${Date.now()}_${basename(filePath)}`
    );
  }
  await rename(filePath, finalDest);
  console.log(`  → 격리: ${basename(finalDest)} (${reason})`);
}

/**
 * localMedia.directory 에 있는 영상을 큐로 만듦 (유저별 고유 할당용)
 * @param {object} cfg
 * @param {number} totalNeeded
 * @param {{ dryRun: boolean, verbose: boolean }} args
 */
async function buildQueueFromLocalDirectory(cfg, totalNeeded, args) {
  const lm = cfg.localMedia || {};
  const dirRel = lm.directory || "src/pet_shorts";
  const dir = resolve(process.cwd(), dirRel);
  const exts = (
    Array.isArray(lm.extensions) && lm.extensions.length > 0
      ? lm.extensions
      : DEFAULT_VIDEO_EXTENSIONS
  ).map((e) => e.toLowerCase());
  const deleteAfter = lm.deleteAfterUpload !== false;
  const shuffle = lm.shuffle !== false;
  const minDur = lm.minDuration != null ? Number(lm.minDuration) : 0;
  const maxDur = lm.maxDuration != null ? Number(lm.maxDuration) : 0;
  const filterDuration =
    lm.filterByDuration === true && (minDur > 0 || maxDur > 0);
  const quarantineDir = resolve(
    process.cwd(),
    lm.quarantineDirectory || join(dirRel, "_rejected")
  );

  let names;
  try {
    names = await readdir(dir);
  } catch (e) {
    console.error(`로컬 폴더를 읽을 수 없습니다: ${dir}`);
    console.error(e.message);
    process.exit(1);
  }

  const skipNames = new Set(
    (lm.skipFileNames || ["download_log.json", ".gitkeep"]).map(String)
  );

  const candidates = [];
  for (const name of names) {
    if (skipNames.has(name)) continue;
    const ext = extname(name).toLowerCase();
    if (!exts.includes(ext)) continue;
    const absolutePath = join(dir, name);
    try {
      const st = await stat(absolutePath);
      if (!st.isFile()) continue;
      candidates.push({ name, absolutePath, mtime: st.mtimeMs });
    } catch {
      /* ignore */
    }
  }

  candidates.sort((a, b) => a.mtime - b.mtime);
  if (shuffle) shuffleInPlace(candidates);

  if (candidates.length === 0) {
    console.error(`업로드할 영상이 없습니다: ${dir}`);
    process.exit(1);
  }

  const queue = [];
  let skippedDuration = 0;
  const hasFfprobe = existsSync(resolveFfprobePath());

  if (filterDuration && !hasFfprobe) {
    console.warn(
      "경고: ffprobe 를 찾을 수 없어 길이 사전 검사를 건너뜁니다. (npm install 후 node_modules/ffprobe-static 확인)"
    );
  }

  for (const { name, absolutePath } of candidates) {
    if (filterDuration && hasFfprobe) {
      const dur = await probeDurationSeconds(absolutePath);
      if (dur != null) {
        if (minDur > 0 && dur < minDur) {
          skippedDuration++;
          await quarantineInvalidFile(
            absolutePath,
            quarantineDir,
            `${dur.toFixed(1)}s < ${minDur}s`
          );
          continue;
        }
        if (maxDur > 0 && dur > maxDur) {
          skippedDuration++;
          await quarantineInvalidFile(
            absolutePath,
            quarantineDir,
            `${dur.toFixed(1)}s > ${maxDur}s`
          );
          continue;
        }
      }
    }

    queue.push({
      absolutePath,
      file: absolutePath,
      title: titleFromFileName(name),
      description: lm.descriptionPrefix
        ? String(lm.descriptionPrefix).slice(0, 500)
        : "MVP 시드 · 로컬 pet_shorts",
      deleteAfterUpload: deleteAfter,
      quarantineDir,
    });
  }

  console.log(
    `로컬 폴더: ${dir} · 업로드 대상 ${queue.length}개` +
      (skippedDuration
        ? ` · 길이 부적합 ${skippedDuration}개 → ${quarantineDir}`
        : "") +
      (filterDuration && hasFfprobe
        ? ` · 허용 길이 ${minDur}~${maxDur}초`
        : "") +
      (deleteAfter ? " · 성공 시 삭제" : "")
  );

  if (queue.length === 0) {
    console.error(
      filterDuration
        ? `업로드 가능한 영상이 없습니다 (${minDur}~${maxDur}초). _rejected 폴더를 확인하세요.`
        : "업로드 가능한 영상이 없습니다."
    );
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(`[dry-run] 상위 ${Math.min(5, queue.length)}개:`);
    queue.slice(0, 5).forEach((q, i) => console.log(`  ${i + 1}. ${basename(q.absolutePath)}`));
  }

  if (queue.length < totalNeeded) {
    console.warn(
      `경고: 폴더에 ${queue.length}개, 필요 ${totalNeeded}개 — 있는 만큼만 유저에 나눠 올립니다.`
    );
  }

  return queue;
}

/**
 * Pexels video_files 에서 용량 부담을 줄이기 위해 비교적 작은 mp4 링크 선택
 * @param {Array<{ file_type?: string, quality?: string, width?: number, link?: string }>} videoFiles
 */
function pickPexelsMp4File(videoFiles) {
  const mp4 = (videoFiles || []).filter(
    (f) => f && f.file_type === "video/mp4" && f.link
  );
  if (mp4.length === 0) return null;
  mp4.sort((a, b) => (a.width || 99999) - (b.width || 99999));
  const sd = mp4.find((f) => f.quality === "sd");
  return sd || mp4[0];
}

/**
 * @param {string} apiKey
 * @param {string} query
 * @param {number} page
 * @param {number} perPage
 */
async function pexelsVideoSearch(apiKey, query, page, perPage) {
  const u = new URL("https://api.pexels.com/videos/search");
  u.searchParams.set("query", query);
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("page", String(page));
  const r = await fetch(u, {
    headers: { Authorization: apiKey },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Pexels 검색 실패 ${r.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

async function pexelsVideoPopular(apiKey, page, perPage) {
  const u = new URL("https://api.pexels.com/videos/popular");
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("page", String(page));
  const r = await fetch(u, {
    headers: { Authorization: apiKey },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Pexels popular 실패 ${r.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

/** Fisher–Yates */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {object} video
 * @param {string} label
 * @param {Set<number>} seen
 * @param {number} minDur
 * @param {number} maxDur
 */
function tryAddPexelsVideo(video, label, seen, minDur, maxDur) {
  const id = video.id;
  if (seen.has(id)) return null;
  const dur = Number(video.duration);
  if (minDur > 0 && dur < minDur) return null;
  if (maxDur > 0 && dur > maxDur) return null;
  const file = pickPexelsMp4File(video.video_files);
  if (!file?.link) return null;
  seen.add(id);
  const photoUrl = video.url || `https://www.pexels.com/video/video-${id}/`;
  const userName = video.user?.name || "Pexels";
  return {
    url: file.link,
    title: `Pet short · ${label} · ${id}`.slice(0, 100),
    description: `MVP 시드 · Pexels · ${userName} · ${photoUrl}`.slice(0, 500),
  };
}

/**
 * @param {object} cfg 전체 설정
 * @param {number} totalNeeded userCount * videosPerUser
 * @param {{ dryRun: boolean, verbose: boolean }} args
 */
async function buildQueueFromPexels(cfg, totalNeeded, args) {
  const am = cfg.autoMedia || {};
  const queries = Array.isArray(am.queries) ? am.queries.filter(Boolean) : [];
  if (queries.length === 0) {
    console.error(
      "autoMedia.queries 에 검색어를 1개 이상 넣으세요. (예: cat, dog)"
    );
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(
      `[dry-run] Pexels 자동 수집 예정: queries=${queries.join(", ")} · 약 ${totalNeeded}개 (API 키 불필요)`
    );
    return Array.from({ length: Math.min(3, totalNeeded) }, (_, i) => ({
      url: "https://invalid/dry-run",
      title: `dry-${i}`,
      description: "",
    }));
  }

  const envName = am.apiKeyEnv || "PEXELS_API_KEY";
  const apiKey = process.env[envName];
  if (!apiKey || !String(apiKey).trim()) {
    console.error(
      `Pexels 자동 수집을 쓰려면 환경 변수 ${envName} 를 설정하세요. (https://www.pexels.com/api/)`
    );
    process.exit(1);
  }

  const minDur = am.minDuration != null ? Number(am.minDuration) : 0;
  const maxDur = am.maxDuration != null ? Number(am.maxDuration) : 0;
  const perPage =
    am.perQueryPageSize != null ? Number(am.perQueryPageSize) : 15;
  const maxPages =
    am.maxPagesPerQuery != null ? Number(am.maxPagesPerQuery) : 25;
  const apiDelay =
    am.betweenApiDelayMs != null ? Number(am.betweenApiDelayMs) : 1200;
  const extra = Math.min(50, Math.ceil(totalNeeded * 0.3));
  const target = totalNeeded + extra;
  const usePopular = am.usePopularFeed !== false;
  const shuffleQueue = am.shuffleQueue !== false;

  /** @type {Array<{ url: string, title: string, description: string }>} */
  const queue = [];
  const seen = new Set();
  /** @type {Record<string, number>} */
  const pageByQuery = Object.fromEntries(queries.map((q) => [q, 1]));
  let popularPage = 1;
  const maxPopularPages =
    am.maxPopularPages != null ? Number(am.maxPopularPages) : maxPages;

  let firstFetch = true;
  let iterations = 0;
  const maxIterations =
    maxPages * queries.length + maxPopularPages + 100;

  while (queue.length < target && iterations < maxIterations) {
    iterations++;

    if (usePopular && popularPage <= maxPopularPages) {
      if (!firstFetch && apiDelay > 0) await sleep(apiDelay);
      firstFetch = false;
      try {
        const data = await pexelsVideoPopular(apiKey, popularPage, perPage);
        popularPage++;
        for (const video of data.videos || []) {
          if (queue.length >= target) break;
          const item = tryAddPexelsVideo(video, "popular", seen, minDur, maxDur);
          if (item) queue.push(item);
        }
        if (args.verbose) {
          console.log(
            `[verbose] Pexels popular p${popularPage - 1} → 큐 ${queue.length}/${target}`
          );
        }
      } catch (e) {
        console.error(`Pexels popular 오류:`, e.message);
        popularPage++;
      }
    }

    for (const query of queries) {
      if (queue.length >= target) break;
      const page = pageByQuery[query];
      if (page > maxPages) continue;

      if (!firstFetch && apiDelay > 0) await sleep(apiDelay);
      firstFetch = false;

      let data;
      try {
        data = await pexelsVideoSearch(apiKey, query, page, perPage);
      } catch (e) {
        console.error(`Pexels 검색 오류 (${query} p${page}):`, e.message);
        pageByQuery[query] = page + 1;
        continue;
      }

      const videos = data.videos || [];
      pageByQuery[query] = page + 1;

      for (const video of videos) {
        if (queue.length >= target) break;
        const item = tryAddPexelsVideo(video, query, seen, minDur, maxDur);
        if (item) queue.push(item);
      }

      if (args.verbose) {
        console.log(
          `[verbose] Pexels "${query}" page ${page} → 큐 ${queue.length}/${target}`
        );
      }
    }

    const searchDone = queries.every((q) => pageByQuery[q] > maxPages);
    const popularDone = !usePopular || popularPage > maxPopularPages;
    if (searchDone && popularDone) break;
  }

  if (shuffleQueue) shuffleInPlace(queue);

  if (queue.length < totalNeeded) {
    console.warn(
      `경고: 필요 ${totalNeeded}개 중 ${queue.length}개만 수집했습니다. 검색어·길이(${minDur}~${maxDur}s)를 늘리거나 maxPagesPerQuery 를 키워 보세요.`
    );
  }

  return queue.length >= totalNeeded
    ? queue.slice(0, totalNeeded)
    : queue;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadDotenvIfPresent();
  let rawJson;
  try {
    rawJson = await readFile(args.config, "utf8");
  } catch (e) {
    console.error(`설정 파일을 읽을 수 없습니다: ${args.config}`);
    console.error("예시를 복사하세요: copy scripts\\mvp-seed.config.example.json scripts\\mvp-seed.config.json");
    process.exit(1);
  }

  const cfg = JSON.parse(rawJson);
  const configDir = dirname(args.config);
  const prefix = apiPrefix(cfg);

  const userCount = Number(cfg.userCount) || 10;
  const videosPerUser = Number(cfg.videosPerUser) || 20;
  const password = String(cfg.password || "");
  if (password.length < 6) {
    console.error("password 는 6자 이상이어야 합니다 (register 스키마).");
    process.exit(1);
  }

  const emailPrefix = cfg.emailLocalPartPrefix || "petmvp";
  const emailDomain = cfg.emailDomain || "mvp-seed.test";
  const usernamePrefix = cfg.usernamePrefix || "petmvp";
  const regDelay =
    cfg.registerDelayMs != null ? Number(cfg.registerDelayMs) : 25000;
  const upDelay =
    cfg.uploadDelayMs != null ? Number(cfg.uploadDelayMs) : 14000;
  const skipExisting = cfg.skipExistingUsers !== false;
  /** @type {Array<{file?:string,url?:string,title?:string,description?:string}>} */
  let items = Array.isArray(cfg.items) ? cfg.items : [];
  items = items.filter((x) => x && (x.file || x.url));

  const totalSlots = userCount * videosPerUser;
  const uniquePerUser = cfg.uniqueVideosPerUser !== false;
  const useLocal = Boolean(cfg.localMedia?.directory);
  const usePexels = !useLocal && cfg.autoMedia?.provider === "pexels";

  if (useLocal) {
    items = await buildQueueFromLocalDirectory(cfg, totalSlots, args);
  } else if (usePexels) {
    items = await buildQueueFromPexels(cfg, totalSlots, args);
  }

  if (uniquePerUser && items.length < totalSlots) {
    console.warn(
      `경고: 고유 클립 ${items.length}개 < 필요 ${totalSlots}개 — 일부 유저는 영상이 부족할 수 있습니다.` +
        (usePexels ? " queries·maxPagesPerQuery 를 늘리세요." : " pet_shorts 에 영상을 더 넣으세요.")
    );
  }

  if (items.length === 0) {
    console.error(
      "업로드할 소스가 없습니다. localMedia.directory, autoMedia(Pexels), 또는 items 에 file/url 을 설정하세요."
    );
    process.exit(1);
  }

  const callbackUrl = prefix;

  console.log(`API base: ${prefix}`);
  console.log(
    `유저 ${userCount}명 × 영상 ${videosPerUser}개 · 소스 큐 ${items.length}개` +
      (useLocal
        ? " (로컬 pet_shorts)"
        : usePexels
          ? " (Pexels 자동 수집)"
          : " (수동 items)") +
      (uniquePerUser ? " · 유저별 서로 다른 클립" : " · 클립 순환(중복 가능)")
  );
  if (args.dryRun) {
    console.log("--dry-run: 종료");
    return;
  }

  for (let i = 1; i <= userCount; i++) {
    const email = `${emailPrefix}${String(i).padStart(2, "0")}@${emailDomain}`;
    const username = `${usernamePrefix}${String(i).padStart(2, "0")}`;
    const name = `MVP Seed ${String(i).padStart(2, "0")}`;

    const cookieJar = new Map();

    if (i > 1 && regDelay > 0) await sleep(regDelay);

    const regRes = await fetch(`${prefix}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        username,
        name,
        password,
      }),
    });
    const regText = await regRes.text();
    let regJson = null;
    try {
      regJson = JSON.parse(regText);
    } catch {
      /* ignore */
    }

    if (regRes.status === 201) {
      console.log(`가입 OK: ${email} (${username})`);
    } else if (regRes.status === 400 && skipExisting && regJson?.error?.includes("이미")) {
      console.log(`가입 스킵(이미 있음): ${email}`);
    } else if (!regRes.ok) {
      console.error(formatApiError("가입 실패", regRes.status, regText, prefix));
      continue;
    }

    try {
      await nextAuthCredentialsSignIn(prefix, email, password, callbackUrl, {
        cookie: cookieJar,
        verbose: args.verbose,
      });
      const sessionUser = await verifySession(prefix, cookieJar);
      console.log(`로그인 OK: ${sessionUser.email || email}`);
    } catch (e) {
      console.error(`로그인 실패 ${email}:`, e.message);
      continue;
    }

    const userOffset = (i - 1) * videosPerUser;
    const userItems = uniquePerUser
      ? items.slice(userOffset, userOffset + videosPerUser)
      : null;

    console.log(
      `업로드 시작: ${username} (${videosPerUser}개` +
        (uniquePerUser
          ? `, 클립 #${userOffset + 1}~${userOffset + userItems.length}`
          : "") +
        ")"
    );

    for (let v = 0; v < videosPerUser; v++) {
      if (v > 0 && upDelay > 0) await sleep(upDelay);
      const item = uniquePerUser ? userItems[v] : items[v % items.length];
      if (!item) {
        console.error(`  [${v + 1}] 할당된 클립 없음 (큐 부족)`);
        continue;
      }
      let buf;
      let fileName;
      let sourcePath;
      try {
        ({ buf, fileName, path: sourcePath } = await loadVideoBytes(item, configDir));
      } catch (e) {
        console.error(`  [${v + 1}] 소스 로드 실패:`, e.message);
        continue;
      }

      const maxSz = 100 * 1024 * 1024;
      if (buf.length > maxSz) {
        console.error(
          `  [${v + 1}] 파일이 ${Math.round(buf.length / 1024 / 1024)}MB 로 100MB 제한 초과, 스킵`
        );
        continue;
      }

      const title =
        (item.title && String(item.title).trim()) ||
        `MVP ${username} #${v + 1}`;
      const description = item.description ? String(item.description) : "";

      const blob = new Blob([buf], { type: "video/mp4" });
      const form = new FormData();
      form.set("video", blob, fileName);
      form.set("title", title.slice(0, 100));
      if (description) form.set("description", description.slice(0, 500));

      const upRes = await fetch(`${prefix}/api/videos/upload`, {
        method: "POST",
        headers: { Cookie: cookieHeader(cookieJar) },
        body: form,
      });
      const upText = await upRes.text();
      const upJson = parseJsonBody(upText);
      if (args.verbose) {
        console.log(
          "[verbose] upload",
          upRes.status,
          upRes.headers.get("content-type"),
          (upJson?.videoId || upText).toString().slice(0, 120)
        );
      }

      if (!upRes.ok) {
        console.error(
          formatApiError(`  [${v + 1}] 업로드 실패`, upRes.status, upText, prefix)
        );
        continue;
      }

      const vid = upJson?.videoId || upJson?.video?.id;
      const uploadOk =
        (vid && /^[a-z0-9]+$/i.test(String(vid))) ||
        (upJson && !upText.includes("<!DOCTYPE") && !upText.includes("<html"));

      if (vid && /^[a-z0-9]+$/i.test(String(vid))) {
        console.log(`  [${v + 1}] OK videoId=${vid}`);
      } else if (upText.includes("<!DOCTYPE") || upText.includes("<html")) {
        console.error(
          `  [${v + 1}] HTTP ${upRes.status} 이지만 HTML 응답 — 업로드 실패로 간주`
        );
        continue;
      } else if (upJson) {
        console.log(`  [${v + 1}] OK (videoId 없음, processing 중일 수 있음)`);
      } else {
        console.error(
          `  [${v + 1}] 비JSON 응답 (${upRes.status}): ${upText.slice(0, 200)}`
        );
        continue;
      }

      const toDelete = item.deleteAfterUpload && (item.absolutePath || sourcePath);
      if (uploadOk && toDelete) {
        try {
          await unlink(toDelete);
          console.log(`  [${v + 1}] 삭제됨: ${basename(toDelete)}`);
        } catch (e) {
          console.error(`  [${v + 1}] 파일 삭제 실패: ${e.message}`);
        }
      }
    }
  }

  console.log("완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
