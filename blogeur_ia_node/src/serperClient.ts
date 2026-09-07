import axios from "axios";
import { settings } from "./config";

const SERPER_BASE = "https://google.serper.dev";

async function post(endpoint: string, payload: Record<string, any>): Promise<any> {
  if (!settings.serperApiKey) return {};
  try {
    const resp = await axios.post(`${SERPER_BASE}/${endpoint}`, payload, {
      headers: { "X-API-KEY": settings.serperApiKey, "Content-Type": "application/json" },
      timeout: 12000,
    });
    return resp.status === 200 ? resp.data : {};
  } catch {
    return {};
  }
}

const baseParams = () => ({ gl: settings.serperGl, hl: settings.serperHl });

export async function serperSearch(q: string, num = 8): Promise<any[]> {
  const data = await post("search", { q, num, ...baseParams() });
  return data.organic || [];
}

export async function serperSearchTimeDefine(q: string, num = 8, tbs = "qdr:w"): Promise<any[]> {
  const data = await post("search", { q, num, tbs, ...baseParams() });
  return data.organic || [];
}

export async function serperNews(q: string, num = 6): Promise<any[]> {
  const data = await post("news", { q, num, ...baseParams() });
  return data.news || [];
}

export async function serperImages(q: string, num = 6): Promise<any[]> {
  const data = await post("images", { q, num, ...baseParams() });
  return data.images || [];
}

export async function serperVideos(q: string, num = 5): Promise<any[]> {
  const data = await post("videos", { q, num, ...baseParams() });
  return data.videos || [];
}

export async function serperPlaces(q: string, num = 5): Promise<any[]> {
  const data = await post("places", { q, num, ...baseParams() });
  return data.places || [];
}