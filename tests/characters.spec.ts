import { expect, test } from '@playwright/test'
import {
  acceptDialog,
  card,
  dragTokenTo,
  gotoDm,
  openTab,
  placeCharacter,
  previewTokens,
  uploadCharacters,
  uploadScenes,
} from './helpers'

test.describe('characters', () => {
  test('upload characters and place them by clicking', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero', 'Goblin'])

    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Hero', 'Goblin'])

    await placeCharacter(page, 'Hero')
    await placeCharacter(page, 'Goblin')
    await expect(previewTokens(page)).toHaveCount(2)

    // Characters without a scene shows "Characters only".
    await expect(page.locator('.scene-title h1')).toHaveText('Characters only')
    await expect(page.locator('.badge.dirty')).toBeVisible()
  })

  test('drop a character onto the stage at a specific position', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])

    // Simulate the HTML5 drop the panel's drag would produce.
    await page.evaluate(() => {
      const campaignId = localStorage.getItem('dw:activeCampaign:v1')!
      const state = JSON.parse(localStorage.getItem(`dw:state:v1:${campaignId}`)!)
      const characterId = state.characters[0].id as string
      const stage = document.querySelector('.preview-col .stage')!
      const rect = stage.getBoundingClientRect()
      const dt = new DataTransfer()
      dt.setData('application/x-dw-character', characterId)
      stage.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          dataTransfer: dt,
          clientX: rect.left + rect.width * 0.25,
          clientY: rect.top + rect.height * 0.25,
        }),
      )
    })

    await expect(previewTokens(page)).toHaveCount(1)
    const left = await previewTokens(page).first().evaluate((el) => el.style.left)
    const top = await previewTokens(page).first().evaluate((el) => el.style.top)
    expect(parseFloat(left)).toBeCloseTo(25, 0)
    expect(parseFloat(top)).toBeCloseTo(25, 0)
  })

  test('select a token to resize and remove it', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await placeCharacter(page, 'Hero')

    const token = previewTokens(page).first()
    await token.click()
    await expect(token).toHaveClass(/selected/)
    await expect(page.locator('.token-label')).toHaveText('Hero')

    const heightOf = () => token.evaluate((el) => parseFloat(el.style.height))
    const initial = await heightOf()

    await page.locator('.token-controls button[title="Larger"]').click()
    expect(await heightOf()).toBeGreaterThan(initial)

    await page.locator('.token-controls button[title="Smaller"]').click()
    await page.locator('.token-controls button[title="Smaller"]').click()
    expect(await heightOf()).toBeLessThan(initial)

    await page.locator('.token-controls button[title="Remove from screen"]').click()
    await expect(previewTokens(page)).toHaveCount(0)
    await expect(page.locator('.scene-title h1')).toHaveText('No scene selected')
  })

  test('scroll wheel resizes a token', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await placeCharacter(page, 'Hero')

    const token = previewTokens(page).first()
    const heightOf = () => token.evaluate((el) => parseFloat(el.style.height))
    const initial = await heightOf()

    await token.hover()
    await page.mouse.wheel(0, -120) // scroll up = larger
    expect(await heightOf()).toBeGreaterThan(initial)

    await page.mouse.wheel(0, 120)
    await page.mouse.wheel(0, 120)
    expect(await heightOf()).toBeLessThan(initial)
  })

  test('drag a token to move it', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await placeCharacter(page, 'Hero')

    const stage = page.locator('.preview-col .stage')
    const stageBox = (await stage.boundingBox())!
    const token = previewTokens(page).first()

    await dragTokenTo(
      page,
      token,
      stageBox.x + stageBox.width * 0.2,
      stageBox.y + stageBox.height * 0.3,
    )

    const left = await token.evaluate((el) => parseFloat(el.style.left))
    const top = await token.evaluate((el) => parseFloat(el.style.top))
    expect(left).toBeCloseTo(20, 0)
    expect(top).toBeCloseTo(30, 0)
  })

  test('clear characters removes all tokens', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero', 'Goblin'])
    await placeCharacter(page, 'Hero')
    await placeCharacter(page, 'Goblin')

    await page.getByRole('button', { name: 'Clear characters' }).click()
    await expect(previewTokens(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Clear characters' })).toBeDisabled()
  })

  test('undo and redo preview edits via buttons and keyboard', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])

    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
    await placeCharacter(page, 'Hero')

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(previewTokens(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(previewTokens(page)).toHaveCount(1)

    // Keyboard shortcuts (focus must be outside inputs).
    await page.locator('.brand').click()
    await page.keyboard.press('ControlOrMeta+z')
    await expect(previewTokens(page)).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await expect(previewTokens(page)).toHaveCount(1)
  })

  test('deleting a character removes it from the stage too', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await uploadCharacters(page, ['Hero', 'Goblin'])
    await placeCharacter(page, 'Hero')
    await placeCharacter(page, 'Goblin')

    await card(page, 'Goblin').hover()
    acceptDialog(page)
    await card(page, 'Goblin').locator('button[title="Delete"]').click()

    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Hero'])
    await expect(previewTokens(page)).toHaveCount(1)
  })

  test('rename a character from the character sheet', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])

    await card(page, 'Hero').hover()
    await card(page, 'Hero').locator('button[title="Edit character sheet"]').click()
    await page.locator('.name-input').fill('Sir Galahad')
    await page.getByRole('button', { name: 'Back to campaign' }).click()
    await openTab(page, 'Characters')
    await expect(page.locator('.sidebar-body .card-name')).toHaveText(['Sir Galahad'])
  })
})
