# Blog — checklist weryfikacji cyfr/dat przed publikacją

Sprawdź poniższe wartości względem aktualnych źródeł (MF, ZUS, ustawy). Po weryfikacji
danej statii usuń z niej znaczniki `[DO SPRAWDZENIA 2026]` i przełącz `status: published`.
Stan na moment pisania: lipiec 2026.

## ⚠️ Priorytet (sprawdź najpierw — użyte w kilku artykułach / największe ryzyko)

- [ ] **Składka zdrowotna na ryczałcie 2026** — użyłem **498,35 / 830,58 / 1 495,04 zł**
      (progi przychodu do 60 tys. / 60–300 tys. / powyżej 300 tys.). Część źródeł podaje
      **376,16 / 626,93 / 1 128,48 zł**. Występuje w: `skladki-zus-2026`, `ryczalt-czy-zasady-ogolne`,
      `zaliczki-pit-jdg`. → ustal właściwy zestaw i ujednolić.
- [ ] **Harmonogram KSeF**: 1.02.2026 (>200 mln zł) / 1.04.2026 (pozostali VAT) / 1.01.2027
      (≤10 000 zł/mc). Dotyczy całego klastra KSeF.
- [ ] **Okres bez kar w KSeF** — czy obowiązuje i do kiedy (był przesuwany).
- [ ] **Ścieżki UI w wFirma** (`ksef-a-wfirma`) — nazwy zakładek/przycisków najczęściej się zmieniają.

---

## 1. ksef-od-kiedy-obowiazkowy-2026
- [ ] Terminy: 1.02.2026 / 1.04.2026 / 1.01.2027 (progi: 200 mln zł; ≤10 000 zł/mc).
- [ ] Podstawa prawna: nowelizacja ustawy o VAT z 5.08.2025 (Dz.U. 2025 poz. 1203).
- [ ] Schemat **FA(3)**; data wystawienia = dzień przesłania do KSeF.
- [ ] Kary: do **100% VAT** z faktury (i **18,7%** kwoty należności dla faktur bez VAT).
- [ ] Okres przejściowy bez kar (czy/do kiedy).
- [ ] Wyłączenia: B2C, faktury uproszczone, kasy fiskalne (zakres/terminy).
- [ ] Tryby offline24 / awaryjny — terminy dosłania.

## 2. jak-wystawic-fakture-ksef-krok-po-kroku
- [ ] Obowiązek dla większości od 1.04.2026.
- [ ] Certyfikaty KSeF przez MCU dostępne od **1.11.2025**.
- [ ] Tokeny równolegle do końca 2026; od **1.01.2027** certyfikaty zastępują tokeny.
- [ ] FA(3) obowiązuje od 1.02.2026.
- [ ] Numer KSeF ma ok. **35 znaków**.
- [ ] Nota korygująca odchodzi / dane koryguje sprzedawca.
- [ ] Błędny NIP nabywcy → dwa dokumenty (korekta do zera + nowa faktura).
- [ ] Terminy trybów: offline24 (następny dzień roboczy), awaryjny (7 dni po ustaniu awarii); dwa kody QR.

## 3. ksef-a-wfirma-jak-wysylac-efaktury
- [ ] Obowiązek 1.04.2026; „KSeF 2.0” od 1.02.2026.
- [ ] Token ważny do **31.12.2026**; wycofywanie tokenów od 1.01.2027.
- [ ] **Ścieżki UI wFirma**: PRZYCHODY » KSEF » KONFIGURACJA INTEGRACJI; przycisk ZAPISZ I WYŚLIJ DO KSEF;
      WYDATKI » KSIĘGOWANIE » WERSJE ROBOCZE. (najbardziej „ruchome”).
- [ ] Nadawanie uprawnień w Aplikacji Podatnika / komunikat „brak uprawnień do pobierania”.
- [ ] Automatyczne (nocne) pobieranie faktur zakupu.

## 4. biala-lista-vat-jak-sprawdzic-kontrahenta
- [ ] Limit **15 000 zł brutto** (jednorazowa wartość transakcji, B2B).
- [ ] **ZAW-NR: 7 dni** od dnia zlecenia przelewu; do naczelnika US właściwego dla **płatnika**.
- [ ] Sankcje: brak KUP + odpowiedzialność solidarna w VAT.
- [ ] Split payment jako ochrona przed sankcjami białej listy.
- [ ] Rachunki wirtualne rozpoznawane przez wyszukiwarkę MF.

## 5. terminy-vat-jpk-v7-2026
- [ ] Termin **25. dnia** miesiąca (VAT + JPK_V7M).
- [ ] Przesunięcia świąteczne 2026 (styczeń / kwiecień / lipiec / październik / grudzień — konkretne daty, np. grudzień → **28.12**).
- [ ] Mały podatnik: limit **8 517 000 zł** (2 mln EUR × 4,2586).
- [ ] Odsetki za zwłokę **10,5%** od 5.03.2026; próg odsetek **8,70 zł**; korekta -50% odsetek.
- [ ] Wersja schematu JPK_V7 obowiązująca w 2026 (zmiana wraz z KSeF).
- [ ] VAT-UE (informacja podsumowująca) — miesięcznie, elektronicznie.

## 6. split-payment-kiedy-obowiazkowy
- [ ] Obowiązek: faktura **>15 000 zł brutto** ORAZ towar/usługa z **załącznika nr 15** (lista/PKWiU).
- [ ] Oznaczenie na fakturze „mechanizm podzielonej płatności”.
- [ ] Korzyści MPP: brak dodatkowej sankcji VAT, niższe odsetki (brak stawki 150%), zwrot VAT w **25 dni**.
- [ ] Sankcje: kara **30%** kwoty VAT (sprzedawca/nabywca) / KKS do 180 i 720 stawek dziennych — **zweryfikuj dokładnie**.
- [ ] Zwolnienia z sankcji + procedura uwolnienia środków z rachunku VAT (termin decyzji US).

## 7. skladki-zus-2026-przedsiebiorca
- [ ] Duży ZUS: podstawa **5 652,60 zł**; społeczne razem **≈1 926,76 zł** (emerytalna 1 103,27; rentowa 452,21; chorobowa 138,49).
- [ ] Mały ZUS (preferencyjny): podstawa **1 441,80 zł** (30% min. wynagrodzenia); razem **≈456,18 zł**.
- [ ] Minimalne wynagrodzenie 2026: **4 806 zł**.
- [ ] Mały ZUS Plus: przychód ≤ **120 000 zł**; widełki 1 441,80–5 652,60 zł; 36 mies./60.
- [ ] Zdrowotna skala/liniowa: min **432,54 zł** (od 4 806 zł); styczeń niższa (**314,96 zł**?).
- [ ] Zdrowotna ryczałt: **498,35 / 830,58 / 1 495,04 zł** (⚠️ patrz Priorytet).
- [ ] Termin: do **20. dnia** miesiąca.
- [ ] Wakacje składkowe (warunki, limity) + zbieg tytułów (etat + działalność → zwykle tylko zdrowotna).

## 8. ryczalt-czy-zasady-ogolne-jak-wybrac
- [ ] Skala: **12%/32%**, kwota wolna **30 000 zł**, kwota zmniejszająca **3 600 zł**, danina solidarnościowa **4%** > 1 mln zł.
- [ ] Liniowy: **19%**, zdrowotna **4,9%**, odliczenie zdrowotnej do **14 100 zł/rok**.
- [ ] Ryczałt: pełna lista stawek **2%–17%** + przypisania branż; limit **2 mln EUR**; odliczenie 50% składki zdrowotnej.
- [ ] Zdrowotna: skala min 432,54 / ryczałt 498,35 / 830,58 / 1 495,04 (⚠️ patrz Priorytet).
- [ ] Termin zmiany formy: do **20. dnia** miesiąca po pierwszym przychodzie (styczeń → 20 lutego).
- [ ] Przykłady liczbowe w tabeli porównawczej — przelicz ponownie po potwierdzeniu stawek.

## 9. zaliczki-pit-jdg-terminy-wyliczenie
- [ ] Termin zaliczki: do **20. dnia** miesiąca; zaliczka za grudzień/Q4 do **20.01.2027**.
- [ ] Kwartalne: mały podatnik (limit **8 517 000 zł**) / rozpoczynający działalność.
- [ ] Skala: kwota wolna 30 000, kwota zmniejszająca 3 600, danina 4% > 1 mln.
- [ ] Liniowy: odliczenie zdrowotnej 14 100 zł. Ryczałt: stawki 2%–17%.
- [ ] Reguła **1 000 zł** (brak obowiązku zapłaty/odroczenie).
- [ ] Zeznania roczne: PIT-36 / PIT-36L / PIT-28 — termin do **30 kwietnia** (2 maja, gdy wolne).

## 10. jak-ai-pomaga-w-ksiegowosci-malej-firmy
- [ ] Brak twardych cyfr. Sprawdź jedynie ogólne wzmianki o terminie/zakresie KSeF i warunki planu (cena / darmowy z własnym kluczem).

## 11. ocr-paragonow-telegram-zaksieguj-wydatek
- [ ] Brak twardych cyfr podatkowych. Sprawdź: kiedy paragon/faktura uproszczona jest dokumentem kosztowym (limit NIP), zasady archiwizacji, waluty obce, oraz zapisy o przetwarzaniu danych (regulamin/polityka prywatności).

## 12. autouzupelnianie-danych-kontrahenta-nip-gus
- [ ] Prawie brak cyfr. Sprawdź jedynie wzmiankę o progu **15 000 zł** (biała lista) i zapisy o przetwarzaniu danych.
