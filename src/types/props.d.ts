export interface AutoLinkOptionProps<T extends AutoLinkBaseEntry> {
  parent: import("../Mcmodder").Mcmodder,
  entry: T,
  index: number
}

export interface McmodderTableProps<T extends McmodderTableAcceptable> {
  parent: import("../Mcmodder").Mcmodder,
  attr?: object,
  headConfigs: HeadConfigsInitializer<T>,
  editConfigs?: EditConfigsInitializer<T>
}

export interface ConfigResourceFileListInteractorProps<K extends keyof McmodderStorage> {
  parent: import("../Mcmodder").Mcmodder,
  id: K,
  name: string
}

export interface ConfigResourceInteractorProps<
  K extends keyof McmodderStorage,
  TConfig extends object = Extract<McmodderStorage[K], object>,
  TData extends McmodderTableAcceptable = Extract<TConfig, McmodderTableAcceptable>
> extends ConfigResourceFileListInteractorProps<K> {
  headConfigs: HeadConfigsInitializer<TData>,
  configParser?: ConfigParser<TConfig>,
  dataParser?: DataParser<TData>
}

export interface JsonFrameProps {
  id: string,
  parent: import("../Mcmodder").Mcmodder
}

export interface GenericJsonFrameProps<T extends McmodderTableAcceptable> extends JsonFrameProps, McmodderTableProps<T> {
  configName: KeysOfType<Required<McmodderStorage>, Record<string, object[]>>,
  allowedKeys: string[],
  opts?: {
    parseText?: (text: string) => {
      success: number,
      fail: number,
      result: T[]
    },
    more?: () => void
  }
}

export interface InputProps<T> {
  title: string,
  value: T,
  onSuccessfulChange?: InputSuccessfulChangeCallBack<T>
}

// types.d.ts 迁移
export interface InputListOption {
  inputListBindElement?: InputListBindElement,
  anchorElement?: HTMLElement,
  alwaysShowAllSuggestions?: boolean,
  delimiter?: string,
  hideBeforeInput?: boolean,
  suggestionManager: SuggestionCallbackManager | SuggestionConfigManager
}

export interface DropdownTextInputProps extends InputProps<string>, InputListOption {}