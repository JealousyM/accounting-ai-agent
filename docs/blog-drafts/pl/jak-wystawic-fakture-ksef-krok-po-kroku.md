---
slug: jak-wystawic-fakture-ksef-krok-po-kroku
locale: pl
title: "Jak wystawić fakturę w KSeF — krok po kroku"
description: "Jak wystawić fakturę w KSeF krok po kroku: uprawnienia, token i certyfikat, logowanie, schemat FA(3), numer KSeF i UPO, korekty oraz tryb offline i awaryjny."
category: KSeF
tags: [ksef, e-faktura, faktura, instrukcja]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: Zespół eKsięgowy AI
status: draft
# Uwaga redakcyjna: pozycje oznaczone [DO SPRAWDZENIA 2026] zweryfikuj
# przed publikacją — przepisy, terminy i parametry techniczne KSeF były wielokrotnie zmieniane.
---

# Jak wystawić fakturę w KSeF — krok po kroku

**W skrócie:** Żeby wystawić fakturę w Krajowym Systemie e-Faktur (KSeF), potrzebujesz trzech rzeczy: **uprawnień** w systemie, sposobu **uwierzytelnienia** (token lub certyfikat KSeF, ewentualnie podpis kwalifikowany) oraz **narzędzia zgodnego z KSeF**. Fakturę wypełniasz jak zwykle — dane stron, pozycje, stawki VAT — a program konwertuje ją do formatu **XML w schemacie FA(3)** i wysyła do systemu. Po weryfikacji faktura dostaje **unikalny numer KSeF** i **UPO** (Urzędowe Poświadczenie Odbioru), i dopiero wtedy jest uznana za wystawioną. Dla większości firm to obowiązek już od **1 kwietnia 2026 r.** [DO SPRAWDZENIA 2026]

Ten poradnik przeprowadza Cię przez cały proces: od przygotowania uprawnień, przez wypełnienie i wysyłkę faktury, po odbiór dokumentu przez nabywcę, korektę oraz wystawianie faktur w trybie offline i awaryjnym. Jeśli dopiero zastanawiasz się, kogo i od kiedy obejmuje obowiązek, zacznij od artykułu [KSeF — od kiedy obowiązkowy w 2026](/blog/ksef-od-kiedy-obowiazkowy-2026).

## Spis treści

1. Co jest potrzebne, zanim wystawisz pierwszą fakturę
2. Uwierzytelnienie i logowanie do KSeF
3. Wypełnienie faktury — dane, pozycje, stawki, schemat FA(3)
4. Wysyłka faktury do KSeF — krok po kroku
5. Numer KSeF i potwierdzenie (UPO)
6. Jak nabywca odbiera fakturę
7. Korekta faktury w KSeF
8. Tryb offline i awaryjny — gdy system nie działa
9. Najczęstsze błędy
10. Jak zrobić to prościej — integracja wFirma i asystent AI
11. FAQ

## 1. Co jest potrzebne, zanim wystawisz pierwszą fakturę

Zanim klikniesz „wyślij", upewnij się, że masz skonfigurowane trzy elementy:

- **Uprawnienia w KSeF.** Domyślnie uprawnienia właścicielskie ma sam podatnik. W spółce administratora wyznacza się, składając do urzędu skarbowego druk **ZAW-FA** — wskazana osoba może potem nadawać uprawnienia pracownikom i biuru rachunkowemu (osobno do wystawiania i osobno do odbioru faktur).
- **Sposób uwierzytelnienia.** Do pracy w programie księgowym zintegrowanym z API potrzebujesz **tokenu** lub **certyfikatu KSeF**. Token zawiera w sobie uprawnienia nadane w chwili jego wygenerowania; certyfikat jest wyłącznie środkiem uwierzytelnienia (jak podpis kwalifikowany) i sam nie przenosi uprawnień. Certyfikaty można pozyskać przez **Moduł Certyfikatów i Uprawnień (MCU)** — dostępny od 1 listopada 2025 r. [DO SPRAWDZENIA 2026]
- **Narzędzie zgodne z KSeF.** Program księgowy, system fakturowy albo integracja (np. z wFirma), które generuje XML w schemacie FA(3) i komunikuje się z API KSeF. Ręczne wystawianie jest możliwe w bezpłatnej aplikacji Ministerstwa Finansów, ale przy większej liczbie faktur integracja jest znacznie wygodniejsza.

> **Token czy certyfikat?** Tokeny mają działać równolegle z certyfikatami do końca 2026 r., a od **1 stycznia 2027 r.** certyfikaty KSeF mają całkowicie zastąpić tokeny. Jeśli konfigurujesz się teraz, warto od razu rozważyć certyfikat. [DO SPRAWDZENIA 2026] Szczegóły znajdziesz w przewodniku [jak uzyskać tokeny KSeF](/guide/ksef/get-tokens).

## 2. Uwierzytelnienie i logowanie do KSeF

Uwierzytelnienie to potwierdzenie, „kim jesteś" wobec systemu. W praktyce masz do wyboru kilka metod:

- **Token KSeF** — wpisujesz go raz w ustawieniach programu księgowego; dalsza komunikacja z systemem dzieje się automatycznie.
- **Certyfikat KSeF** — plik używany przez aplikacje zintegrowane z API oraz do logowania w portalu.
- **Podpis kwalifikowany lub pieczęć elektroniczna** — wygodne przy pierwszej konfiguracji uprawnień i logowaniu do portalu KSeF.
- **Profil zaufany / e-podpis** — dla logowania osoby fizycznej do aplikacji rządowej.

W programie księgowym uwierzytelnienie konfigurujesz zwykle raz. Od tego momentu nie logujesz się „ręcznie" do KSeF przy każdej fakturze — aplikacja robi to w tle, korzystając z zapisanego tokenu lub certyfikatu.

## 3. Wypełnienie faktury — dane, pozycje, stawki, schemat FA(3)

Dobra wiadomość: **nie piszesz XML-a ręcznie**. Pracujesz na normalnym formularzu faktury, a konwersja do struktury **FA(3)** dzieje się automatycznie. Schemat FA(3) obowiązuje dla faktur ustrukturyzowanych od **1 lutego 2026 r.** [DO SPRAWDZENIA 2026]

Wypełniając fakturę, zwróć uwagę na pola, które w KSeF są szczególnie istotne:

| Element faktury | Na co uważać |
|---|---|
| **Dane sprzedawcy** | NIP musi zgadzać się z uprawnieniami, na których działasz |
| **Dane nabywcy** | Kluczowy jest **poprawny NIP** — błąd wymaga później korekty (patrz sekcja 7) |
| **Pozycje** | Nazwa towaru/usługi, ilość, cena jednostkowa, kwota netto |
| **Stawki VAT** | 23%, 8%, 5%, 0%, „zw" lub „np" — zgodnie z rodzajem sprzedaży |
| **Kwoty** | Netto, VAT i brutto muszą się sumować bez rozjazdów groszowych |
| **Data sprzedaży** | Odrębna od daty wystawienia (patrz niżej) |

Pamiętaj, że **za datę wystawienia** faktury ustrukturyzowanej uznaje się co do zasady dzień jej **przesłania do KSeF** — a nie dzień, w którym wypełniłeś formularz. To ma znaczenie dla momentu powstania obowiązku podatkowego. [DO SPRAWDZENIA 2026]

## 4. Wysyłka faktury do KSeF — krok po kroku

Cały proces w programie zgodnym z KSeF sprowadza się do kilku kroków:

1. **Zaloguj się** do programu księgowego lub portalu KSeF (uwierzytelnienie z sekcji 2).
2. **Utwórz nową fakturę** ustrukturyzowaną i wypełnij dane stron oraz pozycje.
3. **Sprawdź poprawność** — zwłaszcza NIP nabywcy, stawki VAT i sumy.
4. **Wyślij do KSeF.** Program konwertuje dokument do XML FA(3) i przekazuje go do systemu.
5. **System weryfikuje** fakturę pod kątem zgodności ze schematem i danych.
6. **Odbierz numer KSeF i UPO** — dopiero po nadaniu numeru faktura jest wystawiona.

Jeśli faktura ma błąd strukturalny (np. niezgodność ze schematem FA(3)), system ją **odrzuci** i zwróci komunikat — wtedy poprawiasz dane i wysyłasz ponownie. Odrzucona faktura nie funkcjonuje w obrocie, więc nie trzeba jej „anulować".

## 5. Numer KSeF i potwierdzenie (UPO)

Po poprawnym przyjęciu faktury system nadaje jej **unikalny numer KSeF** (identyfikator liczący ok. 35 znaków [DO SPRAWDZENIA 2026]) oraz generuje **UPO — Urzędowe Poświadczenie Odbioru**. To dwa najważniejsze dowody w całym procesie:

- **numer KSeF** jednoznacznie identyfikuje fakturę w systemie i będzie potrzebny m.in. przy korekcie oraz w płatnościach,
- **UPO** wraz z urzędowym znacznikiem czasu potwierdza, że dokument został przyjęty — to Twój dowód wystawienia faktury.

Warto zapisywać numer KSeF i UPO w swoim systemie. Faktury, które otrzymały numer KSeF, **nie podlegają już edycji ani anulowaniu** — każdą zmianę wprowadza się fakturą korygującą.

## 6. Jak nabywca odbiera fakturę

W KSeF nie wysyłasz faktury mailem — nabywca **pobiera ją z systemu**. Co do zasady dokument uznaje się za **otrzymany z chwilą nadania mu numeru KSeF**. To ważna zmiana: moment „doręczenia" nie zależy już od tego, kiedy kontrahent otworzy e-mail.

W praktyce nabywca (albo jego biuro rachunkowe) widzi Twoją fakturę wśród dokumentów kosztowych w swoim programie zintegrowanym z KSeF i księguje ją bez przepisywania danych. Dla wygody kontrahenta możesz nadal przekazać mu wizualizację faktury (PDF) — ale to już tylko forma informacyjna, a dokumentem źródłowym jest faktura w KSeF.

## 7. Korekta faktury w KSeF

Skoro faktury w KSeF nie da się edytować, każdą pomyłkę poprawia się **fakturą korygującą wystawioną również w KSeF**. Kluczowe zasady:

- w korekcie podajesz **numer KSeF faktury pierwotnej**, której dotyczy zmiana,
- wskazujesz poprawione dane, opis zmian oraz aktualne kwoty podstawy opodatkowania i VAT,
- klasyczna **nota korygująca w dotychczasowej formie odchodzi** — dane koryguje sprzedawca fakturą korygującą. [DO SPRAWDZENIA 2026]

Szczególny przypadek to **błędny NIP nabywcy**. Zwykle wymaga on dwóch dokumentów: faktury korygującej „do zera" (zerującej fakturę z błędnym NIP) oraz nowej faktury pierwotnej z prawidłowym NIP. [DO SPRAWDZENIA 2026]

## 8. Tryb offline i awaryjny — gdy system nie działa

Ustawodawca przewidział sytuacje, w których nie wystawisz faktury „na żywo" w KSeF. W każdym z tych trybów faktura i tak musi mieć strukturę **FA(3)** i być oznaczona odpowiednim **kodem QR**.

| Tryb | Kiedy | Termin przesłania do KSeF |
|---|---|---|
| **offline24** | Z Twojej inicjatywy — brak internetu lub świadoma decyzja | Najpóźniej **następnego dnia roboczego** [DO SPRAWDZENIA 2026] |
| **offline** | Zapowiedziana przerwa techniczna po stronie MF | W terminie wskazanym w komunikacie [DO SPRAWDZENIA 2026] |
| **awaryjny** | Poważna, ogłoszona awaria KSeF | W ciągu **7 dni** po ustaniu awarii [DO SPRAWDZENIA 2026] |

W trybie offline i awaryjnym faktura bywa oznaczana **dwoma kodami QR** — z oznaczeniem „OFFLINE" oraz kodem z certyfikatu KSeF („CERTYFIKAT"). [DO SPRAWDZENIA 2026] Przy całkowitej awarii (np. zagrożenie infrastruktury krytycznej) dopuszcza się wyjątkowo faktury poza KSeF, bez obowiązku ich późniejszego przesłania. [DO SPRAWDZENIA 2026]

Najważniejsze w praktyce: dobre narzędzie **samo dosyła** faktury do KSeF po przywróceniu połączenia, więc awaria łącza nie paraliżuje sprzedaży.

## 9. Najczęstsze błędy

- **Zły NIP nabywcy** — najbardziej kosztowna pomyłka, bo korekta wymaga zwykle dwóch dokumentów.
- **Traktowanie PDF jak faktury** — dokumentem jest faktura w KSeF, PDF to tylko wizualizacja.
- **Mylenie daty wystawienia z datą sprzedaży** — data wystawienia to dzień przesłania do KSeF.
- **Zwlekanie z uprawnieniami i tokenem/certyfikatem** — konfiguracja „na ostatnią chwilę" to najczęstszy powód paniki przed terminem.
- **Brak planu na tryb offline** — pierwsza awaria łącza kończy się chaosem, jeśli narzędzie nie obsługuje trybów szczególnych.
- **Nieodbieranie faktur kosztowych** — obowiązek działa w obie strony: faktury od dostawców też odbierasz z KSeF.

## 10. Jak zrobić to prościej — integracja wFirma i asystent AI

Jeśli prowadzisz księgowość w **wFirma**, nie musisz przebudowywać całego procesu. [eKsięgowy AI](/) to asystent zintegrowany z wFirma, który **wystawia i wysyła e-faktury do KSeF wprost w rozmowie** oraz sprawdza ich status — bez klikania po kolejnych ekranach.

Poza samą wysyłką asystent pomaga w codziennych obowiązkach:

- **weryfikuje kontrahentów na białej liście VAT** przed transakcją,
- **autouzupełnia dane po NIP z GUS**, więc rzadziej pomylisz się w danych nabywcy,
- **księguje paragony ze zdjęć w Telegramie** (OCR) — wysyłasz fotkę, asystent tworzy wydatek,
- **odpowiada na pytania o VAT, PIT, CIT i ZUS** prostym językiem,
- **przypomina o terminach podatkowych**, zanim miną.

Konfigurację zaczniesz od [przewodnika KSeF](/guide/ksef), a token lub certyfikat wygenerujesz według instrukcji [jak uzyskać tokeny KSeF](/guide/ksef/get-tokens).

## Najczęstsze pytania (FAQ)

**Kiedy faktura w KSeF jest uznana za wystawioną?**
Dopiero po przyjęciu przez system i nadaniu jej **numeru KSeF** wraz z UPO. Samo wypełnienie formularza to jeszcze nie wystawienie faktury.

**Czym jest numer KSeF?**
To unikalny identyfikator nadawany każdej fakturze ustrukturyzowanej (ok. 35 znaków [DO SPRAWDZENIA 2026]). Potwierdza wystawienie dokumentu i jest potrzebny m.in. przy korekcie.

**Czy muszę ręcznie tworzyć plik XML w schemacie FA(3)?**
Nie. Wypełniasz zwykły formularz faktury, a program księgowy lub integracja konwertuje dane do XML FA(3) i wysyła je do KSeF automatycznie.

**Jak wystawić fakturę, gdy KSeF nie działa?**
Skorzystaj z trybu **offline24** lub **awaryjnego**: wystaw fakturę poza systemem, oznacz ją kodem QR i prześlij do KSeF w wyznaczonym terminie (offline24 — zwykle następny dzień roboczy; tryb awaryjny — do 7 dni po ustaniu awarii). [DO SPRAWDZENIA 2026]

**Jak poprawić błąd na fakturze w KSeF?**
Fakturą korygującą wystawioną również w KSeF, z odwołaniem do numeru KSeF faktury pierwotnej. Faktur w systemie nie da się edytować ani anulować.

**Jak nabywca dostaje moją fakturę?**
Pobiera ją z KSeF — dokument uznaje się za otrzymany z chwilą nadania numeru KSeF. PDF możesz przekazać dodatkowo, ale to tylko wizualizacja.

---

*Artykuł ma charakter informacyjny i nie stanowi porady podatkowej. Przed decyzjami skonsultuj się z księgowym lub doradcą podatkowym. Stan prawny: [DO SPRAWDZENIA 2026].*
