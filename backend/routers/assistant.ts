import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, type Message as LlmMessage } from "../_core/llm";
import { ENV } from "../_core/env";
import { AASW_CONTACT } from "@shared/organisationContact";

// The public site assistant answers general questions about the Foundation.
// Two answering paths, in order of preference:
// 1. Forge LLM (when BUILT_IN_FORGE_API_KEY is configured) — grounded by a
//    compact Foundation fact sheet so answers stay on-topic.
// 2. Local keyword FAQ fallback — keeps the chat useful in local/dev setups
//    where the LLM key is unset, without ever exposing an error to visitors.
// Answers use a markdown-lite format (bold, bullet lines, [label](href) links)
// that the client renders safely.

const SYSTEM_PROMPT = `You are the AASW Foundation website assistant. AASW Foundation is a registered NGO in Uttar Pradesh, India that fuels women's success through technology and enterprise: 800+ women trained, 300+ businesses launched or scaled, 30+ eco-friendly projects across 5 districts.

Answer general questions (programmes, membership, volunteering, donations, office details) briefly and warmly in the same language the visitor uses (English or Hindi/Hinglish are both fine). Format answers with short paragraphs, **bold** for key facts and bullet lines starting with "•" where helpful; you may include site links as [label](/path). For anything involving payments, documents, personal data or a specific application, direct the visitor to the Foundation's contact channels instead of guessing. Never invent statistics, dates or policy details beyond the facts given here.

Foundation facts:
- Programmes: digital skill development, green entrepreneurship, mentorship & business support, workshops & seminars, building the community.
- Membership: apply on the website (/membership); annual membership with renewal; members get a dashboard, certificate and programme services.
- Volunteering: apply on /volunteer; roles are granted on top of member accounts, never automatically.
- Donations: secure checkout on /donate; receipts are emailed.
- Contact: email ${AASW_CONTACT.email}, phone ${AASW_CONTACT.primaryPhoneDisplay} or ${AASW_CONTACT.secondaryPhoneDisplay}, WhatsApp ${AASW_CONTACT.whatsappDisplay}, office hours ${AASW_CONTACT.officeHours}.
- Office: ${AASW_CONTACT.address}.`;

type FaqEntry = { keywords: RegExp[]; answer: string };

const FAQ_ENTRIES: FaqEntry[] = [
  {
    keywords: [/membership/i, /member/i, /join/i, /apply/i, /fee/i, /sadasya/i, /sadasyata/i, /judo/i, /judne/i, /register/i, /registration/i, /kaise (le|bane)/i],
    answer: `Joining AASW Foundation is a simple three-step process:

• **Apply online** on the [Membership page](/membership) — your basic details, district and membership type.
• **Complete the payment** through the secure checkout; the team reviews every application.
• **Get activated** — you receive your membership number, a digital certificate and access to the [member dashboard](/member/dashboard).

Members can then join programme services, track requests and download receipts from the dashboard. For a specific application status, email **${AASW_CONTACT.email}** with your application reference.`,
  },
  {
    keywords: [/volunteer/i, /volunteering/i, /intern/i, /swayamse?vak/i, /judaav/i],
    answer: `We'd love to have you! Volunteering with AASW Foundation starts on the [Volunteer page](/volunteer):

• Share your **skills, availability and interests** in the short form.
• The Foundation team reviews applications and reaches out for a conversation.
• Volunteer roles are granted **on top of existing member accounts**, so active members get priority.

Questions in the meantime? Email **${AASW_CONTACT.email}** or call ${AASW_CONTACT.primaryPhoneDisplay}.`,
  },
  {
    keywords: [/donat/i, /contribution/i, /fund/i, /payment/i, /pay\b/i, /razorpay/i, /receipt/i, /refund/i, /support\b/i, /contribute/i, /daan/i, /paisa/i, /madad/i, /help\b/i],
    answer: `Your support goes directly to training and enterprise work with women in Uttar Pradesh. 💛

• **Donate securely** on the [Donate page](/donate) — cards, UPI and net banking via the payment gateway.
• A **receipt is emailed** after every successful payment.
• For payment, receipt or refund questions, contact the team at **${AASW_CONTACT.email}** or ${AASW_CONTACT.primaryPhoneDisplay} with your donation reference.`,
  },
  {
    keywords: [/program/i, /programme/i, /programmes/i, /course/i, /training/i, /workshop/i, /digital/i, /skill/i, /entrepreneur/i, /green/i, /mentor/i, /seminar/i, /service/i, /kaam/i, /shiksha/i, /prashikshan/i, /activity/i, /activities/i],
    answer: `AASW Foundation runs **five programme areas** focused on women's capability and enterprise:

• **Digital skill development** — hands-on technology training.
• **Green entrepreneurship** — eco-friendly business launch support.
• **Mentorship & business support** — one-to-one guidance for growing ventures.
• **Workshops & seminars** — community learning events.
• **Building the community** — local engagement and support work.

Members can join a service directly from their dashboard. Explore details on the [Programmes page](/programs).`,
  },
  {
    keywords: [/contact/i, /phone/i, /call/i, /email/i, /whatsapp/i, /address/i, /location/i, /office/i, /reach/i, /where/i, /timing/i, /hours/i, /open/i, /map/i, /visit/i, /mobile/i, /number/i, /sampark/i, /pata/i, /kahan/i],
    answer: `Here's how to reach the Foundation team:

• **Email:** ${AASW_CONTACT.email}
• **Phone:** ${AASW_CONTACT.primaryPhoneDisplay} or ${AASW_CONTACT.secondaryPhoneDisplay}
• **WhatsApp:** ${AASW_CONTACT.whatsappDisplay}
• **Office hours:** ${AASW_CONTACT.officeHours}
• **Address:** ${AASW_CONTACT.address}

You can also send a message anytime from the [Contact page](/contact) — the team replies during office hours.`,
  },
  {
    keywords: [/impact/i, /statistic/i, /result/i, /achievement/i, /outcome/i, /beneficiar/i, /how many/i, /women/i, /train/i, /work/i, /success/i, /achieve/i],
    answer: `The Foundation's work to date, in numbers:

• **800+ women trained** in digital and enterprise skills.
• **300+ businesses launched or scaled** by programme participants.
• **30+ eco-friendly projects** delivered with communities.
• **5 districts** covered across Uttar Pradesh.

Programme services and stories are on the [Programmes](/programs) and [Stories](/stories) pages.`,
  },
  {
    keywords: [/certificate/i, /proof/i, /document/i, /praman/i],
    answer: `Membership certificates are issued digitally once your membership is approved:

• Download yours anytime from the [member dashboard](/member/dashboard).
• A shareable email-certificate link is also available from the dashboard.

If a certificate or document is missing, email **${AASW_CONTACT.email}** with your membership number and the team will help.`,
  },
  {
    keywords: [/login/i, /password/i, /account/i, /dashboard/i, /sign ?in/i, /sign ?up/i, /portal/i],
    answer: `Member portal quick help:

• **Sign in** at the [member login](/member/login) with your registered email and password.
• The [dashboard](/member/dashboard) shows programme requests, completion reports, receipts and your certificate.
• **Forgot your password?** Use "Forgot password" on the login page, or email **${AASW_CONTACT.email}** and the team will reset it.`,
  },
  {
    keywords: [/story/i, /news/i, /update/i, /gallery/i, /photo/i, /media/i, /report/i, /khabar/i],
    answer: `You can explore the Foundation's public work here:

• **Stories** — [participant journeys](/stories).
• **Field Gallery** — [verified field photographs](/field-gallery).
• **Updates** — [news and field notes](/updates) on the Media Centre.
• **Reports** — [governance and public documents](/reports).`,
  },
];

const GREETING_RE = /^(hi+|hey+|hello+|hlo+|helo+|namaste+|namaskar+|prana?am+|ram\s*ram+|good\s*(morning|afternoon|evening)|salaam|assalamu.*|kaise\s*ho|kya\s*haal)[\s!.,]*$/i;
const THANKS_RE = /(thank|thanks|thankyou|thank you|dhanyav?ad|shukriya|thx|ty)/i;

function localAnswer(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) return "Hi! Ask me anything about AASW Foundation — programmes, membership, volunteering or donations.";
  if (GREETING_RE.test(trimmed)) return "**Namaste!** I'm the AASW Foundation assistant.\n\nAsk me about our programmes, membership, volunteering, donations or office details — pick a topic below or type your question.";
  if (THANKS_RE.test(trimmed)) return "You're most welcome! 💛\n\nIf anything else comes up, I'm right here — and the team is always reachable at **" + AASW_CONTACT.email + "**.";

  const matches = FAQ_ENTRIES.filter(entry => entry.keywords.some(pattern => pattern.test(trimmed)));
  if (matches.length > 0) return matches.map(entry => entry.answer).join("\n\n");

  return `I can help with **general questions** about AASW Foundation — programmes, membership, volunteering, donations and office details.

For anything specific, the team responds fastest at **${AASW_CONTACT.email}** or ${AASW_CONTACT.primaryPhoneDisplay} (${AASW_CONTACT.officeHours}). You can also send a message from the [Contact page](/contact).`;
}

const chatMessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) });

export const assistantRouter = router({
  chat: publicProcedure
    .input(z.object({ messages: z.array(chatMessageSchema).min(1).max(20) }))
    .mutation(async ({ input }) => {
      const lastUserMessage = [...input.messages].reverse().find(message => message.role === "user");
      const question = lastUserMessage?.content ?? "";

      const llmConfigured = ENV.forgeApiKey.trim().length > 0;
      if (llmConfigured) {
        try {
          const history: LlmMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...input.messages.map(message => ({ role: message.role, content: message.content }) as LlmMessage),
          ];
          const result = await invokeLLM({ messages: history, maxTokens: 400 });
          const choice = result.choices[0];
          const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
          if (text) return { reply: text, source: "llm" as const };
        } catch (error) {
          // A misconfigured or unreachable Forge endpoint must not break the
          // public chat — log and fall through to the local FAQ answer.
          console.warn("[Assistant] LLM reply failed; using local FAQ answer:", error instanceof Error ? error.message : error);
        }
      }

      return { reply: localAnswer(question), source: "local" as const };
    }),
});
