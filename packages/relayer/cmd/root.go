package cmd

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/dusted-go/logging/prettylog"
	dotenv "github.com/joho/godotenv"
	"github.com/mattn/go-isatty"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "relayer",
	Short: "Aztec-Arbitrum Wormhole Relayer",
	Long: `Wormhole Relayer for bridging messages between Aztec and Arbitrum networks.
	
This tool provides bidirectional message relaying:
- aztec: Relays messages from Aztec to Arbitrum
- arbitrum: Relays messages from Arbitrum to Aztec`,
}

func init() {
	// Tentatively load .env file
	_ = dotenv.Load()

	// Global flags available to all subcommands
	rootCmd.PersistentFlags().Bool(
		"debug",
		false,
		"Enable debug output")

	rootCmd.PersistentFlags().Bool(
		"json",
		false,
		"Enable structured logging in JSON format")

	// Shared configuration flags
	rootCmd.PersistentFlags().String(
		"spy-rpc-host",
		"localhost:7072",
		"Wormhole spy service endpoint")

	rootCmd.PersistentFlags().String(
		"wormhole-contract",
		"0x1b35884f8ba9371419d00ae228da9ff839edfe8fe6a804fdfcd430e0dc7e40db",
		"Wormhole core contract address")

	cobra.OnInitialize(initConfig)
}

// Execute runs the root command
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func initConfig() {
	// Set environment variable prefix
	viper.SetEnvPrefix("RELAYER")
	// Replace - and . with _ in environment variables
	viper.SetEnvKeyReplacer(strings.NewReplacer("-", "_", ".", "_"))
	// Read in environment variables that match
	viper.AutomaticEnv()

	// Bind all pflags to viper
	if err := viper.BindPFlags(rootCmd.PersistentFlags()); err != nil {
		slog.Error("Failed to bind persistent flags", "error", err)
	}
}

// ConfigureLogging sets up the logger based on debug and json flags
func ConfigureLogging(cmd *cobra.Command, _ []string) *slog.Logger {
	debug, err := cmd.Flags().GetBool("debug")
	if err != nil {
		slog.Debug("Error getting debug flag", "error", err)
	}

	json, err := cmd.Flags().GetBool("json")
	if err != nil {
		slog.Debug("Error getting json flag", "error", err)
	}

	var options *slog.HandlerOptions
	if debug {
		options = &slog.HandlerOptions{
			Level:     slog.LevelDebug,
			AddSource: true,
		}
	} else {
		options = &slog.HandlerOptions{
			Level:     slog.LevelInfo,
			AddSource: false,
		}
	}

	var handler slog.Handler

	if json {
		handler = slog.NewJSONHandler(os.Stdout, options)
	} else {
		if isatty.IsTerminal(os.Stdout.Fd()) {
			handler = prettylog.NewHandler(options)
		} else {
			handler = slog.NewTextHandler(os.Stdout, options)
		}
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

// PrintBanner prints a colorful banner for the relayer
func PrintBanner() {
	colours := []string{
		"\033[38;5;81m", // Cyan
		"\033[38;5;75m", // Light Blue
		"\033[38;5;69m", // Sky Blue
		"\033[38;5;63m", // Dodger Blue
		"\033[38;5;57m", // Deep Sky Blue
	}
	
	banner := `
╦═╗┌─┐┬  ┌─┐┬ ┬┌─┐┬─┐
╠╦╝├┤ │  ├─┤└┬┘├┤ ├┬┘
╩╚═└─┘┴─┘┴ ┴ ┴ └─┘┴└─
Aztec ⟷ Arbitrum Bridge`

	lines := strings.Split(banner, "\n")

	// Print each line with different colors
	for i, line := range lines {
		if line != "" && i < len(colours) {
			fmt.Printf("%s%s\n", colours[i], line)
		}
	}

	fmt.Println("\033[0m") // Reset color
}