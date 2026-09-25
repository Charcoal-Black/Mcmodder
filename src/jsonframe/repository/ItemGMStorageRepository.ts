import type { ConfigRepository } from "../../config/ConfigRepository";
import { GMStorageRepository } from "./GMStorageRepository";
import type { ItemRepository } from "./ItemRepository";

export class ItemGMStorageRepository
  extends GMStorageRepository<Item>
  implements ItemRepository<string>
{
  constructor(configs: ConfigRepository) {
    super(configs, "mcmodderJsonStorage");
  }

  async readSearchText(filename: string) {
    const items = await this.read(filename);
    return items.map((item, index) => ({
      ...item,
      _primaryKey: `${filename}/${index}`,
    }));
  }

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

  async readByItems(items: Item[]) {
    return items;
  }
}
