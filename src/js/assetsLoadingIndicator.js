const assetsRegistry = {};

const progressBar = document.querySelector('.load-indicator-bar');
const indicator = document.querySelector('.load-indicator');
const text = document.querySelectorAll('.text-container');
const container = document.querySelector('.load-indicator-container');

let frameRequested = false;
const updateLoadIndicator = () => {
    if (frameRequested) {
        return;
    }

    frameRequested = true;
    requestAnimationFrame(() => {
        frameRequested = false;
        let l = 0;
        let t = 0;
        const textContent = Object.entries(assetsRegistry).reduce(
            (msg, [assetType, { total, loaded }]) => {
                l += loaded;
                t += total;
                return `${msg} ${assetType} (${loaded}/${total})`;
            },
            'Loading:'
        );
        text.forEach((el) => (el.textContent = textContent));
        progressBar.style.width = `${(l / t) * 100}%`;

        if (l === t) {
            setTimeout(() => {
                container.addEventListener(
                    'transitionend',
                    (evt) =>
                        evt.target === container &&
                        container.parentElement &&
                        container.parentElement.removeChild(container)
                );
                container.classList.add('hidden');
            }, 1000);
        }
    });
};

const initLoadIndicator = () => {
    indicator.style.display = 'block';
};

export const addAsset = (assetType, count = 1) => {
    assetsRegistry[assetType]
        ? (assetsRegistry[assetType].total += count)
        : (assetsRegistry[assetType] = { total: count, loaded: 0 });
    initLoadIndicator();
    updateLoadIndicator();
};

export const assetLoaded = (assetType) => {
    assetsRegistry[assetType].loaded += 1;
    updateLoadIndicator();
};
