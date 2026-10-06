import type { CustomEmoji } from "emoji-picker-element/shared.js";
import { Values } from "../Values";

const REGIONAL_INDICATOR_A = 0x1f1e6;

export type AttitudeLetterEmoji = CustomEmoji & { type: string };

/** 字母表（A–Z）：连续点选拼词用 */
export const attitudeLetters: AttitudeLetterEmoji[] = Array.from({ length: 26 }, (_, index) => {
  const name = String.fromCharCode(65 + index);
  const codepoint = REGIONAL_INDICATOR_A + index;
  return {
    type: String.fromCodePoint(codepoint),
    name,
    shortcodes: [`letter-${name.toLowerCase()}`],
    url: `${Values.attitude.emojiSvgUrl}${codepoint.toString(16)}.svg`,
  };
});

const attitudeTypeByName = new Map(attitudeLetters.map(({ name, type }) => [name, type]));

/** 字母 A 的 Twemoji 资源 */
export const attitudeLetterIconUrl = attitudeLetters[0].url;

export function attitudeTypeOfLetter(name: string | undefined) {
  return name ? attitudeTypeByName.get(name.trim().toUpperCase()) : undefined;
}
