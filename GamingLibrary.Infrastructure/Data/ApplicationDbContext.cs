using GamingLibrary.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace GamingLibrary.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.ID);

                entity.Property(e => e.Username)
                .IsRequired()
                .HasMaxLength(100);

                entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(255);

                entity.Property(e => e.PasswordHash)
                .IsRequired();

                entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
            });
        }
    }
}
