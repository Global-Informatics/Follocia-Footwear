using FollociaMvc.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace FollociaMvc.Data;

public static class CommerceDbInitializer
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FollociaDbContext>();

        await db.Database.EnsureCreatedAsync();
        await UpgradeOrderSchemaAsync(db);
        await UpgradeAdminSchemaAsync(db);

        var oldProducts = await db.Products.Where(p => p.Id.StartsWith("Footwear-") || p.CurrencyCode == "EUR").ToListAsync();
        if (oldProducts.Count > 0)
        {
            db.Products.RemoveRange(oldProducts);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Concurrently deleted by another worker, ignore
            }
        }

        if (!await db.Customers.AnyAsync())
        {
            db.Customers.Add(new CommerceCustomer
            {
                Id = "vip-001",
                Name = "Ananya Sharma",
                Email = "client@follicia.com",
                FirstName = "Ananya",
                LastName = "Sharma",
                Tier = "Follicia Private",
                MemberSince = "MMXXIV",
                Wishlist =
                [
                    new CommerceWishlistItem { ProductId = "fl-aura-01" },
                    new CommerceWishlistItem { ProductId = "fl-bloom-01" }
                ]
            });
        }

        if (!await db.Orders.AnyAsync())
        {
            db.Orders.AddRange(
                new CommerceOrder { Id = "RSV-1048", CustomerId = "vip-002", Customer = "Camille R.", Email = "camille@example.com", Product = "Follicia Starlight Heel", Size = "38", Amount = 1820, Status = "Concierge Review", Date = "Today" },
                new CommerceOrder { Id = "RSV-1047", CustomerId = "vip-001", Customer = "Ananya Sharma", Email = "client@follicia.com", Product = "Follicia Bloom Pump", Size = "39", Amount = 1640, Status = "Fitting Booked", Date = "Today" },
                new CommerceOrder { Id = "RSV-1031", CustomerId = "vip-001", Customer = "Ananya Sharma", Email = "client@follicia.com", Product = "Follicia Aura Mule", Size = "38", Amount = 1480, Status = "Certificate Ready", Date = "Delivered" });
        }

        if (!await db.AdminRecords.AnyAsync())
        {
            db.AdminRecords.AddRange(
                Record("coupon-1", "coupons", "FOLLICIA10", "10% off - Live editions", "Active"),
                Record("coupon-2", "coupons", "FOLLICIACARE", "Free care kit - Delivered orders", "Active"),
                Record("review-1", "reviews", "5.0 / 5", "Fit was perfect, packaging felt premium", "Published"),
                Record("banner-1", "banners", "Hero drop banner", "Homepage first viewport", "Live"),
                Record("cms-1", "cms", "About Follicia", "Brand story page", "Published"),
                Record("newsletter-1", "newsletter", "1,284 subscribers", "Private drop audience", "Ready"),
                Record("contact-1", "contact", "Sizing query from Mumbai", "Customer asked for 38/39 fitting help", "Open"),
                Record("audit-1", "audit", "Product inventory updated", "Admin changed available stock", "Logged"));
        }

        await SeedLegalRecordsAsync(db);

        await db.SaveChangesAsync();
    }

    private static CommerceAdminRecord Record(string id, string module, string title, string meta, string status) =>
        new() { Id = id, Module = module, Title = title, Meta = meta, Status = status };

    private static async Task UpgradeOrderSchemaAsync(FollociaDbContext db)
    {
        var sql = """
        IF COL_LENGTH('Orders', 'PaymentStatus') IS NULL ALTER TABLE [Orders] ADD [PaymentStatus] nvarchar(40) NOT NULL CONSTRAINT DF_Orders_PaymentStatus DEFAULT 'Payment Pending';
        IF COL_LENGTH('Orders', 'DeliveryStatus') IS NULL ALTER TABLE [Orders] ADD [DeliveryStatus] nvarchar(40) NOT NULL CONSTRAINT DF_Orders_DeliveryStatus DEFAULT 'Order Placed';
        IF COL_LENGTH('Orders', 'DeliveryEta') IS NULL ALTER TABLE [Orders] ADD [DeliveryEta] nvarchar(80) NOT NULL CONSTRAINT DF_Orders_DeliveryEta DEFAULT 'Awaiting confirmation';
        IF COL_LENGTH('Orders', 'TrackingCode') IS NULL ALTER TABLE [Orders] ADD [TrackingCode] nvarchar(80) NOT NULL CONSTRAINT DF_Orders_TrackingCode DEFAULT '';
        IF COL_LENGTH('Orders', 'PaymentMethod') IS NULL ALTER TABLE [Orders] ADD [PaymentMethod] nvarchar(40) NOT NULL CONSTRAINT DF_Orders_PaymentMethod DEFAULT 'Concierge Pay';
        IF COL_LENGTH('Orders', 'DeliveryAddress') IS NULL ALTER TABLE [Orders] ADD [DeliveryAddress] nvarchar(500) NOT NULL CONSTRAINT DF_Orders_DeliveryAddress DEFAULT '';
        """;
        await db.Database.ExecuteSqlRawAsync(sql);
    }

    private static async Task UpgradeAdminSchemaAsync(FollociaDbContext db)
    {
        var sql = """
        IF OBJECT_ID('AdminRecords', 'U') IS NULL
        CREATE TABLE [AdminRecords] (
            [Id] nvarchar(80) NOT NULL CONSTRAINT [PK_AdminRecords] PRIMARY KEY,
            [Module] nvarchar(60) NOT NULL,
            [Title] nvarchar(180) NOT NULL,
            [Meta] nvarchar(max) NOT NULL,
            [Status] nvarchar(40) NOT NULL,
            [CreatedAtUtc] datetime2 NOT NULL
        );
        IF COL_LENGTH('AdminRecords', 'Meta') IS NOT NULL ALTER TABLE [AdminRecords] ALTER COLUMN [Meta] nvarchar(max) NOT NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AdminRecords_Module' AND object_id = OBJECT_ID('AdminRecords'))
        CREATE INDEX [IX_AdminRecords_Module] ON [AdminRecords] ([Module]);
        """;
        await db.Database.ExecuteSqlRawAsync(sql);
    }

    private static async Task SeedLegalRecordsAsync(FollociaDbContext db)
    {
        var legalRecords = new[]
        {
            Record("privacy-information-we-collect", "legal", "Information we collect", "We collect the details needed to run a premium ecommerce experience, including name, email, phone number, delivery address, order history, wishlist activity, concierge messages and account preferences.", "Published"),
            Record("privacy-how-we-use-data", "legal", "How we use your information", "Client information is used to process reservations, manage secure checkout, arrange delivery, provide sizing support, send order updates, improve the boutique experience and personalize private drop communications.", "Published"),
            Record("privacy-sharing-and-security", "legal", "Sharing and security", "We share data only with trusted service providers required for payment, delivery, fraud prevention, hosting and client support. We apply reasonable technical and organizational safeguards to protect client records.", "Published"),
            Record("privacy-client-rights", "legal", "Your choices and rights", "You may request access, correction or deletion of personal information, unsubscribe from marketing communications, or contact Follicia for privacy questions at any time.", "Published"),
            Record("terms-orders-and-availability", "legal", "Orders and availability", "Products are limited edition and subject to availability. Placing an order or reservation confirms that the information supplied is accurate and that the selected size, address and payment method may be verified.", "Published"),
            Record("terms-pricing-and-payment", "legal", "Pricing and payment", "Prices, taxes, duties, shipping offers and payment methods may vary by region. Payment authorization, capture and cancellation are handled according to checkout status and concierge confirmation.", "Published"),
            Record("terms-shipping-returns", "legal", "Shipping, returns and exchanges", "Delivery timelines are estimates and may change for handcrafted finishing, address verification or courier conditions. Returns, exchanges and repairs are reviewed according to product condition, eligibility and local law.", "Published"),
            Record("terms-site-use", "legal", "Site use", "All content, imagery, marks, product names and design assets belong to Follicia or its licensors. The site may not be copied, scraped, misused or used for fraudulent activity.", "Published"),
            Record("cookies-essential-cookies", "legal", "Essential cookies", "Essential cookies keep the site secure and functional. They support login, cart state, checkout, fraud prevention, load balancing and core storefront behavior.", "Published"),
            Record("cookies-analytics-preferences", "legal", "Analytics and preferences", "Analytics and preference cookies help us understand store performance, remember choices and refine product discovery, while avoiding unnecessary collection wherever possible.", "Published"),
            Record("cookies-marketing", "legal", "Marketing cookies", "Where enabled, marketing cookies may help measure campaigns, control frequency and show relevant private drop communications across approved channels.", "Published"),
            Record("cookies-control", "legal", "Managing cookies", "You can control cookies through browser settings. Blocking some cookies may affect account login, cart memory, checkout reliability or concierge forms.", "Published"),
            Record("shipping-1-delivery", "legal", "Shipping & Delivery", "We are committed to making your shopping experience smooth from the moment you place your order until it arrives at your doorstep. Every order is carefully inspected, securely packed, and dispatched through trusted delivery partners. We offer reliable shipping across India, with estimated delivery timelines shared during checkout or after order confirmation.\n\nFor selected products, special handling or white-glove delivery may be available to ensure your purchase reaches you safely and in perfect condition. Delivery timelines may vary depending on your location, product availability, and the nature of the item.", "Published"),
            Record("shipping-2-returns", "legal", "Returns & Exchanges", "We want you to be completely satisfied with your purchase. If an eligible item does not meet your expectations, you may request a return or exchange within the applicable return period. Items must be returned in their original condition, unused, and with all packaging, tags, and accessories intact.\n\nCertain customized, made-to-order, clearance, or final-sale products may not be eligible for return or exchange. Once your returned item has been received and inspected, our team will process the applicable exchange or refund according to our policy.", "Published"),
            Record("faq-01-order", "legal", "How can I place an order?", "Browse our collections, select your preferred product and size, and add it to your bag. Once you proceed to checkout, enter your delivery details and complete the payment securely.", "Published"),
            Record("faq-02-delivery", "legal", "How long does delivery take?", "Orders are carefully prepared and dispatched through our trusted delivery partners. Delivery timelines may vary depending on your location and product availability. Estimated delivery details will be shared once your order is confirmed.", "Published"),
            Record("faq-03-shipping", "legal", "Do you offer complimentary shipping?", "Yes. We offer complimentary shipping across India on orders above ₹2,999. Any applicable shipping charges for orders below this value will be displayed at checkout.", "Published"),
            Record("faq-04-tracking", "legal", "Can I track my order?", "Yes. Once your order has been dispatched, tracking details will be shared with you so you can follow your package until it reaches your doorstep.", "Published"),
            Record("faq-05-returns", "legal", "Can I return or exchange my purchase?", "Eligible products can be returned or exchanged within the applicable return period. Items should be unused, unworn, and returned with their original packaging and tags intact.", "Published"),
            Record("faq-06-damaged", "legal", "What if I receive a damaged or incorrect item?", "If your order arrives damaged or you receive an incorrect product, please contact our customer care team as soon as possible. We will review the issue and assist you with the appropriate resolution.", "Published"),
            Record("faq-07-cancellation", "legal", "Can I change or cancel my order?", "If you need to modify or cancel an order, please contact us at the earliest. Once an order has been processed or dispatched, changes or cancellations may no longer be possible.", "Published"),
            Record("faq-08-eligibility", "legal", "Are all products eligible for returns?", "Certain customized, made-to-order, personalized, clearance, or final-sale products may not be eligible for returns or exchanges. Product-specific conditions will be mentioned wherever applicable.", "Published"),
            Record("faq-09-refund", "legal", "How will I receive my refund?", "Once your returned product is received and successfully inspected, eligible refunds will be processed to the original payment method. Processing times may vary depending on your payment provider.", "Published"),
            Record("faq-10-assistance", "legal", "Need Personal Assistance?", "Our Concierge Assistance team is here to make your Follicia experience effortless. Whether you need help choosing a product, understanding sizing, tracking an order, or arranging a return or exchange, our team will be happy to assist you.", "Published")
        };

        var obsoleteShipping = await db.AdminRecords
            .Where(record => record.Module == "legal" && (record.Id == "shipping-1-fulfillment" || record.Id == "shipping-2-delivery" || record.Id == "shipping-3-returns"))
            .ToListAsync();
        if (obsoleteShipping.Count > 0)
        {
            db.AdminRecords.RemoveRange(obsoleteShipping);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException) { }
        }

        var obsoleteFaq = await db.AdminRecords
            .Where(record => record.Module == "legal" && record.Id.StartsWith("faq-") && !record.Id.StartsWith("faq-0") && !record.Id.StartsWith("faq-10"))
            .ToListAsync();
        if (obsoleteFaq.Count > 0)
        {
            db.AdminRecords.RemoveRange(obsoleteFaq);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException) { }
        }

        var existingIds = await db.AdminRecords
            .Where(record => record.Module == "legal")
            .Select(record => record.Id)
            .ToListAsync();

        db.AdminRecords.AddRange(legalRecords.Where(record => !existingIds.Contains(record.Id)));
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException) { }
    }
}
