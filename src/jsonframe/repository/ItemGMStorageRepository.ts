import type { ConfigRepository } from "../../config/ConfigRepository";
import { GMStorageRepository } from "./GMStorageRepository";
import type { ItemRepository } from "./ItemRepository";

/**
 * `ItemRepository` 的 GM Storage 形态：仅字面意义上实现该接口，
 * 底层仍沿用拆表前的原始架构（整个存储键整存整取，不做图标/主键拆表）。
 *
 * # 主键约定
 * 本形态没有物理主键，以「文件名 + 在数组中的下标」合成字符串主键
 * `filename/index`（`K = string`），通过 `readSearchText` 生成、`readByPrimaryKeys` 再解析回定位信息。
 */
export class ItemGMStorageRepository
  extends GMStorageRepository<Item>
  implements ItemRepository<string>
{
  constructor(configs: ConfigRepository) {
    super(configs, "mcmodderJsonStorage");
  }

  /**
   * 读取指定文件的全部条目，并附上合成主键 `filename/index`。
   * 供检索界面拿到可定位的条目。
   */
  async readSearchText(filename: string) {
    const items = await this.read(filename);
    return items.map((item, index) => ({
      ...item,
      _primaryKey: `${filename}/${index}`,
    }));
  }

  /**
   * 按合成主键批量读取：解析每个 `filename/index`，按文件去重后一次性读回各文件，
   * 再逐条按「文件 + 下标」定位，返回与入参顺序对齐的条目列表。
   *
   * @param itemPrimaryKeys 形如 `${filename}/${index}` 的合成主键数组。
   */
  async readByPrimaryKeys(itemPrimaryKeys: string[]) {
    const fileAndIndexes = new Array<[string, number]>(itemPrimaryKeys.length);
    const fileMap = new Map<string, number>();
    let count = 0;
    itemPrimaryKeys.forEach((key, itemIndex) => {
      const [filename, index] = key.split("/") as [string, string];
      let fileIndex = fileMap.get(filename);
      if (fileIndex === undefined) {
        fileIndex = count++;
        fileMap.set(filename, fileIndex);
      }
      fileAndIndexes[itemIndex] = [filename, Number(index)];
    });
    const fileArray = new Array<string>(count);
    fileMap.forEach((index, name) => (fileArray[index] = name));
    const contents = await Promise.all(fileArray.map((file) => this.read(file)));
    return fileAndIndexes.map(([file, index]) => {
      const fileIndex = fileMap.get(file);
      return contents[fileIndex!][index];
    });
  }

  /** GM 形态数据本就内嵌图标，无需补回，直接原样返回入参 */
  async readByItems(items: Item[]) {
    return items;
  }
}
