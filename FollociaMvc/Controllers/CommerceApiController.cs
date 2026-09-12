using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using FollociaMvc.Data;
using FollociaMvc.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FollociaMvc.Controllers;

[ApiController]
[Route("api/commerce")]
public class CommerceApiController(FollociaDbContext db, IConfiguration config, ILogger<CommerceApiController> logger) : ControllerBase
{
    private static readonly ConcurrentDictionary<string, (string Code, DateTime ExpiresAtUtc, int Attempts)> OtpStore = new();

    [HttpPost("auth/send-otp")]
    public async Task<ActionResult<OtpResponseDto>> SendOtp([FromBody] SendOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new OtpResponseDto(false, "Please provide a valid email address.", false, null));
        }

        var cleanEmail = request.Email.Trim().ToLowerInvariant();
        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var expiresAt = DateTime.UtcNow.AddMinutes(10);

        OtpStore[cleanEmail] = (code, expiresAt, 0);

        var sentViaSmtp = await TrySendSmtpEmailAsync(cleanEmail, code);

        return Ok(new OtpResponseDto(
            true,
            sentViaSmtp ? $"Verification code sent to {cleanEmail}." : $"Verification code generated for {cleanEmail}.",
            sentViaSmtp,
            sentViaSmtp ? null : code));
    }

    [HttpPost("auth/verify-otp")]
    public ActionResult<OtpResponseDto> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
        {
            return BadRequest(new OtpResponseDto(false, "Email and OTP are required.", false, null));
        }

        var cleanEmail = request.Email.Trim().ToLowerInvariant();
        var cleanOtp = request.Otp.Trim();

        if (!OtpStore.TryGetValue(cleanEmail, out var entry))
        {
            return BadRequest(new OtpResponseDto(false, "No active OTP request found for this email. Please request a new code.", false, null));
        }

        if (DateTime.UtcNow > entry.ExpiresAtUtc)
        {
            OtpStore.TryRemove(cleanEmail, out _);
            return BadRequest(new OtpResponseDto(false, "OTP has expired. Please request a new code.", false, null));
        }

        if (entry.Attempts >= 5)
        {
            OtpStore.TryRemove(cleanEmail, out _);
            return BadRequest(new OtpResponseDto(false, "Too many failed attempts. Please request a new OTP.", false, null));
        }

        if (entry.Code != cleanOtp)
        {
            OtpStore[cleanEmail] = (entry.Code, entry.ExpiresAtUtc, entry.Attempts + 1);
            return BadRequest(new OtpResponseDto(false, "Invalid OTP code. The code entered does not match the code sent to your email.", false, null));
        }

        // Successfully verified, remove used OTP
        OtpStore.TryRemove(cleanEmail, out _);
        return Ok(new OtpResponseDto(true, "OTP verified successfully.", false, null));
    }

    private async Task<bool> TrySendSmtpEmailAsync(string toEmail, string code)
    {
        try
        {
            var smtpSection = config.GetSection("Smtp");
            var host = smtpSection["Host"];
            if (string.IsNullOrWhiteSpace(host)) return false;

            var port = int.TryParse(smtpSection["Port"], out var p) ? p : 587;
            var enableSsl = bool.TryParse(smtpSection["EnableSsl"], out var ssl) && ssl;
            var userName = smtpSection["UserName"];
            var password = smtpSection["Password"];
            var senderEmail = smtpSection["SenderEmail"] ?? "concierge@follocia.com";
            var senderName = smtpSection["SenderName"] ?? "Maison Follocia";

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
            };

            if (!string.IsNullOrWhiteSpace(userName) && !string.IsNullOrWhiteSpace(password))
            {
                client.Credentials = new NetworkCredential(userName, password);
            }

            using var message = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = $"{code} is your Maison Follocia Verification Code",
                IsBodyHtml = true,
                Body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e6ded7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"">
    <div style=""background: #351c13; padding: 26px 20px; text-align: center; border-bottom: 3px solid #d9b36e;"">
        <h1 style=""color: #d9b36e; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0;"">FOLLICIA</h1>
        <p style=""color: #e5cfb2; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 6px 0 0;"">Every Step, A Statement.</p>
    </div>
    <div style=""padding: 30px 24px; color: #351c13;"">
        <h2 style=""font-size: 18px; font-weight: 600; margin: 0 0 10px;"">Client Authentication Code</h2>
        <p style=""font-size: 13px; line-height: 1.6; color: #555; margin: 0 0 20px;"">
            You requested a one-time verification code to securely access your Maison Follocia account. Please enter the code below to proceed:
        </p>
        <div style=""background: #fcf9f6; border: 1.5px dashed #d9b36e; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 22px;"">
            <span style=""font-size: 34px; font-family: monospace; font-weight: 700; letter-spacing: 8px; color: #a87648; display: inline-block;"">{code}</span>
        </div>
        <p style=""font-size: 12px; color: #888; line-height: 1.5; margin: 0;"">
            • Code is valid for <strong>10 minutes</strong>.<br />
            • If you did not request this code, please ignore this email.
        </p>
    </div>
    <div style=""background: #f9f9f9; padding: 14px 20px; text-align: center; border-top: 1px solid #eee; font-size: 11px; color: #999;"">
        © 2026 Maison Follocia Ltd. All rights reserved. Sculpted in Florence.
    </div>
</div>"
            };
            message.To.Add(toEmail);

            await client.SendMailAsync(message);
            logger.LogInformation("Verification OTP sent via SMTP to {Email}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send OTP via SMTP to {Email}", toEmail);
            return false;
        }
    }

    [HttpGet("bootstrap")]
    public async Task<ActionResult<BootstrapDto>> Bootstrap()
    {
        if (!AppDatabaseStatus.IsAvailable)
        {
            return DemoBootstrap();
        }

        try
        {
            var products = await db.Products.AsNoTracking().OrderBy(product => product.Id).ToListAsync();
            var orders = await db.Orders.AsNoTracking().OrderByDescending(order => order.CreatedAtUtc).ToListAsync();
            var customers = await db.Customers.AsNoTracking()
                .Include(customer => customer.Addresses)
                .Include(customer => customer.Wishlist)
                .Include(customer => customer.Subscriptions)
                .OrderBy(customer => customer.Name)
                .ToListAsync();

            return new BootstrapDto(
                products.Select(ToProduct).ToList(),
                orders.Select(ToOrder).ToList(),
                customers.Select(ToCustomer).ToList());
        }
        catch
        {
            return DemoBootstrap();
        }
    }

    [HttpPost("customers/ensure")]
    public async Task<ActionResult<CustomerDto>> EnsureCustomer(EnsureCustomerRequest request)
    {
        var customer = await db.Customers
            .Include(item => item.Addresses)
            .Include(item => item.Wishlist)
            .Include(item => item.Subscriptions)
            .FirstOrDefaultAsync(item => item.Id == request.Id || item.Email == request.Email);

        if (customer is null)
        {
            var nameParts = request.Name.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            customer = new CommerceCustomer
            {
                Id = request.Id,
                Name = request.Name,
                Email = request.Email,
                FirstName = nameParts.ElementAtOrDefault(0) ?? request.Name,
                LastName = nameParts.ElementAtOrDefault(1) ?? "",
                Tier = request.Tier,
                MemberSince = "MMXXVI"
            };
            db.Customers.Add(customer);
            await db.SaveChangesAsync();
        }

        return ToCustomer(customer);
    }

    [HttpPut("customers/{id}")]
    public async Task<IActionResult> SaveCustomer(string id, CustomerDto dto)
    {
        var customer = await db.Customers
            .Include(item => item.Addresses)
            .Include(item => item.Wishlist)
            .Include(item => item.Subscriptions)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (customer is null)
        {
            customer = new CommerceCustomer { Id = id };
            db.Customers.Add(customer);
        }

        customer.Name = dto.Name;
        customer.Email = dto.Email;
        customer.FirstName = dto.FirstName;
        customer.LastName = dto.LastName;
        customer.Phone = dto.Phone;
        customer.Tier = dto.Tier;
        customer.MemberSince = dto.MemberSince;

        db.Addresses.RemoveRange(customer.Addresses);
        customer.Addresses = dto.Addresses.Select(address => new CommerceAddress
        {
            Id = address.Id,
            CustomerId = customer.Id,
            FirstName = address.FirstName,
            LastName = address.LastName,
            Company = address.Company,
            Address = address.Address,
            Address2 = address.Address2,
            City = address.City,
            Country = address.Country,
            Region = address.Region,
            Zip = address.Zip,
            Phone = address.Phone,
            IsDefault = address.IsDefault
        }).ToList();

        db.WishlistItems.RemoveRange(customer.Wishlist);
        customer.Wishlist = dto.Wishlist.Select(productId => new CommerceWishlistItem { CustomerId = customer.Id, ProductId = productId }).ToList();

        db.Subscriptions.RemoveRange(customer.Subscriptions);
        customer.Subscriptions = dto.Subscriptions.Select(title => new CommerceSubscription { CustomerId = customer.Id, Title = title }).ToList();

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("customers/{id}")]
    public async Task<IActionResult> DeleteCustomer(string id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return NotFound();

        db.Customers.Remove(customer);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> SaveProduct(string id, ProductDto dto)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            product = new CommerceProduct { Id = id };
            db.Products.Add(product);
        }

        product.Title = dto.Title;
        product.Edition = dto.Edition;
        product.PriceAmount = ParseMoney(dto.Price);
        product.CurrencyCode = ParseCurrency(dto.Price);
        product.Tone = dto.Tone;
        product.ImagePath = SerializeImages(dto.Images, dto.Image);
        product.Status = dto.Status;
        product.Produced = dto.Produced;
        product.Reserved = dto.Reserved;
        product.Available = dto.Available;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("product-images")]
    [RequestSizeLimit(25_000_000)]
    public async Task<ActionResult<object>> UploadProductImages([FromForm] List<IFormFile> files)
    {
        if (files.Count == 0) return BadRequest();

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "products");
        Directory.CreateDirectory(uploadsRoot);

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var urls = new List<string>();
        foreach (var file in files.Take(5))
        {
            if (file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) continue;

            var extension = Path.GetExtension(file.FileName);
            if (!allowed.Contains(extension)) continue;

            var fileName = Guid.NewGuid().ToString("N")[..12] + extension.ToLowerInvariant();
            var path = Path.Combine(uploadsRoot, fileName);
            await using var stream = System.IO.File.Create(path);
            await file.CopyToAsync(stream);
            urls.Add($"/uploads/products/{fileName}");
        }

        return new { images = urls };
    }

    [HttpPut("orders/{id}")]
    public async Task<IActionResult> SaveOrder(string id, OrderDto dto)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();

        order.Status = dto.Status;
        order.PaymentStatus = dto.PaymentStatus;
        order.DeliveryStatus = dto.DeliveryStatus;
        order.DeliveryEta = dto.DeliveryEta;
        order.TrackingCode = dto.TrackingCode;
        order.PaymentMethod = dto.PaymentMethod;
        order.DeliveryAddress = dto.DeliveryAddress;
        order.Date = dto.Date;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("orders")]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> CreateOrders(IReadOnlyList<CreateOrderRequest> requests)
    {
        var created = new List<CommerceOrder>();
        foreach (var request in requests)
        {
            var order = new CommerceOrder
            {
                Id = $"RSV-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 1000000}-{created.Count + 1}",
                CustomerId = request.CustomerId,
                Customer = request.Customer,
                Email = request.Email,
                Product = request.Product,
                Size = request.Size,
                Amount = ParseMoney(request.Amount) * Math.Max(request.Quantity, 1),
                CurrencyCode = ParseCurrency(request.Amount),
                Status = "Concierge Review",
                PaymentStatus = request.PaymentMethod.Contains("Cash on Delivery") ? "Due on Delivery" : "Payment Captured",
                DeliveryStatus = "Order Placed",
                DeliveryEta = "Concierge will confirm within 24h",
                TrackingCode = "",
                PaymentMethod = request.PaymentMethod,
                DeliveryAddress = request.DeliveryAddress,
                Date = "Today"
            };
            created.Add(order);
            db.Orders.Add(order);

            var product = await db.Products.FindAsync(request.ProductId);
            if (product is not null)
            {
                product.Reserved += Math.Max(request.Quantity, 1);
                product.Available = Math.Max(product.Available - Math.Max(request.Quantity, 1), 0);
                product.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        return created.Select(ToOrder).ToList();
    }

    [HttpGet("admin-records")]
    public async Task<ActionResult<IReadOnlyList<AdminRecordDto>>> AdminRecords()
    {
        var records = await db.AdminRecords.AsNoTracking()
            .OrderBy(record => record.Module)
            .ThenByDescending(record => record.CreatedAtUtc)
            .ToListAsync();
        return records.Select(ToAdminRecord).ToList();
    }

    [HttpPut("admin-records/{module}")]
    public async Task<IActionResult> SaveAdminRecords(string module, IReadOnlyList<AdminRecordDto> records)
    {
        var existing = await db.AdminRecords.Where(record => record.Module == module).ToListAsync();
        db.AdminRecords.RemoveRange(existing);
        db.AdminRecords.AddRange(records.Select(record => new CommerceAdminRecord
        {
            Id = string.IsNullOrWhiteSpace(record.Id) ? $"{module}-{Guid.NewGuid():N}" : record.Id,
            Module = module,
            Title = record.Title,
            Meta = record.Meta,
            Status = record.Status,
            CreatedAtUtc = DateTime.UtcNow
        }));
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ProductDto ToProduct(CommerceProduct product)
    {
        var images = DeserializeImages(product.ImagePath);
        return new(product.Id, product.Title, product.Edition, $"{product.CurrencyCode} {product.PriceAmount:N0}", product.Tone, images.FirstOrDefault() ?? product.ImagePath, images, product.Status, product.Produced, product.Reserved, product.Available);
    }

    private static OrderDto ToOrder(CommerceOrder order) =>
        new(
            order.Id,
            order.CustomerId,
            order.Customer,
            order.Email,
            order.Product,
            order.Size,
            $"{order.CurrencyCode} {order.Amount:N0}",
            order.Status,
            order.PaymentStatus,
            order.DeliveryStatus,
            order.DeliveryEta,
            order.TrackingCode,
            order.PaymentMethod,
            order.DeliveryAddress,
            order.Date);

    private static CustomerDto ToCustomer(CommerceCustomer customer) =>
        new(
            customer.Id,
            customer.Name,
            customer.Email,
            customer.FirstName,
            customer.LastName,
            customer.Phone,
            customer.Tier,
            customer.MemberSince,
            customer.Addresses.Select(address => new AddressDto(address.Id, address.FirstName, address.LastName, address.Company, address.Address, address.Address2, address.City, address.Country, address.Region, address.Zip, address.Phone, address.IsDefault)).ToList(),
            customer.Wishlist.Select(item => item.ProductId).ToList(),
            customer.Subscriptions.Select(item => item.Title).ToList());

    private static AdminRecordDto ToAdminRecord(CommerceAdminRecord record) =>
        new(record.Id, record.Module, record.Title, record.Meta, record.Status);

    private static BootstrapDto DemoBootstrap() =>
        new(
            [
                new ProductDto("atelier-01", "Atelier 01 - Lumiere", "Edition of 220", "EUR 1,480", "Ivory Calfskin", "/react/assets/collection-1.jpg", ["/react/assets/collection-1.jpg"], "Live", 220, 184, 36),
                new ProductDto("atelier-02", "Atelier 02 - Noir Suspendu", "Edition of 180", "EUR 1,640", "Patent Obsidian", "/react/assets/collection-2.jpg", ["/react/assets/collection-2.jpg"], "Live", 180, 168, 12),
                new ProductDto("atelier-03", "Atelier 03 - Or Liquide", "Edition of 140", "EUR 1,820", "Brushed Champagne", "/react/assets/collection-3.jpg", ["/react/assets/collection-3.jpg"], "Private Preview", 140, 121, 19),
                new ProductDto("atelier-04", "Atelier 04 - Rosso Vow", "Edition of 80", "EUR 2,120", "Rosso Patent", "/react/assets/atelier.jpg", ["/react/assets/atelier.jpg"], "Draft", 80, 0, 80)
            ],
            [
                new OrderDto("RSV-1048", "vip-002", "Camille R.", "camille@example.com", "Atelier 03 - Or Liquide", "38", "EUR 1,820", "Concierge Review", "Payment Pending", "Order Placed", "Concierge will confirm within 24h", "", "Concierge Pay", "", "Today"),
                new OrderDto("RSV-1047", "vip-001", "Ananya Sharma", "client@follocia.com", "Atelier 02 - Noir Suspendu", "39", "EUR 1,640", "Fitting Booked", "Payment Pending", "Order Placed", "Concierge will confirm within 24h", "", "Concierge Pay", "", "Today"),
                new OrderDto("RSV-1031", "vip-001", "Ananya Sharma", "client@follocia.com", "Atelier 01 - Lumiere", "38", "EUR 1,480", "Certificate Ready", "Payment Captured", "Delivered", "Delivered", "", "Concierge Pay", "", "Delivered")
            ],
            [
                new CustomerDto("vip-001", "Ananya Sharma", "client@follocia.com", "Ananya", "Sharma", "", "Private Atelier", "MMXXIV", [], ["atelier-03", "atelier-01"], [])
            ]);

    private static decimal ParseMoney(string value) => decimal.TryParse(new string(value.Where(character => char.IsDigit(character) || character == '.').ToArray()), out var amount) ? amount : 0;

    private static string ParseCurrency(string value)
    {
        var clean = value.Trim();
        if (clean.StartsWith("EUR", StringComparison.OrdinalIgnoreCase) || clean.StartsWith("€")) return "EUR";
        if (clean.StartsWith("INR", StringComparison.OrdinalIgnoreCase) || clean.StartsWith("₹")) return "INR";
        return "EUR";
    }
    private static List<string> DeserializeImages(string value) =>
        value.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Take(5).ToList();

    private static string SerializeImages(IReadOnlyList<string>? images, string fallback)
    {
        var gallery = (images is { Count: > 0 } ? images : new[] { fallback })
            .Where(image => !string.IsNullOrWhiteSpace(image))
            .Distinct()
            .Take(5);
        return string.Join('|', gallery);
    }
}
