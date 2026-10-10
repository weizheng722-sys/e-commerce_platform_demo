export type Product = {
  handle: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  color: string;
  symbol: string;
  available: boolean;
};

const products: Product[] = [
  {
    handle: "sunshine-fruit-box",
    name: "Sunshine fruit box",
    category: "Produce box",
    description: "A cheerful mix of seasonal fruit for bright breakfasts and easy snacks.",
    price: 24,
    unit: "per box",
    color: "peach",
    symbol: "☼",
    available: true,
  },
  {
    handle: "garden-greens",
    name: "Garden greens",
    category: "Produce box",
    description: "Crisp leafy greens and fresh herbs, ready for salads and weeknight suppers.",
    price: 18,
    unit: "per box",
    color: "sage",
    symbol: "✿",
    available: true,
  },
  {
    handle: "everyday-pantry",
    name: "Everyday pantry set",
    category: "Pantry",
    description: "A useful little collection of feel-good staples for your kitchen shelf.",
    price: 32,
    unit: "per set",
    color: "butter",
    symbol: "✳",
    available: true,
  },
  {
    handle: "market-mix-box",
    name: "Market mix box",
    category: "Produce box",
    description: "A rotating selection of market favourites, picked for the week ahead.",
    price: 29,
    unit: "per box",
    color: "lavender",
    symbol: "❋",
    available: false,
  },
];

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  return products.find((product) => product.handle === handle);
}
