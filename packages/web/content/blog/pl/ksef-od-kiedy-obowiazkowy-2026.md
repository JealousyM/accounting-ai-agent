---
slug: ksef-od-kiedy-obowiazkowy-2026
locale: pl
translationKey: ksef-od-kiedy-obowiazkowy-2026
title: "KSeF 2026 — od kiedy obowiązkowy, kto musi wystawiać e-faktury i jak się przygotować"
description: "KSeF od kiedy jest obowiązkowy? Harmonogram 2026–2027, kto musi wystawiać e-faktury, tryb offline, uprawnienia, kary i praktyczne kroki wdrożenia bez chaosu."
category: KSeF
tags: [ksef, e-faktura, faktura ustrukturyzowana, vat, fa(3)]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: Zespół eKsięgowy AI
status: published
---

# KSeF 2026 — od kiedy obowiązkowy, kto musi wystawiać e-faktury i jak się przygotować

**W skrócie:** Krajowy System e-Faktur (KSeF) jest wprowadzany etapami. Od **1 lutego 2026 r.** e-faktury są obowiązkowe dla największych firm (sprzedaż powyżej 200 mln zł), od **1 kwietnia 2026 r.** — dla pozostałych czynnych podatników VAT, a od **1 stycznia 2027 r.** obowiązek obejmie także najmniejszych przedsiębiorców (miesięczna sprzedaż do 10 000 zł brutto). Podstawą jest nowelizacja ustawy o VAT z 5 sierpnia 2025 r. (Dz.U. 2025 poz. 1203).

Jeśli prowadzisz firmę w Polsce, to pytanie nie brzmi już „czy”, tylko „jak sprawnie” przejść na KSeF. W tym przewodniku znajdziesz wszystko, co trzeba wiedzieć: czym jest system, aktualny harmonogram, kogo dokładnie obejmuje, co zmienia w codziennej pracy, jak działa tryb offline i awaryjny, jakie kary grożą za brak zgodności oraz gotową listę kroków wdrożenia.

## Spis treści

1. Co to jest KSeF i po co powstał
2. Faktura ustrukturyzowana i schemat FA(3)
3. Harmonogram — od kiedy obowiązkowy
4. Kogo dotyczy obowiązek i kto jest wyłączony
5. Co KSeF zmienia w codziennej pracy
6. Tryb offline i tryb awaryjny
7. Uprawnienia, token i certyfikat KSeF
8. Korekty, załączniki i faktury do paragonów
9. Kary za brak KSeF
10. Jak przygotować firmę — 7 kroków
11. Najczęstsze błędy
12. FAQ

## 1. Co to jest KSeF i po co powstał

**Krajowy System e-Faktur** to centralna, rządowa platforma Ministerstwa Finansów, przez którą przedsiębiorcy wystawiają, wysyłają i odbierają **faktury ustrukturyzowane**. Zamiast wymieniać się PDF-ami przez e-mail, obie strony transakcji korzystają z jednej bazy: sprzedawca wystawia fakturę w systemie, a ona natychmiast trafia do centralnego repozytorium i staje się dostępna dla nabywcy.

Cel jest dwojaki. Z perspektywy państwa to **uszczelnienie VAT** — fiskus widzi obrót fakturowy w czasie zbliżonym do rzeczywistego. Z perspektywy firm to **standaryzacja**: koniec z fakturami w dziesiątkach różnych układów graficznych, jeden format, jedno źródło prawdy i brak ryzyka „zaginięcia” faktury w skrzynce mailowej. Polska wpisuje się tym w szerszy trend e-fakturowania w Unii Europejskiej.

## 2. Faktura ustrukturyzowana i schemat FA(3)

Faktura w KSeF to nie PDF, lecz plik **XML** o ściśle określonej strukturze — tzw. **schemat FA(3)**. Dokument zawiera te same dane co klasyczna faktura (strony transakcji, pozycje, stawki VAT, kwoty), ale w formie, którą maszyna czyta jednoznacznie.

Po przyjęciu przez system każda faktura otrzymuje:

- **unikalny numer KSeF** — identyfikator nadany przez system,
- **urzędowy znacznik czasu** — moment przyjęcia, który jest dowodem wystawienia dokumentu.

W praktyce nie musisz „pisać XML-a” ręcznie — robi to za Ciebie program księgowy, system fakturowy lub integracja. Ty pracujesz na normalnym formularzu faktury, a konwersja do FA(3) dzieje się w tle.

## 3. Harmonogram — od kiedy obowiązkowy?

| Termin | Kogo obejmuje |
|---|---|
| **1 lutego 2026 r.** | Duzi podatnicy — sprzedaż w 2024 r. powyżej **200 mln zł** brutto |
| **1 kwietnia 2026 r.** | **Pozostali czynni podatnicy VAT** (w tym większość mikro- i małych firm) |
| **1 stycznia 2027 r.** | Najmniejsi — miesięczna sprzedaż brutto do **10 000 zł** oraz podmioty „wykluczone cyfrowo” |

> **Stan na dziś (lipiec 2026):** dla zdecydowanej większości firm B2B obowiązek już obowiązuje — od 1 kwietnia 2026 r. Jeśli nadal wystawiasz faktury wyłącznie poza KSeF, jesteś w grupie ryzyka. Ostatnia „furtka” — do 1 stycznia 2027 r. — dotyczy jedynie najmniejszych sprzedawców.

Warto pamiętać, że **odbierać** faktury w KSeF możesz (i często musisz) już wtedy, gdy Twoi kontrahenci są objęci obowiązkiem — nawet jeśli sam korzystasz jeszcze z okresu przejściowego przy wystawianiu.

## 4. Kogo dotyczy obowiązek i kto jest wyłączony

Obowiązek obejmuje transakcje:

- **B2B** — między przedsiębiorcami,
- **B2G** — na rzecz organów publicznych.

Dotyczy czynnych podatników VAT z siedzibą lub stałym miejscem prowadzenia działalności w Polsce. W praktyce to niemal każda firma wystawiająca faktury krajowe.

**Poza obowiązkowym KSeF (co do zasady) pozostają m.in.:**

- faktury dla konsumentów (**B2C**),
- podatnicy nieposiadający w Polsce siedziby ani stałego miejsca prowadzenia działalności,
- wybrane faktury uproszczone i przypadki szczególne wskazane w ustawie,
- bilety traktowane jak faktury, faktury z kas fiskalnych — w zakresie i terminach wskazanych w przepisach.

## 5. Co KSeF zmienia w codziennej pracy

To nie jest tylko „inny sposób wysyłki”. Zmienia się kilka nawyków:

- **Data wystawienia = data przesłania do KSeF.** Za datę wystawienia faktury uznaje się co do zasady dzień przesłania jej do systemu. To istotne dla momentu powstania obowiązku podatkowego.
- **Koniec wysyłki PDF mailem** jako podstawowej formy. Kontrahent objęty KSeF pobiera fakturę z systemu.
- **Odbiór faktur kosztowych** również przechodzi do KSeF — faktury od dostawców znajdziesz w jednym miejscu, co ułatwia księgowanie i ogranicza ryzyko zgubienia dokumentu.
- **Numer KSeF w płatnościach.** Docelowo numer KSeF ma pojawiać się przy przelewach (zwłaszcza w mechanizmie podzielonej płatności); część tych obowiązków była odraczana — sprawdź stan na dzień publikacji.
- **Archiwizacja** faktur po stronie systemu — dokumenty są przechowywane centralnie przez określony czas.

## 6. Tryb offline i tryb awaryjny

Ustawodawca przewidział sytuacje, gdy wystawienie faktury „na żywo” w KSeF nie jest możliwe:

- **Tryb offline (offline24)** — możesz wystawić fakturę poza systemem i przesłać ją do KSeF w wyznaczonym terminie (np. najbliższego dnia roboczego). Faktura otrzymuje wtedy odpowiednie oznaczenia i kod.
- **Tryb awaryjny** — uruchamiany, gdy niedostępny jest sam system KSeF (komunikaty publikuje Ministerstwo Finansów).

Dzięki temu awaria łącza czy systemu nie paraliżuje sprzedaży — ważne, by narzędzie, z którego korzystasz, obsługiwało te tryby i automatycznie „dosyłało” faktury po przywróceniu połączenia.

## 7. Uprawnienia, token i certyfikat KSeF

Żeby wystawiać i pobierać faktury, potrzebujesz **uprawnień** w systemie oraz sposobu uwierzytelnienia:

- właściciel firmy nadaje uprawnienia (sobie, pracownikom, biuru rachunkowemu),
- do integracji z programem księgowym służy **token** lub **certyfikat KSeF**,
- uprawnienia można różnicować — np. ktoś tylko wystawia, ktoś tylko przegląda.

To element, który najlepiej skonfigurować **zanim** obowiązek zacznie Cię dotyczyć — nadawanie uprawnień i generowanie tokenu bywa najbardziej „urzędowym” etapem całego wdrożenia. Zobacz [przewodnik: jak uzyskać tokeny KSeF](/guide/ksef/get-tokens).

## 8. Korekty, załączniki i faktury do paragonów

- **Faktury korygujące** wystawia się również w KSeF, z odwołaniem do numeru KSeF faktury pierwotnej.
- **Nota korygująca** w dotychczasowej formie zmienia swoją rolę — sprawdź aktualne zasady korygowania danych nabywcy.
- **Załączniki** do faktur (specyfikacje, protokoły) obsługiwane są w ograniczony, ustandaryzowany sposób — to częste źródło pytań w firmach, które dołączały do faktur dodatkowe pliki.
- **Faktury do paragonów** i faktury uproszczone mają odrębne zasady i terminy włączenia do obowiązku.

## 9. Kary za brak KSeF

Za wystawianie faktur poza systemem, gdy jest to już obowiązkowe, ustawa przewiduje sankcje administracyjne:

- **do 100% kwoty VAT** wykazanego na fakturze wystawionej niezgodnie z przepisami,
- a dla faktur bez wykazanego VAT — do **18,7% kwoty należności ogółem**.

Ustawodawca przewidywał również **okres przejściowy**, w którym kary nie są nakładane, aby dać firmom czas na adaptację — jego zakres i data końcowa były zmieniane, więc **koniecznie zweryfikuj aktualny stan** przed publikacją.

Poza samą karą finansową liczy się ryzyko praktyczne: kontrahent objęty KSeF może nie przyjąć faktury spoza systemu, bo nie będzie ona dla niego dokumentem odbieranym w standardowy sposób.

## 10. Jak przygotować firmę — 7 kroków

1. **Ustal swój termin.** Sprawdź, w której grupie jesteś — data zależy od poziomu sprzedaży.
2. **Wybierz narzędzie zgodne z KSeF.** Program księgowy, system fakturowy albo integracja, która wysyła faktury do KSeF za Ciebie.
3. **Nadaj uprawnienia** sobie, pracownikom i biuru rachunkowemu.
4. **Wygeneruj token / certyfikat KSeF** do integracji.
5. **Przetestuj wystawianie i odbiór** na kilku dokumentach — zanim obowiązek „zaskoczy” Cię przy realnej sprzedaży.
6. **Sprawdź tryby offline i awaryjny** — upewnij się, że Twoje narzędzie je obsługuje.
7. **Ustal proces na co dzień** — kto wystawia, kto pilnuje statusów i numerów KSeF, gdzie trafiają faktury kosztowe.

## 11. Najczęstsze błędy

- **Zwlekanie z uprawnieniami i tokenem** — to najczęstszy powód „pożaru” tuż przed terminem.
- **Brak pomysłu na tryb offline** — pierwsza awaria łącza kończy się paniką.
- **Ignorowanie faktur kosztowych** — firma wdraża wystawianie, a zapomina, że faktury od dostawców też trzeba odbierać z KSeF.
- **Poleganie na starym obiegu PDF** — wysyłanie PDF „dla pewności” tworzy podwójny obieg i bałagan.
- **Brak weryfikacji dat** — mylenie daty wystawienia (przesłania do KSeF) z datą sprzedaży.

## 12. KSeF w praktyce z eKsięgowy AI

Jeśli korzystasz z **wFirma**, e-faktury do KSeF możesz wysyłać bez przebudowy całego procesu — [eKsięgowy AI](/) łączy się z Twoim kontem i pozwala wystawić oraz wysłać fakturę do KSeF wprost w rozmowie z asystentem, a także sprawdzić jej status. Asystent podpowie również terminy podatkowe i przypomni o obowiązkach, zanim miną. Zacznij od [przewodnika konfiguracji KSeF](/guide/ksef).

## Najczęstsze pytania (FAQ)

**Od kiedy KSeF jest obowiązkowy dla małej firmy?**
Dla większości mikro- i małych firm — od **1 kwietnia 2026 r.** Najmniejsi sprzedawcy (do 10 000 zł miesięcznie) mają czas do **1 stycznia 2027 r.**

**Czy faktury dla osób prywatnych (B2C) muszą iść przez KSeF?**
Nie — obowiązek dotyczy transakcji B2B i B2G. Faktury konsumenckie pozostają poza obowiązkowym KSeF.

**Co to jest numer KSeF?**
To unikalny identyfikator nadawany każdej fakturze ustrukturyzowanej wraz z urzędowym znacznikiem czasu — potwierdza wystawienie dokumentu.

**Co zrobić, gdy nie mam internetu albo KSeF nie działa?**
Skorzystać z trybu offline lub awaryjnego i przesłać fakturę do systemu w wyznaczonym terminie. Dobre narzędzie robi to automatycznie po przywróceniu połączenia.

**Czy mogę wystawiać faktury w KSeF ręcznie?**
Tak, przez rządową aplikację Ministerstwa Finansów, ale przy większej liczbie dokumentów wygodniejsza jest integracja z programem księgowym lub asystentem.

**Jak wygląda korekta faktury w KSeF?**
Fakturę korygującą również wystawiasz w KSeF, odwołując się do numeru KSeF faktury pierwotnej. Szczegółowe zasady dla danych nabywcy sprawdź w aktualnych przepisach.

---

*Artykuł ma charakter informacyjny i nie stanowi porady podatkowej. Przed decyzjami skonsultuj się z księgowym lub doradcą podatkowym. Stan prawny: lipiec 2026.*
