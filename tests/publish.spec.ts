import { expect, test } from '@playwright/test'
import {
  acceptDialog,
  card,
  gotoDm,
  liveTokens,
  openTab,
  placeCharacter,
  previewTokens,
  publish,
  selectScene,
  uploadCharacters,
  uploadScenes,
} from './helpers'

test.describe('publishing to the player screen', () => {
  test('update player screen syncs the live stage', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')

    await expect(page.locator('.badge.dirty')).toBeVisible()
    await expect(page.locator('.live-box')).toHaveClass(/stale/)

    await publish(page)
    await expect(page.locator('.live-name')).toHaveText('Forest')
    await expect(page.locator('.live-box .stage img.scene-img')).toHaveAttribute('src', /blob:/)
    await expect(page.locator('.live-box')).not.toHaveClass(/stale/)
    await expect(page.getByRole('button', { name: 'Update player screen' })).toBeDisabled()

    // Adding a character makes it dirty again; publishing syncs tokens.
    await uploadCharacters(page, ['Hero'])
    await placeCharacter(page, 'Hero')
    await expect(page.locator('.badge.dirty')).toBeVisible()
    await expect(liveTokens(page)).toHaveCount(0)
    await publish(page)
    await expect(liveTokens(page)).toHaveCount(1)
  })

  test('player page shows the published screen and live-updates', async ({ page, context }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await uploadCharacters(page, ['Hero'])
    await selectScene(page, 'Forest')
    await placeCharacter(page, 'Hero')
    await publish(page)

    // A player tab opened later loads the snapshot from storage.
    const player = await context.newPage()
    await player.goto('/#/player')
    await expect(player.locator('.player-screen .stage img.scene-img')).toHaveAttribute(
      'src',
      /blob:/,
    )
    await expect(player.locator('.player-screen .stage .token')).toHaveCount(1)

    // Live update over BroadcastChannel: clear characters and republish.
    await page.getByRole('button', { name: 'Clear characters' }).click()
    await publish(page)
    await expect(player.locator('.player-screen .stage .token')).toHaveCount(0)
    await expect(player.locator('.player-screen .stage img.scene-img')).toBeVisible()
  })

  test('open player window button opens the player popup', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')
    await publish(page)

    const popupPromise = page.waitForEvent('popup')
    await page.getByRole('button', { name: 'Open player window' }).click()
    const popup = await popupPromise
    await expect(popup.locator('.player-screen .stage img.scene-img')).toHaveAttribute(
      'src',
      /blob:/,
    )
  })

  test('prev/next screen steps through publish history', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])

    await selectScene(page, 'Forest')
    await publish(page)
    await expect(page.getByRole('button', { name: 'Prev screen' })).toBeDisabled()

    await selectScene(page, 'Cave')
    await publish(page)
    await expect(page.getByRole('button', { name: 'Prev screen' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Next screen' })).toBeDisabled()

    await page.getByRole('button', { name: 'Prev screen' }).click()
    await expect(page.locator('.scene-title h1')).toHaveText('Forest')
    // Reviewing an older screen differs from the live one.
    await expect(page.locator('.badge.dirty')).toBeVisible()

    await page.getByRole('button', { name: 'Next screen' }).click()
    await expect(page.locator('.scene-title h1')).toHaveText('Cave')
    await expect(page.locator('.badge.synced')).toBeVisible()
  })

  test('deleting the live scene clears it from the player screen', async ({ page, context }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')
    await publish(page)

    const player = await context.newPage()
    await player.goto('/#/player')
    await expect(player.locator('.player-screen .stage img.scene-img')).toBeVisible()

    await openTab(page, 'Scenes')
    await card(page, 'Forest').hover()
    acceptDialog(page)
    await card(page, 'Forest').locator('button[title="Delete"]').click()

    // The DM live box and the actual player screen must agree: both blank.
    await expect(page.locator('.live-name')).toHaveText('Blank')
    await expect(player.locator('.player-screen .stage .empty-scene')).toBeVisible()
  })

  test('deleting a character on the live screen removes it from the player screen', async ({
    page,
    context,
  }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await placeCharacter(page, 'Hero')
    await publish(page)

    const player = await context.newPage()
    await player.goto('/#/player')
    await expect(player.locator('.player-screen .stage .token')).toHaveCount(1)

    await openTab(page, 'Characters')
    await card(page, 'Hero').hover()
    acceptDialog(page)
    await card(page, 'Hero').locator('button[title="Delete"]').click()

    await expect(liveTokens(page)).toHaveCount(0)
    await expect(player.locator('.player-screen .stage .token')).toHaveCount(0)
  })

  test('live name reads Characters only / Blank without a scene', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await placeCharacter(page, 'Hero')
    await publish(page)
    await expect(page.locator('.live-name')).toHaveText('Characters only')

    await page.getByRole('button', { name: 'Clear characters' }).click()
    await publish(page)
    await expect(page.locator('.live-name')).toHaveText('Blank')
  })
})
