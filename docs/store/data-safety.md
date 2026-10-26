# טופס בטיחות הנתונים (Data safety) – תשובות

מתאים ל-[מדיניות הפרטיות](../privacy.md). אם מוסיפים Sentry או כל שירות אחר, צריך לעדכן את שניהם.

## איסוף ושיתוף
| שאלה | תשובה |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (רק טופס יצירת קשר) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS ל-Formspree) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: בקשה דרך יצירת קשר. המידע בטלפון נמחק עם האפליקציה |

## סוגי מידע שמסמנים
| סוג | Collected | Shared | חובה? | למה |
|---|---|---|---|---|
| Personal info › Email address | ✓ | ✗ | Optional | App functionality / Developer communications (מענה לפנייה) |
| App activity › Other user-generated content (תוכן ההודעה) | ✓ | ✗ | Optional* | Developer communications |
| App info and performance › Diagnostics (?) | ✓ | ✗ | Optional | פרטי מכשיר וגרסה, רק אם המשתמש סימן |

\* כל הטופס הוא אופציונלי: המשתמש בוחר אם לשלוח בכלל.

- **Shared = לא:** לפי ההגדרות של גוגל, העברה לספק שירות שמעבד בשמנו (Formspree) לא נחשבת "שיתוף".
- **Processed ephemerally:** לא. ההודעה נשמרת אצל Formspree.
- **פרטי מכשיר:** סוג המערכת, גרסת אנדרואיד וגרסת האפליקציה. אם אין קטגוריה מתאימה יותר, לסמן Diagnostics. לבדוק בטופס.

## מה **לא** מסמנים
- מיקום: לא. העיר נבחרת מרשימה ונשמרת רק בטלפון.
- אירועים, תזכורות, שמות ותאריכים: לא. נשמרים רק בטלפון ולא יוצאים ממנו (מידע שנשאר במכשיר לא נחשב "איסוף").
- מזהי מכשיר, פרסום, אנליטיקה, קריסות: אין.
- אנשי קשר, תמונות, קבצים, מידע פיננסי ובריאותי: אין.

## הצהרות נוספות ב-Play Console
- Ads: **No, my app does not contain ads**
- Account creation: אין חשבונות, ולכן אין צורך בקישור למחיקת חשבון
- Privacy policy URL: הכתובת של `docs/privacy.md` ב-GitHub Pages (אחרי שיפורסם)
