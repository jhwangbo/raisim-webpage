import {SerialTasks} from './serial-tasks.mjs';
import {RenderPanel, moduleBridge} from './render-panel.mjs';
import {RobotFiles, droppedRobot, loadRobotCatalog} from './robot-library.mjs';
import {degreesFromQuaternion, emptyScene, MAX_OBJECTS, MAX_ROBOTS, newObject, newRobot, nextObjectId, parseDraft, parseSceneNumber, quaternionFromDegrees, SceneHistory, serializeRscene, starterScene, validateScene} from './scene-model.mjs';
import {LoadProgress, resolveSiteLinks} from './tool-ui.mjs';
import {TouchTracker} from './touch-input.mjs';
import {ensureBrowserIsolation, loadWasmBundle, openProgramStore, requireBrowserGraphics} from './wasm-cache.mjs';

const tasks = new SerialTasks();
const $ = id => document.getElementById(id);
const canvas = $('canvas'), status = $('status');
const progress = new LoadProgress($('loading'));
const DRAFT_KEY = 'raisim-browser-scene-v1';
const RECOVERY_KEY = DRAFT_KEY + '-recovery';
let initial = starterScene(), draftNote = '', recoveryDraft,
    backupPending = false;
try {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved) {
    try {
      initial = parseDraft(saved);
      draftNote = 'Restored your local draft.';
    } catch {
      recoveryDraft = saved;
      backupPending = true;
      draftNote =
          'The saved draft could not be restored. Its original data is available below.';
    }
  }
  recoveryDraft ||= localStorage.getItem(RECOVERY_KEY);
} catch {
  draftNote = 'Draft storage is unavailable. Export your scene to save it.';
}
const history = new SceneHistory(initial);
let selected = null, sim, loading, ready = false, running = false,
    preview = false;
let suspended = false;
let dirty = true, resizeDirty = true, lastRatio = 0, lastTime = 0, time = 0;
let tool = 'move', pointer, dragScene, pendingMove, rotationInputs;
// Two fingers pinch to zoom and drag together to orbit, and cancel whatever one finger started.
const touches = new TouchTracker();
let moduleRetry = 0, bundleStorage;
for (const input of document.querySelectorAll('input[type="number"]'))
  input.step = 'any';
const index = () =>
    history.current.objects.findIndex(object => object.id === selected);
const selection = () => history.current.objects[index()];
const clone = () => structuredClone(history.current);
const number = id => parseSceneNumber($(id).value);
function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('error', error);
}
function check(value) {
  if (!value) throw Error(sim.UTF8ToString(sim._editor_error()));
}
function checkedTime(value) {
  if (value < 0) check(false);
  time = value;
  $('time').textContent = `${time.toFixed(2)} s`;
}
function protect(action) {
  return (...args) => {
    const event = args[0];
    if (event?.cancelable && ['submit','wheel','pointerdown'].includes(event.type)) event.preventDefault();
    if (event?.type === 'pointerdown' && ready) canvas.setPointerCapture(event.pointerId);
    if (event?.type === 'keydown' && !(event.target instanceof Element && event.target.matches('input,select,textarea')) &&
        (['Delete','Backspace','Escape'].includes(event.key) || ((event.ctrlKey || event.metaKey) && ['z','y'].includes(event.key.toLowerCase()))))
      event.preventDefault();
    return tasks.run(() => action(...args)).catch(error => message(error.message,true));
  };
}
function saveDraft() {
  try {
    if (backupPending) {
      localStorage.setItem(RECOVERY_KEY, recoveryDraft);
      backupPending = false;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(history.current));
    $('draft-status').textContent = 'Draft saved in this browser';
  } catch {
    $('draft-status').textContent =
        'Draft storage unavailable · export to save';
  }
}
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (!resizeDirty && ratio === lastRatio && observer) return;
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(ratio, 2400 / Math.max(1, rect.width), 1600 / Math.max(1, rect.height));
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    dirty = true;
  }
  lastRatio = ratio;
  resizeDirty = false;
}
const observer = typeof ResizeObserver === 'function' ?
    new ResizeObserver(() => {
      resizeDirty = true;
    }) :
    null;
observer?.observe(canvas);
window.addEventListener('resize', () => {
  resizeDirty = true;
});
let robotFiles, robotLibraryError = '';
async function ensureRobots(scene) {
  for (const object of scene.objects) {
    if (object.type !== 'robot') continue;
    if (!robotFiles) throw Error(robotLibraryError || 'The robot library is still loading.');
    await robotFiles.ensure(sim, object.source, event => progress.update(event));
  }
  progress.done();
}
async function loadScene(scene) {
  await ensureRobots(scene);
  const text = serializeRscene(scene), length = sim.lengthBytesUTF8(text);
  const address = sim._malloc(length + 1);
  if (!address) throw Error('The browser could not allocate scene memory.');
  try {
    sim.stringToUTF8(text, address, length + 1);
    check(await sim._editor_load(address, length));
  } finally {
    sim._free(address);
  }
  const captured = pointer?.id;
  pointer = dragScene = pendingMove = undefined;
  if (captured !== undefined && canvas.hasPointerCapture(captured))
    canvas.releasePointerCapture(captured);
  running = preview = false;
  time = lastTime = 0;
  dirty = true;
}
function controls() {
  const editing = ready && !preview, object = selection();
  $('run').disabled = !ready;
  $('run').dataset.running = String(running);
  $('run-label').textContent = running ? 'Pause' : preview ? 'Resume' : 'Simulate';
  $('step').disabled = $('reset').disabled = !ready;
  $('keep').disabled = !ready || !preview;
  $('add').disabled = !editing || history.current.objects.length >= MAX_OBJECTS;
  $('apply-physics').disabled = !editing;
  for (const id of ['gravity', 'friction', 'restitution'])
    $(id).disabled = !editing;
  $('object-fields').disabled = !editing;
  $('duplicate').disabled = !editing || !object || object.type === 'ground' ||
      history.current.objects.length >= MAX_OBJECTS;
  $('delete').disabled = !editing || !object;
  $('undo').disabled = !ready || !history.past.length;
  $('redo').disabled = !ready || !history.future.length;
  $('mode-label').textContent = running ? 'SIMULATING' :
      preview                           ? 'PREVIEW PAUSED' :
                                          'EDIT';
  $('mode-label').dataset.mode = running ? 'running' : preview ? 'preview' : 'edit';
  $('time').textContent = `${time.toFixed(2)} s`;
}
function inspector() {
  const object = selection();
  $('no-selection').hidden = !!object;
  $('inspector-form').hidden = !object;
  $('object-type').textContent = object?.type || 'No selection';
  if (!object) return;
  $('name').value = object.name;
  const robot = object.type === 'robot';
  $('robot-fields').hidden = !robot;
  $('motion-field').hidden = $('appearance-fields').hidden = robot;
  for (const id of ['motion', 'mass', 'color', 'sx', 'sy', 'sz', 'radius', 'height'])
    $(id).disabled = robot;
  if (robot) {
    $('robot-source').textContent = object.source;
    ['px', 'py', 'pz'].forEach((id, i) => {
      $(id).value = object.position[i];
      $(id).disabled = false;
    });
    rotationInputs = degreesFromQuaternion(object.rotation).map(String);
    ['rx', 'ry', 'rz'].forEach((id, i) => {
      $(id).value = rotationInputs[i];
    });
    $('rotation-fields').hidden = false;
    $('size-fields').hidden = $('radius-field').hidden = $('height-field').hidden = true;
    return;
  }
  $('motion').value = object.motion;
  const ground = object.type === 'ground';
  $('motion').disabled = ground;
  ['px', 'py', 'pz'].forEach((id, i) => {
    $(id).value = object.position[i];
    $(id).disabled = ground && i < 2;
  });
  rotationInputs = degreesFromQuaternion(object.rotation).map(String);
  ['rx', 'ry', 'rz'].forEach((id, i) => {
    $(id).value = rotationInputs[i];
  });
  ['sx', 'sy', 'sz'].forEach((id, i) => {
    $(id).value = object.size[i];
  });
  $('radius').value = object.radius;
  $('height').value = object.height;
  $('mass').value = object.mass;
  $('mass').disabled = object.motion === 'static';
  $('color').value = object.color;
  $('rotation-fields').hidden = ground;
  $('size-fields').hidden = !['box', 'ground'].includes(object.type);
  $('radius-field').hidden =
      !['sphere', 'cylinder', 'capsule'].includes(object.type);
  $('height-field').hidden = !['cylinder', 'capsule'].includes(object.type);
  $('height-unit').textContent =
      object.type === 'capsule' ? 'm · between cap centers' : 'm';
}
function refresh() {
  const list = $('object-list');
  list.replaceChildren();
  for (const object of history.current.objects) {
    const option = document.createElement('option');
    option.value = object.id;
    option.textContent = object.name;
    option.selected = object.id === selected;
    list.append(option);
  }
  if (index() < 0) {
    selected = null;
    list.selectedIndex = -1;
  }
  $('object-count').textContent =
      `${history.current.objects.length} / ${MAX_OBJECTS}`;
  for (const id of ['gravity', 'friction', 'restitution'])
    $(id).value = history.current[id];
  inspector();
  controls();
  dirty = true;
}
async function commit(scene, id = selected) {
  const next = validateScene(scene);
  await loadScene(next);
  history.commit(next);
  selected = id;
  saveDraft();
  refresh();
}
function choose(id) {
  selected = id;
  $('object-list').value = id ?? '';
  inspector();
  controls();
  dirty = true;
}
async function add(type, source) {
  if (!ready || preview) return;
  const next = clone(), id = nextObjectId(next.objects);
  const object =
      source ? structuredClone(source) : newObject(type, id, [0, 0, 1]);
  object.id = id;
  if (source) {
    object.name =
        `${source.type[0].toUpperCase() + source.type.slice(1)} ${id}`;
    object.position[0] = Math.min(20, object.position[0] + .5);
    object.position[1] = Math.min(20, object.position[1] + .5);
  }
  const names = new Set(next.objects.map(item => item.name));
  const baseName = object.name;
  for (let suffix = 2; names.has(object.name); ++suffix)
    object.name = `${baseName} (${suffix})`;
  next.objects.push(object);
  await commit(next, id);
  message(`Added ${object.name}. Drag to move, or edit its properties.`);
}
$('add').addEventListener('click', protect(async () => await add($('shape').value)));
$('object-list')
    .addEventListener('change', () => choose(Number($('object-list').value)));
$('new-scene').addEventListener('click', protect(async () => {
                                  if (ready) {
                                    await commit(emptyScene(), null);
                                    message(
                                        'New scene. Add a primitive to begin.');
                                  }
                                }));
$('starter').addEventListener('click', protect(async () => {
                                if (ready) {
                                  await commit(starterScene(), null);
                                  message('Starter scene loaded.');
                                }
                              }));
$('duplicate').addEventListener('click', protect(async () => {
                                  if (selection())
                                    await add(selection().type, selection());
                                }));
async function remove() {
  if (!ready || preview || !selection()) return;
  const next = clone();
  next.objects.splice(index(), 1);
  await commit(next, null);
  message('Object deleted.');
}
$('delete').addEventListener('click', protect(remove));
async function historyAction(redo) {
  if (!ready) return;
  const candidate = (redo ? history.future : history.past).at(-1);
  if (!candidate) return;
  await loadScene(candidate);
  redo ? history.redo() : history.undo();
  saveDraft();
  refresh();
  message(redo ? 'Change restored.' : 'Change undone.');
}
$('undo').addEventListener('click', protect(async () => await historyAction(false)));
$('redo').addEventListener('click', protect(async () => await historyAction(true)));
$('inspector-form')
    .addEventListener(
        'submit', protect(async event => {
          event.preventDefault();
          if (!ready || preview || !selection()) return;
          const next = clone(), object = next.objects[index()];
          object.name = $('name').value;
          object.position = ['px', 'py', 'pz'].map(number);
          const values = ['rx', 'ry', 'rz'].map(id => $(id).value);
          if (object.type !== 'ground' &&
              values.some((value, i) => value !== rotationInputs[i]))
            object.rotation =
                quaternionFromDegrees(values.map(parseSceneNumber));
          if (object.type === 'robot') {
            await commit(next);
            message('Robot changes applied.');
            return;
          }
          object.motion = $('motion').value;
          object.size = ['sx', 'sy', 'sz'].map(number);
          object.radius = number('radius');
          object.height = number('height');
          object.mass = number('mass');
          object.color = $('color').value;
          await commit(next);
          message('Object changes applied.');
        }));
$('motion').addEventListener('change', () => {
  $('mass').disabled = $('motion').value === 'static';
});
$('physics-form')
    .addEventListener('submit', protect(async event => {
                        event.preventDefault();
                        if (!ready || preview) return;
                        const next = clone();
                        for (const id of ['gravity', 'friction', 'restitution'])
                          next[id] = number(id);
                        await commit(next);
                        message('World settings applied.');
                      }));
$('run').addEventListener(
    'click', protect(async () => {
      if (!ready) return;
      await finishPointer();
      preview = true;
      running = !running;
      lastTime = 0;
      dirty = true;
      controls();
      message(
          running ?
              'Simulating. Reset returns to your layout; Keep poses adopts the current poses.' :
              'Preview paused. Export still saves the authored layout.');
    }));
$('step').addEventListener('click', protect(async () => {
                             if (!ready) return;
                             await finishPointer();
                             preview = true;
                             running = false;
                             checkedTime(await sim._editor_step(1, index()));
                             dirty = false;
                             controls();
                             message('Advanced one 2 ms physics step.');
                           }));
$('reset').addEventListener('click', protect(async () => {
                              if (ready) {
                                await loadScene(history.current);
                                controls();
                                message('Returned to the authored layout.');
                              }
                            }));
$('keep').addEventListener(
    'click', protect(async () => {
      if (!ready || !preview) return;
      const pointer = sim._editor_state();
      check(pointer);
      const poses = JSON.parse(sim.UTF8ToString(pointer)), next = clone();
      if (poses.length !== next.objects.length)
        throw Error('Scene and pose counts differ.');
      next.objects.forEach((object, i) => {
        const pose = Array.isArray(poses[i]) ? poses[i] : poses[i].pose;
        object.position = pose.slice(0, 3);
        object.rotation = pose.slice(3);
        if (object.type === 'robot') object.coordinate = poses[i].gc;
      });
      await commit(next);
      message(
          'Preview poses are now the authored layout. Velocities were reset.');
    }));
for (const kind of ['shapes', 'robots'])
  $('tab-' + kind).addEventListener('click', () => {
    for (const other of ['shapes', 'robots']) {
      $('tab-' + other).setAttribute('aria-selected', String(other === kind));
      $(other + '-pane').hidden = other !== kind;
    }
  });
function uniqueName(base, objects) {
  const names = new Set(objects.map(object => object.name));
  let name = base;
  for (let suffix = 2; names.has(name); ++suffix) name = `${base} (${suffix})`;
  return name;
}
async function addRobot(source, name, height, catalog) {
  if (!ready || preview) return;
  const next = clone();
  if (next.objects.filter(object => object.type === 'robot').length >= MAX_ROBOTS)
    throw Error(`A scene can contain at most ${MAX_ROBOTS} robots.`);
  const id = nextObjectId(next.objects), robotName = uniqueName(name, next.objects);
  next.objects.push(newRobot(id, source, robotName, [0, 0, height], catalog));
  await commit(next, id);
  message(`Added ${robotName}. Drag to move it, or simulate to see it fall and settle.`);
}
function renderRobotGrid() {
  const grid = $('robot-grid');
  if (!robotFiles) {
    grid.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'hint', textContent: robotLibraryError || 'Loading the robot library…'}));
    return;
  }
  const query = $('robot-search').value.trim().toLowerCase();
  const cards = [];
  let category;
  for (const robot of robotFiles.manifest.robots) {
    if (query && !`${robot.name} ${robot.category} ${robot.id}`.toLowerCase().includes(query)) continue;
    if (robot.category !== category) {
      category = robot.category;
      cards.push(Object.assign(document.createElement('h3'), {className: 'robot-category', textContent: category}));
    }
    const card = document.createElement('button');
    card.className = 'robot-card';
    card.dataset.robot = robot.id;
    card.title = `${robot.name} · ${(robot.bytes / 1048576).toFixed(1)} MB`;
    const image = Object.assign(document.createElement('img'), {src: `assets/${robot.preview}`, alt: '',
                                                                 loading: 'lazy', decoding: 'async'});
    const label = Object.assign(document.createElement('span'), {textContent: robot.name});
    card.append(image, label);
    card.addEventListener('click', protect(async () => {
      await addRobot(robot.source, robot.name, robot.spawnHeight, robot.id);
    }));
    cards.push(card);
  }
  if (!cards.length) cards.push(Object.assign(document.createElement('p'), {className: 'hint', textContent: 'No robot matches.'}));
  grid.replaceChildren(...cards);
}
$('robot-search').addEventListener('input', renderRobotGrid);
const dropOverlay = $('drop-overlay');
let dragDepth = 0;
const carriesFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
document.addEventListener('dragenter', event => {
  if (!carriesFiles(event)) return;
  event.preventDefault();
  ++dragDepth;
  dropOverlay.hidden = !ready || preview;
});
document.addEventListener('dragover', event => {
  if (carriesFiles(event)) event.preventDefault();
});
document.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    dropOverlay.hidden = true;
  }
});
document.addEventListener('drop', event => {
  if (!carriesFiles(event)) return;
  event.preventDefault();
  dragDepth = 0;
  dropOverlay.hidden = true;
  const dropped = droppedRobot(event.dataTransfer);
  return tasks.run(async () => {
    if (!ready || preview) throw Error('Return to editing before adding a robot.');
    if (!robotFiles) throw Error(robotLibraryError || 'The robot library is still loading.');
    const robot = await dropped;
    let folder = robot.folder;
    for (let suffix = 2; robotFiles.written.has(`robots/${folder}`); ++suffix) folder = `${robot.folder}-${suffix}`;
    const stored = await robotFiles.addDropped(sim, folder, robot.files);
    await addRobot(`robots/${folder}/${robot.urdf}`, folder, 1, null);
    if (robot.others.length) message(`Added ${folder} from ${robot.urdf}; the drop also held ${robot.others.join(', ')}.`);
    if (!stored) message(`Added ${folder}. Browser storage is unavailable, so a reload forgets its files.`);
  }).catch(error => message(error.message, true));
});
function downloadText(text, filename) {
  const url =
      URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').addEventListener(
    'click', protect(async () => {
      downloadText(serializeRscene(history.current), 'scene.rscene');
      const robots = history.current.objects.some(object => object.type === 'robot');
      message(robots ?
          'Exported scene.rscene. Its robots name rsc/… (raisim2Lib\'s rsc folder) and robots/… paths next to the scene.' :
          'Exported the authored scene to scene.rscene. Open it in RaiSim or RaiSim Engine 2.');
    }));
for (const mode of ['move', 'orbit'])
  $(mode + '-tool').addEventListener('click', () => {
    tool = mode;
    $('move-tool').setAttribute('aria-pressed', String(mode === 'move'));
    $('orbit-tool').setAttribute('aria-pressed', String(mode === 'orbit'));
  });
function pick(event, height, hitObjects = true) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  const pointer = sim._editor_pick(x, y, height, Number(hitObjects));
  check(pointer);
  return JSON.parse(sim.UTF8ToString(pointer));
}
canvas.addEventListener('contextmenu', event => event.preventDefault());
// Fingers are tracked as their events arrive, ahead of the serialized handlers below, so a finger
// lifted while those are busy is never left behind. A finger lifted over a panel leaves the canvas
// without its pointerup, so lifts are taken from the window.
canvas.addEventListener('pointerdown', event => touches.down(event), {capture: true});
canvas.addEventListener('pointermove', event => touches.move(event), {capture: true});
for (const type of ['pointerup', 'pointercancel'])
  window.addEventListener(type, event => touches.lift(event), {capture: true});
window.addEventListener('blur', () => touches.clear());
canvas.addEventListener(
    'pointerdown', protect(async event => {
      if (event.pinchGesture) {
        if (pointer && ready) {
          // The first finger keeps its pointer capture through the cancelled drag, for the pinch.
          pointer.id = undefined;
          await finishPointer(true);
        }
        return;
      }
      if (!ready || pointer) return;
      event.preventDefault();
      canvas.focus();
      const hit = pick(event, 0);
      let object;
      if (event.button === 0 && tool === 'move') {
        object = history.current.objects[hit.index];
        choose(object?.id ?? null);
      }
      if (!canvas.hasPointerCapture(event.pointerId)) return;
      const move = event.button === 0 && tool === 'move' && !preview &&
          object && object.type !== 'ground';
      const point = move ? pick(event, object.position[2], false).point : null;
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        move: !!(move && point),
        position: object?.position,
        point,
        objectIndex: hit.index
      };
      if (pointer.move) dragScene = clone();
      canvas.setPointerCapture(event.pointerId);
    }));
function updatePointer(event) {
  if (touches.pinch && touches.has(event.pointerId)) {
    const step = ready && touches.advance();
    if (step) {
      check(sim._editor_orbit(-step.dx * .007, step.dy * .007, Math.max(-1, Math.min(1, step.zoom))));
      dirty = true;
    }
    return;
  }
  if (!pointer || event.pointerId !== pointer.id || !ready) return;
  if (pointer.move) {
    const point = pick(event, pointer.position[2], false).point;
    if (!point) return;
    const position = [
      Math.max(
          -20, Math.min(20, pointer.position[0] + point[0] - pointer.point[0])),
      Math.max(
          -20, Math.min(20, pointer.position[1] + point[1] - pointer.point[1])),
      pointer.position[2]
    ];
    dragScene.objects[pointer.objectIndex].position = position;
    pendingMove = {index: pointer.objectIndex, position};
    dirty = true;
  } else {
    check(sim._editor_orbit(
        (pointer.x - event.clientX) * .007, (event.clientY - pointer.y) * .007,
        0));
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    dirty = true;
  }
}
canvas.addEventListener('pointermove', protect(updatePointer));
function flushMove() {
  if (pendingMove) {
    check(sim._editor_move(pendingMove.index, ...pendingMove.position));
    pendingMove = undefined;
  }
}
async function finishPointer(cancel = false) {
  if (!pointer) return;
  if (pointer.move && dragScene) {
    if (cancel) {
      await loadScene(history.current);
    } else {
      flushMove();
      history.commit(dragScene);
      saveDraft();
      refresh();
    }
  }
  pendingMove = dragScene = undefined;
  pointer = undefined;
}
canvas.addEventListener('pointerup', protect(async event => {
                          if (event.pointerId !== pointer?.id) return;
                          if (pointer.move) updatePointer(event);
                          await finishPointer();
                        }));
canvas.addEventListener('pointercancel', protect(async event => {
                          if (event.pointerId === pointer?.id)
                            await finishPointer(true);
                        }));
canvas.addEventListener('lostpointercapture', protect(async event => {
                          if (event.pointerId === pointer?.id)
                            await finishPointer(true);
                        }));
canvas.addEventListener(
    'wheel', protect(async event => {
      if (!ready) return;
      event.preventDefault();
      check(sim._editor_orbit(
          0, 0, Math.max(-1, Math.min(1, event.deltaY * .001))));
      dirty = true;
    }),
    {passive: false});
document.addEventListener(
    'keydown', protect(async event => {
      if (event.target instanceof Element &&
          event.target.matches('input,select,textarea'))
        return;
      if ((event.ctrlKey || event.metaKey) &&
          ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        await historyAction(event.shiftKey || event.key.toLowerCase() === 'y');
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        await remove();
      } else if (event.key === 'Escape')
        await finishPointer(true);
    }));
window.addEventListener('blur', protect(async () => await finishPointer(true)));
document.addEventListener('visibilitychange', protect(async () => {
                            if (document.hidden) await finishPointer(true);
                            lastTime = 0;
                            dirty = true;
                          }));

window.addEventListener('pagehide', protect(async event => {
                          suspended = true;
                          lastTime = 0;
                          try {
                            await finishPointer(true);
                          } finally {
                            if (!event.persisted) {
                              ready = false;
                              await sim?._editor_dispose();
                            }
                          }
                        }));
window.addEventListener('pageshow', protect(async event => {
  if (!event.persisted) return;
  suspended = false;
  lastTime = 0;
  resizeDirty = dirty = true;
}));
async function renderFrame(now) {
  try {
    if (!suspended) {
      resize();
      if (ready && !document.hidden && (dirty || running)) {
        flushMove();
        checkedTime(await sim._editor_frame(
            lastTime ? (now - lastTime) / 1000 : 0, Number(running), index()));
        dirty = false;
      }
      lastTime = now;
    }
  } catch (error) {
    ready = running = false;
    controls();
    message(error.message, true);
  }
  requestAnimationFrame(frame);
}
function frame(now) { tasks.run(() => renderFrame(now)).catch(error => message(error.message,true)); }

async function boot() {
  if (loading) return loading;
  message('Loading RaiSim and Rayrai…');
  loading =
      (async () => {
        await ensureBrowserIsolation();
        requireBrowserGraphics();
        if (sim) await sim._editor_dispose();
        else {
          progress.stage('Checking the simulator version');
          const bundle = await loadWasmBundle(import.meta.url, globalThis, 'raisim-editor',
              event => progress.update(event));
          progress.stage('Compiling RaiSim and starting WebGPU');
          const {createRayraiWebGpu} = await import(bundle.graphicsUrl.href);
          const programs = openProgramStore(import.meta.url, 'raisim-editor', bundle.version);
          if (moduleRetry)
            bundle.moduleUrl.searchParams.set('retry', moduleRetry);
          let create;
          try {
            ({default: create} = await import(bundle.moduleUrl.href));
          } catch (error) {
            ++moduleRetry;
            throw error;
          }
          sim = await create({
            mainScriptUrlOrBlob: bundle.moduleUrl.href,
            canvas,
            createRayraiWebGpu: async (element, memory) => {
              const gpu = await createRayraiWebGpu(element, memory);
              gpu.savedPrograms = await programs;
              gpu.session.onError = error => {
                ready = running = false;
                pointer = dragScene = pendingMove = undefined;
                loading = undefined;
                retry.hidden = false;
                controls();
                message(`${error.message} Click Retry to load again.`,true);
              };
              return gpu;
            },
            wasmBinary: bundle.wasmBinary,
            print: () => {},
            printErr: value => console.error(value),
            onAbort: () => {
              ready = running = false;
              controls();
              message(
                  'The simulator stopped. Export your layout and reload.', true);
            }
          });
          bundleStorage = bundle.storage;
        }
        resize();
        if (!robotFiles) {
          try {
            robotFiles = new RobotFiles(import.meta.url, await loadRobotCatalog(import.meta.url));
          } catch (error) {
            robotLibraryError = error.message;
          }
          renderRobotGrid();
        }
        const restored = [];
        for (const object of history.current.objects) {
          if (object.type !== 'robot') continue;
          try {
            await robotFiles?.ensure(sim, object.source, event => progress.update(event));
          } catch (error) {
            restored.push(object.name);
          }
        }
        if (restored.length) {
          const kept = clone();
          kept.objects = kept.objects.filter(object => !restored.includes(object.name));
          history.commit(kept);
          draftNote = `Removed ${restored.join(', ')}: the robot files are no longer in this browser.`;
        }
        progress.stage('Building the scene');
        await loadScene(history.current);
        progress.done();
        preview = false;
        checkedTime(await sim._editor_frame(0, 0, index()));
        dirty = false;
        ready = true;
        refresh();
        $('cache-status').textContent = bundleStorage === 'reused' ?
            'Using the simulator saved in this browser. No scene uploads.' :
            bundleStorage === 'saved' ?
            'Simulator saved in this browser. No scene uploads.' :
            'Browser storage unavailable. Physics runs locally.';
        message(
            draftNote ||
            'Select an object, drag to move, or add a new primitive.');
      })().catch(async error => {
        progress.done();
        ready = running = false;
        await sim?._editor_dispose();
        controls();
        message(`${error.message} Click Retry to load again.`, true);
        retry.hidden = false;
        loading = undefined;
      });
  return loading;
}
const retry = document.createElement('button');
const recover = document.createElement('button');
recover.id = 'recover-draft';
recover.textContent = 'Download previous draft';
recover.hidden = !recoveryDraft;
recover.addEventListener(
    'click', protect(async () => downloadText(recoveryDraft, 'previous-draft.json')));
retry.id = 'retry';
retry.textContent = 'Retry';
retry.hidden = true;
retry.addEventListener('click', () => {
  retry.hidden = true;
  return tasks.run(boot).then(attachRenderPanel).catch(error => message(error.message,true));
});
$('status-actions').append(retry, recover);
const compact = matchMedia('(max-width: 760px)');
const panels = {library: 'library', inspector: 'inspector', render: 'render-panel'};
function showPanel(name, open) {
  $(panels[name]).classList.toggle('collapsed', !open);
  $('toggle-' + name).setAttribute('aria-pressed', String(open));
}
// The inspector and render settings share the right side; on small screens one panel shows at a time.
for (const name of Object.keys(panels))
  $('toggle-' + name).addEventListener('click', () => {
    const open = $(panels[name]).classList.contains('collapsed');
    if (open)
      for (const other of Object.keys(panels))
        if (other !== name && (compact.matches || (other !== 'library' && name !== 'library'))) showPanel(other, false);
    showPanel(name, open);
  });
let renderPanel;
async function attachRenderPanel() {
  if (renderPanel || !ready) return;
  renderPanel = new RenderPanel($('render-panel'), moduleBridge(sim, 'editor', task => tasks.run(task)),
                                'raisim-render-editor-v1', text => message(text, true));
  try {
    await renderPanel.attach();
  } catch (error) {
    renderPanel = undefined;
    message(error.message, true);
  }
}
function fitPanels() {
  showPanel('render', false);
  if (!compact.matches) return;
  showPanel('library', false);
  showPanel('inspector', false);
}
compact.addEventListener('change', fitPanels);
fitPanels();
resolveSiteLinks(import.meta.url);
refresh();
requestAnimationFrame(frame);
tasks.run(boot).then(attachRenderPanel).catch(error => message(error.message,true));
