# TIRAMOTO - Dërgesa të shpejta në Tiranë

Platformë për dërgimin e artikujve të vegjël, dokumenteve dhe blerjeve pa pasur nevojë të dalësh nga shtëpia.

## Si ta nisësh

```bash
npm install
npm start
```

Hap në shfletues: **http://localhost:3000**

## Llogaritë e paracaktuara

| Roli    | Email                | Fjalëkalimi  |
|---------|----------------------|--------------|
| Admin   | admin@tiramoto.al    | admin123     |
| Korrier | korrier@tiramoto.al  | korrier123   |

Klientët mund të regjistrohen vetë nga faqja e regjistrimit.

## Struktura

```
├── server.js            # Serveri kryesor
├── db/init.js           # Databaza SQLite
├── middleware/auth.js    # Mbrojtja e rrugëve
├── routes/
│   ├── auth.js          # Hyrje / Regjistrim
│   ├── customer.js      # Faqjet e klientit
│   ├── courier.js       # Faqjet e korrierit
│   └── admin.js         # Faqjet e adminit
├── views/               # Faqjet EJS
└── public/css/          # Stilet
```

## Çmimi

Çmimi fiks: **300 LEK** për çdo dërgesë (para në dorë).

## Rrjedha e porosisë

**E RE** → **CAKTUAR** → **MARRË** → **DORËZUAR**
