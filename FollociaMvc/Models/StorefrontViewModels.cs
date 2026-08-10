namespace FollociaMvc.Models;

public class HomeViewModel
{
    public required List<ProductDto> FeaturedProducts { get; set; }
    public required List<CollectionCardModel> Collections { get; set; }
    public required List<LookbookItemModel> LookbookItems { get; set; }
    public required List<TestimonialModel> Testimonials { get; set; }
}

public class ShopViewModel
{
    public required List<ProductDto> Products { get; set; }
    public string SelectedEdition { get; set; } = "All";
    public string SelectedStatus { get; set; } = "All";
    public List<string> AvailableEditions { get; set; } = [];
}

public class CollectionsViewModel
{
    public required List<CollectionCardModel> Collections { get; set; }
    public required List<ProductDto> FeaturedProducts { get; set; }
}

public class ProductDetailViewModel
{
    public required ProductDto Product { get; set; }
    public required List<ProductDto> RelatedProducts { get; set; }
}

public class CollectionCardModel
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Subtitle { get; set; }
    public required string Season { get; set; }
    public required string ImageUrl { get; set; }
    public required int PairsCount { get; set; }
    public required string Status { get; set; }
}

public class LookbookItemModel
{
    public required string Id { get; set; }
    public required string Title { get; set; }
    public required string Location { get; set; }
    public required string ImageUrl { get; set; }
    public required string FootwearFeatured { get; set; }
}

public class TestimonialModel
{
    public required string Quote { get; set; }
    public required string Author { get; set; }
    public required string Title { get; set; }
    public required string Location { get; set; }
}

public class ContactFormModel
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Subject { get; set; } = "Private Concierge Fitting";
    public string Message { get; set; } = "";
    public bool SuccessMessage { get; set; }
}
