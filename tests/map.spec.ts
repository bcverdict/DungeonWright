import { expect, test } from '@playwright/test'
import {
  gotoDm,
  mapNode,
  placeCharacter,
  publish,
  selectScene,
  uploadCharacters,
  uploadScenes,
} from './helpers'

test.describe('map', () => {
  test('scenes appear as nodes; clicking a node switches scene', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])

    await expect(page.locator('svg.map-svg g.node')).toHaveCount(2)

    await mapNode(page, 'Cave').click()
    await expect(page.locator('.scene-title h1')).toHaveText('Cave')
    await expect(mapNode(page, 'Cave').locator('.node-rect')).toHaveClass(/current/)
    await expect(mapNode(page, 'Forest').locator('.node-rect')).not.toHaveClass(/current/)
  })

  test('live scene is marked green after publishing', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])
    await selectScene(page, 'Forest')
    await publish(page)
    await selectScene(page, 'Cave')

    await expect(mapNode(page, 'Forest').locator('.node-rect')).toHaveClass(/live/)
    await expect(mapNode(page, 'Cave').locator('.node-rect')).toHaveClass(/current/)
    await expect(mapNode(page, 'Cave').locator('.node-rect')).not.toHaveClass(/live/)
  })

  test('connect mode links and unlinks two scenes', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest', 'Cave'])

    const toggle = page.locator('.map-toolbar button')
    await toggle.click()
    await expect(toggle).toHaveText('Connecting: pick two scenes')
    await expect(toggle).toHaveClass(/toggled/)

    await mapNode(page, 'Forest').click()
    await expect(mapNode(page, 'Forest').locator('.node-rect')).toHaveClass(/connect-from/)
    await mapNode(page, 'Cave').click()
    await expect(page.locator('svg.map-svg line')).toHaveCount(1)

    // Picking the same pair again removes the edge.
    await mapNode(page, 'Forest').click()
    await mapNode(page, 'Cave').click()
    await expect(page.locator('svg.map-svg line')).toHaveCount(0)

    await toggle.click()
    await expect(toggle).toHaveText('Connect scenes')
  })

  test('nodes can be dragged to new positions', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])

    const node = mapNode(page, 'Forest')
    const before = (await node.boundingBox())!
    await page.mouse.move(before.x + 20, before.y + 20)
    await page.mouse.down()
    await page.mouse.move(before.x + 120, before.y + 90, { steps: 6 })
    await page.mouse.up()

    const after = (await node.boundingBox())!
    expect(after.x - before.x).toBeGreaterThan(60)
    expect(after.y - before.y).toBeGreaterThan(40)

    // A drag should not switch the preview to that scene.
    await expect(page.locator('.scene-title h1')).toHaveText('No scene selected')
  })

  test('character presence dots appear on the scene node', async ({ page }) => {
    await gotoDm(page)
    await uploadScenes(page, ['Forest'])
    await uploadCharacters(page, ['Hero'])
    await selectScene(page, 'Forest')
    await placeCharacter(page, 'Hero')

    await expect(mapNode(page, 'Forest').locator('circle.char-dot')).toHaveCount(1)
  })
})
