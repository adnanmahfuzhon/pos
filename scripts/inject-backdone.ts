import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Force load .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  const backdonePath = path.resolve(process.cwd(), 'backdone.json');

  if (!fs.existsSync(backdonePath)) {
    console.error('❌ File "backdone.json" tidak ditemukan di root folder!');
    process.exit(1);
  }

  console.log(`📂 Membaca file backup dari: ${backdonePath}`);
  const rawData = fs.readFileSync(backdonePath, 'utf-8');
  let backupData: any;
  try {
    backupData = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Gagal membaca/men-parse backdone.json:', err);
    process.exit(1);
  }

  const {
    branches = [],
    ingredients = [],
    products = [],
    sales = [],
    expenses = [],
    incomes = []
  } = backupData;

  console.log(`📊 Ditemukan dalam backdone.json:`);
  console.log(`   - Cabang (Branches): ${branches.length}`);
  console.log(`   - Bahan (Ingredients): ${ingredients.length}`);
  console.log(`   - Produk (Products): ${products.length}`);
  console.log(`   - Penjualan (Sales): ${sales.length}`);
  console.log(`   - Pengeluaran (Expenses): ${expenses.length}`);
  console.log(`   - Pemasukan (Incomes): ${incomes.length}`);

  // 1. Branches
  if (branches.length > 0) {
    console.log(`\n📥 [1/6] Mengimpor ${branches.length} Cabang (Branch)...`);
    let count = 0;
    for (const b of branches) {
      const { id, _count, createdAt, updatedAt, ...data } = b;
      try {
        await prisma.branch.upsert({
          where: { id },
          update: data,
          create: { id, ...data }
        });
        count++;
      } catch (err: any) {
        console.error(`  ❌ Gagal cabang ${id} (${data.name}):`, err.message);
      }
    }
    console.log(`✅ Berhasil mengimpor ${count}/${branches.length} Cabang.`);
  }

  // 2. Ingredients
  if (ingredients.length > 0) {
    console.log(`\n📥 [2/6] Mengimpor ${ingredients.length} Bahan (Ingredient)...`);
    let count = 0;
    for (const ing of ingredients) {
      const { id, _count, createdAt, updatedAt, branch, ...data } = ing;
      try {
        await prisma.ingredient.upsert({
          where: { id },
          update: data,
          create: { id, ...data }
        });
        count++;
      } catch (err: any) {
        console.error(`  ❌ Gagal ingredient ${id} (${data.name}):`, err.message);
      }
    }
    console.log(`✅ Berhasil mengimpor ${count}/${ingredients.length} Bahan.`);
  }

  // 3. Products & ProductIngredients
  if (products.length > 0) {
    console.log(`\n📥 [3/6] Mengimpor ${products.length} Produk (Product)...`);
    let count = 0;
    for (const prod of products) {
      const { id, ingredients: prodIngredients, _count, createdAt, updatedAt, branch, ...data } = prod;
      try {
        await prisma.product.upsert({
          where: { id },
          update: data,
          create: { id, ...data }
        });

        if (Array.isArray(prodIngredients)) {
          await prisma.productIngredient.deleteMany({ where: { productId: id } });
          for (const pi of prodIngredients) {
            await prisma.productIngredient.create({
              data: {
                productId: id,
                ingredientId: pi.ingredientId,
                quantity: Number(pi.quantity)
              }
            });
          }
        }
        count++;
      } catch (err: any) {
        console.error(`  ❌ Gagal produk ${id} (${data.name}):`, err.message);
      }
    }
    console.log(`✅ Berhasil mengimpor ${count}/${products.length} Produk.`);
  }

  // 4. Sales & SaleDetails
  if (sales.length > 0) {
    console.log(`\n📥 [4/6] Mengimpor ${sales.length} Penjualan (Sale)...`);
    let count = 0;
    for (const sale of sales) {
      const { id, details, _count, createdAt, updatedAt, branch, ...data } = sale;
      try {
        await prisma.sale.upsert({
          where: { id },
          update: data,
          create: { id, ...data }
        });

        if (Array.isArray(details)) {
          await prisma.saleDetail.deleteMany({ where: { saleId: id } });
          for (const d of details) {
            await prisma.saleDetail.create({
              data: {
                saleId: id,
                productId: d.productId,
                quantity: Number(d.quantity),
                priceAtSale: Number(d.priceAtSale),
                hppAtSale: Number(d.hppAtSale || 0)
              }
            });
          }
        }
        count++;
      } catch (err: any) {
        console.error(`  ❌ Gagal transaksi sale ${id}:`, err.message);
      }
    }
    console.log(`✅ Berhasil mengimpor ${count}/${sales.length} Penjualan.`);
  }

  // 5. Expenses
  if (expenses.length > 0) {
    console.log(`\n📥 [5/6] Mengimpor ${expenses.length} Pengeluaran (Expense)...`);
    let count = 0;
    for (const exp of expenses) {
      const { id, _count, createdAt, updatedAt, branch, ...data } = exp;
      try {
        await prisma.expense.upsert({
          where: { id },
          update: data,
          create: { id, ...data }
        });
        count++;
      } catch (err: any) {
        console.error(`  ❌ Gagal pengeluaran ${id}:`, err.message);
      }
    }
    console.log(`✅ Berhasil mengimpor ${count}/${expenses.length} Pengeluaran.`);
  }

  // 6. Incomes
  if (incomes.length > 0) {
    console.log(`\n📥 [6/6] Mengimpor ${incomes.length} Pemasukan (Income)...`);
    let count = 0;
    for (const inc of incomes) {
      const { id, _count, createdAt, updatedAt, branch, ...data } = inc;
      try {
        await prisma.income.upsert({
          where: { id },
          update: data,
          create: { id, ...data }
        });
        count++;
      } catch (err: any) {
        console.error(`  ❌ Gagal pemasukan ${id}:`, err.message);
      }
    }
    console.log(`✅ Berhasil mengimpor ${count}/${incomes.length} Pemasukan.`);
  }

  console.log('\n🎉 PROSES RESTORE / INJEKSI DATA SELESAI!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
