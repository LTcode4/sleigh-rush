import liff from '@line/liff';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();
function handleLiffError(err: Error) {
  if (['The access token expired', 'The access token revoked'].includes(err.message)) {
    liff.logout();
    window.location.reload();
  } else {
    throw err;
  }
}
function initLiff() {
  const liffId = process.env.QUASAR_LIFF_ID as string;
  return new Promise<void>((resolve, reject) => {
    if (!liffId) reject(new Error('Missing Liff Id'));
    else {
      liff
        .init({ liffId })
        .then(async () => {
          if (!liff.isLoggedIn()) liff.login();
          else {
            const lineProfile = await liff.getProfile();
            appStore.setLineProfile(lineProfile);
            resolve();
          }
        })
        .catch(handleLiffError)
        .catch(reject);
    }
  });
}

export { initLiff };
