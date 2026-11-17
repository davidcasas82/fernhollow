/**
 * Approved Fernhollow sheets. Atlas JSON is the only description of a frame.
 * Sprites leave this module through drawImage.
 */

let book = null;

export function artBook() {
  return book;
}

export function installArt(next) {
  book = next;
  return book;
}

function integerScale(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${label} scale must be a positive integer`);
  }
  return n;
}

function frameBox(sprite, col, row) {
  return {
    sx: col * sprite.frame_w,
    sy: row * sprite.frame_h,
    sw: sprite.frame_w,
    sh: sprite.frame_h,
    ax: sprite.anchor.x,
    ay: sprite.anchor.y,
    scale: integerScale(sprite.scale, sprite.file || "sprite"),
  };
}

function indexedFrames(sprite) {
  const cols = sprite.columns || sprite.frame_count;
  const frames = [];
  for (let i = 0; i < sprite.frame_count; i++) {
    frames.push(frameBox(sprite, i % cols, Math.floor(i / cols)));
  }
  return frames;
}

function clipFromAnim(sprite, anim) {
  const frames = [];
  for (const ref of anim.frames) {
    if (typeof ref === "number") frames.push(indexedFrames(sprite)[ref]);
    else frames.push(frameBox(sprite, ref.col, ref.row));
  }
  if (!frames.length) throw new Error(`${sprite.file} has an empty animation`);
  return { frames, fps: Number(anim.fps) || 0 };
}

/**
 * Parse atlas.json plus courtyard-walls.json. Throws if a sheet the game
 * draws is missing. Images are attached later by bindArt or loadArt.
 */
export function parseAtlas(atlas, walls) {
  if (!atlas?.sprites || !atlas.behavior_ids) {
    throw new Error("atlas.json is missing sprites or behavior_ids");
  }
  const floor = walls?.walkable;
  if (!floor || ![floor.x, floor.y, floor.w, floor.h].every((n) => Number.isFinite(n))) {
    throw new Error("courtyard-walls.json has no walkable rect");
  }

  const sheets = {};
  const files = [];

  for (const [id, sprite] of Object.entries(atlas.sprites)) {
    if (id === "fx") continue;
    if (!sprite.file || !sprite.frame_w || !sprite.frame_h || !sprite.anchor) {
      throw new Error(`atlas sprite ${id} is missing frame data`);
    }
    const clips = {};
    for (const [name, anim] of Object.entries(sprite.animations || {})) {
      clips[name] = clipFromAnim(sprite, anim);
    }
    if (!clips.idle && id !== "ryan") throw new Error(`${id} has no idle animation`);
    const cols = sprite.columns || sprite.frame_count || 1;
    const rows = sprite.rows || Math.ceil((sprite.frame_count || 1) / cols);
    sheets[id] = { id, file: sprite.file, clips };
    files.push({
      file: sprite.file,
      w: sprite.frame_w * cols,
      h: sprite.frame_h * rows,
    });
  }

  const ryanNames = ["idle", "walk", "shoot"];
  const ryanDirs = ["down", "up", "left", "right"];
  for (const name of ryanNames) {
    for (const dir of ryanDirs) {
      const key = `${name}_${dir}`;
      if (!sheets.ryan?.clips[key]) throw new Error(`ryan is missing ${key}`);
    }
  }

  const fx = atlas.sprites.fx;
  if (!fx?.file || !fx.items) throw new Error("atlas is missing fx.png items");
  const fxClips = {};
  for (const [name, item] of Object.entries(fx.items)) {
    if (!item.frames?.length) throw new Error(`fx item ${name} has no frames`);
    const scale = integerScale(item.scale, `fx ${name}`);
    fxClips[name] = {
      fps: name === "hud" ? 0 : 8,
      frames: item.frames.map((f) => ({
        sx: f.x,
        sy: f.y,
        sw: f.w,
        sh: f.h,
        ax: f.anchor.x,
        ay: f.anchor.y,
        scale,
      })),
    };
  }
  for (const name of ["bolt", "sunseed", "hit", "poof", "shockwave", "hud"]) {
    if (!fxClips[name]) throw new Error(`fx.png is missing ${name}`);
  }
  sheets.fx = { id: "fx", file: fx.file, clips: fxClips };
  let fxW = 0;
  let fxH = 0;
  for (const item of Object.values(fx.items)) {
    for (const f of item.frames) {
      fxW = Math.max(fxW, f.x + f.w);
      fxH = Math.max(fxH, f.y + f.h);
    }
  }
  files.push({ file: fx.file, w: fxW, h: fxH });

  const behavior = { ...atlas.behavior_ids };
  for (const id of Object.values(behavior)) {
    if (!sheets[id]) throw new Error(`behavior sheet ${id} is not in the atlas`);
  }

  const courtyard = atlas.courtyard;
  const title = atlas.title;
  if (!courtyard?.file || !title?.named_file) {
    throw new Error("atlas is missing the courtyard or the named title");
  }
  files.push({ file: courtyard.file, w: courtyard.w, h: courtyard.h });
  files.push({ file: title.named_file, w: title.w, h: title.h });

  return {
    world: { w: atlas.world?.w || courtyard.w, h: atlas.world?.h || courtyard.h },
    floor: { x: floor.x, y: floor.y, w: floor.w, h: floor.h },
    sheets,
    behavior,
    files,
    courtyardFile: courtyard.file,
    titleFile: title.named_file,
  };
}

function imageSize(img) {
  return {
    w: img.naturalWidth || img.width || 0,
    h: img.naturalHeight || img.height || 0,
  };
}

export function bindArt(defs, images) {
  for (const file of defs.files) {
    const img = images[file.file];
    if (!img) throw new Error(`${file.file} did not load`);
    const size = imageSize(img);
    if (size.w !== file.w || size.h !== file.h) {
      throw new Error(`${file.file} is ${size.w}x${size.h}, atlas expects ${file.w}x${file.h}`);
    }
  }
  const sheets = {};
  for (const [id, sheet] of Object.entries(defs.sheets)) {
    sheets[id] = { ...sheet, image: images[sheet.file] };
  }
  return installArt({
    world: defs.world,
    floor: defs.floor,
    sheets,
    behavior: defs.behavior,
    courtyard: images[defs.courtyardFile],
    titleNamed: images[defs.titleFile],
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`${url} failed to load`));
    img.src = url;
  });
}

export async function loadArt(base = "assets/art/") {
  const atlasRes = await fetch(`${base}atlas.json`);
  const wallsRes = await fetch(`${base}courtyard-walls.json`);
  if (!atlasRes.ok) throw new Error("atlas.json failed to load");
  if (!wallsRes.ok) throw new Error("courtyard-walls.json failed to load");
  const defs = parseAtlas(await atlasRes.json(), await wallsRes.json());
  const images = {};
  await Promise.all(
    defs.files.map(async (file) => {
      images[file.file] = await loadImage(`${base}${file.file}`);
    })
  );
  return bindArt(defs, images);
}

export function facing4(angle) {
  const a = Math.atan2(Math.sin(angle), Math.cos(angle));
  const q = Math.round(a / (Math.PI / 2));
  if (q === 0) return "right";
  if (q === 1 || q === -3) return "down";
  if (q === -1 || q === 3) return "up";
  return "left";
}

export function clipFrame(sheet, name, time) {
  const clip = sheet?.clips?.[name] || sheet?.clips?.idle;
  if (!clip?.frames?.length) return null;
  const fps = clip.fps || 0;
  let i = 0;
  if (fps > 0) {
    i = Math.floor(time * fps) % clip.frames.length;
    if (i < 0) i += clip.frames.length;
  }
  return clip.frames[i];
}

/**
 * Draw one atlas frame. (x, y) is the actor center. The feet anchor places
 * the bitmap so that center stays on (x, y). Rotated pieces spin about the
 * frame center. Scale is the integer from the atlas.
 */
export function drawClip(ctx, sheet, name, time, x, y, opts = {}) {
  if (!ctx || !sheet?.image) return null;
  const index = opts.index;
  const clip = sheet.clips?.[name] || sheet.clips?.idle;
  const frame =
    index != null ? clip?.frames?.[index] : clipFrame(sheet, name, time);
  if (!frame) return null;
  const scale = frame.scale;
  if (!Number.isInteger(scale) || scale < 1) return null;
  const dw = frame.sw * scale;
  const dh = frame.sh * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  if (opts.angle != null) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(opts.angle);
    ctx.drawImage(
      sheet.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      Math.round((-frame.sw / 2) * scale),
      Math.round((-frame.sh / 2) * scale),
      dw,
      dh
    );
  } else {
    const feetX = x + (frame.ax - frame.sw / 2) * scale;
    const feetY = y + (frame.ay - frame.sh / 2) * scale;
    ctx.drawImage(
      sheet.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      Math.round(feetX - frame.ax * scale),
      Math.round(feetY - frame.ay * scale),
      dw,
      dh
    );
  }
  ctx.restore();
  return frame;
}

export function drawFrame(ctx, sheet, name, index, x, y) {
  return drawClip(ctx, sheet, name, 0, x, y, { index });
}

export function drawCourtyard(ctx) {
  const img = book?.courtyard;
  if (!ctx || !img) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
}

export function floorRect() {
  return book?.floor || null;
}

export function clampToFloor(entity, floor = floorRect()) {
  if (!entity || !floor) return;
  const r = entity.r || 0;
  const minX = floor.x + r;
  const maxX = floor.x + floor.w - r;
  const minY = floor.y + r;
  const maxY = floor.y + floor.h - r;
  if (maxX < minX || maxY < minY) return;
  entity.x = Math.max(minX, Math.min(maxX, entity.x));
  entity.y = Math.max(minY, Math.min(maxY, entity.y));
}

export function insideFloor(entity, floor = floorRect()) {
  if (!entity || !floor) return true;
  const r = entity.r || 0;
  return (
    entity.x >= floor.x + r &&
    entity.x <= floor.x + floor.w - r &&
    entity.y >= floor.y + r &&
    entity.y <= floor.y + floor.h - r
  );
}
