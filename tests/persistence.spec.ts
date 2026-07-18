import { expect, test } from '@playwright/test'
import {
  addTrack,
  gotoDm,
  liveTokens,
  placeCharacter,
  previewTokens,
  publish,
  selectScene,
  uploadCharacters,
  uploadScenes,
} from './helpers'

test.describe('persistence across reloads', () => {
  test('scenes, characters, notes, music, and the live screen survive a reload', async ({
    page,
  }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await uploadCharacters(page, ['Hero'])
    await selectScene(page, 'Forest')
    await placeCharacter(page, 'Hero')
    await page.locator('.notes-box textarea').fill('Secret door behind the waterfall')
    await addTrack(page, 'Ambience', 'https://www.youtube.com/watch?v=ccccccccccc')
    await publish(page)

    await page.reload()
    await expect(page.locator('.brand')).toHaveText('Dungeon Wright')

    // Draft and assets restored, including images out of IndexedDB.
    await expect(page.locator('.scene-title h1')).toHaveText('Forest')
    await expect(page.locator('.preview-col .stage img.scene-img')).toHaveAttribute(
      'src',
      /blob:/,
    )
    await expect(previewTokens(page)).toHaveCount(1)
    await expect(page.locator('.notes-box textarea')).toHaveValue(
      'Secret door behind the waterfall',
    )

    // Live screen still matches, so no dirty badge.
    await expect(page.locator('.badge.synced')).toBeVisible()
    await expect(liveTokens(page)).toHaveCount(1)
    await expect(page.locator('.live-name')).toHaveText('Forest')

    // Music library restored.
    await page.locator('nav.tabs button', { hasText: 'Music' }).click()
    await expect(page.locator('.track-title')).toHaveText(/Ambience/)

    // Undo history is in-memory only and resets on reload.
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  test('the player page restores the live view from storage on load', async ({
    page,
    context,
  }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await uploadCharacters(page, ['Hero'])
    await selectScene(page, 'Forest')
    await placeCharacter(page, 'Hero')
    await publish(page)

    await page.close()

    const player = await context.newPage()
    await player.goto('/#/player')
    await expect(player.locator('.player-screen .stage img.scene-img')).toHaveAttribute(
      'src',
      /blob:/,
    )
    await expect(player.locator('.player-screen .stage .token')).toHaveCount(1)
  })

  test('screen history survives a reload', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])
    await selectScene(page, 'Forest')
    await publish(page)
    await selectScene(page, 'Cave')
    await publish(page)

    await page.reload()
    await expect(page.getByRole('button', { name: 'Prev screen' })).toBeEnabled()
    await page.getByRole('button', { name: 'Prev screen' }).click()
    await expect(page.locator('.scene-title h1')).toHaveText('Forest')
  })
})
