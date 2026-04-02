import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

const MAP_CLIP = {
  x: 210,
  y: 388,
  width: 820,
  height: 660,
}

async function attachScreenshot(
  target: Page | Locator,
  testInfo: TestInfo,
  name: string,
  options?: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } }
) {
  const path = testInfo.outputPath(`${name}.png`)
  if ('goto' in target) {
    await target.screenshot({ path, fullPage: options?.fullPage, clip: options?.clip })
  } else {
    await target.screenshot({ path })
  }
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

async function openMarineAdmPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('lang', 'en')
  })

  await page.goto('/?page=marine-adm', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Marine ADM1 CPUE Choropleth' })).toBeVisible()
  await expect(page.getByTestId('marine-adm-page')).toBeVisible()

  const loadingText = page.getByText('Loading data from API...')
  await loadingText.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined)
  await expect(page.getByText('CPUE legend')).toBeVisible()
  await page.waitForTimeout(2_000)

  return {
    mapClip: MAP_CLIP,
  }
}

async function dragMap(page: Page, mapClip: { x: number; y: number; width: number; height: number }, dx: number, dy: number) {
  await page.mouse.move(mapClip.x + mapClip.width / 2, mapClip.y + mapClip.height / 2)
  await page.mouse.down()
  await page.mouse.move(mapClip.x + mapClip.width / 2 + dx, mapClip.y + mapClip.height / 2 + dy, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(1_500)
}

test.describe('Marine ADM1 choropleth browser baseline', () => {
  test('captures baseline screenshots for the current choropleth implementation', async ({ page }, testInfo) => {
    const { mapClip } = await openMarineAdmPage(page)

    await attachScreenshot(page, testInfo, 'marine-adm-page-default', { fullPage: true })
    await attachScreenshot(page, testInfo, 'marine-adm-map-default', { clip: mapClip })

    await dragMap(page, mapClip, -220, 90)
    await attachScreenshot(page, testInfo, 'marine-adm-map-panned-east-south', { clip: mapClip })
  })

  test('captures a haul-point interaction state for later geometry QA', async ({ page }, testInfo) => {
    const { mapClip } = await openMarineAdmPage(page)

    const haulToggle = page.getByRole('switch')
    await expect(haulToggle).toBeVisible()
    await haulToggle.click()
    await page.waitForTimeout(1_500)

    await attachScreenshot(page, testInfo, 'marine-adm-map-with-hauls', { clip: mapClip })
  })
})
