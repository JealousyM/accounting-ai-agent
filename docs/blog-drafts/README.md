# Blog drafts — eKsięgowy AI

Artykuły blogowe pod SEO (rynek polski). **Źródło treści bloga to pliki Markdown w**
**`packages/web/content/blog/<locale>/`** — renderowane jako statyczne strony `/blog`.
Publikacja = ustaw `status: published` we frontmatterze + commit + deploy. Do czasu
weryfikacji wszystkie pozostają `status: draft` (publiczny blog ich nie pokazuje).

Ten katalog (`docs/blog-drafts/`) pełni rolę **logu redakcyjnego / checklisty weryfikacji**;
same artykuły przeniesiono do `packages/web/content/blog/pl/`.

## Zasady

- **Język:** najpierw PL (tam jest cały ruch dla tematów podatkowych). en/ru — opcjonalne
  tłumaczenia per artykuł, dodawane później. `hreflang` ogłasza tylko realnie istniejące wersje.
- **YMYL:** to tematy podatkowe. Każda zmienna kwota/data jest oznaczona
  **`[DO SPRAWDZENIA 2026]`** — zweryfikuj przed publikacją (stawki i terminy zmieniają się co roku).
- **CTA:** każdy artykuł prowadzi naturalnie do produktu (integracja wFirma/KSeF,
  weryfikacja białej listy, kalendarz terminów).

## Schemat frontmattera

`slug`, `locale`, `translationKey` (grupuje tłumaczenia pl/en/ru dla hreflang),
`title`, `description` (meta ≤160 zn.), `category`, `tags[]`, `publishedAt`,
`updatedAt`, `author`, `status` (`draft` | `published`), opcjonalnie `coverImage`,
`ogImage`, `faq` (`[{q,a}]` → FAQPage JSON-LD).

## Plan treści — 12/12 napisane (wersje robocze)

### 🔥 KSeF
- [x] `ksef-od-kiedy-obowiazkowy-2026` — od kiedy obowiązkowy, kto, kary
- [x] `jak-wystawic-fakture-ksef-krok-po-kroku` — instrukcja wystawiania e-faktury
- [x] `ksef-a-wfirma-jak-wysylac-efaktury` — wysyłka e-faktur przez integrację

### 💰 VAT
- [x] `biala-lista-vat-jak-sprawdzic-kontrahenta` — limit 15 000 zł, sankcje, ZAW-NR
- [x] `terminy-vat-jpk-v7-2026` — kalendarz płatności VAT/JPK_V7
- [x] `split-payment-kiedy-obowiazkowy` — MPP, załącznik nr 15, sankcje

### 🧾 JDG / ZUS / PIT
- [x] `skladki-zus-2026-przedsiebiorca` — duży/mały ZUS, zdrowotna, terminy
- [x] `ryczalt-czy-zasady-ogolne-jak-wybrac` — porównanie form opodatkowania
- [x] `zaliczki-pit-jdg-terminy-wyliczenie` — terminy i wyliczenie zaliczek PIT

### 🤖 AI / produkt
- [x] `jak-ai-pomaga-w-ksiegowosci-malej-firmy` — 7 zadań asystenta
- [x] `ocr-paragonow-telegram-zaksieguj-wydatek` — księgowanie paragonów ze zdjęcia
- [x] `autouzupelnianie-danych-kontrahenta-nip-gus` — dane po NIP z GUS

## ⚠️ Priorytetowe do zweryfikowania przed publikacją

- **Składka zdrowotna na ryczałcie (2026):** źródła podają dwa zestawy kwot —
  `498,35 / 830,58 / 1 495,04 zł` **albo** `376,16 / 626,93 / 1 128,48 zł`.
  W `ryczalt-czy-zasady-ogolne-jak-wybrac` i `skladki-zus-2026-przedsiebiorca` użyto
  **pierwszego zestawu** (spójnie) — potwierdź właściwy przed publikacją.
- **Terminy KSeF** (1.02 / 1.04.2026 / 1.01.2027) oraz okres bez kar — zweryfikuj aktualny stan.
- **Ścieżki UI w wFirma** (nazwy zakładek/przycisków) w `ksef-a-wfirma…` — najbardziej „ruchome".

## Przed publikacją — checklist

1. Zweryfikuj wszystkie `[DO SPRAWDZENIA 2026]` (kwoty ZUS, daty KSeF, procedura ZAW-NR).
2. Podmień placeholdery linków wewnętrznych (`/`) na docelowe adresy artykułów/stron.
3. Dodaj `Article`/`BlogPosting` + `FAQPage` JSON-LD (sekcje FAQ są już gotowe pod schema).
4. Wpisz artykuły do `sitemap.ts` (PUBLIC_PATHS albo dynamicznie z bazy).
