// graphql/typeDefs.js

export const typeDefs = /* GraphQL */ `
    type Product {
    id: ID!
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