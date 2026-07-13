---
slug: ksef-od-kiedy-obowiazkowy-2026
locale: en
translationKey: ksef-od-kiedy-obowiazkowy-2026
title: "KSeF 2026 — When Does It Become Mandatory, Who Must Issue e-Invoices, and How to Prepare"
description: "When is KSeF mandatory? The 2026–2027 timeline, who must issue e-invoices, offline mode, permissions, penalties, and practical steps to roll it out smoothly."
category: KSeF
tags: [ksef, e-invoice, structured invoice, vat, fa(3)]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: eKsięgowy AI Team
status: published
---

# KSeF 2026 — When Does It Become Mandatory, Who Must Issue e-Invoices, and How to Prepare

**In short:** The National e-Invoice System (KSeF, Krajowy System e-Faktur) is being rolled out in stages. From **1 February 2026**, e-invoices are mandatory for the largest companies (sales above PLN 200 million), from **1 April 2026** — for all other active VAT taxpayers, and from **1 January 2027** the obligation will also cover the smallest businesses (monthly gross sales up to PLN 10,000). The legal basis is the amendment to the VAT Act of 5 August 2025 (Journal of Laws / Dz.U. 2025, item 1203).

If you run a business in Poland, the question is no longer "whether" but "how to switch to KSeF smoothly." This guide covers everything you need to know: what the system is, the current timeline, exactly who it applies to, what it changes in day-to-day work, how offline and failure modes work, what penalties apply for non-compliance, and a ready-to-use implementation checklist.

## Table of Contents

1. What KSeF is and why it was created
2. Structured invoices and the FA(3) schema
3. Timeline — when does it become mandatory?
4. Who is covered and who is exempt
5. What KSeF changes in daily work
6. Offline mode and failure mode
7. Permissions, tokens, and the KSeF certificate
8. Corrections, attachments, and invoices for receipts
9. Penalties for not using KSeF
10. How to prepare your business — 7 steps
11. Most common mistakes
12. FAQ

## 1. What KSeF is and why it was created

The **National e-Invoice System (KSeF)** is a central, government-run platform operated by the Ministry of Finance, through which businesses issue, send, and receive **structured invoices**. Instead of exchanging PDFs by email, both parties to a transaction use a single database: the seller issues the invoice in the system, and it is immediately delivered to the central repository and made available to the buyer.

The purpose is twofold. From the state's perspective, it's about **tightening VAT compliance** — the tax authority sees invoice turnover in near real time. From businesses' perspective, it's about **standardization**: no more invoices in dozens of different layouts, one format, one source of truth, and no risk of an invoice "getting lost" in an email inbox. In this respect, Poland is following a broader trend of e-invoicing across the European Union.

## 2. Structured invoices and the FA(3) schema

A KSeF invoice is not a PDF — it's an **XML** file with a strictly defined structure, the so-called **FA(3) schema**. The document contains the same data as a traditional invoice (the parties to the transaction, line items, VAT rates, amounts), but in a form a machine can read unambiguously.

Once accepted by the system, every invoice receives:

- a **unique KSeF number** — an identifier assigned by the system,
- an **official timestamp** — the moment of acceptance, which serves as proof the document was issued.

In practice, you don't have to "write XML" by hand — your accounting software, invoicing system, or integration does it for you. You work on a normal invoice form, and the conversion to FA(3) happens in the background.

## 3. Timeline — when does it become mandatory?

| Deadline | Who it covers |
|---|---|
| **1 February 2026** | Large taxpayers — 2024 sales above **PLN 200 million** gross |
| **1 April 2026** | **All other active VAT taxpayers** (including most micro and small businesses) |
| **1 January 2027** | The smallest businesses — monthly gross sales up to **PLN 10,000** — and entities that are "digitally excluded" |

> **As of today (July 2026):** the obligation already applies to the vast majority of B2B companies — since 1 April 2026. If you're still issuing invoices exclusively outside KSeF, you're in the risk group. The last "grace window" — until 1 January 2027 — applies only to the smallest sellers.

It's worth remembering that you can (and often must) already **receive** invoices via KSeF once your counterparties are subject to the obligation — even if you personally are still within the transitional period for issuing invoices.

## 4. Who is covered and who is exempt

The obligation covers transactions:

- **B2B** — between businesses,
- **B2G** — to public authorities.

It applies to active VAT taxpayers with a registered seat or a fixed place of business in Poland. In practice, this means nearly every company issuing domestic invoices.

**Generally exempt from mandatory KSeF are, among others:**

- invoices for consumers (**B2C**),
- taxpayers without a seat or fixed place of business in Poland,
- selected simplified invoices and special cases specified in the Act,
- tickets treated as invoices and invoices from cash registers — within the scope and deadlines specified in the regulations.

## 5. What KSeF changes in daily work

This isn't just "a different way of sending things." Several habits change:

- **Issue date = date sent to KSeF.** As a rule, the date an invoice is considered issued is the day it is sent to the system. This matters for when the tax obligation arises.
- **The end of PDF-by-email** as the primary form. A counterparty covered by KSeF retrieves the invoice from the system.
- **Receiving cost invoices** also moves to KSeF — invoices from your suppliers will all be in one place, which makes bookkeeping easier and reduces the risk of losing a document.
- **KSeF number in payments.** Eventually, the KSeF number is meant to appear in bank transfers (especially under the split-payment mechanism); some of these obligations have been postponed — check the status as of the publication date.
- **Archiving** of invoices happens on the system side — documents are stored centrally for a set period.

## 6. Offline mode and failure mode

The legislator anticipated situations where issuing an invoice "live" in KSeF isn't possible:

- **Offline mode (offline24)** — you can issue an invoice outside the system and send it to KSeF within a set deadline (e.g., the next business day). The invoice then receives the appropriate markings and code.
- **Failure mode** — triggered when the KSeF system itself is unavailable (notices are published by the Ministry of Finance).

This means a connectivity or system outage doesn't paralyze your sales — it's important that the tool you use supports these modes and automatically "resends" invoices once the connection is restored.

## 7. Permissions, tokens, and the KSeF certificate

To issue and retrieve invoices, you need **permissions** in the system and a way to authenticate:

- the business owner grants permissions (to themselves, employees, or their accounting office),
- a **token** or **KSeF certificate** is used to integrate with accounting software,
- permissions can be differentiated — e.g., someone may only issue invoices, while someone else may only view them.

This is an element best configured **before** the obligation applies to you — granting permissions and generating a token tends to be the most "bureaucratic" stage of the whole rollout. See the [guide: how to obtain KSeF tokens](/guide/ksef/get-tokens).

## 8. Corrections, attachments, and invoices for receipts

- **Correcting invoices** are also issued in KSeF, referencing the KSeF number of the original invoice.
- The **correction note** in its previous form is changing its role — check the current rules for correcting buyer data.
- **Attachments** to invoices (specifications, protocols) are handled in a limited, standardized way — this is a frequent source of questions for businesses that used to attach extra files to invoices.
- **Invoices for receipts** and simplified invoices have separate rules and deadlines for being brought into the obligation.

## 9. Penalties for not using KSeF

For issuing invoices outside the system once it's already mandatory, the Act provides for administrative sanctions:

- **up to 100% of the VAT amount** shown on an invoice issued in violation of the regulations,
- and for invoices without VAT shown — up to **18.7% of the total amount due**.

The legislator also provided for a **transitional period** during which penalties are not imposed, to give businesses time to adapt — its scope and end date have been changed over time, so **be sure to verify the current status** before publication.

Beyond the financial penalty itself, there's a practical risk: a counterparty covered by KSeF may refuse to accept an invoice issued outside the system, since it won't be a document they can receive in the standard way.

## 10. How to prepare your business — 7 steps

1. **Determine your deadline.** Check which group you fall into — the date depends on your sales level.
2. **Choose a KSeF-compliant tool.** Accounting software, an invoicing system, or an integration that sends invoices to KSeF for you.
3. **Grant permissions** to yourself, your employees, and your accounting office.
4. **Generate a KSeF token / certificate** for integration.
5. **Test issuing and receiving** on a few documents — before the obligation "catches you off guard" during real sales.
6. **Check the offline and failure modes** — make sure your tool supports them.
7. **Set up your day-to-day process** — who issues invoices, who monitors KSeF statuses and numbers, and where cost invoices end up.

## 11. Most common mistakes

- **Delaying permissions and the token** — the most common cause of a "fire drill" right before the deadline.
- **No plan for offline mode** — the first connectivity outage ends in panic.
- **Ignoring cost invoices** — a company rolls out issuing but forgets that supplier invoices also need to be retrieved from KSeF.
- **Relying on the old PDF workflow** — sending a PDF "just in case" creates a duplicate workflow and clutter.
- **Not verifying dates** — confusing the issue date (date sent to KSeF) with the sale date.

## 12. KSeF in practice with eKsięgowy AI

If you use **wFirma**, you can send e-invoices to KSeF without rebuilding your entire process — [eKsięgowy AI](/) connects to your account and lets you issue and send an invoice to KSeF directly in a conversation with the assistant, as well as check its status. The assistant will also point out tax deadlines and remind you of obligations before they're due. Start with the [KSeF setup guide](/guide/ksef).

## Frequently Asked Questions (FAQ)

**When does KSeF become mandatory for a small business?**
For most micro and small businesses — from **1 April 2026**. The smallest sellers (up to PLN 10,000 per month) have until **1 January 2027**.

**Do invoices for private individuals (B2C) have to go through KSeF?**
No — the obligation applies to B2B and B2G transactions. Consumer invoices remain outside mandatory KSeF.

**What is a KSeF number?**
It's a unique identifier assigned to every structured invoice along with an official timestamp — it confirms the document was issued.

**What should I do if I don't have internet access or KSeF isn't working?**
Use offline or failure mode and send the invoice to the system within the set deadline. A good tool does this automatically once the connection is restored.

**Can I issue invoices in KSeF manually?**
Yes, through the Ministry of Finance's government application, but with a larger volume of documents, an integration with accounting software or an assistant is more convenient.

**How does correcting an invoice work in KSeF?**
You also issue a correcting invoice in KSeF, referencing the KSeF number of the original invoice. Check the current regulations for the detailed rules on buyer data.

---

*This article is for informational purposes only and does not constitute tax advice. Consult an accountant or tax advisor before making decisions. Legal status: July 2026.*
