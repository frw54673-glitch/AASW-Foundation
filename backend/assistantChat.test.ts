import { describe, expect, it } from "vitest";
import { assistantRouter } from "./routers/assistant";

describe("public site assistant chat router", () => {
  const caller = assistantRouter.createCaller({});

  it("handles greeting messages in English and Hinglish", async () => {
    const res1 = await caller.chat({
      messages: [{ role: "user", content: "Namaste!" }],
    });
    expect(res1.reply).toContain("Namaste");
    expect(res1.reply).toContain("AASW Foundation");

    const res2 = await caller.chat({
      messages: [{ role: "user", content: "hello" }],
    });
    expect(res2.reply).toContain("Namaste");

    const res3 = await caller.chat({
      messages: [{ role: "user", content: "kaise ho" }],
    });
    expect(res3.reply).toContain("Namaste");
  });

  it("answers membership queries in English and Hinglish", async () => {
    const resEn = await caller.chat({
      messages: [{ role: "user", content: "How do I become a member?" }],
    });
    expect(resEn.reply).toContain("/membership");
    expect(resEn.reply).toContain("Apply online");

    const resHi = await caller.chat({
      messages: [{ role: "user", content: "Membership kaise le sadasya banna hai" }],
    });
    expect(resHi.reply).toContain("/membership");
    expect(resHi.reply).toContain("Apply online");
  });

  it("answers donation queries with payment gateway and receipt details", async () => {
    const res = await caller.chat({
      messages: [{ role: "user", content: "daan kaise kare payment refund" }],
    });
    expect(res.reply).toContain("/donate");
    expect(res.reply).toContain("Donate securely");
  });

  it("answers contact & office location queries", async () => {
    const res = await caller.chat({
      messages: [{ role: "user", content: "office address number sampark" }],
    });
    expect(res.reply).toContain("/contact");
    expect(res.reply).toContain("aaswfoundation06@gmail.com");
  });

  it("answers programme queries", async () => {
    const res = await caller.chat({
      messages: [{ role: "user", content: "What training courses or programmes do you offer?" }],
    });
    expect(res.reply).toContain("Digital skill development");
    expect(res.reply).toContain("Green entrepreneurship");
  });

  it("answers impact statistics queries", async () => {
    const res = await caller.chat({
      messages: [{ role: "user", content: "What impact or statistics have you achieved?" }],
    });
    expect(res.reply).toContain("800+ women trained");
    expect(res.reply).toContain("300+ businesses");
  });

  it("handles thank you messages warmly", async () => {
    const res = await caller.chat({
      messages: [{ role: "user", content: "dhanyavad shukriya!" }],
    });
    expect(res.reply).toContain("welcome");
  });
});
