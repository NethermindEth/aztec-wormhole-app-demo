package logger

import (
	"fmt"
	"log/slog"
	"os"
	
	"github.com/dusted-go/logging/prettylog"
	"github.com/mattn/go-isatty"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Logger wraps zap.Logger with common functionality
type Logger struct {
	*zap.Logger
}

// New creates a new logger instance
func New() (*Logger, error) {
	zapLogger, err := zap.NewProduction()
	if err != nil {
		// Fallback to example logger if production fails
		zapLogger = zap.NewExample()
	}
	
	return &Logger{zapLogger}, nil
}

// NewDevelopment creates a development logger with more verbose output
func NewDevelopment() (*Logger, error) {
	zapLogger, err := zap.NewDevelopment()
	if err != nil {
		return nil, fmt.Errorf("failed to create development logger: %v", err)
	}
	
	return &Logger{zapLogger}, nil
}

// NewWithOptions creates a new logger with custom options
func NewWithOptions(debug bool, json bool) (*Logger, error) {
	var config zap.Config
	
	if debug {
		config = zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zapcore.DebugLevel)
	} else {
		config = zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zapcore.InfoLevel)
	}
	
	if json {
		config.Encoding = "json"
	} else {
		config.Encoding = "console"
	}
	
	zapLogger, err := config.Build()
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %v", err)
	}
	
	return &Logger{zapLogger}, nil
}

// WithComponent creates a child logger with a component field
func (l *Logger) WithComponent(component string) *Logger {
	return &Logger{
		l.With(zap.String("component", component)),
	}
}

// WithFields creates a child logger with additional fields
func (l *Logger) WithFields(fields ...zap.Field) *Logger {
	return &Logger{
		l.With(fields...),
	}
}

// ConfigureSlog sets up slog with the given options
func ConfigureSlog(debug bool, json bool) *slog.Logger {
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