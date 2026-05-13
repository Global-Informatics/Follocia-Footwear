using Microsoft.AspNetCore.Mvc;

namespace FollociaMvc.Controllers;

public class AdminController : Controller
{
    public IActionResult Index()
    {
        return View("~/Views/Home/Index.cshtml");
    }
}
