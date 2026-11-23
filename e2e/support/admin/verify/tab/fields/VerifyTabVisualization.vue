<template>
  <template v-if="role === 'current' && same">与当前一致。</template>
  <div
    v-else
    class="TableBlock"
    :style="{
      width: gui.width + 'px',
      height: gui.height + 'px',
      'background-image': `url(//i.mcmod.cn/gui/bg/${gui.guiID}.gif)`,
    }"
  >
    <template v-for="(slots, type) in allSlots" :key="type">
      <template v-for="(slot, slotIndex) in slots" :key="slotIndex">
        <VerifyTabVisualizationItem
          v-if="!slot.isTag || !slot.matched"
          :gui-slot="slot"
          :item-id="Number(slot.isTag ? 0 : slot.id)"
        />
        <div v-else class="common-oredict-loop">
          <VerifyTabVisualizationItem
            v-for="itemID in slot.parsed"
            :key="itemID"
            :gui-slot="slot"
            :item-id="itemID"
          />
        </div>
        <span
          v-if="slot.count > 1"
          class="table_num"
          :style="{
            color: '#000',
            margin: `${slot.y + 32}px 0 0 ${slot.x + 32}px`,
          }"
          >{{ count(slot.count) }}</span
        ><span
          v-if="slot.count > 1"
          class="table_num"
          :style="{
            color: '#fff',
            margin: `${slot.y + 30}px 0 0 ${slot.x + 30}px`,
          }"
          >{{ count(slot.count) }}</span
        >
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { TabVerifyFieldGroups, type GUI, type GUISlot } from "../schema";
import VerifyTabVisualizationItem from "./VerifyTabVisualizationItem.vue";
import { McmodRepository } from "../../../../data/McmodRepository.ts";
import { pickKey } from "../../../../../../src/CollectionUtils.ts";
import { Utils } from "../../../../../../src/Utils.ts";

type GUISlots = Record<number, GUISlot>;

const { tab, original, gui } = defineProps<{
  tab: McmodTabEditorInnerData;
  original: McmodTabEditorInnerData | undefined;
  gui: GUI;
  role: "current" | "original";
}>();

const same = computed(() => {
  if (original === undefined) return false;
  const keys = Utils.getEntries(TabVerifyFieldGroups)
    .filter(([_group, keys]) => keys.includes("visualization"))
    .map(([group, _keys]) => group);
  const pick1 = pickKey(tab, keys);
  const pick2 = pickKey(original, keys);
  return Utils.isEqual(pick1, pick2);
});

const allSlots = computed(() => {
  const result: Record<"in" | "out" | "fuel", GUISlots> = {
    in: {},
    out: {},
    fuel: {},
  };
  Object.entries(tab["slot-in-item"] ?? {}).forEach(([slotID, itemID]) => {
    const nSlotID = Number(slotID);
    // 槽位里写的是资料 ID 时是纯数字，否则是矿词/标签
    const isTag = !/^\d+$/.test(itemID.trim());
    const parsed = McmodRepository.getItemsByOredict(itemID).map((item) => item.id);
    const matched = isTag && !!parsed.length;
    const x = gui.inX[nSlotID];
    const y = gui.inY[nSlotID];
    if (x === 0 && y === 0) return;
    result.in[nSlotID] = {
      x,
      y,
      n: gui.inNSet[nSlotID],
      c: gui.inCSet[nSlotID],
      unit: gui.inUnit[nSlotID],
      size: gui.inUse128x[nSlotID] ? 128 : 32,
      id: itemID,
      isTag,
      matched,
      parsed: matched ? periodicSlice(parsed) : [],
      count: Number(tab["slot-in-number"]?.[nSlotID] ?? 1),
    };
  });
  Object.entries(tab["slot-out-item"] ?? {}).forEach(([slotID, itemID]) => {
    const nSlotID = Number(slotID);
    const isTag = !/^\d+$/.test(itemID.trim());
    const parsed = McmodRepository.getItemsByOredict(itemID).map((item) => item.id);
    const matched = isTag && !!parsed.length;
    const x = gui.outX[nSlotID];
    const y = gui.outY[nSlotID];
    if (x === 0 && y === 0) return;
    result.out[nSlotID] = {
      x,
      y,
      n: gui.outNSet[nSlotID],
      c: gui.outCSet[nSlotID],
      unit: gui.outUnit[nSlotID],
      size: gui.outUse128x[nSlotID] ? 128 : 32,
      id: itemID,
      isTag,
      matched,
      parsed: matched ? periodicSlice(parsed) : [],
      count: Number(tab["slot-out-number"]?.[nSlotID] ?? 1),
    };
  });
  Object.entries(gui.fuelID ?? {}).forEach(([slotID, itemID]) => {
    const nSlotID = Number(slotID);
    const x = gui.fuelX[nSlotID];
    const y = gui.fuelY[nSlotID];
    if (x === 0 && y === 0) return;
    result.fuel[nSlotID] = {
      x,
      y,
      n: gui.fuelNSet[nSlotID],
      c: false,
      unit: gui.fuelUnit[nSlotID],
      size: gui.fuelUse128x[nSlotID] ? 128 : 32,
      id: itemID.toString(),
      isTag: false,
      matched: false,
      parsed: [],
      count: 1,
    };
  });
  return result;
});

function periodicSlice(items: number[]) {
  const result: number[] = [];
  const length = items.length;
  for (let i = 0; i < 5; i++) {
    result[i] = items[i % length];
  }
  return result;
}

function count(x: number) {
  if (x < 1) return "";
  if (x < 10) return `  ${x}`; // MCMOD，很神奇吧
  if (x < 1e3) return x.toString();
  const a = Math.round(x / 100);
  const b = a % 10;
  const c = a - b;
  const sb: (number | string)[] = [c];
  if (b !== 0) sb.push(".", b);
  sb.push("K"); // 没错，只有 K，没有更大的单位了
  return sb.join("");
}
</script>
