<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { computed } from 'vue';

import { AuthenticationLogin } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { z } from '#/adapter/form';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        class: 'login-role-group',
        optionType: 'button',
        options: [
          { label: $t('authentication.roleAdmin'), value: 'admin' },
          { label: $t('authentication.roleTeacher'), value: 'teacher' },
          { label: $t('authentication.roleStudent'), value: 'student' },
        ],
        size: 'large',
      },
      defaultValue: 'admin',
      fieldName: 'role',
      rules: z.enum(['admin', 'student', 'teacher'], {
        errorMap: () => ({ message: $t('authentication.selectRoleTip') }),
      }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-third-party-login="false"
    @submit="authStore.authLogin"
  />
</template>

<style>
.login-role-group {
  display: flex;
  width: 100%;
}

.login-role-group .ant-radio-button-wrapper {
  flex: 1;
  text-align: center;
}
</style>
