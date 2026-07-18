import { expect, test } from '@playwright/test'
import {
  acceptDialog,
  dismissDialog,
  gotoDm,
  publish,
  selectScene,
  uploadScenes,
} from './helpers'

const select = (page: import('@playwright/test').Page) =>
  page.locator('select[title="Switch campaign"]')

test.describe('campaigns', () => {
  test('create a campaign and keep content isolated per campaign', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')
    await page.locator('.notes-box textarea').fill('Forest notes')

    acceptDialog(page, 'One-Shot Night')
    await page.locator('button[title="New campaign / one-shot"]').click()

    // New campaign becomes active and starts empty.
    await expect(select(page).locator('option:checked')).toHaveText('One-Shot Night')
    await expect(page.locator('.sidebar-body .card')).toHaveCount(0)
    await expect(page.locator('.scene-title h1')).toHaveText('No scene selected')
    await expect(page.locator('.notes-box h2')).toHaveText('Notes — General')

    // Switching back restores the original campaign's content.
    await select(page).selectOption({ label: 'My Campaign' })
    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Forest'])
    await expect(page.locator('.scene-title h1')).toHaveText('Forest')
    await expect(page.locator('.notes-box textarea')).toHaveValue('Forest notes')
  })

  test('cancelling the new-campaign prompt does nothing', async ({ page }) => {
    await gotoDm(page)
    dismissDialog(page)
    await page.locator('button[title="New campaign / one-shot"]').click()
    await expect(select(page).locator('option')).toHaveCount(1)
  })

  test('rename the active campaign', async ({ page }) => {
    await gotoDm(page)
    acceptDialog(page, 'Curse of Strahd')
    await page.locator('button[title="Rename campaign"]').click()
    await expect(select(page).locator('option:checked')).toHaveText('Curse of Strahd')
  })

  test('delete a campaign and fall back to the remaining one', async ({ page }) => {
    await gotoDm(page)
    acceptDialog(page, 'Doomed Campaign')
    await page.locator('button[title="New campaign / one-shot"]').click()
    await expect(select(page).locator('option')).toHaveCount(2)

    acceptDialog(page)
    await page.locator('button[title="Delete campaign"]').click()
    await expect(select(page).locator('option')).toHaveCount(1)
    await expect(select(page).locator('option:checked')).toHaveText('My Campaign')
  })

  test('deleting the last campaign creates a fresh default one', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])

    acceptDialog(page)
    await page.locator('button[title="Delete campaign"]').click()

    await expect(select(page).locator('option')).toHaveCount(1)
    await expect(select(page).locator('option:checked')).toHaveText('My Campaign')
    await expect(page.locator('.sidebar-body .card')).toHaveCount(0)
  })

  test('switching campaigns updates the live player screen', async ({ page, context }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')
    await publish(page)

    const player = await context.newPage()
    await player.goto('/#/player')
    await expect(player.locator('.player-screen .stage img.scene-img')).toBeVisible()

    // A brand-new campaign has a blank committed screen; player should follow.
    acceptDialog(page, 'Blank Campaign')
    await page.locator('button[title="New campaign / one-shot"]').click()
    await expect(player.locator('.player-screen .stage .empty-scene')).toBeVisible()

    // Switching back re-publishes the original campaign's live screen.
    await select(page).selectOption({ label: 'My Campaign' })
    await expect(player.locator('.player-screen .stage img.scene-img')).toBeVisible()
  })
})
