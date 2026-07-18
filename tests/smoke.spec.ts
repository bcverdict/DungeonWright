import { expect, test } from '@playwright/test'
import { gotoDm, openTab } from './helpers'

test.describe('smoke', () => {
  test('DM view loads with default state', async ({ page }) => {
    await gotoDm(page)

    await expect(page.locator('.scene-title h1')).toHaveText('No scene selected')
    await expect(page.locator('.badge.synced')).toHaveText('Player screen up to date')
    await expect(page.locator('select[title="Switch campaign"] option')).toHaveText([
      'My Campaign',
    ])

    // Both stages start empty.
    await expect(page.locator('.preview-col .stage .empty-scene')).toHaveText('No scene')
    await expect(page.locator('.live-box .stage .empty-scene')).toHaveText('No scene')
    await expect(page.locator('.live-name')).toHaveText('Blank')

    // The map fills the main screen and starts with its empty hint.
    await expect(page.getByRole('button', { name: 'Connect scenes' })).toBeVisible()
    await expect(page.locator('.map-panel .hint').first()).toContainText('Add scenes first')

    // Buttons that need content are disabled.
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Prev screen' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Next screen' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Clear characters' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Update player screen' })).toBeDisabled()

    // Notes default to general scope.
    await expect(page.locator('.notes-box h2')).toHaveText('Notes — General')
  })

  test('sidebar tabs switch panels', async ({ page }) => {
    await gotoDm(page)

    await expect(page.getByRole('button', { name: 'Add scene images' })).toBeVisible()

    await openTab(page, 'Characters')
    await expect(page.getByRole('button', { name: 'Add character images' })).toBeVisible()

    await openTab(page, 'Music')
    await expect(page.getByRole('button', { name: 'Add YouTube track' })).toBeVisible()

    await openTab(page, 'Scenes')
    await expect(page.getByRole('button', { name: 'Add scene images' })).toBeVisible()
    await expect(page.locator('nav.tabs button', { hasText: 'Scenes' })).toHaveClass(/active/)
  })

  test('player view loads blank', async ({ page }) => {
    await page.goto('/#/player')
    await expect(page.locator('.player-screen .stage .empty-scene')).toHaveText('No scene')
  })
})
