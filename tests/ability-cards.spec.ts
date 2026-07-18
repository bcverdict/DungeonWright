import { expect, test, type Page } from '@playwright/test'
import { acceptDialog, gotoDm } from './helpers'

async function openCards(page: Page): Promise<void> {
  await gotoDm(page)
  await page.getByRole('button', { name: 'Ability cards' }).click()
  await expect(page.locator('.cards-page h1')).toHaveText('Ability cards')
}

test.describe('ability cards', () => {
  test('opens with a default card per homebrew ability, art included', async ({ page }) => {
    await openCards(page)

    const cards = page.locator('.ability-card')
    await expect(cards).toHaveCount(5)

    // Every default card ships with bundled art.
    for (let i = 0; i < 5; i++) {
      await expect(cards.nth(i).locator('.card-art img')).toBeVisible()
    }

    const titles = await page.locator('.card-title').evaluateAll(
      (els) => els.map((el) => (el as HTMLInputElement).value),
    )
    expect(titles).toEqual([
      "Thoth's Tongue",
      'Eye of Anubis',
      'Steps of Sicarius',
      "Obelisk's Might",
      '???',
    ])
  })

  test('card edits persist across a reload', async ({ page }) => {
    await openCards(page)

    const first = page.locator('.ability-card').first()
    await first.locator('.card-title').fill('Silver Tongue')
    await first.locator('.card-flavor').fill('Words sharper than any blade.')
    await first.locator('.card-description').fill('Reroll any failed Persuasion check once per day.')

    await page.reload()
    const reloaded = page.locator('.ability-card').first()
    await expect(reloaded.locator('.card-title')).toHaveValue('Silver Tongue')
    await expect(reloaded.locator('.card-flavor')).toHaveValue('Words sharper than any blade.')
    await expect(reloaded.locator('.card-description')).toHaveValue(
      'Reroll any failed Persuasion check once per day.',
    )
  })

  test('cards can be added and deleted', async ({ page }) => {
    await openCards(page)
    await expect(page.locator('.ability-card')).toHaveCount(5)

    await page.getByRole('button', { name: 'New card' }).click()
    await expect(page.locator('.ability-card')).toHaveCount(6)
    await expect(page.locator('.card-title').last()).toHaveValue('New ability')

    acceptDialog(page)
    await page.locator('.card-row').last().getByRole('button', { name: 'Delete' }).click()
    await expect(page.locator('.ability-card')).toHaveCount(5)
  })

  test('changing the art swaps the picture', async ({ page }) => {
    await openCards(page)

    const first = page.locator('.card-row').first()
    const before = await first.locator('.card-art img').getAttribute('src')
    await first.getByLabel('Card art').selectOption('unknown')
    await expect(first.locator('.card-art img')).not.toHaveAttribute('src', before!)
  })

  test('back button returns to the DM view', async ({ page }) => {
    await openCards(page)
    await page.getByRole('button', { name: 'Back to campaign' }).click()
    await expect(page.locator('.map-panel')).toBeVisible()
  })
})
