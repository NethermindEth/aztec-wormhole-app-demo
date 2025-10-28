package cmd

import (
	"fmt"
	"os"
	"strings"

	dotenv "github.com/joho/godotenv"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "wormhole-relayer",
	Short: "Relayer for Wormhole messages between various chains",
}

func init() {
	// Tentatively load .env file
	_ = dotenv.Load()

	rootCmd.PersistentFlags().Bool(
		"debug",
		false,
		"Enables debug output.")

	rootCmd.PersistentFlags().Bool(
		"json",
		false,
		"Enables structured logging in JSON format.")

	// Wormhole Core Configuration (shared by both directions)
	rootCmd.PersistentFlags().String(
		"spy-rpc-host",
		"localhost:7073",
		"Wormhole spy service endpoint")

	rootCmd.PersistentFlags().String(
		"wormhole-contract",
		"0x0848d2af89dfd7c0e171238f9216399e61e908cd31b0222a920f1bf621a16ed6",
		"Wormhole core contract address")

	rootCmd.PersistentFlags().String(
		"emitter-address",
		"0x0848d2af89dfd7c0e171238f9216399e61e908cd31b0222a920f1bf621a16ed6",
		"Emitter address to monitor")

	// Optional Verification Service

	// Bind flags to viper for env variable support
	viper.BindPFlag("spy_rpc_host", rootCmd.PersistentFlags().Lookup("spy-rpc-host"))
	viper.BindPFlag("source_chain_id", rootCmd.PersistentFlags().Lookup("source-chain-id"))
	viper.BindPFlag("dest_chain_id", rootCmd.PersistentFlags().Lookup("dest-chain-id"))
	viper.BindPFlag("wormhole_contract", rootCmd.PersistentFlags().Lookup("wormhole-contract"))
	viper.BindPFlag("emitter_address", rootCmd.PersistentFlags().Lookup("emitter-address"))
	viper.BindPFlag("verification_service_url", rootCmd.PersistentFlags().Lookup("verification-service-url"))

	cobra.OnInitialize(initConfig)
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func initConfig() {
	viper.SetEnvPrefix("wormhole-relayer")
	viper.SetEnvKeyReplacer(strings.NewReplacer("-", "_", ".", "_"))
	viper.AutomaticEnv() // read in environment variables that match
}

func printBanner() {
	colours := []string{
		"\033[38;5;81m", // Cyan
		"\033[38;5;75m", // Light Blue
		"\033[38;5;69m", // Sky Blue
		"\033[38;5;63m", // Dodger Blue
		"\033[38;5;57m", // Deep Sky Blue
		"\033[38;5;51m", // Cornflower Blue
		"\033[38;5;45m", // Royal Blue
	}
	banner := `
 __      __                      .__           .__           __________       .__
/  \    /  \___________  _____   |  |__   ____ |  |   ____   \______   \ ____ |  | _____  ___.__. ___________
\   \/\/   /  _ \_  __ \/     \  |  |  \ /  _ \|  | _/ __ \   |       _// __ \|  | \__  \<   |  |/ __ \_  __ \
 \        (  <_> )  | \/  Y Y  \ |   Y  (  <_> )  |_\  ___/   |    |   \  ___/|  |__/ __ \\___  \  ___/|  | \/
  \__/\  / \____/|__|  |__|_|  / |___|  /\____/|____/\___  >  |____|_  /\___  >____(____  / ____|\___  >__|
       \/                    \/       \/                 \/          \/     \/          \/\/         \/
`
	lines := strings.Split(banner, "\n")

	// remove empty lines
	for i := 0; i < len(lines); i++ {
		if lines[i] == "" {
			lines = append(lines[:i], lines[i+1:]...)
			i--
		}
	}

	for i, line := range lines {
		fmt.Printf("%s%s\n", colours[i], line)
	}

	fmt.Println("\033[0m") // Reset
}

func configureLogging(cmd *cobra.Command, _ []string) *zap.Logger {
	debug, _ := cmd.Flags().GetBool("debug")
	json, _ := cmd.Flags().GetBool("json")

	var config zap.Config
	if debug {
		config = zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		config.Development = true
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		config = zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	}

	// Configure JSON output if requested
	if json {
		config.Encoding = "json"
	} else {
		config.Encoding = "console"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	logger, err := config.Build()
	if err != nil {
		// Fallback to a basic logger if config fails
		logger, _ = zap.NewProduction()
	}

	// Replace the global logger
	zap.ReplaceGlobals(logger)

	return logger
}
