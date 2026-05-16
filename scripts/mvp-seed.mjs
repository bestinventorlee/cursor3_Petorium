#!/usr/bin/env node
/**
 * Petorium MVP 테스트용 시드: 테스트 유저 생성 + 숏폼 업로드
 *
 * 전제:
 * - 영상은 사용·재배포가 허용된 파일 또는 직접 호스팅 URL(예: mp4 직링크)만 사용
 * - 서버 업로드 규칙: 길이 15~60초, 최대 100MB (app/api/videos/upload/route.ts)
 * - 로컬: npm run dev 후 실행. 프로덕션 배포 시 publicBasePath 를 NEXT_PUBLIC_BASE_PATH 와 동일하게 설정
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

import { readFile } from "node:fs/promises";
import { dirname, resolve, basename } from "node:path";
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

async function loadVideoBytes(item, configDir) {
  if (item.file) {
    const p = resolve(configDir, item.file);
    return { buf: await readFile(p), fileName: basename(p) };
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
  throw new Error("items 항목에 file 또는 url 이 필요합니다");
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

  const minDur = am.minDuration != null ? Number(am.minDuration) : 15;
  const maxDur = am.maxDuration != null ? Number(am.maxDuration) : 60;
  const perPage =
    am.perQueryPageSize != null ? Number(am.perQueryPageSize) : 15;
  const maxPages =
    am.maxPagesPerQuery != null ? Number(am.maxPagesPerQuery) : 25;
  const apiDelay =
    am.betweenApiDelayMs != null ? Number(am.betweenApiDelayMs) : 1200;
  const extra = Math.min(30, Math.ceil(totalNeeded * 0.25));
  const target = totalNeeded + extra;

  /** @type {Array<{ url: string, title: string, description: string }>} */
  const queue = [];
  const seen = new Set();
  /** @type {Record<string, number>} */
  const pageByQuery = Object.fromEntries(queries.map((q) => [q, 1]));

  let firstFetch = true;
  let iterations = 0;
  const maxIterations = maxPages * queries.length + 100;

  while (queue.length < target && iterations < maxIterations) {
    iterations++;
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

      if (videos.length === 0) continue;

      for (const video of videos) {
        if (queue.length >= target) break;
        const id = video.id;
        if (seen.has(id)) continue;
        const dur = Number(video.duration);
        if (dur < minDur || dur > maxDur) continue;
        const file = pickPexelsMp4File(video.video_files);
        if (!file?.link) continue;
        seen.add(id);
        const photoUrl =
          video.url || `https://www.pexels.com/video/video-${id}/`;
        const userName = video.user?.name || "Pexels";
        queue.push({
          url: file.link,
          title: `Pet short · ${query} · ${id}`.slice(0, 100),
          description:
            `MVP 시드 · Pexels · ${userName} · ${photoUrl}`.slice(0, 500),
        });
      }

      if (args.verbose) {
        console.log(
          `[verbose] Pexels "${query}" page ${page} → 큐 ${queue.length}/${target}`
        );
      }
    }

    if (queries.every((q) => pageByQuery[q] > maxPages)) break;
  }

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
  const usePexels = cfg.autoMedia?.provider === "pexels";

  if (usePexels) {
    items = await buildQueueFromPexels(cfg, totalSlots, args);
  }

  if (items.length === 0) {
    console.error(
      "업로드할 소스가 없습니다. autoMedia(Pexels)를 쓰거나 cfg.items 에 file/url 을 넣으세요."
    );
    process.exit(1);
  }

  const callbackUrl = prefix;

  console.log(`API base: ${prefix}`);
  console.log(
    `유저 ${userCount}명 × 영상 ${videosPerUser}개 · 소스 큐 ${items.length}개` +
      (usePexels ? " (Pexels 자동 수집)" : " (수동 items)")
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
      console.error(`가입 실패 ${regRes.status}: ${regText.slice(0, 400)}`);
      continue;
    }

    try {
      await nextAuthCredentialsSignIn(prefix, email, password, callbackUrl, {
        cookie: cookieJar,
        verbose: args.verbose,
      });
    } catch (e) {
      console.error(`로그인 실패 ${email}:`, e.message);
      continue;
    }

    console.log(`업로드 시작: ${username} (${videosPerUser}개)`);

    for (let v = 0; v < videosPerUser; v++) {
      if (v > 0 && upDelay > 0) await sleep(upDelay);
      const item = items[v % items.length];
      let buf;
      let fileName;
      try {
        ({ buf, fileName } = await loadVideoBytes(item, configDir));
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
      if (args.verbose) console.log("[verbose] upload", upRes.status, upText.slice(0, 200));

      if (!upRes.ok) {
        console.error(`  [${v + 1}] 업로드 실패 ${upRes.status}: ${upText.slice(0, 400)}`);
        continue;
      }
      try {
        const uj = JSON.parse(upText);
        console.log(`  [${v + 1}] OK videoId=${uj.videoId || uj.video?.id || "?"}`);
      } catch {
        console.log(`  [${v + 1}] OK`);
      }
    }
  }

  console.log("완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
