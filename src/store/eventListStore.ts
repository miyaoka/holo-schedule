import { acceptHMRUpdate, defineStore } from "pinia";
import { computed, ref } from "vue";
import { useSearchStore } from "./searchStore";
import { useStorageStore } from "./storageStore";
import { getFilteredEventList, talentFilter } from "@/lib/search";
import { createDateSectionList } from "@/lib/section";
import { fetchLiverEventList, type LiverEvent } from "@/services/api";
import { type NijiLiverMap } from "@/services/nijisanji";

interface AddedEventId {
  id: string;
  addedTime: number;
}

interface AddedEvent {
  addedTime: number;
  liverEvent: LiverEvent;
}

// 新着としてキープする時間(ms)
const addedEventKeepTime = 1000 * 60 * 60 * 2;

export const useEventListStore = defineStore("eventListStore", () => {
  const storageStore = useStorageStore();
  const searchStore = useSearchStore();
  const liverEventList = ref<LiverEvent[] | null>(null);
  const addedEventIdList = ref<AddedEventId[]>([]);
  // idをキーにしたLiverEventのMap
  const liverEventMap = ref<Map<string, LiverEvent>>(new Map());

  const addedEventIdSet = computed(() => {
    return new Set(addedEventIdList.value.map((addedEvent) => addedEvent.id));
  });

  const filteredEventList = computed(() => {
    if (!liverEventList.value) return [];
    return getFilteredEventList({
      liverEventList: liverEventList.value,
      filterMap: storageStore.talentFilterMap,
      searchQuery: searchStore.searchQuery,
    });
  });

  // 新着イベントを現在のタレントフィルターでフィルタリング
  const addedEventList = computed<AddedEvent[]>(() => {
    if (!addedEventIdList.value) return [];

    const filterMap = storageStore.talentFilterMap;
    const filterEnabled = storageStore.talentFilterEnabled;

    const list = addedEventIdList.value.flatMap((addedEvent) => {
      const liverEvent = liverEventMap.value.get(addedEvent.id);
      if (!liverEvent) return [];
      return {
        addedTime: addedEvent.addedTime,
        liverEvent,
      };
    });
    if (!filterEnabled || filterMap.size === 0) return list;
    return list.filter((item) =>
      talentFilter({
        liverEvent: item.liverEvent,
        filterMap,
      }),
    );
  });

  const onLiveEventList = computed(() => {
    return filteredEventList.value.filter((event) => event.isLive);
  });

  const dateSectionList = computed(() => {
    return createDateSectionList(filteredEventList.value).filter((dateSection) => {
      return dateSection.timeSectionList.some((section) => section.events.length > 0);
    });
  });

  async function updateLiverEventList(nijiLiverMap: NijiLiverMap) {
    // list取得
    const newLiverEventList = await fetchLiverEventList({ nijiLiverMap });

    // map更新
    const eventMap = new Map<string, LiverEvent>();
    newLiverEventList.forEach((liverEvent) => {
      eventMap.set(liverEvent.id, liverEvent);
    });
    liverEventMap.value = eventMap;

    // 新着更新
    updateAddedEventList(newLiverEventList);

    // list更新
    liverEventList.value = newLiverEventList;

    // liverEventListに存在しないbookmarkを削除
    storageStore.bookmarkEventSet.forEach((id) => {
      if (!liverEventMap.value.has(id)) {
        storageStore.bookmarkEventSet.delete(id);
      }
    });
  }

  // setを比較して足されたものを算出
  function updateAddedEventList(newLiverEventList: LiverEvent[]) {
    // 初回の場合は差分抽出せずスキップ
    if (!liverEventList.value) return;

    const newLiverEventIdSet = new Set(newLiverEventList.map((event) => event.id));
    const prevLiverEventIdSet = new Set(liverEventList.value.map((event) => event.id));

    const idDiffSet = newLiverEventIdSet.difference(prevLiverEventIdSet);

    const now = Date.now();
    const newAddedEventIdList: AddedEventId[] = Array.from(idDiffSet).map((id) => {
      return {
        id,
        addedTime: now,
      };
    });

    const mergedEventIdList = [...addedEventIdList.value, ...newAddedEventIdList].filter(
      (addedEvent) => {
        // 追加後から一定時間経ったものは新着に含めない
        if (now - addedEvent.addedTime > addedEventKeepTime) return false;
        // 開始時間から一定時間経過したものも新着に含めない
        const liverEvent = liverEventMap.value.get(addedEvent.id);
        if (!liverEvent) return false;
        if (now - liverEvent.startAt.getTime() > addedEventKeepTime) return false;

        return true;
      },
    );

    addedEventIdList.value = mergedEventIdList;
  }

  function clearAddedEventList() {
    addedEventIdList.value = [];
  }

  return {
    liverEventList,
    filteredEventList,
    onLiveEventList,
    dateSectionList,
    liverEventMap,
    addedEventList,
    addedEventIdSet,
    updateLiverEventList,
    clearAddedEventList,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEventListStore, import.meta.hot));
}
