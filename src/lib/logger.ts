export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class AppLogger {
  private format(entry: LogEntry) {
    const ctx = entry.context ? `\nContext: ${JSON.stringify(entry.context, null, 2)}` : "";
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString()
    };
    
    const formatted = this.format(entry);

    // This can be expanded to send logs to a backend API (Sentry, Datadog, Axiom)
    switch (level) {
      case "debug": console.debug(formatted); break;
      case "info": console.info(formatted); break;
      case "warn": console.warn(formatted); break;
      case "error": console.error(formatted); break;
    }
  }

  debug(message: string, context?: Record<string, any>) { this.log("debug", message, context); }
  info(message: string, context?: Record<string, any>) { this.log("info", message, context); }
  warn(message: string, context?: Record<string, any>) { this.log("warn", message, context); }
  error(message: string, context?: Record<string, any>) { this.log("error", message, context); }
}

export const logger = new AppLogger();
