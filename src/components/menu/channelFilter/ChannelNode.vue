<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { ChannelNode } from "@/assets/channel";
import { useSearchStore } from "@/store/searchStore";
import { useStorageStore } from "@/store/storageStore";
import { getChannelIcon } from "@/utils/icons";

const props = defineProps<{
  node: ChannelNode;
}>();
const emit = defineEmits<{
  change: [];
}>();

const storageStore = useStorageStore();
const searchStore = useSearchStore();

const children = computed(() => {
  const names: string[] = [];
  const childNodes: ChannelNode[] = [];
  props.node.children.map((child) => {
    if (typeof child === "string") {
      names.push(child);
    } else {
      childNodes.push(child);
    }
  });
  return { names, childNodes };
});

const groupEl = ref<HTMLInputElement | null>(null);
const namesEl = ref<HTMLElement | null>(null);
const childNodeEl = ref<HTMLElement | null>(null);
function onNameCheck(evt: Event, name: string) {
  const input = evt.target as HTMLInputElement;
  storageStore.setTalentFilter(name, input.checked);

  update();
}

function update() {
  if (!namesEl.value || !groupEl.value) return;
  // 全ての名前がチェックされているか
  const inputs = [...namesEl.value.querySelectorAll("input")];
  const isAllChecked = inputs.every((input) => {
    return input.checked;
  });

  // 親ノードのチェック状態を変更
  groupEl.value.checked = isAllChecked;
  emit("change");
}

onMounted(async () => {
  update();
});

function onGroupClick(e: Event) {
  const group = e.target as HTMLInputElement;
  emit("change");

  children.value.names.forEach((name) => {
    storageStore.setTalentFilter(name, group.checked);
  });

  if (childNodeEl.value) {
    const childInputs = [...childNodeEl.value.querySelectorAll("input")];

    childInputs.forEach((input) => {
      input.checked = group.checked;
      // コンポーネントに変更を通知する
      input.dispatchEvent(new Event("change"));
    });
  }
}

async function onNodeChange() {
  await new Promise((resolve) => requestAnimationFrame(resolve));

  if (!childNodeEl.value || !groupEl.value) return;

  // 子ノードが全てチェックされているか
  const childInputs = [...childNodeEl.value.querySelectorAll("input")];
  const isAllChecked = childInputs.every((input) => {
    return input.checked;
  });

  if (groupEl.value.checked === isAllChecked) return;

  // 子ノードの状態に応じて現ノードのチェック状態を変更
  groupEl.value.checked = isAllChecked;

  // 親に変更を通知
  emit("change");
}
</script>

<template>
  <div open class="ml-4 flex select-none flex-col items-start gap-2 text-sm font-bold">
    <div class="flex flex-col items-start">
      <label
        class="flex h-9 cursor-pointer place-items-center gap-1 whitespace-nowrap rounded-lg bg-gray-100 px-2 hover:outline hover:outline-2 has-[:checked]:bg-red-200 has-[:checked]:text-red-900 has-[:focus-visible]:outline"
      >
        <input ref="groupEl" type="checkbox" class="sr-only" @click="onGroupClick" />
        <i class="i-mdi-folder-open size-6"></i>
        <p>
          {{ node.name }}
        </p>
      </label>
    </div>

    <div>
      <div
        ref="namesEl"
        v-if="children.names.length > 0"
        class="ml-4 flex flex-col gap-px rounded-xl px-2 pb-3 pt-1"
      >
        <label
          v-for="name in children.names"
          :key="name"
          class="group relative flex cursor-pointer place-items-center gap-2 hover:z-10 has-[:focus-visible]:outline"
          :title="name"
          @contextmenu.prevent="searchStore.setFocusedTalent(name)"
        >
          <input
            type="checkbox"
            class="sr-only"
            @change="($event) => onNameCheck($event, name)"
            :checked="storageStore.talentFilterMap.get(name)"
          />
          <!-- <p class="absolute right-full p-2 opacity-40">
            <i
              v-if="channelFilterStore.talentFilterMap.get(name)"
              class="i-mdi-check size-6 text-lime-700"
            ></i>
          </p> -->
          <img
            :src="getChannelIcon(name)"
            alt="icon"
            class="size-[40px] rounded-full border bg-gray-200 outline-gray-800 group-hover:outline group-hover:outline-2"
            loading="lazy"
          />
          <div
            class="rounded-lg bg-gray-100 px-2 py-1 group-hover:outline group-hover:outline-2 group-has-[:checked]:bg-red-200 group-has-[:checked]:text-red-900 group-has-[:focus-visible]:outline-2"
          >
            {{ name }}
          </div>
        </label>
      </div>
      <div v-if="children.childNodes.length > 0" ref="childNodeEl" class="flex flex-col gap-2">
        <ChannelNode
          v-for="child in children.childNodes"
          :node="child"
          :key="child.name"
          @change="onNodeChange"
        />
      </div>
    </div>
  </div>
</template>
