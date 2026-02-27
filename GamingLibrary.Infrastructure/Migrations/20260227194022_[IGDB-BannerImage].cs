using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamingLibrary.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IGDBBannerImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BannerImageUrl",
                table: "Games",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BannerImageUrl",
                table: "Games");
        }
    }
}
