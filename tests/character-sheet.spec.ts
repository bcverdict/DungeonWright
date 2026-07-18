import { expect, test, type Page } from '@playwright/test'
import { card, gotoDm, uploadCharacters } from './helpers'

async function openSheet(page: Page, name: string): Promise<void> {
  await card(page, name).hover()
  await card(page, name).locator('button[title="Edit character sheet"]').click()
  await expect(page.locator('.sheet')).toBeVisible()
}

test.describe('character sheet', () => {
  test('edit opens the sheet with portrait and default stats', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await openSheet(page, 'Hero')

    expect(page.url()).toContain('#/character/')
    await expect(page.locator('.portrait')).toBeVisible()
    await expect(page.locator('.name-input')).toHaveValue('Hero')

    // Level 1 defaults: proficiency +2, all ability mods +0.
    const profBonus = page.locator('.field.readonly', { hasText: 'Prof. bonus' })
    await expect(profBonus.locator('.derived')).toHaveText('+2')
    await expect(page.locator('.ability-mod')).toHaveText(['+0', '+0', '+0', '+0', '+0', '+0'])
    await expect(page.getByLabel('STR score')).toHaveValue('10')
  })

  test('derived values follow level, abilities, and proficiencies', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await openSheet(page, 'Hero')

    await page.getByLabel('Level').fill('5')
    const profBonus = page.locator('.field.readonly', { hasText: 'Prof. bonus' })
    await expect(profBonus.locator('.derived')).toHaveText('+3')

    await page.getByLabel('DEX score').fill('16')
    const initiative = page.locator('.field.readonly', { hasText: 'Initiative' })
    await expect(initiative.locator('.derived')).toHaveText('+3')

    // Stealth = DEX mod (+3), plus proficiency (+3) once checked.
    const stealth = page.locator('.skill', { hasText: 'Stealth' })
    await expect(stealth.locator('.skill-bonus')).toHaveText('+3')
    await stealth.locator('input[type="checkbox"]').check()
    await expect(stealth.locator('.skill-bonus')).toHaveText('+6')
  })

  test('sheet edits persist across a reload', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await openSheet(page, 'Hero')

    await page.getByLabel('Race').fill('Half-Elf')
    await page.getByLabel('Class', { exact: true }).fill('Ranger')
    await page.getByLabel('Armor Class').fill('17')
    const perception = page.locator('.skill', { hasText: 'Perception' })
    await perception.locator('input[type="checkbox"]').check()

    await page.reload()
    await expect(page.locator('.name-input')).toHaveValue('Hero')
    await expect(page.getByLabel('Race')).toHaveValue('Half-Elf')
    await expect(page.getByLabel('Class', { exact: true })).toHaveValue('Ranger')
    await expect(page.getByLabel('Armor Class')).toHaveValue('17')
    await expect(perception.locator('input[type="checkbox"]')).toBeChecked()
  })

  test('back button returns to the DM view', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await openSheet(page, 'Hero')

    await page.getByRole('button', { name: 'Back to campaign' }).click()
    await expect(page.locator('.map-panel')).toBeVisible()
    await expect(page.locator('.preview-col .stage')).toBeVisible()
  })

  test('sheet for a deleted character shows a friendly message', async ({ page }) => {
    await gotoDm(page)
    await page.goto('/#/character/nonexistent')
    await expect(page.locator('.missing')).toContainText('no longer exists')
  })

  test('switching to the Homebrew sheet shows its own fields', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await openSheet(page, 'Hero')

    // Defaults to D&D 5e with its skills list.
    await expect(page.getByLabel('Sheet type')).toHaveValue('dnd5e')
    await expect(page.locator('.skill')).toHaveCount(18)

    await page.getByLabel('Sheet type').selectOption('Homebrew')

    // 5e-only sections disappear, homebrew fields appear.
    await expect(page.locator('.skill')).toHaveCount(0)
    await expect(page.getByLabel('Race')).toHaveCount(0)
    await expect(page.locator('.name-input')).toHaveValue('Hero')
    await expect(page.getByLabel('Occupation')).toBeVisible()
    await expect(page.getByLabel('Current HP')).toBeVisible()
    await expect(page.getByLabel('Max HP')).toBeVisible()

    // The ability dropdown offers exactly the homebrew abilities.
    await expect(page.getByLabel('Ability', { exact: true }).locator('option')).toHaveText([
      'Select an ability…',
      "Thoth's Tongue",
      'Eye of Anubis',
      'Steps of Sicarius',
      "Obelisk's Might",
      '???',
    ])
  })

  test('homebrew edits persist and the two sheets keep separate data', async ({ page }) => {
    await gotoDm(page)
    await uploadCharacters(page, ['Hero'])
    await openSheet(page, 'Hero')

    // Give the 5e sheet some data first.
    await page.getByLabel('Class', { exact: true }).fill('Ranger')

    await page.getByLabel('Sheet type').selectOption('Homebrew')
    await page.getByLabel('Occupation').fill('Gravekeeper')
    await page.getByLabel('Current HP').fill('7')
    await page.getByLabel('Max HP').fill('12')
    await page.getByLabel('Ability', { exact: true }).selectOption('Eye of Anubis')
    await page.locator('textarea').fill('Never sleeps.')

    await page.reload()
    await expect(page.getByLabel('Sheet type')).toHaveValue('homebrew')
    await expect(page.getByLabel('Occupation')).toHaveValue('Gravekeeper')
    await expect(page.getByLabel('Current HP')).toHaveValue('7')
    await expect(page.getByLabel('Max HP')).toHaveValue('12')
    await expect(page.getByLabel('Ability', { exact: true })).toHaveValue('Eye of Anubis')
    await expect(page.locator('textarea')).toHaveValue('Never sleeps.')

    // Switching back shows the untouched 5e data.
    await page.getByLabel('Sheet type').selectOption('D&D 5e')
    await expect(page.getByLabel('Class', { exact: true })).toHaveValue('Ranger')
    await expect(page.getByLabel('Current HP')).toHaveValue('10')
  })
})
