import net from "node:net";
import tls from "node:tls";
import { describe, expect, it } from "vitest";

type SmtpSocket = net.Socket | tls.TLSSocket;

function createSmtpReader(socket: SmtpSocket) {
  let buffer = "";
  const waiting: Array<{ resolve: (value: string) => void; reject: (reason: Error) => void }> = [];

  const flush = () => {
    const lines = buffer.split("\r\n");
    const completeLine = lines.findIndex((line, index) => index < lines.length - 1 && /^\d{3} /.test(line));
    if (completeLine < 0 || waiting.length === 0) return;
    const response = lines.slice(0, completeLine + 1).join("\r\n");
    buffer = lines.slice(completeLine + 1).join("\r\n");
    waiting.shift()?.resolve(response);
    flush();
  };

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    flush();
  });
  socket.on("error", (error) => waiting.splice(0).forEach(({ reject }) => reject(error)));
  socket.on("timeout", () => waiting.splice(0).forEach(({ reject }) => reject(new Error("SMTP connection timed out."))));

  return () => new Promise<string>((resolve, reject) => {
    waiting.push({ resolve, reject });
    flush();
  });
}

function connectToSmtp(host: string, port: number) {
  return new Promise<{ socket: net.Socket; read: () => Promise<string> }>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(12_000);
    const read = createSmtpReader(socket);
    socket.once("connect", () => resolve({ socket, read }));
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP connection timed out before greeting.")));
  });
}

function waitForSecureConnect(socket: tls.TLSSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP TLS negotiation timed out.")));
  });
}

function assertCode(response: string, expected: number) {
  expect(Number(response.slice(0, 3))).toBe(expected);
}

async function command(socket: SmtpSocket, read: () => Promise<string>, text: string, expected: number) {
  socket.write(`${text}\r\n`);
  assertCode(await read(), expected);
}

const canValidate = Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD && process.env.SMTP_HOST && process.env.SMTP_PORT);

describe.skipIf(!canValidate)("Gmail SMTP credentials", () => {
  it("authenticates the configured sender without sending an email", async () => {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT!);
    const { socket: rawSocket, read: readPlain } = await connectToSmtp(host, port);
    assertCode(await readPlain(), 220);
    await command(rawSocket, readPlain, "EHLO aaswfoundation.com", 250);
    await command(rawSocket, readPlain, "STARTTLS", 220);

    const secureSocket = tls.connect({ socket: rawSocket, servername: host, minVersion: "TLSv1.2" });
    secureSocket.setTimeout(12_000);
    const readSecure = createSmtpReader(secureSocket);
    await waitForSecureConnect(secureSocket);
    await command(secureSocket, readSecure, "EHLO aaswfoundation.com", 250);
    const auth = Buffer.from(`\u0000${process.env.SMTP_USER!}\u0000${process.env.SMTP_APP_PASSWORD!}`).toString("base64");
    await command(secureSocket, readSecure, `AUTH PLAIN ${auth}`, 235);
    await command(secureSocket, readSecure, "QUIT", 221);
    secureSocket.destroy();
  }, 30_000);
});
