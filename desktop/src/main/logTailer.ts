import { EventEmitter } from "events";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import { FSWatcher } from "node:fs";
import { LogSnapshot } from "../shared/types";
import { PlayerLogParser } from "./logParser";

interface PlayerLogTailerEvents {
  snapshot: (snapshot: LogSnapshot) => void;
  error: (message: string) => void;
  ready: (logPath: string) => void;
}

const MAX_BOOTSTRAP_BYTES = 128 * 1024;
const MAX_READ_CHUNK_BYTES = 256 * 1024;
const POLL_INTERVAL_MS = 2000;

function defaultLogPath(): string {
  return path.join(
    os.homedir(),
    "AppData",
    "LocalLow",
    "NimbleNeuron",
    "Eternal Return",
    "Player.log"
  );
}

export class PlayerLogTailer extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private readOffset = 0;
  private partialLine = "";
  private running = false;
  private inode: number | null = null;
  private parser = new PlayerLogParser();

  constructor(private readonly logPath: string = defaultLogPath()) {
    super();
  }

  override on<K extends keyof PlayerLogTailerEvents>(
    eventName: K,
    listener: PlayerLogTailerEvents[K]
  ): this {
    return super.on(eventName, listener);
  }

  override emit<K extends keyof PlayerLogTailerEvents>(
    eventName: K,
    ...args: Parameters<PlayerLogTailerEvents[K]>
  ): boolean {
    return super.emit(eventName, ...args);
  }

  getPath(): string {
    return this.logPath;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;

    try {
      await this.ensureLogFileReadable();
      await this.bootstrapFromTail();
      this.startWatching();
      this.startPolling();
      this.running = true;
      this.emit("ready", this.logPath);
      this.emit("snapshot", this.parser.getSnapshot());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "로그 파일 시작에 실패했습니다.";
      this.emit("error", message);
    }
  }

  stop(): void {
    this.running = false;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async ensureLogFileReadable(): Promise<void> {
    await fsp.access(this.logPath, fs.constants.R_OK);
  }

  private async bootstrapFromTail(): Promise<void> {
    const stats = await fsp.stat(this.logPath);
    this.inode = stats.ino;
    this.readOffset = Math.max(0, stats.size - MAX_BOOTSTRAP_BYTES);
    await this.readNewBytes();
  }

  private startWatching(): void {
    this.watcher = fs.watch(this.logPath, () => {
      void this.readNewBytes().catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "로그 읽기 중 오류가 발생했습니다.";
        this.emit("error", message);
      });
    });

    this.watcher.on("error", (error) => {
      const message =
        error instanceof Error ? error.message : "로그 감시에 실패했습니다.";
      this.emit("error", message);
    });
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      void this.pollForRotation();
    }, POLL_INTERVAL_MS);
  }

  private async pollForRotation(): Promise<void> {
    if (!this.running) return;

    try {
      const stats = await fsp.stat(this.logPath);
      const rotated = this.inode !== null && stats.ino !== this.inode;
      const truncated = stats.size < this.readOffset;

      if (rotated || truncated) {
        this.inode = stats.ino;
        this.readOffset = 0;
        this.partialLine = "";
        this.parser.resetParty();
      }

      await this.readNewBytes();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그 회전 확인 중 오류가 발생했습니다.";
      this.emit("error", message);
    }
  }

  private async readNewBytes(): Promise<void> {
    if (!this.running && this.readOffset > 0) {
      // bootstrapFromTail 호출 직후에는 running=false 상태일 수 있다.
    }

    const handle = await fsp.open(this.logPath, "r");

    try {
      const stats = await handle.stat();
      if (stats.size < this.readOffset) {
        this.readOffset = 0;
        this.partialLine = "";
      }

      let remaining = stats.size - this.readOffset;
      if (remaining <= 0) return;

      while (remaining > 0) {
        const chunkSize = Math.min(remaining, MAX_READ_CHUNK_BYTES);
        const chunk = Buffer.allocUnsafe(chunkSize);

        const { bytesRead } = await handle.read(
          chunk,
          0,
          chunkSize,
          this.readOffset
        );

        if (bytesRead <= 0) break;

        this.readOffset += bytesRead;
        remaining -= bytesRead;

        const text = `${this.partialLine}${chunk.toString("utf8", 0, bytesRead)}`;
        const lines = text.split(/\r?\n/);
        this.partialLine = lines.pop() ?? "";

        for (const line of lines) {
          const snapshot = this.parser.consumeLine(line);
          if (snapshot) {
            this.emit("snapshot", snapshot);
          }
        }
      }
    } finally {
      await handle.close();
    }
  }
}
