import { writeFile } from "node:fs/promises";

const cdpBase = "http://127.0.0.1:9224";
const targetUrl = "http://127.0.0.1:3000/";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const targetResponse = await fetch(`${cdpBase}/json/new?${encodeURIComponent(targetUrl)}`, { method: "PUT" });
  if (!targetResponse.ok) throw new Error(`Unable to open QA target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let sequence = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.id && pending.has(payload.id)) {
      pending.get(payload.id)(payload);
      pending.delete(payload.id);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, (payload) => {
      if (payload.error) reject(new Error(payload.error.message));
      else resolve(payload.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await command("Page.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command("Page.navigate", { url: targetUrl });
  await wait(1200);
  const navigation = await command("Runtime.evaluate", {
    expression: `new Promise((resolve) => { const menuToggle = document.querySelector('.menu-toggle'); if (!menuToggle) return resolve({ ok: false, reason: 'Mobile menu toggle not found' }); menuToggle.click(); setTimeout(() => { const trigger = document.querySelector('.mobile-about-trigger'); if (!trigger) return resolve({ ok: false, reason: 'Mobile About trigger not found after opening menu' }); trigger.click(); setTimeout(() => { const donate = [...document.querySelectorAll('.mobile-about-links a')].find((link) => link.getAttribute('href') === '/donate'); resolve({ ok: Boolean(donate), label: donate?.textContent?.trim() ?? '' }); }, 120); }, 120); })`,
    returnByValue: true,
    awaitPromise: true,
  });

  if (!navigation.result.value?.ok || navigation.result.value?.label !== "Donate") {
    throw new Error(`Donate entry was not exposed in the mobile About menu: ${JSON.stringify(navigation.result.value)}`);
  }

  await wait(180);
  const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile("/home/ubuntu/aasw-foundation-redesign/.qa/mobile-about-donate-expanded.png", Buffer.from(screenshot.data, "base64"));
  console.log("PASS: Mobile About menu exposes Donate and screenshot was captured.");
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
