<script setup lang="ts">
import { computed } from 'vue';

import { LockKeyhole } from '@vben/icons';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { useVbenModal } from '@vben-core/popup-ui';
import { VbenIconButton } from '@vben-core/shadcn-ui';

import LockScreenModal from './lock-screen-modal.vue';

defineOptions({
  name: 'LockScreenButton',
});

const userStore = useUserStore();
const accessStore = useAccessStore();

const avatar = computed(
  () => userStore.userInfo?.avatar || preferences.app.defaultAvatar,
);
const text = computed(() => userStore.userInfo?.realName || '');

const [LockModal, lockModalApi] = useVbenModal({
  connectedComponent: LockScreenModal,
});

function handleOpenLock() {
  lockModalApi.open();
}

function handleSubmitLock(lockScreenPassword: string) {
  lockModalApi.close();
  accessStore.lockScreen(lockScreenPassword);
}
</script>

<template>
  <template v-if="preferences.widget.lockScreen">
    <LockModal :avatar="avatar" :text="text" @submit="handleSubmitLock" />
    <VbenIconButton
      :tooltip="$t('ui.widgets.lockScreen.title')"
      class="mr-1"
      @click="handleOpenLock"
    >
      <LockKeyhole class="text-foreground size-4" />
    </VbenIconButton>
  </template>
</template>
