// ============================================================================
// ZK 私密资质通行证 —— Node + Express 后端
// ============================================================================
//
// 职责（严格遵守 task3.md 约束）：
// - 把前端请求翻译成真实的 `leo run <function> <inputs>` 命令并执行。
// - 真实回显 leo run 的 stdout / stderr，绝不做任何 JS 业务计算（不伪造结果）。
// - assert 失败（leo 进程非零退出）按"未通过/校验失败"处理，返回 200 + ok:false，
//   而不是 500，让前端可以区分"达标/未达标/非本人"。
//
// 接口：
//   GET  /health         探活 + 检查 leo 可执行、Leo 项目路径是否就绪
//   POST /api/issue      { owner, score }            -> leo run issue_credential
//   POST /api/verify     { credential, threshold }   -> leo run verify_threshold
//
// 统一返回体：{ ok, stdout, result, stderr, ...meta }
// ============================================================================

const express = require("express");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const app = express();
app.use(express.json({ limit: "1mb" }));

// 允许前端（file:// 或任意端口静态页）跨域访问本地后端。
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---------------------------------------------------------------------------
// 配置：Leo 程序目录 + leo 可执行文件路径
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;

// credential_pass/ 相对本文件位于 ../credential_pass
const PROGRAM_DIR =
  process.env.ALEO_PROGRAM_PATH ||
  path.resolve(__dirname, "..", "credential_pass");

// leo 二进制：优先环境变量，其次常见安装位置，最后回退到 PATH 中的 "leo"。
function resolveLeoBin() {
  if (process.env.LEO_BIN && fs.existsSync(process.env.LEO_BIN)) {
    return process.env.LEO_BIN;
  }
  const candidates = [
    path.join(os.homedir(), ".local", "bin", "leo"),
    path.join(os.homedir(), ".cargo", "bin", "leo"),
    "/opt/homebrew/bin/leo",
    "/usr/local/bin/leo",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "leo";
}
const LEO_BIN = resolveLeoBin();

const LEO_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// 调用 leo run 的通用封装
// ---------------------------------------------------------------------------
function runLeo(args) {
  return new Promise((resolve) => {
    execFile(
      LEO_BIN,
      args,
      {
        cwd: PROGRAM_DIR,
        timeout: LEO_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 16,
        // 保证子进程能找到 leo 及其依赖。
        env: {
          ...process.env,
          PATH: `${path.join(os.homedir(), ".local", "bin")}:${
            process.env.PATH || ""
          }`,
        },
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error ? (error.code ?? 1) : 0,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      }
    );
  });
}

// 从 leo run 的 stdout 中提取 "➡️  Output(s)" 之后的真实输出块作为 result。
function extractResult(stdout) {
  const marker = stdout.indexOf("➡️");
  if (marker === -1) return "";
  let block = stdout.slice(marker);
  // 去掉首行的 "➡️  Output" / "➡️  Outputs" 标题行。
  const firstNewline = block.indexOf("\n");
  if (firstNewline !== -1) block = block.slice(firstNewline + 1);
  return block.trim();
}

// 把 leo 的失败原因归类，便于前端给出贴合场景的文案。
function classifyFailure(stderr) {
  const s = stderr || "";
  if (/must belong to the signer/i.test(s)) {
    return { reason: "not_owner", message: "无权使用该凭证（非持有者）" };
  }
  if (/assert/i.test(s) || /is not equal/i.test(s) || /failed/i.test(s)) {
    return { reason: "assert_failed", message: "断言未通过（未达标 / 校验失败）" };
  }
  return { reason: "error", message: "Leo 执行出错" };
}

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get("/health", async (req, res) => {
  const programJsonExists = fs.existsSync(
    path.join(PROGRAM_DIR, "program.json")
  );
  const mainLeoExists = fs.existsSync(
    path.join(PROGRAM_DIR, "src", "main.leo")
  );

  const versionRun = await runLeo(["--version"]);
  const leoOk = versionRun.exitCode === 0;

  res.json({
    ok: leoOk && programJsonExists && mainLeoExists,
    leoBin: LEO_BIN,
    leoVersion: (versionRun.stdout || versionRun.stderr).trim(),
    programDir: PROGRAM_DIR,
    programJsonExists,
    mainLeoExists,
    mode: "local · leo run（真实零知识执行，无 JS 模拟）",
  });
});

// ---------------------------------------------------------------------------
// POST /api/issue  { owner, score }
//   -> leo run issue_credential <owner> <score>u32
// ---------------------------------------------------------------------------
app.post("/api/issue", async (req, res) => {
  const { owner, score } = req.body || {};

  if (typeof owner !== "string" || !owner.startsWith("aleo1")) {
    return res
      .status(400)
      .json({ ok: false, error: "owner 必须是合法的 aleo1 地址" });
  }
  const scoreNum = Number(score);
  if (!Number.isInteger(scoreNum) || scoreNum <= 0) {
    return res
      .status(400)
      .json({ ok: false, error: "score 必须是正整数" });
  }

  const args = ["run", "issue_credential", owner, `${scoreNum}u32`];
  const { exitCode, stdout, stderr } = await runLeo(args);

  if (exitCode !== 0) {
    const fail = classifyFailure(stderr);
    return res.json({
      ok: false,
      command: `leo ${args.join(" ")}`,
      ...fail,
      stdout,
      result: extractResult(stdout),
      stderr,
    });
  }

  return res.json({
    ok: true,
    command: `leo ${args.join(" ")}`,
    stdout,
    result: extractResult(stdout),
    stderr,
  });
});

// ---------------------------------------------------------------------------
// POST /api/verify  { credential, threshold }
//   -> leo run verify_threshold "<credential record>" <threshold>u32
// ---------------------------------------------------------------------------
app.post("/api/verify", async (req, res) => {
  const { credential, threshold } = req.body || {};

  if (typeof credential !== "string" || credential.trim().length === 0) {
    return res
      .status(400)
      .json({ ok: false, error: "credential 不能为空（请粘贴签发得到的 record）" });
  }
  const thNum = Number(threshold);
  if (!Number.isInteger(thNum) || thNum <= 0) {
    return res
      .status(400)
      .json({ ok: false, error: "threshold 必须是正整数" });
  }

  const args = [
    "run",
    "verify_threshold",
    credential.trim(),
    `${thNum}u32`,
  ];
  const { exitCode, stdout, stderr } = await runLeo(args);

  if (exitCode !== 0) {
    // assert 失败 / 非本人 → 当作"未通过"处理（200 + ok:false），不是 500。
    const fail = classifyFailure(stderr);
    return res.json({
      ok: false,
      passed: false,
      command: `leo ${args.join(" ")}`,
      ...fail,
      stdout,
      result: extractResult(stdout),
      stderr,
    });
  }

  return res.json({
    ok: true,
    passed: true,
    command: `leo ${args.join(" ")}`,
    stdout,
    result: extractResult(stdout),
    stderr,
  });
});

app.listen(PORT, () => {
  console.log(`[credential_pass] backend listening on http://localhost:${PORT}`);
  console.log(`  leo binary : ${LEO_BIN}`);
  console.log(`  program dir: ${PROGRAM_DIR}`);
});
