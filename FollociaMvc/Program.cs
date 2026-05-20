using FollociaMvc.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<FollociaDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();
try
{
    await CommerceDbInitializer.InitializeAsync(app.Services);
    AppDatabaseStatus.IsAvailable = true;
}
catch (Exception ex)
{
    AppDatabaseStatus.IsAvailable = false;
    app.Logger.LogWarning(ex, "Database initialization failed. Starting without the local database.");
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.MapFallbackToController("Index", "Home");


app.Run();

public static class AppDatabaseStatus
{
    public static bool IsAvailable { get; set; }
}
