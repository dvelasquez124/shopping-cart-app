# CS602 Term Project — Shopping Cart (Node + Express)

- Express v5, MongoDB Atlas + Mongoose (User, Product, Order)
  - Relationship: User 1 → many Orders; Order.items[] references Product
- Passport.js (local strategy + sessions via express-session)
- REST (public product endpoints) + GraphQL (Yoga at /graphql)
- Handlebars views (Bootstrap CDN)

Base URL: http://localhost:3000  
Node: v20.18.x

---

## Setup

Create a `.env` file (do NOT commit this file):

    MONGO_URI=<YOUR_ATLAS_CONNECTION_STRING_HERE>
    SESSION_SECRET=<YOUR_OWN_RANDOM_STRING>
    PORT=3000

How to get your Atlas connection string:

1. In MongoDB Atlas → your cluster → **Connect** → **Drivers**.
2. Copy the SRV connection string (it starts with `mongodb+srv://`).
3. Paste it into `MONGO_URI` and replace `<username>` / `<password>` / `<dbname>` as needed.
   - If your password has special characters, use the exact string Atlas gives you (it’s already URL-encoded).

Install:

    npm i

---

## Seed (demo data)

This clears Users/Products and inserts samples (2 users + products):

    npm run seed

Logins:

- Admin: admin@example.com / admin123
- Customer: customer@example.com / customer123

---

## Run

Dev (auto-reload):

    npm run dev

Or:

    npm start

---

## REST (test in Postman)

Public (no auth):

- GET /api/products
- GET /api/products/search?name=mouse
- GET /api/products/range?min=20&max=100

Auth flow:

1.  POST /auth/login  
    Body:

        { "email": "customer@example.com", "password": "customer123" }

2.  GET /auth/me (quick check)  
3.  POST /api/orders (place order)

        { "items": [ { "productId": "<id>", "quantity": 2 } ] }

4.  GET /api/orders/mine

Admin:

- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id
- GET /api/customers
- GET /api/customers/:id/orders

---

## GraphQL (at /graphql)

Open http://localhost:3000/graphql and run:

    query { products { id name price } }

    query ($q: String!) {
      searchProducts(name: $q) { id name price }
    }
    Variables:
      { "q": "mouse" }

    query {
      productsInPriceRange(min: 20, max: 100) { id name price }
    }

Note: use `id` (virtual) in GraphQL, not `_id`.

---

## UI (Handlebars)

- `/` — product list (customers see Qty inputs and a “Place Order” button)
- `/login` — invalid login shows a small alert; on success:
  - customer → `/my-orders`
  - admin → `/admin`
- `/my-orders` — customer’s orders
- `/admin` — customers list (admin users hidden)
- `/admin/customer/:id` — update status or delete an order (restocks)
- `/admin/products` — add / edit / delete products

---

## Demo checklist (what to show)

1. REST: GET /api/products, GET /api/products/search?name=mouse
2. GraphQL: products, searchProducts (with var), productsInPriceRange
3. UI: Home → Login (customer) → place order → My Orders
4. UI: Login (admin) → Admin → Customer Orders (update/delete) → Admin Products (CRUD)

