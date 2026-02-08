# Product Strategy, Tiers, and Business Model

This doc captures how the website platform positions **chat-integrated tools**, **sections and toggles**, **meta/OG**, **pricing**, **partners**, and **usage/overages** so the product gets out of the gate without tripping over its own feet—while driving value and a seamless path to paid.

---

## 0. Company Positioning: Gateway Global and the AI Biz Bot

**Gateway Global** and the **AI Biz Bot** are positioned as **a voice for small business owners** who want to streamline business operations and attract new customers. **We are a voice for small business owners, and our voice is our product.** It’s like nothing anyone has ever seen—no big promises, no credit card required, no code.

**Why it’s easy to do business with us:**

- **SMS is universal and familiar** to small business owners. We use a familiar form of communication; we don’t require another app download.
- For **baby boomers and the generation that represents a large portion of small business owners**, an interface they already know (SMS, browser) is a big plus.
- We make it easy to do business with us—and we make it **easy for resellers to promote**, because onboarding only requires:
  - A **business name** for a business on Google (ties to **Google Places ID**)
  - An **SMS-capable phone number**

So: low friction, familiar channel, no credit card at signup, no code. The product is the voice and the experience—streamline operations, attract customers.

---

## 1. Tools in the Chat Interface (What’s Integrated Today)

The chat interface has been wired to several **value-add tools**. They are not all “core” in the sense of required for launch; they’re levers for differentiation and upsell.

| Tool | Role | Launch / Paid |
|------|------|----------------|
| **Shopping cart** | Add items from menu/catalog in chat | Value-add; see §3 |
| **Cashier** | Checkout flow from cart | Value-add |
| **Payment form** | Collect payment in-conversation | Value-add |
| **SOT (State of the Territory) Analysis** | Reporting / analytics in chat | Value-add |

**What website owners actually loved** (and should stay prominent):

- **Review filtering** — Control which reviews show, how they’re presented, moderation.
- **Hero section background** — High-quality **generated image** for the hero; owners can change it.
- **Meta / Open Graph (OG) data** — Control title, description, image so **when the site is shared (e.g. social, messaging), the link doesn’t look like a plain text link**. Many sites mess this up; there is no excuse for a shared link to look like raw text. See §2.

---

## 2. Meta and Open Graph: Developer Settings, Up Front

**Problem:** Shared links often look like text links because meta/OG isn’t configured.

**Commitment:** Populate **all** meta and OG fields up front (title, description, image, Twitter card, etc.) and expose them in **developer settings** (or a dedicated “Sharing” / “Social preview” area). When a user’s website gets shared, it must render as a rich preview—no excuse for it to look like a text link. This is part of the “over-deliver” baseline.

---

## 3. Prime Real Estate: Below Hero and Google My Business

The area **below the hero and Google My Business content** is prime real estate. In the current product:

- **Menu / services data** (from Google or manual entry) is used to build **lists of services** (or menu items) for various industries.
- Owners will want to **control or integrate** this section (their menu, pricing, orders, payments).

**Launch stance:**

- **Great for a demo** — Show the full experience: menu, services, cart, cashier, payment.
- **Turn it off when they go live** unless they have a **paid account**. Managing menu, pricing, orders, and payment is a **value-add integration** and will be a strong one—but the goal is to **get the product out of the gate without tripping over our own two feet**. So: free tier gets a simpler, more static site at launch; paid unlocks dynamic menu/orders/payment.

**Ideal toggle at go-live:** Let the owner choose **more static** building blocks instead of (or in addition to) the full menu/order flow:

| Option | Description | Free / Paid |
|--------|-------------|-------------|
| **Review section** | Display and filter reviews (e.g. from GMB). | Free / core |
| **Google Maps integration** | Embed map, directions, hours. | Free / core |
| **Blog section** | One blog post on a topic (e.g. generated at creation). If they want **more posts**, that’s a **paid** feature: we **auto-generate** additional posts for them. | One free; more = paid |

So: **free → clear limitations → natural reason to upgrade**. The blog is a good example: one free post to show value; “add more and we’ll generate them” drives paid.

---

## 4. Pricing Tiers and Philosophy

**Tiers in the system:** **Free**, **$99**, **$299** (and any variants you keep).

**Philosophy:**

- **As much value as possible** — Over-deliver. Solid deal for small business owners in a “cold world.”
- **No friction** — Smooth onboarding, clear limits, no dark patterns.
- **Irresistable offer** — The free tier should feel generous; paid should feel like a no-brainer when they hit the limits they care about.
- **Seamless, natural, scalable sales funnel** — Usage and limits should guide them into paid without feeling pushy. Toggles (e.g. menu/orders vs static sections, blog count) support that.

**Small business owner doing this for small business owners** — The product should reflect that: over-deliver on value, fair pricing, clear path from free to paid.

---

## 5. Partners: Resellers, Affiliates, Integration Specialists, Influencers

**Resellers and affiliates** — Supported. The platform should allow them to sign up, refer, and earn (see below).

**Custom integration specialists** — The platform can serve **national chains** and **enterprise** use cases. Companies that do commercial/enterprise-grade custom integrations get a **solid base** to start from (AI agent, voice, chat, website, telephony/SMS strategy). We provide the base; they layer custom workflows, SSO, ERP, etc.

**Influencers** — **Profit share**: e.g. **25% for 12 months** on **new accounts** they refer. Makes the funnel scalable and aligned with performance.

---

## 6. Usage Limits and Overage Billing (Voice and SMS)

To keep unit economics clear and scale fairly:

- **Phone lines and SMS** are **usage-limited** by plan (e.g. included minutes/messages per month).
- **Overage billing:**
  - **Voice:** **$0.25 per minute** over included allowance.
  - **SMS:** **$0.05 per SMS** over included allowance.

This aligns with the “get off the phone in 30 seconds” strategy (see [TELEPHONY_GEMINI_ARCHITECTURE.md](./TELEPHONY_GEMINI_ARCHITECTURE.md#6-strategy-get-off-the-phone-in-30-seconds-push-to-internet)): minimize long trunk calls and push to SMS + web, while still charging fairly when usage exceeds the plan.

---

## 7. Summary: Free, Limitations, Paid

| Layer | Free / Launch | Paid (e.g. $99 / $299) |
|-------|----------------|-------------------------|
| **Meta/OG** | Populated up front; in developer settings. Shared links never “text only.” | Same; full control. |
| **Hero** | Generated image; owner can change. | Same. |
| **Reviews** | Section + filtering control. | Same. |
| **Maps** | Integration available. | Same. |
| **Blog** | One post (e.g. one topic). | Auto-generate more posts. |
| **Menu / services / cart / cashier / payment** | Great for **demo**; **off** when they go live (or clearly limited). | **On** for live sites; full value-add integration. |
| **Voice / SMS** | Included minutes/messages per plan. | Same + overages: $0.25/min voice, $0.05/SMS. |
| **Partners** | Resellers, affiliates, integration specialists, influencers (e.g. 25% for 12 months on new accounts). | Same. |

The goal is **maximum value, minimum friction, irresistible offer**—and a funnel that naturally and scalably moves users to paid when they need more (more blog posts, live menu/orders/payment, more voice/SMS, or custom work on top of the base).

---

## 8. Reseller and Affiliate API: URL-Based Attribution and Entry Points

The **API should enable resellers** to get credit for signups by sending clients a URL that includes their **affiliate ID**. Two entry flows:

### A. Website builder (input form)

- Reseller sends the client a link to the **website builder** with **affiliate ID in the URL** (e.g. query param).
- Client lands on the builder, enters business name (and any other fields). Business name ties to **Google Places ID**; we also collect **SMS-capable phone number**.
- Sign-up is attributed to the reseller via the affiliate ID. Reseller gets credit.

### B. Pre-configured website (SMS link)

- Reseller can send the **business owner** the **website itself** (not the builder) by sending a link that includes:
  - **Google Business (Places) ID**
  - **Cell phone number**
  - **Affiliate ID**
- When the user receives the **SMS** with this link and opens it:
  - The **website loads pre-configured** (tied to that place and number).
  - We **pull it up** and ask if they want to **view it** (or show it directly).
- **If the URL does not include the cell phone** (e.g. link shared elsewhere):
  - Let them **view the website for 30 seconds**.
  - Then show a **gate**: ask for their **phone number**, **send an OTP**.
  - Once they **enter the OTP**, they can **continue viewing** the website and **access the admin area**.

So: resellers get attribution in both flows; the second flow supports “here’s your site, already set up” with optional phone capture at 30 seconds for ungated links.

---

## 9. 30-Day Trial and Upgrade Flow

- **Websites work for 30 days** (trial).
- At the end of 30 days, the user receives an **SMS**: thank you for trying the AI Biz Bot; would you like to **upgrade to a paid account**?
- **Paid account** includes (and we call this out in the offer):
  - **Dedicated phone number**
  - **Custom domain**
  - **Ability to filter reviews** with a minimum rating on the website
  - **Access to additional features** to help them grow their business and acquire new customers

**Contextual upgrade prompts:** When a **visitor** (or the owner) **asks the AI Biz Bot about these features** while reviewing the website (e.g. “Can I get my own phone number?” or “How do I filter reviews?”), we **may prompt them with the upgrade offer** in conversation. So the funnel is both time-based (30-day SMS) and conversation-driven (feature questions → offer).

---

## 10. Consulting Approach (Moving Away from Menus and Pricing Lists)

We are **moving away from menus and pricing lists** as the default posture and **focusing on a consulting approach**. The AI Biz Bot acts as a consultant that helps streamline operations and attract customers—rather than leading with static menus and price sheets. This aligns with “our voice is our product” and the value of conversation over static content.

---

## 11. Conversational Persistent State: SMS and Chat Shared Context

We support **conversational persistent state** over SMS using:

- **Cell phone (caller ID)** as the identity
- A **session ID** to maintain **memory and context** across messages

**Shared conversation:** The **same conversation** that the small business owner has over **SMS** is **visible and continuous in the chat** (e.g. in the merged-ui). So the owner can switch between SMS on their phone and the web chat and see one coherent thread—same context, same history, no starting over. This makes the experience consistent whether they’re on the go (SMS) or at a desk (chat).

---

## 12. Deploy AI Biz Bot for Our Own Website

The **main product site** is **http://aibizbot.gatewayglobal.ai** (use **https** in production). We should **deploy the AI Biz Bot on our own site** so visitors get the same chat (and voice) experience we sell. Steps: create or use a site config for "Gateway Global – AI Biz Bot," embed the chat widget on the pages at aibizbot.gatewayglobal.ai, and set the API base URL if the backend is on a different host. See [DEPLOY_AIBIZBOT_OWN_SITE.md](./DEPLOY_AIBIZBOT_OWN_SITE.md) for the full checklist.
