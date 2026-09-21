using System.Diagnostics;
using FollociaMvc.Data;
using FollociaMvc.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FollociaMvc.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly FollociaDbContext? _db;

    public HomeController(ILogger<HomeController> logger, FollociaDbContext? db = null)
    {
        _logger = logger;
        _db = db;
    }

    public async Task<IActionResult> Index()
    {
        var products = await GetProductDtosAsync();

        var model = new HomeViewModel
        {
            FeaturedProducts = products,
            Collections = GetSampleCollections(),
            LookbookItems = GetSampleLookbook(),
            Testimonials = GetSampleTestimonials()
        };

        return View(model);
    }

    public async Task<IActionResult> Shop(string edition = "All", string status = "All")
    {
        var allProducts = await GetProductDtosAsync();

        var filtered = allProducts.AsEnumerable();

        if (!string.Equals(edition, "All", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(edition))
        {
            filtered = filtered.Where(p => string.Equals(p.Edition, edition, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.Equals(status, "All", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(status))
        {
            filtered = filtered.Where(p => string.Equals(p.Status, status, StringComparison.OrdinalIgnoreCase));
        }

        var model = new ShopViewModel
        {
            Products = filtered.ToList(),
            SelectedEdition = edition,
            SelectedStatus = status,
            AvailableEditions = allProducts.Select(p => p.Edition).Distinct().ToList()
        };

        return View(model);
    }

    public async Task<IActionResult> Collections()
    {
        var products = await GetProductDtosAsync();

        var model = new CollectionsViewModel
        {
            Collections = GetSampleCollections(),
            FeaturedProducts = products
        };

        return View(model);
    }

    public IActionResult Contact()
    {
        return View(new ContactFormModel());
    }

    [HttpPost]
    public IActionResult SubmitContact(ContactFormModel form)
    {
        form.SuccessMessage = true;
        return View("Contact", form);
    }

    public async Task<IActionResult> ProductDetail(string id)
    {
        var products = await GetProductDtosAsync();
        var product = products.FirstOrDefault(p => string.Equals(p.Id, id, StringComparison.OrdinalIgnoreCase))
                      ?? products.FirstOrDefault();

        if (product == null)
        {
            return NotFound();
        }

        var model = new ProductDetailViewModel
        {
            Product = product,
            RelatedProducts = products.Where(p => p.Id != product.Id).Take(3).ToList()
        };

        return View(model);
    }

    public IActionResult Privacy()
    {
        return RedirectToAction("Index");
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }

    private async Task<List<ProductDto>> GetProductDtosAsync()
    {
        if (_db != null && AppDatabaseStatus.IsAvailable)
        {
            try
            {
                var dbProducts = await _db.Products.AsNoTracking().Where(p => p.IsActive).ToListAsync();
                if (dbProducts.Any())
                {
                    return dbProducts.Select(p => new ProductDto(
                        p.Id,
                        p.Title,
                        p.Edition,
                        $"{p.CurrencyCode} {p.PriceAmount:N0}",
                        p.Tone,
                        p.ImagePath,
                        new[] { p.ImagePath },
                        p.Status,
                        p.Produced,
                        p.Reserved,
                        p.Available
                    )).ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load products from database, falling back to demo data.");
            }
        }

        return GetFallbackProducts();
    }

    private static List<ProductDto> GetFallbackProducts()
    {
        return new List<ProductDto>
        {
            new("fl-aura-01", "Follicia Aura Mule", "Edition of 220", "Rs. 24,800", "Ivory Calfskin", "/react/assets/collection-1.jpg", new[] { "/react/assets/collection-1.jpg" }, "Live", 220, 184, 36),
            new("fl-bloom-01", "Follicia Bloom Pump", "Edition of 180", "Rs. 28,500", "Patent Obsidian", "/react/assets/collection-2.jpg", new[] { "/react/assets/collection-2.jpg" }, "Live", 180, 168, 12),
            new("fl-starlight-01", "Follicia Starlight Heel", "Edition of 140", "Rs. 32,000", "Brushed Champagne", "/react/assets/collection-3.jpg", new[] { "/react/assets/collection-3.jpg" }, "Private Preview", 140, 121, 19),
            new("fl-celestial-01", "Follicia Celestial Boot", "Edition of 80", "Rs. 36,000", "Rosso Patent", "/react/assets/Footwear.jpg", new[] { "/react/assets/Footwear.jpg" }, "Draft", 80, 0, 80)
        };
    }

    private static List<CollectionCardModel> GetSampleCollections()
    {
        return new List<CollectionCardModel>
        {
            new() { Id = "col-1", Name = "Florence Heritage Gold", Subtitle = "Hand-sculpted golden heel silhouettes in brushed brass & ivory calfskin.", Season = "MMXXV Edition I", ImageUrl = "/react/assets/collection-1.jpg", PairsCount = 220, Status = "Available" },
            new() { Id = "col-2", Name = "Obsidian Nocturne", Subtitle = "Deep midnight patent leather with architectural sculpted heels.", Season = "MMXXV Edition II", ImageUrl = "/react/assets/collection-2.jpg", PairsCount = 180, Status = "Low Stock" },
            new() { Id = "col-3", Name = "Champagne Reserve", Subtitle = "Liquid satin & champagne metallic finish, reserved for private clients.", Season = "MMXXV Edition III", ImageUrl = "/react/assets/collection-3.jpg", PairsCount = 140, Status = "Private Access" }
        };
    }

    private static List<LookbookItemModel> GetSampleLookbook()
    {
        return new List<LookbookItemModel>
        {
            new() { Id = "lb-1", Title = "Palazzo Corsini Gala", Location = "Florence, Italy", ImageUrl = "/react/assets/collection-1.jpg", FootwearFeatured = "Follicia Aura Mule" },
            new() { Id = "lb-2", Title = "Opera Night at Teatro La Fenice", Location = "Venice, Italy", ImageUrl = "/react/assets/collection-2.jpg", FootwearFeatured = "Follicia Bloom Pump" },
            new() { Id = "lb-3", Title = "Private Villa Soirée", Location = "Lake Como, Italy", ImageUrl = "/react/assets/collection-3.jpg", FootwearFeatured = "Follicia Starlight Heel" }
        };
    }

    private static List<TestimonialModel> GetSampleTestimonials()
    {
        return new List<TestimonialModel>
        {
            new() { Quote = "The architectural heel stability and Italian leather finish are unmatched. Truly a piece of wearable art.", Author = "Eleonora B.", Title = "Haute Couture Collector", Location = "Milan" },
            new() { Quote = "Receiving edition number 12 of 180 felt like opening a museum piece. White-glove concierge delivered to my hotel in Venice.", Author = "Clara Dupont", Title = "VIP Patron", Location = "Paris" },
            new() { Quote = "Follicia represents the rare craft of traditional Tuscan shoemaking merged with modern silhouette mastery.", Author = "Sofia V.", Title = "Fashion Editor", Location = "Rome" }
        };
    }
}
