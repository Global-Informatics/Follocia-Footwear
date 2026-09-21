namespace FollociaMvc.Models;

public record ProductDto(string Id, string Title, string Edition, string Price, string Tone, string Image, IReadOnlyList<string>? Images, string Status, int Produced, int Reserved, int Available);

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

public record SendOtpRequest(string Email, string? Purpose);

public record VerifyOtpRequest(string Email, string Otp);

public record OtpResponseDto(bool Success, string Message, bool SentViaSmtp, string? PreviewCode);

public record CreateRazorpayOrderRequest(decimal Amount, string? Currency, string? Receipt);

public record CreateRazorpayOrderResponse(bool Success, string? OrderId, string KeyId, int AmountInPaise, string Currency, string? Message);

public record VerifyRazorpayPaymentRequest(string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);

public record SaveRazorpayConfigRequest(string KeyId, string KeySecret);

public record RazorpayConfigDto(bool Success, bool IsConfigured, string KeyId, string Mode, string? MaskedSecret);

public record ContactNotificationRequest(string Name, string Email, string? Phone, string Subject, string Message);

public record OrderNotificationRequest(string OrderId, string Customer, string Email, string Product, string Size, string Amount, string? PaymentMethod, string? DeliveryAddress);

public record NotificationResultDto(bool Success, string Message, bool SentViaSmtp);

