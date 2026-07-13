---
slug: autouzupelnianie-danych-kontrahenta-nip-gus
locale: en
translationKey: autouzupelnianie-danych-kontrahenta-nip-gus
title: "Auto-Filling Counterparty Data from a NIP (GUS) — No More Manual Typing"
description: "Auto-fill counterparty data from a NIP via the GUS registry: name, address, REGON and status appear automatically. Fewer typos, correct invoices and JPK."
category: AI
tags: [nip, gus, counterparty, regon]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: eKsięgowy AI Team
status: published
---

# Auto-Filling Counterparty Data from a NIP (GUS) — No More Manual Typing

**In short:** Instead of copying a counterparty's name, address, and REGON (business registry number) from an invoice, you enter just the **NIP** (tax ID), and the company data **fills in automatically** from the **GUS (Central Statistical Office) registry — the REGON database**. That means fewer typos, faster invoicing, and a consistent counterparty record. In the same step you can also check the company on the **VAT white list (Biała lista)**, so you get everything at once: correct data *and* a confirmed bank account before you issue a document or order a transfer.

Adding a new counterparty is usually the same tedious routine: type in the name, watch out for the legal form, enter the address, and hunt down the REGON number somewhere. For one company it's a minor task; for a dozen or so a month, it's real time and a real risk of mistakes. And a typo in the name or a wrong NIP can spoil an invoice and create a mismatch in the JPK (Standard Audit File). This article shows where company data comes from, how auto-filling from a NIP works, and why it's worth pairing it with counterparty verification.

## Table of Contents

1. Why manual data entry is a problem
2. Where the data comes from — GUS, REGON, and VIES
3. How auto-filling from a NIP works
4. NIP data and the VAT white list in one step
5. Benefits: fewer errors, faster, a consistent record
6. How to use auto-fill in eKsięgowy AI
7. Limitations — data is only as current as the registry
8. FAQ

## 1. Why manual data entry is a problem

Manually entering counterparty data looks harmless, but it stacks up several kinds of risk at once:

- **Typos in the name and address** — "Sp. z o. o." instead of "sp. z o.o.", a missing letter in the street name, the wrong city. The invoice still "looks fine," yet it contains an error.
- **A wrong NIP** — swap two digits and the payment or document ends up with the wrong entity. This is the most common source of discrepancies in settlements.
- **An inconsistent record** — the same counterparty entered three times, in three variants of the name. Reports and summaries stop adding up.
- **Discrepancies in the JPK** — buyer and seller data from invoices flow into JPK files. If the NIP or name is wrong, a mismatch is easy to create — and then you have to correct it.

On top of that there's the plain cost of time. Every new counterparty entry means a few minutes of searching for and copying data from an invoice, an email, or the company's website. Auto-filling from a NIP eliminates that step almost entirely.

## 2. Where the data comes from — GUS, REGON, and VIES

Company data isn't "guessed" — it comes from official registries.

- **GUS / the REGON database.** The Central Statistical Office (Główny Urząd Statystyczny, GUS) maintains the REGON register, where every business entity has, among other things, a **full company name, registered address, REGON number, and NIP** on file. This is the registry data is pulled from once you enter a Polish company's NIP.
- **The VAT white list (Biała lista, Ministry of Finance).** It rounds out the picture with the counterparty's **VAT taxpayer status** (active / exempt) and the **account numbers** reported to the tax office. We cover the register itself in more detail in [VAT White List — How to Check a Counterparty](/blog/biala-lista-vat-jak-sprawdzic-kontrahenta).
- **VIES (for EU counterparties).** For foreign companies from the European Union, data and EU VAT status are confirmed through the **VIES** (VAT Information Exchange System) using a VAT number with a country prefix (e.g., `DE`, `CZ`). This is a separate source from the domestic REGON register.

In short: **REGON** answers "who the company is" (name, address, identifiers), while the **white list** and **VIES** answer "whether it's an active taxpayer and which account to pay into."

## 3. How auto-filling from a NIP works

The mechanism is simple and comes down to a single input field — the **NIP**.

1. **You enter the counterparty's NIP** (10 digits).
2. The system **queries the GUS registry** for the entity under that number.
3. **The record's fields fill in automatically** with data from the registry.
4. **You verify and save** — you have a ready-made counterparty without any manual typing.

What specifically usually gets filled in from just the NIP:

| Field | Source | Note |
|------|--------|-------|
| Full company name | GUS / REGON | Official form, including the legal form |
| Registered address | GUS / REGON | Street, postal code, city |
| REGON | GUS / REGON | The entity's statistical number |
| NIP | input data | Verified when the registry is queried |
| VAT status | VAT white list | Active / exempt (optional step) |
| Account number | VAT white list | Accounts reported to the tax office (optional step) |

The result: from a single piece of information (the NIP), you get a **complete counterparty record**, ready for issuing an invoice.

## 4. NIP data and the VAT white list in one step

The greatest value comes from combining two actions that are normally done separately:

- filling in identifying data (name, address, REGON) from the GUS registry,
- verifying the counterparty on the VAT white list (taxpayer status and account number).

Doing this together, a single NIP query gets you everything you need both to **issue a correct invoice** and to **make a safe payment**. This matters especially for larger transactions — as a reminder, for B2B payments **above PLN 15,000 gross**, paying into an account outside the white list risks losing the tax-deductible cost and incurring joint-and-several VAT liability. We cover the details in [VAT White List — How to Check a Counterparty](/blog/biala-lista-vat-jak-sprawdzic-kontrahenta).

So instead of "type in the data manually → then separately paste the NIP into the government search tool → then check the account," you get one step that handles everything.

## 5. Benefits: fewer errors, faster, a consistent record

- **Fewer errors.** The data comes from the registry, not from manual typing — typos in the name and address, and mistakes in the NIP/REGON, disappear.
- **Faster.** Instead of several minutes per counterparty — a few seconds. With a dozen or so new companies a month, the difference is noticeable.
- **A consistent record.** One correct version of the name and address for every counterparty. Summaries and reports add up, and there are no duplicates.
- **Accurate invoices and JPK filings.** Buyer data that matches the registry means less risk of discrepancies in JPK files and fewer corrections.
- **Due diligence.** Verifying a counterparty "along the way" while entering their data is a good, repeatable practice — with no extra effort.

## 6. How to use auto-fill in eKsięgowy AI

In [eKsięgowy AI](/), auto-fill works right in the conversation with the assistant — you don't need to hunt for data in several places.

1. **Give the counterparty's NIP** in the chat (e.g., "Add a counterparty with NIP 5252445211").
2. The assistant **pulls the company's data from the GUS registry** — name, address, and REGON.
3. If needed, it **checks the company on the VAT white list** — taxpayer status and account number.
4. **You confirm** — the counterparty is ready for invoicing (including e-invoices to KSeF, the National e-Invoice System).

Because the assistant is **integrated with wFirma**, the completed data lands right where you keep your books, without copying anything between systems. We describe other ways AI takes work off small businesses' plates day to day in [How AI Helps Small Business Accounting](/blog/jak-ai-pomaga-w-ksiegowosci-malej-firmy).

## 7. Limitations — data is only as current as the registry

Auto-fill is convenient, but it's worth knowing its limits:

- **Data quality depends on the registry.** If a company hasn't updated its address or name in REGON, the data you pull will reflect the registry's state, not "the truth as of today."
- **Short delays after changes.** A newly registered company or a recent data change may appear in the registry with some delay.
- **The NIP must be correct and active.** For a number that doesn't exist or has been deregistered, the registry won't return any data.
- **EU companies go through VIES, not REGON.** For a foreign counterparty, data is confirmed through the VIES system using an EU VAT number — the scope of information is often narrower than in REGON.
- **VAT status and the account change over time.** That's why it's worth repeating the white-list check on the day of payment, rather than relying on a check from weeks ago.

Auto-fill takes the tedious typing off your hands, but it's always worth doing a final confirmation of the data — especially the account before a large transfer — at the moment of the transaction.

## Automate your counterparty records with eKsięgowy AI

No more copying names and addresses from invoices. [eKsięgowy AI](/) is an AI assistant **integrated with wFirma** that **auto-fills company data from a NIP using the GUS registry**, **verifies counterparties on the VAT white list**, and then **issues e-invoices to KSeF**. In the same conversation you can also post a receipt from a photo thanks to **OCR in Telegram**, ask about **VAT, PIT, CIT, and ZUS**, and get **deadline reminders**. Less clicking, fewer typos, more peace of mind.

## Frequently Asked Questions (FAQ)

**Where does the auto-filled company data come from?**
From the **GUS registry (REGON database)** — the name, registered address, and REGON number. VAT status and the account number are additionally pulled from the **VAT white list**, and for EU companies data is confirmed via **VIES**.

**What exactly gets filled in from just the NIP?**
Usually the full company name, registered address, and REGON. Optionally, in the same step, also the VAT taxpayer status and account number from the white list.

**Does this work for companies from the European Union?**
For foreign counterparties from the EU, verification and data go through the VIES system using a VAT number with a country prefix. That's a different source from the domestic REGON register, and the scope of data is often narrower.

**Does auto-fill exempt me from checking the white list?**
No. Data from GUS tells you "who the company is," but you still need to keep an eye on VAT status and the account — ideally on the day of payment. Auto-fill makes this easier, because you do the verification along with entering the counterparty.

**What if the data in the registry is out of date?**
Auto-fill reflects the state of the registry. If a company hasn't updated, say, its address in REGON, you'll get the older version — which is why it's worth confirming key fields with the counterparty.

**Will the data land directly in my bookkeeping?**
In eKsięgowy AI, yes — the assistant is integrated with wFirma, so a completed counterparty is immediately ready for issuing an invoice or an e-invoice to KSeF.

---

*This article is for informational purposes only and does not constitute tax advice. Consult an accountant or tax advisor in individual cases. Legal status: July 2026.*
