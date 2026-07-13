---
slug: biala-lista-vat-jak-sprawdzic-kontrahenta
locale: en
translationKey: biala-lista-vat-jak-sprawdzic-kontrahenta
title: "VAT White List — How to Check a Counterparty, Avoid Sanctions, and Not Lose the Cost"
description: "VAT taxpayer white list: how to check a counterparty and their bank account, the PLN 15,000 threshold, sanctions, split payment, virtual accounts, and the 7-day rescue (ZAW-NR)."
category: VAT
tags: [white list, vat, counterparty, tax-deductible costs, zaw-nr, split payment]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: eKsięgowy AI Team
status: published
---

# VAT White List — How to Check a Counterparty, Avoid Sanctions, and Not Lose the Cost

**In short:** If you pay a business **more than PLN 15,000 gross** for a transaction to an account that **isn't on the VAT white list**, you risk **losing the tax-deductible cost** and **joint-and-several liability** for its VAT. The rescue is filing a **ZAW-NR** notification within **7 days** of ordering the transfer — or paying via **split payment**. That's why it's worth checking a counterparty's account **on the day of payment**.

The white list sounds like a formality — until a perfectly legitimate, paid expense drops out of your costs simply because the money went to the "wrong" account number. This guide shows how the register works, when you actually need to verify an account, what the sanctions are, and how to protect yourself against them.

## Table of Contents

1. What the VAT taxpayer white list is
2. What exactly you'll find in the register
3. The PLN 15,000 threshold — when you need to check
4. Sanctions for a transfer outside the list
5. ZAW-NR — the 7-day rescue
6. Split payment as a shield
7. Pitfalls: virtual accounts, factoring, continuous services
8. When you do NOT need to check
9. How to check a counterparty — step by step
10. The most common mistakes
11. FAQ

## 1. What the VAT taxpayer white list is

The **White List** (Biała lista) is a public, free register of VAT taxpayers maintained by the Head of the National Revenue Administration (Szef Krajowej Administracji Skarbowej) and published on the Ministry of Finance's website. It was created to **tighten up VAT compliance** and give businesses one reliable source of information about a counterparty — including the bank accounts they've reported to the tax office.

The **bank account** is the heart of the entire mechanism: the whole sanction structure comes down to whether you paid into an account that appears on the register.

## 2. What exactly you'll find in the register

For a given taxpayer, the white list shows, among other things:

- **VAT status** — active, exempt, unregistered, or removed from the register,
- **NIP (tax ID) and REGON (business registry number)**,
- **settlement account numbers** reported to the tax office,
- **dates of registration, removal, and reinstatement** of VAT taxpayer status,
- the legal basis for refusing registration or for removal (if applicable).

The register reflects the state on a **specific day** — this matters, because a counterparty's status and accounts can change. A check from a week ago doesn't protect you the same way a check on the day of the transfer does.

## 3. The PLN 15,000 threshold — when you need to check

The obligation to pay into an account from the white list applies to **B2B transactions worth more than PLN 15,000 gross**. Key rules:

- what counts is the **single transaction value**, not an individual payment — splitting the amount owed into several transfers **changes nothing**,
- the threshold applies to transactions **between businesses**,
- the **gross** amount is used against the threshold.

**Example.** You buy goods for PLN 24,600 gross and pay in three installments of PLN 8,200 each. Although each installment is below PLN 15,000, what counts is the whole transaction (PLN 24,600) — so **every** one of those payments should go to an account from the white list.

## 4. Sanctions for a transfer outside the list

Paying more than PLN 15,000 into an account not on the register risks two consequences:

1. **No tax-deductible cost (KUP)** — the expense (in the part paid into the wrong account) can't be counted as a tax-deductible cost. This genuinely increases your income tax.
2. **Joint-and-several VAT liability** — if the counterparty fails to pay the VAT due on that transaction, the tax authority can pursue it from you as well.

This is particularly painful because it hits a business that *paid correctly* — just to the wrong account number.

## 5. ZAW-NR — the 7-day rescue

If a transfer has already gone to an account outside the list, not all is lost. You can avoid the sanctions by filing a **ZAW-NR** notification:

- **deadline: 7 days** from the day the **transfer was ordered** (the deadline is strict — every day counts),
- you file it with the **head of the tax office responsible for you** (the payer making the transfer), **not** for the counterparty,
- once filed, you retain the right to the cost and avoid joint-and-several liability.

> **Tip:** set an internal rule — "transfer above PLN 15,000 to an unknown account = automatic ZAW-NR reminder." Seven days passes faster than you'd think.

## 6. Split payment as a shield

Paying via the **split payment mechanism (MPP)** protects against white-list sanctions in many cases — even when the account doesn't appear on the register. It's a convenient "default safeguard" for larger, one-off payments. Note, however, that MPP has its own rules (including being mandatory for certain goods and services listed in Annex 15 / załącznik nr 15) and doesn't exempt you from reasonably verifying your counterparty.

## 7. Pitfalls: virtual accounts, factoring, continuous services

- **Virtual accounts (virtual sub-accounts)** — e.g., individual payment numbers used by telecom operators or utility providers. They don't appear directly on the register, but they're often linked to a settlement account that is. The Ministry of Finance's search tool can "recognize" such an account.
- **Factoring and assignments** — the payment goes to the factor, not to the invoice issuer. This requires separate analysis, since the factor's account is governed by its own rules.
- **Continuous services / subscriptions** — with recurring payments it's easy to exceed the PLN 15,000 threshold over the life of the contract; assess the value of the transaction as a whole, not a single invoice.

## 8. When you do NOT need to check

The obligation doesn't apply to, among others:

- transactions **up to PLN 15,000 gross**,
- payments **other than a bank transfer** (e.g., card, cash within the permitted scope — remember the separate cash payment limit),
- transactions with entities **that are not active VAT taxpayers**, to the extent the mechanism doesn't cover them.

Even so, verifying a counterparty's VAT status can be sensible below the threshold too — if only to confirm you're dealing with an active taxpayer.

## 9. How to check a counterparty — step by step

1. Go to the **white list search tool** on the Ministry of Finance's website.
2. Enter the counterparty's **NIP** (or account number).
3. Check their **VAT status** and whether the **account number on the invoice** is on the list.
4. **Save the confirmation** — the search tool lets you download a dated proof of verification. This is your safeguard in case of an audit.

What matters is the status **on the day the transfer was ordered**. With many counterparties, manual checking is time-consuming — it's worth automating (a bulk API for the register is also available).

## 10. The most common mistakes

- **Checking "once and for all"** — accounts and status change; what counts is the day of payment.
- **Splitting a transaction into smaller transfers** hoping to get around the threshold — the threshold applies to the whole transaction.
- **Not documenting the verification** — without a saved confirmation it's harder to demonstrate due diligence.
- **Missing the 7-day window for ZAW-NR** — the costliest mistake, since it removes your "lifeline."
- **Confusing the tax office** — you file ZAW-NR with your own tax office, not the counterparty's.

## Automate verification with eKsięgowy AI

Manually pasting NIP numbers into the government search tool for every payment is tedious and error-prone. In [eKsięgowy AI](/) you can check a counterparty on the **VAT white list** right in a conversation with the assistant — it will report the taxpayer's status and confirm the account before you order the transfer. The assistant can also help [fill in company data from a NIP](/) using the GUS registry, so your counterparty's record is complete and accurate from the start.

## Frequently Asked Questions (FAQ)

**From what amount does the white list apply?**
Sanctions apply to B2B transactions **above PLN 15,000 gross**. Below that threshold there's no obligation to pay into an account from the register, though verification is often sensible anyway.

**How much time do I have for ZAW-NR?**
**7 days** from the day the transfer to an account outside the white list was ordered.

**Where do I file ZAW-NR?**
With the head of the tax office **responsible for you** (the taxpayer making the payment).

**Does split payment exempt me from the obligation to check?**
Paying via the split payment mechanism protects against sanctions in many cases, but doesn't exempt you from reasonably verifying your counterparty.

**What about a virtual account that isn't on the list?**
Virtual accounts are often linked to a settlement account that is on the register — the Ministry of Finance's search tool can recognize them by number. It's always worth confirming.

**Do I have to check every invoice?**
Not every one — the obligation depends on the transaction value (above PLN 15,000) and the payment method (bank transfer). But for larger payments, checking the account should be routine.

---

*This article is for informational purposes only and does not constitute tax advice. Consult an accountant or tax advisor in individual cases. Legal status: July 2026.*
