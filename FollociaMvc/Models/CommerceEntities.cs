using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FollociaMvc.Models;

public class CommerceProduct
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = "";

    [MaxLength(180)]
    public string Title { get; set; } = "";

    [MaxLength(80)]
    public string Edition { get; set; } = "";

    [Column(TypeName = "decimal(10,2)")]
    public decimal PriceAmount { get; set; }

    [MaxLength(3)]
    public string CurrencyCode { get; set; } = "EUR";

    [MaxLength(100)]
    public string Tone { get; set; } = "";

    [MaxLength(260)]
    public string ImagePath { get; set; } = "";

    [MaxLength(40)]
    public string Status { get; set; } = "Live";

    public int Produced { get; set; }

    public int Reserved { get; set; }

    public int Available { get; set; }

    [MaxLength(1200)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }
}

public class CommerceCustomer
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = "";

    [MaxLength(160)]
    public string Name { get; set; } = "";

    [MaxLength(256)]
    public string Email { get; set; } = "";

    [MaxLength(80)]
    public string FirstName { get; set; } = "";

    [MaxLength(80)]
    public string LastName { get; set; } = "";

    [MaxLength(40)]
    public string Phone { get; set; } = "";

    [MaxLength(80)]
    public string Tier { get; set; } = "Private Atelier";

    [MaxLength(20)]
    public string MemberSince { get; set; } = "MMXXVI";

    public List<CommerceAddress> Addresses { get; set; } = [];

    public List<CommerceWishlistItem> Wishlist { get; set; } = [];

    public List<CommerceSubscription> Subscriptions { get; set; } = [];
}

public class CommerceAddress
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = "";

    [MaxLength(64)]
    public string CustomerId { get; set; } = "";

    public CommerceCustomer? Customer { get; set; }

    [MaxLength(80)]
    public string FirstName { get; set; } = "";

    [MaxLength(80)]
    public string LastName { get; set; } = "";

    [MaxLength(160)]
    public string Company { get; set; } = "";

    [MaxLength(260)]
    public string Address { get; set; } = "";

    [MaxLength(260)]
    public string Address2 { get; set; } = "";

    [MaxLength(120)]
    public string City { get; set; } = "";

    [MaxLength(100)]
    public string Country { get; set; } = "India";

    [MaxLength(100)]
    public string Region { get; set; } = "";

    [MaxLength(20)]
    public string Zip { get; set; } = "";

    [MaxLength(40)]
    public string Phone { get; set; } = "";

    public bool IsDefault { get; set; }
}

public class CommerceWishlistItem
{
    [Key]
    public int Id { get; set; }

    [MaxLength(64)]
    public string CustomerId { get; set; } = "";

    public CommerceCustomer? Customer { get; set; }

    [MaxLength(64)]
    public string ProductId { get; set; } = "";
}

public class CommerceSubscription
{
    [Key]
    public int Id { get; set; }

    [MaxLength(64)]
    public string CustomerId { get; set; } = "";

    public CommerceCustomer? Customer { get; set; }

    [MaxLength(160)]
    public string Title { get; set; } = "";
}

public class CommerceOrder
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = "";

    [MaxLength(64)]
    public string CustomerId { get; set; } = "";

    [MaxLength(160)]
    public string Customer { get; set; } = "";

    [MaxLength(256)]
    public string Email { get; set; } = "";

    [MaxLength(180)]
    public string Product { get; set; } = "";

    [MaxLength(12)]
    public string Size { get; set; } = "";

    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string CurrencyCode { get; set; } = "EUR";

    [MaxLength(40)]
    public string Status { get; set; } = "Concierge Review";

    [MaxLength(40)]
    public string PaymentStatus { get; set; } = "Payment Pending";

    [MaxLength(40)]
    public string DeliveryStatus { get; set; } = "Order Placed";

    [MaxLength(80)]
    public string DeliveryEta { get; set; } = "Awaiting confirmation";

    [MaxLength(80)]
    public string TrackingCode { get; set; } = "";

    [MaxLength(40)]
    public string PaymentMethod { get; set; } = "Concierge Pay";

    [MaxLength(500)]
    public string DeliveryAddress { get; set; } = "";

    [MaxLength(40)]
    public string Date { get; set; } = "Today";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CommerceAdminRecord
{
    [Key]
    [MaxLength(80)]
    public string Id { get; set; } = "";

    [MaxLength(60)]
    public string Module { get; set; } = "";

    [MaxLength(180)]
    public string Title { get; set; } = "";

    [MaxLength(500)]
    public string Meta { get; set; } = "";

    [MaxLength(40)]
    public string Status { get; set; } = "Active";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
