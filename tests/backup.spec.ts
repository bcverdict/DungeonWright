import { expect, test } from '@playwright/test'
import {
  acceptDialog,
  addTrack,
  card,
  gotoDm,
  openTab,
  selectScene,
  uploadCharacters,
  uploadScenes,
} from './helpers'

test.describe('file backup', () => {
  test('save to file, wipe the browser, and load everything back', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await uploadCharacters(page, ['Hero'])
    await selectScene(page, 'Forest')
    await addTrack(page, 'Ambience', 'https://www.youtube.com/watch?v=aaaaaaaaaaa')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save to file' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^dungeon-wright-backup-.*\.json$/)
    const filePath = await download.path()

    // Simulate losing the browser data (fresh browser / cleared site data).
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await openTab(page, 'Scenes')
    await expect(page.locator('.sidebar-body .card')).toHaveCount(0)

    acceptDialog(page)
    await page.locator('.backup-bar input[type="file"]').setInputFiles(filePath)

    // importBackup reloads the page once storage is rewritten.
    await expect(page.locator('.scene-title h1')).toHaveText('Forest')
    await openTab(page, 'Scenes')
    await expect(card(page, 'Forest')).toBeVisible()
    await openTab(page, 'Characters')
    await expect(card(page, 'Hero')).toBeVisible()
    await openTab(page, 'Music')
    await expect(page.locator('.track-title')).toHaveText(/Ambience/)
  })

  test('loading a non-backup file is rejected without wiping anything', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])

    // First dialog is the replace-all confirm, second is the error alert.
    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      void d.accept()
    })
    await page.locator('.backup-bar input[type="file"]').setInputFiles({
      name: 'not-a-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ hello: 'world' })),
    })

    await expect
      .poll(() => dialogs.some((m) => m.includes('not a Dungeon Wright backup')))
      .toBe(true)
    await openTab(page, 'Scenes')
    await expect(card(page, 'Forest')).toBeVisible()
  })
})
