import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const rootDir = process.cwd();
  // Gunakan nama file "finance.json" di root folder
  const financePath = path.resolve(rootDir, 'finance.json');

  if (!fs.existsSync(financePath)) {
    console.error('❌ File "finance.json" tidak ditemukan di root folder proyek!');
    console.log('Silakan buat file "finance.json" di root folder proyek Anda dan taruh data gabungan Anda di sana.');
    process.exit(1);
  }

  console.log(`📂 Membaca file gabungan dari: ${financePath}`);
  const rawData = fs.readFileSync(financePath, 'utf-8');
  let jsonData: any;
  try {
    jsonData = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Gagal men-parse file finance.json. Pastikan format JSON valid:', err);
    process.exit(1);
  }

  let expenses: any[] = [];
  let incomes: any[] = [];

  // Mendeteksi struktur format JSON
  if (Array.isArray(jsonData)) {
    // FORMAT A: Array gabungan langsung [ {...}, {...} ]
    console.log('📝 Mendeteksi format JSON: Array gabungan (List of Items)');
    for (const item of jsonData) {
      // Bedakan tipe data berdasarkan properti yang khas
      const isIncome = 
        item.sourceName !== undefined || 
        item.type === 'income' || 
        item.type === 'pemasukan' ||
        (item.id && String(item.id).startsWith('INC'));

      if (isIncome) {
        incomes.push(item);
      } else {
        expenses.push(item);
      }
    }
  } else if (typeof jsonData === 'object' && jsonData !== null) {
    // FORMAT B: Object bersarang { incomes: [], expenses: [] } atau bahasa indonesia
    console.log('📝 Mendeteksi format JSON: Object bersarang (Nested Object)');
    
    const incomesKey = Object.keys(jsonData).find(k => 
      ['incomes', 'income', 'pemasukan', 'masuk'].includes(k.toLowerCase())
    );
    const expensesKey = Object.keys(jsonData).find(k => 
      ['expenses', 'expense', 'pengeluaran', 'keluar'].includes(k.toLowerCase())
    );

    if (incomesKey && Array.isArray(jsonData[incomesKey])) {
      incomes = jsonData[incomesKey];
    }
    if (expensesKey && Array.isArray(jsonData[expensesKey])) {
      expenses = jsonData[expensesKey];
    }

    // Jika tidak ada key spesifik tapi field object bernilai array, cari saja
    if (!incomesKey && !expensesKey) {
      for (const key of Object.keys(jsonData)) {
        if (Array.isArray(jsonData[key])) {
          console.log(`🔍 Menemukan array pada key "${key}", memproses isinya...`);
          for (const item of jsonData[key]) {
            const isIncome = 
              item.sourceName !== undefined || 
              item.type === 'income' || 
              item.type === 'pemasukan' ||
              (item.id && String(item.id).startsWith('INC'));
            if (isIncome) {
              incomes.push(item);
            } else {
              expenses.push(item);
            }
          }
        }
      }
    }
  } else {
    console.error('❌ Format data JSON tidak dikenali (bukan array ataupun object).');
    process.exit(1);
  }

  console.log(`📊 Hasil parsing: ditemukan ${incomes.length} pemasukan dan ${expenses.length} pengeluaran.`);

  // Set untuk mengumpulkan branchId unik agar bisa di-upsert terlebih dahulu
  const uniqueBranchIds = new Set<string>();
  expenses.forEach((item: any) => {
    if (item.branchId) uniqueBranchIds.add(item.branchId);
  });
  incomes.forEach((item: any) => {
    if (item.branchId) uniqueBranchIds.add(item.branchId);
  });

  // 1. Pastikan semua BranchId yang direferensikan sudah terdaftar di database
  if (uniqueBranchIds.size > 0) {
    console.log(`🔍 Memeriksa & mensinkronkan ${uniqueBranchIds.size} cabang (branch)...`);
    for (const branchId of uniqueBranchIds) {
      try {
        await prisma.branch.upsert({
          where: { id: branchId },
          update: {},
          create: {
            id: branchId,
            name: branchId === 'default' ? 'Default' : `Cabang ${branchId.substring(0, 8)}`,
          },
        });
      } catch (error) {
        console.warn(`⚠️ Gagal memastikan cabang ${branchId} ada:`, error);
      }
    }
  }

  // 2. Import Pengeluaran (Expense)
  if (expenses.length > 0) {
    console.log(`📥 Mengimpor ${expenses.length} data pengeluaran (Expense)...`);
    let successCount = 0;
    for (const exp of expenses) {
      try {
        if (!exp.id || exp.amount === undefined || !exp.category || !exp.itemName) {
          console.warn(`⚠️ Data pengeluaran tidak lengkap (ID: ${exp.id || 'N/A'}), melewati...`);
          continue;
        }

        await prisma.expense.upsert({
          where: { id: exp.id },
          update: {
            timestamp: exp.timestamp || Date.now(),
            category: exp.category,
            itemName: exp.itemName,
            amount: Number(exp.amount),
            linkedIngredientId: exp.linkedIngredientId || null,
            quantity: exp.quantity !== undefined && exp.quantity !== null ? Number(exp.quantity) : null,
            branchId: exp.branchId || 'default',
          },
          create: {
            id: exp.id,
            timestamp: exp.timestamp || Date.now(),
            category: exp.category,
            itemName: exp.itemName,
            amount: Number(exp.amount),
            linkedIngredientId: exp.linkedIngredientId || null,
            quantity: exp.quantity !== undefined && exp.quantity !== null ? Number(exp.quantity) : null,
            branchId: exp.branchId || 'default',
          },
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Gagal mengimpor pengeluaran ${exp.id}:`, error);
      }
    }
    console.log(`✅ Berhasil mengimpor ${successCount}/${expenses.length} data pengeluaran.`);
  }

  // 3. Import Pemasukan (Income)
  if (incomes.length > 0) {
    console.log(`📥 Mengimpor ${incomes.length} data pemasukan (Income)...`);
    let successCount = 0;
    for (const inc of incomes) {
      try {
        if (!inc.id || inc.amount === undefined || !inc.category || !inc.sourceName) {
          console.warn(`⚠️ Data pemasukan tidak lengkap (ID: ${inc.id || 'N/A'}), melewati...`);
          continue;
        }

        await prisma.income.upsert({
          where: { id: inc.id },
          update: {
            timestamp: inc.timestamp || Date.now(),
            category: inc.category,
            sourceName: inc.sourceName,
            amount: Number(inc.amount),
            branchId: inc.branchId || 'default',
          },
          create: {
            id: inc.id,
            timestamp: inc.timestamp || Date.now(),
            category: inc.category,
            sourceName: inc.sourceName,
            amount: Number(inc.amount),
            branchId: inc.branchId || 'default',
          },
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Gagal mengimpor pemasukan ${inc.id}:`, error);
      }
    }
    console.log(`✅ Berhasil mengimpor ${successCount}/${incomes.length} data pemasukan.`);
  }

  console.log('🎉 Proses impor gabungan selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

