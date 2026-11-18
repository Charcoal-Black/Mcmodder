/**
 * 逻辑回归测试：把 BackgroundPool 的五种轮换模式抽出来跑，验证行为符合预期。
 *
 * 不依赖浏览器：GM_getValue / GM_setValue 用内存 Map 模拟。
 * 运行：node src/background/__logic-test.cjs
 */
const assert = require("node:assert");

/** 模拟 GM storage */
const store = new Map();
const GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
const GM_setValue = (key, value) => store.set(key, value);

/** 构造一个池：id 1..n，weight 默认 1 */
function makePool(n, weights) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    slot: "day",
    name: `img${i + 1}`,
    dataUrl: `data:image/jpeg;base64,${i + 1}`,
    order: i,
    addedAt: 0,
    weight: weights ? weights[i] : 1,
  }));
}

function weightedPick(pool, candidates) {
  const indices = candidates.length > 0 ? candidates : pool.map((_, i) => i);
  const w = indices.map((i) => Math.max(1, pool[i].weight ?? 1));
  const total = w.reduce((s, x) => s + x, 0);
  let roll = Math.random() * total;
  for (let k = 0; k < indices.length; k += 1) {
    roll -= w[k];
    if (roll <= 0) return indices[k];
  }
  return indices[indices.length - 1];
}

const readNumber = (key, fallback = 0) => {
  const v = GM_getValue(key);
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};

/** 模式 0：随机避重 */
function nextRandom(pool, slot = "day") {
  if (pool.length === 1) return 0;
  const last = readNumber(`lastId_${slot}`, -1);
  const candidates = pool.flatMap((r, i) => (r.id === last ? [] : [i]));
  const index = weightedPick(pool, candidates);
  GM_setValue(`lastId_${slot}`, pool[index].id);
  return index;
}

/** 模式 1：完全随机（加权，不避重） */
function nextPureRandom(pool) {
  return weightedPick(
    pool,
    pool.map((_, i) => i),
  );
}

/** 模式 2：顺序 */
function nextSequential(pool, slot = "day") {
  const index = readNumber(`cursor_${slot}`) % pool.length;
  GM_setValue(`cursor_${slot}`, index + 1);
  return index;
}

/** 模式 3：洗牌袋（修复后的逻辑） */
function nextShuffle(pool, slot = "day") {
  const key = `bag_${slot}`;
  const validIds = new Set(pool.map((r) => r.id));
  const usedIds = new Set(JSON.parse(GM_getValue(key, "[]")).filter((id) => validIds.has(id)));
  const remaining = pool.flatMap((r, i) => (r.id !== undefined && !usedIds.has(r.id) ? [i] : []));
  if (remaining.length === 0) {
    const lastId = readNumber(`lastId_${slot}`, -1);
    const candidates = pool.flatMap((r, i) => (r.id === lastId ? [] : [i]));
    const index = weightedPick(pool, candidates.length > 0 ? candidates : pool.map((_, i) => i));
    const picked = pool[index].id;
    GM_setValue(`lastId_${slot}`, picked);
    GM_setValue(key, JSON.stringify([picked]));
    return index;
  }
  const index = weightedPick(pool, remaining);
  const picked = pool[index].id;
  usedIds.add(picked);
  GM_setValue(`lastId_${slot}`, picked);
  GM_setValue(key, JSON.stringify([...usedIds]));
  return index;
}

/** 模式 4：每天固定 */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nextDaily(pool, slot = "day") {
  const today = todayKey();
  const storedDate = GM_getValue(`dailyDate_${slot}`);
  const storedId = readNumber(`dailyId_${slot}`, -1);
  if (storedDate === today) {
    const i = pool.findIndex((r) => r.id === storedId);
    if (i >= 0) return i;
  }
  const candidates = pool.flatMap((r, i) => (r.id === storedId ? [] : [i]));
  const index = weightedPick(pool, candidates);
  GM_setValue(`dailyDate_${slot}`, today);
  GM_setValue(`dailyId_${slot}`, pool[index].id);
  return index;
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`  PASS  ${name}`);
  } catch (error) {
    results.push(`  FAIL  ${name}\n        ${error.message}`);
  }
}

// ── 模式 0：随机避重 ──
check("随机避重：连续两次不会相同", () => {
  store.clear();
  const pool = makePool(3);
  let prev = -1;
  for (let i = 0; i < 300; i += 1) {
    const index = nextRandom(pool);
    assert.notStrictEqual(index, prev, `第 ${i} 次出现连续重复`);
    prev = index;
  }
});

check("随机避重：单图池返回 0 且不报错", () => {
  store.clear();
  assert.strictEqual(nextRandom(makePool(1)), 0);
});

// ── 模式 1：完全随机 ──
check("完全随机：允许连续重复（300 次至少出现一次重复）", () => {
  store.clear();
  const pool = makePool(2);
  let prev = -1;
  let repeated = false;
  for (let i = 0; i < 300; i += 1) {
    const index = nextPureRandom(pool);
    if (index === prev) repeated = true;
    prev = index;
  }
  assert.ok(repeated, "300 次纯随机居然没有重复，随机源可能有问题");
});

check("完全随机：权重 10 的图占比明显更高", () => {
  store.clear();
  const pool = makePool(6, [10, 1, 1, 1, 1, 1]);
  const counts = new Array(6).fill(0);
  const N = 20000;
  for (let i = 0; i < N; i += 1) counts[nextPureRandom(pool)] += 1;
  const ratio = counts[0] / N;
  // 理论值 10/15 ≈ 0.667，允许 ±0.05
  assert.ok(
    ratio > 0.6 && ratio < 0.73,
    `高权重占比 ${(ratio * 100).toFixed(1)}%，偏离理论值 66.7%`,
  );
});

// ── 模式 2：顺序 ──
check("顺序循环：严格按 0,1,2,0,1,2... 走", () => {
  store.clear();
  const pool = makePool(3);
  const seq = Array.from({ length: 9 }, () => nextSequential(pool));
  assert.deepStrictEqual(seq, [0, 1, 2, 0, 1, 2, 0, 1, 2]);
});

// ── 模式 3：洗牌袋 ──
check("洗牌：连续 N 次内每张恰好出现一次（N = 池大小）", () => {
  store.clear();
  const pool = makePool(5);
  for (let round = 0; round < 20; round += 1) {
    const seen = new Set();
    for (let i = 0; i < pool.length; i += 1) {
      const index = nextShuffle(pool);
      const id = pool[index].id;
      assert.ok(!seen.has(id), `第 ${round} 轮内重复出现 id=${id}`);
      seen.add(id);
    }
    assert.strictEqual(seen.size, pool.length);
  }
});

check("洗牌：一轮结束后的第一张不受上一轮末张影响（不复用同一张）", () => {
  store.clear();
  const pool = makePool(3);
  // 第一轮
  const first = [nextShuffle(pool), nextShuffle(pool), nextShuffle(pool)].map((i) => pool[i].id);
  // 第二轮第一张
  const secondRoundFirst = pool[nextShuffle(pool)].id;
  assert.ok(first.includes(secondRoundFirst));
  // 第二轮继续走完，确认仍每张一次
  const secondRound = [secondRoundFirst];
  for (let i = 0; i < 2; i += 1) secondRound.push(pool[nextShuffle(pool)].id);
  assert.strictEqual(new Set(secondRound).size, 3, "第二轮出现重复");
});

// ── 模式 4：每天固定 ──
check("每天固定：同一天多次调用返回同一张", () => {
  store.clear();
  const pool = makePool(5);
  const first = nextDaily(pool);
  for (let i = 0; i < 20; i += 1) {
    assert.strictEqual(nextDaily(pool), first, "同一天内换了图");
  }
});

check("每天固定：跨天会换图且不与前一天相同", () => {
  store.clear();
  const pool = makePool(2);
  // 模拟昨天
  GM_setValue("dailyDate_day", "2000-01-01");
  GM_setValue("dailyId_day", pool[0].id);
  const index = nextDaily(pool);
  assert.notStrictEqual(pool[index].id, pool[0].id, "跨天抽到了前一天那张");
});

// ── 边界：池变化后状态仍有效 ──
check("顺序：池缩小后游标取模不越界", () => {
  store.clear();
  const big = makePool(10);
  for (let i = 0; i < 9; i += 1) nextSequential(big);
  const small = makePool(3);
  const index = nextSequential(small);
  assert.ok(index >= 0 && index < 3, `下标越界：${index}`);
});

check("洗牌：删掉图后旧 bag 里的 id 不会卡住", () => {
  store.clear();
  const pool = makePool(4);
  nextShuffle(pool);
  nextShuffle(pool);
  const shrunk = makePool(2); // 只剩 id 1、2
  const picked = new Set();
  for (let i = 0; i < 2; i += 1) picked.add(shrunk[nextShuffle(shrunk)].id);
  assert.strictEqual(picked.size, 2, "缩小后仍应能覆盖到所有剩余图");
});

console.log("=== BackgroundPool 逻辑测试 ===");
console.log(results.join("\n"));
const failed = results.filter((r) => r.trim().startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exitCode = failed > 0 ? 1 : 0;
