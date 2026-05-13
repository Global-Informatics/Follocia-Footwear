using Microsoft.AspNetCore.Mvc;

namespace FollociaMvc.Controllers;

public class AccountController : Controller
{
    public IActionResult Index()
    {
        return View("~/Views/Home/Index.cshtml");
    }
}
