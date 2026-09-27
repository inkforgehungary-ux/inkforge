# InkForge javításcsomag

A GitHub-kapcsolat a javítási kísérletnél 403 / Resource not accessible by integration hibát adott, ezért a fájlokat nem lehetett közvetlenül pusholni.

A csomag a következő konkrét javításokat tartalmazza:

1. A kezdőlap és a StencilTool most a tényleges `t('key')` fordítási API-t használja.
2. A publikus locale oldalak megkapják a közös navigációt és footert.
3. A kezdőoldal reszponzív fejléc-képeket használ.
4. A stencil feltöltés támogat drag-and-dropot, méret/DPI beállítást, billentyűzetes aktiválást és 20 MB méretkorlátot.
5. Az átlátszó PNG-k fehér háttérrel kerülnek feldolgozásra.
6. A stencil motor `cleanMask()` része O(N * komponensek) jellegű teljes képszkennelés helyett egyszeri képszkennelést használ.
7. A motor nem rajzol téves összekötő vonalat a kép széléig, ha nincs közeli fő komponens.
8. A Supabase DB helper konfigurációhiánynál értelmes hibát ad, és ellenőrzi a tábla nevét.
9. A health endpoint nem küld vissza API-kulcs részletet.
10. A pipeline tesztben hivatkozott hiányzó `pipeline/js/stencil-v3.js` létrejön.
11. Az admin kezdőoldal nem rajzol külön második navigációt.
12. A bejelentkezési oldal használható lokalizált kulcsokat kap.

Alkalmazás: a ZIP-ben lévő fájlokat azonos elérési útra kell bemásolni a repository `main` ágában.
