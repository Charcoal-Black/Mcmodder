export interface AutoLinkOptionEmitPayload {
  click: [type: AutoLinkEntryType, id: string, textHalf: string, textFull: string];
}

/** `AttitudeStickerList` 的事件 */
export interface AttitudeStickerListEmitPayload {
  /** 重命名成功：传入服务端确认后的新记录，父组件用它替换列表里的旧记录 */
  stickerRenamed: [sticker: SupabaseAttitudeSticker];
  /** 贴纸被移出「我的贴纸库」（删除 / 取消收藏）：父组件应把它从列表里剔除 */
  stickerRemoved: [sticker: SupabaseAttitudeSticker];
}
