const IMAGE_TIMEOUT_MS = 15000;

const isRemoteSource = (src: string) => /^https?:\/\//i.test(src);

export const waitForImage = (img: HTMLImageElement): Promise<void> =>
  new Promise(resolve => {
    if (img.complete && img.naturalHeight !== 0) {
      resolve();
      return;
    }

    const cleanup = (timeoutId: number) => {
      window.clearTimeout(timeoutId);
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };

    const onLoad = () => {
      cleanup(timeoutId);
      resolve();
    };

    const onError = () => {
      cleanup(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      cleanup(timeoutId);
      resolve();
    }, IMAGE_TIMEOUT_MS);

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
  });

export const preloadImages = async (element: HTMLElement): Promise<void> => {
  const images = Array.from(element.querySelectorAll("img")) as HTMLImageElement[];

  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(async img => {
      if (!img.crossOrigin && isRemoteSource(img.src)) {
        img.crossOrigin = "anonymous";
      }

      if (typeof img.decode === "function") {
        try {
          await img.decode();
          return;
        } catch {
          // Ignore decode errors and fallback to load event
        }
      }

      await waitForImage(img);
    }),
  );
};
