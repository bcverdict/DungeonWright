import { expect, type Locator, type Page } from '@playwright/test'

/** 1x1 transparent PNG. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
export const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64')

export function pngFile(name: string): { name: string; mimeType: string; buffer: Buffer } {
  return { name: `${name}.png`, mimeType: 'image/png', buffer: PNG_BUFFER }
}

export async function gotoDm(page: Page): Promise<void> {
  await page.goto('/#/')
  await expect(page.locator('.brand')).toHaveText('Dungeon Wright')
}

/** Accept the next native dialog (prompt/confirm), optionally typing promptText. */
export function acceptDialog(page: Page, promptText?: string): void {
  page.once('dialog', (d) => void d.accept(promptText))
}

export function dismissDialog(page: Page): void {
  page.once('dialog', (d) => void d.dismiss())
}

export async function openTab(
  page: Page,
  tab: 'Scenes' | 'Characters' | 'Music',
): Promise<void> {
  await page.locator('nav.tabs button', { hasText: tab }).click()
}

export async function uploadScenes(page: Page, names: string[]): Promise<void> {
  await openTab(page, 'Scenes')
  const before = await page.locator('.sidebar-body .card').count()
  await page
    .locator('.sidebar-body input[type="file"]')
    .setInputFiles(names.map((n) => pngFile(n)))
  await expect(page.locator('.sidebar-body .card')).toHaveCount(before + names.length)
}

export async function uploadCharacters(page: Page, names: string[]): Promise<void> {
  await openTab(page, 'Characters')
  const before = await page.locator('.sidebar-body .card').count()
  await page
    .locator('.sidebar-body input[type="file"]')
    .setInputFiles(names.map((n) => pngFile(n)))
  await expect(page.locator('.sidebar-body .card')).toHaveCount(before + names.length)
}

/** Card in the currently open sidebar panel whose name matches. */
export function card(page: Page, name: string): Locator {
  return page.locator('.sidebar-body .card', {
    has: page.locator('.card-name', { hasText: name }),
  })
}

export async function selectScene(page: Page, name: string): Promise<void> {
  await openTab(page, 'Scenes')
  await card(page, name).click()
  await expect(card(page, name)).toHaveClass(/active/)
}

/** Click a character card to place it on the preview stage. */
export async function placeCharacter(page: Page, name: string): Promise<void> {
  await openTab(page, 'Characters')
  const before = await previewTokens(page).count()
  await card(page, name).click()
  await expect(previewTokens(page)).toHaveCount(before + 1)
}

export function previewTokens(page: Page): Locator {
  return page.locator('.preview-col .stage .token')
}

export function liveTokens(page: Page): Locator {
  return page.locator('.live-box .stage .token')
}

export async function publish(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Update player screen' }).click()
  await expect(page.locator('.badge.synced')).toBeVisible()
}

export async function addTrack(
  page: Page,
  title: string,
  url: string,
  notes = '',
): Promise<void> {
  await openTab(page, 'Music')
  await page.getByRole('button', { name: 'Add YouTube track' }).click()
  await page.getByPlaceholder('Title (e.g. Intense)').fill(title)
  await page.getByPlaceholder('YouTube URL').fill(url)
  if (notes) {
    await page.getByPlaceholder('Notes (e.g. Play this when they spring the trap)').fill(notes)
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('.track-title', { hasText: title })).toBeVisible()
}

/** Map node <g> for a scene, matched by its label text. */
export function mapNode(page: Page, name: string): Locator {
  return page.locator('svg.map-svg g.node').filter({ hasText: name })
}

export async function dragTokenTo(
  page: Page,
  token: Locator,
  targetX: number,
  targetY: number,
): Promise<void> {
  const box = await token.boundingBox()
  if (!box) throw new Error('token not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetX, targetY, { steps: 8 })
  await page.mouse.up()
}
