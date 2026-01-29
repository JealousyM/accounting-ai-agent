# Lista kontrolna QA - Accounting AI Agent

Kompleksowa lista kontrolna do weryfikacji aplikacji przed wdrozeniem.

---

## 1. Uwierzytelnianie i rejestracja

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 1.1 | Rejestracja nowego uzytkownika (plan Free) z poprawnymi danymi | Konto utworzone, przekierowanie do /chat, wyswietlenie modalu powitalnego | |
| 1.2 | Rejestracja nowego uzytkownika (plan Pro Monthly) | Przekierowanie do Stripe Checkout, po platnosci - konto Pro aktywne | |
| 1.3 | Rejestracja nowego uzytkownika (plan Pro Yearly) | Przekierowanie do Stripe Checkout, roczna subskrypcja aktywna | |
| 1.4 | Rejestracja z istniejacym adresem e-mail | Blad: "E-mail juz istnieje" | |
| 1.5 | Rejestracja ze slabym haslem (brak duzej litery, cyfry, znaku specjalnego) | Blad walidacji hasla | |
| 1.6 | Rejestracja bez zaakceptowania regulaminu | Formularz nie pozwala na wyslanie | |
| 1.7 | Rejestracja Free bez wyboru dostawcy LLM | Blad walidacji - dostawca LLM wymagany | |
| 1.8 | Logowanie z poprawnymi danymi (e-mail/haslo) | Przekierowanie do /chat, zaladowanie konwersacji | |
| 1.9 | Logowanie z nieprawidlowym haslem | Blad: "Nieprawidlowe dane logowania" | |
| 1.10 | Logowanie z nieistniejacym e-mailem | Blad: "Nieprawidlowe dane logowania" | |
| 1.11 | Logowanie przez Google OAuth | Konto utworzone/polaczone, przekierowanie do /chat lub /auth/complete-profile | |
| 1.12 | Logowanie przez GitHub OAuth | Konto utworzone/polaczone, przekierowanie do /chat lub /auth/complete-profile | |
| 1.13 | Uzupelnienie profilu po OAuth (complete-profile) | Wybor dostawcy LLM, opcjonalne dane wFirma, przekierowanie do /chat | |
| 1.14 | Wylogowanie | Sesja zakonczona, przekierowanie do /login | |
| 1.15 | Odzyskiwanie hasla - wyslanie e-maila | E-mail z linkiem resetujacym wyslany | |
| 1.16 | Resetowanie hasla z poprawnym tokenem | Haslo zmienione, mozliwosc logowania nowym haslem | |
| 1.17 | Resetowanie hasla z wygaslym tokenem | Blad: "Token wygasl" | |
| 1.18 | Odswiezanie tokenu JWT (refresh token) | Nowy access token wydany | |
| 1.19 | Dostep do chronionej strony bez logowania | Przekierowanie do /login | |
| 1.20 | Rate limiting logowania (>10 prob/15 min) | Blad 429: "Zbyt wiele prob" | |

---

## 2. Czat AI

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 2.1 | Utworzenie nowej konwersacji | Nowa konwersacja na liscie, tytul automatycznie wygenerowany | |
| 2.2 | Wyslanie wiadomosci tekstowej | Wiadomosc uzytkownika wyswietlona, odpowiedz AI streamowana | |
| 2.3 | Odpowiedz AI z formatowaniem Markdown | Poprawne renderowanie naglowkow, list, kodu, tabel | |
| 2.4 | Odpowiedz AI z podswietlaniem skladni kodu | Bloki kodu z kolorowaniem skladni | |
| 2.5 | Wprowadzanie glosowe (Web Speech API) | Przycisk mikrofonu aktywny, rozpoznanie mowy, tekst w polu | |
| 2.6 | Przelaczanie miedzy konwersacjami | Poprawne ladowanie historii wybranej konwersacji | |
| 2.7 | Usuwanie konwersacji | Konwersacja usunieta z listy, wiadomosci skasowane | |
| 2.8 | Wyslanie pustej wiadomosci | Przycisk wyslania nieaktywny lub blad walidacji | |
| 2.9 | Rate limiting wiadomosci (>60/15 min) | Blad 429 z informacja o limicie | |
| 2.10 | Limit wiadomosci subskrypcji (Free/Pro) | Komunikat o osiagnieciu limitu z opcja upgrade | |
| 2.11 | Wywolanie narzedzia wFirma przez AI | AI uzywa narzedzia, wyswietla sformatowany wynik | |
| 2.12 | Blad API LLM podczas rozmowy | Czytelny komunikat bledu dla uzytkownika | |
| 2.13 | Brak skonfigurowanego klucza LLM (plan Free) | Komunikat o koniecznosci konfiguracji klucza | |
| 2.14 | Blad polaczenia z wFirma podczas uzycia narzedzia | Czytelny komunikat o bledzie integracji | |
| 2.15 | Dluga konwersacja (>50 wiadomosci) | Plynne przewijanie, brak problemow z wydajnoscia | |

---

## 3. Narzedzia AI - wFirma (44 narzedzia)

### 3.1 Firma

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.1.1 | "Pokaz informacje o mojej firmie" | Dane firmy z wFirma wyswietlone | |
| 3.1.2 | "Pokaz konta bankowe firmy" | Lista kont bankowych | |
| 3.1.3 | "Pokaz adresy firmy" | Lista adresow firmy | |

### 3.2 Kontrahenci

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.2.1 | "Pokaz liste kontrahentow" | Lista kontrahentow z wFirma | |
| 3.2.2 | "Dodaj nowego kontrahenta [dane]" | Kontrahent utworzony w wFirma | |
| 3.2.3 | "Zaktualizuj kontrahenta [dane]" | Dane kontrahenta zaktualizowane | |
| 3.2.4 | "Usun kontrahenta [nazwa]" | Kontrahent usuniety z wFirma | |

### 3.3 Faktury

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.3.1 | "Pokaz liste faktur" | Lista faktur z wFirma | |
| 3.3.2 | "Pokaz szczegoly faktury [numer]" | Pelne dane faktury | |
| 3.3.3 | "Wystaw nowa fakture [dane]" | Faktura utworzona w wFirma | |
| 3.3.4 | "Zaktualizuj fakture [dane]" | Faktura zaktualizowana | |
| 3.3.5 | "Usun fakture [numer]" | Faktura usunieta | |
| 3.3.6 | "Wyslij fakture e-mailem [numer]" | Faktura wyslana na wskazany adres | |
| 3.3.7 | "Pobierz fakture PDF [numer]" | Plik PDF do pobrania | |
| 3.3.8 | "Dodaj notatke do faktury [numer]" | Notatka dodana | |
| 3.3.9 | "Pokaz notatki faktury [numer]" | Lista notatek | |
| 3.3.10 | "Usun notatke z faktury" | Notatka usunieta | |

### 3.4 Platnosci

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.4.1 | "Pokaz liste platnosci" | Lista platnosci | |
| 3.4.2 | "Pokaz szczegoly platnosci [id]" | Dane platnosci | |
| 3.4.3 | "Dodaj platnosc [dane]" | Platnosc zarejestrowana | |
| 3.4.4 | "Zaktualizuj platnosc [dane]" | Platnosc zaktualizowana | |
| 3.4.5 | "Usun platnosc [id]" | Platnosc usunieta | |

### 3.5 Wydatki

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.5.1 | "Pokaz liste wydatkow" | Lista wydatkow | |
| 3.5.2 | "Pokaz szczegoly wydatku [id]" | Dane wydatku | |

### 3.6 Pojazdy

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.6.1 | "Pokaz liste pojazdow" | Lista pojazdow | |
| 3.6.2 | "Pokaz szczegoly pojazdu [id]" | Dane pojazdu | |
| 3.6.3 | "Dodaj pojazd [dane]" | Pojazd dodany | |
| 3.6.4 | "Zaktualizuj pojazd [dane]" | Pojazd zaktualizowany | |
| 3.6.5 | "Usun pojazd [id]" | Pojazd usuniety | |

### 3.7 Terminy platnosci

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.7.1 | "Pokaz terminy platnosci" | Lista terminow | |
| 3.7.2 | "Dodaj termin platnosci [dane]" | Termin utworzony | |
| 3.7.3 | "Zaktualizuj termin [dane]" | Termin zaktualizowany | |
| 3.7.4 | "Usun termin [id]" | Termin usuniety | |
| 3.7.5 | "Pokaz grupy terminow" | Lista grup terminow | |
| 3.7.6 | "Dodaj grupe terminow [dane]" | Grupa utworzona | |

### 3.8 Deklaracje podatkowe

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.8.1 | "Pokaz deklaracje JPK VAT" | Lista deklaracji VAT | |
| 3.8.2 | "Pokaz deklaracje PIT" | Lista deklaracji PIT | |

### 3.9 Dokumenty

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.9.1 | "Pokaz liste dokumentow" | Lista dokumentow | |
| 3.9.2 | "Pokaz szczegoly dokumentu [id]" | Dane dokumentu | |
| 3.9.3 | "Pobierz dokument [id]" | Plik do pobrania | |
| 3.9.4 | "Usun dokument [id]" | Dokument usuniety | |

### 3.10 Ksiegowosc

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.10.1 | "Pokaz lata obrachunkowe" | Lista lat obrachunkowych | |
| 3.10.2 | "Pokaz szczegoly roku [id]" | Dane roku obrachunkowego | |
| 3.10.3 | "Pokaz schematy ksiegowe" | Lista schematow | |
| 3.10.4 | "Pokaz szczegoly schematu [id]" | Dane schematu ksiegowego | |

### 3.11 Podsumowanie finansowe

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.11.1 | "Pokaz podsumowanie finansowe" | Przeglad finansowy firmy | |

### 3.12 Uzytkownicy wFirma

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 3.12.1 | "Pokaz uzytkownikow wFirma" | Lista uzytkownikow | |
| 3.12.2 | "Pokaz firmy uzytkownika" | Lista firm | |
| 3.12.3 | "Pokaz szczegoly firmy [id]" | Dane firmy | |

---

## 4. Subskrypcje i platnosci

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 4.1 | Wyswietlenie strony cennikowej (/pricing) | Plany Free i Pro z cenami w PLN | |
| 4.2 | Przelaczanie okresu rozliczeniowego (miesiecznie/rocznie) | Ceny sie aktualizuja, oszczednosc 17% widoczna | |
| 4.3 | Upgrade z Free do Pro Monthly | Stripe Checkout, aktywacja po platnosci | |
| 4.4 | Upgrade z Free do Pro Yearly | Stripe Checkout, roczna subskrypcja aktywna | |
| 4.5 | Anulowanie subskrypcji Pro | Subskrypcja anulowana na koniec okresu rozliczeniowego | |
| 4.6 | Platnosc odrzucona (karta odrzucona) | Komunikat bledu, subskrypcja nieaktywna | |
| 4.7 | Dostep do portalu rozliczeniowego Stripe | Przekierowanie do Stripe Customer Portal | |
| 4.8 | Wyswietlenie biezacego uzycia (wiadomosci AI, zapytania wFirma) | Poprawne liczniki uzycia | |
| 4.9 | Przelaczenie preferencji klucza LLM (wlasny/aplikacji) - Pro | Preferencja zapisana, zmiana zrodla LLM | |
| 4.10 | Webhook Stripe: checkout.session.completed | Subskrypcja aktywowana w bazie | |
| 4.11 | Webhook Stripe: customer.subscription.deleted | Subskrypcja zdezaktywowana | |
| 4.12 | Webhook Stripe: invoice.payment_failed | Uzytkownik powiadomiony o bledzie platnosci | |

---

## 5. Zarzadzanie danymi uwierzytelniajacymi

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 5.1 | Konfiguracja danych wFirma (Access Key, Secret Key, Company ID) | Dane zaszyfrowane i zapisane, walidacja poprawnosci | |
| 5.2 | Aktualizacja danych wFirma | Nowe dane zastepuja stare | |
| 5.3 | Usuniecie danych wFirma | Dane usunite, status "Nieskonfigurowane" | |
| 5.4 | Konfiguracja klucza LLM (OpenAI) | Klucz zaszyfrowany, lista modeli zaladowana | |
| 5.5 | Konfiguracja klucza LLM (Google/Gemini) | Klucz zaszyfrowany, lista modeli zaladowana | |
| 5.6 | Wybor modelu LLM z listy | Model zapisany w profilu | |
| 5.7 | Usuniecie klucza LLM | Klucz usuniety, powrot do domyslnego | |
| 5.8 | Podanie nieprawidlowego klucza wFirma | Blad walidacji przy zapisie | |
| 5.9 | Podanie nieprawidlowego klucza LLM | Blad walidacji przy zapisie | |
| 5.10 | Wyswietlenie zamaskowanych danych (GET /credentials) | Klucze zamaskowane (np. sk-...xxxx) | |

---

## 6. Profil uzytkownika

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 6.1 | Edycja imienia i nazwiska | Dane zaktualizowane | |
| 6.2 | Edycja nazwy firmy | Nazwa firmy zaktualizowana | |
| 6.3 | Zmiana jezyka (en/pl/ru) | Jezyk interfejsu zmieniony natychmiastowo | |
| 6.4 | Wyswietlenie danych profilu (/dashboard) | Poprawne dane uzytkownika | |
| 6.5 | Modal powitalny - pierwsza wizyta | Modal wyswietlony | |
| 6.6 | Modal powitalny - zamkniecie | Modal nie pojawia sie ponownie (firstLoginComplete) | |

---

## 7. Panel administratora

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 7.1 | Dostep do /admin jako administrator | Dashboard ze statystykami | |
| 7.2 | Dostep do /admin jako zwykly uzytkownik | Blad 403 lub przekierowanie | |
| 7.3 | Wyswietlenie statystyk (uzytkownicy, konwersacje, koszty) | Poprawne liczby | |
| 7.4 | Lista uzytkownikow z paginacja | Tabela z uzytkownikami, stronicowanie dziala | |
| 7.5 | Wyszukiwanie uzytkownika po e-mail/nazwisku | Filtrowane wyniki | |
| 7.6 | Zmiana roli uzytkownika (user <-> admin) | Rola zmieniona, badge zaktualizowany | |
| 7.7 | Wyswietlenie szczegolowych danych uzytkownika | Profil, subskrypcja, uzycie, konwersacje | |

---

## 8. Sledzenie kosztow AI

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 8.1 | Dashboard kosztow (/dashboard/costs) | Karty podsumowania, wykres dzienny, rozklad modeli | |
| 8.2 | Filtrowanie kosztow wg zakresu dat | Dane filtrowane poprawnie | |
| 8.3 | Rozklad kosztow wg modelu | Wykres z podzialem na modele (GPT-4, itp.) | |
| 8.4 | Lista konwersacji z kosztami | Tabela z kosztami na konwersacje | |
| 8.5 | Szczegoly kosztow konwersacji | Tabela uruchomien, tokeny, koszty | |
| 8.6 | Podsumowanie kosztow uzytkownika | Calkowity koszt, biezacy miesiac, ostatnie 30 dni | |

---

## 9. System pomocy

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 9.1 | Otwarcie panelu pomocy (przycisk ?) | Panel wysuwa sie z prawej strony | |
| 9.2 | Przegladanie kategorii pomocy | Lista kategorii z tematami | |
| 9.3 | Wyszukiwanie w tematach pomocy | Filtrowane wyniki | |
| 9.4 | Wyswietlenie tematu pomocy | Tresc w formacie Markdown | |
| 9.5 | Tresc pomocy w wybranym jezyku (pl/en/ru) | Tresc w odpowiednim jezyku | |

---

## 10. Internacjonalizacja (i18n)

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 10.1 | Interfejs w jezyku polskim | Wszystkie etykiety, komunikaty, przyciski po polsku | |
| 10.2 | Interfejs w jezyku angielskim | Wszystkie etykiety po angielsku | |
| 10.3 | Interfejs w jezyku rosyjskim | Wszystkie etykiety po rosyjsku | |
| 10.4 | Przelaczanie jezyka w ustawieniach | Zmiana natychmiastowa bez przeladowania | |
| 10.5 | Odpowiedzi AI w jezyku uzytkownika | AI odpowiada w wybranym jezyku | |
| 10.6 | Komunikaty bledow w wybranym jezyku | Bledy przetlumaczone | |

---

## 11. Tryb ciemny / jasny

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 11.1 | Przelaczanie na tryb ciemny | Wszystkie elementy w ciemnych kolorach | |
| 11.2 | Przelaczanie na tryb jasny | Wszystkie elementy w jasnych kolorach | |
| 11.3 | Detekcja preferencji systemowych | Automatyczny wybor motywu | |
| 11.4 | Zachowanie preferencji po odswiezeniu | Motyw przywrocony z localStorage | |
| 11.5 | Kontrast tekstu w obu trybach | Czytelnosc zachowana (WCAG AA) | |

---

## 12. Pliki i pobieranie

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 12.1 | Pobieranie faktury PDF | Plik PDF pobrany poprawnie | |
| 12.2 | Pobieranie dokumentu z wFirma | Plik pobrany z poprawnym MIME type | |
| 12.3 | Pobieranie pliku z wygaslym linkiem (>15 min) | Blad: "Link wygasl" | |
| 12.4 | Pobieranie bez autoryzacji | Blad 401 | |

---

## 13. Prywatnosc i cookies (RODO/GDPR)

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 13.1 | Wyswietlenie banera cookies (pierwsza wizyta) | Baner z opcjami zgody | |
| 13.2 | Akceptacja wszystkich cookies | Baner znika, preferencje zapisane | |
| 13.3 | Odrzucenie opcjonalnych cookies | Tylko niezbedne cookies aktywne | |
| 13.4 | Zmiana preferencji cookies (ustawienia) | Modal z opcjami, zmiana zapisana | |
| 13.5 | Link do polityki prywatnosci | Strona/modal z trescia polityki | |
| 13.6 | Link do regulaminu | Strona/modal z trescia regulaminu | |

---

## 14. Responsywnosc (RWD)

| # | Scenariusz testowy | Urzadzenie | Oczekiwany rezultat | Status |
|---|---|---|---|---|
| 14.1 | Strona logowania | Mobile (320px) | Formularz czytelny, przyciski dotykowe | |
| 14.2 | Strona rejestracji | Mobile (320px) | Formularz przewijalny, wszystkie pola dostepne | |
| 14.3 | Czat AI - sidebar | Mobile (320px) | Sidebar zwijany, przycisk hamburger | |
| 14.4 | Czat AI - wiadomosci | Mobile (320px) | Wiadomosci pelna szerokosc, przewijanie | |
| 14.5 | Panel admina - tabela | Tablet (768px) | Tabela przewijalna poziomo | |
| 14.6 | Cennik | Mobile (320px) | Karty planow jedna pod druga | |
| 14.7 | Dashboard kosztow - wykresy | Tablet (768px) | Wykresy skaluja sie do kontenera | |
| 14.8 | Formularz danych uwierzytelniajacych | Mobile (320px) | Pola pelna szerokosc | |

---

## 15. Wydajnosc

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 15.1 | Czas ladowania strony glownej | < 3 sekundy (First Contentful Paint) | |
| 15.2 | Czas odpowiedzi API (endpointy CRUD) | < 500ms (p95) | |
| 15.3 | Czas pierwszej odpowiedzi AI (streaming) | < 3 sekundy do poczatku streamu | |
| 15.4 | Cache wFirma - trafienie | Odpowiedz < 100ms | |
| 15.5 | Cache wFirma - pudlo | Odpowiedz < 2 sekundy | |
| 15.6 | Lista konwersacji (>100 konwersacji) | Ladowanie < 1 sekunda | |
| 15.7 | Jednoczesni uzytkownicy (10/50/100) | Brak degradacji ponizej 50 uzytkownikow | |

---

## 16. Bezpieczenstwo

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 16.1 | Walidacja tokenu JWT (zmodyfikowany token) | Blad 401: "Nieprawidlowy token" | |
| 16.2 | Dostep do cudzych konwersacji | Blad 403 lub 404 | |
| 16.3 | Dostep do endpointow admina bez roli admin | Blad 403 | |
| 16.4 | SQL Injection w polach formularzy | Zapytanie odrzucone, brak wycieku danych | |
| 16.5 | XSS w wiadomosciach czatu | Skrypty nie sa wykonywane | |
| 16.6 | CSRF na endpointach mutujacych | Ochrona CSRF aktywna | |
| 16.7 | Szyfrowanie klucza API w bazie (AES-256-GCM) | Klucze nie sa czytelne w bazie | |
| 16.8 | Hashowanie hasel (bcrypt) | Hasla nie sa czytelne w bazie | |
| 16.9 | Rate limiting - proba obejscia | Limity egzekwowane per IP | |
| 16.10 | Wyciek klucza API w logach | Brak kluczy w logach | |
| 16.11 | HTTPS wymuszony w produkcji | Przekierowanie HTTP -> HTTPS | |
| 16.12 | Izolacja danych uzytkownikow | Uzytkownik widzi tylko swoje dane | |

---

## 17. Obsluga bledow

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 17.1 | Blad 400 - bledne dane wejsciowe | Czytelny komunikat walidacji | |
| 17.2 | Blad 401 - wygasla sesja | Przekierowanie do logowania | |
| 17.3 | Blad 403 - brak uprawnien | Komunikat o braku dostepu | |
| 17.4 | Blad 404 - nieistniejacy zasob | Strona "Nie znaleziono" | |
| 17.5 | Blad 429 - rate limit | Komunikat "Zbyt wiele prob, sprobuj pozniej" | |
| 17.6 | Blad 500 - blad serwera | Ogolny komunikat bledu (bez szczegolów w produkcji) | |
| 17.7 | Blad sieci (brak internetu) | Komunikat o problemie z polaczeniem | |
| 17.8 | Timeout API (>30s) | Komunikat o przekroczeniu czasu | |

---

## 18. Dostepnosc (a11y)

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 18.1 | Nawigacja klawiatura (Tab/Enter/Escape) | Wszystkie elementy interaktywne dostepne | |
| 18.2 | Czytnik ekranu - formularze | Etykiety ARIA poprawne | |
| 18.3 | Czytnik ekranu - czat AI | Wiadomosci odczytywane poprawnie | |
| 18.4 | Kontrast kolorow (WCAG AA) | Stosunek min. 4.5:1 dla tekstu | |
| 18.5 | Focus widoczny | Obramowanie/podswietlenie na aktywnym elemencie | |
| 18.6 | Tekst alternatywny dla obrazow | Atrybuty alt obecne | |

---

## 19. Kompatybilnosc przegladarek

| # | Przegladarka | Funkcja do testowania | Status |
|---|---|---|---|
| 19.1 | Chrome (najnowszy) | Pelna funkcjonalnosc | |
| 19.2 | Firefox (najnowszy) | Pelna funkcjonalnosc | |
| 19.3 | Safari (najnowszy) | Pelna funkcjonalnosc | |
| 19.4 | Edge (najnowszy) | Pelna funkcjonalnosc | |
| 19.5 | Chrome - Web Speech API | Wprowadzanie glosowe | |
| 19.6 | Safari - Web Speech API | Wprowadzanie glosowe (ograniczone) | |
| 19.7 | Firefox - streaming SSE | Streaming odpowiedzi AI | |

---

## 20. Baza danych i cache

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 20.1 | Migracje Prisma - aktualna wersja | Wszystkie migracje zastosowane | |
| 20.2 | Seedowanie bazy danych | Dane poczatkowe zaladowane | |
| 20.3 | Kaskadowe usuwanie (User -> Conversations -> Messages) | Powiazane rekordy usuniate | |
| 20.4 | Indeksy bazy danych | Zapytania wykorzystuja indeksy | |
| 20.5 | Polaczenie Redis | Redis dostepny i odpowiada | |
| 20.6 | Cache TTL - wygasniecie | Dane odswiezone po wygasnieciu TTL | |
| 20.7 | Cache invalidation po mutacji | Cache wyczyszczony po zmianie danych | |

---

## 21. CI/CD i wdrozenie

| # | Scenariusz testowy | Oczekiwany rezultat | Status |
|---|---|---|---|
| 21.1 | Linting kodu (npm run lint) | Brak bledow ESLint | |
| 21.2 | Testy jednostkowe (npm run test) | Wszystkie testy zaliczone | |
| 21.3 | Build projektu (npm run build) | Build zakonczony bez bledow | |
| 21.4 | Testy E2E (npm run test:e2e) | Wszystkie scenariusze zaliczone | |
| 21.5 | Docker Compose - uruchomienie | PostgreSQL i Redis dostepne | |
| 21.6 | Zmienne srodowiskowe - kompletnosc | Wszystkie wymagane zmienne ustawione | |
| 21.7 | Generowanie klienta Prisma | Klient wygenerowany bez bledow | |

---

## Podsumowanie

| Kategoria | Liczba testow |
|---|---|
| Uwierzytelnianie i rejestracja | 20 |
| Czat AI | 15 |
| Narzedzia AI - wFirma | 44 |
| Subskrypcje i platnosci | 12 |
| Dane uwierzytelniajace | 10 |
| Profil uzytkownika | 6 |
| Panel administratora | 7 |
| Sledzenie kosztow AI | 6 |
| System pomocy | 5 |
| Internacjonalizacja | 6 |
| Tryb ciemny/jasny | 5 |
| Pliki i pobieranie | 4 |
| Prywatnosc i cookies | 6 |
| Responsywnosc | 8 |
| Wydajnosc | 7 |
| Bezpieczenstwo | 12 |
| Obsluga bledow | 8 |
| Dostepnosc | 6 |
| Kompatybilnosc przegladarek | 7 |
| Baza danych i cache | 7 |
| CI/CD i wdrozenie | 7 |
| **RAZEM** | **208** |

---

*Ostatnia aktualizacja: 2026-01-29*
