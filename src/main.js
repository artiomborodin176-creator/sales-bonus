/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount = 0, sale_price = 0, quantity = 0 } = purchase;

  if (
    typeof discount !== 'number' ||
    typeof sale_price !== 'number' ||
    typeof quantity !== 'number'
  ) {
    throw new Error(
      'Некорректные данные покупки: discount, sale_price и quantity должны быть числами'
    );
  }

  if (discount < 0 || discount > 100) {
    throw new Error(`Некорректное значение скидки: ${discount}%. Должно быть от 0 до 100.`);
  }

  if (sale_price < 0) {
    throw new Error(`Некорректная цена продажи: ${sale_price}. Должно быть неотрицательным.`);
  }

  if (quantity <= 0) {
    throw new Error(`Некорректное количество: ${quantity}. Должно быть положительным.`);
  }

  const discountFactor = 1 - (discount / 100);
  const totalPriceDiscount = sale_price * quantity;
  const revenue = totalPriceDiscount * discountFactor;

    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    if (index === 0) {
    return seller.profit * 0.15;
} else if (index === 1 || index === 2) {
    return seller.profit * 0.10;
} else if (index === total -1) {
    return 0;
} else { // Для всех остальных
    return seller.profit * 0.05;
}
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data
    || !Array.isArray(data.sellers)
    || data.sellers.length === 0
    || !Array.isArray(data.products)
    || data.products.length === 0
    || !Array.isArray(data.purchase_records)
    || data.purchase_records.length === 0
) {
    throw new Error('Некорректные входные данные');
}
    // @TODO: Проверка наличия опций
    // проверка, что options — объект
    if (!options || typeof options !== 'object') {
        throw new Error('Опции не переданы или имеют неверный тип');
    }
    // деструктуризация и проверка наличия функций
    const { calculateRevenue, calculateBonus } = options; 
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('В опциях отсутствуют необходимые функции');
    }

    // Шаг 3: опциональная проверка, что это функции
    if (typeof calculateRevenue !== 'function') {
        throw new Error('calculateRevenue должна быть функцией');
    }
    if (typeof calculateBonus !== 'function') {
        throw new Error('calculateBonus должна быть функцией');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
    products_sold: {}
    }));
    
    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller])); // Ключом будет id, значением — запись из sellerStats
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product])); // Ключом будет sku, значением — запись из data.products
    
    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        if(seller) {
            seller.sales_count += 1;// Увеличить количество продаж 
            seller.revenue += record.total_amount;// Увеличить общую сумму выручки всех продаж
        } 
        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const cost = product.purchase_price * item.quantity; // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const revenue = calculateRevenue(item, product);// Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const profitFromItem = revenue - cost;// Посчитать прибыль: выручка минус себестоимость
            seller.profit += profitFromItem;// Увеличить общую накопленную прибыль (profit) у продавца  

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;// По артикулу товара увеличить его проданное количество у продавца
        });
 }); 
    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);
    //return sellerStats;
    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        const total = sellerStats.length
        seller.bonus = calculateBonus(index, total, seller); // Считаем бонус
        seller.top_products = Object.entries(seller.products_sold)
                            .map(([sku, quantity]) => ({ sku, quantity }))
                            .sort((a, b) => b.quantity - a.quantity)
                            .slice(0, 10); // Формируем топ-10 товаров
    });
    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,// Строка, идентификатор продавца
        name: seller.name,// Строка, имя продавца
        revenue: +seller.revenue.toFixed(2),// Число с двумя знаками после точки, выручка продавца
        profit: +seller.profit.toFixed(2),// Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count,// Целое число, количество продаж продавца
        top_products: seller.top_products,// Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +seller.bonus.toFixed(2) // Число с двумя знаками после точки, бонус продавца
    })); 
}
