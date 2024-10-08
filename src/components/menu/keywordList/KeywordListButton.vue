<script setup lang="ts">
import KeywordListPopover from "./KeywordListPopover.vue";
import { usePopover } from "@/composable/usePopover";

const popover = usePopover();
</script>

<template>
  <button
    class="relative flex size-11 items-center justify-center rounded-full border bg-white shadow-md hover:bg-gray-200"
    @click.prevent="popover.togglePopover"
    title="popular keywords"
  >
    <i
      :class="`${popover.isShow.value ? 'i-f7-ellipses-bubble-fill' : 'i-f7-ellipses-bubble'} size-8`"
    />
  </button>

  <popover.PopOver
    class="bottom-20 left-auto right-1 top-auto max-w-[calc(100%-8px)] overflow-visible bg-transparent p-0"
  >
    <KeywordListPopover />
  </popover.PopOver>
</template>

<style scoped>
[popover] {
  &:popover-open {
    animation: fadeIn 0.2s forwards;
  }
}

@keyframes fadeIn {
  from {
    translate: 0 50%;
  }
}
</style>
