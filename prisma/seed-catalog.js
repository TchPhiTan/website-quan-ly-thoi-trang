const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const assetBase = (process.env.PUBLIC_ASSET_BASE_URL || 'http://localhost:8080/assets').replace(/\/$/, '');

const categoriesData = [
  { slug: 'ao-nu', title: 'Áo nữ', description: 'Bộ sưu tập áo nữ thanh lịch và tối giản' },
  { slug: 'ao-nam', title: 'Áo nam', description: 'Áo sơ mi, áo thun và blazer nam hiện đại' },
  { slug: 'dam', title: 'Đầm nữ', description: 'Đầm midi và các thiết kế đầm liền tinh tế cho phái nữ' },
  { slug: 'quan-nam', title: 'Quần nam', description: 'Quần jeans và quần âu nam phom dáng thoải mái' },
  { slug: 'quan-nu', title: 'Quần nữ', description: 'Quần âu ống suông tôn dáng cho phái nữ' },
];

const catalogProducts = [
  {
    slug: 'ao-so-mi-ella',
    title: 'Áo sơ mi cotton Ella',
    categorySlug: 'ao-nu',
    price: 489000,
    discount: 0,
    sizes: ['S', 'M', 'L'],
    description: 'Thiết kế dáng rộng thanh lịch từ chất cotton thoáng mát. Dễ dàng kết hợp cùng quần âu hoặc denim cho mọi ngày.',
    thumbnail: `${assetBase}/products/Ella-shirt-front.jpg`,
    images: [
      `${assetBase}/products/Ella-shirt-front.jpg`,
      `${assetBase}/products/Ella-shirt-side.png`,
      `${assetBase}/products/Ella-shirt-back.png`,
    ],
    colorSlugs: ['trang', 'den', 'be-kem'],
  },
  {
    slug: 'blazer-noah',
    title: 'Áo blazer dáng rộng Noah',
    categorySlug: 'ao-nam',
    price: 1290000,
    discount: 10,
    sizes: ['M', 'L', 'XL'],
    description: 'Phom dáng hiện đại với phần vai mềm và chất vải đứng dáng. Một lựa chọn linh hoạt từ công sở đến cuối tuần.',
    thumbnail: `${assetBase}/products/Noah-shirt-front.jpg`,
    images: [
      `${assetBase}/products/Noah-shirt-front.jpg`,
      `${assetBase}/products/Noah-shirt-side.jpg`,
      `${assetBase}/products/Noah-shirt-back.jpg`,
    ],
    colorSlugs: ['den', 'xanh-navy'],
  },
  {
    slug: 'dam-midi-lina',
    title: 'Đầm midi Lina',
    categorySlug: 'dam',
    price: 790000,
    discount: 0,
    sizes: ['S', 'M', 'L'],
    description: 'Đầm midi tối giản với đường cắt tinh tế, chất liệu nhẹ nhàng và phom dáng tôn vẻ tự nhiên.',
    thumbnail: `${assetBase}/products/Lina-dress-front.jpg`,
    images: [
      `${assetBase}/products/Lina-dress-front.jpg`,
      `${assetBase}/products/Lina-dress-side.jpg`,
      `${assetBase}/products/Lina-dress-back.jpg`,
    ],
    colorSlugs: ['be-kem', 'den'],
  },
  {
    slug: 'quan-jeans-ryan',
    title: 'Quần jeans ống rộng Ryan',
    categorySlug: 'quan-nam',
    price: 690000,
    discount: 0,
    sizes: ['28', '29', '30', '31', '32'],
    description: 'Chất denim bền đẹp, phom ống rộng thoải mái và dễ phối cùng mọi chiếc áo trong tủ đồ.',
    thumbnail: `${assetBase}/products/Ryan-jean-front.jpg`,
    images: [
      `${assetBase}/products/Ryan-jean-front.jpg`,
      `${assetBase}/products/Ryan-jean-side.jpg`,
      `${assetBase}/products/Ryan-jean-back.jpg`,
    ],
    colorSlugs: ['xanh-navy', 'den'],
  },
  {
    slug: 'ao-thun-ryan',
    title: 'Áo thun cotton Ryan',
    categorySlug: 'ao-nam',
    price: 350000,
    discount: 0,
    sizes: ['S', 'M', 'L', 'XL'],
    description: 'Chiếc áo thun cơ bản với chất cotton dày dặn, bề mặt mềm mịn và kiểu dáng thoải mái.',
    thumbnail: `${assetBase}/products/Ryan-shirt-front.jpg`,
    images: [
      `${assetBase}/products/Ryan-shirt-front.jpg`,
      `${assetBase}/products/Ryan-shirt-side.jpg`,
      `${assetBase}/products/Ryan-shirt-back.jpg`,
    ],
    colorSlugs: ['trang', 'den'],
  },
  {
    slug: 'quan-au-ella',
    title: 'Quần âu suông Ella',
    categorySlug: 'quan-nu',
    price: 650000,
    discount: 0,
    sizes: ['S', 'M', 'L'],
    description: 'Quần âu ống suông với cạp cao và chất vải rủ vừa phải, tạo cảm giác thoải mái suốt ngày dài.',
    thumbnail: `${assetBase}/products/Ella-trou-front.jpg`,
    images: [
      `${assetBase}/products/Ella-trou-front.jpg`,
      `${assetBase}/products/Ella-trou-side.png`,
      `${assetBase}/products/Ella-trou-back.png`,
    ],
    colorSlugs: ['den', 'be-kem'],
  },
  {
    slug: 'set-fina-dang-dai',
    title: 'Set Fina dáng dài',
    categorySlug: 'dam',
    price: 790000,
    discount: 5,
    sizes: ['S', 'M', 'L'],
    description: 'Thiết kế đầm dáng dài thanh lịch kèm áo gile tinh tế, phù hợp cho những dịp đặc biệt hoặc những ngày muốn mặc đẹp giản đơn.',
    thumbnail: `${assetBase}/products/Fina-dress-front.png`,
    images: [
      `${assetBase}/products/Fina-dress-front.png`,
      `${assetBase}/products/Fina-dress-side.png`,
      `${assetBase}/products/Fina-dress-back.png`,
    ],
    colorSlugs: ['be-kem', 'trang'],
  },
  {
    slug: 'quan-noah-dang-rong',
    title: 'Quần Noah dáng rộng',
    categorySlug: 'quan-nam',
    price: 890000,
    discount: 0,
    sizes: ['M', 'L', 'XL'],
    description: 'Quần Noah dáng rộng với phom suông thoải mái, sắc tối trung tính dễ phối cho phong cách hiện đại.',
    thumbnail: `${assetBase}/products/Noah-trou-front.jpg`,
    images: [
      `${assetBase}/products/Noah-trou-front.jpg`,
      `${assetBase}/products/Noah-trou-side.jpg`,
      `${assetBase}/products/Noah-trou-back.jpg`,
    ],
    colorSlugs: ['den', 'xanh-navy'],
  },
];

async function main() {
  console.log('🚀 Đang đồng bộ danh mục chuẩn...');
  const categoryMap = new Map();
  for (const cat of categoriesData) {
    let existing = await prisma.categories.findFirst({ where: { slug: cat.slug } });
    if (!existing) {
      existing = await prisma.categories.create({
        data: {
          id: uuidv4(),
          title: cat.title,
          slug: cat.slug,
          description: cat.description,
          status: 'active',
        },
      });
    } else {
      existing = await prisma.categories.update({
        where: { id: existing.id },
        data: { title: cat.title, description: cat.description, status: 'active', deleted: false },
      });
    }
    categoryMap.set(cat.slug, existing.id);
  }

  // Lấy các màu sắc
  const colors = await prisma.colors.findMany();
  const colorMap = new Map(colors.map(c => [c.slug, c]));

  // Lấy tất cả sản phẩm hiện tại
  const existingProducts = await prisma.products.findMany({
    include: { product_variants: true },
    orderBy: { created_at: 'asc' },
  });

  console.log(`📦 Tìm thấy ${existingProducts.length} sản phẩm hiện có trong database.`);

  for (let i = 0; i < catalogProducts.length; i++) {
    const item = catalogProducts[i];
    const categoryId = categoryMap.get(item.categorySlug);

    let product = existingProducts[i];
    if (product) {
      // Cập nhật sản phẩm cũ để giữ quan hệ kho/order nếu có
      product = await prisma.products.update({
        where: { id: product.id },
        data: {
          title: item.title,
          slug: item.slug,
          price: item.price,
          discount: item.discount,
          category_id: categoryId,
          size: JSON.stringify(item.sizes),
          thumbnail: item.thumbnail,
          description: item.description,
          status: 'active',
          deleted: false,
        },
      });
      console.log(`✅ Đã cập nhật sản phẩm [${i + 1}/${catalogProducts.length}]: ${item.title}`);
    } else {
      // Tạo mới nếu chưa có
      product = await prisma.products.create({
        data: {
          id: uuidv4(),
          title: item.title,
          slug: item.slug,
          price: item.price,
          discount: item.discount,
          category_id: categoryId,
          size: JSON.stringify(item.sizes),
          thumbnail: item.thumbnail,
          description: item.description,
          status: 'active',
          deleted: false,
        },
      });
      console.log(`✨ Đã tạo mới sản phẩm [${i + 1}/${catalogProducts.length}]: ${item.title}`);
    }

    // Xóa biến thể cũ không còn dùng và cập nhật biến thể mới
    const currentVariants = await prisma.product_variants.findMany({ where: { product_id: product.id } });
    
    // Tạo hoặc cập nhật biến thể cho từng màu và size
    const imageListJson = JSON.stringify(item.images);
    let variantIndex = 0;

    for (const colorSlug of item.colorSlugs) {
      const col = colorMap.get(colorSlug);
      if (!col) continue;

      for (const size of item.sizes) {
        const existingVar = currentVariants[variantIndex];
        if (existingVar) {
          await prisma.product_variants.update({
            where: { id: existingVar.id },
            data: {
              color_id: col.id,
              color: col.name,
              size,
              stock: 35 + Math.floor(Math.random() * 20),
              images: imageListJson,
            },
          });
        } else {
          try {
            await prisma.product_variants.create({
              data: {
                id: uuidv4(),
                product_id: product.id,
                color_id: col.id,
                color: col.name,
                size,
                stock: 35 + Math.floor(Math.random() * 20),
                images: imageListJson,
              },
            });
          } catch (e) {
            // bỏ qua duplicate nếu có
          }
        }
        variantIndex++;
      }
    }
  }

  // Dọn dẹp các danh mục rác không có sản phẩm nào
  const unusedCats = await prisma.categories.findMany({
    where: {
      slug: { notIn: categoriesData.map(c => c.slug) },
      products: { none: {} },
    },
  });
  if (unusedCats.length > 0) {
    for (const uc of unusedCats) {
      await prisma.categories.delete({ where: { id: uc.id } }).catch(() => {});
    }
    console.log(`🧹 Đã dọn dẹp ${unusedCats.length} danh mục tạm thời cũ.`);
  }

  console.log('🎉 Hoàn tất phân bổ và đồng bộ sản phẩm MỘC!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
