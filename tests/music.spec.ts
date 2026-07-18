import { expect, test } from '@playwright/test'
import {
  acceptDialog,
  addTrack,
  gotoDm,
  openTab,
  selectScene,
  uploadScenes,
} from './helpers'

const URL_A = 'https://www.youtube.com/watch?v=aaaaaaaaaaa'
const URL_B = 'https://www.youtube.com/watch?v=bbbbbbbbbbb'

test.describe('music', () => {
  test('add form validates and creates a track', async ({ page }) => {
    await gotoDm(page)
    await openTab(page, 'Music')

    await page.getByRole('button', { name: 'Add YouTube track' }).click()
    await expect(page.locator('.form-title')).toHaveText('New track')
    const save = page.getByRole('button', { name: 'Add', exact: true })
    await expect(save).toBeDisabled()

    await page.getByPlaceholder('Title (e.g. Intense)').fill('Battle Theme')
    await expect(save).toBeDisabled()
    await page.getByPlaceholder('YouTube URL').fill(URL_A)
    await expect(save).toBeEnabled()
    await page
      .getByPlaceholder('Notes (e.g. Play this when they spring the trap)')
      .fill('Play when combat starts')
    await save.click()

    const track = page.locator('.track', { hasText: 'Battle Theme' })
    await expect(track.locator('.track-title')).toHaveText(/Battle Theme/)
    await expect(track.locator('.track-title')).toHaveAttribute('href', URL_A)
    await expect(track.locator('.track-notes')).toHaveText('Play when combat starts')
    // Form closes after adding.
    await expect(page.locator('.track-form')).toBeHidden()
  })

  test('cancel closes the form without adding', async ({ page }) => {
    await gotoDm(page)
    await openTab(page, 'Music')
    await page.getByRole('button', { name: 'Add YouTube track' }).click()
    await page.getByPlaceholder('Title (e.g. Intense)').fill('Nope')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.track-form')).toBeHidden()
    await expect(page.locator('.track')).toHaveCount(0)
  })

  test('edit an existing track', async ({ page }) => {
    await gotoDm(page)
    await addTrack(page, 'Battle Theme', URL_A)

    await page.locator('.track button[title="Edit"]').click()
    await expect(page.locator('.form-title')).toHaveText('Edit track')
    await expect(page.getByPlaceholder('Title (e.g. Intense)')).toHaveValue('Battle Theme')

    await page.getByPlaceholder('Title (e.g. Intense)').fill('Boss Theme')
    await page.getByPlaceholder('YouTube URL').fill(URL_B)
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.locator('.track-title')).toHaveText(/Boss Theme/)
    await expect(page.locator('.track-title')).toHaveAttribute('href', URL_B)
  })

  test('delete a track after confirming', async ({ page }) => {
    await gotoDm(page)
    await addTrack(page, 'Battle Theme', URL_A)

    acceptDialog(page)
    await page.locator('.track button[title="Delete"]').click()
    await expect(page.locator('.track')).toHaveCount(0)
  })

  test('attach and detach tracks to the current scene', async ({ page }) => {
    await gotoDm(page)
    await addTrack(page, 'Battle Theme', URL_A, 'Play in combat')

    // Without a scene the attach button is disabled.
    const attach = page.locator('.attach-btn')
    await expect(attach).toBeDisabled()
    await expect(attach).toHaveText('Select a scene to attach')

    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')
    await openTab(page, 'Music')
    await expect(attach).toHaveText('Attach to Forest')
    await attach.click()
    await expect(attach).toHaveText('Attached to Forest — click to detach')
    await expect(attach).toHaveClass(/attached/)

    // The side column music box lists the attached track.
    const musicBox = page.locator('.music-box')
    await expect(musicBox.locator('h2')).toHaveText('Music — Forest')
    await expect(musicBox.locator('.music-track-row a')).toHaveText(/Battle Theme/)
    await expect(musicBox.locator('.music-track-notes')).toHaveText('Play in combat')

    // Detach from the side box.
    await musicBox.locator('button[title="Detach from this scene"]').click()
    await expect(musicBox.locator('.music-empty')).toHaveText(
      'No tracks attached. Add some in the Music tab.',
    )
    await expect(attach).toHaveText('Attach to Forest')
  })

  test('deleting an attached track removes it from the scene music box', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await selectScene(page, 'Forest')
    await addTrack(page, 'Battle Theme', URL_A)
    await page.locator('.attach-btn').click()
    await expect(page.locator('.music-box .music-track')).toHaveCount(1)

    acceptDialog(page)
    await page.locator('.track button[title="Delete"]').click()
    await expect(page.locator('.music-box .music-track')).toHaveCount(0)
    await expect(page.locator('.music-box .music-empty')).toBeVisible()
  })
})
