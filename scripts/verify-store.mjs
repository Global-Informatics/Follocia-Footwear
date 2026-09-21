import { createServer } from "vite";

// Mock minimal browser globals for testing store logic in Node
const storage = new Map();
global.window = {
  dispatchEvent: (event) => {},
};
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
};
global.CustomEvent = class { constructor(type) { this.type = type; } };

console.log("--------------------------------------------------");
console.log("FOLLICIA ADMIN & STOREFRONT E2E VERIFICATION TEST");
console.log("--------------------------------------------------");

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});

const {
  getProducts,
  saveProducts,
  seedProducts,
  isOldProduct,
} = await vite.ssrLoadModule("./src/lib/commerceStore.ts");

// 1. Verify initial products load correctly
const initial = getProducts();
console.log(`[PASS 1] Initial catalog loaded: ${initial.length} products found.`);
if (initial.length === 0) throw new Error("No products found in catalog!");

// 2. Simulate Admin adding a new product via Admin Panel
const testProductId = `fl-test-${Date.now()}`;
const testProductTitle = "Aura Imperial Stiletto";
const newProduct = {
  id: testProductId,
  designId: "FL-9999",
  title: testProductTitle,
  edition: "Aura Collection",
  collection: "Aura",
  category: "Heel",
  silhouette: "Pointed Toe",
  material: "Italian Patent Leather",
  tone: "Blush Champagne",
  heroColour: "Blush Champagne",
  colourName: "Blush Champagne",
  colourCode: "BC",
  price: "Rs. 5,490",
  image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=85",
  images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=85"],
  status: "Live",
  produced: 100,
  reserved: 0,
  available: 100,
  isNewArrival: true,
};

console.log(`[ACTION] Admin creates new product: "${testProductTitle}" (Price: ${newProduct.price}, Status: ${newProduct.status})...`);
const updatedList = [newProduct, ...initial];
saveProducts(updatedList);

// 3. Verify getProducts() returns the newly added product
const fetched = getProducts();
const found = fetched.find((p) => p.id === testProductId);
if (!found) throw new Error("Added product was NOT found in getProducts()!");
console.log(`[PASS 2] Product successfully added and retrieved by getProducts().`);
console.log(`         ID: ${found.id}, Title: ${found.title}, Collection: ${found.collection}, Price: ${found.price}`);

// 4. Verify Storefront Filter Logic (Home Page & Shop Page)
const auraCollectionMatch = fetched.filter((p) => {
  if (p.status === "Draft") return false;
  return (p.collection && p.collection.toLowerCase() === "aura") ||
         (p.edition && p.edition.toLowerCase().includes("aura"));
});
const foundInAura = auraCollectionMatch.some((p) => p.id === testProductId);
if (!foundInAura) throw new Error("New product does not match 'Aura' collection filter!");
console.log(`[PASS 3] Product matches storefront 'Aura' collection filter (${auraCollectionMatch.length} total pieces in Aura).`);

const heelStyleMatch = fetched.filter((p) => {
  if (p.status === "Draft") return false;
  return (p.category && p.category.toLowerCase() === "heel") ||
         (p.silhouette && p.silhouette.toLowerCase().includes("heel"));
});
const foundInHeel = heelStyleMatch.some((p) => p.id === testProductId);
if (!foundInHeel) throw new Error("New product does not match 'Heel' category filter!");
console.log(`[PASS 4] Product matches storefront 'Heel' style filter (${heelStyleMatch.length} total pieces in Heel).`);

// 5. Verify Storefront Search Logic
const searchQuery = "imperial stiletto";
const searchMatches = fetched.filter((p) => {
  if (p.status === "Draft") return false;
  const searchable = [
    p.title,
    p.collection,
    p.category,
    p.heroColour,
    p.material,
    p.silhouette
  ].join(" ").toLowerCase();
  return searchQuery.split(/\s+/).every((w) => searchable.includes(w));
});
const foundInSearch = searchMatches.some((p) => p.id === testProductId);
if (!foundInSearch) throw new Error("New product not retrievable via storefront search!");
console.log(`[PASS 5] Storefront search query "${searchQuery}" matched the newly added product.`);

// 6. Verify Move to Draft (Hiding from Storefront)
console.log(`[ACTION] Admin toggles product status to "Draft"...`);
const draftList = fetched.map((p) => p.id === testProductId ? { ...p, status: "Draft" } : p);
saveProducts(draftList);

const liveOnly = getProducts().filter((p) => p.status !== "Draft");
const draftInLive = liveOnly.some((p) => p.id === testProductId);
if (draftInLive) throw new Error("Draft product is incorrectly appearing in live products!");
console.log(`[PASS 6] Draft product is properly hidden from storefront live catalog.`);

// 7. Verify Publish back to Live
console.log(`[ACTION] Admin republishes product back to "Live"...`);
const liveList = getProducts().map((p) => p.id === testProductId ? { ...p, status: "Live" } : p);
saveProducts(liveList);
const liveAfterPublish = getProducts().filter((p) => p.status !== "Draft");
if (!liveAfterPublish.some((p) => p.id === testProductId)) throw new Error("Published product not visible in live products!");
console.log(`[PASS 7] Product republished and immediately visible on storefront.`);

// 8. Verify Cart Price Resolution from live products
const { getLatestProductPrice } = await vite.ssrLoadModule("./src/components/cart/CartContext.tsx");
const cartPrice = getLatestProductPrice({ id: testProductId, title: testProductTitle });
if (cartPrice !== "Rs. 5,490") throw new Error(`Cart price mismatch! Expected "Rs. 5,490", got "${cartPrice}"`);
console.log(`[PASS 8] Cart correctly resolved live dynamic product price: ${cartPrice}`);

// 9. Verify Admin Price Edit propagation to storefront & cart
console.log(`[ACTION] Admin updates product price to "Rs. 5,990"...`);
const priceEditedList = getProducts().map((p) => p.id === testProductId ? { ...p, price: "Rs. 5,990" } : p);
saveProducts(priceEditedList);
const updatedProduct = getProducts().find((p) => p.id === testProductId);
if (updatedProduct?.price !== "Rs. 5,990") throw new Error(`Product price did not update! Got: ${updatedProduct?.price}`);
const updatedCartPrice = getLatestProductPrice({ id: testProductId, title: testProductTitle });
if (updatedCartPrice !== "Rs. 5,990") throw new Error(`Cart price did not reflect admin update! Got: ${updatedCartPrice}`);
console.log(`[PASS 9] Admin price edit ("Rs. 5,990") successfully updated product and synchronized with cart.`);

// 10. Verify Delete Product (Permanent removal from Admin & Storefront)
console.log(`[ACTION] Admin deletes the product...`);
const listAfterDelete = getProducts().filter((p) => p.id !== testProductId);
saveProducts(listAfterDelete);
const checkDeleted = getProducts().find((p) => p.id === testProductId);
if (checkDeleted) throw new Error("Product still exists after deletion!");
console.log(`[PASS 10] Product permanently removed upon deletion.`);

// 11. USER SCENARIO TEST: Admin adds a product named "money"
console.log(`\n--- TESTING USER SCENARIO: Product named "money" ---`);
const moneyProduct = {
  id: `fl-money-${Date.now()}`,
  designId: "FL-MNY",
  title: "money",
  edition: "Aura Collection",
  collection: "Aura",
  category: "Heel",
  silhouette: "Pointed Toe",
  material: "Vegan Leather",
  tone: "Warm Ivory",
  heroColour: "Warm Ivory",
  price: "Rs. 4,990",
  image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=85",
  images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=85"],
  status: "Live",
  produced: 100,
  reserved: 0,
  available: 100,
};
console.log(`[ACTION] Admin creates product "${moneyProduct.title}" (Price: ${moneyProduct.price}, Status: ${moneyProduct.status})...`);
saveProducts([moneyProduct, ...getProducts()]);

const foundMoney = getProducts().find((p) => p.title.toLowerCase() === "money");
if (!foundMoney) throw new Error("Product 'money' was not found immediately after creation!");
console.log(`[PASS 11] Product 'money' successfully created and visible in catalogue.`);

// 12. Simulate syncCommerceFromBackend running "after some time"
console.log(`[ACTION] Simulating syncCommerceFromBackend() triggered on storefront mount / refresh...`);
const { syncCommerceFromBackend } = await vite.ssrLoadModule("./src/lib/commerceStore.ts");

// Mock fetch for /api/commerce/bootstrap returning remote catalogue
global.fetch = async (url) => {
  if (String(url).includes("/bootstrap")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        products: [], // Even if backend returns empty or partial list
        orders: [],
        customers: [],
      }),
    };
  }
  return { ok: true, status: 204, json: async () => null };
};

await syncCommerceFromBackend();

const moneyAfterSync = getProducts().find((p) => p.title.toLowerCase() === "money");
if (!moneyAfterSync) throw new Error("CRITICAL BUG: Product 'money' was wiped out after syncCommerceFromBackend()!");
if (moneyAfterSync.status !== "Live") throw new Error("Product 'money' status changed from Live!");
console.log(`[PASS 12] Product 'money' PRESERVED and STILL LIVE after syncCommerceFromBackend()!`);
console.log(`          ID: ${moneyAfterSync.id}, Title: ${moneyAfterSync.title}, Price: ${moneyAfterSync.price}, Status: ${moneyAfterSync.status}`);

await vite.close();

console.log("--------------------------------------------------");
console.log("ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY! ✓");
console.log("--------------------------------------------------");
