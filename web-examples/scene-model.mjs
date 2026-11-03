export const MAX_OBJECTS = 128;
export const MAX_ROBOTS = 16;
export const MAX_DRAFT_LENGTH = 256 * 1024;
export const TYPES = ['box', 'sphere', 'cylinder', 'capsule', 'ground'];
const ROBOT_SOURCE = /^(?:rsc|robots)(?:\/(?!\.{1,2}(?:\/|$))[^/\\:\u0000-\u001f]+)+\.urdf$/;

export function newRobot(id, source, name, position = [0, 0, 1], catalog = null) {
  return {id, type: 'robot', name, source, catalog, position: [...position], rotation: [1, 0, 0, 0],
          coordinate: []};
}
const MIN_NORMAL = 2 ** -1022;
const finite = (value, low, high) => typeof value === 'number' &&
    Number.isFinite(value) && value >= low && value <= high;
const require = (value, message) => {
  if (!value) throw Error(message);
};

export function newObject(type, id, position = [0, 0, 1]) {
  require(TYPES.includes(type), 'Choose a supported primitive.');
  return {
    id,
    type,
    name: type === 'ground' ? 'Ground' :
                              `${type[0].toUpperCase() + type.slice(1)} ${id}`,
    motion: type === 'ground' ? 'static' : 'dynamic',
    mass: 1,
    position: type === 'ground' ? [0, 0, 0] : [...position],
    rotation: [1, 0, 0, 0],
    size: type === 'ground' ? [20, 20, 1] : [.8, .8, .8],
    radius: .3,
    height: .8,
    color: type === 'ground' ? '#657582' : '#40b7a0'
  };
}

export function emptyScene() {
  return {
    schema: 1,
    gravity: -9.81,
    friction: .7,
    restitution: 0,
    objects: [newObject('ground', 1)]
  };
}

export function starterScene() {
  const scene = emptyScene();
  const ramp = newObject('box', 2, [-1.1, 0, .5]);
  Object.assign(ramp, {
    name: 'Ramp',
    motion: 'static',
    size: [2.2, 1.4, .2],
    rotation: quaternionFromDegrees([0, -18, 0]),
    color: '#7994d2'
  });
  const box = newObject('box', 3, [.6, 0, .5]);
  const ball = newObject('sphere', 4, [-1.5, 0, 1.6]);
  ball.color = '#eda45a';
  scene.objects.push(ramp, box, ball);
  return scene;
}

export function validateScene(value) {
  require(
      value?.schema === 1 && Array.isArray(value.objects),
      'Invalid editor scene.');
  require(
      value.objects.length <= MAX_OBJECTS,
      `A scene can contain at most ${MAX_OBJECTS} objects.`);
  require(
      finite(value.gravity, -30, 0) && finite(value.friction, 0, 2) &&
          finite(value.restitution, 0, 1),
      'Gravity, friction or restitution is outside the supported range.');
  const result = {
    schema: 1,
    gravity: value.gravity,
    friction: value.friction,
    restitution: value.restitution,
    objects: []
  };
  const ids = new Set(), names = new Set(), robots = [];
  const normalNumbers = values => require(
      values.every(v => v === 0 || Math.abs(v) >= MIN_NORMAL),
      'A value is too small for .rscene. Use zero or a larger magnitude.');
  normalNumbers([result.gravity, result.friction, result.restitution]);
  let grounds = 0;
  for (const source of value.objects) {
    require(
        source && typeof source === 'object' && !Array.isArray(source),
        'Invalid scene object.');
    const object = {};
    const robot = source.type === 'robot';
    for (const key of robot ?
             ['id', 'type', 'name', 'source', 'catalog', 'position', 'rotation', 'coordinate'] :
             ['id', 'type', 'name', 'motion', 'mass', 'position', 'rotation', 'size', 'radius',
              'height', 'color'])
      object[key] = source[key];
    require(
        Number.isSafeInteger(object.id) && object.id > 0 && !ids.has(object.id),
        'Object IDs must be unique.');
    ids.add(object.id);
    require(robot || TYPES.includes(object.type), 'Unsupported object type.');
    require(
        typeof object.name === 'string' && object.name.trim().length > 0 &&
            object.name.length <= 80 &&
            !/[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(object.name) &&
            !names.has(object.name),
        'Use a unique object name of 1–80 characters without control characters.');
    names.add(object.name);
    if (robot) {
      require(typeof object.source === 'string' && object.source.length <= 512 &&
                  ROBOT_SOURCE.test(object.source),
              'A robot needs a URDF in the scene\'s rsc or robots folder.');
      require(object.catalog === null || (typeof object.catalog === 'string' &&
                  /^[a-z0-9_]{1,64}$/.test(object.catalog)),
              'Invalid robot library entry.');
      require(Array.isArray(object.position) && object.position.length === 3 &&
                  Array.from(object.position).every(v => finite(v, -20, 20)),
              'Position must be within −20 to 20 m on each axis.');
      require(Array.isArray(object.rotation) && object.rotation.length === 4 &&
                  Array.from(object.rotation).every(v => finite(v, -1, 1)),
              'Invalid orientation.');
      const length = Math.hypot(...object.rotation);
      require(length > 1e-8, 'Orientation must be a nonzero quaternion.');
      object.rotation = object.rotation.map(v => v / length);
      require(Array.isArray(object.coordinate) && object.coordinate.length <= 512 &&
                  Array.from(object.coordinate).every(v => finite(v, -1e6, 1e6)),
              'Invalid robot joint state.');
      normalNumbers([...object.position, ...object.rotation, ...object.coordinate]);
      object.position = [...object.position];
      object.coordinate = [...object.coordinate];
      robots.push(object);
      continue;
    }
    require(
        ['static', 'dynamic'].includes(object.motion),
        'Choose a static or dynamic body.');
    require(
        finite(object.mass, .01, 10000),
        'Mass must be between 0.01 and 10000 kg.');
    require(
        Array.isArray(object.position) && object.position.length === 3 &&
            Array.from(object.position).every(v => finite(v, -20, 20)),
        'Position must be within −20 to 20 m on each axis.');
    require(
        Array.isArray(object.size) && object.size.length === 3 &&
            Array.from(object.size).every(v => finite(v, .02, 20)),
        'Size must be between 0.02 and 20 m.');
    require(
        finite(object.radius, .01, 10) && finite(object.height, .02, 20),
        'Invalid radius or height.');
    require(
        Array.isArray(object.rotation) && object.rotation.length === 4 &&
            Array.from(object.rotation).every(v => finite(v, -1, 1)),
        'Invalid orientation.');
    const length = Math.hypot(...object.rotation);
    require(length > 1e-8, 'Orientation must be a nonzero quaternion.');
    object.rotation = object.rotation.map(v => v / length);
    require(
        typeof object.color === 'string' &&
            /^#[a-fA-F0-9]{6}$/.test(object.color),
        'Choose an RGB color.');
    if (object.type === 'ground') {
      ++grounds;
      require(
          object.motion === 'static' &&
              object.rotation.every((v, i) => v === (i ? 0 : 1)),
          'The ground must be static and unrotated.');
    }
    normalNumbers([
      ...object.position, ...object.rotation, ...object.size, object.mass,
      object.radius, object.height
    ]);
    object.position = [...object.position];
    object.size = [...object.size];
    result.objects.push(object);
  }
  require(grounds <= 1, 'Use at most one ground plane.');
  require(robots.length <= MAX_ROBOTS, `A scene can contain at most ${MAX_ROBOTS} robots.`);
  // RaiSim creates the robots after the primitives; keep the same order.
  result.objects.push(...robots);
  return result;
}

export function quaternionFromDegrees(degrees) {
  const [r, p, y] = degrees.map(v => v * Math.PI / 360);
  const cr = Math.cos(r), sr = Math.sin(r), cp = Math.cos(p), sp = Math.sin(p),
        cy = Math.cos(y), sy = Math.sin(y);
  return [
    cr * cp * cy + sr * sp * sy, sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy, cr * cp * sy - sr * sp * cy
  ];
}

export function degreesFromQuaternion([w, x, y, z]) {
  const r00 = 1 - 2 * (y * y + z * z), r10 = 2 * (x * y + w * z);
  const cosine = Math.hypot(r00, r10);
  const pitch = Math.atan2(2 * (w * y - z * x), cosine);
  const singular = cosine <= 8 * Number.EPSILON;
  const roll = singular ?
      Math.atan2(2 * (w * x - y * z), 1 - 2 * (x * x + z * z)) :
      Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
  const yaw = singular ? 0 : Math.atan2(r10, r00);
  return [roll, pitch, yaw].map(v => v * 180 / Math.PI);
}

export function parseDraft(text) {
  require(
      typeof text === 'string' && text.length <= MAX_DRAFT_LENGTH,
      'The saved draft exceeds the editor size limit.');
  // JSON.parse would erase a nonzero literal that underflows to zero.
  let quoted = false, escaped = false;
  for (let i = 0; i < text.length; ++i) {
    const c = text[i];
    if (quoted) {
      if (escaped)
        escaped = false;
      else if (c === '\\')
        escaped = true;
      else if (c === '"')
        quoted = false;
    } else if (c === '"') {
      quoted = true;
    } else if (c === '-' || (c >= '0' && c <= '9')) {
      let end = i + 1;
      while (end < text.length && /[0-9.eE+-]/.test(text[end])) ++end;
      parseSceneNumber(text.slice(i, end));
      i = end - 1;
    }
  }
  return validateScene(JSON.parse(text));
}

export function parseSceneNumber(text) {
  require(
      typeof text === 'string' &&
          /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()),
      'Enter a finite number.');
  const value = Number(text);
  require(Number.isFinite(value), 'Enter a finite number.');
  const significand = text.split(/[eE]/)[0];
  require(
      (value !== 0 || !/[1-9]/.test(significand)) &&
          (value === 0 || Math.abs(value) >= MIN_NORMAL),
      'A value is too small for .rscene. Use zero or a larger magnitude.');
  return value;
}

export function nextObjectId(objects) {
  const used = new Set(objects.map(object => object.id));
  let id = 1;
  while (used.has(id)) ++id;
  return id;
}

export function escapeToken(value) {
  if (value === '') return '-';
  if (value === '-') return '%2D';
  return encodeURIComponent(value).replace(
      /[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function serializeRscene(value) {
  const scene = validateScene(value);
  const lines = [
    'raisim_engine_scene 2', '# Created in the RaiSim browser scene editor.',
    'time_step 0.002', `gravity 0 0 ${scene.gravity}`,
    `solver 150 1e-8 1.5 accurate erp2=0.002 defaultFriction=${
        scene.friction} defaultStaticFriction=${
        scene.friction} defaultRestitution=${
        scene
            .restitution} defaultRestitutionThreshold=0.01 defaultStaticFrictionVelocityThreshold=1 fixedContactSolverIterationOrder=true`,
    'scene_graph inheritedTransforms=false'
  ];
  const resources = new Map();
  for (const object of scene.objects) {
    if (object.type !== 'robot' || resources.has(object.source)) continue;
    const id = `web_robot_source_${resources.size + 1}`;
    resources.set(object.source, id);
    lines.push(`articulated_resource ${id} ${escapeToken(object.source.split('/').at(-1))} ${
        escapeToken(object.source)}`);
  }
  for (const object of scene.objects) {
    if (object.type === 'robot') {
      const fields = [escapeToken(object.name), resources.get(object.source), ...object.position,
                      ...object.rotation, 'true', 'true'];
      const state = object.coordinate.length ?
          ` generalizedCoordinate=${object.coordinate.join(',')}` : '';
      lines.push(`articulated ${fields.join(' ')} id=web_robot_${object.id}${state}`);
      continue;
    }
    const material = `web_material_${object.id}`;
    const color =
        [1, 3, 5].map(i => parseInt(object.color.slice(i, i + 2), 16) / 255);
    lines.push(
        `material ${material} ${color.join(' ')} 1 0 0.55 id=${material}`);
    const scale =
        ['box', 'ground'].includes(object.type) ? object.size : [1, 1, 1];
    const fields = [
      escapeToken(object.name), object.type, ...object.position,
      ...object.rotation, ...scale, object.radius, object.height, object.mass,
      'default', material, 0, 1, object.motion === 'static' ? 1 : 0, '-',
      object.motion, 1, 1, '18446744073709551615'
    ];
    lines.push(`object ${fields.join(' ')} id=web_object_${object.id}`);
  }
  return lines.join('\n') + '\n';
}

export class SceneHistory {
  constructor(scene = starterScene()) {
    this.current = validateScene(scene);
    this.past = [];
    this.future = [];
  }
  commit(scene) {
    const next = validateScene(scene);
    if (JSON.stringify(next) === JSON.stringify(this.current)) return false;
    this.past.push(this.current);
    if (this.past.length > 100) this.past.shift();
    this.current = next;
    this.future = [];
    return true;
  }
  undo() {
    if (!this.past.length) return false;
    this.future.push(this.current);
    this.current = this.past.pop();
    return true;
  }
  redo() {
    if (!this.future.length) return false;
    this.past.push(this.current);
    this.current = this.future.pop();
    return true;
  }
}
