---
slug: ksef-a-wfirma-jak-wysylac-efaktury
locale: en
translationKey: ksef-a-wfirma-jak-wysylac-efaktury
title: "KSeF and wFirma — How to Send e-Invoices Through the Integration"
description: "How to send e-invoices to KSeF via wFirma: token vs certificate, permissions, invoice statuses and KSeF number, receiving cost invoices, and the AI assistant."
category: KSeF
tags: [ksef, wfirma, e-invoice, integration]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: eKsięgowy AI Team
status: published
# before publishing — tab and button names in wFirma and KSeF regulations may be
# updated. Verify UI paths live on your own account.
---

# KSeF and wFirma — How to Send e-Invoices Through the Integration

**In short:** If you invoice through **wFirma**, you don't need to switch to the government's KSeF Taxpayer Application to stay compliant. The integration lets you **issue invoices exactly as before** and send them to the National e-Invoice System with one click (or automatically on save), while also **receiving cost invoices** in the same place. To connect, you need a **KSeF certificate** (from 1 February 2026 you can generate it directly in wFirma) or a **token** (valid until the end of 2026), plus the right **permissions**. The KSeF obligation applies to most businesses from **1 April 2026**.

Since the obligation already applies to you (we covered the timeline in [KSeF — when does it become mandatory](/blog/ksef-od-kiedy-obowiazkowy-2026)), the question is how to fit KSeF into your daily work without running two parallel document flows. In this guide we show how to connect wFirma with KSeF, what sending and receiving invoices looks like, what the statuses mean, and what you gain by adding an AI assistant on top.

## Table of Contents

1. Why the integration, not the government MF app
2. How to connect wFirma with KSeF — certificate, token, permissions
3. Issuing invoices and automatic sending
4. Invoice statuses and the KSeF number
5. Receiving cost invoices from KSeF
6. The AI assistant on top of the integration
7. Step by step — how to get started
8. Common problems
9. FAQ

## 1. Why the integration, not the government MF app

The Ministry of Finance provides a free **KSeF Taxpayer Application** — and for issuing a single invoice, that tool is enough. The problem starts with day-to-day work: the government app is disconnected from your accounting. You issue an invoice in it, and then you still have to enter it into your accounting program, track the payment, and link it to costs and tax filings.

The wFirma–KSeF integration eliminates this double workflow. You get:

- **One form.** You issue the invoice exactly as before — conversion to the structured format and sending to KSeF happen in the background.
- **One document flow.** Sales and costs live in the same system as your records, JPK, and payments — no re-entering data between applications.
- **Cost invoices in one place.** Documents from suppliers land directly in wFirma, ready to be booked, instead of sitting in a separate repository.
- **Automation.** Sending on save, overnight retrieval of costs, and statuses visible next to invoices — without manual XML exports.

In short: the government app is a fallback plan, while the integration is a way to make KSeF "disappear" from your daily to-do list.

## 2. How to connect wFirma with KSeF — certificate, token, permissions

Connecting comes down to three elements: **authentication** (certificate or token), **permissions** in KSeF, and **configuring the scope** of the integration. wFirma has offered KSeF integration since 2023, and with KSeF 2.0 (from 1 February 2026) came the option to generate a certificate without logging into the government application.

### Authentication methods

| Method | What it involves | Who it's for |
|---|---|---|
| **Certificate generated in wFirma** | You create the KSeF certificate directly in the system, without logging into the Taxpayer Application | Recommended path from 1 February 2026 |
| **Your own KSeF certificate** | You upload the files of a certificate issued earlier | Companies that already have a certificate |
| **KSeF token** | You enter a token generated in the Taxpayer Application | Transitional solution — tokens work **until 31 December 2026** |

> **Important:** tokens are being phased out from **1 January 2027**. If you're connecting with a token today, plan your move to a certificate so you don't end up without a working integration at the turn of the year.

### Where to configure this in wFirma

You'll find the configuration under the **PRZYCHODY » KSEF » KONFIGURACJA INTEGRACJI** tab (Revenue » KSeF » Integration configuration). There you choose the authentication method (generate a certificate / I have a certificate / I have a token) and the scope: whether sales invoices should go to KSeF on save, and whether costs should be retrieved automatically.

### Permissions

Authorization works **in the context of a specific user**, not globally for the whole company. Every person who is going to send or retrieve invoices needs their own certificate and their own authorization on their account. In addition, in the KSeF Taxpayer Application (ap.ksef.mf.gov.pl) the owner grants permissions — including permission to view and issue invoices. Missing view permission results in a "brak uprawnień do pobierania" ("no permission to retrieve") message.

We describe the detailed procedure in the [wFirma configuration guide](/guide/wfirma) and in the [how to get access credentials](/guide/wfirma/get-api-credentials) instructions. You'll find context on KSeF itself in the [KSeF guide](/guide/ksef).

## 3. Issuing invoices and automatic sending

Once the integration is set up, issuing invoices looks almost the same as before. You fill in the invoice on the standard form, and on save you choose the option to send it to KSeF (e.g. **ZAPISZ I WYŚLIJ DO KSEF** — "Save and send to KSeF"). The system builds the structured invoice itself and sends it to KSeF.

You can also turn on **automatic sending**: in the configuration you specify that B2B sales invoices (and optionally B2C as well) should go to KSeF as soon as they're saved. That way you don't have to remember a separate step — every saved invoice heads to the system on its own.

We've laid out the full "from form to KSeF number" scenario in a separate guide: [how to issue an invoice in KSeF step by step](/blog/jak-wystawic-fakture-ksef-krok-po-kroku).

## 4. Invoice statuses and the KSeF number

A structured invoice is only considered **issued once** it has successfully reached the system and passed validation. Only after positive validation does KSeF assign it a **unique KSeF number** and issue an **Official Receipt Confirmation (UPO)** — proof that the document was successfully transmitted. It's this moment, not the save in your accounting program, that determines the legal "existence" of the invoice.

That's why tracking statuses matters so much in day-to-day work. In wFirma the sending status is visible next to the invoice (e.g. as an icon next to the number), and the typical path looks like this:

| Status | What it means | What to do |
|---|---|---|
| **To be sent / draft** | Invoice saved but not yet sent to KSeF | Send it manually or wait for automatic sending |
| **Sent / in progress** | The document has reached the system, validation is underway | Wait for confirmation |
| **Accepted (KSeF number)** | Invoice validated, KSeF number and UPO assigned | Done — the document is issued |
| **Rejected / error** | Validation failed | Correct the data and resend |

> A "rejected" status most often results from incorrect data (e.g. the buyer's NIP) or missing permissions. Until it receives a KSeF number, the invoice **is not** effectively issued — don't close out the sale until you see the confirmation.

## 5. Receiving cost invoices from KSeF

KSeF isn't just about sending — it's also about **receiving** invoices from suppliers. Contractors covered by the obligation issue you invoices directly in the system, so it's worth setting up automatic retrieval for them.

In wFirma, once you enable the option to retrieve purchase invoices, the system **pulls costs from KSeF on its own** (usually overnight) and places them as drafts ready to be booked — most often under **WYDATKI » KSIĘGOWANIE » WERSJE ROBOCZE** (Expenses » Accounting » Drafts). You can also pull invoices from a chosen period manually via the KSeF import option.

The practical benefit: no more "lost" cost invoices sitting in your inbox. All documents from suppliers are in one place, ready to be booked and settled for VAT.

## 6. The AI assistant on top of the integration

The wFirma–KSeF integration on its own handles the mechanics of sending. The layer most companies are missing is **day-to-day handling in natural language** — and that's where the AI assistant comes in.

With [eKsięgowy AI](/) connected to your wFirma account, you can:

- **issue and send an invoice to KSeF directly in the conversation** — you dictate the content, the assistant prepares the document and sends it off;
- **check the status and KSeF number** without clicking through tabs — you ask "did the invoice for company X go to KSeF?" and get an answer;
- **get a reminder** that an invoice is stuck in "to be sent" status or was rejected;
- **verify a contractor** on the VAT whitelist and **auto-fill data from the NIP** via GUS before you issue the document — fewer rejections due to incorrect data.

This doesn't replace the integration — it makes using it feel like a conversation rather than operating yet another panel.

## 7. Step by step — how to get started

1. **Check your deadline.** For most businesses the obligation applies from 1 April 2026; the smallest ones have until 1 January 2027.
2. **Open KONFIGURACJA INTEGRACJI** (Integration configuration) in wFirma (**PRZYCHODY » KSEF**).
3. **Choose authentication** — generate a certificate in wFirma (recommended) or use a token for the transitional period.
4. **Grant permissions** to yourself, your employees, and your accounting office in the KSeF Taxpayer Application.
5. **Set the scope** — sending sales invoices on save and automatically retrieving purchase invoices.
6. **Test** issuing and receiving on a few documents — check that the KSeF number and UPO appear.
7. **Connect the AI assistant** if you want to issue invoices and check statuses in conversation, and get reminders about deadlines.

## 8. Common problems

- **"Brak uprawnień do pobierania" ("no permission to retrieve")** — most often caused by a missing invoice-viewing permission in the KSeF Taxpayer Application. Grant it and redo the authorization.
- **Invoice rejected by KSeF** — check that the buyer's NIP is correct and the data is complete; fix it and resend.
- **Relying solely on a token** — the token expires at the end of 2026. Switch to a certificate before the integration stops working.
- **Double workflow** — sending the client a PDF "just in case" alongside KSeF creates a mess. A contractor covered by KSeF retrieves the invoice from the system.
- **Ignoring cost invoices** — companies roll out sending but forget to turn on cost retrieval. Configure both directions.
- **Per-user authorization** — if several people send invoices, each one needs their own certificate and authorization.

## Issue and receive e-invoices without switching tools

[eKsięgowy AI](/) connects to your **wFirma** account and lets you **issue and send e-invoices to KSeF and check their status** — directly in a conversation with the assistant. On top of that, it **verifies contractors on the VAT whitelist**, **auto-fills data from the NIP via GUS**, does **receipt OCR in Telegram**, answers questions about **VAT, PIT, CIT, and ZUS**, and **reminds you of tax deadlines**. Start with the [wFirma configuration guide](/guide/wfirma) and the [KSeF guide](/guide/ksef).

## Frequently Asked Questions (FAQ)

**Do I have to issue invoices in the government application if I use wFirma?**
No. Thanks to the integration you issue the invoice in wFirma exactly as before, and the system sends it to KSeF on its own. The Taxpayer Application is mainly useful for granting permissions or as a fallback plan.

**Certificate or token — which should I choose?**
A certificate, eventually. Tokens work as a transitional solution until 31 December 2026 and are being phased out from 1 January 2027. From 1 February 2026 you can generate a certificate directly in wFirma.

**How do I know the invoice actually reached KSeF?**
After positive validation, the invoice receives a unique KSeF number and a UPO. In wFirma you can see this from the status next to the document. Until it has a KSeF number, the invoice is not effectively issued.

**Will costs from suppliers also be retrieved automatically?**
Yes, if you enable retrieval of purchase invoices. The system pulls them from KSeF (usually overnight) and saves them as drafts ready to be booked.

**Does every employee need a separate certificate?**
Yes. Authorization works in the context of a specific user, so every person sending or retrieving invoices needs their own certificate and their own authorization.

**What does the AI assistant add if the integration already sends invoices?**
It lets you handle KSeF in conversation: issue an invoice, check the status and KSeF number, get a reminder about a rejected document or an upcoming deadline — all without clicking through panels.

---

*This article is for informational purposes only and does not constitute tax advice. Tab and button names in wFirma and KSeF regulations may change — verify them on your own account. Consult an accountant or tax advisor before making decisions. Legal status: July 2026.*
