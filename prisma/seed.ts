import { PrismaClient, ItemCondition, ItemStatus, MovementType, Channel } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper to swallow deleteMany on tables that may not exist in the current schema.
 * We use (prisma as any)[model] to avoid TS errors if the model isn't generated.
 */
async function safeDelete(model: string) {
  const anyPrisma: any = prisma as any;
  if (anyPrisma[model]?.deleteMany) {
    try {
      await anyPrisma[model].deleteMany();
    } catch (e) {
      // ignore
    }
  }
}

async function main() {
  // Reset in FK-safe order (children first)
  await safeDelete('inventoryMovement');
  await safeDelete('saleLine');
  await safeDelete('sale');
  await safeDelete('purchaseLine');
  await safeDelete('purchase');
  await safeDelete('item');
  await safeDelete('product');
  await safeDelete('category');
  await safeDelete('appSetting');

  // --- Categories (with simple tree) ---
  const categoriesData = [
    {
      name: 'Computers',
      slug: 'computers',
      children: [
        { name: 'Laptops', slug: 'laptops' },
        { name: 'Desktops', slug: 'desktops' },
        { name: 'Mini PCs', slug: 'mini-pcs' },
      ],
    },
    {
      name: 'Components',
      slug: 'components',
      children: [
        { name: 'CPUs', slug: 'cpus' },
        { name: 'GPUs', slug: 'gpus' },
        { name: 'Motherboards', slug: 'motherboards' },
        { name: 'RAM', slug: 'ram' },
        { name: 'Power Supplies', slug: 'psu' },
      ],
    },
    {
      name: 'Storage',
      slug: 'storage',
      children: [
        { name: 'SSDs', slug: 'ssds' },
        { name: 'HDDs', slug: 'hdds' },
        { name: 'External Drives', slug: 'external-drives' },
        { name: 'Memory Cards', slug: 'memory-cards' },
      ],
    },
    {
      name: 'Peripherals',
      slug: 'peripherals',
      children: [
        { name: 'Monitors', slug: 'monitors' },
        { name: 'Keyboards', slug: 'keyboards' },
        { name: 'Mice', slug: 'mice' },
        { name: 'Headsets', slug: 'headsets' },
      ],
    },
    {
      name: 'Networking',
      slug: 'networking',
      children: [
        { name: 'Routers', slug: 'routers' },
        { name: 'Switches', slug: 'switches' },
        { name: 'Cables', slug: 'cables' },
        { name: 'NAS', slug: 'nas' },
      ],
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      children: [
        { name: 'Coolers', slug: 'coolers' },
        { name: 'Cases', slug: 'cases' },
        { name: 'Docks', slug: 'docks' },
        { name: 'Adapters', slug: 'adapters' },
      ],
    },
  ];

  // Create categories with parent/child relations
  const categoryMap: Record<string, string> = {}; // slug -> id
  for (const root of categoriesData) {
    const createdRoot = await prisma.category.create({
      data: {
        name: root.name,
        slug: root.slug,
        path: root.slug, // assuming you have a unique path column
        sortOrder: 0,
      },
    });
    categoryMap[root.slug] = createdRoot.id;

    let i = 0;
    for (const child of root.children) {
      const createdChild = await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          path: `${root.slug}/${child.slug}`,
          parentId: createdRoot.id,
          sortOrder: ++i,
        },
      });
      categoryMap[child.slug] = createdChild.id;
    }
  }

  // --- Products (spread across categories) ---
  type P = { name: string; brand?: string | null; model?: string | null; categorySlug: string; part?: string | null; };
  const products: P[] = [
    { name: 'XPS 13 Plus', brand: 'Dell', model: '9320', categorySlug: 'laptops' },
    { name: 'ThinkPad X1 Carbon', brand: 'Lenovo', model: 'Gen 11', categorySlug: 'laptops' },
    { name: 'MacBook Pro 14', brand: 'Apple', model: 'M3', categorySlug: 'laptops' },
    { name: 'Ryzen 7 7800X3D', brand: 'AMD', model: '7800X3D', categorySlug: 'cpus' },
    { name: 'Core i7-14700K', brand: 'Intel', model: '14700K', categorySlug: 'cpus' },
    { name: 'GeForce RTX 4070 Ti SUPER', brand: 'NVIDIA', model: '4070TiS', categorySlug: 'gpus' },
    { name: 'Radeon RX 7800 XT', brand: 'AMD', model: '7800XT', categorySlug: 'gpus' },
    { name: 'ROG Strix Z790-E', brand: 'ASUS', model: 'Z790-E', categorySlug: 'motherboards' },
    { name: 'MAG B650 Tomahawk', brand: 'MSI', model: 'B650', categorySlug: 'motherboards' },
    { name: 'Vengeance 32GB (2x16) 6000', brand: 'Corsair', model: 'DDR5-6000', categorySlug: 'ram' },
    { name: 'Trident Z5 32GB (2x16) 6400', brand: 'G.Skill', model: 'DDR5-6400', categorySlug: 'ram' },
    { name: '970 EVO Plus 1TB', brand: 'Samsung', model: 'MZ-V7S1T0', categorySlug: 'ssds' },
    { name: '980 Pro 2TB', brand: 'Samsung', model: 'MZ-V8P2T0', categorySlug: 'ssds' },
    { name: 'WD Blue 2TB', brand: 'Western Digital', model: 'WD20EZAZ', categorySlug: 'hdds' },
    { name: 'Barracuda 4TB', brand: 'Seagate', model: 'ST4000DM004', categorySlug: 'hdds' },
    { name: 'Predator X27', brand: 'Acer', model: 'X27', categorySlug: 'monitors' },
    { name: 'Odyssey G7 32\"', brand: 'Samsung', model: 'LC32G75', categorySlug: 'monitors' },
    { name: 'MX Keys', brand: 'Logitech', model: '920-009415', categorySlug: 'keyboards' },
    { name: 'DeathAdder V3', brand: 'Razer', model: 'RZ01-0464', categorySlug: 'mice' },
    { name: 'Cloud II', brand: 'HyperX', model: 'KHX-HSCP', categorySlug: 'headsets' },
    { name: 'AX3000 Router', brand: 'TP-Link', model: 'Archer AX55', categorySlug: 'routers' },
    { name: 'UniFi 24-Port Switch', brand: 'Ubiquiti', model: 'USW-24', categorySlug: 'switches' },
    { name: 'Cat6 Patch 3m', brand: 'Farbin', model: 'UTP-3M', categorySlug: 'cables' },
    { name: 'Noctua NH-D15', brand: 'Noctua', model: 'NH-D15', categorySlug: 'coolers' },
    { name: 'Fractal Define 7', brand: 'Fractal', model: 'Define 7', categorySlug: 'cases' },
    { name: 'Anker USB-C Hub', brand: 'Anker', model: 'A83460A2', categorySlug: 'docks' },
    { name: 'USB-C to HDMI', brand: 'UGREEN', model: 'CM179', categorySlug: 'adapters' },
    { name: 'My Book 12TB', brand: 'Western Digital', model: 'WDBBGB0120HBK', categorySlug: 'external-drives' },
    { name: 'SanDisk Extreme 128GB', brand: 'SanDisk', model: 'SDSQXAA-128G', categorySlug: 'memory-cards' },
    { name: 'Synology DS923+', brand: 'Synology', model: 'DS923+', categorySlug: 'nas' },
  ];

  const createdProducts = [];
  for (const p of products) {
    const prod = await prisma.product.create({
      data: {
        name: p.name,
        brand: p.brand ?? null,
        model: p.model ?? null,
        categoryId: categoryMap[p.categorySlug],
      },
    });
    createdProducts.push(prod);
  }

  // --- Items (> 50) ---
  // Utility generators
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600 * 1000);

  const randomOf = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const serialFor = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(Math.random() * 90000 + 10000)}`;

  // Create ~65 items with mixed condition & status
  const itemsToCreate = 65;
  const allItems = [] as { id: string; serial: string; status: ItemStatus }[];

  for (let i = 0; i < itemsToCreate; i++) {
    const prod = randomOf(createdProducts);
    const condition = randomOf([ItemCondition.NEW, ItemCondition.USED, ItemCondition.FOR_PARTS]);
    const status = randomOf([ItemStatus.IN_STOCK, ItemStatus.LISTED, ItemStatus.SOLD, ItemStatus.RESERVED, ItemStatus.REPAIR]);
    const acquired = daysAgo(90 - Math.floor(Math.random() * 90));
    const purchaseToman = Math.floor(2_000_000 + Math.random() * 60_000_000);
    const feesToman = Math.floor(Math.random() * 1_000_000);
    const refurbToman = status === ItemStatus.REPAIR ? Math.floor(Math.random() * 2_000_000) : Math.floor(Math.random() * 500_000);
    const serial = serialFor((prod.brand ?? 'GEN').slice(0, 3).toUpperCase());

    const listed = status === ItemStatus.LISTED || status === ItemStatus.SOLD ? daysAgo(60 - Math.floor(Math.random() * 60)) : null;
    const listedPrice = listed ? Math.floor(purchaseToman * (1.1 + Math.random() * 0.6)) : null;
    const sold = status === ItemStatus.SOLD ? daysAgo(30 - Math.floor(Math.random() * 30)) : null;
    const soldPrice = sold ? Math.floor((listedPrice ?? purchaseToman) * (0.95 + Math.random() * 0.2)) : null;

    const item = await prisma.item.create({
      data: {
        productId: prod.id,
        serial,
        condition,
        status,
        acquiredAt: acquired,
        purchaseToman,
        feesToman,
        refurbToman,
        location: randomOf(['Main Store', 'Warehouse A', 'Warehouse B', 'Repair Bench', 'Showroom']),
        listedChannel: listed ? randomOf([Channel.DIRECT, Channel.ONLINE, Channel.WHOLESALE, Channel.OTHER]) : null,
        listedPriceToman: listedPrice,
        listedAt: listed,
        soldAt: sold,
        soldPriceToman: soldPrice,
        saleChannel: sold ? randomOf([Channel.DIRECT, Channel.ONLINE, Channel.WHOLESALE]) : null,
      },
    });

    allItems.push({ id: item.id, serial, status });
  }

  // --- Inventory Movements ---
  // For each item create a PURCHASE_IN; for some create REPAIR_CONSUME; for SOLD create SALE_OUT; a few ADJUSTMENTs.
  for (const it of allItems) {
    await prisma.inventoryMovement.create({
      data: {
        itemId: it.id,
        movement: MovementType.PURCHASE_IN,
        qty: 1,
        reference: 'PO-' + it.serial.slice(-5),
        notes: 'Seeded purchase',
      },
    });

    // 20% need repair consumption
    if (Math.random() < 0.2) {
      await prisma.inventoryMovement.create({
        data: {
          itemId: it.id,
          movement: MovementType.REPAIR_CONSUME,
          qty: 1,
          reference: 'RMA-' + it.serial.slice(0, 4),
          notes: 'Parts consumed during repair',
        },
      });
    }

    if (it.status === ItemStatus.SOLD) {
      await prisma.inventoryMovement.create({
        data: {
          itemId: it.id,
          movement: MovementType.SALE_OUT,
          qty: 1,
          reference: 'SO-' + it.serial.slice(0, 4),
          notes: 'Sold to customer',
        },
      });
    }

    // 10% random adjustment
    if (Math.random() < 0.1) {
      await prisma.inventoryMovement.create({
        data: {
          itemId: it.id,
          movement: MovementType.ADJUSTMENT,
          qty: 0,
          reference: 'ADJ-' + it.serial.slice(2, 6),
          notes: 'Stock count reconciliation',
        },
      });
    }
  }

  // --- Optional: create Sales/Purchases if your schema supports them ---
  // We wrap these in try/catch and cast to any so it doesn’t explode if your schema differs.
  const anyPrisma: any = prisma as any;

  // Create a couple of purchase documents grouping some items
  try {
    for (let p = 1; p <= 3; p++) {
      const pickedItems = allItems.slice(p * 10, p * 10 + 10);
      const purchase = await anyPrisma.purchase.create({
        data: {
          supplierName: ['Local Distributor', 'OEM Partner', 'Importer Co.'][p - 1] ?? 'Supplier',
          reference: `PO-2025-0${p}`,
          notes: 'Seeded purchase document',
        },
      });
      for (const it of pickedItems) {
        await anyPrisma.purchaseLine.create({
          data: {
            purchaseId: purchase.id,
            itemId: it.id,
            unitToman: Math.floor(5_000_000 + Math.random() * 30_000_000),
          },
        });
      }
    }
  } catch {/* ignore */}

  // Create a couple of sales grouping SOLD items
  try {
    const soldItems = allItems.filter(i => i.status === ItemStatus.SOLD);
    const chunks = [soldItems.slice(0, 6), soldItems.slice(6, 12)];
    let idx = 0;
    for (const chunk of chunks) {
      if (!chunk.length) continue;
      const sale = await anyPrisma.sale.create({
        data: {
          customerName: idx === 0 ? 'Retail Customer' : 'Wholesale Partner',
          reference: `SO-2025-0${idx + 1}`,
          notes: 'Seeded sale document',
          channel: idx === 0 ? Channel.ONLINE : Channel.WHOLESALE,
        },
      });
      for (const it of chunk) {
        await anyPrisma.saleLine.create({
          data: {
            saleId: sale.id,
            itemId: it.id,
            unitToman: Math.floor(6_000_000 + Math.random() * 35_000_000),
          },
        });
      }
      idx++;
    }
  } catch {/* ignore */}

  const defaultSettings = {
    general: {
      businessName: 'CoreX Inventory',
      defaultChannel: Channel.DIRECT,
      defaultItemCondition: ItemCondition.USED,
    },
    display: {
      locale: 'fa',
      rtlPreference: 'auto',
    },
    businessRules: {
      agingThresholds: [30, 90, 180],
      minimumMarginAlertPercent: 20,
      staleListingThresholds: {
        warning: 30,
        critical: 60,
      },
    },
  } as const;

  try {
    await anyPrisma.appSetting.upsert({
      where: { key: 'app.settings' },
      update: { value: defaultSettings },
      create: { key: 'app.settings', value: defaultSettings },
    });
  } catch {/* ignore */}

  console.log('✅ Seed completed with categories, products, items (>50), inventory movements, sample sales/purchases, and default settings (if supported).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
