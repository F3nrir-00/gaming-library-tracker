using GamingLibrary.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace GamingLibrary.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<PlatformConnection> PlatformConnections { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<UserGame> UserGames { get; set; }
        public DbSet<JournalEntry> JournalEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserID);

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

            modelBuilder.Entity<PlatformConnection>(entity =>
            {
                entity.HasKey(e => e.ConnectionID);

                entity.Property(e => e.Platform)
                .IsRequired()
                .HasMaxLength(50);

                entity.Property(e => e.PlatformUserId)
                .IsRequired()
                .HasMaxLength(255);

                entity.Property(e => e.ConnectedAt)
                .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.User)
                .WithMany(u => u.PlatformConnections)
                .HasForeignKey(e => e.UserID)
                .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserID, e.Platform })
                .IsUnique();
            });

            modelBuilder.Entity<Game>(entity =>
            {
                entity.HasKey(e => e.GameID);

                entity.Property(e => e.IgdbId)
                .IsRequired(false);

                entity.Property(e => e.BannerImageUrl)
                .IsRequired(false);

                entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(255);

                entity.Property(e => e.NormalizedTitle)
                .IsRequired()
                .HasMaxLength(255);

                entity.Property(e => e.CoverImageURL)
                .HasMaxLength(500);

                entity.Property(e => e.Developer)
                .HasMaxLength(255);

                entity.Property(e => e.Publisher)
                .HasMaxLength(255);

                entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

                entity.HasIndex(e => e.NormalizedTitle);
            });

            modelBuilder.Entity<UserGame>(entity =>
            {
                entity.HasKey(e => e.UserGameID);

                entity.Property(e => e.Platform)
                .IsRequired()
                .HasMaxLength(50);

                entity.Property(e => e.PlatformGameID)
                .IsRequired()
                .HasMaxLength(255);

                entity.Property(e => e.Status)
                .HasMaxLength(50);

                entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.User)
                .WithMany(u => u.UserGames)
                .HasForeignKey(e => e.UserID)
                .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Game)
                .WithMany(g => g.UserGames)
                .HasForeignKey(e => e.GameID)
                .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserID, e.Platform, e.PlatformGameID })
                .IsUnique();
            });

            modelBuilder.Entity<JournalEntry>(entity =>
            {
                entity.HasKey(e => e.EntryID);

                entity.Property(e => e.Content)
                    .IsRequired();

                entity.Property(e => e.Tags)
                    .HasMaxLength(500);

                entity.Property(e => e.Rating)
                    .HasAnnotation("CheckConstraint", "CHK_Rating BETWEEN 1 AND 10");

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.UpdatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                // Foreign key to UserGame
                entity.HasOne(e => e.UserGame)
                    .WithMany(ug => ug.JournalEntries)
                    .HasForeignKey(e => e.UserGameID)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
