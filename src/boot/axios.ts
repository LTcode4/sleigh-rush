/* eslint-disable @typescript-eslint/no-empty-function */
import { boot } from 'quasar/wrappers';
import { name as appName } from '../../package.json';

const INFRA_BASE = process.env.INTERACTION_INFRA_API ?? '';

type FetchInit = Parameters<typeof fetch>[1];

async function request<T = Record<string, unknown>>(path: string, init?: FetchInit): Promise<T> {
  const res = await fetch(`${INFRA_BASE}${path}`, init);
  if (!res.ok) throw new Error(`Request failed with status ${res.status}: ${path}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const infraApi = {
  get: <T = Record<string, unknown>>(path: string) => request<T>(path),
  post: <T = Record<string, unknown>>(path: string, body: object | FormData) =>
    request<T>(
      path,
      body instanceof FormData
        ? { method: 'POST', body }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    ),
};

export default boot(() => {});

const project = `${appName}-${process.env.QUASAR_ENVIRONMENT}`;
const infraSdk = {
  logInfo: (info: object) => {
    if (process.env.QUASAR_ENVIRONMENT === 'development') return;
    infraApi.post('/log-info', { project, info }).catch(() => {});
  },
  sendPlayStat: (postfix?: string) => {
    if (process.env.QUASAR_ENVIRONMENT === 'development') return;
    const projectName = postfix ? `${project}-${postfix}` : project;
    infraApi.post('/play-stat', { project: projectName }).catch(() => {});
  },
  sendShareStat: () => {
    infraSdk.sendPlayStat('share');
  },
  async uploadImage({ imageBase64, user }: { imageBase64: string; user: string }) {
    const res = await fetch(imageBase64);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('image', blob, 'image.png');
    formData.append('project', project);
    formData.append('user', user);
    const data = await infraApi.post<{ imageId: string; url: string }>('/share-images', formData);
    return { imageId: data.imageId, imageUrl: data.url };
  },
  async getShareImage(shareId: string) {
    const data = await infraApi.get<{ image: unknown }>(`/share-images/${shareId}`);
    return data.image;
  },
};
export { infraSdk };
