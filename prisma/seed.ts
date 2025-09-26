import { Channel, ItemCondition, ItemStatus, MovementType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data to allow re-running the seed safely
  await prisma.inventoryMovement.deleteMany();
  await prisma.saleLine.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseLine.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.item.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Categories
  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      slug: "electronics",
      sortOrder: 1,
    },
  });

  const laptops = await prisma.category.create({
    data: {
      name: "Laptops",
      slug: "laptops",
      sortOrder: 2,
      parentId: electronics.id,
    },
  });

  const accessories = await prisma.category.create({
    data: {
      name: "Accessories",
      slug: "accessories",
      sortOrder: 3,
      parentId: electronics.id,
    },
  });

  // Products
  const macbookPro = await prisma.product.create({
    data: {
      name: "MacBook Pro 14\" (M3)",
      brand: "Apple",
      model: "M3 2024",
      categoryId: laptops.id,
      specsJson: {
        cpu: "Apple M3",
        ram: "16GB",
        storage: "512GB SSD",
      },
      imageUrls: [
        "https://images.example.com/macbook-pro-14-m3-front.jpg",
      ],
    },
  });

  const dellXps = await prisma.product.create({
    data: {
      name: "Dell XPS 13",
      brand: "Dell",
      model: "9340",
      categoryId: laptops.id,
      specsJson: {
        cpu: "Intel Core Ultra 7",
        ram: "16GB",
        storage: "1TB SSD",
      },
      imageUrls: [
        "https://images.example.com/dell-xps-13-front.jpg",
      ],
    },
  });

  const mxMaster = await prisma.product.create({
    data: {
      name: "Logitech MX Master 3S",
      brand: "Logitech",
      model: "MX Master 3S",
      categoryId: accessories.id,
      specsJson: {
        connectivity: "Bluetooth / 2.4GHz",
        dpi: 8000,
        color: "Graphite",
      },
      imageUrls: [
        "https://images.example.com/logitech-mx-master-3s.jpg",
      ],
    },
  });

  const galaxyS24 = await prisma.product.create({
    data: {
      name: "Samsung Galaxy S24",
      brand: "Samsung",
      model: "S24",
      categoryId: electronics.id,
      specsJson: {
        cpu: "Snapdragon 8 Gen 3",
        ram: "12GB",
        storage: "512GB",
      },
      imageUrls: [
        "https://images.example.com/samsung-galaxy-s24.jpg",
      ],
    },
  });

  // Items
  const inStockItem = await prisma.item.create({
    data: {
      productId: macbookPro.id,
      serial: "MBP14M3-001",
      condition: ItemCondition.NEW,
      status: ItemStatus.IN_STOCK,
      purchaseToman: 112_000_000,
      feesToman: 4_500_000,
      refurbToman: 0,
      location: "Warehouse A",
      notes: "Fresh stock received directly from distributor.",
      images: [
        "https://images.example.com/macbook-pro-14-m3-serial-001.jpg",
      ],
    },
  });

  const listedItem = await prisma.item.create({
    data: {
      productId: dellXps.id,
      serial: "DXPS13-REFURB-021",
      condition: ItemCondition.USED,
      status: ItemStatus.LISTED,
      purchaseToman: 78_000_000,
      feesToman: 3_000_000,
      refurbToman: 2_500_000,
      location: "Showroom",
      listedChannel: Channel.ONLINE,
      listedPriceToman: 92_000_000,
      listedAt: new Date("2024-08-10T09:00:00.000Z"),
      notes: "Grade-A refurb with new battery.",
      images: [
        "https://images.example.com/dell-xps-13-refurb.jpg",
      ],
    },
  });

  const soldItem = await prisma.item.create({
    data: {
      productId: galaxyS24.id,
      serial: "S24-TRADING-77881",
      condition: ItemCondition.NEW,
      status: ItemStatus.SOLD,
      purchaseToman: 48_000_000,
      feesToman: 2_000_000,
      refurbToman: 0,
      location: "Showroom",
      listedChannel: Channel.ONLINE,
      listedPriceToman: 56_500_000,
      listedAt: new Date("2024-07-18T11:30:00.000Z"),
      soldAt: new Date("2024-07-22T16:15:00.000Z"),
      soldPriceToman: 55_800_000,
      saleChannel: Channel.DIRECT,
      buyerName: "Sara Hosseini",
      notes: "Sold with complimentary case bundle.",
      images: [
        "https://images.example.com/s24-retail-pack.jpg",
      ],
    },
  });

  // Sale for the sold item
  const sale = await prisma.sale.create({
    data: {
      customerName: "Sara Hosseini",
      channel: Channel.DIRECT,
      reference: "SO-2024-001",
      orderedAt: new Date("2024-07-22T16:00:00.000Z"),
      totalToman: 55_800_000,
      lines: {
        create: [
          {
            productId: galaxyS24.id,
            itemId: soldItem.id,
            unitToman: 55_800_000,
          },
        ],
      },
    },
  });

  // Inventory movements (2 per item)
  await prisma.inventoryMovement.createMany({
    data: [
      {
        itemId: inStockItem.id,
        movement: MovementType.PURCHASE_IN,
        qty: 1,
        reference: "PO-2024-001",
        notes: "Inbound from Apple Middle East.",
      },
      {
        itemId: inStockItem.id,
        movement: MovementType.ADJUSTMENT,
        qty: 1,
        reference: "INV-2024-Q3",
        notes: "Count verified during quarterly audit.",
      },
      {
        itemId: listedItem.id,
        movement: MovementType.PURCHASE_IN,
        qty: 1,
        reference: "PO-2024-002",
        notes: "Trade-in program intake.",
      },
      {
        itemId: listedItem.id,
        movement: MovementType.ADJUSTMENT,
        qty: 1,
        reference: "QA-2024-REV",
        notes: "Refurbished and quality assured before listing.",
      },
      {
        itemId: soldItem.id,
        movement: MovementType.PURCHASE_IN,
        qty: 1,
        reference: "PO-2024-003",
        notes: "Bulk handset shipment.",
      },
      {
        itemId: soldItem.id,
        movement: MovementType.SALE_OUT,
        qty: 1,
        reference: sale.reference ?? "SO-2024-001",
        notes: `Sold to ${sale.customerName}`,
      },
    ],
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Error seeding database", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

