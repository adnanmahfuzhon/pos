import fs from 'fs';
import path from 'path';

async function main() {
  const rootDir = process.cwd();
  const backdonePath = path.join(rootDir, 'backdone.json');
  const backupDir = path.join(rootDir, 'data_backup');

  if (!fs.existsSync(backdonePath)) {
    console.error('❌ File backdone.json tidak ditemukan!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(backdonePath, 'utf-8');
  const backupData = JSON.parse(rawData);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Ingredients
  if (backupData.ingredients) {
    fs.writeFileSync(
      path.join(backupDir, 'Ingredient.json'),
      JSON.stringify(backupData.ingredients, null, 2)
    );
    console.log(`✅ Ingredient.json diperbarui (${backupData.ingredients.length} items)`);
  }

  // 2. Products & ProductIngredient
  if (backupData.products) {
    const productsClean = [];
    const productIngredients = [];

    for (const prod of backupData.products) {
      const { ingredients, ...prodData } = prod;
      productsClean.push(prodData);
      if (Array.isArray(ingredients)) {
        for (const pi of ingredients) {
          productIngredients.push({
            id: pi.id || `pi-${prodData.id}-${pi.ingredientId}`,
            productId: prodData.id,
            ingredientId: pi.ingredientId,
            quantity: pi.quantity
          });
        }
      }
    }

    fs.writeFileSync(
      path.join(backupDir, 'Product.json'),
      JSON.stringify(productsClean, null, 2)
    );
    console.log(`✅ Product.json diperbarui (${productsClean.length} items)`);

    fs.writeFileSync(
      path.join(backupDir, 'ProductIngredient.json'),
      JSON.stringify(productIngredients, null, 2)
    );
    console.log(`✅ ProductIngredient.json diperbarui (${productIngredients.length} items)`);
  }

  // 3. Sales & SaleDetail
  if (backupData.sales) {
    const salesClean = [];
    const saleDetails = [];

    for (const sale of backupData.sales) {
      const { details, ...saleData } = sale;
      salesClean.push(saleData);
      if (Array.isArray(details)) {
        for (const d of details) {
          saleDetails.push({
            id: d.id || `sd-${saleData.id}-${d.productId}`,
            saleId: saleData.id,
            productId: d.productId,
            quantity: d.quantity,
            priceAtSale: d.priceAtSale,
            hppAtSale: d.hppAtSale || 0
          });
        }
      }
    }

    fs.writeFileSync(
      path.join(backupDir, 'Sale.json'),
      JSON.stringify(salesClean, null, 2)
    );
    console.log(`✅ Sale.json diperbarui (${salesClean.length} items)`);

    fs.writeFileSync(
      path.join(backupDir, 'SaleDetail.json'),
      JSON.stringify(saleDetails, null, 2)
    );
    console.log(`✅ SaleDetail.json diperbarui (${saleDetails.length} items)`);
  }

  // 4. Expenses
  if (backupData.expenses) {
    fs.writeFileSync(
      path.join(backupDir, 'Expense.json'),
      JSON.stringify(backupData.expenses, null, 2)
    );
    console.log(`✅ Expense.json diperbarui (${backupData.expenses.length} items)`);
  }

  // 5. finance.json
  const financeData = {
    incomes: backupData.incomes || [],
    expenses: backupData.expenses || []
  };
  fs.writeFileSync(
    path.join(rootDir, 'finance.json'),
    JSON.stringify(financeData, null, 2)
  );
  console.log(`✅ finance.json diperbarui di root folder`);

  console.log('\n🎉 Semua file backup lokal/JSON berhasil diperbarui dari backdone.json!');
}

main().catch(console.error);
