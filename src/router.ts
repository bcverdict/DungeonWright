import { createRouter, createWebHashHistory } from 'vue-router'
import DmView from './views/DmView.vue'
import PlayerView from './views/PlayerView.vue'
import CharacterSheetView from './views/CharacterSheetView.vue'
import AbilityCardsView from './views/AbilityCardsView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: DmView },
    { path: '/player', component: PlayerView },
    { path: '/character/:id', component: CharacterSheetView },
    { path: '/ability-cards', component: AbilityCardsView },
  ],
})
