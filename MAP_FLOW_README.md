# Map Flow – Google Map, Driver Trip, Owner History

## 1. Google Map kahan use ho raha hai?

App mein **react-native-maps** use ho raha hai, **Google Maps** provider ke saath:

- **File:** `src/components/DriverPathMap.tsx`
- `MapView` + `Polyline` + `PROVIDER_GOOGLE` se map render hota hai.
- Ye component **driver screen** (Active Trip) aur **owner dashboard** (Live Fleet Tracking) dono mein use hota hai.

---

## 2. Map ka flow (step-by-step)

### Driver side (Cattle Feed Truck Driver – Active Trip)

1. Driver **Active Trip** start karta hai (status `loading` ya `in_transit`).
2. **Geolocation.watchPosition** se device ki **live latitude/longitude** milti hai (har ~10m ya 5 sec).
3. Ye coordinates:
   - **Local state** mein add hoti hain → `pathCoordinates` (array).
   - **Socket.io** se backend ko bheji jati hain → `driver_location` event with `{ tripId, lat, lng }`.
4. **DriverPathMap** ko `coordinates={pathCoordinates}` diya jata hai.
5. Map par **Polyline** (blue line) se driver ka **live path** dikhta hai (“YOUR ROUTE”).
6. `followUser={true}` ki wajah se map driver ke piche-piche move karta hai.

### Backend (Socket + optional REST)

1. **Socket.io** pe:
   - Driver **join_trip_room** karta hai with `{ tripId }` → socket room `trip:${tripId}`.
   - Driver **driver_location** emit karta hai → backend **us room** ko broadcast karta hai:  
     `io.to('trip:' + tripId).emit('driver_location', { lat, lng })`.
2. **REST (optional history):**
   - `POST /api/cattle-feed-truck/trips/:id/location` body: `{ latitude, longitude }` se trip ki **locationHistory** DB mein save ho sakti hai.
   - Abhi **driver app is API ko call nahi karta** – sirf Socket bhejta hai. Isliye **history** tab tak empty rahegi jab tak ye call add na ho.

### Owner side (Milk Truck / Cattle Feed Truck Owner Dashboard)

1. Owner dashboard open karta hai.
2. **useOwnerTripSocket** hook se:
   - Socket se connect hota hai.
   - **Active trips** ke liye **join_trip_room** karta hai (same `tripId`).
   - **join_owner_room** karta hai (owner notifications ke liye).
3. Jab backend **driver_location** broadcast karta hai, owner app ko event milta hai.
4. **onDriverLocation(lat, lng)** se `fleetPathCoordinates` array mein `{ latitude, longitude }` append hota hai.
5. **DriverPathMap** ko `coordinates={fleetPathCoordinates}` diya jata hai.
6. **Live Fleet Tracking** map par driver ka **live path** (blue line) dikhta hai.

---

## 3. Driver ki trip map par kaise dikhti hai?

| Jagah            | Kaise dikhti hai |
|------------------|------------------|
| **Driver app**   | Active Trip screen pe “YOUR ROUTE” – `pathCoordinates` (device GPS se) se Polyline. Live move karta hai. |
| **Owner app**    | Dashboard pe “Live Fleet Tracking” – `fleetPathCoordinates` (Socket se aaye hue points) se Polyline. Sirf **active** trip ka path; refresh/close pe reset. |

Dono jagah same component **DriverPathMap** use hota hai:  
`coordinates` array → **Polyline** → map par blue line.

---

## 4. Owner history mein driver kahan-kahan gaya ye kaise dekhe?

**Abhi:**

- **Live path** – Socket se sahi dikhta hai (jab trip active hai).
- **Past trip ka path (history)** – Backend mein `locationHistory` field hai, lekin driver app **location API call nahi karta**, isliye DB mein points save nahi hote. Owner ko “purane trip ka path” dikhane ke liye ye flow complete nahi hai.

**History dikhane ke liye kya chahiye:**

1. **Driver se location save karvana**
   - Option A: Driver app mein Socket ke saath **periodically**  
     `POST /api/cattle-feed-truck/trips/:id/location`  
     body: `{ latitude, longitude }` call karo (e.g. har 30 sec ya har 50m).
   - Option B: Backend pe Socket **driver_location** suno aur usi time trip update karke **locationHistory** push karo (same data se).

2. **Owner ko trip detail + map dikhana**
   - Owner ke paas koi screen hona chahiye jahan wo **past trip** select kare (e.g. Trip Management → trip detail).
   - Us trip ke liye `GET /api/cattle-feed-truck/trips/:id` se **trip** lao (response mein `locationHistory` aati hai).
   - `locationHistory` ko `{ latitude, longitude }` array mein convert karke **DriverPathMap** ko `coordinates` mein do.
   - Map par **purane trip ka poora path** (Polyline) dikhega – “driver kahan-kahan chala tha”.

---

## 5. Short summary

| Question              | Answer |
|-----------------------|--------|
| Google Map use?       | Haan – `react-native-maps` + `PROVIDER_GOOGLE` in `DriverPathMap.tsx`. |
| Map flow?             | Driver GPS → local path + Socket → Backend broadcast → Owner Socket → owner map. |
| Driver trip map par?  | Driver: “YOUR ROUTE” (pathCoordinates). Owner: “Live Fleet Tracking” (fleetPathCoordinates). |
| Owner history?        | Live sahi hai; **past trip path** ke liye location save (API ya Socket se) + trip detail screen pe map with `locationHistory` chahiye. |

Agar tum chaho toh next step mein:
- driver app mein location API call add kar sakte ho, **ya**
- backend pe `driver_location` pe `locationHistory` save karwa sakte ho, **aur**
- owner ke trip detail screen pe `locationHistory` se map dikhane ka code add kar sakte ho.
