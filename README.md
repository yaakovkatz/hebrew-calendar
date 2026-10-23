# לוח יהודי – לוח עברי

לוח עברי לאנדרואיד בסגנון לוח קיר: נקי, יפה ושמח, עם ימי ההולדת והנישואין של המשפחה לפי התאריך העברי.

> בפיתוח. כרגע: שלב 0, בדיקת הספרייה על אנדרואיד.

- תכנון והחלטות: [PLAN.md](PLAN.md)
- המסכים המאושרים: [design/screens.html](design/screens.html)

## הרצה

```bash
npm install
npm test
npx expo run:android
```

נדרש Android Studio (אמולטור או טלפון בחיבור USB). Expo Go לא מספיק, כי האפליקציה מכריחה כיוון ימין-לשמאל.

## רישיון

GPL-3.0-or-later. ראו [LICENSE](LICENSE).
חישובי הלוח והזמנים: [@hebcal/core](https://github.com/hebcal/hebcal-es6) (GPL-2.0-or-later).
