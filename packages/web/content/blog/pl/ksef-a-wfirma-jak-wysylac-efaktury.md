---
slug: ksef-a-wfirma-jak-wysylac-efaktury
locale: pl
translationKey: ksef-a-wfirma-jak-wysylac-efaktury
title: "KSeF a wFirma — jak wysyłać e-faktury przez integrację"
description: "Jak wysyłać e-faktury do KSeF przez wFirma: token i certyfikat, autoryzacja, uprawnienia, statusy i numer KSeF, odbiór faktur kosztowych oraz asystent AI."
category: KSeF
tags: [ksef, wfirma, e-faktura, integracja]
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: Zespół eKsięgowy AI
status: draft
# Uwaga redakcyjna: pozycje oznaczone [DO SPRAWDZENIA 2026] zweryfikuj przed
# publikacją — nazwy zakładek i przycisków w wFirma oraz przepisy KSeF bywają
# aktualizowane. Ścieżki w interfejsie sprawdź na żywo na swoim koncie.
---

# KSeF a wFirma — jak wysyłać e-faktury przez integrację

**W skrócie:** Jeśli fakturujesz w **wFirma**, nie musisz przełączać się do rządowej Aplikacji Podatnika, żeby działać zgodnie z KSeF. Integracja pozwala **wystawiać faktury jak dotychczas** i wysyłać je do Krajowego Systemu e-Faktur jednym kliknięciem (albo automatycznie po zapisie), a także **odbierać faktury kosztowe** w tym samym miejscu. Do połączenia potrzebujesz **certyfikatu KSeF** (od 1 lutego 2026 r. wygenerujesz go wprost w wFirma) lub **tokenu** (ważnego do końca 2026 r.), oraz nadanych **uprawnień**. Obowiązek KSeF działa dla większości firm od **1 kwietnia 2026 r.** [DO SPRAWDZENIA 2026]

Skoro obowiązek już Cię dotyczy (harmonogram opisaliśmy w artykule [KSeF — od kiedy obowiązkowy](/blog/ksef-od-kiedy-obowiazkowy-2026)), pytanie brzmi: jak wpiąć KSeF w codzienną pracę, żeby nie prowadzić dwóch obiegów dokumentów naraz. W tym poradniku pokazujemy, jak połączyć wFirma z KSeF, jak wygląda wysyłka i odbiór faktur, co oznaczają statusy oraz co zyskujesz, dokładając do tego asystenta AI.

## Spis treści

1. Dlaczego integracja, a nie rządowa aplikacja MF
2. Jak połączyć wFirma z KSeF — certyfikat, token, uprawnienia
3. Wystawianie i automatyczna wysyłka faktur
4. Statusy faktur i numer KSeF
5. Odbiór faktur kosztowych z KSeF
6. Asystent AI na wierzchu integracji
7. Krok po kroku — jak zacząć
8. Najczęstsze problemy
9. FAQ

## 1. Dlaczego integracja, a nie rządowa aplikacja MF

Ministerstwo Finansów udostępnia bezpłatną **Aplikację Podatnika KSeF** — i do wystawienia pojedynczej faktury to narzędzie wystarczy. Problem zaczyna się przy codziennej pracy: aplikacja rządowa jest oderwana od Twojej księgowości. Wystawiasz w niej fakturę, a potem i tak musisz ją ująć w programie, pilnować płatności, powiązać z kosztami i deklaracjami.

Integracja wFirma z KSeF likwiduje ten podwójny obieg. Zyskujesz:

- **Jeden formularz.** Wystawiasz fakturę tak jak dotychczas — konwersja do formatu ustrukturyzowanego i wysyłka do KSeF dzieją się w tle.
- **Jeden obieg dokumentów.** Sprzedaż i koszty są w tym samym systemie co ewidencje, JPK i płatności — bez przepisywania danych między aplikacjami.
- **Faktury kosztowe w jednym miejscu.** Dokumenty od dostawców trafiają prosto do wFirma, gotowe do zaksięgowania, zamiast czekać w osobnym repozytorium.
- **Automatyzację.** Wysyłkę po zapisie, nocne pobieranie kosztów i statusy widoczne przy fakturach — bez ręcznego eksportu XML.

Krótko: rządowa aplikacja to plan awaryjny, a integracja to sposób na to, by KSeF „zniknął” z Twojej listy codziennych zadań.

## 2. Jak połączyć wFirma z KSeF — certyfikat, token, uprawnienia

Połączenie sprowadza się do trzech elementów: **uwierzytelnienia** (certyfikat lub token), **uprawnień** w KSeF oraz **konfiguracji zakresu** integracji. wFirma udostępnia integrację z KSeF już od 2023 r., a wraz z KSeF 2.0 (od 1 lutego 2026 r.) doszła możliwość wygenerowania certyfikatu bez logowania do aplikacji rządowej. [DO SPRAWDZENIA 2026]

### Sposoby uwierzytelnienia

| Metoda | Na czym polega | Dla kogo |
|---|---|---|
| **Certyfikat wygenerowany w wFirma** | Certyfikat KSeF tworzysz wprost w systemie, bez logowania do Aplikacji Podatnika | Rekomendowana ścieżka od 1 lutego 2026 r. |
| **Własny certyfikat KSeF** | Wgrywasz pliki certyfikatu wydanego wcześniej | Firmy, które mają już certyfikat |
| **Token KSeF** | Wpisujesz token wygenerowany w Aplikacji Podatnika | Rozwiązanie przejściowe — tokeny działają **do 31 grudnia 2026 r.** [DO SPRAWDZENIA 2026] |

> **Ważne:** tokeny są wycofywane od **1 stycznia 2027 r.** Jeśli dziś łączysz się tokenem, zaplanuj przejście na certyfikat, żeby na przełomie roku nie zostać bez działającej integracji. [DO SPRAWDZENIA 2026]

### Gdzie to ustawić w wFirma

Konfigurację znajdziesz w zakładce **PRZYCHODY » KSEF » KONFIGURACJA INTEGRACJI**. Wybierasz tam metodę uwierzytelnienia (generuję certyfikat / mam certyfikat / mam token) oraz zakres działania: czy faktury sprzedaży mają iść do KSeF po zapisie i czy koszty mają być pobierane automatycznie. [DO SPRAWDZENIA 2026]

### Uprawnienia

Autoryzacja działa **w kontekście konkretnego użytkownika**, a nie globalnie dla całej firmy. Każda osoba, która ma wysyłać lub pobierać faktury, potrzebuje własnego certyfikatu i własnej autoryzacji na swoim koncie. Dodatkowo w Aplikacji Podatnika KSeF (ap.ksef.mf.gov.pl) właściciel nadaje uprawnienia — m.in. do przeglądania i wystawiania faktur. Brak uprawnienia do przeglądania kończy się komunikatem „brak uprawnień do pobierania”. [DO SPRAWDZENIA 2026]

Szczegółową procedurę opisujemy w [przewodniku konfiguracji wFirma](/guide/wfirma) oraz w instrukcji [jak uzyskać dane dostępowe](/guide/wfirma/get-api-credentials). Kontekst samego KSeF znajdziesz w [przewodniku KSeF](/guide/ksef).

## 3. Wystawianie i automatyczna wysyłka faktur

Po skonfigurowaniu integracji wystawianie wygląda niemal tak samo jak wcześniej. Uzupełniasz fakturę na standardowym formularzu, a przy zapisie wybierasz opcję wysyłki do KSeF (np. **ZAPISZ I WYŚLIJ DO KSEF**). System sam składa fakturę ustrukturyzowaną i przesyła ją do systemu. [DO SPRAWDZENIA 2026]

Możesz też włączyć **automatyczną wysyłkę**: w konfiguracji zaznaczasz, że faktury sprzedaży B2B (a opcjonalnie także B2C) mają trafiać do KSeF od razu po zapisaniu. Wtedy nie musisz pamiętać o osobnym kroku — każda zapisana faktura rusza do systemu.

Pełny scenariusz „od formularza do numeru KSeF” rozpisaliśmy w osobnym poradniku: [jak wystawić fakturę w KSeF krok po kroku](/blog/jak-wystawic-fakture-ksef-krok-po-kroku).

## 4. Statusy faktur i numer KSeF

Faktura ustrukturyzowana jest **wystawiona dopiero wtedy**, gdy skutecznie trafi do systemu i przejdzie walidację. Dopiero po pozytywnej walidacji KSeF nadaje jej **unikalny numer KSeF** oraz wystawia **Urzędowe Poświadczenie Odbioru (UPO)** — dowód skutecznego przesłania dokumentu. To ten moment, a nie zapis w programie, decyduje o prawnym „istnieniu” faktury.

Dlatego w codziennej pracy tak ważne jest śledzenie statusów. W wFirma status wysyłki widać przy fakturze (np. ikoną obok numeru), a typowa ścieżka wygląda tak:

| Status | Co oznacza | Co zrobić |
|---|---|---|
| **Do wysłania / robocza** | Faktura zapisana, ale jeszcze nie przesłana do KSeF | Wyślij ręcznie lub poczekaj na wysyłkę automatyczną |
| **Wysłana / w trakcie** | Dokument trafił do systemu, trwa walidacja | Poczekaj na potwierdzenie |
| **Przyjęta (numer KSeF)** | Faktura zwalidowana, nadany numer KSeF i UPO | Gotowe — dokument jest wystawiony |
| **Odrzucona / błąd** | Walidacja nie powiodła się | Popraw dane i wyślij ponownie |

> Status „odrzucona” najczęściej wynika z błędnych danych (np. NIP-u nabywcy) albo braku uprawnień. Do czasu uzyskania numeru KSeF faktura **nie jest** skutecznie wystawiona — nie zamykaj sprzedaży, dopóki nie zobaczysz potwierdzenia. [DO SPRAWDZENIA 2026]

## 5. Odbiór faktur kosztowych z KSeF

KSeF to nie tylko wysyłka — to również **odbiór** faktur od dostawców. Kontrahenci objęci obowiązkiem wystawiają Ci faktury bezpośrednio w systemie, więc warto skonfigurować ich automatyczne pobieranie.

W wFirma po zaznaczeniu opcji pobierania faktur zakupu system **sam ściąga koszty z KSeF** (zwykle w nocy) i umieszcza je jako wersje robocze do zaksięgowania — najczęściej w **WYDATKI » KSIĘGOWANIE » WERSJE ROBOCZE**. Faktury z wybranego okresu możesz też pobrać ręcznie przez opcję importu z KSeF. [DO SPRAWDZENIA 2026]

Praktyczna korzyść: koniec z „zaginionymi” fakturami kosztowymi w skrzynce mailowej. Wszystkie dokumenty od dostawców masz w jednym miejscu, gotowe do zaksięgowania i rozliczenia VAT.

## 6. Asystent AI na wierzchu integracji

Sama integracja wFirma–KSeF ogarnia technikę wysyłki. Warstwa, której brakuje większości firm, to **codzienna obsługa w języku naturalnym** — i tu wchodzi asystent AI.

Z [eKsięgowy AI](/) połączonym z Twoim kontem wFirma możesz:

- **wystawić i wysłać fakturę do KSeF wprost w rozmowie** — dyktujesz treść, asystent przygotowuje dokument i przekazuje go do wysyłki;
- **sprawdzić status i numer KSeF** bez klikania po zakładkach — pytasz „czy faktura dla firmy X poszła do KSeF?” i dostajesz odpowiedź;
- **dostać przypomnienie**, że jakaś faktura utknęła w statusie „do wysłania” albo została odrzucona;
- **zweryfikować kontrahenta** na białej liście VAT i **autouzupełnić dane po NIP** z GUS, zanim wystawisz dokument — mniej odrzuceń z powodu błędnych danych.

To nie zastępuje integracji — to sprawia, że korzystanie z niej przypomina rozmowę, a nie obsługę kolejnego panelu.

## 7. Krok po kroku — jak zacząć

1. **Sprawdź swój termin.** Dla większości firm obowiązek działa od 1 kwietnia 2026 r.; najmniejsi mają czas do 1 stycznia 2027 r. [DO SPRAWDZENIA 2026]
2. **Wejdź w KONFIGURACJĘ INTEGRACJI** w wFirma (**PRZYCHODY » KSEF**).
3. **Wybierz uwierzytelnienie** — wygeneruj certyfikat w wFirma (rekomendowane) albo użyj tokenu na okres przejściowy.
4. **Nadaj uprawnienia** sobie, pracownikom i biuru rachunkowemu w Aplikacji Podatnika KSeF.
5. **Ustaw zakres** — wysyłka faktur sprzedaży po zapisie i automatyczne pobieranie faktur zakupu.
6. **Przetestuj** wystawienie i odbiór na kilku dokumentach — sprawdź, czy pojawia się numer KSeF i UPO.
7. **Podłącz asystenta AI**, jeśli chcesz wystawiać i sprawdzać statusy w rozmowie oraz dostawać przypomnienia o terminach.

## 8. Najczęstsze problemy

- **„Brak uprawnień do pobierania”** — najczęściej brak nadanego uprawnienia do przeglądania faktur w Aplikacji Podatnika KSeF. Nadaj je i ponów autoryzację. [DO SPRAWDZENIA 2026]
- **Faktura odrzucona przez KSeF** — sprawdź poprawność NIP-u nabywcy i kompletność danych; popraw i wyślij ponownie.
- **Poleganie wyłącznie na tokenie** — token wygasa z końcem 2026 r. Przejdź na certyfikat, zanim integracja przestanie działać. [DO SPRAWDZENIA 2026]
- **Podwójny obieg** — wysyłanie klientowi PDF „dla pewności” obok KSeF tworzy bałagan. Kontrahent objęty KSeF pobiera fakturę z systemu.
- **Ignorowanie faktur kosztowych** — firmy wdrażają wysyłkę, a zapominają włączyć pobieranie kosztów. Skonfiguruj oba kierunki.
- **Autoryzacja per użytkownik** — jeśli faktury wysyła kilka osób, każda potrzebuje własnego certyfikatu i autoryzacji. [DO SPRAWDZENIA 2026]

## Wystawiaj i odbieraj e-faktury bez przełączania narzędzi

[eKsięgowy AI](/) łączy się z Twoim kontem **wFirma** i pozwala **wystawiać oraz wysyłać e-faktury do KSeF i sprawdzać ich status** — wprost w rozmowie z asystentem. Do tego **weryfikuje kontrahentów na białej liście VAT**, **autouzupełnia dane po NIP z GUS**, robi **OCR paragonów w Telegramie**, odpowiada na pytania o **VAT, PIT, CIT i ZUS** oraz **przypomina o terminach** podatkowych. Zacznij od [przewodnika konfiguracji wFirma](/guide/wfirma) i [przewodnika KSeF](/guide/ksef).

## Najczęstsze pytania (FAQ)

**Czy muszę wystawiać faktury w rządowej aplikacji, skoro mam wFirma?**
Nie. Dzięki integracji wystawiasz fakturę w wFirma jak dotychczas, a system sam wysyła ją do KSeF. Aplikacja Podatnika przydaje się głównie do nadawania uprawnień lub jako plan awaryjny.

**Certyfikat czy token — co wybrać?**
Docelowo certyfikat. Tokeny działają jako rozwiązanie przejściowe do 31 grudnia 2026 r. i są wycofywane od 1 stycznia 2027 r. Od 1 lutego 2026 r. certyfikat wygenerujesz wprost w wFirma. [DO SPRAWDZENIA 2026]

**Skąd wiem, że faktura naprawdę trafiła do KSeF?**
Po pozytywnej walidacji faktura otrzymuje unikalny numer KSeF oraz UPO. W wFirma widać to po statusie przy dokumencie. Dopóki nie ma numeru KSeF, faktura nie jest skutecznie wystawiona.

**Czy koszty od dostawców też pobiorą się automatycznie?**
Tak, jeśli włączysz pobieranie faktur zakupu. System ściąga je z KSeF (zwykle w nocy) i zapisuje jako wersje robocze do zaksięgowania. [DO SPRAWDZENIA 2026]

**Czy każdy pracownik potrzebuje osobnego certyfikatu?**
Tak. Autoryzacja działa w kontekście konkretnego użytkownika, więc każda osoba wysyłająca lub pobierająca faktury potrzebuje własnego certyfikatu i własnej autoryzacji. [DO SPRAWDZENIA 2026]

**Co daje asystent AI, skoro integracja i tak wysyła faktury?**
Pozwala obsłużyć KSeF w rozmowie: wystawić fakturę, sprawdzić status i numer KSeF, dostać przypomnienie o odrzuconym dokumencie czy zbliżającym się terminie — bez klikania po panelach.

---

*Artykuł ma charakter informacyjny i nie stanowi porady podatkowej. Nazwy zakładek i przycisków w wFirma oraz przepisy KSeF mogą się zmieniać — zweryfikuj je na swoim koncie. Przed decyzjami skonsultuj się z księgowym lub doradcą podatkowym. Stan prawny: [DO SPRAWDZENIA 2026].*
