import { contextBridge, ipcRenderer } from "electron";
import { AuthUpdateEvent, LogSnapshot, OcrSnapshot, RecommendationRequest } from "../shared/types";

const ermetaApi = {
  auth: {
    login: () => ipcRenderer.invoke("auth:login") as Promise<{ ok: boolean }>,
    logout: () => ipcRenderer.invoke("auth:logout") as Promise<{ ok: boolean }>,
    me: () => ipcRenderer.invoke("auth:me") as Promise<{
      steamId: string;
      personaName: string;
      expiresAt: number;
    } | null>,
    onUpdate: (listener: (event: AuthUpdateEvent) => void) => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: AuthUpdateEvent) => {
        listener(payload);
      };
      ipcRenderer.on("auth:update", wrapped);
      return () => {
        ipcRenderer.removeListener("auth:update", wrapped);
      };
    },
  },
  logs: {
    start: () =>
      ipcRenderer.invoke("log:start") as Promise<{
        ok: boolean;
        path: string;
        running: boolean;
      }>,
    stop: () => ipcRenderer.invoke("log:stop") as Promise<{ ok: boolean }>,
    onSnapshot: (listener: (snapshot: LogSnapshot) => void) => {
      const wrapped = (
        _event: Electron.IpcRendererEvent,
        payload: LogSnapshot
      ) => {
        listener(payload);
      };
      ipcRenderer.on("log:snapshot", wrapped);
      return () => {
        ipcRenderer.removeListener("log:snapshot", wrapped);
      };
    },
    onError: (listener: (message: string) => void) => {
      const wrapped = (
        _event: Electron.IpcRendererEvent,
        payload: string
      ) => {
        listener(payload);
      };
      ipcRenderer.on("log:error", wrapped);
      return () => {
        ipcRenderer.removeListener("log:error", wrapped);
      };
    },
  },
  matching: {
    start: () => ipcRenderer.invoke("matching:start") as Promise<{ ok: boolean }>,
    stop: () => ipcRenderer.invoke("matching:stop") as Promise<{ ok: boolean }>,
  },
  ocr: {
    capture: () =>
      ipcRenderer.invoke("ocr:capture") as Promise<OcrSnapshot>,
    onSnapshot: (listener: (snapshot: OcrSnapshot) => void) => {
      const wrapped = (
        _event: Electron.IpcRendererEvent,
        payload: OcrSnapshot
      ) => {
        listener(payload);
      };
      ipcRenderer.on("ocr:snapshot", wrapped);
      return () => {
        ipcRenderer.removeListener("ocr:snapshot", wrapped);
      };
    },
  },
  recommendation: {
    get: (input: RecommendationRequest) =>
      ipcRenderer.invoke("recommendation:get", input) as Promise<
        Array<{
          character1: number;
          character2: number;
          character3: number;
          winRate: number;
          averageRP: number;
          totalGames: number;
          averageRank: number;
        }>
      >,
  },
};

contextBridge.exposeInMainWorld("ermeta", ermetaApi);
