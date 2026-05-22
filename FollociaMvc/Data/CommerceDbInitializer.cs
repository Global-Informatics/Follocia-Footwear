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

        if (!await db.Products.AnyAsync())
        {
            db.Products.AddRange(
                new CommerceProduct { Id = "atelier-01", Title = "Atelier 01 - Lumiere", Edition = "Edition of 220", PriceAmount = 1480, CurrencyCode = "EUR", Tone = "Ivory Calfskin", ImagePath = "/react/assets/collection-1.jpg", Status = "Live", Produced = 220, Reserved = 184, Available = 36 },
                new CommerceProduct { Id = "atelier-02", Title = "Atelier 02 - Noir Suspendu", Edition = "Edition of 180", PriceAmount = 1640, CurrencyCode = "EUR", Tone = "Patent Obsidian", ImagePath = "/react/assets/collection-2.jpg", Status = "Live", Produced = 180, Reserved = 168, Available = 12 },
                new CommerceProduct { Id = "atelier-03", Title = "Atelier 03 - Or Liquide", Edition = "Edition of 140", PriceAmount = 1820, CurrencyCode = "EUR", Tone = "Brushed Champagne", ImagePath = "/react/assets/collection-3.jpg", Status = "Private Preview", Produced = 140, Reserved = 121, Available = 19 },
                new CommerceProduct { Id = "atelier-04", Title = "Atelier 04 - Rosso Vow", Edition = "Edition of 80", PriceAmount = 2120, CurrencyCode = "EUR", Tone = "Rosso Patent", ImagePath = "/react/assets/atelier.jpg", Status = "Draft", Produced = 80, Reserved = 0, Available = 80 });
        }

        if (!await db.Customers.AnyAsync())
        {
            db.Customers.Add(new CommerceCustomer
            {
                Id = "vip-001",
                Name = "Ananya Sharma",
                Email = "client@follocia.com",
                FirstName = "Ananya",
                LastName = "Sharma",
                Tier = "Private Atelier",
                MemberSince = "MMXXIV",
                Wishlist =
                [
                    new CommerceWishlistItem { ProductId = "atelier-03" },
                    new CommerceWishlistItem { ProductId = "atelier-01" }
                ]
            });
        }

        if (!await db.Orders.AnyAsync())
        {
            db.Orders.AddRange(
                new CommerceOrder { Id = "RSV-1048", CustomerId = "vip-002", Customer = "Camille R.", Email = "camille@example.com", Product = "Atelier 03 - Or Liquide", Size = "38", Amount = 1820, Status = "Concierge Review", Date = "Today" },
                new CommerceOrder { Id = "RSV-1047", CustomerId = "vip-001", Customer = "Ananya Sharma", Email = "client@follocia.com", Product = "Atelier 02 - Noir Suspendu", Size = "39", Amount = 1640, Status = "Fitting Booked", Date = "Today" },
                new CommerceOrder { Id = "RSV-1031", CustomerId = "vip-001", Customer = "Ananya Sharma", Email = "client@follocia.com", Product = "Atelier 01 - Lumiere", Size = "38", Amount = 1480, Status = "Certificate Ready", Date = "Delivered" });
        }

        if (!await db.AdminRecords.AnyAsync())
        {
            db.AdminRecords.AddRange(
                Record("coupon-1", "coupons", "FOLLOCIA10", "10% off - Live editions", "Active"),
                Record("coupon-2", "coupons", "ATELIERCARE", "Free care kit - Delivered orders", "Active"),
                Record("review-1", "reviews", "5.0 / 5", "Fit was perfect, packaging felt premium", "Published"),
                Record("banner-1", "banners", "Hero drop banner", "Homepage first viewport", "Live"),
                Record("cms-1", "cms", "About atelier", "Brand story page", "Published"),
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
            Record("privacy-client-rights", "legal", "Your choices and rights", "You may request access, correction or deletion of personal information, unsubscribe from marketing communications, or contact the atelier for privacy questions at any time.", "Published"),
            Record("terms-orders-and-availability", "legal", "Orders and availability", "Products are limited edition and subject to availability. Placing an order or reservation confirms that the information supplied is accurate and that the selected size, address and payment method may be verified.", "Published"),
            Record("terms-pricing-and-payment", "legal", "Pricing and payment", "Prices, taxes, duties, shipping offers and payment methods may vary by region. Payment authorization, capture and cancellation are handled according to checkout status and concierge confirmation.", "Published"),
            Record("terms-shipping-returns", "legal", "Shipping, returns and exchanges", "Delivery timelines are estimates and may change for atelier finishing, address verification or courier conditions. Returns, exchanges and repairs are reviewed according to product condition, eligibility and local law.", "Published"),
            Record("terms-site-use", "legal", "Site use", "All content, imagery, marks, product names and design assets belong to Maison Follocia or its licensors. The site may not be copied, scraped, misused or used for fraudulent activity.", "Published"),
            Record("cookies-essential-cookies", "legal", "Essential cookies", "Essential cookies keep the site secure and functional. They support login, cart state, checkout, fraud prevention, load balancing and core storefront behavior.", "Published"),
            Record("cookies-analytics-preferences", "legal", "Analytics and preferences", "Analytics and preference cookies help us understand store performance, remember choices and refine product discovery, while avoiding unnecessary collection wherever possible.", "Published"),
            Record("cookies-marketing", "legal", "Marketing cookies", "Where enabled, marketing cookies may help measure campaigns, control frequency and show relevant private drop communications across approved channels.", "Published"),
            Record("cookies-control", "legal", "Managing cookies", "You can control cookies through browser settings. Blocking some cookies may affect account login, cart memory, checkout reliability or concierge forms.", "Published")
        };

        var existingIds = await db.AdminRecords
            .Where(record => record.Module == "legal")
            .Select(record => record.Id)
            .ToListAsync();

        db.AdminRecords.AddRange(legalRecords.Where(record => !existingIds.Contains(record.Id)));
    }
}
