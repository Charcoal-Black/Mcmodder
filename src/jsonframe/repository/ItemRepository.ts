export interface ItemRepository<T extends object> {
  init(): Promise<void>;
  listFilename(): Promise<string[]>;
  createFile(filename: string): Promise<void>;
  deleteFile(filename: string): Promise<void>;
  read(filename: string): Promise<T[]>;
  write(filename: string, data: T[]): Promise<void>;
}