using FollociaMvc.Data;
using FollociaMvc.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FollociaMvc.Controllers;

[ApiController]
[Route("api/commerce")]
public class CommerceApiController(FollociaDbContext db) : ControllerBase
{
    [HttpGet("bootstrap")]
    public async Task<ActionResult<BootstrapDto>> Bootstrap()
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

        if (customer is null) return NotFound();

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

    [HttpPut("products/{id}")]
    public async Task<IActionResult> SaveProduct(string id, ProductDto dto)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Title = dto.Title;
        product.Edition = dto.Edition;
        product.PriceAmount = ParseMoney(dto.Price);
        product.CurrencyCode = ParseCurrency(dto.Price);
        product.Tone = dto.Tone;
        product.Status = dto.Status;
        product.Produced = dto.Produced;
        product.Reserved = dto.Reserved;
        product.Available = dto.Available;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
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
                PaymentStatus = request.PaymentMethod == "Cash on Delivery" ? "Due on Delivery" : "Payment Pending",
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

    private static ProductDto ToProduct(CommerceProduct product) =>
        new(product.Id, product.Title, product.Edition, $"{product.CurrencyCode} {product.PriceAmount:N0}", product.Tone, product.ImagePath, product.Status, product.Produced, product.Reserved, product.Available);

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

    private static decimal ParseMoney(string value) => decimal.TryParse(new string(value.Where(character => char.IsDigit(character) || character == '.').ToArray()), out var amount) ? amount : 0;

    private static string ParseCurrency(string value)
    {
        var clean = value.Trim();
        if (clean.StartsWith("EUR", StringComparison.OrdinalIgnoreCase) || clean.StartsWith("€")) return "EUR";
        if (clean.StartsWith("INR", StringComparison.OrdinalIgnoreCase) || clean.StartsWith("₹")) return "INR";
        return "EUR";
    }
}
