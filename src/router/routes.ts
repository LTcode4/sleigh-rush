import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'HomePage',
        component: () => import('pages/HomePage.vue'),
      },
      {
        path: 'sleigh',
        name: 'SleighPage',
        component: () => import('pages/SleighPage.vue'),
      },
      {
        path: 'game',
        name: 'GamePage',
        component: () => import('pages/GamePage.vue'),
      },
      {
        path: 'result',
        name: 'ResultPage',
        component: () => import('pages/ResultPage.vue'),
      },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
