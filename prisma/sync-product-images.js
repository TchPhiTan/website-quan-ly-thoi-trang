const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const assetBase = (process.env.PUBLIC_ASSET_BASE_URL || 'http://localhost:8080/assets').replace(/\/$/, '');

const imageByTitle = (title) => {
    const normalized = title.toLowerCase();
    if (normalized.includes('fina')) return 'products/Fina-dress-front.png';
    if (normalized.includes('lina') || normalized.includes('đầm') || normalized.includes('váy')) return 'products/Lina-dress-front.jpg';
    if (normalized.includes('noah') && normalized.includes('quần')) return 'products/Noah-trou-front.jpg';
    if (normalized.includes('noah')) return 'products/Noah-shirt-front.jpg';
    if (normalized.includes('ryan') && (normalized.includes('jean') || normalized.includes('quần'))) return 'products/Ryan-jean-front.jpg';
    if (normalized.includes('ryan')) return 'products/Ryan-shirt-front.jpg';
    if (normalized.includes('ella') && normalized.includes('quần')) return 'products/Ella-trou-front.jpg';
    if (normalized.includes('ella')) return 'products/Ella-shirt-front.jpg';
    if (normalized.includes('oxford') || (normalized.includes('sơ mi') && normalized.includes('nam'))) return 'products/Noah-shirt-front.jpg';
    if (normalized.includes('sơ mi')) return 'products/Ella-shirt-front.jpg';
    if (normalized.includes('blazer') || normalized.includes('vest')) return 'products/Noah-shirt-front.jpg';
    if (normalized.includes('jean') || normalized.includes('quần')) return 'products/Noah-trou-front.jpg';
    return 'products/Noah-shirt-front.jpg';
};

async function main() {
    const products = await prisma.products.findMany({
        where: { deleted: false },
        select: { id: true, title: true, product_variants: { select: { id: true, images: true } } },
    });

    for (const product of products) {
        const imagePath = imageByTitle(product.title);
        const imageUrl = `${assetBase}/${imagePath}`;
        await prisma.products.update({ where: { id: product.id }, data: { thumbnail: imageUrl } });
        for (const variant of product.product_variants) {
            await prisma.product_variants.update({
                where: { id: variant.id },
                data: { images: JSON.stringify([imageUrl]) },
            });
        }
    }

    console.log(`Synchronized images for ${products.length} Neon products.`);
}

main().catch(error => {
    console.error('Image synchronization failed:', error.message);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());