---
slug: jak-wystawic-fakture-ksef-krok-po-kroku
locale: en
translationKey: jak-wystawic-fakture-ksef-krok-po-kroku
title: "How to Issue an Invoice in KSeF — Step by Step"
description: "How to issue a KSeF invoice step by step: permissions, token/certificate, login, the FA(3) schema, KSeF number, UPO, corrections, and offline/emergency mode."
category: KSeF
tags: [ksef, e-invoice, invoice, guide]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: Zespół eKsięgowy AI
status: published
---

# How to Issue an Invoice in KSeF — Step by Step

**In brief:** To issue an invoice in the National e-Invoice System (Krajowy System e-Faktur, KSeF), you need three things: **permissions** in the system, a way to **authenticate** (a KSeF token or certificate, or alternatively a qualified signature), and a **KSeF-compliant tool**. You fill in the invoice as usual — the parties' details, line items, VAT rates — and the software converts it into **XML in the FA(3) schema** and sends it to the system. After verification, the invoice receives a **unique KSeF number** and a **UPO** (Official Receipt Confirmation, Urzędowe Poświadczenie Odbioru), and only then is it considered issued. For most businesses, this becomes mandatory as of **April 1, 2026**.

This guide walks you through the entire process: from preparing your permissions, through filling in and sending the invoice, to the buyer receiving the document, corrections, and issuing invoices in offline and emergency mode. If you're still wondering who is covered by the obligation and from when, start with the article [KSeF — from when is it mandatory in 2026](/blog/ksef-od-kiedy-obowiazkowy-2026).

## Table of Contents

1. What you need before issuing your first invoice
2. Authentication and logging in to KSeF
3. Filling in the invoice — details, line items, rates, the FA(3) schema
4. Sending the invoice to KSeF — step by step
5. KSeF number and confirmation (UPO)
6. How the buyer receives the invoice
7. Correcting an invoice in KSeF
8. Offline and emergency mode — when the system is down
9. Most common mistakes
10. How to make it simpler — wFirma integration and an AI assistant
11. FAQ

## 1. What you need before issuing your first invoice

Before you click "send," make sure you have three things configured:

- **Permissions in KSeF.** By default, ownership permissions belong to the taxpayer itself. In a company, an administrator is appointed by submitting form **ZAW-FA** to the tax office — the designated person can then grant permissions to employees and the accounting office (separately for issuing and for receiving invoices).
- **A method of authentication.** To work in accounting software integrated with the API, you need a **token** or a **KSeF certificate**. A token carries within it the permissions granted at the moment it was generated; a certificate is purely a means of authentication (like a qualified signature) and does not carry permissions on its own. Certificates can be obtained through the **Certificate and Permissions Module (Moduł Certyfikatów i Uprawnień, MCU)** — available since November 1, 2025.
- **A KSeF-compliant tool.** Accounting software, an invoicing system, or an integration (e.g., with wFirma) that generates XML in the FA(3) schema and communicates with the KSeF API. Manual issuing is possible in the free Ministry of Finance application, but with a larger volume of invoices, an integration is far more convenient.

> **Token or certificate?** Tokens are set to work in parallel with certificates until the end of 2026, and from **January 1, 2027**, KSeF certificates are set to fully replace tokens. If you're setting things up now, it's worth considering a certificate right away. Details can be found in the guide [how to get KSeF tokens](/guide/ksef/get-tokens).

## 2. Authentication and logging in to KSeF

Authentication confirms "who you are" to the system. In practice, you have several methods to choose from:

- **KSeF token** — you enter it once in your accounting software settings; further communication with the system happens automatically.
- **KSeF certificate** — a file used by applications integrated with the API and for logging in to the portal.
- **Qualified signature or electronic seal** — convenient for the initial permission setup and for logging in to the KSeF portal.
- **Trusted Profile / e-signature (Profil zaufany)** — for an individual logging in to the government application.

In accounting software, you usually configure authentication once. From that point on, you don't log in to KSeF "manually" for every invoice — the application does it in the background, using the saved token or certificate.

## 3. Filling in the invoice — details, line items, rates, the FA(3) schema

The good news: **you don't write XML by hand**. You work with a normal invoice form, and the conversion to the **FA(3)** structure happens automatically. The FA(3) schema has applied to structured invoices since **February 1, 2026**.

When filling in the invoice, pay attention to the fields that matter most in KSeF:

| Invoice element | What to watch out for |
|---|---|
| **Seller details** | The NIP must match the permissions you're operating under |
| **Buyer details** | The **correct NIP** is key — an error later requires a correction (see section 7) |
| **Line items** | Name of the goods/service, quantity, unit price, net amount |
| **VAT rates** | 23%, 8%, 5%, 0%, "exempt" (zw) or "not applicable" (np) — according to the type of sale |
| **Amounts** | Net, VAT, and gross must add up without rounding discrepancies |
| **Sale date** | Separate from the issue date (see below) |

Keep in mind that, as a rule, the **issue date** of a structured invoice is deemed to be the day it is **sent to KSeF** — not the day you filled in the form. This matters for determining when the tax obligation arises.

## 4. Sending the invoice to KSeF — step by step

The whole process in a KSeF-compliant program comes down to a few steps:

1. **Log in** to your accounting software or the KSeF portal (authentication from section 2).
2. **Create a new structured invoice** and fill in the parties' details and line items.
3. **Check for accuracy** — especially the buyer's NIP, VAT rates, and totals.
4. **Send it to KSeF.** The software converts the document to FA(3) XML and submits it to the system.
5. **The system verifies** the invoice for compliance with the schema and the data.
6. **Receive the KSeF number and UPO** — only once the number is assigned is the invoice considered issued.

If the invoice has a structural error (e.g., non-compliance with the FA(3) schema), the system will **reject** it and return a message — you then correct the data and resend it. A rejected invoice does not function in circulation, so there's no need to "cancel" it.

## 5. KSeF number and confirmation (UPO)

Once an invoice is correctly accepted, the system assigns it a **unique KSeF number** (an identifier roughly 35 characters long) and generates a **UPO — Official Receipt Confirmation (Urzędowe Poświadczenie Odbioru)**. These are the two most important pieces of evidence in the whole process:

- the **KSeF number** uniquely identifies the invoice in the system and will be needed, among other things, for corrections and payments,
- the **UPO**, together with an official timestamp, confirms that the document was accepted — it's your proof that the invoice was issued.

It's worth saving the KSeF number and UPO in your own system. Invoices that have received a KSeF number **can no longer be edited or cancelled** — any change is made through a correcting invoice.

## 6. How the buyer receives the invoice

In KSeF, you don't send the invoice by email — the buyer **downloads it from the system**. As a rule, the document is deemed **received the moment it is assigned a KSeF number**. This is an important change: the moment of "delivery" no longer depends on when the counterparty opens an email.

In practice, the buyer (or their accounting office) sees your invoice among their cost documents in their own KSeF-integrated software and books it without re-entering data. For the counterparty's convenience, you can still provide them with a visualization of the invoice (PDF) — but this is now purely informational, as the source document is the invoice in KSeF.

## 7. Correcting an invoice in KSeF

Since invoices in KSeF cannot be edited, every mistake is corrected with a **correcting invoice, also issued in KSeF**. The key rules:

- in the correction, you provide the **KSeF number of the original invoice** being amended,
- you indicate the corrected data, a description of the changes, and the current tax base and VAT amounts,
- the classic **correction note (nota korygująca) in its previous form is being phased out** — the seller corrects the data with a correcting invoice.

A special case is an **incorrect buyer NIP**. This usually requires two documents: a correcting invoice that "zeroes out" the invoice with the wrong NIP, and a new original invoice with the correct NIP.

## 8. Offline and emergency mode — when the system is down

The legislator has provided for situations where you can't issue an invoice "live" in KSeF. In each of these modes, the invoice must still have the **FA(3)** structure and be marked with the appropriate **QR code**.

| Mode | When | Deadline for sending to KSeF |
|---|---|---|
| **offline24** | On your own initiative — no internet access or a deliberate decision | By the **next business day** at the latest |
| **offline** | An announced technical outage on the Ministry of Finance's side | Within the deadline stated in the announcement |
| **emergency (awaryjny)** | A serious, officially announced KSeF failure | Within **7 days** after the failure ends |

In offline and emergency mode, an invoice is often marked with **two QR codes** — one labeled "OFFLINE" and one containing a code from the KSeF certificate ("CERTYFIKAT"). In the event of a total failure (e.g., a threat to critical infrastructure), invoices outside KSeF are exceptionally permitted, without an obligation to send them later.

The most important thing in practice: a good tool **automatically resends** invoices to KSeF once the connection is restored, so a connectivity outage doesn't paralyze sales.

## 9. Most common mistakes

- **Wrong buyer NIP** — the most costly mistake, since correcting it usually requires two documents.
- **Treating the PDF as the invoice** — the document is the invoice in KSeF; the PDF is only a visualization.
- **Confusing the issue date with the sale date** — the issue date is the day the invoice is sent to KSeF.
- **Delaying permissions and the token/certificate** — last-minute setup is the most common cause of panic before the deadline.
- **No plan for offline mode** — the first connectivity outage ends in chaos if your tool doesn't support the special modes.
- **Not collecting cost invoices** — the obligation works both ways: you also receive invoices from suppliers through KSeF.

## 10. How to make it simpler — wFirma integration and an AI assistant

If you keep your books in **wFirma**, you don't need to rebuild your entire process. [eKsięgowy AI](/) is an assistant integrated with wFirma that **issues and sends e-invoices to KSeF right in the conversation** and checks their status — without clicking through screen after screen.

Beyond just sending invoices, the assistant helps with everyday duties:

- **checks counterparties against the VAT white list** before a transaction,
- **auto-fills data from the NIP using GUS**, so you're less likely to make a mistake in the buyer's details,
- **books receipts from photos sent via Telegram** (OCR) — you send a photo, the assistant creates the expense,
- **answers questions about VAT, PIT, CIT, and ZUS** in plain language,
- **reminds you of tax deadlines** before they pass.

You can start configuration with the [KSeF guide](/guide/ksef), and generate your token or certificate following the instructions in [how to get KSeF tokens](/guide/ksef/get-tokens).

## Frequently Asked Questions (FAQ)

**When is an invoice in KSeF considered issued?**
Only once it's accepted by the system and assigned a **KSeF number** along with a UPO. Simply filling in the form is not yet issuing the invoice.

**What is a KSeF number?**
It's a unique identifier assigned to every structured invoice (about 35 characters). It confirms that the document was issued and is needed, among other things, for corrections.

**Do I have to manually create the XML file in the FA(3) schema?**
No. You fill in a normal invoice form, and the accounting software or integration converts the data to FA(3) XML and sends it to KSeF automatically.

**How do I issue an invoice when KSeF is down?**
Use **offline24** or **emergency** mode: issue the invoice outside the system, mark it with a QR code, and send it to KSeF within the specified deadline (offline24 — usually the next business day; emergency mode — up to 7 days after the failure ends).

**How do I correct an error on an invoice in KSeF?**
With a correcting invoice, also issued in KSeF, referencing the KSeF number of the original invoice. Invoices in the system cannot be edited or cancelled.

**How does the buyer get my invoice?**
They download it from KSeF — the document is deemed received the moment it's assigned a KSeF number. You can still provide a PDF as well, but it's only a visualization.

---

*This article is for informational purposes only and does not constitute tax advice. Consult an accountant or tax advisor before making decisions. Legal status: July 2026.*
