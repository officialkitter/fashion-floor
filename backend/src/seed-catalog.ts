import { createHash } from "node:crypto";
import { prisma } from "./db.js";

const brands = [
  { name: "Gucci", segment: "luxury" },
  { name: "Louis Vuitton", segment: "luxury" },
  { name: "Chanel", segment: "luxury" },
  { name: "Prada", segment: "luxury" },
  { name: "Dior", segment: "luxury" },
  { name: "Armani", segment: "luxury" },
  { name: "Versace", segment: "luxury" },
  { name: "Burberry", segment: "luxury" },
  { name: "Zara", segment: "high-street" },
  { name: "H&M", segment: "high-street" },
  { name: "Nike", segment: "sportswear" },
  { name: "Adidas", segment: "sportswear" },
] as const;

const assortment = [
  { category: "Tops", title: "Cotton crew-neck top", price: 180_000 },
  { category: "Tops", title: "Button-front shirt", price: 320_000 },
  { category: "Outerwear", title: "Lightweight everyday jacket", price: 850_000 },
  { category: "Bottoms", title: "Straight-leg trousers", price: 480_000 },
  { category: "Denim", title: "Classic straight-leg jeans", price: 420_000 },
  { category: "Dresses", title: "Day dress", price: 690_000 },
  { category: "Footwear", title: "Everyday low-top footwear", price: 750_000 },
  { category: "Bags", title: "Crossbody bag", price: 920_000 },
  { category: "Accessories", title: "Everyday belt", price: 220_000 },
  { category: "Activewear", title: "Training top", price: 240_000 },
] as const;

const luxuryBrands: ReadonlySet<string> = new Set(
  brands.filter((brand) => brand.segment === "luxury").map((brand) => brand.name),
);
const sportswearBrands: ReadonlySet<string> = new Set(
  brands.filter((brand) => brand.segment === "sportswear").map((brand) => brand.name),
);
const isDryRun = process.argv.includes("--dry-run");

function stableUuid(value: string): string {
  const namespace = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");
  const bytes = createHash("sha1")
    .update(namespace)
    .update(`fashion-floor:${value}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getBrandId(brandIds: ReadonlyMap<string, string>, name: string): string {
  const id = brandIds.get(name);
  if (!id) throw new Error(`No database brand record was prepared for ${name}.`);
  return id;
}

const products = brands.flatMap((brand) =>
  assortment.map((item) => {
    const multiplier = luxuryBrands.has(brand.name) ? 4 : sportswearBrands.has(brand.name) ? 1.35 : 1;
    const priceTzs = Math.round((item.price * multiplier) / 5_000) * 5_000;

    return {
      id: stableUuid(`catalog:${brand.name}:${item.category}:${item.title}`),
      brand,
      item,
      priceMinor: BigInt(priceTzs) * 100n,
    };
  }),
);

if (products.length !== 120) {
  throw new Error(`Catalog seed should contain 120 products; generated ${products.length}.`);
}

if (isDryRun) {
  console.info("Catalog seed is valid.", {
    brands: brands.length,
    products: products.length,
    stores: 1,
    currency: "TZS",
    published: false,
  });
} else {
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const ownerRole = await transaction.user_roles.findFirst({
        where: { role: "super_admin", is_active: true },
        select: { user_id: true },
      });

      if (!ownerRole) {
        throw new Error(
          "Create and assign the Fashion Floor Owner account before seeding the catalog. See supabase/README.md.",
        );
      }

      const vendor = await transaction.vendors.upsert({
        where: {
          owner_id_name: {
            owner_id: ownerRole.user_id,
            name: "Fashion Floor",
          },
        },
        create: {
          owner_id: ownerRole.user_id,
          name: "Fashion Floor",
          verification_status: "pending",
          partner_status: "pending",
          vendor_type: "supplier",
          is_active: false,
        },
        update: {},
      });

      const store =
        (await transaction.stores.findFirst({
          where: { vendor_id: vendor.id, name: "Fashion Floor Point" },
        })) ??
        (await transaction.stores.create({
          data: {
            vendor_id: vendor.id,
            name: "Fashion Floor Point",
            description:
              "Central Fashion Floor catalogue. Physical location, fulfilment, stock, supplier arrangements, and brand authorization require confirmation before publication.",
            city: "Online",
            country: "Tanzania",
            is_active: false,
          },
        }));

      const brandIds = new Map<string, string>();
      for (const brand of brands) {
        const record = await transaction.brands.upsert({
          where: { name: brand.name },
          create: {
            name: brand.name,
            partnership_status: "unaffiliated",
            is_active: false,
          },
          update: {},
          select: { id: true },
        });
        brandIds.set(brand.name, record.id);
      }

      const created = await transaction.products.createMany({
        skipDuplicates: true,
        data: products.map(({ id, brand, item, priceMinor }) => ({
          id,
          vendor_id: vendor.id,
          store_id: store.id,
          brand_id: getBrandId(brandIds, brand.name),
          title: item.title,
          description:
            "Indicative TZS estimate. The supplier must confirm the specific model, materials, stock, price, and brand provenance before this item can be published.",
          price_minor: priceMinor,
          currency: "TZS",
          images: [],
          sizes: ["XS", "S", "M", "L", "XL"].map((size) => ({ size, stock: 0 })),
          colors: [],
          category: item.category,
          listing_type: "other_brand",
          catalog_key: `${brand.name.toLowerCase().replaceAll(" ", "-")}:${item.category.toLowerCase()}`,
          authenticity: "Brand provenance not verified; supplier documentation is required.",
          shipping: "Fulfilment terms to be confirmed by the supplier.",
          returns: "Return policy to be confirmed before publication.",
          is_active: false,
        })),
      });

      return { storeId: store.id, productsCreated: created.count };
    });

    console.info("Fashion Floor catalog records are saved as unpublished entries.", {
      brands: brands.length,
      store: "Fashion Floor Point",
      productsCreated: result.productsCreated,
      productsInSeed: products.length,
    });
  } catch (error) {
    console.error("Fashion Floor catalog seeding failed.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
