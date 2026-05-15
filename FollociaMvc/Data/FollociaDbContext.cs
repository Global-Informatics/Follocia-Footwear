using FollociaMvc.Models;
using Microsoft.EntityFrameworkCore;

namespace FollociaMvc.Data;

public class FollociaDbContext(DbContextOptions<FollociaDbContext> options) : DbContext(options)
{
    public DbSet<CommerceProduct> Products => Set<CommerceProduct>();

    public DbSet<CommerceCustomer> Customers => Set<CommerceCustomer>();

    public DbSet<CommerceAddress> Addresses => Set<CommerceAddress>();

    public DbSet<CommerceWishlistItem> WishlistItems => Set<CommerceWishlistItem>();

    public DbSet<CommerceSubscription> Subscriptions => Set<CommerceSubscription>();

    public DbSet<CommerceOrder> Orders => Set<CommerceOrder>();

    public DbSet<CommerceAdminRecord> AdminRecords => Set<CommerceAdminRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CommerceCustomer>()
            .HasIndex(customer => customer.Email)
            .IsUnique();

        modelBuilder.Entity<CommerceAddress>()
            .HasOne(address => address.Customer)
            .WithMany(customer => customer.Addresses)
            .HasForeignKey(address => address.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommerceWishlistItem>()
            .HasIndex(item => new { item.CustomerId, item.ProductId })
            .IsUnique();

        modelBuilder.Entity<CommerceWishlistItem>()
            .HasOne(item => item.Customer)
            .WithMany(customer => customer.Wishlist)
            .HasForeignKey(item => item.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommerceSubscription>()
            .HasOne(subscription => subscription.Customer)
            .WithMany(customer => customer.Subscriptions)
            .HasForeignKey(subscription => subscription.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommerceAdminRecord>()
            .HasIndex(record => record.Module);
    }
}
