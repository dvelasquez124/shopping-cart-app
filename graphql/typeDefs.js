// graphql/typeDefs.js
// Simple GraphQL schema (SDL). We expose both `id` (GraphQL-style)
// and `_id` (Mongo-style) for convenience.

export const typeDefs = /* GraphQL */ `
  type Product {
    id: ID!          # preferred field to use in GraphQL
    _id: ID!         # Mongo _id also exposed (handy for RESTish clients)
    name: String!
    description: String
    price: Float!
    quantityInStock: Int!
  }

  type Query {
    products: [Product!]!
    searchProducts(name: String!): [Product!]!
    productsInPriceRange(min: Float!, max: Float!): [Product!]!
  }
`;
