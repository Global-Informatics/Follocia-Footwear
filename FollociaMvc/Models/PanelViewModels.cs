namespace FollociaMvc.Models;

public record PanelMetric(string Label, string Value, string Delta, string Tone);

public record PanelProduct(
    string Id,
    string Name,
    string Edition,
    string Price,
    string Status,
    int Produced,
    int Reserved,
    int Available);

public record PanelOrder(
    string Id,
    string Customer,
    string Product,
    string Size,
    string Amount,
    string Status,
    string Date);

public record PanelCustomer(
    string Name,
    string Tier,
    string Location,
    string LastOrder,
    string LifetimeValue);

public record ConciergeTask(
    string Title,
    string Owner,
    string Due,
    string Priority);

public record AdminPanelViewModel(
    IReadOnlyList<PanelMetric> Metrics,
    IReadOnlyList<PanelProduct> Products,
    IReadOnlyList<PanelOrder> Orders,
    IReadOnlyList<PanelCustomer> Customers,
    IReadOnlyList<ConciergeTask> ConciergeTasks);

public record UserReservation(
    string Id,
    string Product,
    string Size,
    string Status,
    string Amount,
    string Eta);

public record UserWishlistItem(
    string Product,
    string Edition,
    string Availability,
    string ImagePath);

public record UserAddress(
    string Label,
    string Recipient,
    string Line,
    string City);

public record UserPanelViewModel(
    string Name,
    string Tier,
    string MemberSince,
    IReadOnlyList<PanelMetric> Metrics,
    IReadOnlyList<UserReservation> Reservations,
    IReadOnlyList<UserWishlistItem> Wishlist,
    IReadOnlyList<UserAddress> Addresses,
    IReadOnlyList<ConciergeTask> SupportTimeline);
