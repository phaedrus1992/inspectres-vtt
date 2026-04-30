/**
 * Structured logging system for devMode debugging
 * Records mission sync events, multiplayer coordination, and state changes
 */

interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  data: Record<string, unknown> | undefined;
}

class DevLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 500;

  log(
    level: "info" | "warn" | "error",
    category: string,
    message: string,
    data: Record<string, unknown> | undefined = undefined,
  ): void {
    const settingsApi = game.settings as unknown as { get: (namespace: string, key: string) => unknown };
    const devModeEnabled = (settingsApi?.get("inspectres", "devMode") as boolean | undefined) ?? false;
    if (!devModeEnabled) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[${category}:${level.toUpperCase()}]`;
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    console.log(`${prefix} ${message}${dataStr}`);
  }

  info(category: string, message: string, data: Record<string, unknown> | undefined = undefined): void {
    this.log("info", category, message, data);
  }

  warn(category: string, message: string, data: Record<string, unknown> | undefined = undefined): void {
    this.log("warn", category, message, data);
  }

  error(category: string, message: string, data: Record<string, unknown> | undefined = undefined): void {
    this.log("error", category, message, data);
  }

  getLogs(category?: string, level?: string): LogEntry[] {
    return this.logs.filter((entry) => {
      if (category && entry.category !== category) return false;
      if (level && entry.level !== level) return false;
      return true;
    });
  }

  clear(): void {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

let loggerInstance: DevLogger | null = null;

export function getDevLogger(): DevLogger {
  loggerInstance ??= new DevLogger();
  return loggerInstance;
}
