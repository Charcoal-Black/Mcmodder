import type { IDBRepository } from "../jsonframe/repository/IDBRepository";

export interface AutoLinkOptionProps<T extends AutoLinkBaseEntry> {
  parent: import("../Mcmodder").Mcmodder;
  entry: T;
  index: number;
}

export interface TableProps<T extends TableAcceptable> {
  parent: import("../Mcmodder").Mcmodder;
  attr?: object;
  rowOptions: RowOptionsInitializer<T>;
  editConfigs?: EditOptionsInitializer<T>;
}

export interface ConfigResourceFileListInteractorProps<K extends keyof AppStorage> {
  parent: import("../Mcmodder").Mcmodder;
  id: K;
  name: string;
}

export interface ConfigResourceInteractorProps<
  K extends keyof AppStorage,
  TConfig extends object = Extract<AppStorage[K], object>,
  TData extends TableAcceptable = Extract<TConfig, TableAcceptable>,
> extends ConfigResourceFileListInteractorProps<K> {
  rowOptions: RowOptionsInitializer<TData>;
  configParser?: ConfigParser<TConfig>;
  dataParser?: DataParser<TData>;
}

export interface JsonFrameProps {
  id: string;
  parent: import("../Mcmodder").Mcmodder;
}

export interface GenericJsonFrameProps<T extends TableAcceptable>
  extends JsonFrameProps, TableProps<T> {
  configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>;
  allowedKeys: string[];
  opts?: {
    gmStorageRepo?: () => GMStorageRepository<T>;
    idbRepo?: () => IDBRepository<T>;
    parseText?: (text: string) => {
      success: number;
      fail: number;
      result: T[];
    };
    more?: () => void;
  };
}

export interface InputProps<T> {
  title: string;
  value: T;
  onSuccessfulChange?: InputSuccessfulChangeCallBack<T>;
}

// types.d.ts 迁移
export interface InputListOption {
  inputListBindElement?: InputListBindElement;
  anchorElement?: HTMLElement;
  alwaysShowAllSuggestions?: boolean;
  delimiter?: string;
  hideBeforeInput?: boolean;
  suggestionManager: SuggestionCallbackManager | SuggestionConfigManager;
}

export interface DropdownTextInputProps extends InputProps<string>, InputListOption {}
