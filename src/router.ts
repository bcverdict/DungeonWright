import { createRouter, createWebHashHistory } from 'vue-router'
import DmView from './views/DmView.vue'
import PlayerView from './views/PlayerView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: DmView },
    { path: '/player', component: PlayerView },
  ],
})
