namespace FollociaMvc.Models;

public record ProductDto(string Id, string Title, string Edition, string Price, string Tone, string Image, string Status, int Produced, int Reserved, int Available);

public record OrderDto(
    string Id,
    string CustomerId,
    string Customer,
    string Email,
    string Product,
    string Size,
    string Amount,
    string Status,
    string PaymentStatus,
    string DeliveryStatus,
    string DeliveryEta,
    string TrackingCode,
    string PaymentMethod,
    string DeliveryAddress,
    string Date);

public record AddressDto(string Id, string FirstName, string LastName, string Company, string Address, string Address2, string City, string Country, string Region, string Zip, string Phone, bool IsDefault);

public record CustomerDto(string Id, string Name, string Email, string FirstName, string LastName, string Phone, string Tier, string MemberSince, IReadOnlyList<AddressDto> Addresses, IReadOnlyList<string> Wishlist, IReadOnlyList<string> Subscriptions);

public record BootstrapDto(IReadOnlyList<ProductDto> Products, IReadOnlyList<OrderDto> Orders, IReadOnlyList<CustomerDto> Customers);

public record EnsureCustomerRequest(string Id, string Name, string Email, string Tier);

public record CreateOrderRequest(string CustomerId, string Customer, string Email, string ProductId, string Product, string Size, string Amount, int Quantity, string DeliveryAddress, string PaymentMethod);

public record AdminRecordDto(string Id, string Module, string Title, string Meta, string Status);
