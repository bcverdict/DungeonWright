import { expect, test } from '@playwright/test'
import {
  acceptDialog,
  card,
  dismissDialog,
  gotoDm,
  mapNode,
  placeCharacter,
  previewTokens,
  selectScene,
  uploadCharacters,
  uploadScenes,
} from './helpers'

test.describe('scenes', () => {
  test('upload scenes and select one into the preview', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])

    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Forest', 'Cave'])
    await expect(page.locator('.sidebar-body .card img').first()).toHaveAttribute(
      'src',
      /blob:/,
    )

    await selectScene(page, 'Forest')
    await expect(page.locator('.scene-title h1')).toHaveText('Forest')
    await expect(page.locator('.preview-col .stage img.scene-img')).toHaveAttribute(
      'src',
      /blob:/,
    )
    // Selecting a scene makes the preview differ from the (blank) live screen.
    await expect(page.locator('.badge.dirty')).toBeVisible()

    // Switching scenes updates the title and active card.
    await selectScene(page, 'Cave')
    await expect(page.locator('.scene-title h1')).toHaveText('Cave')
    await expect(card(page, 'Forest')).not.toHaveClass(/active/)
  })

  test('characters move along when transitioning to another scene', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])
    await uploadCharacters(page, ['Hero', 'Goblin'])
    await selectScene(page, 'Forest')
    await placeCharacter(page, 'Hero')
    await placeCharacter(page, 'Goblin')

    await selectScene(page, 'Cave')
    await expect(previewTokens(page)).toHaveCount(2)

    // The party left Forest, so only Cave shows presence dots on the map.
    await expect(mapNode(page, 'Cave').locator('circle.char-dot')).toHaveCount(2)
    await expect(mapNode(page, 'Forest').locator('circle.char-dot')).toHaveCount(0)
  })

  test('rename a scene via prompt', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])

    await card(page, 'Forest').hover()
    acceptDialog(page, 'Enchanted Forest')
    await card(page, 'Forest').locator('button[title="Rename"]').click()
    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Enchanted Forest'])
  })

  test('cancelling rename keeps the old name', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])

    await card(page, 'Forest').hover()
    dismissDialog(page)
    await card(page, 'Forest').locator('button[title="Rename"]').click()
    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Forest'])
  })

  test('delete a scene, including the currently selected one', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])
    await selectScene(page, 'Forest')

    await card(page, 'Forest').hover()
    acceptDialog(page)
    await card(page, 'Forest').locator('button[title="Delete"]').click()

    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Cave'])
    await expect(page.locator('.scene-title h1')).toHaveText('No scene selected')
    await expect(page.locator('.preview-col .stage .empty-scene')).toBeVisible()
  })

  test('notes are scoped per scene and general when no scene is selected', async ({ page }) => {
    await gotoDm(page)
    const notes = page.locator('.notes-box textarea')

    // General notes before any scene is selected.
    await expect(page.locator('.notes-box h2')).toHaveText('Notes — General')
    await notes.fill('General campaign notes')

    await uploadScenes(page, ['Forest', 'Cave'])
    await selectScene(page, 'Forest')
    await expect(page.locator('.notes-box h2')).toHaveText('Notes — Forest')
    await expect(notes).toHaveValue('')
    await notes.fill('Forest has a hidden path, DC 15')

    await selectScene(page, 'Cave')
    await expect(page.locator('.notes-box h2')).toHaveText('Notes — Cave')
    await expect(notes).toHaveValue('')
    await notes.fill('Cave: goblin ambush')

    await selectScene(page, 'Forest')
    await expect(notes).toHaveValue('Forest has a hidden path, DC 15')
  })
})
