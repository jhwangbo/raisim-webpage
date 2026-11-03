const MB = 1024 * 1024;

export function resolveSiteLinks(base, platform = globalThis) {
  return platform.fetch(new URL('../hashmap.json', base), {method: 'HEAD', cache: 'no-store'})
      .then(response => response.ok)
      .catch(() => false)
      .then(inSite => {
        if (inSite) return;
        for (const link of platform.document.querySelectorAll('[data-site-path]'))
          link.href = new URL(link.dataset.sitePath, 'https://raisim.com/').href;
      });
}

export function progressLabel({phase, loaded = 0, total = 0, label}) {
  const amount = total > 0 ? ` · ${(loaded / MB).toFixed(1)} of ${(total / MB).toFixed(1)} MB` : '';
  if (phase === 'download') return `Downloading RaiSim${amount}`;
  if (phase === 'cache') return 'Loading RaiSim saved in this browser';
  if (phase === 'assets') return `Downloading assets${amount}`;
  if (phase === 'saved-assets') return 'Loading the example files saved in this browser';
  return label;
}

export class LoadProgress {
  constructor(root) {
    this.root = root;
    this.bar = root.querySelector('progress');
    this.label = root.querySelector('.load-label');
  }

  update(event) {
    this.root.hidden = false;
    if (event.total > 0) {
      this.bar.max = event.total;
      this.bar.value = Math.min(event.loaded, event.total);
    } else {
      this.bar.removeAttribute('value');
    }
    this.label.textContent = progressLabel(event);
  }

  stage(label) { this.update({phase: 'stage', label}); }

  done() { this.root.hidden = true; }
}

// Shows on `button` how much `saved` (savedBytes() and forget()) keeps in this browser; the button
// removes it. Returns the function that refreshes it.
export function savedFilesButton(button, resources, status) {
  const refresh = async () => {
    let bytes = 0;
    try { bytes = await resources.savedBytes(); } catch {}
    button.hidden = !bytes;
    button.textContent = `Remove files saved in this browser (${(bytes / MB).toFixed(1)} MB)`;
  };
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await resources.forget();
      status.textContent = 'Removed the files saved in this browser.';
    } finally {
      button.disabled = false;
      await refresh();
    }
  });
  return refresh;
}

// Asks whether to download an example's asset pack, and whether to keep it in this browser for the
// next visit. Resolves to false when the visitor declines, otherwise to {keep}.
export function confirmDownload({title, bytes, files}, document = globalThis.document) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-download';
    const form = document.createElement('form');
    form.method = 'dialog';
    const heading = document.createElement('h2');
    heading.textContent = `Download the assets of ${title}?`;
    const detail = document.createElement('p');
    const size = `${(bytes / MB).toFixed(1)} MB`;
    detail.textContent = `The example needs ${size} of models and textures (${files} files) to continue.`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const cancel = document.createElement('button');
    cancel.value = 'cancel';
    cancel.textContent = 'Cancel';
    const download = document.createElement('button');
    download.value = 'download';
    download.className = 'primary';
    download.textContent = `Download ${size}`;
    actions.append(cancel, download);
    const keep = document.createElement('label');
    keep.className = 'keep';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.name = 'keep';
    box.checked = true;
    keep.append(box, ' Keep the files in this browser, so the example starts without downloading next time');
    form.append(heading, detail, keep, actions);
    dialog.append(form);
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'download' && {keep: box.checked});
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
    download.focus();
  });
}
