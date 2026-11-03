const PRESETS = ['Fast', 'Balanced', 'High', 'Ultra'];

function hex(rgb) {
  return '#' + rgb.map(value => Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, '0'))
      .join('');
}

function rgb(text) {
  return [1, 3, 5].map(i => parseInt(text.slice(i, i + 2), 16) / 255);
}

function formatted(value, field) {
  if (field.type === 'int') return String(Math.round(value));
  const digits = field.max - field.min <= 0.1 ? 4 : field.max - field.min <= 2 ? 2 : 1;
  return Number(value).toFixed(digits);
}

// The render settings panel. bridge: {run(task), schema(), values(), apply(json, preset)} where apply
// returns "" or an error message; every call runs through bridge.run so it never interleaves a frame.
export class RenderPanel {
  constructor(root, bridge, storageKey, onError) {
    this.root = root;
    this.bridge = bridge;
    this.storageKey = storageKey;
    this.onError = onError;
    this.controls = new Map();
    this.pending = {};
    this.flushing = false;
  }

  saved() {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  remember(preset, values) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({preset, values}));
    } catch {}
  }

  // Builds the controls once the renderer exists and restores this viewer's saved settings.
  async attach() {
    const schema = JSON.parse(await this.bridge.run(() => this.bridge.schema()) || '[]');
    if (!schema.length) throw new Error('The renderer is not ready yet.');
    const saved = this.saved();
    if (saved) {
      const error = await this.bridge.run(() => this.bridge.apply(JSON.stringify(saved.values || {}),
                                                                   PRESETS.indexOf(saved.preset)));
      if (error) this.remember(null, {});
    }
    this.preset = saved?.preset || 'Balanced';
    this.build(schema);
    await this.refresh();
  }

  build(schema) {
    const body = this.root.querySelector('.render-body');
    const preset = this.root.querySelector('.render-preset');
    preset.replaceChildren(...[...PRESETS, 'Custom'].map(name => new Option(name, name)));
    preset.value = this.preset;
    preset.addEventListener('change', () => this.usePreset(preset.value));
    const groups = new Map();
    for (const field of schema) {
      if (!groups.has(field.group)) {
        const details = document.createElement('details');
        details.className = 'render-group';
        details.open = groups.size === 0;
        const summary = document.createElement('summary');
        summary.textContent = field.group;
        details.append(summary);
        groups.set(field.group, details);
      }
      groups.get(field.group).append(this.control(field));
    }
    body.replaceChildren(...groups.values());
  }

  control(field) {
    const row = document.createElement('label');
    row.className = `render-row render-${field.type}`;
    const name = document.createElement('span');
    name.className = 'render-label';
    name.textContent = field.label;
    let input, output;
    if (field.type === 'bool') {
      input = Object.assign(document.createElement('input'), {type: 'checkbox', className: 'switch'});
      input.addEventListener('change', () => this.change(field.key, input.checked));
      row.append(name, input);
    } else if (field.type === 'choice') {
      input = document.createElement('select');
      for (const entry of field.choices.split(';')) {
        const [value, label] = entry.split('=');
        input.append(new Option(label, value));
      }
      input.addEventListener('change', () => this.change(field.key, Number(input.value)));
      row.append(name, input);
    } else if (field.type === 'color') {
      input = Object.assign(document.createElement('input'), {type: 'color'});
      input.addEventListener('input', () => this.change(field.key, rgb(input.value).map(v => v * field.max)));
      row.append(name, input);
    } else {
      const step = field.step || (field.max - field.min) / 200;
      input = Object.assign(document.createElement('input'), {type: 'range', min: field.min, max: field.max, step});
      output = document.createElement('output');
      input.addEventListener('input', () => {
        output.value = formatted(Number(input.value), field);
        this.change(field.key, Number(input.value));
      });
      const line = document.createElement('span');
      line.className = 'render-line';
      line.append(name, output);
      row.append(line, input);
    }
    this.controls.set(field.key, {field, input, output});
    return row;
  }

  show(values) {
    for (const [key, {field, input, output}] of this.controls) {
      const value = values[key];
      if (value === undefined) continue;
      if (field.type === 'bool') input.checked = value;
      else if (field.type === 'color') input.value = hex(value.map(v => v / field.max));
      else input.value = String(value);
      if (output) output.value = formatted(value, field);
    }
  }

  async refresh() {
    this.show(JSON.parse(await this.bridge.run(() => this.bridge.values()) || '{}'));
  }

  async usePreset(name) {
    if (name === 'Custom') return;
    const error = await this.bridge.run(() => this.bridge.apply('', PRESETS.indexOf(name)));
    if (error) return this.onError(error);
    this.preset = name;
    this.remember(name, {});
    await this.refresh();
  }

  change(key, value) {
    this.pending[key] = value;
    this.root.querySelector('.render-preset').value = 'Custom';
    if (this.flushing) return;
    this.flushing = true;
    requestAnimationFrame(() => this.flush());
  }

  async flush() {
    const changes = this.pending;
    this.pending = {};
    try {
      const error = await this.bridge.run(() => this.bridge.apply(JSON.stringify(changes), -1));
      if (error) {
        this.onError(error);
        await this.refresh();
        return;
      }
      const values = JSON.parse(await this.bridge.run(() => this.bridge.values()) || '{}');
      const saved = this.saved();
      this.remember(saved?.preset || this.preset, {...(saved?.values || {}), ...changes});
      this.show(values);
    } finally {
      this.flushing = false;
      if (Object.keys(this.pending).length) {
        this.flushing = true;
        requestAnimationFrame(() => this.flush());
      }
    }
  }
}

// Calls a module's render-settings exports with a UTF-8 argument.
export function moduleBridge(module, prefix, run) {
  return {
    run,
    schema: () => module.UTF8ToString(module[`_${prefix}_render_settings`](1)),
    values: () => module.UTF8ToString(module[`_${prefix}_render_settings`](0)),
    apply(json, preset) {
      const length = module.lengthBytesUTF8(json);
      const address = module._malloc(length + 1);
      if (!address) return 'The browser could not allocate memory for render settings.';
      try {
        module.stringToUTF8(json, address, length + 1);
        return module.UTF8ToString(module[`_${prefix}_render_apply`](address, length, preset));
      } finally {
        module._free(address);
      }
    },
  };
}
