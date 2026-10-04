/**
 * 应用数据仓储的抽象接口：以「文件」为单位组织某种类型的数据列表，
 * 屏蔽底层存储形态差异（GM Storage / IndexedDB）。
 *
 * # 设计约定
 * - 「文件」是一个逻辑分组单元（如一个导入的 JSON 文件），由文件名唯一标识；
 *   `createFile` → `write` 即可落盘一个文件，`listFilename` → `read` 可再读回。
 * - 所有方法均为异步（返回 Promise），即便底层实现是同步的也保持接口一致。
 * - 泛型 `T` 为单条数据的类型（如 `Item`）。
 */
export interface AppRepository<T extends object> {
  /** 初始化底层存储（建库/建表/建默认值等），须在其余方法之前调用 */
  init(): Promise<void>;
  /** 列出当前已存在的所有文件名 */
  listFilename(): Promise<string[]>;
  /** 新建一个空文件（仅登记文件名，不写数据） */
  createFile(filename: string): Promise<void>;
  /** 删除指定文件 */
  deleteFile(filename: string): Promise<void>;
  /** 读回指定文件的全部数据 */
  read(filename: string): Promise<T[]>;
  // readByIndex(index: number): Promise<T | undefined>;
  /** 覆写指定文件的全部数据 */
  write(filename: string, data: T[]): Promise<void>;
}
