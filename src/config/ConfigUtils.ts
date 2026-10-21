import { settings } from "../loader/ConfigLoader";
import { Mcmodder } from "../Mcmodder";
import { StorageBuffer } from "../StorageBuffer";
import type { ConfigRepository } from "./ConfigRepository";

export class ConfigUtils {
  static readonly defaultValue = {
    checkbox: false,
    number: 0,
    slider: 0,
    text: "",
    colorpicker: "#000",
    keybind: {},
    dropdownMenu: 0,
    dropdownTextMenu: "",
  } as const satisfies Record<InputType, unknown>;

  private readonly configs: ConfigRepository;
  private data: ConfigurableSettingsOptions;
  buffer: StorageBuffer;

  constructor(parent: Mcmodder) {
    this.configs = parent.configRepository;
    this.buffer = new StorageBuffer(parent);
    this.data = this.buildData();
  }

  private buildData() {
    const data: Partial<ConfigurableSettingsOptions> = {};

    settings.forEach((category) => {
      category.sections.forEach((section) => {
        section.settings.forEach((singleSettings) => {
          this.add(singleSettings, data);
        });
      });
    });

    return data as ConfigurableSettingsOptions;
  }

  /**
   * 注册一个配置项。
   *
   * `type` 决定 `id` 与 `value` 的类型；`range` 仅数值、滑块与下拉类输入有效；
   * `Suggestion` 仅下拉文本输入有效。若该配置项此前从未写入过，则以 `value`
   * （或该输入类型的默认值）作为初始值写入配置仓库。
   *
   * @param params 注册参数。
   * @returns 返回自身，以便链式注册多个配置项。
   */
  private add<T extends ConfigurableSettings>(
    params: T,
    data: Partial<ConfigurableSettingsOptions>,
  ) {
    const { id, title, description, type } = params;
    const value = "value" in params ? params.value : ConfigUtils.defaultValue[type];
    const option = {
      title: title,
      description: description,
      type: type,
      value: value,
      permission: "permission" in params ? params.permission : "none",
      ...("range" in params && { range: params.range }),
      ...("suggestion" in params && { suggestion: params.suggestion }),
      ...("visible" in params && { visible: params.visible }),
      ...("syncWithSupabase" in params && { syncWithSupabase: params.syncWithSupabase }),
    } as ConfigurableSettingsOption<ConfigurableSettings["id"]>;
    this.setOption(data as ConfigurableSettingsOptions, id, option);
    if (this.configs.getSettings(id) === undefined) {
      this.configs.setSettings(id, value);
    }
    return this;
  }

  /**
   * 将配置项写入 `data` 的某个键下。
   *
   * `data` 是以 `id` 为键的映射类型，而 `id` 的类型来自泛型参数：直接写 `data[id]` 时
   * TypeScript 会把所有候选键的类型求成交集（`type` 等字段在各类配置项间相互冲突，
   * 交集退化为 `never`）。这里把容器收窄为只含该键的映射类型，写入即可正确取到
   * `Option<V>` 而不丢失类型检查。
   */
  private setOption<V extends ConfigurableSettings["id"]>(
    data: { [K in V]: ConfigurableSettingsOption<K> },
    id: V,
    option: ConfigurableSettingsOption<V>,
  ) {
    data[id] = option;
  }

  get options() {
    return this.data;
  }

  getOption<T extends ConfigurableSettings["id"]>(id: T) {
    return this.data[id];
  }
}
