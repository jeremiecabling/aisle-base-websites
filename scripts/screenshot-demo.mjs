import { chromium } from "playwright-core"

const OUT = process.env.OUT_DIR
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })

async function shoot(name, url, { full = true, width = 1280, height = 900, actions } = {}) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForTimeout(700)
  if (actions) await actions(page)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  await page.close()
  console.log("shot", name)
}

await shoot("apex", "http://localhost:3100/", { full: false })
await shoot("demo-full", "http://localhost:3100/s/ana-and-ben")
await shoot("demo-mobile", "http://localhost:3100/s/ana-and-ben", { width: 390, height: 844, full: true })
await shoot("gate", "http://localhost:3100/s/demo-gated", { full: false })
await shoot("demo-accordions-open", "http://localhost:3100/s/ana-and-ben", {
  actions: async (page) => {
    // open the first schedule day + first FAQ + first things-to-do category
    for (const sel of ["#schedule button", "#faqs button", "#things-to-do button"]) {
      const el = page.locator(sel).first()
      if (await el.count()) await el.click()
      await page.waitForTimeout(400)
    }
  },
})
await browser.close()
