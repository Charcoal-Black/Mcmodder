import type { ConfigRepository } from "../../config/ConfigRepository";
import type { AppRepository } from "./AppRepository";

/**
 * `AppRepository` 的 GM Storage 形态实现。
 *
 * # 存储结构
 * 用一个 GM 存储键（构造时指定的 `configName`）承载一个 `Record<文件名, T[]>`：
 * 键为文件名，值为该文件的数据数组，整体经 `ConfigRepository` 直接落盘到 GM Storage。
 *
 * # 特点 / 取舍
 * - 实现简单，但整存整取：读写任一文件都要把整个键 JSON 序列化一次，也无合同级 LRU 缓存；
 *   大 JSON 文件（尤其带 Base64 图标）下开销很大 —— 这也是 `ItemIDBRepository` 被引入的原因。
 * - 所有方法虽声明为 async，但底层为同步调用，仅为了满足 `AppRepository` 接口。
 */
export class GMStorageRepository<T extends object> implements AppRepository<T> {
  private readonly configs: ConfigRepository;
  /** 承载全部文件的 GM 存储键名（须为 `AppStorage` 中值为 `Record<string, object[]>` 的键） */
  private readonly configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>;

  /**
   * @param configs 配置仓库，用于读写 GM Storage。
   * @param configName 承载数据的存储键名（如 `"mcmodderJsonStorage"`）。
   */
  constructor(
    configs: ConfigRepository,
    configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>,
  ) {
    this.configs = configs;
    this.configName = configName;
  }

  /** 初始化：若该存储键尚未落盘，则写入空对象 `{}` */
  async init() {
    if (this.configs.getAll(this.configName) === undefined) {
      this.configs.setAll(this.configName, {});
    }
  }

  /** 列出全部文件名（即存储键对象的 keys） */
  async listFilename() {
    const selection = this.configs.getAll(this.configName)!;
    return Object.keys(selection);
  }

  /** 新建空文件：登记文件名并写入空数组 */
  async createFile(filename: string) {
    this.configs.set(this.configName, filename, []);
  }

  /** 删除指定文件 */
  async deleteFile(filename: string) {
    this.configs.delete(this.configName, filename);
  }

  /** 读回指定文件的全部数据；文件不存在时返回 undefined */
  async read(filename: string) {
    return this.configs.get(this.configName, filename)! as T[];
  }

  /** 覆写指定文件的全部数据 */
  async write(filename: string, data: T[]) {
    this.configs.set(this.configName, filename, data);
  }
}
