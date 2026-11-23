/**
 * 模组日志类编辑的审核数据类型与字段重组。
 */
import { type BaseEdition } from "../schema";

export type PostEdition = BaseEdition<McmodPostEditorData["post-data"], "5">;
