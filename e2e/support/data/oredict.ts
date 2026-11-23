/**
 * 矿辞/物品标签在数据层的规范化。
 *
 * 站点后台对大小写并不完全统一（`ingotIron` 与 `forge:ingots/iron` 混用），
 * 而用例里手写标签时也很难保证与种子数据逐字一致；统一转小写并去掉首尾空白，
 * 让「查不到」只代表真的没登记，而不是敲错了大小写。
 */
export function normalizeOredict(tag: string): string {
  return tag.trim().toLowerCase();
}
