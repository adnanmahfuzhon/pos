import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Lokasi default file JSON di root folder proyek
  const singleFilePath = path.resolve(process.cwd(), 'transactions.json');
  
  // Alternatif jika filenya terpisah (Sale.json & SaleDetail.json) di root folder
  const salePath = path.resolve(process.cwd(), 'Sale.json');
  const saleDetailPath = path.resolve(process.cwd(), 'SaleDetail.json');

  if (fs.existsSync(singleFilePath)) {
    console.log(`📂 Menemukan transactions.json di root. Memulai import...`);
    const rawData = fs.readFileSync(singleFilePath, 'utf-8');
    const transactions = JSON.parse(rawData);

    for (const trx of transactions) {
      const { details, ...saleData } = trx;
      try {
        await prisma.sale.upsert({
          where: { id: saleData.id },
          update: {
            ...saleData,
            details: {
              deleteMany: {},
              create: details
            }
          },
          create: {
            ...saleData,
            details: {
              create: details
            }
          }
        });
        console.log(`✅ Berhasil mengimpor transaksi: ${trx.id}`);
      } catch (error) {
        console.error(`❌ Gagal mengimpor transaksi ${trx.id}:`, error);
      }
    }
  } else if (fs.existsSync(salePath) && fs.existsSync(saleDetailPath)) {
    console.log(`📂 Menemukan Sale.json dan SaleDetail.json di root. Memulai import...`);
    const sales = JSON.parse(fs.readFileSync(salePath, 'utf-8'));
    const saleDetails = JSON.parse(fs.readFileSync(saleDetailPath, 'utf-8'));

    // 1. Import Sales
    console.log(`📥 Mengimpor ${sales.length} data Sale...`);
    for (const sale of sales) {
      try {
        await prisma.sale.upsert({
          where: { id: sale.id },
          update: sale,
          create: sale,
        });
      } catch (error) {
        console.error(`❌ Gagal mengimpor Sale ${sale.id}:`, error);
      }
    }

    // 2. Import SaleDetails
    console.log(`📥 Mengimpor ${saleDetails.length} data SaleDetail...`);
    for (const detail of saleDetails) {
      try {
        await prisma.saleDetail.upsert({
          where: { id: detail.id },
          update: detail,
          create: detail,
        });
      } catch (error) {
        console.error(`❌ Gagal mengimpor SaleDetail ${detail.id}:`, error);
      }
    }
  } else {
    console.error('❌ Tidak ada file JSON transaksi yang ditemukan di root folder!');
    console.log('Silakan letakkan salah satu opsi berikut di root folder proyek:');
    console.log(' Opsi A: file "transactions.json" (format nested/gabungan)');
    console.log(' Opsi B: file "Sale.json" dan "SaleDetail.json" (format terpisah)');
    process.exit(1);
  }

  console.log('🎉 Proses impor selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
